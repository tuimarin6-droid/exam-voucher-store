import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { getProduct } from "@/lib/products";
import { initializeTransaction, newReference } from "@/lib/paystack";
import { countAvailable } from "@/lib/inventory";

export const dynamic = "force-dynamic";

const bodySchema = z.object({
  productId: z.string(),
  email: z.string().email(),
  phone: z.string().min(6).optional(),
});

/**
 * POST /api/paystack/initialize
 * Creates an Order (PENDING) and returns the Paystack hosted-checkout URL.
 * The amount is taken from our server-side catalog, NEVER from the client.
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
      amount: product.amount,
      currency: product.currency,
      status: "PENDING",
    },
  });

  try {
    const init = await initializeTransaction({
      email: parsed.email,
      amount: product.amount,
      currency: product.currency,
      reference,
      callbackUrl,
      metadata: { productId: product.id, category: product.category },
    });
    return NextResponse.json({ authorizationUrl: init.authorization_url, reference });
  } catch (err) {
    console.error("[initialize] paystack error:", err);
    await prisma.order.update({ where: { reference }, data: { status: "FAILED" } });
    return NextResponse.json({ error: "Could not start payment. Try again." }, { status: 502 });
  }
}
