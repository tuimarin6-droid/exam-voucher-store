import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { generateUniquePromoCode, normalizeCode } from "@/lib/promo";

export const dynamic = "force-dynamic";

function authorized(req: Request): boolean {
  const token = process.env.ADMIN_API_TOKEN;
  if (!token) return false;
  const header = req.headers.get("authorization");
  return header === `Bearer ${token}`;
}

const createSchema = z.object({
  code: z.string().min(3).max(32).optional(), // omit to auto-generate
  description: z.string().max(200).optional(),
  discountType: z.enum(["PERCENT", "FIXED"]),
  discountValue: z.number().int().positive(),
  scope: z.enum(["ALL", "VOUCHER", "FORM", "PRODUCT"]).default("ALL"),
  scopeProductId: z.string().optional(),
  maxUses: z.number().int().positive().nullable().optional(),
  minSubtotal: z.number().int().nonnegative().nullable().optional(),
  startsAt: z.string().datetime().nullable().optional(),
  expiresAt: z.string().datetime().nullable().optional(),
});

/**
 * GET /api/admin/promos   (admin only)
 * List every promo code with usage stats, most recently created first.
 */
export async function GET(req: Request) {
  if (!authorized(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const promos = await prisma.promoCode.findMany({
    orderBy: { createdAt: "desc" },
    include: { _count: { select: { redemptions: true } } },
  });

  return NextResponse.json({
    promos: promos.map((p) => ({
      id: p.id,
      code: p.code,
      description: p.description,
      discountType: p.discountType,
      discountValue: p.discountValue,
      scope: p.scope,
      scopeProductId: p.scopeProductId,
      maxUses: p.maxUses,
      usedCount: p.usedCount,
      minSubtotal: p.minSubtotal,
      active: p.active,
      startsAt: p.startsAt?.toISOString() ?? null,
      expiresAt: p.expiresAt?.toISOString() ?? null,
      createdAt: p.createdAt.toISOString(),
      redemptionCount: p._count.redemptions,
    })),
  });
}

/**
 * POST /api/admin/promos   (admin only)
 * Create a new promo code. If `code` is omitted, a unique readable code
 * (e.g. "EDU-7F3K9Q") is generated server-side.
 */
export async function POST(req: Request) {
  if (!authorized(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let parsed;
  try {
    parsed = createSchema.parse(await req.json());
  } catch (err: any) {
    return NextResponse.json({ error: err?.errors?.[0]?.message || "Invalid request body" }, { status: 400 });
  }

  if (parsed.discountType === "PERCENT" && parsed.discountValue > 100) {
    return NextResponse.json({ error: "Percent discount cannot exceed 100." }, { status: 400 });
  }
  if (parsed.scope === "PRODUCT" && !parsed.scopeProductId) {
    return NextResponse.json({ error: "scopeProductId is required when scope is PRODUCT." }, { status: 400 });
  }

  const code = parsed.code ? normalizeCode(parsed.code) : await generateUniquePromoCode();

  const existing = await prisma.promoCode.findUnique({ where: { code } });
  if (existing) {
    return NextResponse.json({ error: `Code "${code}" already exists.` }, { status: 409 });
  }

  const promo = await prisma.promoCode.create({
    data: {
      code,
      description: parsed.description,
      discountType: parsed.discountType,
      discountValue: parsed.discountValue,
      scope: parsed.scope,
      scopeProductId: parsed.scope === "PRODUCT" ? parsed.scopeProductId : null,
      maxUses: parsed.maxUses ?? null,
      minSubtotal: parsed.minSubtotal ?? null,
      startsAt: parsed.startsAt ? new Date(parsed.startsAt) : null,
      expiresAt: parsed.expiresAt ? new Date(parsed.expiresAt) : null,
    },
  });

  return NextResponse.json({ promo }, { status: 201 });
}
