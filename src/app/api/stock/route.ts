import { NextResponse } from "next/server";
import { getStockReport } from "@/lib/inventory";

export const dynamic = "force-dynamic";

/**
 * GET /api/stock  (admin only)
 * Protected by a bearer token so only you can see inventory levels.
 * Send header:  Authorization: Bearer <ADMIN_API_TOKEN>
 */
export async function GET(req: Request) {
  const token = process.env.ADMIN_API_TOKEN;
  const auth = req.headers.get("authorization");
  if (!token || auth !== `Bearer ${token}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const report = await getStockReport();
  return NextResponse.json({ stock: report });
}
