import Link from "next/link";
import { GraduationCap, Lock } from "./icons";

export function Navbar() {
  return (
    <header className="sticky top-0 z-40 border-b border-[#e6e5e3] bg-white/90 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-5 py-3.5">
        <Link href="/" className="flex items-center gap-2.5">
          <span className="grid h-9 w-9 place-items-center rounded-xl bg-brand-600 text-white">
            <GraduationCap width={20} height={20} />
          </span>
          <span className="font-display text-lg font-800 tracking-tight text-ink-900">
            EduPass <span className="text-brand-600">GH</span>
          </span>
        </Link>
        <div className="flex items-center gap-4">
          <a href="#products" className="hidden text-sm font-semibold text-ink-700 hover:text-brand-600 sm:block">
            Vouchers
          </a>
          <a href="#how" className="hidden text-sm font-semibold text-ink-700 hover:text-brand-600 sm:block">
            How it works
          </a>
          <span className="inline-flex items-center gap-1.5 rounded-full bg-accent-500/10 px-3 py-1 text-xs font-semibold text-accent-700">
            <Lock width={14} height={14} /> Secure
          </span>
        </div>
      </div>
    </header>
  );
}
