import { prisma } from "./db";

export class OutOfStockError extends Error {
  constructor(productType: string) {
    super(`No available vouchers for ${productType}`);
    this.name = "OutOfStockError";
  }
}

/**
 * Atomically dispense exactly one voucher for a given product type and bind it
 * to a Paystack reference.
 *
 * Guarantees:
 *  - Idempotent: if this reference already claimed a code, that same code is
 *    returned (webhooks can fire more than once).
 *  - Race-safe: a conditional update (WHERE status = AVAILABLE) means two
 *    concurrent requests can never dispense the same code. The loser retries.
 *  - Never over-sells: if nothing is available, throws OutOfStockError.
 */
export async function dispenseVoucher(params: {
  voucherType: string;
  email: string;
  reference: string;
}): Promise<string> {
  const { voucherType, email, reference } = params;

  // 1) Idempotency: has this reference already been fulfilled?
  const existing = await prisma.voucher.findFirst({
    where: { reference, productType: voucherType },
  });
  if (existing) return existing.code;

  // 2) Try to claim an available code. Retry a few times to survive races.
  for (let attempt = 0; attempt < 5; attempt++) {
    const candidate = await prisma.voucher.findFirst({
      where: { productType: voucherType, status: "AVAILABLE" },
      orderBy: { createdAt: "asc" },
      select: { id: true, code: true },
    });

    if (!candidate) throw new OutOfStockError(voucherType);

    // Conditional update: only succeeds if the row is STILL available.
    const claimed = await prisma.voucher.updateMany({
      where: { id: candidate.id, status: "AVAILABLE" },
      data: {
        status: "SOLD",
        soldTo: email,
        reference,
        soldAt: new Date(),
      },
    });

    if (claimed.count === 1) return candidate.code;
    // Otherwise another request grabbed it first -> loop and try again.
  }

  throw new Error("Could not claim a voucher after multiple attempts");
}

/** Stock levels per voucher type, for the admin report. */
export async function getStockReport() {
  const grouped = await prisma.voucher.groupBy({
    by: ["productType", "status"],
    _count: { _all: true },
  });

  const report: Record<string, { available: number; sold: number; reserved: number }> = {};
  for (const row of grouped) {
    report[row.productType] ??= { available: 0, sold: 0, reserved: 0 };
    if (row.status === "AVAILABLE") report[row.productType].available = row._count._all;
    if (row.status === "SOLD") report[row.productType].sold = row._count._all;
    if (row.status === "RESERVED") report[row.productType].reserved = row._count._all;
  }
  return report;
}

/** How many codes are available for a given type (for the storefront badge). */
export async function countAvailable(voucherType: string): Promise<number> {
  return prisma.voucher.count({
    where: { productType: voucherType, status: "AVAILABLE" },
  });
}
