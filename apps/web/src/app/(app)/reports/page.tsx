"use client";

import { useMemo, useState } from "react";
import {
  Activity,
  Clock,
  Download,
  FileBarChart2,
  FileText,
  Fuel,
  Gauge,
  Hexagon,
  KeyRound,
  MapPin,
  Route,
  ShieldCheck,
  Table2,
  Thermometer,
  Timer,
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
import {
  useAlerts,
  useDriverEvents,
  useDrivers,
  useFuelRecords,
  useGeofences,
  useIgnitionEvents,
  useInsurancePolicies,
  useMaintenanceItems,
  useTenantTable,
  useTrips,
} from "@/hooks/use-live-data";
import { findReport } from "@/lib/reports/catalog";
import { downloadCsv, downloadExcel, printPdf, type ExportCell } from "@/lib/export";
import { Button } from "@/components/ui/button";
import { DateRangePicker } from "@/components/ui/date-picker";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { PageContainer, PageHeader, Panel } from "@/components/shared/page";
import { shortDateTime } from "@/lib/format";
import { cn } from "@/lib/utils";

/* `def` maps the picker entry onto a catalog report builder; entries without
   one are computed inline below. */
const REPORT_TYPES: { id: string; label: string; icon: typeof Route; def?: string }[] = [
  { id: "summary", label: "Summary", icon: FileBarChart2 },
  { id: "trips", label: "Trip Report", icon: Route, def: "trips" },
  { id: "stops", label: "Stop Report", icon: Clock, def: "stops" },
  { id: "parking", label: "Parking Report", icon: MapPin, def: "parking" },
  { id: "ignition", label: "Ignition Report", icon: KeyRound, def: "ignition-events" },
  { id: "engine", label: "Engine Hours", icon: Timer, def: "engine-hours" },
  { id: "idle", label: "Idle Report", icon: Activity },
  { id: "speeding", label: "Speeding Report", icon: Gauge, def: "speed-violations" },
  { id: "geofence", label: "Geofence Report", icon: Hexagon, def: "geofence-visits" },
  { id: "fuel", label: "Fuel Report", icon: Fuel, def: "fuel-volume" },
  { id: "maintenance", label: "Maintenance Report", icon: Wrench, def: "maintenance-schedule" },
  { id: "insurance", label: "Insurance Report", icon: ShieldCheck, def: "insurance-renewals" },
  { id: "temperature", label: "Temperature Report", icon: Thermometer },
];

const inRange = (iso: string | undefined, from: Date, to: Date) => {
  if (!iso) return false;
  const t = new Date(iso).getTime();
  return t >= from.getTime() && t <= to.getTime();
};

const fmtHours = (mins: number) => {
  if (mins < 60) return `${Math.round(mins)}m`;
  return `${Math.floor(mins / 60)}h ${Math.round(mins % 60)}m`;
};

export default function ReportsPage() {
  const { rows: vehicles } = useTenantTable("vehicles", {
    map: (r) => ({ id: r.id, name: r.name, plate: r.plate, driverId: r.driver_id ?? null, deviceId: r.device_id ?? null }),
    order: "name",
    ascending: true,
  });
  const { rows: deviceRows } = useTenantTable("devices", {
    map: (r) => ({
      deviceId: r.id,
      engineHoursMin: r.engine_hours_min ?? 0,
      engineCut: r.engine_cut ?? false,
      ignition: r.ignition ?? null,
    }),
    limit: 500,
  });
  const { rows: drivers } = useDrivers();
  const { rows: trips } = useTrips();
  const { rows: driverEvents } = useDriverEvents();
  const { rows: ignitionEvents } = useIgnitionEvents();
  const { rows: fuelRecords } = useFuelRecords();
  const { rows: geofences } = useGeofences();
  const { rows: alerts } = useAlerts();
  const { rows: maintenance } = useMaintenanceItems();
  const { rows: policies } = useInsurancePolicies();

  const [type, setType] = useState("summary");
  const [from, setFrom] = useState<Date>(() => {
    const d = new Date();
    d.setDate(d.getDate() - 30);
    return d;
  });
  const [to, setTo] = useState<Date>(() => new Date());
  const [vehicleId, setVehicleId] = useState<string>("all");

  const active = REPORT_TYPES.find((r) => r.id === type)!;
  const scope = vehicleId === "all" ? undefined : new Set([vehicleId]);
  const vehicleName = (id?: string | null) => {
    const v = vehicles.find((x) => x.id === id);
    return v ? `${v.name} (${v.plate})` : "—";
  };
  const driverName = (id?: string | null) => drivers.find((x) => x.id === id)?.name ?? "—";

  /* Catalog input — same datasets the fleet/reports page feeds the builders. */
  const input = useMemo(() => {
    const tripsAttributed = trips.map((t) =>
      t.driverId ? t : { ...t, driverId: vehicles.find((v) => v.id === t.vehicleId)?.driverId ?? undefined },
    );
    const engines = deviceRows
      .map((e) => {
        const v = vehicles.find((x) => x.deviceId === e.deviceId);
        return v ? { vehicleId: v.id, ...e } : null;
      })
      .filter((x): x is NonNullable<typeof x> => x !== null);
    return {
      from,
      to,
      vehicleIds: scope,
      vehicles,
      drivers,
      trips: tripsAttributed,
      driverEvents,
      ignitionEvents,
      engines,
      fuelRecords,
      geofences,
      alerts,
      maintenance,
      policies,
      deviceHealth: [],
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [from, to, vehicleId, vehicles, deviceRows, drivers, trips, driverEvents, ignitionEvents, fuelRecords, geofences, alerts, maintenance, policies]);

  const scopedTrips = useMemo(
    () => trips.filter((t) => inRange(t.startAt, from, to) && (!scope || scope.has(t.vehicleId))),
    [trips, from, to, scope],
  );

  /** Dataset for the currently selected report type. */
  const reportDataset = (): { headers: string[]; rows: ExportCell[][] } => {
    if (type === "summary") {
      const agg = new Map<string, { trips: number; km: number; min: number; idle: number; max: number }>();
      for (const t of scopedTrips) {
        const a = agg.get(t.vehicleId) ?? { trips: 0, km: 0, min: 0, idle: 0, max: 0 };
        a.trips += 1; a.km += t.distanceKm; a.min += t.durationMin; a.idle += t.idleTimeMin ?? 0;
        a.max = Math.max(a.max, t.maxSpeedKmh);
        agg.set(t.vehicleId, a);
      }
      return {
        headers: ["Vehicle", "Trips", "Distance (km)", "Drive time", "Idle", "Max speed (km/h)"],
        rows: [...agg.entries()].map(([vid, a]) => [
          vehicleName(vid), a.trips, Math.round(a.km * 10) / 10, fmtHours(a.min), fmtHours(a.idle), Math.round(a.max),
        ]),
      };
    }
    if (type === "idle") {
      return {
        headers: ["Time", "Vehicle", "Driver", "Speed (km/h)", "Location"],
        rows: driverEvents
          .filter((e) => e.type === "idling" && inRange(e.recordedAt, from, to) && (!scope || !e.vehicleId || scope.has(e.vehicleId)))
          .map((e) => [
            shortDateTime(e.recordedAt), vehicleName(e.vehicleId), driverName(e.driverId),
            e.speedKmh != null ? Math.round(e.speedKmh) : "",
            e.position ? `${e.position.lat.toFixed(4)}, ${e.position.lng.toFixed(4)}` : "",
          ]),
      };
    }
    if (type === "temperature") {
      /* ST-901A has no temperature probe — this stays populated only when a
         sensor-equipped tracker reports temperature alarms/telemetry. */
      return {
        headers: ["Time", "Vehicle", "Event", "Detail"],
        rows: alerts
          .filter((a) => a.type === "temperature" && inRange(a.createdAt, from, to) && (!scope || !a.vehicleId || scope.has(a.vehicleId)))
          .map((a) => [shortDateTime(a.createdAt), vehicleName(a.vehicleId), a.title, a.message ?? ""]),
      };
    }
    const def = active.def ? findReport(active.def) : null;
    if (!def) return { headers: ["Detail"], rows: [] };
    const out = def.run(input);
    return { headers: out.columns, rows: out.rows };
  };

  /** Computed summary cards from live data — no placeholders. */
  const summary = useMemo(() => {
    const dist = scopedTrips.reduce((s, t) => s + t.distanceKm, 0);
    const idle = scopedTrips.reduce((s, t) => s + (t.idleTimeMin ?? 0), 0);
    const fuel = fuelRecords
      .filter((f) => inRange(f.at, from, to) && (!scope || scope.has(f.vehicleId)))
      .reduce((s, f) => s + f.liters, 0);
    return [
      { label: "Total Distance", value: `${dist.toLocaleString(undefined, { maximumFractionDigits: 0 })} km` },
      { label: "Total Trips", value: String(scopedTrips.length) },
      { label: "Fuel Logged", value: `${fuel.toLocaleString(undefined, { maximumFractionDigits: 0 })} L` },
      { label: "Total Idle Time", value: fmtHours(idle) },
    ];
  }, [scopedTrips, fuelRecords, from, to, scope]);

  /** Daily series for the chart — distance by default, fuel litres or event
      counts for their report types. */
  const { chartData, chartKey, chartLabel } = useMemo(() => {
    const days = new Map<string, number>();
    const put = (iso: string | undefined, v: number) => {
      if (!iso || !inRange(iso, from, to)) return;
      const d = iso.slice(0, 10);
      days.set(d, (days.get(d) ?? 0) + v);
    };
    let key = "km";
    let label = "Distance (km)";
    if (type === "fuel") {
      key = "litres"; label = "Fuel (L)";
      fuelRecords.forEach((f) => { if (!scope || scope.has(f.vehicleId)) put(f.at, f.liters); });
    } else if (type === "speeding" || type === "idle") {
      key = "events"; label = "Events";
      driverEvents.forEach((e) => {
        const wanted = type === "speeding" ? e.type === "overspeed" : e.type === "idling";
        if (wanted && (!scope || !e.vehicleId || scope.has(e.vehicleId))) put(e.recordedAt, 1);
      });
    } else if (type === "ignition") {
      key = "events"; label = "Events";
      ignitionEvents.forEach((e) => { if (!scope || !e.vehicleId || scope.has(e.vehicleId)) put(e.recordedAt, 1); });
    } else {
      scopedTrips.forEach((t) => put(t.startAt, t.distanceKm));
    }
    const data = [...days.entries()]
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([d, v]) => ({
        date: new Date(`${d}T00:00:00`).toLocaleDateString(undefined, { month: "short", day: "numeric" }),
        [key]: Math.round(v * 10) / 10,
      }));
    return { chartData: data, chartKey: key, chartLabel: label };
  }, [type, scopedTrips, fuelRecords, driverEvents, ignitionEvents, from, to, scope]);

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
          <div className="grid grid-cols-1 gap-3 min-[480px]:grid-cols-2 sm:gap-4 xl:grid-cols-4">
            {summary.map((s) => (
              <Panel key={s.label} className="p-4">
                <div className="text-[12px] text-muted-foreground">{s.label}</div>
                <div className="mt-1 text-xl font-bold tabular-nums">{s.value}</div>
              </Panel>
            ))}
          </div>

          <Panel className="p-5">
            <h3 className="text-[15px] font-semibold">{chartLabel} — {active.label}</h3>
            <div className="mt-4 h-72">
              {chartData.length === 0 ? (
                <div className="flex h-full items-center justify-center text-[13px] text-muted-foreground">
                  No data in this period — widen the date range or check the vehicle filter.
                </div>
              ) : (
              <ResponsiveContainer>
                <AreaChart data={chartData}>
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
                    dataKey={chartKey}
                    stroke="var(--chart-1)"
                    strokeWidth={2.5}
                    fill="url(#repFill)"
                    animationDuration={800}
                  />
                </AreaChart>
              </ResponsiveContainer>
              )}
            </div>
          </Panel>

          <Panel className="overflow-hidden">
            <div className="flex items-center justify-between border-b border-border/60 px-5 py-3.5">
              <h3 className="text-[14px] font-semibold">{active.label}</h3>
              <span className="text-xs text-muted-foreground">{reportDataset().rows.length} rows</span>
            </div>
            <div className="max-h-[420px] overflow-auto">
              <table className="w-full">
                <thead className="sticky top-0 border-b border-border/60 bg-accent/40 text-[11px] font-medium text-muted-foreground">
                  <tr>
                    {reportDataset().headers.map((h, i) => (
                      <th key={i} className="whitespace-nowrap bg-accent/40 px-4 py-2.5 text-left">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="text-sm">
                  {reportDataset().rows.length === 0 && (
                    <tr>
                      <td colSpan={reportDataset().headers.length} className="px-4 py-10 text-center text-muted-foreground">
                        No data for this report in the selected period.
                      </td>
                    </tr>
                  )}
                  {reportDataset().rows.slice(0, 25).map((row, i) => (
                    <tr key={i} className="border-b border-border/40 transition-colors hover:bg-accent/60">
                      {row.map((c, j) => (
                        <td key={j} className="whitespace-nowrap px-4 py-2.5 text-[12.5px] text-foreground/90">{c ?? ""}</td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {reportDataset().rows.length > 25 && (
              <div className="border-t border-border/60 px-5 py-2.5 text-[11.5px] text-muted-foreground">
                Showing first 25 of {reportDataset().rows.length} rows — export for the full dataset.
              </div>
            )}
          </Panel>
        </div>
      </div>
    </PageContainer>
  );
}
