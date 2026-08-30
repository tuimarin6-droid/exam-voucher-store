import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { Mail, MessageCircle } from "@/components/icons";

export const metadata = {
  title: "Contact Us",
  description:
    "Get help with your EduPass GH order. Reach us by email at support@edupassgh.com or on WhatsApp at +233 25 676 7495.",
};

export default function ContactPage() {
  return (
    <>
      <Navbar />
      <main className="mx-auto max-w-3xl px-5 py-14">
        <h1 className="font-display text-3xl font-800 text-ink-900">
          Contact us
        </h1>
        <p className="mt-4 leading-relaxed text-ink-700">
          Have a question or need help with an order? We are happy to help — and
          we usually reply within a few hours.
        </p>

        <div className="mt-8 grid gap-4 sm:grid-cols-2">
          <a
            href="mailto:support@edupassgh.com"
            className="card flex items-center gap-3 p-5 hover:border-brand-600"
          >
            <span className="grid h-10 w-10 place-items-center rounded-xl bg-brand-50 text-brand-600">
              <Mail width={20} height={20} />
            </span>
            <span>
              <span className="block text-xs text-ink-500">Email</span>
              <span className="block font-600 text-ink-900">
                support@edupassgh.com
              </span>
            </span>
          </a>
          <a
            href="https://wa.me/233256767495"
            target="_blank"
            rel="noopener noreferrer"
            className="card flex items-center gap-3 p-5 hover:border-brand-600"
          >
            <span className="grid h-10 w-10 place-items-center rounded-xl bg-accent-500/10 text-accent-700">
              <MessageCircle width={20} height={20} />
            </span>
            <span>
              <span className="block text-xs text-ink-500">WhatsApp</span>
              <span className="block font-600 text-ink-900">
                +233 25 676 7495
              </span>
            </span>
          </a>
        </div>

        <h2 className="mt-8 font-display text-xl font-700 text-ink-900">
          Support hours
        </h2>
        <p className="mt-3 text-ink-700">
          Monday to Saturday, 8:00am – 9:00pm (GMT). Messages sent outside these
          hours are answered the next morning.
        </p>

        <div className="mt-6 rounded-xl border border-[#e6e5e3] bg-[#f7f9fc] p-5 text-sm text-ink-700">
          <strong>Tip:</strong> When contacting us about a payment, please
          include your <strong>payment reference</strong> (shown on your receipt
          and on the confirmation page) so we can help you faster.
        </div>
      </main>
      <Footer />
    </>
  );
}