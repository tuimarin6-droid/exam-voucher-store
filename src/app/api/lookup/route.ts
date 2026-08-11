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
      status: { in: ["SUCCESS", "FULFILLED", "COMPLETED"] },
    },
    include: {
      vouchers: {
        select: {
          serial: true,
          pin: true,
          voucherType: true,
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
    vouchers: order.vouchers,
  }));

  return NextResponse.json({ orders: results });
}