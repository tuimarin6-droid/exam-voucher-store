"use client";

import { useEffect, useState } from "react";
import { Navbar } from "@/components/Navbar";
import { Bolt, Check, Clock, Download, Lock, ShieldCheck } from "@/components/icons";

interface SeriesPoint { date: string; label: string; amount: number; amountLabel: string }

interface Overview {
  kpis: {
    revenueLabel: string;
    fulfilled: number;
    pending: number;
    failed: number;
    totalAvailable: number;
  };
  stock: Array<{ productId: string; name: string; available: number; sold: number; low: boolean }>;
  orders: Array<{
    reference: string;
    email: string;
    productName: string;
    category: string;
    amountLabel: string;
    status: string;
    voucherCode: string | null;
    createdAt: string;
  }>;
  series: SeriesPoint[];
  bucket: "day" | "week";
  filterOptions: { products: Array<{ id: string; name: string }>; statuses: string[] };
  range: { from: string | null; to: string | null; product: string | null; status: string | null; count: number };
}

const statusStyles: Record<string, string> = {
  FULFILLED: "bg-accent-500/10 text-accent-700",
  PAID: "bg-brand-50 text-brand-700",
  PENDING: "bg-[#fbebde] text-[#a55a20]",
  FAILED: "bg-[#fce9e7] text-[#b23b30]",
  OUT_OF_STOCK: "bg-[#fce9e7] text-[#b23b30]",
};

function query(params: Record<string, string>): string {
  const p = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) if (v && v !== "all") p.set(k, v);
  const s = p.toString();
  return s ? `?${s}` : "";
}

export default function AdminPage() {
  const [token, setToken] = useState("");
  const [authed, setAuthed] = useState(false);
  const [data, setData] = useState<Overview | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [exporting, setExporting] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [product, setProduct] = useState("all");
  const [status, setStatus] = useState("all");
  const [bucket, setBucket] = useState<"day" | "week">("day");

  const filters = { from, to, product, status, bucket };

  useEffect(() => {
    const saved = sessionStorage.getItem("adminToken");
    if (saved) {
      setToken(saved);
      void load(saved);
    }
  }, []);

  async function load(t: string, overrides: Partial<typeof filters> = {}) {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/admin/overview${query({ ...filters, ...overrides })}`, {
        headers: { Authorization: `Bearer ${t}` },
      });
      if (res.status === 401) throw new Error("Invalid admin token.");
      if (!res.ok) throw new Error("Could not load dashboard.");
      const json = (await res.json()) as Overview;
      setData(json);
      setAuthed(true);
      sessionStorage.setItem("adminToken", t);
    } catch (e: any) {
      setError(e.message);
      setAuthed(false);
    } finally {
      setLoading(false);
    }
  }

  async function download(path: string, filename: string, kind: string) {
    setExporting(kind);
    setError(null);
    try {
      const res = await fetch(`${path}${query(filters)}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error("Export failed.");
      const blob = await res.blob();
      const href = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = href;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(href);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setExporting("");
    }
  }

  const stamp = () => new Date().toISOString().slice(0, 10);

  function setBucketAndLoad(next: "day" | "week") {
    setBucket(next);
    void load(token, { bucket: next });
  }

  function clearFilters() {
    setFrom("");
    setTo("");
    setProduct("all");
    setStatus("all");
    void load(token, { from: "", to: "", product: "all", status: "all" });
  }

  function logout() {
    sessionStorage.removeItem("adminToken");
    setAuthed(false);
    setData(null);
    setToken("");
  }

  const hasFilters = Boolean(from || to || product !== "all" || status !== "all");

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
              {loading ? "Checking\u2026" : "Sign in"}
            </button>
          </div>
        ) : (
          <>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h1 className="font-display text-2xl font-extrabold text-ink-900 sm:text-3xl">Dashboard</h1>
                <p className="mt-1 text-sm text-ink-500">Inventory, revenue and recent orders.</p>
              </div>
              <button onClick={logout} className="btn-ghost">Sign out</button>
            </div>

            {/* KPIs */}
            <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <Kpi icon={<ShieldCheck />} label="Revenue (fulfilled)" value={data!.kpis.revenueLabel} />
              <Kpi icon={<Check />} label="Fulfilled orders" value={String(data!.kpis.fulfilled)} tone="accent" />
              <Kpi icon={<Clock />} label="Pending" value={String(data!.kpis.pending)} />
              <Kpi icon={<Bolt />} label="Codes in stock" value={String(data!.kpis.totalAvailable)} />
            </div>

            {/* Revenue chart */}
            <div className="mt-6 card p-6">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <h2 className="font-display text-lg font-bold text-ink-900">Revenue over time</h2>
                <div className="flex items-center gap-3">
                  <span className="text-xs text-ink-500">Fulfilled orders</span>
                  <div className="inline-flex rounded-xl border border-[#e6e5e3] p-0.5">
                    {(["day", "week"] as const).map((b) => (
                      <button
                        key={b}
                        onClick={() => setBucketAndLoad(b)}
                        className={
                          "rounded-lg px-3 py-1.5 text-xs font-semibold capitalize transition-colors " +
                          (bucket === b ? "bg-brand-600 text-white" : "text-ink-700 hover:bg-[#f0efed]")
                        }
                      >
                        {b === "day" ? "Daily" : "Weekly"}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
              <RevenueChart series={data!.series} bucket={data!.bucket} />
            </div>

            {/* Stock */}
            <h2 className="mt-10 font-display text-lg font-bold text-ink-900">Voucher stock</h2>
            <div className="mt-4 grid gap-4 sm:grid-cols-3">
              {data!.stock.map((s) => (
                <div key={s.productId} className="card p-5">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-semibold text-ink-900">{s.name}</p>
                    {s.low && <span className="rounded-full bg-[#fce9e7] px-2.5 py-0.5 text-xs font-semibold text-[#b23b30]">Low</span>}
                  </div>
                  <p className="mt-3 font-display text-3xl font-extrabold text-ink-900">{s.available}</p>
                  <p className="text-xs text-ink-500">available · {s.sold} sold</p>
                </div>
              ))}
            </div>

            {/* Orders + filters */}
            <div className="mt-10 flex flex-wrap items-end justify-between gap-4">
              <h2 className="font-display text-lg font-bold text-ink-900">Recent orders</h2>
              <div className="flex flex-wrap items-end gap-3">
                <Field label="From">
                  <input type="date" value={from} max={to || undefined} onChange={(e) => setFrom(e.target.value)}
                    className="mt-1 rounded-xl border border-[#e6e5e3] px-3 py-2 text-sm outline-none focus:border-brand-600" />
                </Field>
                <Field label="To">
                  <input type="date" value={to} min={from || undefined} onChange={(e) => setTo(e.target.value)}
                    className="mt-1 rounded-xl border border-[#e6e5e3] px-3 py-2 text-sm outline-none focus:border-brand-600" />
                </Field>
                <Field label="Product">
                  <select value={product} onChange={(e) => setProduct(e.target.value)}
                    className="mt-1 rounded-xl border border-[#e6e5e3] bg-white px-3 py-2 text-sm outline-none focus:border-brand-600">
                    <option value="all">All products</option>
                    {data!.filterOptions.products.map((p) => (
                      <option key={p.id} value={p.id}>{p.name}</option>
                    ))}
                  </select>
                </Field>
                <Field label="Status">
                  <select value={status} onChange={(e) => setStatus(e.target.value)}
                    className="mt-1 rounded-xl border border-[#e6e5e3] bg-white px-3 py-2 text-sm outline-none focus:border-brand-600">
                    <option value="all">All statuses</option>
                    {data!.filterOptions.statuses.map((s) => (
                      <option key={s} value={s}>{s}</option>
                    ))}
                  </select>
                </Field>
                <button onClick={() => load(token)} disabled={loading} className="btn-primary disabled:opacity-60">
                  {loading ? "Loading\u2026" : "Apply"}
                </button>
                {hasFilters && <button onClick={clearFilters} className="btn-ghost">Clear</button>}
                <button onClick={() => download("/api/admin/export", `edupass-orders-${stamp()}.csv`, "orders")} disabled={exporting !== ""} className="btn-ghost disabled:opacity-60">
                  <Download className="h-4 w-4" /> {exporting === "orders" ? "Exporting\u2026" : "Export CSV"}
                </button>
                <button onClick={() => download("/api/admin/summary", `edupass-revenue-summary-${stamp()}.csv`, "summary")} disabled={exporting !== ""} className="btn-ghost disabled:opacity-60">
                  <Download className="h-4 w-4" /> {exporting === "summary" ? "Exporting\u2026" : "Export summary"}
                </button>
              </div>
            </div>
            <p className="mt-2 text-xs text-ink-500">
              Showing {data!.range.count} order{data!.range.count === 1 ? "" : "s"}
              {hasFilters ? " for the selected filters" : " (most recent)"}.
            </p>

            <div className="mt-4 card overflow-x-auto">
              <table className="w-full min-w-[720px] text-left text-sm">
                <thead>
                  <tr className="border-b border-[#e6e5e3] text-xs uppercase tracking-wide text-ink-500">
                    <th className="px-4 py-3 font-semibold">Date</th>
                    <th className="px-4 py-3 font-semibold">Product</th>
                    <th className="px-4 py-3 font-semibold">Email</th>
                    <th className="px-4 py-3 font-semibold">Amount</th>
                    <th className="px-4 py-3 font-semibold">Status</th>
                    <th className="px-4 py-3 font-semibold">Code</th>
                  </tr>
                </thead>
                <tbody>
                  {data!.orders.map((o) => (
                    <tr key={o.reference} className="border-b border-[#f0efed] last:border-0">
                      <td className="whitespace-nowrap px-4 py-3 text-ink-500">{new Date(o.createdAt).toLocaleString()}</td>
                      <td className="px-4 py-3 text-ink-900">{o.productName}</td>
                      <td className="px-4 py-3 text-ink-700">{o.email}</td>
                      <td className="whitespace-nowrap px-4 py-3 font-semibold text-ink-900">{o.amountLabel}</td>
                      <td className="px-4 py-3">
                        <span className={"rounded-full px-2.5 py-0.5 text-xs font-semibold " + (statusStyles[o.status] ?? "bg-[#f0efed] text-ink-700")}>
                          {o.status}
                        </span>
                      </td>
                      <td className="px-4 py-3 font-mono text-xs text-ink-700">{o.voucherCode ?? "\u2014"}</td>
                    </tr>
                  ))}
                  {data!.orders.length === 0 && (
                    <tr><td colSpan={6} className="px-4 py-8 text-center text-ink-500">No orders match these filters.</td></tr>
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

function Kpi({ icon, label, value, tone }: { icon: React.ReactNode; label: string; value: string; tone?: "accent" }) {
  return (
    <div className="card p-5">
      <span className={"grid h-10 w-10 place-items-center rounded-xl " + (tone === "accent" ? "bg-accent-500/10 text-accent-700" : "bg-brand-50 text-brand-600")}>
        {icon}
      </span>
      <p className="mt-3 font-display text-2xl font-extrabold text-ink-900">{value}</p>
      <p className="text-xs text-ink-500">{label}</p>
    </div>
  );
}

/** Lightweight dependency-free SVG bar chart of revenue per bucket (minor units). */
function RevenueChart({ series, bucket }: { series: SeriesPoint[]; bucket: "day" | "week" }) {
  if (!series.length) {
    return <p className="mt-6 text-sm text-ink-500">No revenue data yet.</p>;
  }
  const max = Math.max(...series.map((s) => s.amount), 1);
  const total = series.reduce((a, s) => a + s.amount, 0);
  const W = 720;
  const H = 180;
  const pad = { top: 12, right: 8, bottom: 24, left: 8 };
  const innerW = W - pad.left - pad.right;
  const innerH = H - pad.top - pad.bottom;
  const gap = 6;
  const barW = Math.max(2, innerW / series.length - gap);
  const tickEvery = Math.ceil(series.length / 7);
  const unit = bucket === "week" ? "week" : "day";

  return (
    <div>
      <p className="mt-1 text-sm text-ink-500">
        <span className="font-display text-xl font-extrabold text-ink-900">
          {new Intl.NumberFormat("en-GH", { style: "currency", currency: "GHS" }).format(total / 100)}
        </span>{" "}
        total over {series.length} {unit}{series.length === 1 ? "" : "s"}
      </p>
      <svg viewBox={`0 0 ${W} ${H}`} className="mt-3 w-full" role="img" aria-label={`Revenue per ${unit} bar chart`}>
        {series.map((s, i) => {
          const h = (s.amount / max) * innerH;
          const x = pad.left + i * (barW + gap);
          const y = pad.top + innerH - h;
          return (
            <g key={s.date}>
              <rect x={x} y={y} width={barW} height={Math.max(h, s.amount > 0 ? 2 : 0)} rx={3} fill="#1746a2">
                <title>{`${s.label}: ${s.amountLabel}`}</title>
              </rect>
              {i % tickEvery === 0 && (
                <text x={x + barW / 2} y={H - 6} textAnchor="middle" fontSize={10} fill="#64748b">
                  {s.label.replace("wk ", "")}
                </text>
              )}
            </g>
          );
        })}
      </svg>
    </div>
  );
}
