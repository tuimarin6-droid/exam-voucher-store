"use client";

import { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { Check, MessageCircle, ShieldCheck } from "@/components/icons";

interface VerifyResult {
  ok: boolean;
  category: "VOUCHER" | "FORM" | null;
  status: string;
  voucherCode?: string;
  productName?: string;
  reference: string;
  whatsappUrl?: string;
  message?: string;
}

function SuccessInner() {
  const params = useSearchParams();
  const reference = params.get("reference");
  const [state, setState] = useState<"loading" | "done" | "error">("loading");
  const [result, setResult] = useState<VerifyResult | null>(null);

  useEffect(() => {
    if (!reference) {
      setState("error");
      return;
    }
    fetch(`/api/paystack/verify?reference=${encodeURIComponent(reference)}`)
      .then((r) => r.json())
      .then((data: VerifyResult) => {
        setResult(data);
        setState("done");
      })
      .catch(() => setState("error"));
  }, [reference]);

  return (
    <div className="mx-auto max-w-xl px-5 py-16">
      {state === "loading" && (
        <div className="card p-8 text-center">
          <div className="mx-auto h-10 w-10 animate-spin rounded-full border-4 border-brand-100 border-t-brand-600" />
          <p className="mt-4 font-600 text-ink-900">Verifying your payment\u2026</p>
          <p className="mt-1 text-sm text-ink-500">Confirming securely with Paystack. This takes a moment.</p>
        </div>
      )}

      {state === "done" && result?.ok && result.category === "VOUCHER" && (
        <div className="card p-8 text-center">
          <span className="mx-auto grid h-14 w-14 place-items-center rounded-full bg-accent-500/10 text-accent-700">
            <Check width={28} height={28} />
          </span>
          <h1 className="mt-4 font-display text-2xl font-800 text-ink-900">Payment successful</h1>
          <p className="mt-1 text-sm text-ink-500">Here is your {result.productName}. We\u2019ve also emailed it to you.</p>
          <div className="mt-6 rounded-xl border border-dashed border-brand-600 bg-brand-50 p-6">
            <p className="text-xs font-700 uppercase tracking-wider text-brand-700">Voucher code / PIN</p>
            <p className="mt-2 select-all font-display text-3xl font-800 tracking-wider text-ink-900">{result.voucherCode}</p>
          </div>
          <p className="mt-4 text-xs text-ink-500">Reference: {result.reference}</p>
          <Link href="/" className="btn-ghost mt-6">Back to store</Link>
        </div>
      )}

      {state === "done" && result?.ok && result.category === "FORM" && (
        <div className="card p-8 text-center">
          <span className="mx-auto grid h-14 w-14 place-items-center rounded-full bg-accent-500/10 text-accent-700">
            <Check width={28} height={28} />
          </span>
          <h1 className="mt-4 font-display text-2xl font-800 text-ink-900">Payment received</h1>
          <p className="mt-1 text-sm text-ink-500">
            Tap below to message us on WhatsApp. Your reference is pre-filled so we can send your form right away.
          </p>
          <a href={result.whatsappUrl} target="_blank" rel="noopener noreferrer" className="btn-accent mt-6 w-full">
            <MessageCircle width={18} height={18} /> Continue on WhatsApp
          </a>
          <p className="mt-4 text-xs text-ink-500">Reference: {result.reference}</p>
        </div>
      )}

      {state === "done" && result && !result.ok && (
        <div className="card p-8 text-center">
          <h1 className="font-display text-xl font-800 text-ink-900">We couldn\u2019t confirm this yet</h1>
          <p className="mt-2 text-sm text-ink-500">
            {result.status === "OUT_OF_STOCK"
              ? "Your payment was received but stock just ran out. We\u2019ll sort this out and email you \u2014 please contact support with your reference."
              : "If you were charged, don\u2019t worry \u2014 our system will finish automatically. Keep your reference safe."}
          </p>
          {result.reference && <p className="mt-4 text-xs text-ink-500">Reference: {result.reference}</p>}
          <Link href="/" className="btn-ghost mt-6">Back to store</Link>
        </div>
      )}

      {state === "error" && (
        <div className="card p-8 text-center">
          <h1 className="font-display text-xl font-800 text-ink-900">Missing payment reference</h1>
          <p className="mt-2 text-sm text-ink-500">We couldn\u2019t find a transaction to verify.</p>
          <Link href="/" className="btn-ghost mt-6">Back to store</Link>
        </div>
      )}

      <p className="mt-6 flex items-center justify-center gap-2 text-xs text-ink-500">
        <ShieldCheck width={14} height={14} /> Verified server-side with Paystack
      </p>
    </div>
  );
}

export default function SuccessPage() {
  return (
    <>
      <Navbar />
      <Suspense fallback={<div className="mx-auto max-w-xl px-5 py-16 text-center text-ink-500">Loading\u2026</div>}>
        <SuccessInner />
      </Suspense>
      <Footer />
    </>
  );
}
