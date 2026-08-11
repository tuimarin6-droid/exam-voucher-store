import { NextResponse } from "next/server";
import { z } from "zod";
import { getProduct } from "@/lib/products";
import { validatePromoCode } from "@/lib/promos";

export const dynamic = "force-dynamic";

const bodySchema = z.object({
  productId: z.string(),
  email: z.string().email(),
  quantity: z.coerce.number().int().min(1).max(9),
  promoCode: z.string().min(1).max(100),
});

export async function POST(req: Request) {
  /*
   * ------------------------------------------------------------
   * VALIDATE REQUEST BODY
   * ------------------------------------------------------------
   */
  let parsed;

  try {
    parsed = bodySchema.parse(await req.json());
  } catch {
    return NextResponse.json(
      {
        valid: false,
        reason: "Invalid promo request.",
      },
      { status: 400 }
    );
  }

  /*
   * ------------------------------------------------------------
   * FIND PRODUCT
   * ------------------------------------------------------------
   *
   * The server determines the regular price from the product
   * catalogue. The browser is NOT allowed to provide the price.
   */
  const product = getProduct(parsed.productId);

  if (!product) {
    return NextResponse.json(
      {
        valid: false,
        reason: "Unknown product.",
      },
      { status: 404 }
    );
  }

  /*
   * ------------------------------------------------------------
   * PROMOS ONLY APPLY TO VOUCHERS
   * ------------------------------------------------------------
   */
  if (product.category !== "VOUCHER") {
    return NextResponse.json(
      {
        valid: false,
        reason: "Promo codes can only be used for voucher purchases.",
      },
      { status: 400 }
    );
  }

  /*
   * ------------------------------------------------------------
   * SERVER-SIDE PROMO VALIDATION
   * ------------------------------------------------------------
   *
   * regularUnitPrice comes directly from our product catalogue.
   *
   * Example:
   *
   * Normal price:
   * GHS 25 × 2 = GHS 50
   *
   * Valid promo:
   * 2 × GHS 20 = GHS 40
   *
   * The client cannot tell the server to use GHS 20.
   */
  try {
    const result = await validatePromoCode({
      code: parsed.promoCode,
      email: parsed.email,
      quantity: parsed.quantity,
      regularUnitPrice: product.amount,
    });

    if (!result.valid) {
      return NextResponse.json(
        result,
        { status: 400 }
      );
    }

    return NextResponse.json({
      valid: true,
      promoCode: result.promoCode,
      discountedUnitPrice: result.discountedUnitPrice,
      quantityAllowed: result.quantityAllowed,
      discountAmount: result.discountAmount,
      totalAmount: result.totalAmount,
      regularUnitPrice: product.amount,
      quantity: parsed.quantity,
      productId: product.id,
    });
  } catch (error) {
    console.error("[promo/validate]", error);

    return NextResponse.json(
      {
        valid: false,
        reason: "Could not validate the promo code. Please try again.",
      },
      { status: 500 }
    );
  }
}