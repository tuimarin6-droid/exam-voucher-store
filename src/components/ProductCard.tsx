import Link from "next/link";
import { Product, formatGHS } from "@/lib/products";
import { ArrowRight, Bolt, Check, MessageCircle } from "./icons";

export function ProductCard({ product }: { product: Product }) {
  const isForm = product.category === "FORM";
  return (
    <div className="card flex flex-col p-6 transition-transform duration-200 hover:-translate-y-0.5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <span
            className={
              "grid h-11 w-11 place-items-center rounded-xl " +
              (isForm ? "bg-accent-500/10 text-accent-700" : "bg-brand-50 text-brand-600")
            }
          >
            {isForm ? <MessageCircle /> : <Bolt />}
          </span>
        </div>
        {product.badge && <span className="chip">{product.badge}</span>}
      </div>

      <h3 className="mt-4 font-display text-lg font-700 text-ink-900">{product.name}</h3>
      <p className="mt-1.5 text-sm leading-relaxed text-ink-500">{product.description}</p>

      <ul className="mt-4 space-y-2">
        {product.highlights.map((h) => (
          <li key={h} className="flex items-center gap-2 text-sm text-ink-700">
            <span className="grid h-5 w-5 place-items-center rounded-full bg-accent-500/10 text-accent-700">
              <Check width={13} height={13} />
            </span>
            {h}
          </li>
        ))}
      </ul>

      <div className="mt-6 flex items-end justify-between border-t border-[#f0efed] pt-5">
        <div>
          <span className="font-display text-2xl font-800 text-ink-900">{formatGHS(product.amount)}</span>
          <span className="ml-1 text-xs text-ink-500">one-time</span>
        </div>
        <Link
          href={`/checkout?product=${product.id}`}
          className={isForm ? "btn-accent" : "btn-primary"}
        >
          Buy now <ArrowRight width={16} height={16} />
        </Link>
      </div>
    </div>
  );
}
