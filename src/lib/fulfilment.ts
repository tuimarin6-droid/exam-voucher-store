import { prisma } from "./db";
import { getProduct } from "./products";
import { dispenseVoucher, OutOfStockError } from "./inventory";
import { sendVoucherEmail } from "./email";
import { verifyTransaction } from "./paystack";

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
 * browser-redirect verify endpoint, so it must be fully idempotent.
 *
 * Steps:
 *   1. Re-verify the transaction against Paystack (server-side source of truth).
 *   2. Confirm the amount/currency matches the order we created.
 *   3. VOUCHER -> atomically dispense a code + email it.
 *      FORM    -> just mark paid; the UI shows the WhatsApp button.
 */
export async function fulfilByReference(reference: string): Promise<FulfilmentResult> {
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

  // 1) Verify with Paystack.
  const tx = await verifyTransaction(reference);
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

  const product = getProduct(order.productType);
  if (!product) {
    return { ok: false, category: null, status: "UNKNOWN_PRODUCT", reference };
  }

  // 3a) University form -> manual WhatsApp fulfilment. Nothing to dispense.
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

  // 3b) Voucher -> dispense atomically, then email.
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
