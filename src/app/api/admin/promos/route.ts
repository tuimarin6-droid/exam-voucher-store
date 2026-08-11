import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { normalizePromoCode, normalizeEmail, DEFAULT_PROMO_PRICE, DEFAULT_PROMO_MAX_VOUCHERS } from "@/lib/promos";

export const dynamic = "force-dynamic";

function authorized(req: Request): boolean {
  const token = process.env.ADMIN_API_TOKEN;
  if (!token) return false;
  const header = req.headers.get("authorization");
  return header === `Bearer ${token}`;
}

/**
 * GET /api/admin/promos   (admin only)
 * Lists every promo code, newest first, with redemption stats.
 * Auth: Authorization: Bearer <ADMIN_API_TOKEN>
 */
export async function GET(req: Request) {
  if (!authorized(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const promos = await prisma.promoCode.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      allowedEmails: { select: { email: true } },
    },
  });

  return NextResponse.json({
    promos: promos.map((p) => ({
      id: p.id,
      code: p.code,
      discountedPrice: p.discountedPrice,
      maxVouchersPerCustomer: p.maxVouchersPerCustomer,
      maxRedemptions: p.maxRedemptions,
      redemptionCount: p.redemptionCount,
      active: p.active,
      requiresFivePurchases: p.requiresFivePurchases,
      expiresAt: p.expiresAt ? p.expiresAt.toISOString() : null,
      allowedEmails: p.allowedEmails.map((e) => e.email),
      createdAt: p.createdAt.toISOString(),
    })),
  });
}

const createSchema = z.object({
  code: z.string().min(3).max(40),
  discountedPriceGHS: z.coerce.number().positive().max(10000),
  maxVouchersPerCustomer: z.coerce.number().int().min(1).max(50).default(DEFAULT_PROMO_MAX_VOUCHERS),
  maxRedemptions: z.coerce.number().int().min(1).max(1_000_000).nullable().optional(),
  requiresFivePurchases: z.boolean().optional().default(false),
  expiresAt: z.string().nullable().optional(),
  allowedEmails: z.array(z.string().email()).optional().default([]),
});

/**
 * POST /api/admin/promos   (admin only)
 * Creates a new promo code.
 * Auth: Authorization: Bearer <ADMIN_API_TOKEN>
 */
export async function POST(req: Request) {
  if (!authorized(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let parsed;
  try {
    parsed = createSchema.parse(await req.json());
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof z.ZodError ? error.issues[0]?.message ?? "Invalid input." : "Invalid input." },
      { status: 400 },
    );
  }

  const code = normalizePromoCode(parsed.code);
  const discountedPrice = Math.round(parsed.discountedPriceGHS * 100);
  const expiresAt = parsed.expiresAt ? new Date(parsed.expiresAt) : null;

  if (expiresAt && Number.isNaN(expiresAt.getTime())) {
    return NextResponse.json({ error: "Invalid expiry date." }, { status: 400 });
  }

  try {
    const promo = await prisma.promoCode.create({
      data: {
        code,
        discountedPrice,
        maxVouchersPerCustomer: parsed.maxVouchersPerCustomer,
        maxRedemptions: parsed.maxRedemptions ?? null,
        requiresFivePurchases: parsed.requiresFivePurchases,
        expiresAt,
        active: true,
        allowedEmails: parsed.allowedEmails.length
          ? { create: parsed.allowedEmails.map((email) => ({ email: normalizeEmail(email) })) }
          : undefined,
      },
      include: { allowedEmails: { select: { email: true } } },
    });

    return NextResponse.json(
      {
        promo: {
          id: promo.id,
          code: promo.code,
          discountedPrice: promo.discountedPrice,
          maxVouchersPerCustomer: promo.maxVouchersPerCustomer,
          maxRedemptions: promo.maxRedemptions,
          redemptionCount: promo.redemptionCount,
          active: promo.active,
          requiresFivePurchases: promo.requiresFivePurchases,
          expiresAt: promo.expiresAt ? promo.expiresAt.toISOString() : null,
          allowedEmails: promo.allowedEmails.map((e) => e.email),
          createdAt: promo.createdAt.toISOString(),
        },
      },
      { status: 201 },
    );
  } catch (error: any) {
    if (error?.code === "P2002") {
      return NextResponse.json({ error: `Promo code "${code}" already exists.` }, { status: 409 });
    }
    console.error("[admin/promos POST]", error);
    return NextResponse.json({ error: "Could not create promo code." }, { status: 500 });
  }
}
