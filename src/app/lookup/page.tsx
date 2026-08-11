"use client";

import { useState } from "react";
import Link from "next/link";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { Check, Lock, MessageCircle } from "@/components/icons";

interface FoundVoucher {
  code: string;
  productType: string;
}

interface FoundOrder {
  reference: string;
  productType: string;
  productName: string;
  category: "VOUCHER" | "FORM" | null;
  createdAt: string;
  vouchers: FoundVoucher[];
  whatsappUrl?: string;
}

export default function LookupPage() {
  const [reference, setReference] = useState("");
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [orders, setOrders] = useState<FoundOrder[] | null>(null);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  async function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setOrders(null);

    if (!reference.trim() || !email.trim()) {
      return setError("Please enter both your order reference and the email address used at checkout.");
    }

    setLoading(true);

    try {
      const res = await fetch("/api/lookup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reference, email }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Lookup failed.");
      }

      setOrders(data.orders);
    } catch (err: unknown) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError("An unexpected error occurred during lookup.");
      }
    } finally {
      setLoading(false);
    }
  }

  function copyToClipboard(text: string, key: string) {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  }

  return (
    <>
      <Navbar />
      <main className="mx-auto max-w-3xl px-5 py-12">
        <Link
          href="/"
          className="text-sm font-semibold text-brand-600 hover:text-brand-700"
        >
          ← Back to store
        </Link>

        <h1 className="mt-3 font-display text-2xl font-800 text-ink-900 sm:text-3xl">
          Retrieve Purchased Vouchers
        </h1>
        <p className="mt-2 text-sm text-ink-500">
          Enter your order reference and the email address used at checkout to find your voucher codes.
        </p>

        <form onSubmit={handleSearch} className="mt-6 card p-6">
          <label htmlFor="reference" className="block text-sm font-600 text-ink-900">
            Order Reference
          </label>
          <input
            id="reference"
            type="text"
            value={reference}
            onChange={(e) => setReference(e.target.value)}
            placeholder="e.g. REF-123456"
            className="mt-2 w-full rounded-xl border border-[#e6e5e3] px-4 py-3 text-sm outline-none focus:border-brand-600 focus:ring-2 focus:ring-brand-500/30"
          />

          <label htmlFor="email" className="mt-4 block text-sm font-600 text-ink-900">
            Email address used at checkout
          </label>
          <div className="mt-2 flex gap-2">
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="buyer@example.com"
              className="w-full rounded-xl border border-[#e6e5e3] px-4 py-3 text-sm outline-none focus:border-brand-600 focus:ring-2 focus:ring-brand-500/30"
            />
            <button
              type="submit"
              disabled={loading}
              className="btn-primary whitespace-nowrap disabled:opacity-60"
            >
              {loading ? "Searching..." : "Search"}
            </button>
          </div>

          <p className="mt-3 flex items-center gap-1.5 text-xs text-ink-500">
            <Lock width={13} height={13} /> We ask for both fields so only you can view your codes.
          </p>

          {error && (
            <p className="mt-4 rounded-lg bg-[#fce9e7] px-4 py-2.5 text-sm text-[#b23b30]">
              {error}
            </p>
          )}
        </form>

        {orders && (
          <div className="mt-8 space-y-6">
            <h2 className="font-display text-lg font-700 text-ink-900">
              Found Orders ({orders.length})
            </h2>

            {orders.map((order) => (
              <div key={order.reference} className="card p-6">
                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#f0efed] pb-4">
                  <div>
                    <p className="text-xs text-ink-500">
                      Order Reference: <span className="font-mono font-600 text-ink-900">{order.reference}</span>
                    </p>
                    <p className="text-xs text-ink-500">
                      Purchased on {new Date(order.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                  <span className="rounded-full bg-green-100 px-3 py-1 text-xs font-600 text-green-800">
                    {order.productName}
                  </span>
                </div>

                <div className="mt-4 space-y-3">
                  {order.category === "FORM" ? (
                    order.whatsappUrl ? (
                      <a
                        href={order.whatsappUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="btn-accent w-full"
                      >
                        <MessageCircle width={18} height={18} /> Continue on WhatsApp
                      </a>
                    ) : (
                      <p className="text-xs text-ink-500 italic">
                        This order is being processed. Please check back shortly.
                      </p>
                    )
                  ) : order.vouchers.length > 0 ? (
                    order.vouchers.map((v, i) => {
                      const keyId = `${order.reference}-${i}`;
                      return (
                        <div
                          key={keyId}
                          className="flex items-center justify-between rounded-xl border border-[#e6e5e3] bg-[#f7f9fc] p-3 text-sm"
                        >
                          <div className="font-mono">
                            <span className="font-600 text-ink-900">Code:</span> {v.code}
                          </div>
                          <button
                            type="button"
                            onClick={() => copyToClipboard(v.code, keyId)}
                            className="flex items-center gap-1 rounded-lg border border-[#e6e5e3] bg-white px-3 py-1.5 text-xs font-600 text-ink-900 hover:bg-[#f0efed]"
                          >
                            {copiedKey === keyId ? (
                              <>
                                <Check width={12} height={12} /> Copied
                              </>
                            ) : (
                              "Copy"
                            )}
                          </button>
                        </div>
                      );
                    })
                  ) : (
                    <p className="text-xs text-ink-500 italic">
                      No voucher codes found for this order yet. Please check back shortly.
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
      <Footer />
    </>
  );
}
