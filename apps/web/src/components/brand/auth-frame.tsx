"use client";

import { Radio, ShieldCheck, Zap } from "lucide-react";
import { BrandMark } from "@/components/brand/mark";
import { useBrand } from "@/components/shell/brand-provider";
import { PLATFORM_NAME } from "@/lib/brand";

const FEATURES = [
  { icon: Zap, text: "Real-time positions every few seconds" },
  { icon: Radio, text: "20+ supported devices across 8 protocols" },
  { icon: ShieldCheck, text: "Bank-grade security with full audit trails" },
];

export function AuthFrame({ children }: { children: React.ReactNode }) {
  const { brand } = useBrand();
  const login = brand.login;
  const background = login.backgroundDataUrl
    ? {
        backgroundImage: `linear-gradient(160deg, color-mix(in srgb, var(--sidebar) 86%, transparent), color-mix(in srgb, var(--sidebar) 72%, black)), url("${login.backgroundDataUrl}")`,
        backgroundSize: "cover",
        backgroundPosition: "center",
      }
    : undefined;

  const mark = (
    <div className="flex items-center gap-3">
      <div className="flex size-11 items-center justify-center overflow-hidden rounded-xl bg-white/15">
        <BrandMark logo={brand.logoDataUrl} className="size-6 text-white" />
      </div>
      <div className="min-w-0">
        <div className="truncate text-[17px] font-bold tracking-tight">{brand.name}</div>
        <div className="truncate text-[12px] text-white/60">{brand.tagline}</div>
      </div>
    </div>
  );

  if (login.layout === "centered") {
    return (
      <div
        data-brand={brand.name}
        data-login-layout="centered"
        className="relative flex min-h-dvh items-center justify-center bg-sidebar p-4 text-white sm:p-8"
        style={background}
      >
        <div className="relative w-full max-w-[440px]">
          <div className="mb-6">{mark}</div>
          <div className="rounded-2xl bg-background p-6 text-foreground shadow-float md:p-10">{children}</div>
          <Footer brandName={brand.name} showPoweredBy={login.showPoweredBy} className="mt-6 text-white/70" />
        </div>
      </div>
    );
  }

  return (
    <div data-brand={brand.name} data-login-layout="split" className="grid min-h-dvh lg:grid-cols-[1.05fr_1fr]">
      <div
        className="relative hidden flex-col justify-between overflow-hidden bg-sidebar p-10 text-white lg:flex"
        style={background}
      >
        <svg
          className="pointer-events-none absolute inset-0 h-full w-full opacity-25"
          viewBox="0 0 800 900"
          preserveAspectRatio="none"
        >
          <path
            d="M -40 620 C 180 520, 260 700, 430 580 S 700 380, 860 470"
            stroke="white"
            strokeWidth="3"
            strokeDasharray="12 10"
            fill="none"
          />
          <circle cx="430" cy="580" r="10" fill="#4ade80" />
          <circle cx="430" cy="580" r="22" fill="rgba(74,222,128,0.25)" />
          <circle cx="150" cy="565" r="9" fill="#f87171" />
          <circle cx="690" cy="435" r="9" fill="#fbbf24" />
        </svg>
        <div className="absolute -right-32 -top-32 size-96 rounded-full bg-white/5" />

        <div className="relative">{mark}</div>

        <div className="relative max-w-md">
          <h1 className="text-balance text-4xl font-bold leading-tight tracking-tight">{login.headline}</h1>
          <p className="mt-4 text-[15px] leading-relaxed text-white/75">
            {brand.name === PLATFORM_NAME
              ? "Live tracking, geofencing, fuel monitoring, driver behavior and remote immobilization — one mission-control platform for your entire fleet."
              : `${brand.tagline}. Live tracking, alerts, and trip history, presented as ${brand.name}.`}
          </p>
          <div className="mt-8 flex flex-col gap-3.5">
            {FEATURES.map((feature) => (
              <div key={feature.text} className="flex items-center gap-3 text-[13.5px] text-white/85">
                <span className="flex size-8 items-center justify-center rounded-lg bg-white/12">
                  <feature.icon className="size-4" />
                </span>
                {feature.text}
              </div>
            ))}
          </div>
        </div>

        <Footer brandName={brand.name} showPoweredBy={login.showPoweredBy} className="relative text-white/50" />
      </div>

      <div className="flex items-center justify-center bg-background p-6 md:p-10">
        <div className="w-full max-w-[400px]">{children}</div>
      </div>
    </div>
  );
}

function Footer({
  brandName,
  showPoweredBy,
  className,
}: {
  brandName: string;
  showPoweredBy: boolean;
  className?: string;
}) {
  return (
    <div className={className ? `text-[12px] ${className}` : "text-[12px]"}>
      © 2026 {brandName}
      {showPoweredBy && brandName !== PLATFORM_NAME ? " · Powered by AeroTrack" : ""}
      {brandName === PLATFORM_NAME ? " · Trusted by logistics companies, insurers and fleet operators" : ""}
    </div>
  );
}
