import { NextResponse } from "next/server";
import { isValidWebhookSignature } from "@/lib/paystack";
import { fulfilByReference } from "@/lib/fulfilment";

// Webhooks must read the RAW body to validate the signature, so disable any
// body parsing/caching.
export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/**
 * POST /api/paystack/webhook
 * Paystack calls this on payment events. This is the PRIMARY, reliable
 * fulfilment path (the browser redirect is only a secondary trigger).
 *
 * Security:
 *   1. Verify the x-paystack-signature HMAC over the raw body.
 *   2. Only act on charge.success.
 *   3. Re-verify the transaction inside fulfilByReference before releasing.
 */
export async function POST(req: Request) {
  const rawBody = await req.text();
  const signature = req.headers.get("x-paystack-signature");

  if (!isValidWebhookSignature(rawBody, signature)) {
    // Do not reveal details. Just reject.
    return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
  }

  let event: any;
  try {
    event = JSON.parse(rawBody);
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  // Acknowledge non-charge events fast so Paystack doesn't retry them.
  if (event?.event !== "charge.success") {
    return NextResponse.json({ received: true, ignored: event?.event ?? "unknown" });
  }

  const reference: string | undefined = event?.data?.reference;
  if (!reference) {
    return NextResponse.json({ error: "Missing reference" }, { status: 400 });
  }

  try {
    const result = await fulfilByReference(reference);
    // Always return 200 for handled events so Paystack stops retrying, even for
    // OUT_OF_STOCK (which we resolve manually) \u2014 the state is recorded.
    return NextResponse.json({ received: true, status: result.status });
  } catch (err) {
    console.error("[webhook] fulfilment error:", err);
    // 500 -> Paystack will retry later, which is what we want for transient errors.
    return NextResponse.json({ error: "Fulfilment error" }, { status: 500 });
  }
}
