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
  const [promoInput, setPromoInput] = useState("");
  const [appliedPromo, setAppliedPromo] = useState<{
    code: string;
    discountAmount: number;
    totalAmount: number;
  } | null>(null);
  const [promoError, setPromoError] = useState<string | null>(null);
  const [promoLoading, setPromoLoading] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const product = getProduct(productId) ?? PRODUCTS[0];
  const isForm = product.category === "FORM";
  const isVoucher = product.category === "VOUCHER";
  const emailValid = /.+@.+\..+/.test(email);

  const effectiveQuantity = isForm ? 1 : quantity;
  const regularTotal = product.amount * effectiveQuantity;
  const finalTotal = appliedPromo ? appliedPromo.totalAmount : regularTotal;

  function changeProduct(id: string) {
    setProductId(id);
    setError(null);
    setAppliedPromo(null);
    setPromoError(null);
    const selectedProduct = getProduct(id);
    if (selectedProduct?.category === "FORM") {
      setQuantity(1);
    }
  }

  async function applyPromoCode() {
    setPromoError(null);
    if (!emailValid) {
      setPromoError("Please enter a valid email address first.");
      return;
    }
    if (!promoInput.trim()) {
      setPromoError("Enter a promo code.");
      return;
    }

    setPromoLoading(true);
    try {
      const res = await fetch("/api/promo/validate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          productId,
          email,
          quantity: effectiveQuantity,
          promoCode: promoInput.trim(),
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.valid) {
        throw new Error(data.reason || "Invalid promo code.");
      }
      setAppliedPromo({
        code: data.promoCode,
        discountAmount: data.discountAmount,
        totalAmount: data.totalAmount,
      });
      setPromoError(null);
    } catch (err: any) {
      setAppliedPromo(null);
      setPromoError(err.message);
    } finally {
      setPromoLoading(false);
    }
  }

  function removePromo() {
    setAppliedPromo(null);
    setPromoInput("");
    setPromoError(null);
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
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          productId,
          email,
          phone: phone || undefined,
          quantity: effectiveQuantity,
          promoCode: appliedPromo?.code || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Could not start payment.");
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
        <div className="card p-6">
          <label className="block text-sm font-600 text-ink-900">Product</label>
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
                <span className="text-sm font-600 text-ink-900">{p.name}</span>
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

          {isVoucher && (
            <div className="mt-6">
              <label htmlFor="quantity" className="block text-sm font-600 text-ink-900">
                Number of vouchers
              </label>
              <div className="mt-2 flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => {
                    const newQty = Math.max(1, quantity - 1);
                    setQuantity(newQty);
                    setAppliedPromo(null);
                  }}
                  disabled={quantity <= 1}
                  className="grid h-11 w-11 place-items-center rounded-xl border border-[#e6e5e3] bg-white text-lg font-700 text-ink-900 transition hover:bg-[#f7f9fc] disabled:cursor-not-allowed disabled:opacity-40"
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
                  onClick={() => {
                    const newQty = Math.min(9, quantity + 1);
                    setQuantity(newQty);
                    setAppliedPromo(null);
                  }}
                  disabled={quantity >= 9}
                  className="grid h-11 w-11 place-items-center rounded-xl border border-[#e6e5e3] bg-white text-lg font-700 text-ink-900 transition hover:bg-[#f7f9fc] disabled:cursor-not-allowed disabled:opacity-40"
                >
                  +
                </button>
              </div>
              <p className="mt-2 text-xs text-ink-500">
                You can purchase up to 9 vouchers online.
              </p>
            </div>
          )}

          <div className="mt-6">
            <label htmlFor="email" className="block text-sm font-600 text-ink-900">
              Email address
            </label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => {
                setEmail(e.target.value);
                setAppliedPromo(null);
              }}
              placeholder="you@example.com"
              className="mt-2 w-full rounded-xl border border-[#e6e5e3] px-4 py-3 text-sm outline-none focus:border-brand-600 focus:ring-2 focus:ring-brand-500/30"
            />
            <p className="mt-1.5 text-xs text-ink-500">
              Your voucher / receipt will be sent here.
            </p>
          </div>

          {isVoucher && (
            <div className="mt-6 border-t border-[#f0efed] pt-6">
              <label htmlFor="promo" className="block text-sm font-600 text-ink-900">
                Promo Code
              </label>
              <div className="mt-2 flex gap-2">
                <input
                  id="promo"
                  type="text"
                  value={promoInput}
                  onChange={(e) => setPromoInput(e.target.value.toUpperCase())}
                  placeholder="Enter code"
                  disabled={!!appliedPromo}
                  className="w-full rounded-xl border border-[#e6e5e3] px-4 py-2.5 text-sm uppercase outline-none focus:border-brand-600 focus:ring-2 focus:ring-brand-500/30 disabled:bg-[#f7f9fc]"
                />
                {appliedPromo ? (
                  <button
                    type="button"
                    onClick={removePromo}
                    className="rounded-xl border border-red-200 bg-red-50 px-4 py-2.5 text-sm font-600 text-red-600 hover:bg-red-100"
                  >
                    Remove
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={applyPromoCode}
                    disabled={promoLoading || !promoInput.trim()}
                    className="rounded-xl bg-ink-900 px-4 py-2.5 text-sm font-600 text-white hover:bg-ink-800 disabled:opacity-50"
                  >
                    {promoLoading ? "Checking..." : "Apply"}
                  </button>
                )}
              </div>
              {appliedPromo && (
                <p className="mt-2 text-xs font-600 text-green-700">
                  ✓ Promo "{appliedPromo.code}" applied successfully!
                </p>
              )}
              {promoError && (
                <p className="mt-2 text-xs font-500 text-red-600">{promoError}</p>
              )}
            </div>
          )}

          {isForm && (
            <div className="mt-4">
              <label htmlFor="phone" className="block text-sm font-600 text-ink-900">
                WhatsApp phone number
              </label>
              <input
                id="phone"
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="024 123 4567"
                className="mt-2 w-full rounded-xl border border-[#e6e5e3] px-4 py-3 text-sm outline-none focus:border-brand-600 focus:ring-2 focus:ring-brand-500/30"
              />
            </div>
          )}

          {error && (
            <p className="mt-4 rounded-lg bg-[#fce9e7] px-4 py-2.5 text-sm text-[#b23b30]">
              {error}
            </p>
          )}

          <button
            onClick={pay}
            disabled={loading}
            className="btn-primary mt-6 w-full disabled:opacity-60"
          >
            {loading ? (
              "Redirecting to Paystack…"
            ) : (
              <>
                Pay {formatGHS(finalTotal)} securely <ArrowRight width={16} height={16} />
              </>
            )}
          </button>
        </div>

        <aside className="h-fit card p-6">
          <p className="font-display text-base font-700 text-ink-900">
            Order summary
          </p>
          <div className="mt-4 flex items-start justify-between gap-4 text-sm">
            <div>
              <p className="text-ink-500">{product.name}</p>
              {isVoucher && (
                <p className="mt-1 text-xs text-ink-500">
                  {effectiveQuantity} voucher{effectiveQuantity === 1 ? "" : "s"} × {formatGHS(product.amount)}
                </p>
              )}
            </div>
            <span className="whitespace-nowrap font-600 text-ink-900">
              {formatGHS(regularTotal)}
            </span>
          </div>

          {appliedPromo && (
            <div className="mt-2 flex items-center justify-between text-sm text-green-700 font-500">
              <span>Discount ({appliedPromo.code})</span>
              <span>−{formatGHS(appliedPromo.discountAmount)}</span>
            </div>
          )}

          <div className="mt-3 flex items-center justify-between border-t border-[#f0efed] pt-3">
            <span className="font-600 text-ink-900">Total</span>
            <span className="font-display text-xl font-800 text-ink-900">
              {formatGHS(finalTotal)}
            </span>
          </div>
        </aside>
      </div>
    </div>
  );
}

export default function CheckoutPage() {
  return (
    <>
      <Navbar />
      <Suspense fallback={<div className="mx-auto max-w-5xl px-5 py-16 text-ink-500">Loading…</div>}>
        <CheckoutInner />
      </Suspense>
      <Footer />
    </>
  );
}
