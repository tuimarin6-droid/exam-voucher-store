import { Lock, Mail, MessageCircle } from "./icons";

export function Footer() {
  return (
    <footer className="border-t border-[#e6e5e3] bg-white">
      <div className="mx-auto max-w-6xl px-5 py-10">
        <div className="flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="font-display text-base font-700">EduPass GH</p>
            <p className="mt-1 max-w-md text-sm text-ink-500">
              Instant WASSCE, Private WASSCE and BECE result checker vouchers, plus
              assisted university admission form purchases.
            </p>
          </div>
          <div className="flex flex-col gap-2 text-sm text-ink-700">
            <span className="inline-flex items-center gap-2"><Mail width={16} height={16} /> support@edupassgh.com</span>
            <span className="inline-flex items-center gap-2"><MessageCircle width={16} height={16} /> WhatsApp support</span>
            <span className="inline-flex items-center gap-2 text-accent-700"><Lock width={16} height={16} /> Payments secured by Paystack</span>
          </div>
        </div>
        <p className="mt-8 border-t border-[#f0efed] pt-6 text-xs text-ink-500">
          \u00A9 {new Date().getFullYear()} EduPass GH. Not affiliated with WAEC. Vouchers are official result-checker PINs resold for convenience.
        </p>
      </div>
    </footer>
  );
}
