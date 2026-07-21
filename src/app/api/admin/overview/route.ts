import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getStockReport } from "@/lib/inventory";
import { PRODUCTS, formatGHS, getProduct } from "@/lib/products";
import { buildOrderWhere, buildRevenueWhere, bucketAxis, keyForDate } from "@/lib/adminFilters";

export const dynamic = "force-dynamic";

function authorized(req: Request): boolean {
  const token = process.env.ADMIN_API_TOKEN;
  if (!token) return false;
  const header = req.headers.get("authorization");
  return header === `Bearer ${token}`;
}

/**
 * GET /api/admin/overview?from=&to=&product=&status=&bucket=   (admin only)
 * KPIs + per-type stock are all-time; the orders table + revenue chart respect
 * the active filters (date range, product, status, day/week bucket).
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

  const [stock, orders, revenueAgg, statusCounts, chartOrders] =
    await Promise.all([
      getStockReport(),
      prisma.order.findMany({
        where,
        orderBy: { createdAt: "desc" },
        take: 100,
        select: {
          reference: true,
          email: true,
          productType: true,
          category: true,
          amount: true,
          currency: true,
          status: true,
          voucherCode: true,
          createdAt: true,
        },
      }),
      prisma.order.aggregate({ _sum: { amount: true }, where: revenueWhere }),
      prisma.order.groupBy({ by: ["status"], _count: { _all: true }, where }),
      prisma.order.findMany({
        where: { ...revenueWhere, createdAt: { gte: axis.gte, lte: axis.lte } },
        select: { amount: true, createdAt: true },
      }),
    ]);

  const stockList = PRODUCTS.filter((p) => p.category === "VOUCHER").map((p) => {
    const s = stock[p.voucherType!] ?? { available: 0, sold: 0, reserved: 0 };
    return {
      productId: p.id,
      name: p.name,
      voucherType: p.voucherType,
      available: s.available,
      sold: s.sold,
      low: s.available <= 5,
    };
  });

  const orderList = orders.map((o) => ({
    ...o,
    productName: getProduct(o.productType)?.name ?? o.productType,
    amountLabel: formatGHS(o.amount),
    createdAt: o.createdAt.toISOString(),
  }));

  const counts: Record<string, number> = {};
  for (const c of statusCounts) counts[c.status] = c._count._all;

  // Bucket fulfilled revenue into the day/week axis (minor units).
  const buckets: Record<string, number> = Object.fromEntries(
    axis.keys.map((k) => [k, 0]),
  );
  for (const o of chartOrders) {
    const key = keyForDate(o.createdAt, axis.mode);
    if (key in buckets) buckets[key] += o.amount;
  }
  const series = axis.keys.map((k) => ({
    date: k,
    label: axis.labels[k],
    amount: buckets[k],
    amountLabel: formatGHS(buckets[k]),
  }));

  return NextResponse.json({
    kpis: {
      revenueLabel: formatGHS(revenueAgg._sum.amount ?? 0),
      fulfilled: counts["FULFILLED"] ?? 0,
      pending: counts["PENDING"] ?? 0,
      failed: (counts["FAILED"] ?? 0) + (counts["OUT_OF_STOCK"] ?? 0),
      totalAvailable: stockList.reduce((a, s) => a + s.available, 0),
    },
    stock: stockList,
    orders: orderList,
    series,
    bucket: axis.mode,
    filterOptions: {
      products: PRODUCTS.map((p) => ({ id: p.id, name: p.name })),
      statuses: ["PENDING", "PAID", "FULFILLED", "FAILED", "OUT_OF_STOCK"],
    },
    range: {
      from: url.searchParams.get("from"),
      to: url.searchParams.get("to"),
      product: url.searchParams.get("product"),
      status: url.searchParams.get("status"),
      count: orderList.length,
    },
  });
}
