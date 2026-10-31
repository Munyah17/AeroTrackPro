"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowRight, BadgeCheck } from "lucide-react";
import { cn } from "@/lib/utils";

const FEATURED_DEVICES = [
  {
    name: "SinoTrack",
    model: "ST-901A",
    note: "Our flagship fit — remote cut-off, SOS and ACC detection over the H02 protocol.",
    image: "https://picsum.photos/seed/device-sinotrack/640/400",
  },
  {
    name: "Teltonika",
    model: "FMB920",
    note: "Enterprise-grade CAN reading and telemetry via Codec 8 — the fleet favourite.",
    image: "https://picsum.photos/seed/device-teltonika/640/400",
  },
  {
    name: "Concox · Jimi",
    model: "GT06 Family",
    note: "CAT1 units for cars, kombis and bikes — affordable tracking that just works.",
    image: "https://picsum.photos/seed/device-gt06/640/400",
  },
];

const MORE_PROTOCOLS = [
  "Coban · Xexun — TK103 & GPS103",
  "JT808 terminals — J16 4G",
  "Queclink · Meitrack · Eelink",
  "OBD plug-and-play — VT200, FMB001",
  "TKStar · Cantrack — H02 dialects",
  "Roadmap: Suntech, Meiligao, Gosafe, Cellocator",
];

export function DevicesSection() {
  const [expanded, setExpanded] = useState(false);

  return (
    <section id="devices" className="mx-auto max-w-6xl px-6 py-16">
      <div className="mx-auto mb-12 max-w-2xl text-center">
        <p className="text-xs font-semibold uppercase tracking-widest text-primary">Hardware freedom</p>
        <h2 className="mt-3 text-3xl font-bold tracking-tight">Bring the trackers you already own</h2>
        <p className="mt-3 text-muted-foreground">
          Ten wire protocols decoded natively on our ingest tier — point a compatible device at our listeners and it just works.
        </p>
      </div>

      <div className="grid gap-5 sm:grid-cols-3">
        {FEATURED_DEVICES.map((d) => (
          <div key={d.name} className="overflow-hidden rounded-2xl border border-border bg-card shadow-card transition-shadow hover:shadow-card-hover">
            <div className="relative h-40 bg-slate-100 dark:bg-slate-800">
              <img src={d.image} alt={`${d.name} ${d.model}`} className="absolute inset-0 size-full object-cover" />
            </div>
            <div className="p-5">
              <div className="flex items-center justify-between">
                <span className="text-sm font-bold">
                  {d.name} <span className="font-mono text-primary">{d.model}</span>
                </span>
                <span className="rounded-full bg-success/10 px-2 py-0.5 text-[10px] font-semibold text-success">
                  supported
                </span>
              </div>
              <p className="mt-2 text-[13px] leading-relaxed text-muted-foreground">{d.note}</p>
              <Link
                href="/register"
                className="mt-4 inline-flex items-center gap-1.5 rounded-lg bg-primary px-4 py-2 text-[13px] font-semibold text-primary-foreground transition-colors hover:bg-primary/90"
              >
                Get Started Now <ArrowRight className="size-3.5" />
              </Link>
            </div>
          </div>
        ))}
      </div>

      <div className="mt-7 text-center">
        <button
          onClick={() => setExpanded((e) => !e)}
          className="inline-flex items-center gap-1.5 text-sm font-semibold text-primary hover:underline"
        >
          {expanded ? "Show less" : "View all supported devices"}
          <ArrowRight className={cn("size-4 transition-transform", expanded && "rotate-90")} />
        </button>
        {expanded && (
          <ul className="mx-auto mt-5 grid max-w-3xl gap-2.5 sm:grid-cols-2">
            {MORE_PROTOCOLS.map((p) => (
              <li key={p} className="flex items-center gap-2.5 rounded-xl border border-border bg-card px-4 py-3 text-left text-[13px]">
                <BadgeCheck className="size-4 shrink-0 text-success" />
                {p}
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}
