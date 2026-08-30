import { NextResponse } from "next/server";
import { fulfilByReference } from "@/lib/fulfilment";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

function authorized(req: Request): boolean {
  const token = process.env.ADMIN_API_TOKEN;
  if (!token) return false;
  const header = req.headers.get("authorization");
  return header === `Bearer ${token}`;
}

/**
 * POST /api/admin/retry   body: { reference: string }   (admin only)
 *
 * Manually re-runs fulfilment for one order, on demand — for when a
 * customer says "I paid but got nothing" and support needs to resolve it
 * right away instead of waiting on the webhook or the customer reloading
 * /success. Uses the exact same idempotent routine as the webhook and the
 * redirect verify, so it can never double-dispense a voucher.
 */
export async function POST(req: Request) {
  if (!authorized(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: any;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const reference: string | undefined = body?.reference;
  if (!reference) {
    return NextResponse.json({ error: "Missing reference" }, { status: 400 });
  }

  try {
    const result = await fulfilByReference(reference);
    return NextResponse.json(result);
  } catch (err) {
    console.error(`[retry] error fulfilling ${reference}:`, err);
    return NextResponse.json({ error: "Retry failed" }, { status: 500 });
  }
}