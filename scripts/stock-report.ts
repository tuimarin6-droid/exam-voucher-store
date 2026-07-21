/**
 * Print current stock levels per voucher type.
 * Usage: npm run vouchers:stock
 */
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const grouped = await prisma.voucher.groupBy({
    by: ["productType", "status"],
    _count: { _all: true },
  });

  const report: Record<string, Record<string, number>> = {};
  for (const row of grouped) {
    report[row.productType] ??= {};
    report[row.productType][row.status] = row._count._all;
  }

  console.log("\nStock report\n============");
  for (const [type, statuses] of Object.entries(report)) {
    const available = statuses["AVAILABLE"] ?? 0;
    const sold = statuses["SOLD"] ?? 0;
    console.log(`${type.padEnd(16)} available: ${String(available).padStart(4)}   sold: ${String(sold).padStart(4)}`);
  }
  console.log("");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
