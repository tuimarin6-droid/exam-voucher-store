import { NextResponse } from "next/server";
import { z } from "zod";
import { computeQuote } from "@/lib/pricing";

export const dynamic = "force-dynamic";

const bodySchema = z.object({
  productId: z.string(),
  promoCode: z.string().optional(),
});

/**
 * POST /api/pricing/quote
 * Public, read-only. Called on product change and on promo-code input
 * (debounced) to drive the real-time itemized breakdown on the checkout
 * page. Never mutates anything — validatePromoCode() underneath is
 * read-only. The SAME computeQuote() is re-run authoritatively inside
 * /api/paystack/initialize right before charging, so nothing here needs to
 * be trusted blindly by the server later.
 */
export async function POST(req: Request) {
  let parsed;
  try {
    parsed = bodySchema.parse(await req.json());
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const quote = await computeQuote({ productId: parsed.productId, promoCode: parsed.promoCode });
  if (!quote.ok) {
    return NextResponse.json({ error: quote.error || "Could not price this order." }, { status: 404 });
  }

  return NextResponse.json(quote);
}