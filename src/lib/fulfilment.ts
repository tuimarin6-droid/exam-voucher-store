import { prisma } from "@/lib/db";
import { dispenseVouchers } from "./inventory";
import { recordPromoRedemption } from "./promos";
import { sendVoucherEmail } from "@/lib/email";
import { getProduct } from "@/lib/products";

export async function fulfilByReference(reference: string) {
  const order = await prisma.order.findUnique({
    where: { reference },
  });

  if (!order) {
    throw new Error(`Order not found: ${reference}`);
  }

  const product = getProduct(order.productType);
  const productName = product?.name ?? order.productType;

  // Cast status to string to prevent Prisma Enum type comparison errors
  const statusStr = String(order.status);
  if (statusStr === "SUCCESS" || statusStr === "COMPLETED" || statusStr === "FULFILLED") {
    return {
      ok: true,
      status: order.status,
      category: order.category,
      email: order.email,
      productName,
      reference: order.reference,
    };
  }

  // 1. Dispense vouchers from available inventory
  const vouchers = await dispenseVouchers(
    order.productType,
    order.quantity,
    order.id
  );

  // 2. Record promo code redemption if a discount was applied
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
      console.error(
        `[fulfilment] failed to record promo redemption for ${reference}:`,
        promoErr
      );
    }
  }

  // 3. Send email with the generated/dispensed vouchers
  await sendVoucherEmail({
    to: order.email,
    vouchers,
    order,
  });

  // 4. Mark the order as completed
  await prisma.order.update({
    where: { reference },
    data: {
      status: "SUCCESS" as any,
      fulfilledAt: new Date(),
    },
  });

  return {
    ok: true,
    status: "SUCCESS",
    category: order.category,
    email: order.email,
    productName,
    vouchers,
    reference: order.reference,
  };
}
