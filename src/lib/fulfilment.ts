import { prisma } from "./db";
import { getProduct } from "./products";
import { dispenseVoucher, OutOfStockError } from "./inventory";
import { sendVoucherEmail } from "./email";
import { verifyTransaction } from "./paystack";
import { redeemPromoCode } from "./promo";
import { providerOfReference } from "./providers";
import { getCheckoutSession, referenceFromSession, sessionLooksPaid, decimalToMinor } from "./bachs";

export interface FulfilOptions {
  /** Bachs checkout id (from the success redirect) so we can double-check with Bachs' API. */
  checkoutId?: string;
  /**
   * Payment already confirmed by a SIGNED webhook (Bachs). Lets us skip the
   * API lookup. Never pass this from user-controlled input.
   */
  prepaid?: { amountMinor: number | null; currency: string | null };
}

export interface FulfilmentResult {
  ok: boolean;
  category: "VOUCHER" | "FORM" | null;
  status: string;
  voucherCode?: string;
  productName?: string;
  email?: string;
  reference: string;
  message?: string;
}

/**
 * The single, shared fulfilment routine. Called by BOTH the webhook and the
 * browser-redirect verify endpoint (and the admin retry / reconcile sweep),
 * so it must be fully idempotent.
 *
 * Steps:
 *   1. Re-verify the transaction against Paystack (server-side source of truth).
 *   2. Confirm the amount/currency matches the order we created.
 *   3. If a promo code was used, consume it (idempotent — see redeemPromoCode).
 *   4. VOUCHER -> atomically dispense a code + email it.
 *      FORM    -> just mark paid; the UI shows the WhatsApp button.
 */
export async function fulfilByReference(
  reference: string,
  opts: FulfilOptions = {},
): Promise<FulfilmentResult> {
  const order = await prisma.order.findUnique({ where: { reference } });
  if (!order) {
    return { ok: false, category: null, status: "UNKNOWN_ORDER", reference, message: "Order not found" };
  }

  // Already done -> return the same result (idempotent).
  if (order.status === "FULFILLED") {
    return {
      ok: true,
      category: order.category as "VOUCHER" | "FORM",
      status: "FULFILLED",
      voucherCode: order.voucherCode ?? undefined,
      productName: getProduct(order.productType)?.name,
      email: order.email,
      reference,
    };
  }

  // 1) Verify with the payment provider (server-side source of truth).
  let tx: { status: string; amount: number; currency: string };
  if (opts.prepaid) {
    // Signed Bachs webhook already proved payment. Missing amount/currency
    // (null) are filled from the order; present values are still checked below.
    tx = {
      status: "success",
      amount: opts.prepaid.amountMinor ?? order.amount,
      currency: opts.prepaid.currency ?? order.currency,
    };
  } else if (providerOfReference(reference) === "bachs") {
    // Redirect / admin retry. Without a checkout id we can't ask Bachs, and the
    // webhook will finish the job -> report "pending", never "failed".
    if (!opts.checkoutId) {
      return { ok: false, category: order.category as any, status: "PAYMENT_PENDING", reference };
    }
    let session: any;
    try {
      session = await getCheckoutSession(opts.checkoutId);
    } catch (err) {
      console.error(`[fulfilment] bachs lookup failed for ${reference}:`, err);
      return { ok: false, category: order.category as any, status: "PAYMENT_PENDING", reference };
    }
    // The checkout id comes from the browser: make sure it is THIS order's.
    if (referenceFromSession(session) !== reference || !sessionLooksPaid(session)) {
      return { ok: false, category: order.category as any, status: "PAYMENT_PENDING", reference };
    }
    tx = {
      status: "success",
      amount: decimalToMinor(session?.pricing?.amount ?? session?.amount) ?? order.amount,
      currency: String(session?.pricing?.currency ?? session?.currency ?? order.currency),
    };
  } else {
    tx = await verifyTransaction(reference);
  }
  if (tx.status !== "success") {
    await prisma.order.update({ where: { reference }, data: { status: "FAILED" } });
    return { ok: false, category: order.category as any, status: "PAYMENT_NOT_SUCCESSFUL", reference };
  }

  // 2) Amount + currency must match what we asked for (anti-tamper).
  if (tx.amount < order.amount || tx.currency !== order.currency) {
    await prisma.order.update({ where: { reference }, data: { status: "FAILED" } });
    return { ok: false, category: order.category as any, status: "AMOUNT_MISMATCH", reference };
  }

  await prisma.order.update({ where: { reference }, data: { status: "PAID" } });

  // 3) Payment is confirmed successful -> now, and only now, consume the
  // promo code (if one was used on this order). redeemPromoCode() is
  // idempotent via the unique PromoRedemption.orderReference, so repeated
  // calls to fulfilByReference for the same order never double-consume it.
  if (order.promoCodeId) {
    try {
      await redeemPromoCode({
        reference,
        promoCodeId: order.promoCodeId,
        discountAmount: order.discountAmount,
      });
    } catch (err) {
      // Never let a promo bookkeeping failure block a paid customer from
      // getting their voucher — log and continue.
      console.error(`[fulfilment] promo redemption failed for ${reference}:`, err);
    }
  }

  const product = getProduct(order.productType);
  if (!product) {
    return { ok: false, category: null, status: "UNKNOWN_PRODUCT", reference };
  }

  // 4a) University form -> manual WhatsApp fulfilment. Nothing to dispense.
  if (product.category === "FORM") {
    await prisma.order.update({ where: { reference }, data: { status: "FULFILLED" } });
    return {
      ok: true,
      category: "FORM",
      status: "FULFILLED",
      productName: product.name,
      email: order.email,
      reference,
    };
  }

  // 4b) Voucher -> dispense atomically, then email.
  try {
    const code = await dispenseVoucher({
      voucherType: product.voucherType!,
      email: order.email,
      reference,
    });

    // Persist the code on the order before emailing so it's never lost.
    await prisma.order.update({
      where: { reference },
      data: { status: "FULFILLED", voucherCode: code },
    });

    // Email the code. Failure to email should not "unsell" the code; we log and
    // let the user still see it on-screen + retry email out of band.
    if (!order.emailSent) {
      try {
        await sendVoucherEmail({ to: order.email, productName: product.name, code, reference });
        await prisma.order.update({ where: { reference }, data: { emailSent: true } });
      } catch (err) {
        console.error(`[fulfilment] email failed for ${reference}:`, err);
      }
    }

    return {
      ok: true,
      category: "VOUCHER",
      status: "FULFILLED",
      voucherCode: code,
      productName: product.name,
      email: order.email,
      reference,
    };
  } catch (err) {
    if (err instanceof OutOfStockError) {
      await prisma.order.update({ where: { reference }, data: { status: "OUT_OF_STOCK" } });
      return {
        ok: false,
        category: "VOUCHER",
        status: "OUT_OF_STOCK",
        reference,
        productName: product.name,
        email: order.email,
        message: "Payment received but stock is empty. We will resolve manually.",
      };
    }
    throw err;
  }
}
