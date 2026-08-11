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

  // Online purchases are limited to 1–9 vouchers.
  // 10+ will later be redirected to WhatsApp bulk purchasing.
  quantity: z.coerce.number().int().min(1).max(9).default(1),
});

/**
 * POST /api/paystack/initialize
 *
 * Creates a PENDING order and returns the Paystack hosted-checkout URL.
 *
 * IMPORTANT:
 * The customer does NOT provide the price.
 * The server calculates the price from our product catalogue.
 */
export async function POST(req: Request) {
  let parsed;

  try {
    parsed = bodySchema.parse(await req.json());
  } catch {
    return NextResponse.json(
      { error: "Invalid request body" },
      { status: 400 }
    );
  }

  const product = getProduct(parsed.productId);

  if (!product) {
    return NextResponse.json(
      { error: "Unknown product" },
      { status: 404 }
    );
  }

  // ------------------------------------------------------------
  // FORM PRODUCTS
  // ------------------------------------------------------------
  // Forms are still single-purchase products.
  if (product.category === "FORM" && parsed.quantity !== 1) {
    return NextResponse.json(
      {
        error: "University admission forms can only be purchased one at a time.",
      },
      { status: 400 }
    );
  }

  // ------------------------------------------------------------
  // VOUCHER STOCK CHECK
  // ------------------------------------------------------------
  if (product.category === "VOUCHER") {
    const available = await countAvailable(product.voucherType!);

    if (available < parsed.quantity) {
      return NextResponse.json(
        {
          error:
            available === 0
              ? "This voucher is currently out of stock."
              : `Only ${available} voucher${
                  available === 1 ? "" : "s"
                } available.`,
        },
        { status: 409 }
      );
    }
  }

  // ------------------------------------------------------------
  // SERVER-SIDE PRICE CALCULATION
  // ------------------------------------------------------------
  //
  // Example:
  //
  // 1 voucher × GHS 25 = GHS 25
  // 2 vouchers × GHS 25 = GHS 50
  // 5 vouchers × GHS 25 = GHS 125
  //
  // Promo pricing will be added later.
  //
  const originalAmount = product.amount * parsed.quantity;
  const amount = originalAmount;

  const reference = newReference();

  const siteUrl =
    process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";

  const callbackUrl =
    `${siteUrl}/success?reference=${encodeURIComponent(reference)}`;

  // ------------------------------------------------------------
  // CREATE ORDER
  // ------------------------------------------------------------
  await prisma.order.create({
    data: {
      reference,
      email: parsed.email,
      phone: parsed.phone,

      productType: product.id,
      category: product.category,

      // Amount actually being charged.
      amount,

      // Original price before any future discounts.
      originalAmount,

      // No discount yet.
      discountAmount: 0,

      currency: product.currency,
      status: "PENDING",

      // Number of vouchers in this order.
      quantity: parsed.quantity,
    },
  });

  // ------------------------------------------------------------
  // INITIALIZE PAYSTACK
  // ------------------------------------------------------------
  try {
    const init = await initializeTransaction({
      email: parsed.email,

      // Paystack receives the total amount for the order.
      amount,

      currency: product.currency,
      reference,
      callbackUrl,

      metadata: {
        productId: product.id,
        category: product.category,
        quantity: parsed.quantity,
      },
    });

    return NextResponse.json({
      authorizationUrl: init.authorization_url,
      reference,
    });
  } catch (err) {
    console.error("[initialize] paystack error:", err);

    await prisma.order.update({
      where: { reference },
      data: {
        status: "FAILED",
      },
    });

    return NextResponse.json(
      {
        error: "Could not start payment. Try again.",
      },
      { status: 502 }
    );
  }
}
