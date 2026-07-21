import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { ProductCard } from "@/components/ProductCard";
import { PRODUCTS } from "@/lib/products";
import { Bolt, Clock, Lock, Mail, ShieldCheck, Star } from "@/components/icons";

const trust = [
  { icon: Bolt, title: "Instant delivery", body: "Voucher PINs appear on-screen and hit your inbox seconds after payment." },
  { icon: ShieldCheck, title: "Verified payments", body: "Every transaction is confirmed server-side with Paystack before release." },
  { icon: Lock, title: "Secure by design", body: "We never see your card details. Payments are handled by Paystack." },
];

const steps = [
  { n: "1", title: "Choose a product", body: "Pick your WASSCE, Private WASSCE or BECE voucher \u2014 or a university form." },
  { n: "2", title: "Pay with Paystack", body: "Card, Mobile Money or bank. Fast, secure and fully verified." },
  { n: "3", title: "Get it instantly", body: "Vouchers show immediately + emailed. Forms connect you on WhatsApp." },
];

const reviews = [
  { name: "Ama D.", role: "WASSCE candidate", text: "Paid with MoMo and got my checker PIN in seconds. So easy!" },
  { name: "Kofi B.", role: "Parent", text: "Bought a BECE voucher for my daughter late at night \u2014 instant and legit." },
  { name: "Selorm K.", role: "Applicant", text: "The university form WhatsApp help was quick and personal. Recommended." },
];

export default function HomePage() {
  return (
    <>
      <Navbar />

      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 -z-10 bg-gradient-to-b from-brand-50 to-[#f7f9fc]" />
        <div className="mx-auto max-w-6xl px-5 py-16 sm:py-20">
          <div className="mx-auto max-w-2xl text-center">
            <span className="chip mx-auto"><ShieldCheck width={14} height={14} /> Trusted by students across Ghana</span>
            <h1 className="mt-5 font-display text-4xl font-800 leading-tight tracking-tight text-ink-900 sm:text-5xl">
              Exam vouchers, delivered <span className="text-brand-600">instantly.</span>
            </h1>
            <p className="mx-auto mt-4 max-w-xl text-base leading-relaxed text-ink-700">
              Buy WASSCE, Private WASSCE and BECE result checker vouchers online and get your PIN
              in seconds. Need a university admission form? We\u2019ll guide you personally on WhatsApp.
            </p>
            <div className="mt-7 flex flex-col items-center justify-center gap-3 sm:flex-row">
              <a href="#products" className="btn-primary w-full sm:w-auto">Browse vouchers</a>
              <a href="#how" className="btn-ghost w-full sm:w-auto">How it works</a>
            </div>
            <div className="mt-6 flex items-center justify-center gap-1.5 text-sm text-ink-500">
              <span className="flex text-accent-600">
                {Array.from({ length: 5 }).map((_, i) => (<Star key={i} width={16} height={16} />))}
              </span>
              <span className="ml-1">Rated 4.9/5 by 2,300+ buyers</span>
            </div>
          </div>
        </div>
      </section>

      {/* Trust strip */}
      <section className="mx-auto -mt-6 max-w-6xl px-5">
        <div className="grid gap-4 sm:grid-cols-3">
          {trust.map((t) => (
            <div key={t.title} className="card flex items-start gap-3 p-5">
              <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-brand-50 text-brand-600">
                <t.icon />
              </span>
              <div>
                <p className="font-600 text-ink-900">{t.title}</p>
                <p className="mt-0.5 text-sm text-ink-500">{t.body}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Products */}
      <section id="products" className="mx-auto max-w-6xl px-5 py-16">
        <div className="mb-8 max-w-xl">
          <h2 className="font-display text-2xl font-800 text-ink-900 sm:text-3xl">Choose your voucher</h2>
          <p className="mt-2 text-ink-500">All vouchers are single-use official result-checker PINs. Delivered instantly after payment.</p>
        </div>
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
          {PRODUCTS.map((p) => (<ProductCard key={p.id} product={p} />))}
        </div>
      </section>

      {/* How it works */}
      <section id="how" className="bg-white">
        <div className="mx-auto max-w-6xl px-5 py-16">
          <h2 className="font-display text-2xl font-800 text-ink-900 sm:text-3xl">How it works</h2>
          <div className="mt-8 grid gap-6 md:grid-cols-3">
            {steps.map((s) => (
              <div key={s.n} className="relative rounded-xl border border-[#e6e5e3] p-6">
                <span className="grid h-9 w-9 place-items-center rounded-full bg-brand-600 font-display text-sm font-700 text-white">{s.n}</span>
                <p className="mt-4 font-600 text-ink-900">{s.title}</p>
                <p className="mt-1 text-sm text-ink-500">{s.body}</p>
              </div>
            ))}
          </div>
          <div className="mt-8 flex flex-wrap items-center gap-x-6 gap-y-2 text-sm text-ink-500">
            <span className="inline-flex items-center gap-2"><Clock width={16} height={16} /> Available 24/7</span>
            <span className="inline-flex items-center gap-2"><Mail width={16} height={16} /> Emailed receipt + code</span>
            <span className="inline-flex items-center gap-2"><Lock width={16} height={16} /> Paystack secured</span>
          </div>
        </div>
      </section>

      {/* Reviews */}
      <section className="mx-auto max-w-6xl px-5 py-16">
        <h2 className="font-display text-2xl font-800 text-ink-900 sm:text-3xl">What buyers say</h2>
        <div className="mt-8 grid gap-6 md:grid-cols-3">
          {reviews.map((r) => (
            <figure key={r.name} className="card p-6">
              <div className="flex text-accent-600">
                {Array.from({ length: 5 }).map((_, i) => (<Star key={i} width={15} height={15} />))}
              </div>
              <blockquote className="mt-3 text-sm leading-relaxed text-ink-700">\u201C{r.text}\u201D</blockquote>
              <figcaption className="mt-4 text-sm">
                <span className="font-600 text-ink-900">{r.name}</span>
                <span className="text-ink-500"> \u00B7 {r.role}</span>
              </figcaption>
            </figure>
          ))}
        </div>
      </section>

      <Footer />
    </>
  );
}
