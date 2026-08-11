import { prisma } from "./db";

export class OutOfStockError extends Error {
  constructor(productType: string) {
    super(`No available vouchers for ${productType}`);
    this.name = "OutOfStockError";
  }
}

/**
 * Atomically dispense multiple vouchers for a given product type.
 *
 * Guarantees:
 *  - Idempotent: if this reference already claimed vouchers, those same
 *    vouchers are returned.
 *  - Race-safe: each voucher is conditionally changed from AVAILABLE to SOLD.
 *  - Never intentionally over-sells: if there are not enough vouchers,
 *    OutOfStockError is thrown.
 *  - Every dispensed voucher is connected to the Order through OrderVoucher.
 */
export async function dispenseVouchers(params: {
  voucherType: string;
  email: string;
  reference: string;
  quantity: number;
}): Promise<string[]> {
  const { voucherType, email, reference, quantity } = params;

  if (!Number.isInteger(quantity) || quantity < 1) {
    throw new Error("Quantity must be at least 1.");
  }

  if (quantity > 9) {
    throw new Error("Maximum online voucher quantity is 9.");
  }

  // Find the order first because OrderVoucher needs the Order ID.
  const order = await prisma.order.findUnique({
    where: { reference },
    select: {
      id: true,
      quantity: true,
    },
  });

  if (!order) {
    throw new Error(`Order not found for reference ${reference}`);
  }

  // ------------------------------------------------------------
  // 1. IDEMPOTENCY
  // ------------------------------------------------------------
  // If Paystack webhook + browser verification both call fulfilment,
  // we must return the vouchers already assigned to this order.
  const existing = await prisma.orderVoucher.findMany({
    where: {
      orderId: order.id,
      voucher: {
        productType: voucherType,
      },
    },
    include: {
      voucher: {
        select: {
          code: true,
        },
      },
    },
    orderBy: {
      createdAt: "asc",
    },
  });

  if (existing.length >= quantity) {
    return existing.slice(0, quantity).map((item) => item.voucher.code);
  }

  const vouchersNeeded = quantity - existing.length;
  const claimedCodes: string[] = existing.map(
    (item) => item.voucher.code
  );

  // ------------------------------------------------------------
  // 2. CLAIM AVAILABLE VOUCHERS
  // ------------------------------------------------------------
  for (let i = 0; i < vouchersNeeded; i++) {
    let claimedSuccessfully = false;

    // Retry a few times to survive concurrent requests.
    for (let attempt = 0; attempt < 5; attempt++) {
      const candidate = await prisma.voucher.findFirst({
        where: {
          productType: voucherType,
          status: "AVAILABLE",
        },
        orderBy: {
          createdAt: "asc",
        },
        select: {
          id: true,
          code: true,
        },
      });

      if (!candidate) {
        throw new OutOfStockError(voucherType);
      }

      // Conditional update:
      // The voucher will only be claimed if it is STILL AVAILABLE.
      //
      // This protects against two simultaneous Paystack fulfilment
      // requests trying to claim the same voucher.
      const claimed = await prisma.voucher.updateMany({
        where: {
          id: candidate.id,
          status: "AVAILABLE",
        },
        data: {
          status: "SOLD",
          soldTo: email,
          reference,
          soldAt: new Date(),
        },
      });

      if (claimed.count === 1) {
        // Connect the voucher to the order.
        await prisma.orderVoucher.create({
          data: {
            orderId: order.id,
            voucherId: candidate.id,
          },
        });

        claimedCodes.push(candidate.code);
        claimedSuccessfully = true;
        break;
      }

      // Somebody else claimed this voucher.
      // Try another available voucher.
    }

    if (!claimedSuccessfully) {
      throw new Error(
        "Could not claim a voucher after multiple attempts."
      );
    }
  }

  return claimedCodes;
}

/**
 * Backward-compatible single-voucher helper.
 *
 * Existing parts of the application can still call dispenseVoucher()
 * while the application is being upgraded to multi-voucher purchasing.
 */
export async function dispenseVoucher(params: {
  voucherType: string;
  email: string;
  reference: string;
}): Promise<string> {
  const codes = await dispenseVouchers({
    ...params,
    quantity: 1,
  });

  return codes[0];
}

/**
 * Stock levels per voucher type, for the admin report.
 */
export async function getStockReport() {
  const grouped = await prisma.voucher.groupBy({
    by: ["productType", "status"],
    _count: {
      _all: true,
    },
  });

  const report: Record<
    string,
    {
      available: number;
      sold: number;
      reserved: number;
    }
  > = {};

  for (const row of grouped) {
    report[row.productType] ??= {
      available: 0,
      sold: 0,
      reserved: 0,
    };

    if (row.status === "AVAILABLE") {
      report[row.productType].available = row._count._all;
    }

    if (row.status === "SOLD") {
      report[row.productType].sold = row._count._all;
    }

    if (row.status === "RESERVED") {
      report[row.productType].reserved = row._count._all;
    }
  }

  return report;
}

/**
 * How many codes are available for a given voucher type.
 */
export async function countAvailable(
  voucherType: string
): Promise<number> {
  return prisma.voucher.count({
    where: {
      productType: voucherType,
      status: "AVAILABLE",
    },
  });
}
