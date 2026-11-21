import type { Metadata } from "next";
import Link from "next/link";
import {
  ArrowLeft,
  Fuel,
  Gauge,
  LocateFixed,
  MessageCircleQuestion,
  Radio,
  Zap,
} from "lucide-react";
import { ApplyForm } from "@/components/marketing/apply-form";
import { SiteHeader } from "@/components/marketing/site-header";

export const metadata: Metadata = {
  title: "Apply for Tracking — Get Fitted This Week",
  description:
    "Apply for GPS tracking, fuel monitoring, engine cut-off, speed governor and dashcam installs — hardware, professional installation and platform activation included. Pay with EcoCash, OneMoney, InnBucks, card (Visa/Mastercard) or bank transfer. Installers: onboard your own devices at $3.50/month.",
};

const packagePrices = [
  { icon: Radio, name: "GPS tracking", price: "$70" },
  { icon: Fuel, name: "Fuel tracking", price: "$350" },
  { icon: Zap, name: "Engine cut-off", price: "$100" },
  { icon: Gauge, name: "Speed governor", price: "$180" },
];

const faqs = [
  {
    q: "Do you come to me, or do I bring the vehicle in?",
    a: "We come to you. Installations happen at your home, depot or office — your vehicle never leaves your sight.",
  },
  {
    q: "What if my vehicle isn't on the supported list?",
    a: "Apply anyway. The supported-vehicle database covers the common models, but our installers assess any vehicle on request — mention it in the notes and we'll confirm.",
  },
  {
    q: "I already fit trackers for customers — can I use your platform?",
    a: "Yes. Installers and resellers onboard their own hardware at $3.50 per device per month and get the full map, alarms and reporting platform to run under their own service.",
  },
  {
    q: "What happens if my mobile payment doesn't go through?",
    a: "Your application is saved either way. Choose bank transfer or a direct transfer instead — the account details are shown after you submit.",
  },
  {
    q: "Is there a monthly fee?",
    a: "The fix-and-supply price covers hardware, fitting and activation. Platform access is billed per active device — your quote confirms the exact monthly amount before you pay anything.",
  },
];

export default function ApplyPage() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <SiteHeader />

      {/* ── Hero band ── */}
      <section className="border-b border-border/60 bg-muted/30">
        <div className="mx-auto max-w-3xl px-5 pb-10 pt-8 text-center sm:px-6">
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 text-[13px] font-medium text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="size-4" /> Back to home
          </Link>
          <p className="mt-6 text-xs font-semibold uppercase tracking-widest text-primary">
            Applications
          </p>
          <h1 className="mt-3 text-3xl font-bold tracking-tight sm:text-4xl">
            Apply for tracking — get fitted this week
          </h1>
          <p className="mx-auto mt-4 max-w-2xl leading-relaxed text-muted-foreground">
            Hardware, professional installation and platform activation are
            included in every price — pay online or by transfer and we handle
            the rest.
          </p>
          <div className="mt-6 flex flex-wrap justify-center gap-2.5">
            {packagePrices.map((p) => (
              <span
                key={p.name}
                className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-3.5 py-1.5 text-[12px] font-medium shadow-card"
              >
                <p.icon className="size-3.5 text-primary" />
                {p.name}
                <b className="text-primary">{p.price}</b>
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* ── Checkout form ── */}
      <main className="mx-auto max-w-3xl px-5 py-12 sm:px-6">
        <ApplyForm />
      </main>

      {/* ── FAQ ── */}
      <section className="border-t border-border/60 bg-muted/30">
        <div className="mx-auto max-w-4xl px-5 py-14 sm:px-6">
          <div className="mb-8 text-center">
            <p className="text-xs font-semibold uppercase tracking-widest text-primary">
              Before you apply
            </p>
            <h2 className="mt-2 text-2xl font-bold tracking-tight">Common questions</h2>
          </div>
          <div className="space-y-3">
            {faqs.map((f) => (
              <div key={f.q} className="rounded-2xl border border-border bg-card p-5 shadow-card">
                <h3 className="flex items-start gap-2.5 text-[14px] font-semibold">
                  <MessageCircleQuestion className="mt-0.5 size-4.5 shrink-0 text-primary" />
                  {f.q}
                </h3>
                <p className="mt-2 pl-7 text-[13px] leading-relaxed text-muted-foreground">
                  {f.a}
                </p>
              </div>
            ))}
          </div>
          <p className="mt-8 text-center text-[13px] text-muted-foreground">
            Still unsure?{" "}
            <Link href="/supported-vehicles" className="font-semibold text-primary hover:underline">
              Check your vehicle
            </Link>{" "}
            first, or just apply — we confirm everything before charging you.
          </p>
        </div>
      </section>

      {/* ── Footer ── */}
      <footer className="border-t border-border/60">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 px-6 py-8 sm:flex-row">
          <div className="flex items-center gap-2.5">
            <span className="flex size-7 items-center justify-center rounded-lg bg-primary">
              <LocateFixed className="size-4 text-white" />
            </span>
            <span className="text-sm font-semibold">AeroTrack Pro</span>
          </div>
          <nav className="flex items-center gap-5 text-xs text-muted-foreground">
            <Link href="/#pricing" className="hover:text-foreground">Pricing</Link>
            <Link href="/supported-vehicles" className="hover:text-foreground">Vehicles</Link>
            <Link href="/register" className="hover:text-foreground">Register</Link>
          </nav>
          <p className="text-xs text-muted-foreground">
            GPS tracking &amp; managed fleet services
          </p>
        </div>
      </footer>
    </div>
  );
}
