import Link from "next/link";
import { ApplyForm } from "@/components/marketing/apply-form";
import {
  Activity,
  ArrowRight,
  BadgeCheck,
  Bell,
  Building2,
  Fuel,
  Gauge,
  LocateFixed,
  MapPin,
  MonitorSmartphone,
  Package,
  PawPrint,
  Radio,
  Route,
  ShieldCheck,
  Ticket,
  Truck,
  Video,
  Wrench,
  Zap,
} from "lucide-react";

/**
 * Public marketing landing page.
 * Static server component — no client JS, no tracking scripts, no secrets.
 */

const services = [
  {
    icon: MapPin,
    title: "Live tracking & geofencing",
    body: "Real-time positions, route replay, geofence alerts and driver behaviour on one map — sub-second updates over realtime channels.",
  },
  {
    icon: Ticket,
    title: "Negotiated fuel coupons",
    body: "Issue and redeem fuel coupons at partner garages, track spend per vehicle, and flag anomalies before they hit the books.",
  },
  {
    icon: ShieldCheck,
    title: "Insurance delivery & lapse monitoring",
    body: "Policies issued, renewed and monitored in-platform — lapse alerts to you and the client long before cover runs out.",
  },
  {
    icon: Wrench,
    title: "Repair & service management",
    body: "Scheduled maintenance, service history, and workshop bookings so vehicles spend time earning, not waiting.",
  },
  {
    icon: Route,
    title: "Route planning & dispatch",
    body: "Plan, assign and monitor routes with live deviation alerts and trip reports your clients can act on.",
  },
  {
    icon: Gauge,
    title: "Fuel monitoring & telemetry",
    body: "Fuel-level sensors, ignition states, odometer and engine-hours telemetry straight from the device's analog inputs.",
  },
  {
    icon: Bell,
    title: "SOS, alarms & immobilization",
    body: "Panic buttons, shock and cut-power alarms, and remote engine immobilization over TCP or SMS when seconds matter.",
  },
  {
    icon: Building2,
    title: "White-label for resellers",
    body: "Your brand, your domain, your pricing — onboard fleet clients under your own logo with tenant isolation built in.",
  },
];

const hardware = [
  { name: "SinoTrack", note: "ST-901A & full H02 spectrum" },
  { name: "Teltonika", note: "FMB / FMT / FMC via Codec 8" },
  { name: "Concox · Jimi · Kingwo", note: "GT06-family CAT1 units" },
  { name: "Coban · Xexun", note: "TK103 & GPS103 protocol" },
  { name: "JT808 terminals", note: "J16 4G & mandated hardware" },
  { name: "Queclink · Meitrack · Eelink", note: "Enterprise asset hardware" },
  { name: "OBD plug-and-play", note: "VT200, FMB001, ST-902" },
  { name: "TKStar · Cantrack", note: "H02-dialect asset trackers" },
];

const packages = [
  {
    icon: Radio,
    name: "GPS tracking",
    price: "$70",
    unit: "per vehicle",
    body: "Tracker unit, SIM provisioning, professional installation and platform activation.",
    featured: true,
  },
  {
    icon: Fuel,
    name: "Fuel tracking",
    price: "$350",
    unit: "per vehicle",
    body: "Tank probe or Bluetooth flow sensor, full calibration, theft and drain alerts.",
    featured: false,
  },
  {
    icon: Zap,
    name: "Remote engine cut-off",
    price: "$100",
    unit: "per vehicle",
    body: "Relay immobilizer — stop and restore the engine remotely or on alarm.",
    featured: false,
  },
  {
    icon: Gauge,
    name: "Speed governor",
    price: "$180",
    unit: "per vehicle",
    body: "Road-speed limiting hardware fitted, configured and certified.",
    featured: false,
  },
  {
    icon: Video,
    name: "Dashcam",
    price: "Quote",
    unit: "per installation",
    body: "Road-facing or dual-channel camera with event clips into the platform.",
    featured: false,
  },
];

const assetTypes = [
  { icon: Truck, label: "Vehicles & fleets" },
  { icon: Package, label: "Parcels, stock & cargo" },
  { icon: MonitorSmartphone, label: "Laptops & IT assets" },
  { icon: PawPrint, label: "Pets, children & bags" },
];

const stats = [
  { value: "10", label: "Wire protocols, one pipeline" },
  { value: "30+", label: "Device models supported" },
  { value: "15s", label: "Default position cadence" },
  { value: "24/7", label: "Monitoring & alarm handling" },
];

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* ── Navigation ─────────────────────────────────────────── */}
      <header className="sticky top-0 z-40 border-b border-border/60 bg-background/80 backdrop-blur-md">
        <nav className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-2 px-4 sm:px-6">
          <Link href="/" className="flex min-w-0 items-center gap-2.5">
            <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-primary">
              <LocateFixed className="size-5 text-white" />
            </span>
            <span className="truncate text-[15px] font-bold tracking-tight">AeroTrack Pro</span>
          </Link>
          <div className="hidden items-center gap-7 text-sm text-muted-foreground md:flex">
            <a href="#services" className="transition-colors hover:text-foreground">Services</a>
            <a href="#model" className="transition-colors hover:text-foreground">B2B model</a>
            <a href="#hardware" className="transition-colors hover:text-foreground">Hardware</a>
            <a href="#pricing" className="transition-colors hover:text-foreground">Pricing</a>
            <a href="#assets" className="transition-colors hover:text-foreground">Assets</a>
          </div>
          <div className="flex shrink-0 items-center gap-1.5 sm:gap-2.5">
            <Link
              href="/login"
              className="rounded-lg px-2.5 py-2 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground sm:px-3.5"
            >
              Sign in
            </Link>
            <Link
              href="/register"
              className="rounded-lg bg-primary px-3 py-2 text-sm font-semibold text-primary-foreground shadow-sm transition-colors hover:bg-primary/90 sm:px-4"
            >
              Get started
            </Link>
          </div>
        </nav>
      </header>

      {/* ── Hero ───────────────────────────────────────────────── */}
      <section className="relative overflow-hidden">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 bg-[radial-gradient(60%_50%_at_50%_0%,oklch(0.5_0.23_262.9/0.07),transparent_70%)]"
        />
        <div className="mx-auto grid max-w-6xl items-center gap-14 px-6 pb-20 pt-16 lg:grid-cols-[1.05fr_0.95fr] lg:pt-24">
          <div>
            <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-border bg-card px-3 py-1 text-xs font-medium text-muted-foreground">
              <span className="relative flex size-1.5">
                <span className="absolute inline-flex size-full animate-ping rounded-full bg-success opacity-60" />
                <span className="relative inline-flex size-1.5 rounded-full bg-success" />
              </span>
              Fleet management, fully managed
            </div>
            <h1 className="text-balance text-4xl font-bold leading-[1.08] tracking-tight sm:text-5xl">
              Outsource your transport department. Keep one Transport Manager.
            </h1>
            <p className="mt-5 max-w-xl text-balance text-lg leading-relaxed text-muted-foreground">
              AeroTrack Pro runs your entire fleet operation — tracking, fuel, insurance,
              service and dispatch — so your organisation pays one bill instead of
              staffing a department.
            </p>
            <div className="mt-8 flex flex-wrap items-center gap-3">
              <Link
                href="/register"
                className="inline-flex items-center gap-2 rounded-xl bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground shadow-card transition-transform hover:bg-primary/90 active:scale-[0.98]"
              >
                Start managing a fleet
                <ArrowRight className="size-4" />
              </Link>
              <Link
                href="/dashboard"
                className="inline-flex items-center gap-2 rounded-xl border border-border bg-card px-6 py-3 text-sm font-semibold shadow-card transition-colors hover:border-primary/40"
              >
                View live demo
              </Link>
            </div>
            <p className="mt-4 text-xs text-muted-foreground">
              No hardware lock-in — bring the trackers you already own.
            </p>
          </div>

          {/* Stylised tracking-card visual */}
          <div className="relative" aria-hidden>
            <div className="rounded-3xl border border-border bg-card p-5 shadow-float">
              <div className="mb-4 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="size-2 rounded-full bg-success" />
                  <span className="text-xs font-semibold">Live fleet view</span>
                </div>
                <span className="rounded-md bg-muted px-2 py-0.5 font-mono text-[10px] text-muted-foreground">
                  5013/tcp · h02
                </span>
              </div>
              <div className="relative h-56 overflow-hidden rounded-2xl bg-gradient-to-br from-slate-100 to-slate-200 dark:from-slate-800 dark:to-slate-900">
                <div className="absolute inset-0 [background-image:linear-gradient(oklch(0_0_0/0.04)_1px,transparent_1px),linear-gradient(90deg,oklch(0_0_0/0.04)_1px,transparent_1px)] [background-size:28px_28px]" />
                <svg className="absolute inset-0 size-full" viewBox="0 0 400 240" fill="none" aria-hidden>
                  <path
                    d="M30 190 C90 170, 110 120, 170 110 S 280 90, 340 60"
                    stroke="oklch(0.5 0.23 262.9)"
                    strokeWidth="2.5"
                    strokeDasharray="6 6"
                    strokeLinecap="round"
                  />
                </svg>
                {[
                  { left: "8%", top: "78%", label: "AEF 4821" },
                  { left: "42%", top: "45%", label: "AEG 1177" },
                  { left: "80%", top: "22%", label: "AFD 5555" },
                ].map((p) => (
                  <div key={p.label} className="absolute" style={{ left: p.left, top: p.top }}>
                    <span className="relative flex size-3">
                      <span className="absolute inline-flex size-full animate-ping rounded-full bg-primary opacity-40" />
                      <span className="relative inline-flex size-3 rounded-full border-2 border-white bg-primary shadow-sm" />
                    </span>
                    <span className="absolute -top-5 left-3 whitespace-nowrap rounded-md bg-white/90 px-1.5 py-0.5 text-[10px] font-semibold shadow-sm dark:bg-slate-900/90">
                      {p.label}
                    </span>
                  </div>
                ))}
              </div>
              <div className="mt-4 grid grid-cols-3 gap-3 text-center">
                {[
                  ["142", "vehicles online"],
                  ["18 km/h", "avg speed"],
                  ["0", "alarms pending"],
                ].map(([v, l]) => (
                  <div key={l} className="rounded-xl bg-muted/60 px-2 py-2.5">
                    <div className="text-sm font-bold">{v}</div>
                    <div className="text-[10px] text-muted-foreground">{l}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Stats strip ────────────────────────────────────────── */}
      <section className="border-y border-border/60 bg-card/60">
        <div className="mx-auto grid max-w-6xl grid-cols-2 gap-6 px-6 py-10 sm:grid-cols-4">
          {stats.map((s) => (
            <div key={s.label} className="text-center">
              <div className="text-3xl font-bold tracking-tight text-primary">{s.value}</div>
              <div className="mt-1 text-xs text-muted-foreground">{s.label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* ── B2B model ──────────────────────────────────────────── */}
      <section id="model" className="mx-auto max-w-6xl px-6 py-20">
        <div className="grid items-center gap-12 lg:grid-cols-2">
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest text-primary">
              The B2B model
            </p>
            <h2 className="mt-3 text-balance text-3xl font-bold tracking-tight">
              Fleet operations as a service — not another dashboard to babysit
            </h2>
            <p className="mt-4 max-w-lg leading-relaxed text-muted-foreground">
              Your organisation keeps exactly one Transport Manager as the point of
              contact. We operate the platform, the devices, the monitoring room and
              the partner network — you pay a single monthly bill plus labour.
            </p>
          </div>
          <ul className="space-y-3.5">
            {[
              { icon: Radio, text: "We provision, install and configure every tracker and SIM." },
              { icon: Activity, text: "Our operators watch alarms, geofences and SOS events 24/7." },
              { icon: Fuel, text: "Fuel coupons at partner garages — spend visible per vehicle." },
              { icon: BadgeCheck, text: "Insurance policies issued via our broker network and lapse-monitored." },
              { icon: Wrench, text: "Repairs and servicing scheduled, approved and logged in-platform." },
              { icon: Building2, text: "Monthly itemised invoice replaces an entire department's payroll." },
            ].map((item) => (
              <li key={item.text} className="flex items-start gap-3.5 rounded-xl border border-border bg-card p-4 shadow-card">
                <span className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                  <item.icon className="size-4" />
                </span>
                <span className="text-sm leading-relaxed">{item.text}</span>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* ── Services grid ──────────────────────────────────────── */}
      <section id="services" className="border-y border-border/60 bg-muted/30">
        <div className="mx-auto max-w-6xl px-6 py-20">
          <div className="mb-12 max-w-2xl">
            <p className="text-xs font-semibold uppercase tracking-widest text-primary">Everything included</p>
            <h2 className="mt-3 text-3xl font-bold tracking-tight">One platform, every operation</h2>
            <p className="mt-3 text-muted-foreground">
              From a single SOS button to a full transport department — every module
              ships on day one.
            </p>
          </div>
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {services.map((s) => (
              <div
                key={s.title}
                className="group rounded-2xl border border-border bg-card p-5 shadow-card transition-shadow hover:shadow-card-hover"
              >
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

      {/* ── Hardware ───────────────────────────────────────────── */}
      <section id="hardware" className="mx-auto max-w-6xl px-6 py-20">
        <div className="mb-12 max-w-2xl">
          <p className="text-xs font-semibold uppercase tracking-widest text-primary">Hardware freedom</p>
          <h2 className="mt-3 text-3xl font-bold tracking-tight">Bring the trackers you already own</h2>
          <p className="mt-3 text-muted-foreground">
            Ten wire protocols decoded natively on our own ingest tier — point any
            compatible device at our listeners and it just works.
          </p>
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {hardware.map((h) => (
            <div key={h.name} className="rounded-2xl border border-border bg-card p-4 shadow-card">
              <div className="flex items-center justify-between">
                <span className="text-sm font-semibold">{h.name}</span>
                <span className="rounded-full bg-success/10 px-2 py-0.5 text-[10px] font-semibold text-success">
                  supported
                </span>
              </div>
              <p className="mt-1 text-xs text-muted-foreground">{h.note}</p>
            </div>
          ))}
        </div>
        <p className="mt-6 text-xs text-muted-foreground">
          Additional protocols — Suntech STB, Meiligao, Gosafe, Cellocator, Megastek — are
          on the integration roadmap and land in the same pipeline.
        </p>
      </section>

      {/* ── Packages & pricing ─────────────────────────────────── */}
      <section id="pricing" className="border-y border-border/60 bg-muted/30">
        <div className="mx-auto max-w-6xl px-6 py-20">
          <div className="mb-12 max-w-2xl">
            <p className="text-xs font-semibold uppercase tracking-widest text-primary">Fix & supply</p>
            <h2 className="mt-3 text-3xl font-bold tracking-tight">Straightforward, per-vehicle pricing</h2>
            <p className="mt-3 text-muted-foreground">
              Every service includes the hardware and installation — fix and supply,
              no surprises. Each option is charged independently of the base tracker.
            </p>
          </div>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
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
                <span className="mt-4 inline-flex w-fit rounded-full bg-success/10 px-2 py-0.5 text-[10px] font-semibold text-success">
                  fix & supply
                </span>
              </div>
            ))}
          </div>
          <p className="mt-6 text-xs text-muted-foreground">
            Volume and fleet discounts available — add-ons can be fitted to the same
            visit as your tracker install.
          </p>
          <div className="mt-8">
            <a
              href="#apply"
              className="inline-flex items-center gap-2 rounded-xl bg-primary px-5 py-3 text-sm font-semibold text-primary-foreground shadow-card transition-colors hover:bg-primary/90"
            >
              Apply now <ArrowRight className="size-4" />
            </a>
          </div>
        </div>
      </section>

      {/* ── Apply ──────────────────────────────────────────────── */}
      <section id="apply" className="mx-auto max-w-6xl px-6 py-20">
        <div className="grid items-start gap-10 lg:grid-cols-[0.9fr_1.1fr]">
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest text-primary">Get fitted</p>
            <h2 className="mt-3 text-3xl font-bold tracking-tight">Apply for tracking today</h2>
            <p className="mt-4 max-w-md leading-relaxed text-muted-foreground">
              Pick your services, pay with EcoCash, OneMoney, InnBucks or bank
              transfer, and we schedule your installation. Every option is
              fix &amp; supply — hardware and fitting included.
            </p>
            <ul className="mt-6 space-y-3 text-sm">
              {[
                "Instant mobile-money approval on your phone",
                "Manual bank & direct transfer options with clear instructions",
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

      {/* ── Asset types ────────────────────────────────────────── */}
      <section id="assets" className="border-y border-border/60 bg-muted/30">
        <div className="mx-auto max-w-6xl px-6 py-20">
          <div className="grid items-center gap-10 lg:grid-cols-[0.9fr_1.1fr]">
            <div>
              <p className="text-xs font-semibold uppercase tracking-widest text-primary">Beyond vehicles</p>
              <h2 className="mt-3 text-3xl font-bold tracking-tight">
                If it moves — or might get moved — track it
              </h2>
              <p className="mt-4 max-w-md leading-relaxed text-muted-foreground">
                The same platform watches parcels in transit, laptops in the field,
                stock between warehouses, pets, children and luggage — each with
                category-appropriate alerts and geofences.
              </p>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
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
        </div>
      </section>

      {/* ── Security strip ─────────────────────────────────────── */}
      <section className="mx-auto max-w-6xl px-6 py-16">
        <div className="grid gap-6 rounded-3xl border border-border bg-card p-8 shadow-card sm:grid-cols-3">
          {[
            { icon: ShieldCheck, title: "Tenant isolation", body: "Row-level security on every table — clients see only their fleet." },
            { icon: BadgeCheck, title: "Hashed API keys", body: "Bearer keys stored as hashes, never plaintext; scoped per tenant." },
            { icon: Activity, title: "Audit trail", body: "Every command, login and config change logged against a user." },
          ].map((s) => (
            <div key={s.title} className="flex items-start gap-4">
              <span className="mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-lg bg-success/10 text-success">
                <s.icon className="size-4" />
              </span>
              <div>
                <h3 className="text-sm font-semibold">{s.title}</h3>
                <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{s.body}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ── CTA ────────────────────────────────────────────────── */}
      <section className="mx-auto max-w-6xl px-6 pb-24">
        <div className="relative overflow-hidden rounded-3xl bg-primary px-8 py-14 text-center shadow-float sm:px-14">
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0 bg-[radial-gradient(70%_120%_at_50%_0%,oklch(1_0_0/0.12),transparent_60%)]"
          />
          <h2 className="text-balance text-3xl font-bold tracking-tight text-white">
            Ready to retire your transport department?
          </h2>
          <p className="mx-auto mt-4 max-w-xl text-balance text-white/80">
            Keep your Transport Manager. We&apos;ll handle the trackers, the monitoring,
            the fuel, the insurance and the repairs.
          </p>
          <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
            <Link
              href="/register"
              className="inline-flex items-center gap-2 rounded-xl bg-white px-6 py-3 text-sm font-semibold text-primary transition-transform hover:bg-white/90 active:scale-[0.98]"
            >
              Get started <ArrowRight className="size-4" />
            </Link>
            <Link
              href="/login"
              className="inline-flex items-center gap-2 rounded-xl border border-white/40 px-6 py-3 text-sm font-semibold text-white transition-colors hover:bg-white/10"
            >
              Sign in to console
            </Link>
          </div>
        </div>
      </section>

      {/* ── Footer ─────────────────────────────────────────────── */}
      <footer className="border-t border-border/60">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 px-6 py-8 sm:flex-row">
          <div className="flex items-center gap-2.5">
            <span className="flex size-7 items-center justify-center rounded-lg bg-primary">
              <LocateFixed className="size-4 text-white" />
            </span>
            <span className="text-sm font-semibold">AeroTrack Pro</span>
          </div>
          <p className="text-xs text-muted-foreground">
            GPS tracking & managed fleet services · Node.js · Supabase · Multi-protocol ingest
          </p>
        </div>
      </footer>
    </div>
  );
}

