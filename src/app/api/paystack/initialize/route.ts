import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { getProduct } from "@/lib/products";
import { initializeTransaction, newReference } from "@/lib/paystack";
import { countAvailable } from "@/lib/inventory";
import { computeQuote } from "@/lib/pricing";

export const dynamic = "force-dynamic";

const bodySchema = z.object({
  productId: z.string(),
  email: z.string().email(),
  phone: z.string().min(6).optional(),
  promoCode: z.string().max(64).optional(),
});

/**
 * POST /api/paystack/initialize
 * Creates an Order (PENDING) and returns the Paystack hosted-checkout URL.
 *
 * The amount charged is ALWAYS recomputed here via computeQuote() -- the
 * server-side catalog price, promo discount, and processing fee -- never
 * trusted from the client. Any total the checkout UI showed the customer is
 * just a preview; this is the number that actually gets charged.
 */
export async function POST(req: Request) {
  let parsed;
  try {
    parsed = bodySchema.parse(await req.json());
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const product = getProduct(parsed.productId);
  if (!product) {
    return NextResponse.json({ error: "Unknown product" }, { status: 404 });
  }

  // Pre-flight stock check for voucher products so we don't take money we
  // cannot fulfil. (Final claim still happens atomically after payment.)
  if (product.category === "VOUCHER") {
    const available = await countAvailable(product.voucherType!);
    if (available <= 0) {
      return NextResponse.json({ error: "This voucher is currently out of stock." }, { status: 409 });
    }
  }

  // Authoritative price: original catalog amount, promo discount (if the
  // code is currently valid), and dynamic processing fee -- computed
  // server-side, right now, from the database. If the promo code the
  // customer typed no longer validates (expired/exhausted since they typed
  // it), we tell them rather than silently charging full price.
  const quote = await computeQuote({ productId: product.id, promoCode: parsed.promoCode });
  if (!quote.ok) {
    return NextResponse.json({ error: quote.error || "Could not price this order." }, { status: 400 });
  }
  if (parsed.promoCode?.trim() && !quote.promoApplied) {
    return NextResponse.json({ error: quote.promoError || "Promo code is not valid." }, { status: 400 });
  }

  const reference = newReference();
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";
  const callbackUrl = `${siteUrl}/success?reference=${reference}`;

  await prisma.order.create({
    data: {
      reference,
      email: parsed.email,
      phone: parsed.phone,
      productType: product.id,
      category: product.category,
      amount: quote.total,
      currency: product.currency,
      status: "PENDING",
      originalAmount: quote.originalAmount,
      discountAmount: quote.discountAmount,
      processingFee: quote.processingFee,
      promoCode: quote.promoApplied?.code ?? null,
      promoCodeId: quote.promoApplied?.id ?? null,
    },
  });

  try {
    const init = await initializeTransaction({
      email: parsed.email,
      amount: quote.total,
      currency: product.currency,
      reference,
      callbackUrl,
      metadata: {
        productId: product.id,
        category: product.category,
        promoCode: quote.promoApplied?.code ?? null,
      },
    });
    return NextResponse.json({ authorizationUrl: init.authorization_url, reference });
  } catch (err) {
    console.error("[initialize] paystack error:", err);
    await prisma.order.update({ where: { reference }, data: { status: "FAILED" } });
    return NextResponse.json({ error: "Could not start payment. Try again." }, { status: 502 });
  }
}
