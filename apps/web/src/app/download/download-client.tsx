"use client";

import { useEffect, useRef } from "react";
import Link from "next/link";
import {
  Apple,
  ArrowRight,
  CheckCircle2,
  Download,
  Monitor,
  MoreVertical,
  Share,
  Smartphone,
} from "lucide-react";
import { BrandMark } from "@/components/brand/mark";
import { useBrand } from "@/components/shell/brand-provider";
import { Button } from "@/components/ui/button";
import { detectPlatform, usePwaInstall } from "@/lib/pwa";

function trackPageView() {
  try {
    if (sessionStorage.getItem("at-pwa-view")) return;
    sessionStorage.setItem("at-pwa-view", "1");
  } catch {
    /* private mode — still send, dupes are harmless */
  }
  void fetch("/api/pwa/event", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ type: "page_view", platform: detectPlatform() }),
    keepalive: true,
  }).catch(() => {});
}

function Step({ n, children }: { n: number; children: React.ReactNode }) {
  return (
    <li className="flex items-start gap-3">
      <span className="mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-full bg-primary/10 text-[11.5px] font-bold text-primary">
        {n}
      </span>
      <span className="text-[13px] leading-relaxed text-muted-foreground">{children}</span>
    </li>
  );
}

function PlatformCard({
  icon: Icon,
  title,
  badge,
  highlight,
  children,
  action,
}: {
  icon: typeof Smartphone;
  title: string;
  badge?: string;
  highlight?: boolean;
  children: React.ReactNode;
  action?: React.ReactNode;
}) {
  return (
    <div
      className={`flex flex-col rounded-2xl border p-5 shadow-card transition-shadow ${
        highlight ? "border-primary/50 ring-2 ring-primary/15" : "border-border/60"
      }`}
    >
      <div className="flex items-center gap-3">
        <div className="flex size-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
          <Icon className="size-5" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="text-[15px] font-semibold">{title}</div>
          {badge && <div className="text-[11.5px] text-muted-foreground">{badge}</div>}
        </div>
      </div>
      <ol className="mt-4 flex flex-col gap-2.5">{children}</ol>
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}

export function DownloadClient({ qrDataUrl, downloadUrl }: { qrDataUrl: string; downloadUrl: string }) {
  const { brand } = useBrand();
  const pwa = usePwaInstall();
  const tracked = useRef(false);

  useEffect(() => {
    if (tracked.current) return;
    tracked.current = true;
    trackPageView();
  }, []);

  const platform = pwa.platform;
  const highlightAndroid = platform === "android" || platform === "desktop";
  const highlightIos = platform === "ios";

  return (
    <div className="min-h-dvh bg-background text-foreground">
      {/* Top bar */}
      <header className="mx-auto flex max-w-5xl items-center justify-between px-4 py-4 sm:px-6">
        <div className="flex items-center gap-2.5">
          <div className="flex size-9 items-center justify-center overflow-hidden rounded-xl bg-primary">
            <BrandMark logo={brand.logoDataUrl} className="size-5 text-white" />
          </div>
          <span className="text-[15px] font-bold tracking-tight">{brand.name}</span>
        </div>
        <div className="flex items-center gap-2">
          <Button render={<Link href="/download" />} variant="ghost" size="sm" className="hidden rounded-lg sm:inline-flex">
            Get the app
          </Button>
          <Button render={<Link href="/login" />} variant="outline" size="sm" className="rounded-lg">
            Sign in
          </Button>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-4 pb-16 sm:px-6">
        {/* Hero */}
        <div className="mt-6 text-center sm:mt-12">
          <div className="inline-flex items-center gap-2 rounded-full border border-primary/25 bg-primary/5 px-3.5 py-1.5 text-[12px] font-semibold text-primary">
            <Download className="size-3.5" /> Installable web app — no app store needed
          </div>
          <h1 className="mx-auto mt-4 max-w-2xl text-3xl font-bold tracking-tight text-balance sm:text-5xl">
            {brand.name} on your phone
          </h1>
          <p className="mx-auto mt-3 max-w-xl text-[14.5px] leading-relaxed text-muted-foreground sm:text-[15.5px]">
            Live tracking, trip history, alerts and geofences — install {brand.name} like a
            native app. It works offline-tolerant, launches full-screen, and stays on your
            home screen.
          </p>
        </div>

        {pwa.isStandalone ? (
          <div className="mx-auto mt-8 flex max-w-md flex-col items-center gap-3 rounded-2xl border border-success/30 bg-success/5 p-6 text-center">
            <CheckCircle2 className="size-8 text-success" />
            <div className="text-[15px] font-semibold">You&apos;re already in the app</div>
            <p className="text-[13px] text-muted-foreground">
              This page is open inside the installed {brand.name} app.
            </p>
            <Button render={<Link href="/dashboard" />} className="mt-1 rounded-xl">
              Open dashboard <ArrowRight className="size-4" />
            </Button>
          </div>
        ) : (
          <>
            {/* Platform cards */}
            <div className="mt-10 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              <PlatformCard
                icon={Smartphone}
                title="Android"
                badge="Chrome, Edge, Samsung Internet"
                highlight={highlightAndroid}
                action={
                  pwa.canInstall ? (
                    <Button onClick={() => void pwa.promptInstall()} className="h-11 w-full rounded-xl shadow-card">
                      <Download className="size-4" /> Install AeroTrack
                    </Button>
                  ) : (
                    <div className="rounded-xl border border-dashed border-border/80 bg-muted/40 px-3.5 py-3 text-[12.5px] leading-relaxed text-muted-foreground">
                      In Chrome tap <MoreVertical className="inline size-3.5 align-[-2px]" />{" "}
                      <span className="font-semibold text-foreground">⋮ menu → Install app</span>{" "}
                      (or &quot;Add to Home screen&quot;).
                    </div>
                  )
                }
              >
                <Step n={1}>Open this page in <span className="font-semibold text-foreground">Chrome</span> on your Android phone.</Step>
                <Step n={2}>
                  {pwa.canInstall ? (
                    <>Tap <span className="font-semibold text-foreground">Install AeroTrack</span> below and confirm.</>
                  ) : (
                    <>Tap the <MoreVertical className="inline size-3.5 align-[-2px]" /> menu → <span className="font-semibold text-foreground">Install app</span>.</>
                  )}
                </Step>
                <Step n={3}>Find <span className="font-semibold text-foreground">AeroTrack</span> on your home screen and sign in.</Step>
              </PlatformCard>

              <PlatformCard
                icon={Apple}
                title="iPhone & iPad"
                badge="Safari only — iOS requirement"
                highlight={highlightIos}
              >
                <Step n={1}>Open this page in <span className="font-semibold text-foreground">Safari</span> (other iOS browsers can&apos;t install).</Step>
                <Step n={2}>
                  Tap the <Share className="inline size-3.5 align-[-2px]" /> <span className="font-semibold text-foreground">Share</span> button
                  (square with an arrow, at the bottom or top of Safari).
                </Step>
                <Step n={3}>
                  Scroll down and tap <span className="font-semibold text-foreground">Add to Home Screen</span>, then <span className="font-semibold text-foreground">Add</span>.
                </Step>
                <Step n={4}>Launch <span className="font-semibold text-foreground">AeroTrack</span> from your home screen.</Step>
              </PlatformCard>

              <PlatformCard
                icon={Monitor}
                title="Windows & Mac"
                badge="Chrome or Edge"
                highlight={!highlightAndroid && !highlightIos}
              >
                <Step n={1}>Open this page in <span className="font-semibold text-foreground">Chrome or Edge</span>.</Step>
                <Step n={2}>
                  Click the <Download className="inline size-3.5 align-[-2px]" /> <span className="font-semibold text-foreground">install icon</span> in the
                  address bar — or ⋮ menu → <span className="font-semibold text-foreground">Install AeroTrack Pro</span>.
                </Step>
                <Step n={3}>It opens in its own window, separate from the browser.</Step>
              </PlatformCard>
            </div>

            {/* QR + fallback */}
            <div className="mt-6 hidden items-center gap-5 rounded-2xl border border-border/60 bg-card p-5 shadow-card sm:flex">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={qrDataUrl}
                alt={`QR code linking to ${downloadUrl}`}
                width={144}
                height={144}
                className="size-36 shrink-0 rounded-xl border border-border/60"
              />
              <div>
                <div className="text-[14.5px] font-semibold">On a computer right now?</div>
                <p className="mt-1 max-w-md text-[13px] leading-relaxed text-muted-foreground">
                  Scan this code with your phone camera — it opens this exact page on
                  your device so you can install straight away.
                </p>
                <code className="mt-2 block truncate rounded-lg bg-muted/60 px-2.5 py-1.5 font-mono text-[11.5px] text-muted-foreground">
                  {downloadUrl}
                </code>
              </div>
            </div>
          </>
        )}

        {/* Footer */}
        <footer className="mt-14 flex flex-col items-center gap-2 border-t border-border/50 pt-6 text-center text-[12px] text-muted-foreground">
          <span>
            © 2026 {brand.name}
            {brand.login.showPoweredBy && brand.name !== "AeroTrack Pro" ? " · Powered by AeroTrack" : ""}
          </span>
          <Link href="/" className="font-medium text-primary underline-offset-2 hover:underline">
            Back to site
          </Link>
        </footer>
      </main>
    </div>
  );
}
