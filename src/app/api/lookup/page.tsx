"use client";

import { useState } from "react";
import Link from "next/link";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { Check } from "@/components/icons";

interface FoundVoucher {
  serial: string;
  pin: string;
  voucherType: string;
}

interface FoundOrder {
  reference: string;
  productType: string;
  createdAt: string;
  vouchers: FoundVoucher[];
}

export default function LookupPage() {
  const [identifier, setIdentifier] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [orders, setOrders] = useState<FoundOrder[] | null>(null);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  async function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setOrders(null);

    if (!identifier.trim()) {
      return setError("Please enter your email address or order reference.");
    }

    setLoading(true);

    try {
      const res = await fetch("/api/lookup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ identifier }),
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
          Enter the email address used during purchase or your Paystack order reference to find your voucher keys.
        </p>

        <form onSubmit={handleSearch} className="mt-6 card p-6">
          <label htmlFor="identifier" className="block text-sm font-600 text-ink-900">
            Email address or Order Reference
          </label>
          <div className="mt-2 flex gap-2">
            <input
              id="identifier"
              type="text"
              value={identifier}
              onChange={(e) => setIdentifier(e.target.value)}
              placeholder="e.g. buyer@example.com or REF-123456"
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
                    {order.productType}
                  </span>
                </div>

                <div className="mt-4 space-y-3">
                  {order.vouchers.length > 0 ? (
                    order.vouchers.map((v, i) => {
                      const fullKey = `Serial: ${v.serial} | PIN: ${v.pin}`;
                      const keyId = `${order.reference}-${i}`;
                      return (
                        <div
                          key={keyId}
                          className="flex items-center justify-between rounded-xl border border-[#e6e5e3] bg-[#f7f9fc] p-3 text-sm"
                        >
                          <div className="font-mono">
                            <span className="font-600 text-ink-900">Serial:</span> {v.serial}{" "}
                            <span className="ml-3 font-600 text-ink-900">PIN:</span> {v.pin}
                          </div>
                          <button
                            type="button"
                            onClick={() => copyToClipboard(fullKey, keyId)}
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
                      No serial/PIN records associated with this order category (e.g. Form processing order).
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
