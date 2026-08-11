import { prisma } from "./db";

export const DEFAULT_PROMO_PRICE = 2000; // GHS 20.00 in pesewas
export const DEFAULT_PROMO_MAX_VOUCHERS = 2;
export const REQUIRED_PURCHASES_FOR_LOYALTY = 5;

export type PromoValidationResult = {
  valid: boolean;
  reason?: string;

  promoCode?: string;

  discountedUnitPrice?: number;

  quantityAllowed?: number;

  discountAmount?: number;

  totalAmount?: number;
};

/**
 * Normalise customer emails before comparing them.
 *
 * This prevents:
 *
 * John@Email.com
 * JOHN@EMAIL.COM
 * john@email.com
 *
 * from being treated as different customers.
 */
export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

/**
 * Normalise promo codes.
 *
 * Example:
 *
 * SAVE20
 * save20
 * Save20
 *
 * all become SAVE20.
 */
export function normalizePromoCode(code: string): string {
  return code.trim().toUpperCase();
}

/**
 * Count completed voucher purchases made by an email address.
 *
 * Only FULFILLED voucher orders count.
 *
 * Failed, pending and abandoned payments do not count.
 */
export async function getCompletedVoucherPurchaseCount(
  email: string
): Promise<number> {
  const normalizedEmail = normalizeEmail(email);

  return prisma.order.count({
    where: {
      email: normalizedEmail,
      category: "VOUCHER",
      status: "FULFILLED",
    },
  });
}

/**
 * Calculate how many discounted vouchers this customer has
 * already redeemed with this promo.
 */
export async function getPromoQuantityUsed(
  promoCodeId: string,
  email: string
): Promise<number> {
  const normalizedEmail = normalizeEmail(email);

  const result = await prisma.promoRedemption.aggregate({
    where: {
      promoCodeId,
      email: normalizedEmail,
    },
    _sum: {
      quantity: true,
    },
  });

  return result._sum.quantity ?? 0;
}

/**
 * Validate a promo code for a customer.
 *
 * This function is intentionally server-side.
 */
export async function validatePromoCode(params: {
  code: string;
  email: string;
  quantity: number;
  regularUnitPrice: number;
}): Promise<PromoValidationResult> {
  const code = normalizePromoCode(params.code);
  const email = normalizeEmail(params.email);
  const quantity = params.quantity;

  if (!code) {
    return {
      valid: false,
      reason: "Please enter a promo code.",
    };
  }

  if (!email) {
    return {
      valid: false,
      reason: "Please enter your email address first.",
    };
  }

  if (!Number.isInteger(quantity) || quantity < 1) {
    return {
      valid: false,
      reason: "Invalid voucher quantity.",
    };
  }

  if (quantity > 9) {
    return {
      valid: false,
      reason:
        "Online purchases are limited to 9 vouchers.",
    };
  }

  const promo = await prisma.promoCode.findUnique({
    where: {
      code,
    },
    include: {
      allowedEmails: true,
    },
  });

  if (!promo) {
    return {
      valid: false,
      reason: "Invalid promo code.",
    };
  }

  if (!promo.active) {
    return {
      valid: false,
      reason: "This promo code is no longer active.",
    };
  }

  /*
   * Expiry check.
   */
  if (
    promo.expiresAt &&
    promo.expiresAt.getTime() < Date.now()
  ) {
    return {
      valid: false,
      reason: "This promo code has expired.",
    };
  }

  /*
   * Overall redemption limit.
   */
  if (
    promo.maxRedemptions !== null &&
    promo.redemptionCount >= promo.maxRedemptions
  ) {
    return {
      valid: false,
      reason:
        "This promo code has reached its maximum number of uses.",
    };
  }

  /*
   * ------------------------------------------------------------
   * SPECIFIC-EMAIL PROMO
   * ------------------------------------------------------------
   *
   * If allowedEmails contains entries, the promo is restricted
   * to those people.
   */
  if (promo.allowedEmails.length > 0) {
    const emailIsAllowed = promo.allowedEmails.some(
      (entry) =>
        normalizeEmail(entry.email) === email
    );

    if (!emailIsAllowed) {
      return {
        valid: false,
        reason:
          "This promo code is not available for this email address.",
      };
    }
  }

  /*
   * ------------------------------------------------------------
   * FIVE-PURCHASE LOYALTY PROMO
   * ------------------------------------------------------------
   */
  if (promo.requiresFivePurchases) {
    const purchaseCount =
      await getCompletedVoucherPurchaseCount(email);

    if (
      purchaseCount <
      REQUIRED_PURCHASES_FOR_LOYALTY
    ) {
      return {
        valid: false,
        reason:
          `This promo requires at least ${REQUIRED_PURCHASES_FOR_LOYALTY} completed voucher purchases.`,
      };
    }
  }

  /*
   * ------------------------------------------------------------
   * CUSTOMER-SPECIFIC USAGE LIMIT
   * ------------------------------------------------------------
   */
  const alreadyUsed =
    await getPromoQuantityUsed(
      promo.id,
      email
    );

  const remainingForCustomer =
    Math.max(
      0,
      promo.maxVouchersPerCustomer -
        alreadyUsed
    );

  if (remainingForCustomer <= 0) {
    return {
      valid: false,
      reason:
        "You have already used the maximum number of discounted vouchers allowed by this promo.",
    };
  }

  /*
   * A customer may request 9 vouchers, but if the promo
   * only allows 2 discounted vouchers, only 2 can receive
   * the discounted price.
   */
  const discountedQuantity = Math.min(
    quantity,
    remainingForCustomer
  );

  const discountedUnitPrice =
    promo.discountedPrice > 0
      ? promo.discountedPrice
      : DEFAULT_PROMO_PRICE;

  const regularTotal =
    params.regularUnitPrice * quantity;

  const discountedTotal =
    discountedUnitPrice *
      discountedQuantity +
    params.regularUnitPrice *
      (quantity - discountedQuantity);

  const discountAmount =
    regularTotal - discountedTotal;

  return {
    valid: true,

    promoCode: promo.code,

    discountedUnitPrice,

    quantityAllowed: discountedQuantity,

    discountAmount,

    totalAmount: discountedTotal,
  };
}

/**
 * Record a successful promo redemption.
 *
 * This should ONLY be called after Paystack payment has been
 * successfully verified.
 */
export async function recordPromoRedemption(params: {
  promoCode: string;
  email: string;
  orderReference: string;
  quantity: number;
  discountAmount: number;
}): Promise<void> {
  const code = normalizePromoCode(
    params.promoCode
  );

  const email = normalizeEmail(params.email);

  await prisma.$transaction(async (tx) => {
    const promo = await tx.promoCode.findUnique({
      where: {
        code,
      },
    });

    if (!promo) {
      throw new Error(
        "Promo code no longer exists."
      );
    }

    /*
     * Prevent the same order from being recorded twice.
     */
    const existing =
      await tx.promoRedemption.findUnique({
        where: {
          promoCodeId_orderReference: {
            promoCodeId: promo.id,
            orderReference:
              params.orderReference,
          },
        },
      });

    if (existing) {
      return;
    }

    /*
     * Re-check the customer's usage limit before
     * recording the redemption.
     */
    const previous =
      await tx.promoRedemption.aggregate({
        where: {
          promoCodeId: promo.id,
          email,
        },
        _sum: {
          quantity: true,
        },
      });

    const alreadyUsed =
      previous._sum.quantity ?? 0;

    const remaining =
      promo.maxVouchersPerCustomer -
      alreadyUsed;

    if (params.quantity > remaining) {
      throw new Error(
        "Promo voucher limit exceeded."
      );
    }

    /*
     * Re-check global redemption limit.
     */
    if (
      promo.maxRedemptions !== null &&
      promo.redemptionCount >=
        promo.maxRedemptions
    ) {
      throw new Error(
        "Promo redemption limit reached."
      );
    }

    await tx.promoRedemption.create({
      data: {
        promoCodeId: promo.id,
        email,
        orderReference:
          params.orderReference,
        quantity: params.quantity,
        discountAmount:
          params.discountAmount,
      },
    });

    await tx.promoCode.update({
      where: {
        id: promo.id,
      },
      data: {
        redemptionCount: {
          increment: 1,
        },
      },
    });
  });
}
