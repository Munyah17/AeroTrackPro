"use client";

import { useState } from "react";
import {
  Activity,
  Clock,
  Download,
  FileBarChart2,
  FileText,
  Fuel,
  Gauge,
  Hexagon,
  Route,
  ShieldCheck,
  Table2,
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
import { monthlyDistance, vehicles, trips } from "@aerotrack/shared";
import { downloadCsv, downloadExcel, printPdf, type ExportCell } from "@/lib/export";
import { Button } from "@/components/ui/button";
import { DateRangePicker } from "@/components/ui/date-picker";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { PageContainer, PageHeader, Panel } from "@/components/shared/page";
import { shortDateTime, km } from "@/lib/format";
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
  const [from, setFrom] = useState<Date>(new Date(2026, 4, 1));
  const [to, setTo] = useState<Date>(new Date(2026, 4, 31));
  const [vehicleId, setVehicleId] = useState<string>("all");

  const active = REPORT_TYPES.find((r) => r.id === type)!;

  /** Dataset for the currently selected report type. */
  const reportDataset = (): { headers: string[]; rows: ExportCell[][] } => {
    const inScope = vehicleId === "all" ? trips : trips.filter((t) => t.vehicleId === vehicleId);
    if (type === "trips" || type === "stops" || type === "idle" || type === "speeding") {
      return {
        headers: ["Start", "End", "Vehicle", "Distance (km)", "Duration (min)", "Avg Speed (km/h)", "Max Speed (km/h)"],
        rows: inScope.map((t) => [
          shortDateTime(t.startAt),
          shortDateTime(t.endAt),
          vehicles.find((v) => v.id === t.vehicleId)?.plate ?? t.vehicleId,
          t.distanceKm,
          t.durationMin,
          t.avgSpeedKmh,
          t.maxSpeedKmh,
        ]),
      };
    }
    return {
      headers: ["Date", "Distance (km)"],
      rows: monthlyDistance.map((d) => [d.date, d.km]),
    };
  };

  const exportReport = (format: "pdf" | "excel" | "csv") => {
    const { headers, rows } = reportDataset();
    const filename = `aerotrack-${type}-report-${from.toISOString().slice(0, 10)}_${to.toISOString().slice(0, 10)}`;
    const subtitle = `${active.label} · ${from.toLocaleDateString()} – ${to.toLocaleDateString()} · ${
      vehicleId === "all" ? "All vehicles" : vehicles.find((v) => v.id === vehicleId)?.plate
    }`;

    if (format === "csv") downloadCsv(filename, headers, rows);
    else if (format === "excel") downloadExcel(filename, headers, rows, active.label);
    else printPdf(active.label, headers, rows, { subtitle });

    toast.success(
      format === "pdf"
        ? `${active.label} opened for printing — choose "Save as PDF"`
        : `${active.label} exported (${rows.length} rows)`,
    );
  };

  return (
    <PageContainer>
      <PageHeader
        title="Reports"
        subtitle="Generate detailed reports on trips, distance, fuel and more"
        actions={
          <div className="flex flex-wrap gap-2">
            <Select value={vehicleId} onValueChange={(v) => setVehicleId(v ?? "all")}>
              <SelectTrigger className="w-48 rounded-xl bg-card">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="rounded-xl">
                <SelectItem value="all">All vehicles</SelectItem>
                {vehicles.slice(0, 12).map((v) => (
                  <SelectItem key={v.id} value={v.id}>{v.plate}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <DateRangePicker
              from={from}
              to={to}
              onChange={(newFrom, newTo) => {
                if (newFrom) setFrom(newFrom);
                if (newTo) setTo(newTo);
              }}
              className="w-64"
            />
            <DropdownMenu>
              <DropdownMenuTrigger
                render={
                  <Button className="gap-2 rounded-xl shadow-card">
                    <Download className="size-4" /> Export
                  </Button>
                }
              />
              <DropdownMenuContent align="end" className="w-40 rounded-xl">
                <DropdownMenuItem onClick={() => exportReport("pdf")} className="gap-2 rounded-lg">
                  <FileText className="size-4" /> PDF
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => exportReport("excel")} className="gap-2 rounded-lg">
                  <Table2 className="size-4" /> Excel
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => exportReport("csv")} className="gap-2 rounded-lg">
                  <FileText className="size-4" /> CSV
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
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

          {type === "trips" && (
            <Panel className="overflow-hidden">
              <div className="flex items-center justify-between border-b border-border/60 px-5 py-3.5">
                <h3 className="text-[14px] font-semibold">Trip Details</h3>
                <span className="text-xs text-muted-foreground">{trips.length} trips in period</span>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="border-b border-border/60 bg-accent/40 text-[11px] font-medium text-muted-foreground">
                    <tr>
                      <th className="px-4 py-2.5 text-left">Start</th>
                      <th className="px-4 py-2.5 text-left">End</th>
                      <th className="px-4 py-2.5 text-left">Vehicle</th>
                      <th className="px-4 py-2.5 text-right">Distance</th>
                      <th className="px-4 py-2.5 text-right">Duration</th>
                      <th className="px-4 py-2.5 text-right">Avg Speed</th>
                      <th className="px-4 py-2.5 text-right">Max Speed</th>
                    </tr>
                  </thead>
                  <tbody className="text-sm">
                    {trips.slice(0, 12).map((trip) => {
                      const vehicle = vehicles.find((v) => v.id === trip.vehicleId);
                      return (
                        <tr key={trip.id} className="border-b border-border/40 transition-colors hover:bg-accent/60">
                          <td className="px-4 py-2.5 text-xs text-muted-foreground">{shortDateTime(trip.startAt)}</td>
                          <td className="px-4 py-2.5 text-xs text-muted-foreground">{shortDateTime(trip.endAt)}</td>
                          <td className="px-4 py-2.5 font-medium">{vehicle?.plate}</td>
                          <td className="px-4 py-2.5 text-right font-medium tabular-nums">{km(trip.distanceKm)}</td>
                          <td className="px-4 py-2.5 text-right tabular-nums text-muted-foreground">{trip.durationMin}m</td>
                          <td className="px-4 py-2.5 text-right tabular-nums">{trip.avgSpeedKmh} km/h</td>
                          <td className="px-4 py-2.5 text-right tabular-nums font-semibold">{trip.maxSpeedKmh} km/h</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </Panel>
          )}
        </div>
      </div>
    </PageContainer>
  );
}
