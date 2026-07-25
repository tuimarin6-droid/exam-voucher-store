import type { Metadata } from "next";
import "./globals.css";

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://edupassgh.com";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default:
      "EduPass GH \u2014 Instant WASSCE, BECE & Private WASSCE Checker Vouchers",
    template: "%s | EduPass GH",
  },
  description:
    "Buy WASSCE, Private WASSCE and BECE result checker vouchers instantly in Ghana, and get help with university admission forms. Secure Paystack payment, voucher delivered to your email in seconds.",
  keywords: [
    "WASSCE checker",
    "BECE checker",
    "WASSCE results checker Ghana",
    "buy WASSCE checker online",
    "Private WASSCE checker",
    "results checker voucher",
    "university admission forms Ghana",
    "EduPass GH",
  ],
  applicationName: "EduPass GH",
  alternates: { canonical: "/" },
  openGraph: {
    type: "website",
    url: siteUrl,
    siteName: "EduPass GH",
    title: "EduPass GH \u2014 Instant Exam Checker Vouchers & University Forms",
    description:
      "Buy WASSCE, Private WASSCE and BECE result checker vouchers instantly in Ghana. Delivered to your email in seconds.",
  },
  twitter: {
    card: "summary_large_image",
    title: "EduPass GH \u2014 Instant Exam Checker Vouchers",
    description:
      "Buy WASSCE, Private WASSCE and BECE checker vouchers instantly in Ghana. Secure Paystack payment.",
  },
  robots: {
    index: true,
    follow: true,
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link
          rel="preconnect"
          href="https://fonts.gstatic.com"
          crossOrigin=""
        />
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Sora:wght@600;700;800&display=swap"
          rel="stylesheet"
        />
      </head>
      <body>{children}</body>
    </html>
  );
}