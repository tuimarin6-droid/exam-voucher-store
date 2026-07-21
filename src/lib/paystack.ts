import crypto from "crypto";

const PAYSTACK_BASE = "https://api.paystack.co";

function secretKey(): string {
  const key = process.env.PAYSTACK_SECRET_KEY;
  if (!key) throw new Error("PAYSTACK_SECRET_KEY is not set");
  return key;
}

export interface InitializeArgs {
  email: string;
  amount: number; // minor units (pesewas)
  currency?: string;
  reference: string;
  callbackUrl: string;
  metadata?: Record<string, unknown>;
}

export interface PaystackInitializeResponse {
  authorization_url: string;
  access_code: string;
  reference: string;
}

/** Create a transaction and get the hosted checkout URL. Server-side only. */
export async function initializeTransaction(
  args: InitializeArgs
): Promise<PaystackInitializeResponse> {
  const res = await fetch(`${PAYSTACK_BASE}/transaction/initialize`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${secretKey()}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      email: args.email,
      amount: args.amount,
      currency: args.currency ?? "GHS",
      reference: args.reference,
      callback_url: args.callbackUrl,
      metadata: args.metadata ?? {},
    }),
    cache: "no-store",
  });

  const json = await res.json();
  if (!res.ok || !json.status) {
    throw new Error(json?.message || "Paystack initialize failed");
  }
  return json.data as PaystackInitializeResponse;
}

export interface VerifiedTransaction {
  reference: string;
  status: string; // "success" when paid
  amount: number; // minor units actually paid
  currency: string;
  paidAt: string | null;
  customerEmail: string | null;
  metadata: Record<string, unknown> | null;
}

/**
 * Verify a transaction directly against Paystack. This is the ONLY source of
 * truth for whether money was received. Never trust the browser redirect alone.
 */
export async function verifyTransaction(
  reference: string
): Promise<VerifiedTransaction> {
  const res = await fetch(
    `${PAYSTACK_BASE}/transaction/verify/${encodeURIComponent(reference)}`,
    {
      method: "GET",
      headers: { Authorization: `Bearer ${secretKey()}` },
      cache: "no-store",
    }
  );

  const json = await res.json();
  if (!res.ok || !json.status) {
    throw new Error(json?.message || "Paystack verify failed");
  }

  const d = json.data;
  return {
    reference: d.reference,
    status: d.status,
    amount: d.amount,
    currency: d.currency,
    paidAt: d.paid_at ?? null,
    customerEmail: d.customer?.email ?? null,
    metadata: d.metadata ?? null,
  };
}

/**
 * Verify the webhook signature. Paystack signs the RAW request body with
 * HMAC-SHA512 using your secret key and sends it in the x-paystack-signature
 * header. Compare using a timing-safe comparison.
 */
export function isValidWebhookSignature(
  rawBody: string,
  signature: string | null
): boolean {
  if (!signature) return false;
  const expected = crypto
    .createHmac("sha512", secretKey())
    .update(rawBody, "utf8")
    .digest("hex");
  const a = Buffer.from(expected);
  const b = Buffer.from(signature);
  if (a.length !== b.length) return false;
  return crypto.timingSafeEqual(a, b);
}

/** Generate a unique, readable payment reference. */
export function newReference(prefix = "EPG"): string {
  return `${prefix}_${Date.now()}_${crypto.randomBytes(4).toString("hex")}`;
}
