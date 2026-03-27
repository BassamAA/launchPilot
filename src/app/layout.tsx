import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { AuthListener } from "@/components/AuthListener";
import { BRAND_NAME } from "@/lib/brand";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: `${BRAND_NAME} — AI Marketing Autopilot for Developers`,
    template: `%s | ${BRAND_NAME}`,
  },
  description:
    `Paste your URL and ${BRAND_NAME} analyzes your site, builds a marketing strategy, generates content, and executes across SEO, social, Reddit, and directories.`,
  keywords: ["marketing automation", "indie hacker", "developer marketing", "AI marketing"],
  openGraph: {
    type: "website",
    title: `${BRAND_NAME} — AI Marketing Autopilot`,
    description: `Your product is live. Where are your customers? ${BRAND_NAME} markets it for you.`,
    siteName: BRAND_NAME,
  },
  twitter: {
    card: "summary_large_image",
    title: `${BRAND_NAME} — AI Marketing Autopilot`,
    description: "Paste your URL. Get customers. No marketing experience needed.",
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={inter.variable} suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;500&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="bg-white text-gray-900 antialiased font-sans">
        <AuthListener />
        {children}
      </body>
    </html>
  );
}
