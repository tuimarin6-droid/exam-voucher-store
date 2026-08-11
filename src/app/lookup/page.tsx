import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { getProduct } from "@/lib/products";
import { buildWhatsAppLink } from "@/lib/whatsapp";

export const dynamic = "force-dynamic";

const querySchema = z.object({
  reference: z.string().trim().min(3),
  email: z.string().trim().email(),
});

export async function POST(req: Request) {
  let parsed;
  try {
    parsed = querySchema.parse(await req.json());
  } catch {
    return NextResponse.json(
      { error: "Please enter the order reference and the email address used at checkout." },
      { status: 400 }
    );
  }

  const { reference, email } = parsed;

  // Both the reference AND the email must match the SAME order -- proof of
  // ownership, not just knowledge of one field. This prevents anyone who
  // merely knows (or guesses) a customer's email from pulling up their
  // order history and already-purchased voucher codes.
  const order = await prisma.order.findFirst({
    where: {
      reference: { equals: reference, mode: "insensitive" },
      email: { equals: email, mode: "insensitive" },
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
  });

  if (!order) {
    return NextResponse.json(
      { error: "No completed order found matching that reference and email." },
      { status: 404 }
    );
  }

  const product = getProduct(order.productType);
  const productName = product?.name ?? order.productType;

  // FORM orders don't dispense a code -- give the buyer the same WhatsApp
  // continuation link they'd get on the /success page, so a lost tab
  // doesn't leave them stuck.
  const whatsappUrl =
    product?.category === "FORM"
      ? buildWhatsAppLink({ reference: order.reference, productName, email: order.email })
      : undefined;

  const result = {
    reference: order.reference,
    productType: order.productType,
    productName,
    category: product?.category ?? null,
    createdAt: order.createdAt,
    vouchers: order.orderVouchers.map((ov) => ov.voucher),
    whatsappUrl,
  };

  return NextResponse.json({ orders: [result] });
}
