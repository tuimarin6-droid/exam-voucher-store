import { Lock, Mail, MessageCircle } from "./icons";

export function Footer() {
  return (
    <footer className="border-t border-[#e6e5e3] bg-white">
      <div className="mx-auto max-w-6xl px-5 py-10">
        <div className="flex flex-col gap-8 sm:flex-row sm:items-start sm:justify-between">
          {/* Company */}
          <div className="max-w-md">
            <div className="flex items-center gap-3">
              <span className="grid h-12 w-12 shrink-0 place-items-center overflow-hidden rounded-xl bg-ink-900">
                <img src="/logo-fc.png" alt="CENTER FORWARD VENTURES logo" className="h-12 w-12 object-cover" />
              </span>
              <div>
                <p className="font-display text-base font-800 tracking-tight text-ink-900">CENTER FORWARD VENTURES</p>
                <p className="text-xs text-ink-500">Operator of EduPass GH</p>
              </div>
            </div>
            <p className="mt-4 text-sm text-ink-500">
              Instant WASSCE, Private WASSCE and BECE result checker vouchers, plus
              assisted university admission form purchases.
            </p>
          </div>

          {/* Contact */}
          <div className="flex flex-col gap-2 text-sm text-ink-700">
            <a href="mailto:tuimarin6@gmail.com" className="inline-flex items-center gap-2 hover:text-brand-600">
              <Mail width={16} height={16} /> tuimarin6@gmail.com
            </a>
            <a href="https://wa.me/233256767495" target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 hover:text-brand-600">
              <MessageCircle width={16} height={16} /> +233 25 676 7495
            </a>
            <span className="inline-flex items-center gap-2 text-accent-700">
              <Lock width={16} height={16} /> Payments secured by Paystack
            </span>
          </div>
        </div>

        {/* Developer credit */}
        <div className="mt-8 flex items-center gap-3 border-t border-[#f0efed] pt-6">
          <img src="/fred-oppong.png" alt="Fred Oppong" className="h-11 w-11 rounded-full object-cover" />
          <div>
            <p className="text-sm font-600 text-ink-900">Fred Oppong</p>
            <p className="text-xs text-ink-500">Developer</p>
          </div>
        </div>

        <p className="mt-6 text-xs text-ink-500">
          © {new Date().getFullYear()} CENTER FORWARD VENTURES · EduPass GH. Not affiliated with WAEC. Vouchers are official result-checker PINs resold for convenience.
        </p>
      </div>
    </footer>
  );
}