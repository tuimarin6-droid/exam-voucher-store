"use client";

import { Suspense, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { PRODUCTS, formatGHS, getProduct } from "@/lib/products";
import { ArrowRight, Check, Lock, ShieldCheck } from "@/components/icons";

function CheckoutInner() {
  const params = useSearchParams();

  const initialId = params.get("product") ?? PRODUCTS[0].id;

  const [productId, setProductId] = useState(initialId);
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [quantity, setQuantity] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const product = getProduct(productId) ?? PRODUCTS[0];

  const isForm = product.category === "FORM";
  const isVoucher = product.category === "VOUCHER";

  const emailValid = /.+@.+\..+/.test(email);

  /*
   * Forms are always quantity 1.
   * Online voucher purchases are limited to 1–9.
   */
  const effectiveQuantity = isForm ? 1 : quantity;

  const totalAmount = product.amount * effectiveQuantity;

  function changeProduct(id: string) {
    setProductId(id);
    setError(null);

    const selectedProduct = getProduct(id);

    if (selectedProduct?.category === "FORM") {
      setQuantity(1);
    }
  }

  async function pay() {
    setError(null);

    if (!emailValid) {
      return setError("Please enter a valid email address.");
    }

    if (isForm && phone.trim().length < 6) {
      return setError("Please enter your phone number for WhatsApp.");
    }

    if (isVoucher && (quantity < 1 || quantity > 9)) {
      return setError(
        "Online purchases are limited to 1–9 vouchers. For 10 or more vouchers, contact us on WhatsApp for bulk pricing."
      );
    }

    setLoading(true);

    try {
      const res = await fetch("/api/paystack/initialize", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          productId,
          email,
          phone: phone || undefined,
          quantity: effectiveQuantity,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(
          data.error || "Could not start payment."
        );
      }

      window.location.href = data.authorizationUrl;
    } catch (e: any) {
      setError(e.message);
      setLoading(false);
    }
  }

  return (
    <div className="mx-auto max-w-5xl px-5 py-10">
      <Link
        href="/"
        className="text-sm font-semibold text-brand-600 hover:text-brand-700"
      >
        ← Back to store
      </Link>

      <h1 className="mt-3 font-display text-2xl font-800 text-ink-900 sm:text-3xl">
        Checkout
      </h1>

      <div className="mt-8 grid gap-8 lg:grid-cols-[1fr_380px]">

        {/* =========================
            CHECKOUT FORM
        ========================== */}
        <div className="card p-6">

          <label className="block text-sm font-600 text-ink-900">
            Product
          </label>

          <div className="mt-2 grid gap-2">
            {PRODUCTS.map((p) => (
              <button
                key={p.id}
                type="button"
                onClick={() => changeProduct(p.id)}
                className={
                  "flex items-center justify-between rounded-xl border px-4 py-3 text-left transition-colors duration-200 cursor-pointer " +
                  (p.id === productId
                    ? "border-brand-600 bg-brand-50"
                    : "border-[#e6e5e3] bg-white hover:bg-[#f7f9fc]")
                }
              >
                <span className="text-sm font-600 text-ink-900">
                  {p.name}
                </span>

                <span className="flex items-center gap-2 text-sm font-700 text-ink-900">
                  {formatGHS(p.amount)}

                  {p.id === productId && (
                    <span className="grid h-5 w-5 place-items-center rounded-full bg-brand-600 text-white">
                      <Check width={13} height={13} />
                    </span>
                  )}
                </span>
              </button>
            ))}
          </div>

          {/* =========================
              QUANTITY
          ========================== */}
          {isVoucher && (
            <div className="mt-6">
              <label
                htmlFor="quantity"
                className="block text-sm font-600 text-ink-900"
              >
                Number of vouchers
              </label>

              <div className="mt-2 flex items-center gap-3">
                <button
                  type="button"
                  onClick={() =>
                    setQuantity((current) =>
                      Math.max(1, current - 1)
                    )
                  }
                  disabled={quantity <= 1}
                  className="grid h-11 w-11 place-items-center rounded-xl border border-[#e6e5e3] bg-white text-lg font-700 text-ink-900 transition hover:bg-[#f7f9fc] disabled:cursor-not-allowed disabled:opacity-40"
                  aria-label="Decrease voucher quantity"
                >
                  −
                </button>

                <div
                  id="quantity"
                  className="grid h-11 min-w-16 place-items-center rounded-xl border border-brand-600 bg-brand-50 px-4 text-base font-700 text-ink-900"
                >
                  {quantity}
                </div>

                <button
                  type="button"
                  onClick={() =>
                    setQuantity((current) =>
                      Math.min(9, current + 1)
                    )
                  }
                  disabled={quantity >= 9}
                  className="grid h-11 w-11 place-items-center rounded-xl border border-[#e6e5e3] bg-white text-lg font-700 text-ink-900 transition hover:bg-[#f7f9fc] disabled:cursor-not-allowed disabled:opacity-40"
                  aria-label="Increase voucher quantity"
                >
                  +
                </button>
              </div>

              <p className="mt-2 text-xs text-ink-500">
                You can purchase up to 9 vouchers online.
              </p>

              <p className="mt-2 rounded-lg bg-brand-50 px-3 py-2 text-xs text-brand-700">
                Need 10 or more vouchers? Contact us on WhatsApp for
                special bulk pricing.
              </p>
            </div>
          )}

          {/* =========================
              EMAIL
          ========================== */}
          <div className="mt-6">
            <label
              htmlFor="email"
              className="block text-sm font-600 text-ink-900"
            >
              Email address
            </label>

            <input
              id="email"
              type="email"
              inputMode="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              className="mt-2 w-full rounded-xl border border-[#e6e5e3] px-4 py-3 text-sm outline-none focus:border-brand-600 focus:ring-2 focus:ring-brand-500/30"
            />

            <p className="mt-1.5 text-xs text-ink-500">
              Your voucher / receipt will be sent here.
            </p>
          </div>

          {/* =========================
              PHONE FOR FORMS
          ========================== */}
          {isForm && (
            <div className="mt-4">
              <label
                htmlFor="phone"
                className="block text-sm font-600 text-ink-900"
              >
                WhatsApp phone number
              </label>

              <input
                id="phone"
                type="tel"
                inputMode="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="024 123 4567"
                className="mt-2 w-full rounded-xl border border-[#e6e5e3] px-4 py-3 text-sm outline-none focus:border-brand-600 focus:ring-2 focus:ring-brand-500/30"
              />

              <p className="mt-1.5 text-xs text-ink-500">
                We’ll connect with you here to send your form.
              </p>
            </div>
          )}

          {/* =========================
              ERROR
          ========================== */}
          {error && (
            <p className="mt-4 rounded-lg bg-[#fce9e7] px-4 py-2.5 text-sm text-[#b23b30]">
              {error}
            </p>
          )}

          {/* =========================
              PAY BUTTON
          ========================== */}
          <button
            onClick={pay}
            disabled={loading}
            className="btn-primary mt-6 w-full disabled:opacity-60"
          >
            {loading ? (
              "Redirecting to Paystack…"
            ) : (
              <>
                Pay {formatGHS(totalAmount)} securely{" "}
                <ArrowRight width={16} height={16} />
              </>
            )}
          </button>

          <p className="mt-3 flex items-center justify-center gap-2 text-xs text-ink-500">
            <Lock width={14} height={14} />
            Secured by Paystack. We never store card details.
          </p>
        </div>

        {/* =========================
            ORDER SUMMARY
        ========================== */}
        <aside className="h-fit card p-6">
          <p className="font-display text-base font-700 text-ink-900">
            Order summary
          </p>

          <div className="mt-4 flex items-start justify-between gap-4 text-sm">
            <div>
              <p className="text-ink-500">
                {product.name}
              </p>

              {isVoucher && (
                <p className="mt-1 text-xs text-ink-500">
                  {effectiveQuantity} voucher
                  {effectiveQuantity === 1 ? "" : "s"} ×{" "}
                  {formatGHS(product.amount)}
                </p>
              )}
            </div>

            <span className="whitespace-nowrap font-600 text-ink-900">
              {formatGHS(totalAmount)}
            </span>
          </div>

          <div className="mt-3 flex items-center justify-between border-t border-[#f0efed] pt-3">
            <span className="font-600 text-ink-900">
              Total
            </span>

            <span className="font-display text-xl font-800 text-ink-900">
              {formatGHS(totalAmount)}
            </span>
          </div>

          <ul className="mt-5 space-y-2.5 text-sm text-ink-700">
            <li className="flex items-center gap-2">
              <ShieldCheck
                width={16}
                height={16}
                className="text-accent-600"
              />
              Server-verified payment
            </li>

            <li className="flex items-center gap-2">
              <Check
                width={16}
                height={16}
                className="text-accent-600"
              />

              {isForm
                ? "WhatsApp support after payment"
                : "Instant voucher + email"}
            </li>

            {isVoucher && effectiveQuantity > 1 && (
              <li className="flex items-center gap-2">
                <Check
                  width={16}
                  height={16}
                  className="text-accent-600"
                />
                {effectiveQuantity} vouchers in this order
              </li>
            )}
          </ul>
        </aside>
      </div>
    </div>
  );
}

export default function CheckoutPage() {
  return (
    <>
      <Navbar />

      <Suspense
        fallback={
          <div className="mx-auto max-w-5xl px-5 py-16 text-ink-500">
            Loading…
          </div>
        }
      >
        <CheckoutInner />
      </Suspense>

      <Footer />
    </>
  );
}
