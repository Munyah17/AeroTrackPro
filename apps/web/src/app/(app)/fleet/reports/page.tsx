"use client";

import { useMemo, useState } from "react";
import {
  ChevronDown,
  ChevronRight,
  Download,
  FileSpreadsheet,
  FileText,
  FileType2,
  FileDown,
  Play,
  Search,
} from "lucide-react";
import { toast } from "sonner";
import { vehicles as mockVehicles } from "@aerotrack/shared";
import {
  useAlerts,
  useDeviceHealth,
  useDriverEvents,
  useDrivers,
  useFuelRecords,
  useGeofences,
  useInsurancePolicies,
  useMaintenanceItems,
  useTenantTable,
  useTrips,
} from "@/hooks/use-live-data";
import {
  REPORT_CATEGORIES,
  type ReportDef,
  type ReportResult,
} from "@/lib/reports/catalog";
import {
  downloadBlob,
  exportCsv,
  exportExcel,
  exportPdf,
  exportWord,
  slugify,
} from "@/lib/reports/exporters";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { PageContainer, PageHeader, Panel } from "@/components/shared/page";
import { Pill } from "@/components/shared/status";
import { cn } from "@/lib/utils";

type RangeKey = "today" | "7d" | "30d" | "month" | "all";

const RANGES: { key: RangeKey; label: string }[] = [
  { key: "today", label: "Today" },
  { key: "7d", label: "Last 7 days" },
  { key: "30d", label: "Last 30 days" },
  { key: "month", label: "This month" },
  { key: "all", label: "All time" },
];

function rangeBounds(key: RangeKey): { from: Date; to: Date } {
  const to = new Date();
  const from = new Date();
  if (key === "today") from.setHours(0, 0, 0, 0);
  else if (key === "7d") from.setDate(from.getDate() - 7);
  else if (key === "30d") from.setDate(from.getDate() - 30);
  else if (key === "month") {
    from.setDate(1);
    from.setHours(0, 0, 0, 0);
  } else from.setFullYear(2000, 0, 1);
  return { from, to };
}

const PREVIEW_LIMIT = 150;

export default function FleetReportsPage() {
  /* ------------------------------- data ------------------------------- */
  const { rows: vehicles } = useTenantTable("vehicles", {
    map: (r) => ({ id: r.id, name: r.name, plate: r.plate, driverId: r.driver_id ?? null, groupId: r.group_id ?? null, groupName: r.group_name ?? null }),
    fallback: mockVehicles.map((v) => ({ id: v.id, name: v.name, plate: v.plate, driverId: v.driverId ?? null, groupId: v.groupId ?? null, groupName: null })),
    order: "name",
    ascending: true,
  });
  const { rows: drivers } = useDrivers();
  const { rows: trips } = useTrips();
  const { rows: driverEvents } = useDriverEvents();
  const { rows: fuelRecords } = useFuelRecords();
  const { rows: geofences } = useGeofences();
  const { rows: alerts } = useAlerts();
  const { rows: maintenance } = useMaintenanceItems();
  const { rows: policies } = useInsurancePolicies();
  const { rows: deviceHealth } = useDeviceHealth();

  /* ------------------------------- state ------------------------------ */
  const [search, setSearch] = useState("");
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());
  const [selected, setSelected] = useState<ReportDef | null>(null);
  const [range, setRange] = useState<RangeKey>("30d");
  const [vehicleScope, setVehicleScope] = useState<Set<string>>(new Set());
  const [driverScope, setDriverScope] = useState<Set<string>>(new Set());
  const [result, setResult] = useState<ReportResult | null>(null);
  const [generatedFor, setGeneratedFor] = useState<string | null>(null);

  const categories = useMemo(() => {
    const q = search.trim().toLowerCase();
    return REPORT_CATEGORIES.map((c) => ({
      ...c,
      reports: q
        ? c.reports.filter((r) => r.name.toLowerCase().includes(q) || r.description.toLowerCase().includes(q))
        : c.reports,
    })).filter((c) => c.reports.length > 0);
  }, [search]);

  const toggleScope = (set: Set<string>, id: string, apply: (s: Set<string>) => void) => {
    const next = new Set(set);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    apply(next);
  };

  const selectReport = (def: ReportDef) => {
    setSelected(def);
    setResult(null);
    setGeneratedFor(null);
    setVehicleScope(new Set());
    setDriverScope(new Set());
  };

  const generate = () => {
    if (!selected) return;
    const { from, to } = rangeBounds(range);
    try {
      const out = selected.run({
        from,
        to,
        vehicleIds: vehicleScope.size ? vehicleScope : undefined,
        driverIds: driverScope.size ? driverScope : undefined,
        vehicles,
        drivers,
        trips,
        driverEvents,
        fuelRecords,
        geofences,
        alerts,
        maintenance,
        policies,
        deviceHealth,
      });
      setResult(out);
      setGeneratedFor(selected.id);
      toast.success(`${selected.name}: ${out.rows.length} rows`);
    } catch (e) {
      console.error(e);
      toast.error("Report generation failed");
    }
  };

  const reportTable = () =>
    selected && result
      ? {
          title: selected.name,
          subtitle: `${RANGES.find((r) => r.key === range)?.label}${vehicleScope.size ? ` · ${vehicleScope.size} vehicle(s)` : ""}`,
          generatedAt: new Date(),
          columns: result.columns,
          rows: result.rows,
        }
      : null;

  const doExport = (kind: "csv" | "xls" | "doc" | "pdf") => {
    const t = reportTable();
    if (!t || !selected) return;
    const base = slugify(selected.name);
    if (kind === "csv") downloadBlob(`${base}.csv`, exportCsv(t));
    else if (kind === "xls") downloadBlob(`${base}.xls`, exportExcel(t));
    else if (kind === "doc") downloadBlob(`${base}.doc`, exportWord(t));
    else downloadBlob(`${base}.pdf`, exportPdf(t));
    toast.success(`Exported ${kind.toUpperCase()}`);
  };

  /* -------------------------------- UI -------------------------------- */
  return (
    <PageContainer>
      <PageHeader
        title="Reports"
        subtitle="Generate fleet reports and export to PDF, Word, Excel or CSV"
      />

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-[320px_1fr]">
        {/* ------------------------- report catalog ------------------------- */}
        <Panel className="overflow-hidden lg:sticky lg:top-4 lg:self-start">
          <div className="border-b border-border/60 px-4 py-3 text-[12px] font-semibold uppercase tracking-wide text-muted-foreground">
            Available reports
          </div>
          <div className="border-b border-border/60 p-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search"
                className="h-9 rounded-xl bg-muted/40 pl-9 text-[13px]"
              />
            </div>
          </div>
          <div className="max-h-[62vh] overflow-y-auto py-1">
            {categories.map((cat) => {
              const isCollapsed = !search && collapsed.has(cat.id);
              return (
                <div key={cat.id}>
                  <button
                    onClick={() =>
                      setCollapsed((prev) => {
                        const next = new Set(prev);
                        if (next.has(cat.id)) next.delete(cat.id);
                        else next.add(cat.id);
                        return next;
                      })
                    }
                    className="flex w-full items-center justify-between px-4 py-2 text-[12.5px] font-semibold hover:bg-accent/40"
                  >
                    {cat.label} ({cat.reports.length})
                    {isCollapsed ? <ChevronRight className="size-4 text-muted-foreground" /> : <ChevronDown className="size-4 text-muted-foreground" />}
                  </button>
                  {!isCollapsed &&
                    cat.reports.map((r) => (
                      <button
                        key={r.id}
                        onClick={() => selectReport(r)}
                        className={cn(
                          "block w-full px-4 py-2 text-left transition-colors",
                          selected?.id === r.id ? "bg-primary/8 text-primary" : "hover:bg-accent/40",
                        )}
                      >
                        <div className="text-[13px] font-medium">{r.name}</div>
                        <div className="text-[11.5px] text-muted-foreground">{r.description}</div>
                      </button>
                    ))}
                </div>
              );
            })}
            {categories.length === 0 && (
              <div className="px-4 py-8 text-center text-[12.5px] text-muted-foreground">
                No matching reports
              </div>
            )}
          </div>
        </Panel>

        {/* ------------------------ config + preview ------------------------ */}
        <div className="min-w-0">
          {!selected ? (
            <Panel className="grid min-h-[420px] place-items-center p-8 text-center">
              <div>
                <FileText className="mx-auto mb-3 size-10 text-muted-foreground/40" />
                <div className="text-[14px] font-medium">Select a report to configure it</div>
                <div className="mt-1 text-[12.5px] text-muted-foreground">
                  Pick a report on the left, set the scope and period, then generate.
                </div>
              </div>
            </Panel>
          ) : (
            <>
              <Panel className="p-5">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <div className="text-[16px] font-semibold">{selected.name}</div>
                    <div className="mt-0.5 text-[12.5px] text-muted-foreground">{selected.description}</div>
                  </div>
                  <Pill tone="info">{selected.id}</Pill>
                </div>

                <div className="mt-5 grid grid-cols-1 gap-4 md:grid-cols-3">
                  <div>
                    <div className="mb-1.5 text-[11.5px] font-semibold uppercase tracking-wide text-muted-foreground">Period</div>
                    <Select value={range} onValueChange={(v) => setRange((v as RangeKey) ?? "30d")}>
                      <SelectTrigger className="rounded-xl bg-card"><SelectValue /></SelectTrigger>
                      <SelectContent className="rounded-xl">
                        {RANGES.map((r) => (
                          <SelectItem key={r.key} value={r.key}>{r.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {selected.scopes.includes("vehicles") && (
                    <div>
                      <div className="mb-1.5 flex items-center justify-between text-[11.5px] font-semibold uppercase tracking-wide text-muted-foreground">
                        <span>Vehicles</span>
                        <button className="font-normal normal-case text-primary hover:underline" onClick={() => setVehicleScope(new Set())}>
                          {vehicleScope.size ? `clear (${vehicleScope.size})` : "all"}
                        </button>
                      </div>
                      <div className="max-h-32 overflow-y-auto rounded-xl border border-border/60 bg-card p-2">
                        {vehicles.map((v) => (
                          <label key={v.id} className="flex cursor-pointer items-center gap-2 rounded-lg px-1.5 py-1 text-[12.5px] hover:bg-accent/40">
                            <input
                              type="checkbox"
                              checked={vehicleScope.has(v.id)}
                              onChange={() => toggleScope(vehicleScope, v.id, setVehicleScope)}
                              className="size-3.5 accent-[var(--primary)]"
                            />
                            <span className="truncate">{v.name} <span className="text-muted-foreground">({v.plate})</span></span>
                          </label>
                        ))}
                      </div>
                    </div>
                  )}

                  {selected.scopes.includes("drivers") && (
                    <div>
                      <div className="mb-1.5 flex items-center justify-between text-[11.5px] font-semibold uppercase tracking-wide text-muted-foreground">
                        <span>Drivers</span>
                        <button className="font-normal normal-case text-primary hover:underline" onClick={() => setDriverScope(new Set())}>
                          {driverScope.size ? `clear (${driverScope.size})` : "all"}
                        </button>
                      </div>
                      <div className="max-h-32 overflow-y-auto rounded-xl border border-border/60 bg-card p-2">
                        {drivers.map((d) => (
                          <label key={d.id} className="flex cursor-pointer items-center gap-2 rounded-lg px-1.5 py-1 text-[12.5px] hover:bg-accent/40">
                            <input
                              type="checkbox"
                              checked={driverScope.has(d.id)}
                              onChange={() => toggleScope(driverScope, d.id, setDriverScope)}
                              className="size-3.5 accent-[var(--primary)]"
                            />
                            <span className="truncate">{d.name}</span>
                          </label>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                <div className="mt-5 flex flex-wrap items-center gap-3">
                  <Button onClick={generate} className="gap-2 rounded-xl shadow-card">
                    <Play className="size-4" /> Generate report
                  </Button>
                  {result && generatedFor === selected.id && (
                    <div className="flex items-center gap-2">
                      <span className="mr-1 text-[12px] font-semibold uppercase tracking-wide text-muted-foreground">
                        <Download className="mr-1 inline size-3.5" />Export
                      </span>
                      <Button variant="outline" size="sm" className="gap-1.5 rounded-xl" onClick={() => doExport("pdf")}>
                        <FileDown className="size-3.5 text-danger" /> PDF
                      </Button>
                      <Button variant="outline" size="sm" className="gap-1.5 rounded-xl" onClick={() => doExport("doc")}>
                        <FileType2 className="size-3.5 text-primary" /> Word
                      </Button>
                      <Button variant="outline" size="sm" className="gap-1.5 rounded-xl" onClick={() => doExport("xls")}>
                        <FileSpreadsheet className="size-3.5 text-success" /> Excel
                      </Button>
                      <Button variant="outline" size="sm" className="gap-1.5 rounded-xl" onClick={() => doExport("csv")}>
                        <FileText className="size-3.5 text-muted-foreground" /> CSV
                      </Button>
                    </div>
                  )}
                </div>
              </Panel>

              {/* ----------------------------- preview ----------------------------- */}
              {result && generatedFor === selected.id && (
                <Panel className="mt-4 overflow-hidden">
                  <div className="border-b border-border/60 px-5 py-3 text-[12.5px] text-muted-foreground">
                    {result.rows.length} rows{result.rows.length > PREVIEW_LIMIT ? ` — previewing first ${PREVIEW_LIMIT}` : ""}
                  </div>
                  <div className="max-h-[55vh] overflow-auto">
                    <table className="w-full text-left text-[12.5px]">
                      <thead className="sticky top-0 z-10">
                        <tr className="border-b border-border/60 bg-accent/40 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                          {result.columns.map((c, i) => (
                            <th key={i} className="whitespace-nowrap bg-accent/40 px-4 py-2.5">{c}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border/50">
                        {result.rows.length === 0 && (
                          <tr>
                            <td colSpan={result.columns.length} className="px-4 py-10 text-center text-muted-foreground">
                              No data for the selected scope and period
                            </td>
                          </tr>
                        )}
                        {result.rows.slice(0, PREVIEW_LIMIT).map((row, i) => (
                          <tr key={i} className="hover:bg-accent/30">
                            {row.map((c, j) => (
                              <td key={j} className="whitespace-nowrap px-4 py-2">{c ?? ""}</td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </Panel>
              )}
            </>
          )}
        </div>
      </div>
    </PageContainer>
  );
}
