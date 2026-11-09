import type { Metadata } from "next";
import Link from "next/link";
import {
  ArrowLeft,
  ArrowRight,
  BadgeCheck,
  BatteryCharging,
  Car,
  Cpu,
  LocateFixed,
  Magnet,
  Package,
  Plug,
  ScanLine,
  Sun,
  Thermometer,
  User,
  Waves,
  Zap,
  type LucideIcon,
} from "lucide-react";
import {
  DEVICE_MODELS,
  type DeviceCapabilities,
  type DeviceCategory,
  type DeviceModel,
  type TcpProtocolKey,
} from "@aerotrack/protocols";
import { SiteHeader } from "@/components/marketing/site-header";

export const metadata: Metadata = {
  title: "Supported Devices — Every Tracker That Works on AeroTrack",
  description:
    "All GPS tracker models supported on AeroTrack across 10 wire protocols — SinoTrack, Teltonika, Jimi/Concox, Coban, Queclink, Meitrack, WanWay and more. Bring your own hardware at $3.50 per device per month.",
};

/** Traccar listener ports — where each wire protocol's devices report. */
const PROTOCOL_INFO: Record<TcpProtocolKey, { label: string; port: number; blurb: string }> = {
  h02:        { label: "H02",        port: 5013, blurb: "ASCII *HQ frames — SinoTrack, TKStar and Cantrack dialects." },
  gt06:       { label: "GT06",       port: 5023, blurb: "The most-cloned tracker architecture — Jimi, Concox, WanWay, Seeworld and dozens of re-badges." },
  gps103:     { label: "GPS103",     port: 5001, blurb: "The original Coban/Xexun SMS-era protocol and its clone family." },
  teltonika:  { label: "Teltonika Codec 8/8E", port: 5027, blurb: "IMEI login + AVL binary frames — the enterprise fleet standard." },
  jt808:      { label: "JT/T 808",   port: 5015, blurb: "Chinese government-standard terminal protocol (2013 & 2019 revisions)." },
  eelink:     { label: "Eelink",     port: 5064, blurb: "Eelink/TK-series binary protocol with extended sensor support." },
  queclink:   { label: "Queclink @Track", port: 5004, blurb: "@Track ASCII protocol — GL/GV family and the huge OEM clone base." },
  meitrack:   { label: "Meitrack",   port: 5020, blurb: "Meitrack binary + ASCII — T-series rugged and fleet terminals." },
  topflytech: { label: "Topflytech", port: 5049, blurb: "TLW/T-family asset and solar tracker protocol." },
  vt200:      { label: "VT200",      port: 5045, blurb: "ThinkRace VT-series — OBD and 4G vehicle terminals." },
  watch:      { label: "Watch",      port: 5093, blurb: "Kids/pet GPS watches — TKStar, Wonlex and similar wearables." },
};

const CATEGORY_META: Record<DeviceCategory, { label: string; icon: LucideIcon }> = {
  vehicle:  { label: "Vehicle",  icon: Car },
  asset:    { label: "Asset",    icon: Package },
  personal: { label: "Personal", icon: User },
  obd:      { label: "OBD-II",   icon: Plug },
};

/** Ordered capability → display chip. */
function capabilityChips(c: DeviceCapabilities): { icon: LucideIcon; label: string }[] {
  const out: { icon: LucideIcon; label: string }[] = [];
  if (c.engineCut)      out.push({ icon: Zap,            label: "Engine cut-off" });
  if (c.sos)            out.push({ icon: BadgeCheck,     label: "SOS" });
  if (c.voiceMonitor)   out.push({ icon: Waves,          label: "Voice monitor" });
  if (c.fuelSensor)     out.push({ icon: Thermometer,    label: "Fuel sensor" });
  if (c.obd)            out.push({ icon: Plug,           label: "OBD diagnostics" });
  if (c.drivingBehavior)out.push({ icon: ScanLine,       label: "Driving behaviour" });
  if (c.gSensor)        out.push({ icon: ScanLine,       label: "Crash/G-sensor" });
  if (c.rfid)           out.push({ icon: ScanLine,       label: "RFID driver ID" });
  if (c.solar)          out.push({ icon: Sun,            label: "Solar" });
  if (c.magneticMount)  out.push({ icon: Magnet,         label: "Magnetic mount" });
  if (c.antiJamming)    out.push({ icon: BadgeCheck,     label: "Anti-jamming" });
  if (c.ota)            out.push({ icon: Cpu,            label: "OTA updates" });
  if (c.internalBatteryDays)
    out.push({ icon: BatteryCharging, label: `${c.internalBatteryDays}-day battery` });
  return out;
}

const PROTOCOL_ORDER: TcpProtocolKey[] = [
  "h02", "gt06", "teltonika", "gps103", "jt808", "watch",
  "queclink", "eelink", "meitrack", "topflytech", "vt200",
];

function DeviceCard({ m }: { m: DeviceModel }) {
  const cat = CATEGORY_META[m.category];
  const chips = capabilityChips(m.capabilities);
  return (
    <div className="flex flex-col overflow-hidden rounded-2xl border border-border bg-card shadow-card transition-shadow hover:shadow-card-hover">
      <div className="relative h-40 bg-slate-100 dark:bg-slate-800">
        <img
          src={`https://picsum.photos/seed/device-${m.id}/640/400`}
          alt={`${m.vendor} ${m.model}`}
          className="absolute inset-0 size-full object-cover"
        />
      </div>
      <div className="flex flex-1 flex-col p-5">
        <div className="flex items-center justify-between gap-3">
          <h3 className="text-sm font-bold">
            {m.vendor}{" "}
            <span className="font-mono text-primary">{m.model}</span>
          </h3>
          <span className="inline-flex shrink-0 items-center gap-1.5 rounded-full bg-muted px-2.5 py-1 text-[10.5px] font-semibold">
            <cat.icon className="size-3 text-primary" /> {cat.label}
          </span>
        </div>
        <p className="mt-2 flex-1 text-[13px] leading-relaxed text-muted-foreground">
          {m.description}
        </p>
        <div className="mt-3 flex flex-wrap gap-1.5">
          {m.capabilities.network.map((n) => (
            <span key={n} className="rounded-md bg-primary/10 px-1.5 py-0.5 text-[10px] font-bold text-primary">
              {n}
            </span>
          ))}
          {chips.map((chip) => (
            <span
              key={chip.label}
              className="inline-flex items-center gap-1 rounded-md border border-border/70 px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground"
            >
              <chip.icon className="size-3" /> {chip.label}
            </span>
          ))}
        </div>
        <Link
          href="/register"
          className="mt-4 inline-flex w-fit items-center gap-1.5 rounded-lg bg-primary px-4 py-2 text-[13px] font-semibold text-primary-foreground transition-colors hover:bg-primary/90"
        >
          Onboard this device <ArrowRight className="size-3.5" />
        </Link>
      </div>
    </div>
  );
}

export default function SupportedDevicesPage() {
  const grouped = PROTOCOL_ORDER.map((p) => ({
    key: p,
    info: PROTOCOL_INFO[p],
    models: DEVICE_MODELS.filter((m) => m.protocol === p),
  })).filter((g) => g.models.length > 0);

  const totalModels = DEVICE_MODELS.length;
  const vendors = new Set(DEVICE_MODELS.map((m) => m.vendor)).size;

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
            Hardware
          </p>
          <h1 className="mt-3 max-w-2xl text-3xl font-bold tracking-tight sm:text-4xl">
            Supported devices
          </h1>
          <p className="mt-4 max-w-2xl leading-relaxed text-muted-foreground">
            Every tracker model verified on the AeroTrack platform, grouped by
            the wire protocol it speaks. Already-own one of these — or a
            compatible clone? Point it at the listener port and it reports
            straight in.
          </p>
          <div className="mt-6 flex flex-wrap gap-2.5">
            {[
              `${totalModels} verified models`,
              `${vendors} vendors`,
              "10 wire protocols",
              "$3.50 / device / month",
            ].map((s) => (
              <span
                key={s}
                className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-3.5 py-1.5 text-[12px] font-semibold shadow-card"
              >
                <BadgeCheck className="size-3.5 text-success" /> {s}
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* ── Protocol groups ── */}
      <main className="mx-auto max-w-6xl px-5 py-12 sm:px-6">
        {grouped.map((g) => (
          <section key={g.key} className="mb-12 last:mb-0">
            <div className="mb-5 flex flex-wrap items-baseline justify-between gap-2 border-b border-border/60 pb-3">
              <div>
                <h2 className="text-lg font-bold tracking-tight">
                  {g.info.label}
                  <span className="ml-3 font-mono text-[13px] font-semibold text-primary">
                    :{g.info.port}
                  </span>
                </h2>
                <p className="mt-1 max-w-2xl text-[13px] text-muted-foreground">
                  {g.info.blurb}
                </p>
              </div>
              <span className="text-xs font-medium text-muted-foreground">
                {g.models.length} {g.models.length === 1 ? "model" : "models"}
              </span>
            </div>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {g.models.map((m) => (
                <DeviceCard key={m.id} m={m} />
              ))}
            </div>
          </section>
        ))}

        {/* ── not listed? ── */}
        <section className="mt-14 rounded-2xl border border-border bg-card p-6 text-center shadow-card sm:p-8">
          <h2 className="text-xl font-bold tracking-tight">Don&rsquo;t see your model?</h2>
          <p className="mx-auto mt-3 max-w-2xl text-[13.5px] leading-relaxed text-muted-foreground">
            Most re-badged and clone hardware speaks one of the protocols above —
            if the label differs but the sticker model family matches, it very
            likely works. Send us the model number and we&rsquo;ll confirm before
            you spend anything.
          </p>
          <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
            <Link
              href="/register"
              className="inline-flex items-center gap-2 rounded-xl bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground shadow-card transition-colors hover:bg-primary/90"
            >
              Onboard a device <ArrowRight className="size-4" />
            </Link>
            <Link
              href="/supported-vehicles"
              className="inline-flex items-center gap-2 rounded-xl border border-border px-6 py-3 text-sm font-semibold transition-colors hover:bg-muted"
            >
              Check supported vehicles
            </Link>
          </div>
        </section>

        {/* ── installer BYOD ── */}
        <section className="mt-8 flex flex-col items-center justify-between gap-5 rounded-2xl border border-primary/40 bg-primary/5 p-6 sm:flex-row sm:p-7">
          <div className="text-center sm:text-left">
            <p className="text-[11px] font-semibold uppercase tracking-widest text-primary">
              Installers &amp; resellers
            </p>
            <h3 className="mt-1.5 text-lg font-bold tracking-tight">
              Everything on this page runs at $3.50 / device / month
            </h3>
            <p className="mt-1.5 max-w-xl text-[13px] leading-relaxed text-muted-foreground">
              Fit whatever hardware suits your customers — every model above
              onboarded to your own dashboard, alarms and reports.
            </p>
          </div>
          <Link
            href="/register"
            className="inline-flex shrink-0 items-center gap-2 rounded-xl bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground shadow-card transition-colors hover:bg-primary/90"
          >
            Register as installer <ArrowRight className="size-4" />
          </Link>
        </section>
      </main>

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
            <Link href="/apply" className="hover:text-foreground">Apply</Link>
          </nav>
          <p className="text-xs text-muted-foreground">
            GPS tracking &amp; managed fleet services
          </p>
        </div>
      </footer>
    </div>
  );
}
