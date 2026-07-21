// Shared admin query helpers used by the overview, export, and summary
// endpoints so the dashboard table, chart, and CSVs all filter identically.

export type OrderWhere = {
  createdAt?: { gte?: Date; lte?: Date };
  productType?: string;
  status?: string;
};

export type Bucket = "day" | "week";

const DAY_MS = 24 * 60 * 60 * 1000;

/** Parse ?from / ?to (YYYY-MM-DD) into an inclusive UTC date window. */
export function dateWindow(url: URL): { gte?: Date; lte?: Date } {
  const from = url.searchParams.get("from");
  const to = url.searchParams.get("to");
  const window: { gte?: Date; lte?: Date } = {};
  if (from) window.gte = new Date(`${from}T00:00:00.000Z`);
  if (to) window.lte = new Date(`${to}T23:59:59.999Z`);
  return window;
}

/**
 * Build a Prisma `where` for orders from ?from, ?to, ?product, ?status.
 * `product` matches Order.productType (the catalog id); `status` matches the
 * OrderStatus enum. "all" or missing means no constraint on that field.
 */
export function buildOrderWhere(url: URL): OrderWhere {
  const where: OrderWhere = {};
  const window = dateWindow(url);
  if (window.gte || window.lte) where.createdAt = window;

  const product = url.searchParams.get("product");
  if (product && product !== "all") where.productType = product;

  const status = url.searchParams.get("status");
  if (status && status !== "all") where.status = status;

  return where;
}

/**
 * Revenue where: date + product filters only, forced to FULFILLED. Used by the
 * chart and revenue summary so the numbers reflect real money regardless of the
 * status filter chosen for the table.
 */
export function buildRevenueWhere(url: URL): OrderWhere {
  const where: OrderWhere = { status: "FULFILLED" };
  const window = dateWindow(url);
  if (window.gte || window.lte) where.createdAt = window;
  const product = url.searchParams.get("product");
  if (product && product !== "all") where.productType = product;
  return where;
}

/** "day" (default) or "week" from ?bucket. */
export function bucketMode(url: URL): Bucket {
  return url.searchParams.get("bucket") === "week" ? "week" : "day";
}

/** Monday 00:00 UTC of the week containing `d`. */
function startOfUtcWeek(d: Date): Date {
  const dow = (d.getUTCDay() + 6) % 7; // 0 = Monday
  const s = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
  s.setUTCDate(s.getUTCDate() - dow);
  return s;
}

function startOfUtcDay(d: Date): Date {
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
}

/** The bucket key (YYYY-MM-DD of the day, or of the week's Monday). */
export function keyForDate(d: Date, mode: Bucket): string {
  return (mode === "week" ? startOfUtcWeek(d) : startOfUtcDay(d))
    .toISOString()
    .slice(0, 10);
}

/**
 * Ordered bucket keys + display labels spanning the effective range.
 * Defaults: last 14 days, or last 12 weeks in weekly mode. Capped at 60 buckets.
 */
export function bucketAxis(url: URL): {
  mode: Bucket;
  keys: string[];
  labels: Record<string, string>;
  gte: Date;
  lte: Date;
} {
  const mode = bucketMode(url);
  const window = dateWindow(url);
  const end = window.lte ?? new Date();
  const defaultStart =
    mode === "week"
      ? new Date(end.getTime() - 11 * 7 * DAY_MS)
      : new Date(end.getTime() - 13 * DAY_MS);
  const start = window.gte ?? defaultStart;

  const keys: string[] = [];
  const labels: Record<string, string> = {};
  const step = mode === "week" ? 7 : 1;
  const cursor = mode === "week" ? startOfUtcWeek(start) : startOfUtcDay(start);
  const last = mode === "week" ? startOfUtcWeek(end) : startOfUtcDay(end);

  while (cursor <= last && keys.length < 60) {
    const k = cursor.toISOString().slice(0, 10);
    keys.push(k);
    labels[k] = mode === "week" ? `wk ${k.slice(5)}` : k.slice(5);
    cursor.setUTCDate(cursor.getUTCDate() + step);
  }

  const first = keys[0] ?? startOfUtcDay(end).toISOString().slice(0, 10);
  const lastKey = keys[keys.length - 1] ?? first;
  const spanEnd =
    mode === "week"
      ? new Date(new Date(`${lastKey}T00:00:00.000Z`).getTime() + 6 * DAY_MS + (DAY_MS - 1))
      : new Date(`${lastKey}T23:59:59.999Z`);

  return {
    mode,
    keys,
    labels,
    gte: window.gte ?? new Date(`${first}T00:00:00.000Z`),
    lte: window.lte ?? spanEnd,
  };
}
