"use client";

import Link from "next/link";
import { Bell, MapPin, ShieldCheck } from "lucide-react";
import { BrandMark } from "@/components/brand/mark";
import { useBrand } from "@/components/shell/brand-provider";
import { PLATFORM_NAME, type BrandConfig } from "@/lib/brand";

export function LandingSite() {
  const { brand } = useBrand();
  if (brand.template === "tracker-store") return <TrackerStore brand={brand} />;
  if (brand.template === "operations-desk") return <OperationsDesk brand={brand} />;
  if (brand.template === "simple-sign-in") return <SimpleSignIn brand={brand} />;
  return <FleetCommand brand={brand} />;
}

function Wordmark({ brand, light }: { brand: BrandConfig; light?: boolean }) {
  return (
    <div className="flex min-w-0 items-center gap-2.5">
      <div
        className="flex size-9 shrink-0 items-center justify-center overflow-hidden rounded-xl"
        style={{ background: light ? brand.primary : "rgba(255,255,255,0.16)" }}
      >
        <BrandMark logo={brand.logoDataUrl} className="size-5 text-white" />
      </div>
      <span className="truncate text-[15px] font-bold tracking-tight">{brand.name}</span>
    </div>
  );
}

function HeaderLinks({ brand, onDark }: { brand: BrandConfig; onDark?: boolean }) {
  return (
    <div className="flex shrink-0 items-center gap-2">
      <Link
        href="/login"
        className={`rounded-lg px-3 py-2 text-sm font-medium ${onDark ? "text-white/85 hover:bg-white/10" : "text-foreground hover:bg-muted"}`}
      >
        Sign in
      </Link>
      <Link
        href="/register"
        className="rounded-lg px-3 py-2 text-sm font-semibold text-white"
        style={{ background: brand.primary }}
      >
        Get started
      </Link>
    </div>
  );
}

function SiteFooter({ brand, className }: { brand: BrandConfig; className?: string }) {
  return (
    <footer className={className ?? "px-4 py-6 text-[12px] text-muted-foreground sm:px-8"}>
      © 2026 {brand.name}
      {brand.login.showPoweredBy && brand.name !== PLATFORM_NAME ? " · Powered by AeroTrack" : ""}
    </footer>
  );
}

function FleetCommand({ brand }: { brand: BrandConfig }) {
  return (
    <div data-brand={brand.name} data-template="fleet-command" className="min-h-dvh bg-[#07111f] text-white">
      <header className="flex items-center justify-between gap-3 px-4 py-4 sm:px-8">
        <Wordmark brand={brand} />
        <HeaderLinks brand={brand} onDark />
      </header>
      <main className="mx-auto grid max-w-6xl items-center gap-10 px-4 py-12 sm:px-8 lg:grid-cols-[1.1fr_0.9fr] lg:py-20">
        <div>
          <p className="text-[12px] font-semibold uppercase tracking-[0.14em] text-white/55">{brand.tagline}</p>
          <h1 className="mt-3 max-w-xl text-4xl font-bold tracking-tight text-balance sm:text-5xl">
            {brand.login.headline}
          </h1>
          <p className="mt-4 max-w-lg text-[15px] leading-relaxed text-white/70">
            Live positions, trip history, and alerts for every vehicle you put on {brand.name}.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link href="/login" className="rounded-xl bg-white px-5 py-3 text-sm font-semibold" style={{ color: brand.primary }}>
              Open the map
            </Link>
            <Link href="/register" className="rounded-xl border border-white/20 px-5 py-3 text-sm font-semibold text-white">
              Create an account
            </Link>
          </div>
        </div>
        <div className="rounded-3xl border border-white/10 bg-white/5 p-4">
          <div className="flex h-56 items-end rounded-2xl p-4 sm:h-72" style={{ background: `linear-gradient(160deg, ${brand.primary}, #07111f)` }}>
            <div className="grid w-full grid-cols-3 gap-2">
              {[
                ["128", "Vehicles online"],
                ["6", "Open alerts"],
                ["24/7", "Live desk"],
              ].map(([value, label]) => (
                <div key={label} className="rounded-xl bg-black/25 p-3">
                  <div className="text-lg font-bold">{value}</div>
                  <div className="text-[11px] text-white/70">{label}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </main>
      <SiteFooter brand={brand} className="px-4 py-6 text-[12px] text-white/45 sm:px-8" />
    </div>
  );
}

function TrackerStore({ brand }: { brand: BrandConfig }) {
  const plans = [
    { name: "Personal", price: "$6", detail: "One car, the phone app, and trip history." },
    { name: "Family", price: "$14", detail: "Up to four vehicles and shared alerts." },
    { name: "Business", price: "$7", detail: "Per vehicle, with a desk login for the office." },
  ];
  return (
    <div data-brand={brand.name} data-template="tracker-store" className="min-h-dvh bg-[#f6f7fb] text-foreground">
      <header className="flex items-center justify-between gap-3 border-b bg-white px-4 py-4 sm:px-8">
        <Wordmark brand={brand} light />
        <HeaderLinks brand={brand} />
      </header>
      <main className="mx-auto max-w-6xl px-4 py-12 sm:px-8">
        <p className="text-[12px] font-semibold uppercase tracking-[0.14em]" style={{ color: brand.primary }}>
          {brand.tagline}
        </p>
        <h1 className="mt-2 max-w-2xl text-4xl font-bold tracking-tight text-balance sm:text-5xl">
          Track your car from a site that looks like {brand.name}.
        </h1>
        <p className="mt-4 max-w-xl text-[15px] text-muted-foreground">
          Pick a tracker, sign in, and follow it live. The app your customers open carries your logo and your colours.
        </p>
        <div className="mt-10 grid gap-4 md:grid-cols-3">
          {plans.map((plan) => (
            <article key={plan.name} className="rounded-2xl border bg-white p-5 shadow-card">
              <div className="text-sm font-semibold" style={{ color: brand.primary }}>{plan.name}</div>
              <div className="mt-2 text-3xl font-bold">
                {plan.price}
                <span className="text-sm font-medium text-muted-foreground"> / vehicle</span>
              </div>
              <p className="mt-3 text-sm text-muted-foreground">{plan.detail}</p>
              <Link
                href="/register"
                className="mt-5 inline-flex rounded-xl px-4 py-2 text-sm font-semibold text-white"
                style={{ background: brand.primary }}
              >
                Start with {plan.name}
              </Link>
            </article>
          ))}
        </div>
      </main>
      <SiteFooter brand={brand} />
    </div>
  );
}

function OperationsDesk({ brand }: { brand: BrandConfig }) {
  const jobs = [
    { icon: MapPin, title: "Live map", body: "Every assigned vehicle, updated as it moves." },
    { icon: Bell, title: "Alerts in your name", body: "SMS goes out with your sender ID, not the platform's." },
    { icon: ShieldCheck, title: "Your login", body: "Customers sign in on your domain and see your logo first." },
  ];
  return (
    <div data-brand={brand.name} data-template="operations-desk" className="min-h-dvh bg-background text-foreground">
      <header className="flex items-center justify-between gap-3 border-b px-4 py-4 sm:px-8">
        <Wordmark brand={brand} light />
        <HeaderLinks brand={brand} />
      </header>
      <div className="grid grid-cols-1 border-b sm:grid-cols-3">
        {[
          ["42", "Online now"],
          ["3", "Alerts today"],
          ["1,280 km", "Driven today"],
        ].map(([value, label]) => (
          <div key={label} className="px-4 py-4 sm:px-8">
            <div className="text-2xl font-bold" style={{ color: brand.primary }}>{value}</div>
            <div className="text-[12px] text-muted-foreground">{label}</div>
          </div>
        ))}
      </div>
      <main className="mx-auto max-w-6xl px-4 py-12 sm:px-8">
        <h1 className="max-w-2xl text-4xl font-bold tracking-tight text-balance">{brand.login.headline}</h1>
        <p className="mt-3 max-w-xl text-[15px] text-muted-foreground">{brand.tagline}</p>
        <div className="mt-8 grid gap-4 md:grid-cols-3">
          {jobs.map((job) => (
            <article key={job.title} className="rounded-2xl border p-5">
              <job.icon className="size-5" style={{ color: brand.primary }} />
              <h2 className="mt-3 text-[15px] font-semibold">{job.title}</h2>
              <p className="mt-1.5 text-sm text-muted-foreground">{job.body}</p>
            </article>
          ))}
        </div>
      </main>
      <SiteFooter brand={brand} />
    </div>
  );
}

function SimpleSignIn({ brand }: { brand: BrandConfig }) {
  return (
    <div data-brand={brand.name} data-template="simple-sign-in" className="grid min-h-dvh lg:grid-cols-2">
      <div className="flex flex-col justify-between px-4 py-8 text-white sm:px-10" style={{ background: brand.primary }}>
        <Wordmark brand={brand} />
        <div className="py-12">
          <h1 className="max-w-md text-4xl font-bold tracking-tight text-balance">{brand.login.headline}</h1>
          <p className="mt-4 max-w-sm text-[15px] text-white/80">{brand.tagline}</p>
        </div>
        <SiteFooter brand={brand} className="text-[12px] text-white/70" />
      </div>
      <div className="flex items-center justify-center bg-background px-4 py-12">
        <div className="w-full max-w-sm rounded-2xl border bg-card p-6 shadow-card">
          <div className="flex flex-col items-center text-center">
            <div
              className="flex size-12 items-center justify-center overflow-hidden rounded-xl"
              style={{ background: brand.primary }}
            >
              <BrandMark logo={brand.logoDataUrl} className="size-6 text-white" />
            </div>
            <h2 className="mt-3 text-xl font-bold">{brand.login.welcome}</h2>
            <p className="mt-1 text-sm text-muted-foreground">{brand.login.subtitle}</p>
          </div>
          <div className="mt-6 space-y-3">
            <div className="h-11 rounded-xl border bg-muted/40 px-3 text-[13px] leading-[2.75rem] text-muted-foreground">Email</div>
            <div className="h-11 rounded-xl border bg-muted/40 px-3 text-[13px] leading-[2.75rem] text-muted-foreground">Password</div>
            <Link
              href="/login"
              className="flex h-11 items-center justify-center rounded-xl text-sm font-semibold text-white"
              style={{ background: brand.primary }}
            >
              Sign in to {brand.name}
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
