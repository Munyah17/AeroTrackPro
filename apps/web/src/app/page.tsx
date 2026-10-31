import Link from "next/link";
import { ApplyForm } from "@/components/marketing/apply-form";
import { HeroSlider } from "@/components/marketing/hero-slider";
import { SiteHeader } from "@/components/marketing/site-header";
import { DevicesSection } from "@/components/marketing/devices-section";
import {
  ArrowRight,
  BadgeCheck,
  Fuel,
  Gauge,
  LocateFixed,
  MapPin,
  Package,
  PawPrint,
  MonitorSmartphone,
  Radio,
  Route,
  ShieldCheck,
  Ticket,
  Truck,
  Wrench,
  Zap,
} from "lucide-react";

const services = [
  { icon: MapPin, title: "Live tracking & geofencing", body: "Real-time positions, route replay and geofence alerts on one map." },
  { icon: Ticket, title: "Fuel coupons & savings", body: "Negotiated coupons at partner garages with spend tracked per vehicle." },
  { icon: ShieldCheck, title: "Insurance monitoring", body: "Policies issued and lapse alerts sent before cover runs out." },
  { icon: Wrench, title: "Repair & service", body: "Scheduled maintenance and workshop bookings, logged in-platform." },
  { icon: Route, title: "Route & dispatch", body: "Assign routes and get deviation alerts your team can act on." },
  { icon: Gauge, title: "Fuel & telemetry", body: "Fuel levels, ignition states and engine-hours from the device inputs." },
  { icon: Zap, title: "SOS & immobilisation", body: "Panic buttons and remote engine cut-off over the air or by SMS." },
  { icon: Truck, title: "All asset types", body: "Vehicles, kombis, trucks, cargo, laptops — one platform covers it." },
];

const corporatePoints = [
  { icon: Radio, text: "We supply, install and configure every tracker and SIM." },
  { icon: Zap, text: "Alarms, geofences and SOS events watched around the clock." },
  { icon: Fuel, text: "Fuel coupons and monitoring that stop leakage in days." },
  { icon: BadgeCheck, text: "Insurance, servicing and repairs handled for you." },
];

const packages = [
  { icon: Radio, name: "GPS tracking", price: "$70", unit: "per vehicle", body: "Tracker, SIM, professional installation and platform activation.", featured: true },
  { icon: Fuel, name: "Fuel tracking", price: "$350", unit: "per vehicle", body: "Tank probe, full calibration, theft and drain alerts.", featured: false },
  { icon: Zap, name: "Remote engine cut-off", price: "$100", unit: "per vehicle", body: "Relay immobilizer — stop and restore the engine remotely.", featured: false },
  { icon: Gauge, name: "Speed governor", price: "$180", unit: "per vehicle", body: "Road-speed limiting hardware fitted and certified.", featured: false },
];

const assetTypes = [
  { icon: Truck, label: "Vehicles & fleets" },
  { icon: Package, label: "Parcels & cargo" },
  { icon: MonitorSmartphone, label: "Laptops & IT" },
  { icon: PawPrint, label: "Pets, kids & bags" },
];

const stats = [
  { value: "10", label: "Wire protocols, one pipeline" },
  { value: "30+", label: "Device models supported" },
  { value: "15s", label: "Position update cadence" },
  { value: "24/7", label: "Monitoring & alarms" },
];

function SectionHeading({ kicker, title, sub }: { kicker: string; title: string; sub?: string }) {
  return (
    <div className="mx-auto mb-12 max-w-2xl text-center">
      <p className="text-xs font-semibold uppercase tracking-widest text-primary">{kicker}</p>
      <h2 className="mt-3 text-3xl font-bold tracking-tight">{title}</h2>
      {sub && <p className="mt-3 text-muted-foreground">{sub}</p>}
    </div>
  );
}

export default function LandingPage() {
  return (
    <div className="min-h-screen overflow-x-clip bg-background text-foreground">
      <SiteHeader />

      {/* ── Hero slider (managed in Master Portal → Site Content) ── */}
      <HeroSlider />

      {/* ── Stats strip ── */}
      <section className="border-b border-border/60 bg-card/60">
        <div className="mx-auto grid max-w-6xl grid-cols-2 gap-6 px-6 py-10 sm:grid-cols-4">
          {stats.map((s) => (
            <div key={s.label} className="text-center">
              <div className="text-3xl font-bold tracking-tight text-primary">{s.value}</div>
              <div className="mt-1 text-xs text-muted-foreground">{s.label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* ── Corporate & Industrial Solutions ── */}
      <section id="corporate" className="mx-auto max-w-6xl px-6 py-16">
        <SectionHeading
          kicker="For Businesses"
          title="Corporate & Industrial Solutions"
          sub="Your whole transport operation — tracking, fuel, insurance, servicing — run as a managed service, so your team manages one invoice instead of a fleet."
        />
        <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {corporatePoints.map((item) => (
            <li key={item.text} className="flex flex-col items-center gap-3 rounded-2xl border border-border bg-card p-5 text-center shadow-card">
              <span className="flex size-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
                <item.icon className="size-5" />
              </span>
              <span className="text-sm leading-relaxed">{item.text}</span>
            </li>
          ))}
        </ul>
        <div className="mt-8 text-center">
          <a
            href="#apply"
            className="inline-flex items-center gap-2 rounded-xl bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground shadow-card transition-colors hover:bg-primary/90"
          >
            Talk to us about your fleet <ArrowRight className="size-4" />
          </a>
        </div>
      </section>

      {/* ── Services ── */}
      <section id="services" className="border-y border-border/60 bg-muted/30">
        <div className="mx-auto max-w-6xl px-6 py-16">
          <SectionHeading
            kicker="Everything included"
            title="One platform, every operation"
            sub="From a single SOS button to a full transport department — every module ships on day one."
          />
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {services.map((s) => (
              <div key={s.title} className="group rounded-2xl border border-border bg-card p-5 shadow-card transition-shadow hover:shadow-card-hover">
                <span className="flex size-10 items-center justify-center rounded-xl bg-primary/10 text-primary transition-colors group-hover:bg-primary group-hover:text-white">
                  <s.icon className="size-5" />
                </span>
                <h3 className="mt-4 text-sm font-semibold">{s.title}</h3>
                <p className="mt-1.5 text-[13px] leading-relaxed text-muted-foreground">{s.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Devices ── */}
      <DevicesSection />

      {/* ── Pricing / Solutions That Work ── */}
      <section id="pricing" className="border-y border-border/60 bg-muted/30">
        <div className="mx-auto max-w-6xl px-6 py-16">
          <SectionHeading
            kicker="Fix & supply"
            title="Solutions That Work"
            sub="Hardware, installation and activation included in one price — no surprises, no hidden extras."
          />
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {packages.map((p) => (
              <div
                key={p.name}
                className={`flex flex-col rounded-2xl border bg-card p-5 shadow-card ${
                  p.featured ? "border-primary/60 ring-1 ring-primary/30" : "border-border"
                }`}
              >
                <span className="mb-3 flex size-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
                  <p.icon className="size-5" />
                </span>
                <span className="text-sm font-semibold leading-snug">{p.name}</span>
                <div className="mt-2 flex items-baseline gap-1">
                  <span className="text-2xl font-bold tracking-tight">{p.price}</span>
                  <span className="text-[11px] text-muted-foreground">{p.unit}</span>
                </div>
                <p className="mt-2 flex-1 text-xs leading-relaxed text-muted-foreground">{p.body}</p>
                <Link
                  href="/register"
                  className="mt-4 inline-flex w-fit items-center gap-1 text-[12px] font-semibold text-primary hover:underline"
                >
                  Get started <ArrowRight className="size-3" />
                </Link>
              </div>
            ))}
          </div>
          <p className="mt-6 text-center text-xs text-muted-foreground">
            Volume and fleet discounts available — add-ons can be fitted during the same visit.
          </p>
        </div>
      </section>

      {/* ── Apply ── */}
      <section id="apply" className="mx-auto max-w-6xl px-6 py-16">
        <div className="grid items-start gap-10 lg:grid-cols-[0.9fr_1.1fr]">
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest text-primary">Get fitted</p>
            <h2 className="mt-3 text-3xl font-bold tracking-tight">Apply for tracking today</h2>
            <p className="mt-4 max-w-md leading-relaxed text-muted-foreground">
              Pick your services, pay with EcoCash, OneMoney, InnBucks or bank
              transfer, and we schedule your installation. Hardware and fitting
              are always included.
            </p>
            <ul className="mt-6 space-y-3 text-sm">
              {[
                "Instant mobile-money approval on your phone",
                "Bank transfer options with clear instructions",
                "Our team confirms every application the same day",
              ].map((t) => (
                <li key={t} className="flex items-start gap-2.5">
                  <BadgeCheck className="mt-0.5 size-4 shrink-0 text-success" />
                  <span>{t}</span>
                </li>
              ))}
            </ul>
          </div>
          <ApplyForm />
        </div>
      </section>

      {/* ── Assets ── */}
      <section id="assets" className="border-y border-border/60 bg-muted/30">
        <div className="mx-auto max-w-6xl px-6 py-16">
          <SectionHeading
            kicker="Beyond vehicles"
            title="If it moves — or might get moved — track it"
            sub="The same platform watches cargo, laptops, parcels, pets, children and bags with the right alerts for each."
          />
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {assetTypes.map((a) => (
              <div key={a.label} className="flex items-center gap-3.5 rounded-2xl border border-border bg-card p-5 shadow-card">
                <span className="flex size-11 items-center justify-center rounded-xl bg-primary/10 text-primary">
                  <a.icon className="size-5" />
                </span>
                <span className="text-sm font-semibold leading-snug">{a.label}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA ── */}
      <section className="mx-auto max-w-6xl px-6 py-16">
        <div className="relative overflow-hidden rounded-3xl bg-primary px-8 py-14 text-center shadow-float sm:px-14">
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0 bg-[radial-gradient(70%_120%_at_50%_0%,oklch(1_0_0/0.12),transparent_60%)]"
          />
          <h2 className="text-balance text-3xl font-bold tracking-tight text-white">
            Ready to protect your fleet?
          </h2>
          <p className="mx-auto mt-4 max-w-xl text-balance text-white/80">
            Get fitted this week — tracking, fuel monitoring and immobilisation
            on one platform, installed and supported by us.
          </p>
          <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
            <Link
              href="/register"
              className="inline-flex items-center gap-2 rounded-xl bg-white px-6 py-3 text-sm font-semibold text-primary transition-transform hover:bg-white/90 active:scale-[0.98]"
            >
              Get started <ArrowRight className="size-4" />
            </Link>
            <Link
              href="/supported-vehicles"
              className="inline-flex items-center gap-2 rounded-xl border border-white/40 px-6 py-3 text-sm font-semibold text-white transition-colors hover:bg-white/10"
            >
              Check your vehicle
            </Link>
          </div>
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
          <p className="text-xs text-muted-foreground">
            GPS tracking & managed fleet services
          </p>
        </div>
      </footer>
    </div>
  );
}
