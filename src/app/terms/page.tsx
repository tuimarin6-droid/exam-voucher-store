import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";

export const metadata = {
  title: "Terms of Service",
  description: "The terms that apply when you buy from EduPass GH.",
};

export default function TermsPage() {
  return (
    <>
      <Navbar />
      <main className="mx-auto max-w-3xl px-5 py-14">
        <h1 className="font-display text-3xl font-800 text-ink-900">
          Terms of Service
        </h1>
        <p className="mt-2 text-sm text-ink-500">Last updated: July 2026</p>
        <p className="mt-4 leading-relaxed text-ink-700">
          By using edupassgh.com and buying from EduPass GH (“we”, “us”),
          operated by CENTER FORWARD VENTURES, you agree to the terms below. If
          you do not agree, please do not use the site.
        </p>

        <h2 className="mt-8 font-display text-lg font-700 text-ink-900">
          1. What we sell
        </h2>
        <p className="mt-2 leading-relaxed text-ink-700">
          Result-checker vouchers (WASSCE, Private WASSCE and BECE) and assisted
          university admission form purchases. All prices are shown in Ghana
          Cedis (GHS) at checkout.
        </p>

        <h2 className="mt-6 font-display text-lg font-700 text-ink-900">
          2. Payment
        </h2>
        <p className="mt-2 leading-relaxed text-ink-700">
          Payments are processed securely by Paystack. Your order is confirmed
          only after your payment has been verified.
        </p>

        <h2 className="mt-6 font-display text-lg font-700 text-ink-900">
          3. Delivery
        </h2>
        <p className="mt-2 leading-relaxed text-ink-700">
          Voucher PINs are delivered instantly on the confirmation page and by
          email. University form assistance is delivered through WhatsApp after
          payment.
        </p>

        <h2 className="mt-6 font-display text-lg font-700 text-ink-900">
          4. Using your voucher
        </h2>
        <p className="mt-2 leading-relaxed text-ink-700">
          Each PIN is single-use and triple use for one index number, and valid only for the service stated. Please
          keep it private — we cannot be held responsible for PINs shared with
          or used by other people.
        </p>

        <h2 className="mt-6 font-display text-lg font-700 text-ink-900">
          5. Not affiliated with WAEC
        </h2>
        <p className="mt-2 leading-relaxed text-ink-700">
          EduPass GH is an independent reseller and is not affiliated with, or
          endorsed by, WAEC. Result availability and the checker service are
          controlled by WAEC, not by us.
        </p>

        <h2 className="mt-6 font-display text-lg font-700 text-ink-900">
          6. Your responsibilities
        </h2>
        <p className="mt-2 leading-relaxed text-ink-700">
          You are responsible for giving us a correct email address and phone
          number. We are not liable for delivery problems caused by incorrect
          contact details.
        </p>

        <h2 className="mt-6 font-display text-lg font-700 text-ink-900">
          7. Acceptable use
        </h2>
        <p className="mt-2 leading-relaxed text-ink-700">
          You may not use this site for fraud or any activity that breaches WAEC
          rules or Ghanaian law.
        </p>

        <h2 className="mt-6 font-display text-lg font-700 text-ink-900">
          8. Limitation of liability
        </h2>
        <p className="mt-2 leading-relaxed text-ink-700">
          To the fullest extent permitted by law, our total liability for any
          order is limited to the amount you paid for that order.
        </p>

        <h2 className="mt-6 font-display text-lg font-700 text-ink-900">
          9. Changes to these terms
        </h2>
        <p className="mt-2 leading-relaxed text-ink-700">
          We may update these terms from time to time. The current version will
          always be available on this page.
        </p>

        <h2 className="mt-6 font-display text-lg font-700 text-ink-900">
          10. Contact
        </h2>
        <p className="mt-2 leading-relaxed text-ink-700">
          Questions about these terms? Email{" "}
          <a
            href="mailto:support@edupassgh.com"
            className="text-brand-600 hover:text-brand-700"
          >
            support@edupassgh.com
          </a>
          .
        </p>
      </main>
      <Footer />
    </>
  );
}