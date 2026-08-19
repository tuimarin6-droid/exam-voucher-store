"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Navbar } from "@/components/Navbar";
import { PRODUCTS } from "@/lib/products";
import { Check, Copy, Lock, Plus, Tag, X } from "@/components/icons";

interface Promo {
  id: string;
  code: string;
  description: string | null;
  discountType: "PERCENT" | "FIXED";
  discountValue: number;
  scope: "ALL" | "VOUCHER" | "FORM" | "PRODUCT";
  scopeProductId: string | null;
  maxUses: number | null;
  usedCount: number;
  minSubtotal: number | null;
  active: boolean;
  startsAt: string | null;
  expiresAt: string | null;
  createdAt: string;
  redemptionCount: number;
}

function formatGHS(minor: number): string {
  return new Intl.NumberFormat("en-GH", { style: "currency", currency: "GHS" }).format(minor / 100);
}

function discountLabel(p: Promo): string {
  return p.discountType === "PERCENT" ? `${p.discountValue}% off` : `${formatGHS(p.discountValue)} off`;
}

function scopeLabel(p: Promo): string {
  if (p.scope === "PRODUCT") {
    const prod = PRODUCTS.find((x) => x.id === p.scopeProductId);
    return prod ? prod.shortName : "One product";
  }
  return { ALL: "All products", VOUCHER: "Vouchers only", FORM: "Forms only" }[p.scope];
}

/** Derived status, since "active" alone doesn't capture scheduled/expired/exhausted. */
function statusOf(p: Promo): { label: string; className: string } {
  const now = new Date();
  if (!p.active) return { label: "Deactivated", className: "bg-[#f0efed] text-ink-500" };
  if (p.expiresAt && now >= new Date(p.expiresAt)) return { label: "Expired", className: "bg-[#fce9e7] text-[#b23b30]" };
  if (p.startsAt && now < new Date(p.startsAt)) return { label: "Scheduled", className: "bg-brand-50 text-brand-700" };
  if (p.maxUses !== null && p.usedCount >= p.maxUses) return { label: "Fully redeemed", className: "bg-[#fbebde] text-[#a55a20]" };
  return { label: "Active", className: "bg-accent-500/10 text-accent-700" };
}

const emptyForm = {
  code: "",
  description: "",
  discountType: "PERCENT" as "PERCENT" | "FIXED",
  discountValue: "10",
  scope: "ALL" as Promo["scope"],
  scopeProductId: PRODUCTS[0]?.id ?? "",
  maxUses: "",
  minSubtotal: "",
  expiresAt: "",
};

export default function AdminPromosPage() {
  const [token, setToken] = useState("");
  const [authed, setAuthed] = useState(false);
  const [promos, setPromos] = useState<Promo[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [toggling, setToggling] = useState<string>("");
  const [copiedId, setCopiedId] = useState<string>("");

  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [creating, setCreating] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  useEffect(() => {
    const saved = sessionStorage.getItem("adminToken");
    if (saved) {
      setToken(saved);
      void load(saved);
    }
  }, []);

  async function load(t: string) {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/promos", { headers: { Authorization: `Bearer ${t}` } });
      if (res.status === 401) throw new Error("Invalid admin token.");
      if (!res.ok) throw new Error("Could not load promo codes.");
      const json = await res.json();
      setPromos(json.promos);
      setAuthed(true);
      sessionStorage.setItem("adminToken", t);
    } catch (e: any) {
      setError(e.message);
      setAuthed(false);
    } finally {
      setLoading(false);
    }
  }

  async function toggleActive(promo: Promo) {
    setToggling(promo.id);
    try {
      const res = await fetch(`/api/admin/promos/${promo.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ active: !promo.active }),
      });
      if (!res.ok) throw new Error("Could not update promo code.");
      const { promo: updated } = await res.json();
      setPromos((prev) => prev!.map((p) => (p.id === promo.id ? { ...p, ...updated } : p)));
    } catch (e: any) {
      setError(e.message);
    } finally {
      setToggling("");
    }
  }

  function copyCode(promo: Promo) {
    navigator.clipboard.writeText(promo.code).then(() => {
      setCopiedId(promo.id);
      setTimeout(() => setCopiedId(""), 1500);
    });
  }

  async function createPromo() {
    setFormError(null);
    const discountValue = Number(form.discountValue);
    if (!Number.isFinite(discountValue) || discountValue <= 0) {
      return setFormError("Enter a valid discount amount.");
    }
    if (form.discountType === "PERCENT" && discountValue > 100) {
      return setFormError("Percent discount cannot exceed 100.");
    }
    setCreating(true);
    try {
      const res = await fetch("/api/admin/promos", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          code: form.code.trim() || undefined,
          description: form.description.trim() || undefined,
          discountType: form.discountType,
          discountValue:
            form.discountType === "FIXED" ? Math.round(discountValue * 100) : discountValue,
          scope: form.scope,
          scopeProductId: form.scope === "PRODUCT" ? form.scopeProductId : undefined,
          maxUses: form.maxUses ? Number(form.maxUses) : null,
          minSubtotal: form.minSubtotal ? Math.round(Number(form.minSubtotal) * 100) : null,
          expiresAt: form.expiresAt ? new Date(form.expiresAt).toISOString() : null,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Could not create promo code.");
      setShowForm(false);
      setForm(emptyForm);
      await load(token);
    } catch (e: any) {
      setFormError(e.message);
    } finally {
      setCreating(false);
    }
  }

  return (
    <>
      <Navbar />
      <main className="mx-auto max-w-6xl px-5 py-10">
        {!authed ? (
          <div className="mx-auto max-w-sm card p-8">
            <span className="grid h-12 w-12 place-items-center rounded-xl bg-brand-50 text-brand-600">
              <Lock />
            </span>
            <h1 className="mt-4 font-display text-xl font-extrabold text-ink-900">Admin dashboard</h1>
            <p className="mt-1 text-sm text-ink-500">Enter your admin token to continue.</p>
            <input
              type="password"
              value={token}
              onChange={(e) => setToken(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && load(token)}
              placeholder="ADMIN_API_TOKEN"
              className="mt-5 w-full rounded-xl border border-[#e6e5e3] px-4 py-3 text-sm outline-none focus:border-brand-600 focus:ring-2 focus:ring-brand-500/30"
            />
            {error && <p className="mt-3 rounded-lg bg-[#fce9e7] px-3 py-2 text-sm text-[#b23b30]">{error}</p>}
            <button onClick={() => load(token)} disabled={loading || !token} className="btn-primary mt-5 w-full disabled:opacity-60">
              {loading ? "Checking…" : "Sign in"}
            </button>
          </div>
        ) : (
          <>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <Link href="/admin" className="text-sm font-semibold text-brand-600 hover:text-brand-700">
                  ← Dashboard
                </Link>
                <h1 className="mt-1 font-display text-2xl font-extrabold text-ink-900 sm:text-3xl">Promo codes</h1>
                <p className="mt-1 text-sm text-ink-500">Create, deactivate, and track discount codes.</p>
              </div>
              <button onClick={() => setShowForm((v) => !v)} className="btn-primary">
                {showForm ? <X className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
                {showForm ? "Close" : "New promo code"}
              </button>
            </div>

            {error && (
              <p className="mt-4 rounded-lg bg-[#fce9e7] px-4 py-2.5 text-sm text-[#b23b30]">{error}</p>
            )}

            {/* Create form */}
            {showForm && (
              <div className="mt-6 card p-6">
                <h2 className="font-display text-lg font-bold text-ink-900">New promo code</h2>
                <div className="mt-4 grid gap-4 sm:grid-cols-2">
                  <Field label="Code (optional — auto-generated if blank)">
                    <input
                      value={form.code}
                      onChange={(e) => setForm({ ...form, code: e.target.value.toUpperCase() })}
                      placeholder="e.g. BACKTOSCHOOL"
                      className="mt-1 w-full rounded-xl border border-[#e6e5e3] px-3 py-2 text-sm uppercase outline-none focus:border-brand-600"
                    />
                  </Field>
                  <Field label="Description (internal note)">
                    <input
                      value={form.description}
                      onChange={(e) => setForm({ ...form, description: e.target.value })}
                      placeholder="e.g. August back-to-school promo"
                      className="mt-1 w-full rounded-xl border border-[#e6e5e3] px-3 py-2 text-sm outline-none focus:border-brand-600"
                    />
                  </Field>

                  <Field label="Discount type">
                    <select
                      value={form.discountType}
                      onChange={(e) => setForm({ ...form, discountType: e.target.value as "PERCENT" | "FIXED" })}
                      className="mt-1 w-full rounded-xl border border-[#e6e5e3] bg-white px-3 py-2 text-sm outline-none focus:border-brand-600"
                    >
                      <option value="PERCENT">Percent off</option>
                      <option value="FIXED">Fixed amount off (GHS)</option>
                    </select>
                  </Field>
                  <Field label={form.discountType === "PERCENT" ? "Percent (1–100)" : "Amount off (GHS)"}>
                    <input
                      type="number"
                      min={0}
                      value={form.discountValue}
                      onChange={(e) => setForm({ ...form, discountValue: e.target.value })}
                      className="mt-1 w-full rounded-xl border border-[#e6e5e3] px-3 py-2 text-sm outline-none focus:border-brand-600"
                    />
                  </Field>

                  <Field label="Applies to">
                    <select
                      value={form.scope}
                      onChange={(e) => setForm({ ...form, scope: e.target.value as Promo["scope"] })}
                      className="mt-1 w-full rounded-xl border border-[#e6e5e3] bg-white px-3 py-2 text-sm outline-none focus:border-brand-600"
                    >
                      <option value="ALL">All products</option>
                      <option value="VOUCHER">Vouchers only (WASSCE/BECE)</option>
                      <option value="FORM">Admission forms only</option>
                      <option value="PRODUCT">One specific product</option>
                    </select>
                  </Field>
                  {form.scope === "PRODUCT" && (
                    <Field label="Product">
                      <select
                        value={form.scopeProductId}
                        onChange={(e) => setForm({ ...form, scopeProductId: e.target.value })}
                        className="mt-1 w-full rounded-xl border border-[#e6e5e3] bg-white px-3 py-2 text-sm outline-none focus:border-brand-600"
                      >
                        {PRODUCTS.map((p) => (
                          <option key={p.id} value={p.id}>{p.name}</option>
                        ))}
                      </select>
                    </Field>
                  )}

                  <Field label="Max total uses (blank = unlimited)">
                    <input
                      type="number"
                      min={1}
                      value={form.maxUses}
                      onChange={(e) => setForm({ ...form, maxUses: e.target.value })}
                      placeholder="e.g. 1 for single-use"
                      className="mt-1 w-full rounded-xl border border-[#e6e5e3] px-3 py-2 text-sm outline-none focus:border-brand-600"
                    />
                  </Field>
                  <Field label="Minimum order (GHS, optional)">
                    <input
                      type="number"
                      min={0}
                      value={form.minSubtotal}
                      onChange={(e) => setForm({ ...form, minSubtotal: e.target.value })}
                      placeholder="e.g. 50"
                      className="mt-1 w-full rounded-xl border border-[#e6e5e3] px-3 py-2 text-sm outline-none focus:border-brand-600"
                    />
                  </Field>

                  <Field label="Expires (optional)">
                    <input
                      type="datetime-local"
                      value={form.expiresAt}
                      onChange={(e) => setForm({ ...form, expiresAt: e.target.value })}
                      className="mt-1 w-full rounded-xl border border-[#e6e5e3] px-3 py-2 text-sm outline-none focus:border-brand-600"
                    />
                  </Field>
                </div>

                {formError && (
                  <p className="mt-4 rounded-lg bg-[#fce9e7] px-4 py-2.5 text-sm text-[#b23b30]">{formError}</p>
                )}

                <div className="mt-5 flex items-center gap-3">
                  <button onClick={createPromo} disabled={creating} className="btn-primary disabled:opacity-60">
                    {creating ? "Creating…" : "Create promo code"}
                  </button>
                  <button onClick={() => { setShowForm(false); setForm(emptyForm); setFormError(null); }} className="btn-ghost">
                    Cancel
                  </button>
                </div>
              </div>
            )}

            {/* Promo table */}
            <div className="mt-6 card overflow-x-auto">
              <table className="w-full min-w-[860px] text-left text-sm">
                <thead>
                  <tr className="border-b border-[#e6e5e3] text-xs uppercase tracking-wide text-ink-500">
                    <th className="px-4 py-3 font-semibold">Code</th>
                    <th className="px-4 py-3 font-semibold">Discount</th>
                    <th className="px-4 py-3 font-semibold">Applies to</th>
                    <th className="px-4 py-3 font-semibold">Uses</th>
                    <th className="px-4 py-3 font-semibold">Expires</th>
                    <th className="px-4 py-3 font-semibold">Status</th>
                    <th className="px-4 py-3 font-semibold">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {promos?.map((p) => {
                    const status = statusOf(p);
                    return (
                      <tr key={p.id} className="border-b border-[#f0efed] last:border-0 align-top">
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-1.5">
                            <span className="font-mono text-xs font-700 text-ink-900">{p.code}</span>
                            <button
                              onClick={() => copyCode(p)}
                              className="text-ink-500 hover:text-brand-600"
                              title="Copy code"
                            >
                              {copiedId === p.id ? <Check width={14} height={14} className="text-accent-600" /> : <Copy width={14} height={14} />}
                            </button>
                          </div>
                          {p.description && <p className="mt-0.5 text-xs text-ink-500">{p.description}</p>}
                        </td>
                        <td className="px-4 py-3 text-ink-900">{discountLabel(p)}</td>
                        <td className="px-4 py-3 text-ink-700">{scopeLabel(p)}</td>
                        <td className="px-4 py-3 text-ink-700">
                          {p.usedCount}{p.maxUses !== null ? ` / ${p.maxUses}` : " / ∞"}
                        </td>
                        <td className="whitespace-nowrap px-4 py-3 text-ink-500">
                          {p.expiresAt ? new Date(p.expiresAt).toLocaleDateString() : "—"}
                        </td>
                        <td className="px-4 py-3">
                          <span className={"rounded-full px-2.5 py-0.5 text-xs font-semibold " + status.className}>
                            {status.label}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <button
                            onClick={() => toggleActive(p)}
                            disabled={toggling === p.id}
                            className="inline-flex items-center gap-1.5 rounded-lg border border-[#e6e5e3] px-2.5 py-1.5 text-xs font-semibold text-ink-700 transition-colors hover:bg-[#f0efed] disabled:opacity-60"
                          >
                            {toggling === p.id ? "…" : p.active ? "Deactivate" : "Activate"}
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                  {promos && promos.length === 0 && (
                    <tr>
                      <td colSpan={7} className="px-4 py-10 text-center text-ink-500">
                        <Tag className="mx-auto h-6 w-6 text-ink-500" />
                        <p className="mt-2">No promo codes yet. Create your first one above.</p>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </>
        )}
      </main>
    </>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-xs font-semibold text-ink-500">{label}</label>
      {children}
    </div>
  );
}
