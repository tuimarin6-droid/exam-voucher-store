import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

const uploadSchema = z.object({
  voucherType: z.string().min(1),
  rawVouchers: z.string().min(3),
});

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { voucherType, rawVouchers } = uploadSchema.parse(body);

    // Parse lines formatted as SERIAL,PIN or SERIAL PIN
    const lines = rawVouchers
      .split("\n")
      .map((line) => line.trim())
      .filter((line) => line.length > 0);

    const recordsToInsert: { serial: string; pin: string; voucherType: string }[] = [];

    for (const line of lines) {
      const parts = line.split(/[,:\s\t]+/).map((p) => p.trim());
      if (parts.length >= 2) {
        recordsToInsert.push({
          serial: parts[0],
          pin: parts[1],
          voucherType,
        });
      }
    }

    if (recordsToInsert.length === 0) {
      return NextResponse.json(
        { error: "No valid serial/PIN pairs found. Format each line as: SERIAL,PIN" },
        { status: 400 }
      );
    }

    const result = await prisma.voucher.createMany({
      data: recordsToInsert,
      skipDuplicates: true,
    });

    return NextResponse.json({
      success: true,
      addedCount: result.count,
      totalParsed: recordsToInsert.length,
    });
  } catch (err: unknown) {
    console.error("[admin/vouchers] upload error:", err);
    return NextResponse.json(
      { error: "Failed to upload vouchers. Check formatting and try again." },
      { status: 500 }
    );
  }
}

export async function GET() {
  try {
    const counts = await prisma.voucher.groupBy({
      by: ["voucherType", "isUsed"],
      _count: { _all: true },
    });

    return NextResponse.json({ counts });
  } catch (err: unknown) {
    return NextResponse.json({ error: "Failed to fetch stock counts" }, { status: 500 });
  }
}