import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const BASE_URL = "https://shift-stats.com";

export const metadata: Metadata = {
  metadataBase: new URL(BASE_URL),
  title: {
    default: "Shiftstats — Shift Tracking & Earnings Analytics",
    template: "%s | Shiftstats",
  },
  description:
    "Log every shift, track earnings and hourly rates, set goals, and compare pay periods — all in one place. Free shift tracking app for servers, bartenders, and hourly workers.",
  keywords: [
    "shift tracking",
    "earnings tracker",
    "hourly rate calculator",
    "tip tracker",
    "server income tracker",
    "bartender earnings",
    "shift log app",
    "pay period tracker",
  ],
  alternates: {
    canonical: "/",
  },
  openGraph: {
    type: "website",
    url: BASE_URL,
    siteName: "Shiftstats",
    title: "Shiftstats — Shift Tracking & Earnings Analytics",
    description:
      "Log every shift, track earnings and hourly rates, set goals, and compare pay periods — all in one place.",
    locale: "en_US",
  },
  twitter: {
    card: "summary_large_image",
    title: "Shiftstats — Shift Tracking & Earnings Analytics",
    description:
      "Log every shift, track earnings and hourly rates, set goals, and compare pay periods — all in one place.",
  },
  robots: {
    index: true,
    follow: true,
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        {children}
      </body>
    </html>
  );
}
