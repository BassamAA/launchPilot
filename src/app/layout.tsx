import type { Metadata } from "next";
import { Inter } from "next/font/google";
import Script from "next/script";
import "./globals.css";
import { AuthListener } from "@/components/AuthListener";
import { BRAND_MARKETING_URL, BRAND_NAME } from "@/lib/brand";
import { buildOrganizationJsonLd, defaultMarketingKeywords } from "@/lib/seo";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL(BRAND_MARKETING_URL),
  title: {
    default: `${BRAND_NAME} — AI Marketing Autopilot for Developers`,
    template: `%s | ${BRAND_NAME}`,
  },
  description:
    `Paste your URL and ${BRAND_NAME} analyzes your site, builds a marketing strategy, generates content, and executes across SEO, social, Reddit, and directories.`,
  keywords: defaultMarketingKeywords,
  alternates: {
    canonical: "/",
  },
  openGraph: {
    type: "website",
    title: `${BRAND_NAME} — AI Marketing Autopilot`,
    description: `Your product is live. Where are your customers? ${BRAND_NAME} markets it for you.`,
    siteName: BRAND_NAME,
    url: BRAND_MARKETING_URL,
  },
  twitter: {
    card: "summary_large_image",
    title: `${BRAND_NAME} — AI Marketing Autopilot`,
    description: "Paste your URL. Get customers. No marketing experience needed.",
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const organizationJsonLd = buildOrganizationJsonLd();

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
        <Script id="organization-jsonld" type="application/ld+json">
          {JSON.stringify(organizationJsonLd)}
        </Script>
        <AuthListener />
        {children}
      </body>
    </html>
  );
}
