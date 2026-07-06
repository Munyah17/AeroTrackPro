import type { Metadata, Viewport } from "next";
import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import "./globals.css";

// System fonts — no network calls needed for build
const inter = { variable: "--font-sans" };
const geistMono = { variable: "--font-geist-mono" };

/**
 * Absolute base URL for social previews (og:image etc. must be absolute).
 * Set NEXT_PUBLIC_SITE_URL in production (e.g. https://app.aerotrack.co.zw);
 * Vercel deployments fall back to VERCEL_URL automatically.
 */
const siteUrl =
  process.env.NEXT_PUBLIC_SITE_URL ??
  (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "http://localhost:3000");

const title = "AeroTrack Pro — GPS Tracking & Fleet Management Platform";
const description =
  "Enterprise white-label GPS tracking, fleet management, asset tracking and telematics SaaS. Live tracking, geofencing, fuel monitoring, driver behavior, remote immobilization and 20+ supported devices.";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: "AeroTrack Pro",
    template: "%s · AeroTrack Pro",
  },
  description,
  applicationName: "AeroTrack Pro",
  keywords: [
    "GPS tracking",
    "fleet management",
    "telematics",
    "vehicle tracking",
    "asset tracking",
    "white label GPS platform",
    "geofencing",
    "fuel monitoring",
    "Zimbabwe fleet tracking",
  ],
  openGraph: {
    type: "website",
    url: siteUrl,
    siteName: "AeroTrack Pro",
    title,
    description,
    locale: "en_US",
    // Images resolve from opengraph-image.tsx automatically, but an explicit
    // entry keeps WhatsApp/Telegram happy when they skip the file convention.
    images: [
      {
        url: "/opengraph-image",
        width: 1200,
        height: 630,
        alt: "AeroTrack Pro — live fleet tracking dashboard",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title,
    description,
    images: ["/opengraph-image"],
  },
  robots: {
    index: true,
    follow: true,
  },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f8fafc" },
    { media: "(prefers-color-scheme: dark)", color: "#0d1226" },
  ],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${inter.variable} ${geistMono.variable} font-sans antialiased`}>
        <TooltipProvider delay={200}>{children}</TooltipProvider>
        <Toaster position="top-right" richColors />
      </body>
    </html>
  );
}
