import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";

export const metadata = {
  title: "Refund & Replacement Policy",
  description:
    "How refunds and replacements work for EduPass GH vouchers and university form orders.",
};

export default function RefundPage() {
  return (
    <>
      <Navbar />
      <main className="mx-auto max-w-3xl px-5 py-14">
        <h1 className="font-display text-3xl font-800 text-ink-900">
          Refund &amp; Replacement Policy
        </h1>
        <p className="mt-2 text-sm text-ink-500">Last updated: July 2026</p>
        <p className="mt-4 leading-relaxed text-ink-700">
          Because result-checker vouchers are digital PINs delivered instantly,
          they generally cannot be refunded once revealed or sent — much like a
          scratch card cannot be returned once it has been scratched. That said,
          we stand behind every sale.
        </p>

        <h2 className="mt-8 font-display text-lg font-700 text-ink-900">
          We will always help if:
        </h2>
        <ul className="mt-3 list-disc space-y-2 pl-5 text-ink-700">
          <li>
            <strong>You did not receive your voucher.</strong> If your payment
            succeeded but no PIN appeared or arrived by email, contact us with
            your reference and we will resend or replace it free of charge.
          </li>
          <li>
            <strong>The code does not work or was already used.</strong> If a
            PIN we sent is faulty, we will verify and send a working
            replacement.
          </li>
          <li>
            <strong>You were charged but got no order.</strong> If money left
            your account but you received no confirmation, contact us — if we
            cannot deliver, we will refund you in full.
          </li>
        </ul>

        <h2 className="mt-8 font-display text-lg font-700 text-ink-900">
          University admission forms
        </h2>
        <p className="mt-2 leading-relaxed text-ink-700">
          Because these orders involve manual assistance, refund eligibility
          depends on how far the process has gone. Please contact us as soon as
          possible if there is a problem.
        </p>

        <h2 className="mt-8 font-display text-lg font-700 text-ink-900">
          How to request help
        </h2>
        <p className="mt-2 leading-relaxed text-ink-700">
          Email{" "}
          <a
            href="mailto:support@edupassgh.com"
            className="text-brand-600 hover:text-brand-700"
          >
            support@edupassgh.com
          </a>{" "}
          or WhatsApp{" "}
          <a
            href="https://wa.me/233256767495"
            target="_blank"
            rel="noopener noreferrer"
            className="text-brand-600 hover:text-brand-700"
          >
            +233 25 676 7495
          </a>{" "}
          with your payment reference. We aim to resolve issues within 24 hours.
        </p>
      </main>
      <Footer />
    </>
  );
}