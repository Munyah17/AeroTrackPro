import type { Metadata } from "next";
import { headers } from "next/headers";
import QRCode from "qrcode";
import { DownloadClient } from "./download-client";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Get the AeroTrack App",
  description:
    "Install AeroTrack Pro on iPhone, iPad, Android or desktop — live GPS tracking and fleet management as an app, no app store needed.",
};

/**
 * Public install page. The QR code encodes THIS host's /download URL so it
 * works on reseller custom domains too — resolve from request headers.
 */
export default async function DownloadPage() {
  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host") ?? "localhost:3000";
  const proto = h.get("x-forwarded-proto") ?? (host.startsWith("localhost") ? "http" : "https");
  const downloadUrl = `${proto}://${host}/download`;

  const qrDataUrl = await QRCode.toDataURL(downloadUrl, {
    margin: 1,
    width: 360,
    color: { dark: "#0f172a", light: "#ffffff" },
  });

  return <DownloadClient qrDataUrl={qrDataUrl} downloadUrl={downloadUrl} />;
}
