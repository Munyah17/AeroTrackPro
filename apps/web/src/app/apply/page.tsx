import type { Metadata } from "next";
import Link from "next/link";
import {
  ArrowLeft,
  ArrowRight,
  BadgeCheck,
  Banknote,
  CalendarCheck,
  ClipboardList,
  Fuel,
  Gauge,
  LocateFixed,
  MessageCircleQuestion,
  Radio,
  Smartphone,
  Wrench,
  Zap,
} from "lucide-react";
import { ApplyForm } from "@/components/marketing/apply-form";
import { SiteHeader } from "@/components/marketing/site-header";

export const metadata: Metadata = {
  title: "Apply for Tracking — Get Fitted This Week",
  description:
    "Apply for GPS tracking, fuel monitoring, engine cut-off, speed governor and dashcam installs — hardware, professional fitting and platform activation included. Pay with EcoCash, OneMoney, InnBucks, card (Visa/Mastercard) or bank transfer. Installers: onboard your own devices at $3.50/month.",
};

const howItWorks = [
  {
    icon: ClipboardList,
    title: "Submit the application",
    body: "Pick the services you need, tell us about your vehicle or fleet, and choose how you want to pay — takes under two minutes.",
  },
  {
    icon: Smartphone,
    title: "Pay instantly or get instructions",
    body: "EcoCash, OneMoney and InnBucks bill your phone on the spot. Bank transfer and direct-transfer options show account details after you submit.",
  },
  {
    icon: CalendarCheck,
    title: "We confirm the same day",
    body: "Our team reviews every application, confirms your price and books a fitting slot that suits you.",
  },
  {
    icon: Wrench,
    title: "Professional installation",
    body: "We come to you — hardware fitted, tested, and activated on the platform before we leave. You get your login and training on the spot.",
  },
];

const included = [
  "Tracker, SIM and platform activation — always included",
  "Professional fitting at your location, not a workshop queue",
  "Mobile app + web dashboard with live map, trips and alerts",
  "SOS, geofence, tamper and power-cut alarms from day one",
  "Same-day application confirmation and install scheduling",
  "Ongoing monitoring support — not a fit-and-forget sale",
];

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
        <div className="mx-auto max-w-6xl px-5 pb-10 pt-8 sm:px-6">
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 text-[13px] font-medium text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="size-4" /> Back to home
          </Link>
          <p className="mt-6 text-xs font-semibold uppercase tracking-widest text-primary">
            Applications
          </p>
          <h1 className="mt-3 max-w-2xl text-3xl font-bold tracking-tight sm:text-4xl">
            Apply for tracking — get fitted this week
          </h1>
          <p className="mt-4 max-w-2xl leading-relaxed text-muted-foreground">
            One application covers tracking, fuel monitoring, immobilisers,
            speed governors and cameras. Hardware, professional installation and
            platform activation are included in every price — pay on your phone
            or by transfer and we handle the rest.
          </p>
          <div className="mt-6 flex flex-wrap gap-2.5">
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

      {/* ── Main: steps + included  |  form ── */}
      <main className="mx-auto max-w-6xl px-5 py-12 sm:px-6">
        <div className="grid items-start gap-10 lg:grid-cols-[0.85fr_1.15fr]">
          <div className="space-y-8">
            {/* how it works */}
            <section>
              <h2 className="text-lg font-bold tracking-tight">How it works</h2>
              <ol className="mt-4 space-y-0">
                {howItWorks.map((s, i) => (
                  <li key={s.title} className="relative flex gap-4 pb-6 last:pb-0">
                    {i < howItWorks.length - 1 && (
                      <div className="absolute bottom-0 left-[15px] top-9 w-px bg-border" />
                    )}
                    <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
                      <s.icon className="size-4" />
                    </span>
                    <div>
                      <div className="text-[14px] font-semibold">
                        <span className="mr-1.5 text-primary">{i + 1}.</span>
                        {s.title}
                      </div>
                      <p className="mt-1 text-[13px] leading-relaxed text-muted-foreground">
                        {s.body}
                      </p>
                    </div>
                  </li>
                ))}
              </ol>
            </section>

            {/* included */}
            <section className="rounded-2xl border border-border bg-card p-5 shadow-card">
              <h2 className="text-[15px] font-bold">Every application includes</h2>
              <ul className="mt-4 space-y-2.5 text-[13px] leading-relaxed">
                {included.map((t) => (
                  <li key={t} className="flex items-start gap-2.5">
                    <BadgeCheck className="mt-0.5 size-4 shrink-0 text-success" />
                    <span>{t}</span>
                  </li>
                ))}
              </ul>
            </section>

            {/* payments */}
            <section className="rounded-2xl border border-border bg-card p-5 shadow-card">
              <h2 className="flex items-center gap-2 text-[15px] font-bold">
                <Banknote className="size-4.5 text-primary" /> Ways to pay
              </h2>
              <div className="mt-4 grid grid-cols-2 gap-2 text-[12.5px]">
                {["EcoCash", "OneMoney", "InnBucks", "Bank transfer", "Direct transfer"].map((m) => (
                  <span
                    key={m}
                    className="rounded-lg border border-border/70 bg-muted/40 px-3 py-2 font-medium"
                  >
                    {m}
                  </span>
                ))}
              </div>
              <p className="mt-3 text-xs leading-relaxed text-muted-foreground">
                Mobile money bills your phone instantly. Manual methods show our
                account details right after you submit the form.
              </p>
            </section>

            {/* BYOD installers */}
            <section className="rounded-2xl border border-primary/40 bg-primary/5 p-5">
              <p className="text-[11px] font-semibold uppercase tracking-widest text-primary">
                Installers &amp; resellers
              </p>
              <h2 className="mt-1.5 text-[15px] font-bold">
                Fit your own hardware? Onboard it for $3.50 / device / month
              </h2>
              <p className="mt-1.5 text-[13px] leading-relaxed text-muted-foreground">
                Keep your supplier and fitting business — put your customers&rsquo;
                devices on the AeroTrack platform and sell tracking under your
                own service.
              </p>
              <Link
                href="/register"
                className="mt-3 inline-flex items-center gap-1.5 text-[12.5px] font-semibold text-primary hover:underline"
              >
                Register as an installer <ArrowRight className="size-3.5" />
              </Link>
            </section>
          </div>

          {/* the form */}
          <div className="lg:sticky lg:top-6">
            <ApplyForm />
          </div>
        </div>
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
