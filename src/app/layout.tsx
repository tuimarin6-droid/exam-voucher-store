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
  manifest: "/site.webmanifest",
  icons: {
    icon: [
      { url: "/icon.png", type: "image/png", sizes: "512x512" },
      { url: "/favicon.ico", sizes: "any" },
    ],
    apple: [{ url: "/apple-icon.png", sizes: "180x180", type: "image/png" }],
  },
  openGraph: {
    type: "website",
    url: siteUrl,
    siteName: "EduPass GH",
    title: "EduPass GH \u2014 Instant Exam Checker Vouchers & University Forms",
    description:
      "Buy WASSCE, Private WASSCE and BECE result checker vouchers instantly in Ghana. Delivered to your email in seconds.",
    images: [{ url: "/icon.png", width: 512, height: 512 }],
  },
  twitter: {
    card: "summary_large_image",
    title: "EduPass GH \u2014 Instant Exam Checker Vouchers",
    description:
      "Buy WASSCE, Private WASSCE and BECE checker vouchers instantly in Ghana. Secure Paystack payment.",
    images: ["/icon.png"],
  },
  robots: {
    index: true,
    follow: true,
  },
};

const organizationJsonLd = {
  "@context": "https://schema.org",
  "@type": "Organization",
  name: "EduPass GH",
  url: siteUrl,
  logo: `${siteUrl}/icon.png`,
  description:
    "Buy WASSCE, Private WASSCE and BECE result checker vouchers instantly in Ghana, and get help with university admission forms. Secure Paystack payment, voucher delivered to your email in seconds.",
  contactPoint: {
    "@type": "ContactPoint",
    email: "support@edupassgh.com",
    telephone: "+233256767495",
    contactType: "customer support",
    areaServed: "GH",
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
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(organizationJsonLd) }}
        />
      </head>
      <body>{children}</body>
    </html>
  );
}
