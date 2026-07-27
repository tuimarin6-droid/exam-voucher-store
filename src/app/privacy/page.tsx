import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";

export const metadata = {
  title: "Privacy Policy",
  description: "How EduPass GH collects, uses and protects your information.",
};

export default function PrivacyPage() {
  return (
    <>
      <Navbar />
      <main className="mx-auto max-w-3xl px-5 py-14">
        <h1 className="font-display text-3xl font-800 text-ink-900">
          Privacy Policy
        </h1>
        <p className="mt-2 text-sm text-ink-500">Last updated: July 2026</p>
        <p className="mt-4 leading-relaxed text-ink-700">
          This policy explains what information EduPass GH (operated by CENTER
          FORWARD VENTURES) collects and how we use it.
        </p>

        <h2 className="mt-8 font-display text-lg font-700 text-ink-900">
          What we collect
        </h2>
        <ul className="mt-3 list-disc space-y-1.5 pl-5 text-ink-700">
          <li>
            Your email address — to send your voucher, receipts and support
            replies.
          </li>
          <li>
            Your phone number — only for university form orders, so we can reach
            you on WhatsApp.
          </li>
          <li>Your payment reference and order details.</li>
        </ul>

        <div className="mt-6 rounded-xl border border-[#e6e5e3] bg-[#f7f9fc] p-5 text-sm text-ink-700">
          We do <strong>not</strong> collect or store your card or mobile-money
          details. All payments are handled directly by Paystack on their own
          secure systems.
        </div>

        <h2 className="mt-8 font-display text-lg font-700 text-ink-900">
          How we use your information
        </h2>
        <ul className="mt-3 list-disc space-y-1.5 pl-5 text-ink-700">
          <li>To deliver your purchase and send receipts.</li>
          <li>To provide customer support.</li>
          <li>To keep records of orders for accounting and legal purposes.</li>
        </ul>

        <h2 className="mt-8 font-display text-lg font-700 text-ink-900">
          Sharing
        </h2>
        <p className="mt-2 leading-relaxed text-ink-700">
          We share only the information needed with Paystack to process your
          payment. We never sell your personal data to anyone.
        </p>

        <h2 className="mt-8 font-display text-lg font-700 text-ink-900">
          Data retention
        </h2>
        <p className="mt-2 leading-relaxed text-ink-700">
          We keep order records for as long as necessary to provide support and
          meet legal and accounting requirements.
        </p>

        <h2 className="mt-8 font-display text-lg font-700 text-ink-900">
          Your rights
        </h2>
        <p className="mt-2 leading-relaxed text-ink-700">
          You can ask us to access or delete your personal data at any time by
          emailing{" "}
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