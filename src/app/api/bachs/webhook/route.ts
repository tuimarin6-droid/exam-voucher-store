import { NextResponse } from "next/server";
import {
  verifyBachsWebhook,
  getCheckoutSession,
  referenceFromSession,
  decimalToMinor,
} from "@/lib/bachs";
import { fulfilByReference } from "@/lib/fulfilment";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/**
 * POST /api/bachs/webhook
 * Bachs calls this when a payment lands. This is the PRIMARY, authoritative
 * fulfilment path for Bachs orders (the browser redirect is only a bonus).
 *
 * Register this URL in Bachs: Developer Portal -> Webhooks -> Add destination,
 * subscribe to `collection.succeeded` (and optionally `checkout.completed`),
 * then copy the signing secret into BACHS_WEBHOOK_SECRET.
 */
export async function POST(req: Request) {
  const rawBody = await req.text();

  let valid = false;
  try {
    valid = verifyBachsWebhook(rawBody, req.headers);
  } catch (err) {
    console.error("[bachs webhook] config error:", err);
    return NextResponse.json({ error: "Server misconfigured" }, { status: 500 });
  }
  if (!valid) return NextResponse.json({ error: "Invalid signature" }, { status: 401 });

  let event: any;
  try {
    event = JSON.parse(rawBody);
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  // Payment is confirmed by collection.succeeded (checkout.completed is the
  // same payment; fulfilment is idempotent so either is fine).
  if (event?.type !== "collection.succeeded" && event?.type !== "checkout.completed") {
    return NextResponse.json({ received: true, ignored: event?.type ?? "unknown" });
  }

  const data = event?.data ?? event?.payload ?? {};

  try {
    // Find OUR reference: on the event, else look the session up.
    let reference: string | null =
      data.reference ?? data.metadata?.reference ?? data.checkout?.reference ?? null;
    if (!reference) {
      const checkoutId: string | undefined = data.checkout_id ?? data.checkout?.id ?? data.id;
      if (checkoutId) {
        reference = referenceFromSession(await getCheckoutSession(checkoutId));
      }
    }
    if (!reference) {
      console.error("[bachs webhook] could not resolve order reference", event?.id);
      // 400 = Bachs will not retry; nothing more we can do automatically.
      return NextResponse.json({ error: "Missing reference" }, { status: 400 });
    }

    const result = await fulfilByReference(reference, {
      prepaid: {
        amountMinor: decimalToMinor(data.amount),
        currency: typeof data.currency === "string" ? data.currency : null,
      },
    });
    return NextResponse.json({ received: true, status: result.status });
  } catch (err) {
    console.error("[bachs webhook] fulfilment error:", err);
    // 5xx -> Bachs retries (up to 5 attempts), which is what we want.
    return NextResponse.json({ error: "Fulfilment error" }, { status: 500 });
  }
}
