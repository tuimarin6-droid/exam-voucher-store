import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

function authorized(req: Request): boolean {
  const token = process.env.ADMIN_API_TOKEN;
  if (!token) return false;
  const header = req.headers.get("authorization");
  return header === `Bearer ${token}`;
}

const updateSchema = z.object({
  active: z.boolean().optional(),
  description: z.string().max(200).nullable().optional(),
  maxUses: z.number().int().positive().nullable().optional(),
  minSubtotal: z.number().int().nonnegative().nullable().optional(),
  startsAt: z.string().datetime().nullable().optional(),
  expiresAt: z.string().datetime().nullable().optional(),
});

/**
 * PATCH /api/admin/promos/:id   (admin only)
 * Partial update — used for the dashboard's Activate/Deactivate toggle and
 * for editing usage limits / dates. The code, discount type/value, and scope
 * are immutable after creation (create a new code instead) so historical
 * orders always reflect the terms that were actually applied.
 */
export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  if (!authorized(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let parsed;
  try {
    parsed = updateSchema.parse(await req.json());
  } catch (err: any) {
    return NextResponse.json({ error: err?.errors?.[0]?.message || "Invalid request body" }, { status: 400 });
  }

  const existing = await prisma.promoCode.findUnique({ where: { id: params.id } });
  if (!existing) {
    return NextResponse.json({ error: "Promo code not found" }, { status: 404 });
  }

  const promo = await prisma.promoCode.update({
    where: { id: params.id },
    data: {
      ...(parsed.active !== undefined ? { active: parsed.active } : {}),
      ...(parsed.description !== undefined ? { description: parsed.description } : {}),
      ...(parsed.maxUses !== undefined ? { maxUses: parsed.maxUses } : {}),
      ...(parsed.minSubtotal !== undefined ? { minSubtotal: parsed.minSubtotal } : {}),
      ...(parsed.startsAt !== undefined ? { startsAt: parsed.startsAt ? new Date(parsed.startsAt) : null } : {}),
      ...(parsed.expiresAt !== undefined ? { expiresAt: parsed.expiresAt ? new Date(parsed.expiresAt) : null } : {}),
    },
  });

  return NextResponse.json({ promo });
}
