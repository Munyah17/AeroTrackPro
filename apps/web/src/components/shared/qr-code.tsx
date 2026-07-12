"use client";

import { useEffect, useState } from "react";
import QRCode from "qrcode";
import { cn } from "@/lib/utils";

/** Renders a QR code for arbitrary text as an inline SVG data URL. */
export function QrCode({
  value,
  size = 160,
  className,
}: {
  value: string;
  size?: number;
  className?: string;
}) {
  const [dataUrl, setDataUrl] = useState<string>("");

  useEffect(() => {
    let active = true;
    QRCode.toString(value, { type: "svg", margin: 1, width: size, errorCorrectionLevel: "M" })
      .then((svg) => {
        if (active) setDataUrl(`data:image/svg+xml;base64,${btoa(svg)}`);
      })
      .catch(() => setDataUrl(""));
    return () => {
      active = false;
    };
  }, [value, size]);

  if (!dataUrl) {
    return <div className={cn("animate-pulse rounded-lg bg-muted", className)} style={{ width: size, height: size }} />;
  }
  // eslint-disable-next-line @next/next/no-img-element
  return <img src={dataUrl} alt="QR code" width={size} height={size} className={cn("rounded-lg", className)} />;
}
