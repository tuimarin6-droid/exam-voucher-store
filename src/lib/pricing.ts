import { getProduct } from "./products";
import { validatePromoCode } from "./promo";
import { withPaystackFee } from "./paystack";

export interface PriceQuote {
  ok: boolean;
  error?: string;
  productId: string;
  productName: string;
  currency: string;
  originalAmount: number; // minor units, catalog price
  discountAmount: number; // minor units, 0 if no promo applied
  promoApplied: { id: string; code: string } | null;
  promoError?: string; // set when a code was SUPPLIED but didn't validate — original/subtotal still returned so the UI can show the price without the discount
  subtotal: number; // originalAmount - discountAmount
  processingFee: number; // minor units, dynamic — see withPaystackFee()
  total: number; // subtotal + processingFee — this is what gets charged
}

/**
 * The single source of truth for "what does this order cost right now".
 * Used by:
 *   - POST /api/pricing/quote (real-time breakdown while typing a promo code)
 *   - POST /api/paystack/initialize (authoritative amount actually charged —
 *     NEVER trust a total computed on the client)
 *
 * Processing fee is passed through to the customer via the same
 * withPaystackFee() gross-up already defined in lib/paystack.ts, computed on
 * the POST-discount subtotal (so a discount also reduces the fee, not just
 * the sticker price).
 */
export async function computeQuote(params: {
  productId: string;
  promoCode?: string | null;
}): Promise<PriceQuote> {
  const product = getProduct(params.productId);
  if (!product) {
    return {
      ok: false,
      error: "Unknown product.",
      productId: params.productId,
      productName: "",
      currency: "GHS",
      originalAmount: 0,
      discountAmount: 0,
      promoApplied: null,
      subtotal: 0,
      processingFee: 0,
      total: 0,
    };
  }

  const originalAmount = product.amount;
  let discountAmount = 0;
  let promoApplied: PriceQuote["promoApplied"] = null;
  let promoError: string | undefined;

  const rawCode = params.promoCode?.trim();
  if (rawCode) {
    const result = await validatePromoCode({
      code: rawCode,
      productId: product.id,
      subtotal: originalAmount,
    });
    if (result.ok) {
      discountAmount = result.discountAmount;
      promoApplied = { id: result.promo.id, code: result.promo.code };
    } else {
      promoError = result.error;
    }
  }

  const subtotal = originalAmount - discountAmount;
  const processingFee = withPaystackFee(subtotal) - subtotal;
  const total = subtotal + processingFee;

  return {
    ok: true,
    productId: product.id,
    productName: product.name,
    currency: product.currency,
    originalAmount,
    discountAmount,
    promoApplied,
    promoError,
    subtotal,
    processingFee,
    total,
  };
}
