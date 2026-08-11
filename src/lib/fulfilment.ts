import { prisma } from "./db";
import { getProduct } from "./products";
import {
  dispenseVouchers,
  OutOfStockError,
} from "./inventory";
import { sendVoucherEmail } from "./email";
import { verifyTransaction } from "./paystack";

export interface FulfilmentResult {
  ok: boolean;
  category: "VOUCHER" | "FORM" | null;
  status: string;

  // Kept for backward compatibility.
  voucherCode?: string;

  // New: all voucher codes belonging to the order.
  voucherCodes?: string[];

  productName?: string;
  email?: string;
  reference: string;
  quantity?: number;
  message?: string;
}

/**
 * Shared fulfilment routine.
 *
 * Called by both:
 *   1. Paystack webhook
 *   2. Browser redirect verification
 *
 * Therefore this function MUST remain idempotent.
 */
export async function fulfilByReference(
  reference: string
): Promise<FulfilmentResult> {
  const order = await prisma.order.findUnique({
    where: { reference },
    include: {
      orderVouchers: {
        include: {
          voucher: {
            select: {
              code: true,
              productType: true,
            },
          },
        },
        orderBy: {
          createdAt: "asc",
        },
      },
    },
  });

  if (!order) {
    return {
      ok: false,
      category: null,
      status: "UNKNOWN_ORDER",
      reference,
      message: "Order not found",
    };
  }

  /*
   * ------------------------------------------------------------
   * ALREADY FULFILLED
   * ------------------------------------------------------------
   *
   * If the webhook and browser verification both call this function,
   * we return the vouchers already attached to the order instead of
   * dispensing new ones.
   */
  if (order.status === "FULFILLED") {
    const voucherCodes = order.orderVouchers.map(
      (item) => item.voucher.code
    );

    return {
      ok: true,
      category: order.category as "VOUCHER" | "FORM",
      status: "FULFILLED",

      // Backward compatibility with the old single-code system.
      voucherCode:
        order.voucherCode ??
        voucherCodes[0] ??
        undefined,

      voucherCodes:
        voucherCodes.length > 0
          ? voucherCodes
          : undefined,

      productName: getProduct(order.productType)?.name,
      email: order.email,
      reference,
      quantity: order.quantity,
    };
  }

  /*
   * ------------------------------------------------------------
   * 1. SERVER-SIDE PAYSTACK VERIFICATION
   * ------------------------------------------------------------
   */
  const tx = await verifyTransaction(reference);

  if (tx.status !== "success") {
    await prisma.order.update({
      where: { reference },
      data: {
        status: "FAILED",
      },
    });

    return {
      ok: false,
      category: order.category as "VOUCHER" | "FORM",
      status: "PAYMENT_NOT_SUCCESSFUL",
      reference,
    };
  }

  /*
   * ------------------------------------------------------------
   * 2. AMOUNT + CURRENCY VERIFICATION
   * ------------------------------------------------------------
   *
   * We compare Paystack's amount against the amount stored on OUR
   * server. The browser is never trusted for the final price.
   *
   * tx.amount is expected to be in the same unit as order.amount,
   * based on the existing Paystack helper in this project.
   */
  if (
    tx.amount < order.amount ||
    tx.currency !== order.currency
  ) {
    await prisma.order.update({
      where: { reference },
      data: {
        status: "FAILED",
      },
    });

    return {
      ok: false,
      category: order.category as "VOUCHER" | "FORM",
      status: "AMOUNT_MISMATCH",
      reference,
    };
  }

  /*
   * Payment has been successfully verified.
   */
  await prisma.order.update({
    where: { reference },
    data: {
      status: "PAID",
    },
  });

  const product = getProduct(order.productType);

  if (!product) {
    return {
      ok: false,
      category: null,
      status: "UNKNOWN_PRODUCT",
      reference,
    };
  }

  /*
   * ------------------------------------------------------------
   * 3A. UNIVERSITY FORM
   * ------------------------------------------------------------
   *
   * Forms are still manually fulfilled through WhatsApp.
   */
  if (product.category === "FORM") {
    await prisma.order.update({
      where: { reference },
      data: {
        status: "FULFILLED",
      },
    });

    return {
      ok: true,
      category: "FORM",
      status: "FULFILLED",
      productName: product.name,
      email: order.email,
      reference,
      quantity: 1,
    };
  }

  /*
   * ------------------------------------------------------------
   * 3B. VOUCHER
   * ------------------------------------------------------------
   *
   * This is where multiple vouchers are now dispensed.
   *
   * Example:
   *
   * quantity = 3
   *
   * -> Voucher A
   * -> Voucher B
   * -> Voucher C
   */
  try {
    const voucherCodes = await dispenseVouchers({
      voucherType: product.voucherType!,
      email: order.email,
      reference,
      quantity: order.quantity,
    });

    /*
     * Keep voucherCode populated with the first code for compatibility
     * with existing pages/API responses.
     */
    const firstCode = voucherCodes[0];

    /*
     * Save the first code to the existing field and mark the order
     * fulfilled. All codes are additionally stored through OrderVoucher.
     */
    await prisma.order.update({
      where: { reference },
      data: {
        status: "FULFILLED",
        voucherCode: firstCode,
      },
    });

    /*
     * ------------------------------------------------------------
     * EMAIL
     * ------------------------------------------------------------
     *
     * The current email helper accepts a single code.
     *
     * For now, we send one email per voucher when there are multiple
     * vouchers. The email helper itself will be upgraded in the next
     * step so that multiple codes can eventually be presented together.
     */
    if (!order.emailSent) {
      try {
        for (const code of voucherCodes) {
          await sendVoucherEmail({
            to: order.email,
            productName: product.name,
            code,
            reference,
          });
        }

        await prisma.order.update({
          where: { reference },
          data: {
            emailSent: true,
          },
        });
      } catch (err) {
        /*
         * Never unsell a voucher because email delivery failed.
         *
         * The vouchers remain associated with the paid order and can
         * be recovered through the customer lookup feature we will
         * add later.
         */
        console.error(
          `[fulfilment] email failed for ${reference}:`,
          err
        );
      }
    }

    return {
      ok: true,
      category: "VOUCHER",
      status: "FULFILLED",

      // First code retained for backward compatibility.
      voucherCode: firstCode,

      // New multiple-code response.
      voucherCodes,

      productName: product.name,
      email: order.email,
      reference,
      quantity: voucherCodes.length,
    };
  } catch (err) {
    /*
     * ------------------------------------------------------------
     * OUT OF STOCK
     * ------------------------------------------------------------
     */
    if (err instanceof OutOfStockError) {
      await prisma.order.update({
        where: { reference },
        data: {
          status: "OUT_OF_STOCK",
        },
      });

      return {
        ok: false,
        category: "VOUCHER",
        status: "OUT_OF_STOCK",
        reference,
        productName: product.name,
        email: order.email,
        quantity: order.quantity,
        message:
          "Payment received but there was not enough stock to fulfil the order. We will resolve this manually.",
      };
    }

    throw err;
  }
}
