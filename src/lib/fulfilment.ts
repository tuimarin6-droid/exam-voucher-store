import { prisma } from "@/lib/db";
import { dispenseVouchers } from "./inventory";
import { recordPromoRedemption } from "./promos";
import { sendVoucherEmail } from "@/lib/email";

export async function fulfilOrder(reference: string) {
  const order = await prisma.order.findUnique({
    where: { reference },
  });

  if (!order) {
    throw new Error(`Order not found: ${reference}`);
  }

  // Prevent double fulfilment if already processed
  if (order.status === "SUCCESS" || order.status === "COMPLETED") {
    return order;
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
  const updatedOrder = await prisma.order.update({
    where: { reference },
    data: {
      status: "SUCCESS",
      fulfilledAt: new Date(),
    },
  });

  return updatedOrder;
}
