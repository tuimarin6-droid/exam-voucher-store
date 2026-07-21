import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { PRODUCTS, getProduct } from "@/lib/products";
import {
  buildOrderWhere,
  buildRevenueWhere,
  bucketAxis,
  keyForDate,
} from "@/lib/adminFilters";

export const dynamic = "force-dynamic";

function authorized(req: Request): boolean {
  const token = process.env.ADMIN_API_TOKEN;
  if (!token) return false;
  return req.headers.get("authorization") === `Bearer ${token}`;
}

function cell(value: unknown): string {
  const s = value == null ? "" : String(value);
  return /[",\r\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

const STATUSES = ["PENDING", "PAID", "FULFILLED", "FAILED", "OUT_OF_STOCK"] as const;

/**
 * GET /api/admin/summary?from=&to=&product=&status=&bucket=   (admin only)
 * A single CSV with three summary sections: revenue by product, orders by
 * status, and revenue by day/week. Revenue always reflects FULFILLED orders
 * (date + product scoped); status counts reflect the full filter set.
 * Auth: Authorization: Bearer <ADMIN_API_TOKEN>
 */
export async function GET(req: Request) {
  if (!authorized(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const url = new URL(req.url);
  const where = buildOrderWhere(url);
  const revenueWhere = buildRevenueWhere(url);
  const axis = bucketAxis(url);

  const [byProduct, byStatus, revenueOrders] = await Promise.all([
    prisma.order.groupBy({
      by: ["productType"],
      _count: { _all: true },
      _sum: { amount: true },
      where: revenueWhere,
    }),
    prisma.order.groupBy({
      by: ["status"],
      _count: { _all: true },
      where,
    }),
    prisma.order.findMany({
      where: { ...revenueWhere, createdAt: { gte: axis.gte, lte: axis.lte } },
      select: { amount: true, createdAt: true },
    }),
  ]);

  const money = (minor: number) => (minor / 100).toFixed(2);

  // --- Section 1: revenue by product (fulfilled) ---
  const prodMap = new Map<string, { count: number; amount: number }>();
  for (const r of byProduct) {
    prodMap.set(r.productType, {
      count: r._count._all,
      amount: r._sum.amount ?? 0,
    });
  }
  const productRows = PRODUCTS.map((p) => {
    const v = prodMap.get(p.id) ?? { count: 0, amount: 0 };
    return [p.name, v.count, money(v.amount)];
  });
  const productTotal = [...prodMap.values()].reduce((a, v) => a + v.amount, 0);
  const productCountTotal = [...prodMap.values()].reduce((a, v) => a + v.count, 0);

  // --- Section 2: orders by status (full filter set) ---
  const statusMap: Record<string, number> = {};
  for (const r of byStatus) statusMap[r.status] = r._count._all;
  const statusRows = STATUSES.map((s) => [s, statusMap[s] ?? 0]);
  const statusTotal = STATUSES.reduce((a, s) => a + (statusMap[s] ?? 0), 0);

  // --- Section 3: revenue by day/week ---
  const buckets: Record<string, { count: number; amount: number }> =
    Object.fromEntries(axis.keys.map((k) => [k, { count: 0, amount: 0 }]));
  for (const o of revenueOrders) {
    const key = keyForDate(o.createdAt, axis.mode);
    if (key in buckets) {
      buckets[key].count += 1;
      buckets[key].amount += o.amount;
    }
  }
  const periodRows = axis.keys.map((k) => [
    k,
    buckets[k].count,
    money(buckets[k].amount),
  ]);
  const periodTotal = axis.keys.reduce((a, k) => a + buckets[k].amount, 0);

  const filters = {
    from: url.searchParams.get("from") ?? "",
    to: url.searchParams.get("to") ?? "",
    product: getProduct(url.searchParams.get("product") ?? "")?.name ?? "All",
    status: url.searchParams.get("status") ?? "All",
    bucket: axis.mode,
  };

  const lines: (string | number)[][] = [
    ["EduPass GH \u2014 Revenue summary"],
    ["Generated (UTC)", new Date().toISOString()],
    [
      "Filters",
      `from=${filters.from || "start"}; to=${filters.to || "today"}; product=${filters.product}; status=${filters.status}; bucket=${filters.bucket}`,
    ],
    [],
    ["Revenue by product (fulfilled)"],
    ["Product", "Fulfilled orders", "Revenue (GHS)"],
    ...productRows,
    ["Total", productCountTotal, money(productTotal)],
    [],
    ["Orders by status"],
    ["Status", "Orders"],
    ...statusRows,
    ["Total", statusTotal],
    [],
    [`Revenue by ${axis.mode}`],
    [axis.mode === "week" ? "Week starting" : "Day", "Fulfilled orders", "Revenue (GHS)"],
    ...periodRows,
    ["Total", "", money(periodTotal)],
  ];

  const body =
    "\uFEFF" + lines.map((r) => r.map(cell).join(",")).join("\r\n");
  const stamp = new Date().toISOString().slice(0, 10);

  return new NextResponse(body, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="edupass-revenue-summary-${stamp}.csv"`,
      "Cache-Control": "no-store",
    },
  });
}
