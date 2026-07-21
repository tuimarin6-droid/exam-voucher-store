import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { getProduct } from "@/lib/products";
import { buildOrderWhere } from "@/lib/adminFilters";

export const dynamic = "force-dynamic";

function authorized(req: Request): boolean {
  const token = process.env.ADMIN_API_TOKEN;
  if (!token) return false;
  return req.headers.get("authorization") === `Bearer ${token}`;
}

// Quote a CSV cell if it contains a comma, quote, or newline (RFC 4180).
function cell(value: unknown): string {
  const s = value == null ? "" : String(value);
  return /[",\r\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

/**
 * GET /api/admin/export?from=&to=&product=&status=   (admin only)
 * Streams a CSV of orders matching the same filters as the dashboard table.
 * Auth: Authorization: Bearer <ADMIN_API_TOKEN>
 */
export async function GET(req: Request) {
  if (!authorized(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const url = new URL(req.url);
  const where = buildOrderWhere(url);

  const orders = await prisma.order.findMany({
    where: where as Prisma.OrderWhereInput,
    orderBy: { createdAt: "desc" },
  });

  const header = [
    "Reference",
    "Date (UTC)",
    "Product",
    "Email",
    "Phone",
    "Category",
    "Amount (GHS)",
    "Currency",
    "Status",
    "Voucher Code",
    "Email Sent",
  ];

  const rows = orders.map((o) => [
    o.reference,
    o.createdAt.toISOString(),
    getProduct(o.productType)?.name ?? o.productType,
    o.email,
    o.phone ?? "",
    o.category,
    (o.amount / 100).toFixed(2),
    o.currency,
    o.status,
    o.voucherCode ?? "",
    o.emailSent ? "yes" : "no",
  ]);

  // Prepend a UTF-8 BOM so Excel opens GH\u20b5 and accents correctly.
  const body =
    "\uFEFF" +
    [header, ...rows].map((r) => r.map(cell).join(",")).join("\r\n");

  const stamp = new Date().toISOString().slice(0, 10);
  return new NextResponse(body, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="edupass-orders-${stamp}.csv"`,
      "Cache-Control": "no-store",
    },
  });
}
