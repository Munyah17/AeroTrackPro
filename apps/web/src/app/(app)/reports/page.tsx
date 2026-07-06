"use client";

import { useState } from "react";
import {
  Activity,
  CalendarRange,
  Clock,
  Download,
  FileBarChart2,
  Fuel,
  Gauge,
  Hexagon,
  Route,
  ShieldCheck,
  Thermometer,
  Wrench,
} from "lucide-react";
import { toast } from "sonner";
import {
  Area,
  AreaChart,
  ResponsiveContainer,
  Tooltip as ChartTooltip,
  XAxis,
  YAxis,
} from "recharts";
import { monthlyDistance } from "@aerotrack/shared";
import { Button } from "@/components/ui/button";
import { PageContainer, PageHeader, Panel } from "@/components/shared/page";
import { cn } from "@/lib/utils";

const REPORT_TYPES = [
  { id: "summary", label: "Summary", icon: FileBarChart2 },
  { id: "trips", label: "Trip Report", icon: Route },
  { id: "stops", label: "Stop Report", icon: Clock },
  { id: "idle", label: "Idle Report", icon: Activity },
  { id: "speeding", label: "Speeding Report", icon: Gauge },
  { id: "geofence", label: "Geofence Report", icon: Hexagon },
  { id: "fuel", label: "Fuel Report", icon: Fuel },
  { id: "maintenance", label: "Maintenance Report", icon: Wrench },
  { id: "insurance", label: "Insurance Report", icon: ShieldCheck },
  { id: "temperature", label: "Temperature Report", icon: Thermometer },
];

const SUMMARY = [
  { label: "Total Distance", value: "12,456 km" },
  { label: "Total Trips", value: "124" },
  { label: "Total Fuel Used", value: "1,234 L" },
  { label: "Total Idle Time", value: "45h 30m" },
];

export default function ReportsPage() {
  const [type, setType] = useState("summary");
  const active = REPORT_TYPES.find((r) => r.id === type)!;

  return (
    <PageContainer>
      <PageHeader
        title="Reports"
        subtitle="Generate detailed reports on trips, distance, fuel and more"
        actions={
          <>
            <Button variant="outline" className="gap-2 rounded-xl">
              <CalendarRange className="size-4" /> May 1 – May 31, 2026
            </Button>
            <Button
              className="gap-2 rounded-xl shadow-card"
              onClick={() => toast.success(`${active.label} exported`, { description: "aerotrack-report.pdf saved to downloads" })}
            >
              <Download className="size-4" /> Export
            </Button>
          </>
        }
      />

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-4">
        {/* Type picker */}
        <Panel className="h-fit p-2.5">
          <div className="px-2.5 pb-2 pt-1.5 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
            Report Type
          </div>
          {REPORT_TYPES.map((r) => (
            <button
              key={r.id}
              onClick={() => setType(r.id)}
              className={cn(
                "flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-left text-[13px] font-medium transition-colors",
                type === r.id ? "bg-primary/10 text-primary" : "text-foreground/80 hover:bg-accent/70",
              )}
            >
              <r.icon className="size-4" /> {r.label}
            </button>
          ))}
          <div className="mt-2 border-t border-border/60 p-2.5">
            <Button
              variant="outline"
              size="sm"
              className="w-full rounded-xl"
              onClick={() => toast.info("Scheduled reports run daily/weekly/monthly and email a PDF")}
            >
              Schedule this report
            </Button>
          </div>
        </Panel>

        {/* Body */}
        <div className="flex flex-col gap-4 lg:col-span-3">
          <div className="grid grid-cols-2 gap-4 xl:grid-cols-4">
            {SUMMARY.map((s) => (
              <Panel key={s.label} className="p-4">
                <div className="text-[12px] text-muted-foreground">{s.label}</div>
                <div className="mt-1 text-xl font-bold tabular-nums">{s.value}</div>
              </Panel>
            ))}
          </div>

          <Panel className="p-5">
            <h3 className="text-[15px] font-semibold">Distance (km) — {active.label}</h3>
            <div className="mt-4 h-72">
              <ResponsiveContainer>
                <AreaChart data={monthlyDistance}>
                  <defs>
                    <linearGradient id="repFill" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="var(--chart-1)" stopOpacity={0.22} />
                      <stop offset="100%" stopColor="var(--chart-1)" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <XAxis dataKey="date" axisLine={false} tickLine={false} fontSize={10.5} interval={5} stroke="var(--muted-foreground)" />
                  <YAxis axisLine={false} tickLine={false} fontSize={11} width={40} stroke="var(--muted-foreground)" />
                  <ChartTooltip
                    contentStyle={{ borderRadius: 12, border: "1px solid var(--border)", background: "var(--card)", fontSize: 12 }}
                  />
                  <Area
                    type="monotone"
                    dataKey="km"
                    stroke="var(--chart-1)"
                    strokeWidth={2.5}
                    fill="url(#repFill)"
                    animationDuration={800}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </Panel>
        </div>
      </div>
    </PageContainer>
  );
}
