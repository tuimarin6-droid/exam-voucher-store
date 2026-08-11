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

const patchSchema = z.object({
  active: z.boolean(),
});

/**
 * PATCH /api/admin/promos/:id   (admin only)
 * Toggles a promo code active/inactive. Does not delete anything, so
 * historical redemptions and analytics stay intact.
 * Auth: Authorization: Bearer <ADMIN_API_TOKEN>
 */
export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  if (!authorized(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let parsed;
  try {
    parsed = patchSchema.parse(await req.json());
  } catch {
    return NextResponse.json({ error: "Invalid input." }, { status: 400 });
  }

  try {
    const promo = await prisma.promoCode.update({
      where: { id: params.id },
      data: { active: parsed.active },
    });

    return NextResponse.json({
      promo: {
        id: promo.id,
        code: promo.code,
        active: promo.active,
      },
    });
  } catch (error: any) {
    if (error?.code === "P2025") {
      return NextResponse.json({ error: "Promo code not found." }, { status: 404 });
    }
    console.error("[admin/promos PATCH]", error);
    return NextResponse.json({ error: "Could not update promo code." }, { status: 500 });
  }
}
