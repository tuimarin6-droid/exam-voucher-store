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
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const product = getProduct(productId) ?? PRODUCTS[0];
  const isForm = product.category === "FORM";
  const emailValid = /.+@.+\..+/.test(email);

  async function pay() {
    setError(null);
    if (!emailValid) return setError("Please enter a valid email address.");
    if (isForm && phone.trim().length < 6) return setError("Please enter your phone number for WhatsApp.");
    setLoading(true);
    try {
      const res = await fetch("/api/paystack/initialize", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ productId, email, phone: phone || undefined }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Could not start payment.");
      window.location.href = data.authorizationUrl; // hosted Paystack checkout
    } catch (e: any) {
      setError(e.message);
      setLoading(false);
    }
  }

  return (
    <div className="mx-auto max-w-5xl px-5 py-10">
      <Link href="/" className="text-sm font-semibold text-brand-600 hover:text-brand-700">\u2190 Back to store</Link>
      <h1 className="mt-3 font-display text-2xl font-800 text-ink-900 sm:text-3xl">Checkout</h1>

      <div className="mt-8 grid gap-8 lg:grid-cols-[1fr_380px]">
        {/* Form */}
        <div className="card p-6">
          <label className="block text-sm font-600 text-ink-900">Product</label>
          <div className="mt-2 grid gap-2">
            {PRODUCTS.map((p) => (
              <button
                key={p.id}
                type="button"
                onClick={() => setProductId(p.id)}
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

          <div className="mt-6">
            <label htmlFor="email" className="block text-sm font-600 text-ink-900">Email address</label>
            <input
              id="email"
              type="email"
              inputMode="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              className="mt-2 w-full rounded-xl border border-[#e6e5e3] px-4 py-3 text-sm outline-none focus:border-brand-600 focus:ring-2 focus:ring-brand-500/30"
            />
            <p className="mt-1.5 text-xs text-ink-500">Your voucher / receipt will be sent here.</p>
          </div>

          {isForm && (
            <div className="mt-4">
              <label htmlFor="phone" className="block text-sm font-600 text-ink-900">WhatsApp phone number</label>
              <input
                id="phone"
                type="tel"
                inputMode="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="024 123 4567"
                className="mt-2 w-full rounded-xl border border-[#e6e5e3] px-4 py-3 text-sm outline-none focus:border-brand-600 focus:ring-2 focus:ring-brand-500/30"
              />
              <p className="mt-1.5 text-xs text-ink-500">We\u2019ll connect with you here to send your form.</p>
            </div>
          )}

          {error && (
            <p className="mt-4 rounded-lg bg-[#fce9e7] px-4 py-2.5 text-sm text-[#b23b30]">{error}</p>
          )}

          <button onClick={pay} disabled={loading} className="btn-primary mt-6 w-full disabled:opacity-60">
            {loading ? "Redirecting to Paystack\u2026" : (<>Pay {formatGHS(product.amount)} securely <ArrowRight width={16} height={16} /></>)}
          </button>
          <p className="mt-3 flex items-center justify-center gap-2 text-xs text-ink-500">
            <Lock width={14} height={14} /> Secured by Paystack. We never store card details.
          </p>
        </div>

        {/* Summary */}
        <aside className="h-fit card p-6">
          <p className="font-display text-base font-700 text-ink-900">Order summary</p>
          <div className="mt-4 flex items-center justify-between text-sm">
            <span className="text-ink-500">{product.name}</span>
            <span className="font-600 text-ink-900">{formatGHS(product.amount)}</span>
          </div>
          <div className="mt-3 flex items-center justify-between border-t border-[#f0efed] pt-3">
            <span className="font-600 text-ink-900">Total</span>
            <span className="font-display text-xl font-800 text-ink-900">{formatGHS(product.amount)}</span>
          </div>
          <ul className="mt-5 space-y-2.5 text-sm text-ink-700">
            <li className="flex items-center gap-2"><ShieldCheck width={16} height={16} className="text-accent-600" /> Server-verified payment</li>
            <li className="flex items-center gap-2">
              <Check width={16} height={16} className="text-accent-600" />
              {isForm ? "WhatsApp support after payment" : "Instant voucher + email"}
            </li>
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
      <Suspense fallback={<div className="mx-auto max-w-5xl px-5 py-16 text-ink-500">Loading\u2026</div>}>
        <CheckoutInner />
      </Suspense>
      <Footer />
    </>
  );
}
