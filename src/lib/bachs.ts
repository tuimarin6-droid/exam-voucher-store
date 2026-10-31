import crypto from "crypto";

/**
 * Bachs (https://bachs.io) hosted-checkout integration.
 * Docs: https://docs.bachs.io
 *
 *  - Auth:      Authorization: Bearer <BACHS_SECRET_KEY>   (sk_sandbox_... or sk_live_...)
 *  - Create:    POST /v1/checkout-sessions
 *  - Retrieve:  GET  /v1/checkout-sessions/{checkout_id}
 *  - Webhooks:  signed with HMAC-SHA256 over `${timestamp}.${rawBody}`
 *  - Amounts:   DECIMAL STRINGS ("25.50"), never minor units.
 *
 * Our internal Order.amount is in pesewas, so we convert at the boundary.
 */

export const BACHS_REFERENCE_PREFIX = "BCH";

function secretKey(): string {
  const key = process.env.BACHS_SECRET_KEY;
  if (!key) throw new Error("BACHS_SECRET_KEY is not set");
  return key;
}

function baseUrl(): string {
  if (process.env.BACHS_API_BASE) return process.env.BACHS_API_BASE.replace(/\/$/, "");
  return secretKey().startsWith("sk_sandbox_")
    ? "https://sandbox-api.bachs.io"
    : "https://api.bachs.io";
}

/** 2550 (pesewas) -> "25.50" */
export function minorToDecimalString(minor: number): string {
  return (minor / 100).toFixed(2);
}

/** "25.50" | 25.5 -> 2550. Returns null if it can't be parsed. */
export function decimalToMinor(value: unknown): number | null {
  const n = typeof value === "string" ? parseFloat(value) : typeof value === "number" ? value : NaN;
  return Number.isFinite(n) ? Math.round(n * 100) : null;
}

export interface BachsCheckoutSession {
  checkout_id: string;
  checkout_url: string;
  status?: string;
  [k: string]: unknown;
}

async function bachsFetch(path: string, init: RequestInit & { idempotencyKey?: string } = {}) {
  const headers: Record<string, string> = {
    Authorization: `Bearer ${secretKey()}`,
    "Content-Type": "application/json",
  };
  if (init.idempotencyKey) headers["Idempotency-Key"] = init.idempotencyKey;
  const res = await fetch(`${baseUrl()}${path}`, {
    ...init,
    headers: { ...headers, ...(init.headers as Record<string, string> | undefined) },
    cache: "no-store",
  });
  let json: any = null;
  try {
    json = await res.json();
  } catch {
    /* non-JSON body */
  }
  if (!res.ok) {
    const detail = json?.detail || json?.message || json?.error_code || res.statusText;
    throw new Error(`Bachs ${res.status}: ${detail}`);
  }
  return json;
}

export interface CreateCheckoutArgs {
  email: string;
  amountMinor: number;
  currency: string;
  reference: string;
  successUrl: string;
  cancelUrl: string;
  metadata?: Record<string, string>;
}

/** Create a hosted checkout session and return its URL. Server-side only. */
export async function createCheckoutSession(args: CreateCheckoutArgs): Promise<BachsCheckoutSession> {
  const json = await bachsFetch("/v1/checkout-sessions", {
    method: "POST",
    idempotencyKey: args.reference,
    body: JSON.stringify({
      customer: { email: args.email, name: args.email.split("@")[0] },
      pricing: {
        currency: args.currency,
        amount: minorToDecimalString(args.amountMinor),
      },
      success_url: args.successUrl,
      cancel_url: args.cancelUrl,
      reference: args.reference,
      metadata: { ...(args.metadata ?? {}), reference: args.reference },
    }),
  });
  // Tolerate the response being wrapped in { data: ... }.
  const s = (json?.data ?? json) as BachsCheckoutSession;
  if (!s?.checkout_url || !s?.checkout_id) {
    throw new Error("Bachs returned no checkout_url");
  }
  return s;
}

export async function getCheckoutSession(checkoutId: string): Promise<any> {
  const json = await bachsFetch(`/v1/checkout-sessions/${encodeURIComponent(checkoutId)}`, {
    method: "GET",
  });
  return json?.data ?? json;
}

/** Our reference as stored on the Bachs session (top-level `reference` or metadata). */
export function referenceFromSession(session: any): string | null {
  return session?.reference ?? session?.metadata?.reference ?? null;
}

const PAID_STATUSES = new Set(["completed", "complete", "paid", "succeeded", "success"]);

export function sessionLooksPaid(session: any): boolean {
  const s = String(session?.status ?? "").toLowerCase();
  return PAID_STATUSES.has(s);
}

/**
 * Verify a Bachs webhook delivery.
 *
 * Preferred: X-Bachs-Signature-V2 = "t=<unix>,v1=<hex>[,v1=<hex>...]"
 * Legacy:    X-Bachs-Timestamp + X-Bachs-Signature (hex)
 * Signed string: `${timestamp}.${rawBody}`, HMAC-SHA256 with the endpoint's
 * signing secret, hex-encoded. Rejects deliveries older/newer than 5 minutes.
 */
export function verifyBachsWebhook(rawBody: string, headers: Headers, toleranceSeconds = 300): boolean {
  const secret = process.env.BACHS_WEBHOOK_SECRET;
  if (!secret) throw new Error("BACHS_WEBHOOK_SECRET is not set");

  let timestamp: string | null = null;
  let candidates: string[] = [];

  const v2 = headers.get("x-bachs-signature-v2");
  if (v2) {
    for (const part of v2.split(",")) {
      const [k, ...rest] = part.trim().split("=");
      const v = rest.join("=");
      if (k === "t") timestamp = v;
      if (k === "v1") candidates.push(v);
    }
  } else {
    timestamp = headers.get("x-bachs-timestamp");
    const sig = headers.get("x-bachs-signature");
    if (sig) candidates = [sig];
  }

  if (!timestamp || candidates.length === 0) return false;
  const ts = Number(timestamp);
  if (!Number.isFinite(ts)) return false;
  if (Math.abs(Date.now() / 1000 - ts) > toleranceSeconds) return false;

  const expected = crypto
    .createHmac("sha256", secret)
    .update(`${timestamp}.${rawBody}`, "utf8")
    .digest("hex");
  const a = Buffer.from(expected);
  return candidates.some((c) => {
    const b = Buffer.from(c);
    return a.length === b.length && crypto.timingSafeEqual(a, b);
  });
}
