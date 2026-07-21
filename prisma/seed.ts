/**
 * Optional seed: loads the sample voucher CSV so you can test end-to-end
 * without a real code batch. Run: npx tsx prisma/seed.ts
 */
import { readFileSync } from "fs";
import path from "path";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const csv = readFileSync(path.join(process.cwd(), "data", "sample-vouchers.csv"), "utf8");
  const rows = csv
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean)
    .filter((l) => l.split(",")[0].toLowerCase() !== "code")
    .map((l) => {
      const [code, type] = l.split(",").map((c) => c.trim());
      return { code, productType: type, status: "AVAILABLE" as const };
    });

  const res = await prisma.voucher.createMany({ data: rows, skipDuplicates: true });
  console.log(`Seeded ${res.count} vouchers.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
