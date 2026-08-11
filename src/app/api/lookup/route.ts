import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

const querySchema = z.object({
  identifier: z.string().min(3),
});

export async function POST(req: Request) {
  let parsed;
  try {
    parsed = querySchema.parse(await req.json());
  } catch {
    return NextResponse.json(
      { error: "Please enter a valid email address or order reference." },
      { status: 400 }
    );
  }

  const query = parsed.identifier.trim();

  // Search orders matching either the reference or email
  const orders = await prisma.order.findMany({
    where: {
      OR: [
        { reference: { equals: query, mode: "insensitive" } },
        { email: { equals: query, mode: "insensitive" } },
      ],
      // Updated to valid OrderStatus enum values from your schema
      status: { in: ["PAID", "FULFILLED"] },
    },
    include: {
      orderVouchers: {
        include: {
          voucher: {
            select: {
              code: true,
              productType: true,
            },
          },
        },
      },
    },
    orderBy: { createdAt: "desc" },
    take: 10,
  });

  if (orders.length === 0) {
    return NextResponse.json(
      { error: "No completed orders found for that email or reference." },
      { status: 404 }
    );
  }

  const results = orders.map((order) => ({
    reference: order.reference,
    productType: order.productType,
    createdAt: order.createdAt,
    vouchers: order.orderVouchers.map((ov) => ov.voucher),
  }));

  return NextResponse.json({ orders: results });
}
