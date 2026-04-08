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
  icons: {
    icon: [
      { url: "/logos/icon_16.png", sizes: "16x16", type: "image/png" },
      { url: "/logos/icon_32.png", sizes: "32x32", type: "image/png" },
      { url: "/logos/icon_64.png", sizes: "64x64", type: "image/png" },
      { url: "/logos/icon_128.png", sizes: "128x128", type: "image/png" },
      { url: "/logos/icon_256.png", sizes: "256x256", type: "image/png" },
      { url: "/logos/icon_512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: [
      { url: "/logos/icon_256.png", sizes: "256x256", type: "image/png" },
    ],
    shortcut: "/logos/icon_32.png",
  },
  openGraph: {
    type: "website",
    url: BASE_URL,
    siteName: "Shiftstats",
    title: "Shiftstats — Shift Tracking & Earnings Analytics",
    description:
      "Log every shift, track earnings and hourly rates, set goals, and compare pay periods — all in one place.",
    locale: "en_US",
    images: [
      {
        url: "/logos/icon_1024.png",
        width: 1024,
        height: 1024,
        alt: "Shiftstats — Shift Tracking & Earnings Analytics",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Shiftstats — Shift Tracking & Earnings Analytics",
    description:
      "Log every shift, track earnings and hourly rates, set goals, and compare pay periods — all in one place.",
    images: ["/logos/icon_1024.png"],
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
