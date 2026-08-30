import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";

export const metadata = {
  title: "About Us",
  description:
    "EduPass GH is operated by CENTER FORWARD VENTURES, selling instant WASSCE, Private WASSCE and BECE result-checker vouchers and assisted university admission forms in Ghana.",
};

export default function AboutPage() {
  return (
    <>
      <Navbar />
      <main className="mx-auto max-w-3xl px-5 py-14">
        <h1 className="font-display text-3xl font-800 text-ink-900">
          About EduPass GH
        </h1>
        <p className="mt-4 leading-relaxed text-ink-700">
          EduPass GH is an online store operated by{" "}
          <strong>CENTER FORWARD VENTURES</strong>, a Ghanaian business. We make
          it fast, safe and simple to buy official result-checker vouchers and
          university admission forms online — no queues, no stress.
        </p>

        <h2 className="mt-8 font-display text-xl font-700 text-ink-900">
          What we offer
        </h2>
        <ul className="mt-3 list-disc space-y-1.5 pl-5 text-ink-700">
          <li>
            WASSCE, Private (Nov/Dec) WASSCE and BECE result-checker vouchers —
            delivered instantly.
          </li>
          <li>Assisted purchase of university admission forms.</li>
        </ul>

        <h2 className="mt-8 font-display text-xl font-700 text-ink-900">
          Why students and parents trust us
        </h2>
        <ul className="mt-3 list-disc space-y-1.5 pl-5 text-ink-700">
          <li>
            Instant delivery — your PIN appears on screen and is emailed to you.
          </li>
          <li>
            Payments secured by Paystack (mobile money and cards). We never see
            or store your card details.
          </li>
          <li>Real human support on WhatsApp and email.</li>
        </ul>

        <div className="mt-8 rounded-xl border border-[#e6e5e3] bg-[#f7f9fc] p-5 text-sm text-ink-700">
          <strong>Please note:</strong> EduPass GH is not affiliated with, or
          endorsed by, WAEC. The vouchers we sell are official result-checker
          PINs that we resell for your convenience.
        </div>

        <h2 className="mt-8 font-display text-xl font-700 text-ink-900">
          Business details
        </h2>
        <ul className="mt-3 list-disc space-y-1.5 pl-5 text-ink-700">
          <li>Trading name: EduPass GH</li>
          <li>Operated by: CENTER FORWARD VENTURES (Ghana)</li>
          <li>
            Email:{" "}
            <a
              href="mailto:support@edupassgh.com"
              className="text-brand-600 hover:text-brand-700"
            >
              support@edupassgh.com
            </a>
          </li>
          <li>
            WhatsApp:{" "}
            <a
              href="https://wa.me/233256767495"
              target="_blank"
              rel="noopener noreferrer"
              className="text-brand-600 hover:text-brand-700"
            >
              +233 25 676 7495
            </a>
          </li>
        </ul>
      </main>
      <Footer />
    </>
  );
}