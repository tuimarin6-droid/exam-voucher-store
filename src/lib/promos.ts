import { prisma } from "./db";
import { getProduct, type Product } from "./products";

// Unambiguous charset: no 0/O or 1/I, so codes are easy to read off a
// screen/receipt and type back in without transcription errors.
const CODE_CHARS = "23456789ABCDEFGHJKLMNPQRSTUVWXYZ";

/** Generate a random, human-friendly promo code like "EDU-7F3K9Q". */
export function generatePromoCode(prefix = "EDU", length = 6): string {
  let body = "";
  for (let i = 0; i < length; i++) {
    body += CODE_CHARS[Math.floor(Math.random() * CODE_CHARS.length)];
  }
  return `${prefix}-${body}`;
}

/** Generate a code guaranteed not to collide with an existing one. */
export async function generateUniquePromoCode(prefix = "EDU", length = 6): Promise<string> {
  for (let attempt = 0; attempt < 10; attempt++) {
    const candidate = generatePromoCode(prefix, length);
    const exists = await prisma.promoCode.findUnique({ where: { code: candidate } });
    if (!exists) return candidate;
  }
  throw new Error("Could not generate a unique promo code, try again");
}

export function normalizeCode(raw: string): string {
  return raw.trim().toUpperCase();
}

export interface PromoValidationOk {
  ok: true;
  promo: {
    id: string;
    code: string;
    discountType: "PERCENT" | "FIXED";
    discountValue: number;
  };
  discountAmount: number; // minor units, already capped to <= subtotal
}

export interface PromoValidationFail {
  ok: false;
  error: string;
}

export type PromoValidationResult = PromoValidationOk | PromoValidationFail;

/**
 * Read-only validation: does this code apply to this product/subtotal right
 * now? Safe to call as often as you like (e.g. on every keystroke) since it
 * never mutates usedCount. The only mutation happens in redeemPromoCode(),
 * and only after payment actually succeeds.
 */
export async function validatePromoCode(params: {
  code: string;
  productId: string;
  subtotal: number; // product amount in minor units, pre-discount
}): Promise<PromoValidationResult> {
  const product = getProduct(params.productId);
  if (!product) return { ok: false, error: "Unknown product." };

  const code = normalizeCode(params.code);
  if (!code) return { ok: false, error: "Enter a promo code." };

  const promo = await prisma.promoCode.findUnique({ where: { code } });
  if (!promo) return { ok: false, error: "Promo code not found." };
  if (!promo.active) return { ok: false, error: "This promo code is no longer active." };

  const now = new Date();
  if (promo.startsAt && now < promo.startsAt) {
    return { ok: false, error: "This promo code is not active yet." };
  }
  if (promo.expiresAt && now >= promo.expiresAt) {
    return { ok: false, error: "This promo code has expired." };
  }
  if (promo.maxUses !== null && promo.usedCount >= promo.maxUses) {
    return { ok: false, error: "This promo code has reached its usage limit." };
  }

  if (!scopeMatches(promo.scope, promo.scopeProductId, product)) {
    return { ok: false, error: "This promo code does not apply to this product." };
  }

  if (promo.minSubtotal !== null && promo.minSubtotal !== undefined && params.subtotal < promo.minSubtotal) {
    return { ok: false, error: `This promo code requires a minimum order of ${(promo.minSubtotal / 100).toFixed(2)}.` };
  }

  const discountAmount = computeDiscount(
    { discountType: promo.discountType, discountValue: promo.discountValue },
    params.subtotal,
  );

  return {
    ok: true,
    promo: {
      id: promo.id,
      code: promo.code,
      discountType: promo.discountType as "PERCENT" | "FIXED",
      discountValue: promo.discountValue,
    },
    discountAmount,
  };
}

function scopeMatches(scope: string, scopeProductId: string | null, product: Product): boolean {
  switch (scope) {
    case "ALL":
      return true;
    case "VOUCHER":
      return product.category === "VOUCHER";
    case "FORM":
      return product.category === "FORM";
    case "PRODUCT":
      return scopeProductId === product.id;
    default:
      return false;
  }
}

/** Percent or fixed discount, always clamped to [0, subtotal]. */
export function computeDiscount(
  promo: { discountType: "PERCENT" | "FIXED"; discountValue: number },
  subtotal: number,
): number {
  const raw =
    promo.discountType === "PERCENT"
      ? Math.round((subtotal * promo.discountValue) / 100)
      : promo.discountValue;
  return Math.max(0, Math.min(raw, subtotal));
}

export interface RedeemResult {
  consumed: boolean; // true if usedCount was actually incremented just now
  alreadyRedeemed: boolean; // true if this order had already redeemed (idempotent replay)
  overused: boolean; // true if payment succeeded but the code had already hit maxUses (rare race) — still allow fulfilment, just flag for admin review
}

/**
 * Atomically and idempotently record that `reference` consumed `promoCodeId`
 * for `discountAmount`. Safe to call multiple times for the same order (the
 * webhook, redirect-verify, and admin retry can all trigger fulfilment) —
 * only the FIRST call actually increments PromoCode.usedCount.
 *
 * Called from fulfilByReference() only after Paystack has confirmed the
 * payment succeeded, per the "single-use codes are only consumed after
 * successful payment" requirement.
 */
export async function redeemPromoCode(params: {
  reference: string;
  promoCodeId: string;
  discountAmount: number;
}): Promise<RedeemResult> {
  const { reference, promoCodeId, discountAmount } = params;

  // Idempotency guard: PromoRedemption.orderReference is unique. If a row
  // already exists, this order already consumed its promo — nothing to do.
  const existing = await prisma.promoRedemption.findUnique({ where: { orderReference: reference } });
  if (existing) {
    return { consumed: false, alreadyRedeemed: true, overused: false };
  }

  // Optimistic-locking increment (same pattern as dispenseVoucher in
  // inventory.ts): read the current usedCount, then conditionally update
  // WHERE usedCount is still that exact value. If another request beat us
  // to it, the update affects 0 rows and we retry with a fresh read.
  let consumed = false;
  let overused = false;
  for (let attempt = 0; attempt < 5; attempt++) {
    const promo = await prisma.promoCode.findUnique({
      where: { id: promoCodeId },
      select: { usedCount: true, maxUses: true, active: true },
    });
    if (!promo) break; // code was deleted — nothing to increment, just record below

    const underCap = promo.maxUses === null || promo.usedCount < promo.maxUses;
    if (!underCap) {
      // The customer already paid the discounted price (locked in at
      // checkout), so a rare race that exhausts the cap between checkout and
      // payment confirmation must never block their voucher delivery or
      // claw back money — we just flag it for admin visibility.
      overused = true;
      break;
    }

    const claimed = await prisma.promoCode.updateMany({
      where: { id: promoCodeId, usedCount: promo.usedCount },
      data: { usedCount: promo.usedCount + 1 },
    });

    if (claimed.count === 1) {
      consumed = true;
      break;
    }
    // Someone else incremented between our read and write — loop and retry.
  }

  await prisma.promoRedemption.create({
    data: { promoCodeId, orderReference: reference, discountAmount },
  });

  return { consumed, alreadyRedeemed: false, overused };
}
