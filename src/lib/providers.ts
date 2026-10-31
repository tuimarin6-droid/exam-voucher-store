/**
 * Which payment providers are switched on, and which one is the default.
 *
 * Controlled by ONE env var (readable in the browser too):
 *   NEXT_PUBLIC_PAYMENT_PROVIDERS="bachs,paystack"
 * The FIRST entry is the default / pre-selected at checkout. If only one is
 * listed, the checkout shows no chooser. Unset -> "paystack" (old behaviour).
 */
export type PaymentProvider = "paystack" | "bachs";

export function enabledProviders(): PaymentProvider[] {
  const raw = process.env.NEXT_PUBLIC_PAYMENT_PROVIDERS || "paystack";
  const list = raw
    .split(",")
    .map((s) => s.trim().toLowerCase())
    .filter((s): s is PaymentProvider => s === "paystack" || s === "bachs");
  return list.length ? list : ["paystack"];
}

export function defaultProvider(): PaymentProvider {
  return enabledProviders()[0];
}

/** The provider is encoded in the order reference prefix (no DB change needed). */
export function providerOfReference(reference: string): PaymentProvider {
  return reference.startsWith("BCH_") ? "bachs" : "paystack";
}
