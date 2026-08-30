import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { normalizeCode } from "@/lib/promo";

export const dynamic = "force-dynamic";

function authorized(req: Request): boolean {
  const token = process.env.ADMIN_API_TOKEN;
  if (!token) return false;
  const header = req.headers.get("authorization");
  return header === `Bearer ${token}`;
}

const updateSchema = z.object({
  code: z.string().min(3).max(32).optional(),
  description: z.string().max(200).nullable().optional(),
  discountType: z.enum(["PERCENT", "FIXED"]).optional(),
  discountValue: z.number().int().positive().optional(),
  scope: z.enum(["ALL", "VOUCHER", "FORM", "PRODUCT"]).optional(),
  scopeProductId: z.string().nullable().optional(),
  maxUses: z.number().int().positive().nullable().optional(),
  minSubtotal: z.number().int().nonnegative().nullable().optional(),
  active: z.boolean().optional(),
  startsAt: z.string().datetime().nullable().optional(),
  expiresAt: z.string().datetime().nullable().optional(),
});

type RouteParams = { params: { id: string } };

/**
 * GET /api/admin/promos/[id]   (admin only)
 * Fetch a single promo code with its redemption count.
 */
export async function GET(req: Request, { params }: RouteParams) {
  try {
    if (!authorized(req)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const promo = await prisma.promoCode.findUnique({
      where: { id: params.id },
      include: { _count: { select: { redemptions: true } } },
    });

    if (!promo) {
      return NextResponse.json({ error: "Promo code not found." }, { status: 404 });
    }

    return NextResponse.json({
      promo: {
        id: promo.id,
        code: promo.code,
        description: promo.description,
        discountType: promo.discountType,
        discountValue: promo.discountValue,
        scope: promo.scope,
        scopeProductId: promo.scopeProductId,
        maxUses: promo.maxUses,
        usedCount: promo.usedCount,
        minSubtotal: promo.minSubtotal,
        active: promo.active,
        startsAt: promo.startsAt?.toISOString() ?? null,
        expiresAt: promo.expiresAt?.toISOString() ?? null,
        createdAt: promo.createdAt.toISOString(),
        redemptionCount: promo._count.redemptions,
      },
    });
  } catch (err) {
    console.error(`GET /api/admin/promos/${params?.id} failed:`, err);
    return NextResponse.json(
      { error: "Failed to load promo code.", detail: err instanceof Error ? err.message : String(err) },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/admin/promos/[id]   (admin only)
 * Partially update a promo code — used by the dashboard's Activate/Deactivate
 * button (sends { active: false }) as well as any future edit form.
 */
export async function PATCH(req: Request, { params }: RouteParams) {
  try {
    if (!authorized(req)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const existing = await prisma.promoCode.findUnique({ where: { id: params.id } });
    if (!existing) {
      return NextResponse.json({ error: "Promo code not found." }, { status: 404 });
    }

    let body: unknown;
    try {
      body = await req.json();
    } catch {
      return NextResponse.json({ error: "Request body must be valid JSON." }, { status: 400 });
    }

    let parsed;
    try {
      parsed = updateSchema.parse(body);
    } catch (err: any) {
      return NextResponse.json(
        { error: err?.errors?.[0]?.message || "Invalid request body" },
        { status: 400 }
      );
    }

    const nextDiscountType = parsed.discountType ?? existing.discountType;
    const nextDiscountValue = parsed.discountValue ?? existing.discountValue;
    if (nextDiscountType === "PERCENT" && nextDiscountValue > 100) {
      return NextResponse.json({ error: "Percent discount cannot exceed 100." }, { status: 400 });
    }

    const nextScope = parsed.scope ?? existing.scope;
    const nextScopeProductId =
      parsed.scopeProductId !== undefined ? parsed.scopeProductId : existing.scopeProductId;
    if (nextScope === "PRODUCT" && !nextScopeProductId) {
      return NextResponse.json(
        { error: "scopeProductId is required when scope is PRODUCT." },
        { status: 400 }
      );
    }

    let code = existing.code;
    if (parsed.code) {
      code = normalizeCode(parsed.code);
      if (code !== existing.code) {
        const clash = await prisma.promoCode.findUnique({ where: { code } });
        if (clash) {
          return NextResponse.json({ error: `Code "${code}" already exists.` }, { status: 409 });
        }
      }
    }

    const promo = await prisma.promoCode.update({
      where: { id: params.id },
      data: {
        code,
        description: parsed.description !== undefined ? parsed.description : undefined,
        discountType: parsed.discountType,
        discountValue: parsed.discountValue,
        scope: parsed.scope,
        scopeProductId: nextScope === "PRODUCT" ? nextScopeProductId : parsed.scope ? null : undefined,
        maxUses: parsed.maxUses !== undefined ? parsed.maxUses : undefined,
        minSubtotal: parsed.minSubtotal !== undefined ? parsed.minSubtotal : undefined,
        active: parsed.active,
        startsAt: parsed.startsAt !== undefined ? (parsed.startsAt ? new Date(parsed.startsAt) : null) : undefined,
        expiresAt: parsed.expiresAt !== undefined ? (parsed.expiresAt ? new Date(parsed.expiresAt) : null) : undefined,
      },
    });

    return NextResponse.json({ promo });
  } catch (err) {
    console.error(`PATCH /api/admin/promos/${params?.id} failed:`, err);
    return NextResponse.json(
      { error: "Could not update promo code.", detail: err instanceof Error ? err.message : String(err) },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/admin/promos/[id]   (admin only)
 * Permanently deletes a promo code. Only allowed if it has never been
 * redeemed — otherwise deactivate it instead (PATCH { active: false }),
 * since deleting a redeemed code would break the PromoRedemption relation
 * on past orders.
 */
export async function DELETE(req: Request, { params }: RouteParams) {
  try {
    if (!authorized(req)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const existing = await prisma.promoCode.findUnique({
      where: { id: params.id },
      include: { _count: { select: { redemptions: true } } },
    });
    if (!existing) {
      return NextResponse.json({ error: "Promo code not found." }, { status: 404 });
    }
    if (existing._count.redemptions > 0) {
      return NextResponse.json(
        { error: "This code has been redeemed and can't be deleted. Deactivate it instead." },
        { status: 409 }
      );
    }

    await prisma.promoCode.delete({ where: { id: params.id } });
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error(`DELETE /api/admin/promos/${params?.id} failed:`, err);
    return NextResponse.json(
      { error: "Could not delete promo code.", detail: err instanceof Error ? err.message : String(err) },
      { status: 500 }
    );
  }
}