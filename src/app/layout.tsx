import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "EduPass GH \u2014 Instant Exam Vouchers & University Forms",
  description:
    "Buy WASSCE, Private WASSCE and BECE result checker vouchers instantly, and get help with university admission forms. Secure payments by Paystack.",
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
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Sora:wght@600;700;800&display=swap"
          rel="stylesheet"
        />
      </head>
      <body>{children}</body>
    </html>
  );
}
