import { prisma } from "@/lib/db";
import { getProduct } from "@/lib/products";
import { dispenseVouchers, OutOfStockError } from "./inventory";
import { verifyTransaction } from "@/lib/paystack";
import { recordPromoRedemption } from "./promos";
import { sendMultipleVoucherEmail } from "@/lib/email";

/**
 * The single, shared fulfilment routine — called by BOTH the Paystack
 * webhook and the browser-redirect verify endpoint, so it must be fully
 * idempotent and must NEVER release a voucher without confirming payment.
 */
export async function fulfilByReference(reference: string) {
  const order = await prisma.order.findUnique({ where: { reference } });
  if (!order) {
    throw new Error(`Order not found: ${reference}`);
  }

  const product = getProduct(order.productType);
  const productName = product?.name ?? order.productType;

  // Already fulfilled -> idempotent replay, no re-verification/re-dispensing.
  if (order.status === "FULFILLED") {
    const orderVouchers = await prisma.orderVoucher.findMany({
      where: { orderId: order.id },
      include: { voucher: { select: { code: true } } },
      orderBy: { createdAt: "asc" },
    });
    const codes = orderVouchers.map((v) => v.voucher.code);
    return {
      ok: true,
      status: "FULFILLED",
      category: order.category,
      email: order.email,
      productName,
      voucherCode: codes[0],
      voucherCodes: codes,
      reference: order.reference,
    };
  }

  // --- Re-verify with Paystack. This is the ONLY source of truth for payment. ---
  const tx = await verifyTransaction(reference);
  if (tx.status !== "success") {
    await prisma.order.update({ where: { reference }, data: { status: "FAILED" } });
    return { ok: false, status: "PAYMENT_NOT_SUCCESSFUL", category: order.category, reference: order.reference };
  }

  // Amount/currency must match what we actually asked Paystack to charge — anti-tamper.
  if (tx.amount < order.amount || tx.currency !== order.currency) {
    await prisma.order.update({ where: { reference }, data: { status: "FAILED" } });
    return { ok: false, status: "AMOUNT_MISMATCH", category: order.category, reference: order.reference };
  }

  if (order.status === "PENDING") {
    await prisma.order.update({ where: { reference }, data: { status: "PAID" } });
  }

  // --- FORM products (e.g. University Admission Form): nothing to dispense. ---
  if (!product || product.category === "FORM") {
    await prisma.order.update({ where: { reference }, data: { status: "FULFILLED" } });
    return { ok: true, status: "FULFILLED", category: order.category, email: order.email, productName, reference: order.reference };
  }

  // --- VOUCHER products: dispense, email once, record promo redemption. ---
  try {
    const codes = await dispenseVouchers({
      voucherType: product.voucherType!,
      email: order.email,
      reference: order.reference,
      quantity: order.quantity,
    });

    await prisma.order.update({
      where: { reference },
      data: { status: "FULFILLED", voucherCode: codes[0] },
    });

    if (order.promoCode && order.discountAmount > 0) {
      try {
        await recordPromoRedemption({
          promoCode: order.promoCode,
          email: order.email,
          orderReference: order.reference,
          quantity: order.quantity,
          discountAmount: order.discountAmount,
        });
      } catch (promoErr) {
        console.error(`[fulfilment] failed to record promo redemption for ${reference}:`, promoErr);
      }
    }

    if (!order.emailSent) {
      try {
        await sendMultipleVoucherEmail({ to: order.email, productName, codes, reference: order.reference });
        await prisma.order.update({ where: { reference }, data: { emailSent: true } });
      } catch (emailErr) {
        console.error(`[fulfilment] email failed for ${reference}:`, emailErr);
      }
    }

    return {
      ok: true,
      status: "FULFILLED",
      category: order.category,
      email: order.email,
      productName,
      voucherCode: codes[0],
      voucherCodes: codes,
      reference: order.reference,
    };
  } catch (err) {
    if (err instanceof OutOfStockError) {
      await prisma.order.update({ where: { reference }, data: { status: "OUT_OF_STOCK" } });
      return { ok: false, status: "OUT_OF_STOCK", category: order.category, email: order.email, productName, reference: order.reference };
    }
    throw err;
  }
}
