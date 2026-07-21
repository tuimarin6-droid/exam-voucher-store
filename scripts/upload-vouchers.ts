/**
 * Manual bulk upload of voucher codes  ->  the "manual upload" half of the
 * "manual upload, automatic dispensing" system.
 *
 * Usage:
 *   npm run vouchers:upload -- --type WASSCE --file ./data/sample-vouchers.csv
 *   npm run vouchers:upload -- --type BECE --file ./codes.txt
 *
 * Accepts a .csv or .txt file with one code per line. If the CSV has a header
 * row containing "code", it is skipped. Optionally a second column can specify
 * the product type per row (overrides --type).
 *
 * Safe to re-run: duplicate codes are skipped (Voucher.code is unique).
 */
import { readFileSync } from "fs";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const VALID_TYPES = ["WASSCE", "WASSCE_PRIVATE", "BECE"] as const;
type VoucherType = (typeof VALID_TYPES)[number];

function arg(name: string): string | undefined {
  const i = process.argv.indexOf(`--${name}`);
  return i >= 0 ? process.argv[i + 1] : undefined;
}

async function main() {
  const defaultType = arg("type") as VoucherType | undefined;
  const file = arg("file");

  if (!file) throw new Error("Missing --file <path>");
  if (defaultType && !VALID_TYPES.includes(defaultType)) {
    throw new Error(`--type must be one of: ${VALID_TYPES.join(", ")}`);
  }

  const raw = readFileSync(file, "utf8");
  const lines = raw.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);

  const rows: { code: string; productType: VoucherType }[] = [];
  for (const line of lines) {
    const cols = line.split(",").map((c) => c.trim());
    // Skip a header row like "code" or "code,type".
    if (cols[0].toLowerCase() === "code") continue;
    const code = cols[0];
    const rowType = (cols[1] as VoucherType) || defaultType;
    if (!code) continue;
    if (!rowType || !VALID_TYPES.includes(rowType)) {
      throw new Error(`No valid product type for code "${code}". Use --type or a second CSV column.`);
    }
    rows.push({ code, productType: rowType });
  }

  if (rows.length === 0) {
    console.log("No codes found in file.");
    return;
  }

  // createMany + skipDuplicates makes re-uploads safe and idempotent.
  const result = await prisma.voucher.createMany({
    data: rows.map((r) => ({ code: r.code, productType: r.productType, status: "AVAILABLE" as const })),
    skipDuplicates: true,
  });

  console.log(`Parsed ${rows.length} codes. Inserted ${result.count} new (duplicates skipped).`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
