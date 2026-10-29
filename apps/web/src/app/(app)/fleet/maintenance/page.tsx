"use client";

import { useMemo, useState } from "react";
import { Plus, Search, Wrench } from "lucide-react";
import { toast } from "sonner";
import { useMaintenanceItems, useTenantTable } from "@/hooks/use-live-data";
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

const STATUS_TONE = { upcoming: "info", overdue: "danger", completed: "success" } as const;
const TYPE_LABEL: Record<string, string> = {
  service: "Service",
  inspection: "Inspection",
  tyres: "Tyres",
  battery: "Battery",
  brakes: "Brakes",
  oil: "Oil change",
  other: "Other",
};

export default function FleetMaintenancePage() {
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("all");
  const { rows: items, live } = useMaintenanceItems();
  const { rows: vehicles } = useTenantTable("vehicles", {
    map: (r) => ({ id: r.id, name: r.name, plate: r.plate }),
    order: "name",
    ascending: true,
  });

  const vehicleName = (id: string) => {
    const v = vehicles.find((x) => x.id === id);
    return v ? `${v.name} (${v.plate})` : "—";
  };

  const filtered = useMemo(
    () =>
      items.filter(
        (m) =>
          (status === "all" || m.status === status) &&
          (!query ||
            m.title.toLowerCase().includes(query.toLowerCase()) ||
            vehicleName(m.vehicleId).toLowerCase().includes(query.toLowerCase())),
      ),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [items, vehicles, query, status],
  );

  const overdue = items.filter((m) => m.status === "overdue").length;
  const upcoming = items.filter((m) => m.status === "upcoming").length;

  return (
    <PageContainer>
      <PageHeader
        title="Maintenance"
        subtitle={`${overdue} overdue · ${upcoming} upcoming${live ? "" : " (demo data)"}`}
        actions={
          <Button className="gap-2 rounded-xl shadow-card" onClick={() => toast.info("Scheduling is in Maintenance → New item")}>
            <Plus className="size-4" /> Schedule Item
          </Button>
        }
      />

      <div className="mb-4 flex flex-wrap items-center gap-3">
        <div className="relative w-full max-w-xs">
          <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search work or vehicle..."
            className="h-10 rounded-xl bg-card pl-9 text-[13px] shadow-card"
          />
        </div>
        <Select value={status} onValueChange={(v) => setStatus(v ?? "all")}>
          <SelectTrigger className="w-44 rounded-xl bg-card shadow-card">
            <SelectValue />
          </SelectTrigger>
          <SelectContent className="rounded-xl">
            <SelectItem value="all">All statuses</SelectItem>
            <SelectItem value="overdue">Overdue</SelectItem>
            <SelectItem value="upcoming">Upcoming</SelectItem>
            <SelectItem value="completed">Completed</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <Panel className="overflow-hidden">
        <div className="overflow-x-auto">
        <table className="w-full min-w-[640px] text-left text-[13px]">
          <thead>
            <tr className="border-b border-border/60 bg-accent/30 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
              <th className="px-5 py-3">Work item</th>
              <th className="px-5 py-3">Vehicle</th>
              <th className="px-5 py-3">Type</th>
              <th className="px-5 py-3">Due date</th>
              <th className="px-5 py-3">Due km</th>
              <th className="px-5 py-3">Cost</th>
              <th className="px-5 py-3">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border/50">
            {filtered.length === 0 && (
              <tr>
                <td colSpan={7} className="px-5 py-10 text-center text-muted-foreground">
                  Maintenance items not found
                </td>
              </tr>
            )}
            {filtered.map((m) => (
              <tr key={m.id} className="transition-colors hover:bg-accent/30">
                <td className="px-5 py-3">
                  <span className="flex items-center gap-2 font-medium">
                    <Wrench className="size-4 shrink-0 text-muted-foreground" /> {m.title}
                  </span>
                </td>
                <td className="px-5 py-3 text-muted-foreground">{vehicleName(m.vehicleId)}</td>
                <td className="px-5 py-3 text-muted-foreground">{TYPE_LABEL[m.type] ?? m.type}</td>
                <td className="px-5 py-3 tabular-nums">{m.dueDate?.slice(0, 10) ?? "—"}</td>
                <td className="px-5 py-3 tabular-nums">
                  {m.dueOdometerKm != null ? `${Math.round(m.dueOdometerKm).toLocaleString()} km` : "—"}
                </td>
                <td className="px-5 py-3 tabular-nums">
                  {m.costUsd != null ? `$${m.costUsd.toFixed(2)}` : "—"}
                </td>
                <td className="px-5 py-3">
                  <Pill tone={STATUS_TONE[m.status] ?? "muted"}>{m.status}</Pill>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        </div>
        <div className="border-t border-border/60 px-5 py-2.5 text-[11.5px] text-muted-foreground">
          Total: {filtered.length}
        </div>
      </Panel>
    </PageContainer>
  );
}
