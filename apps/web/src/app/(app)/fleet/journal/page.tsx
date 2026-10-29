"use client";

import { useMemo, useState } from "react";
import { Search } from "lucide-react";
import { useDriverEvents, useDrivers, useTenantTable } from "@/hooks/use-live-data";
import { Input } from "@/components/ui/input";
import { PageContainer, PageHeader, Panel } from "@/components/shared/page";
import { Pill } from "@/components/shared/status";

const TYPE_TONE: Record<string, "success" | "warning" | "danger" | "info" | "muted"> = {
  harsh_brake: "warning",
  harsh_accel: "warning",
  overspeed: "danger",
  idle: "info",
  trip_start: "success",
  trip_end: "muted",
};

function label(t: string) {
  return t.replace(/_/g, " ");
}

export default function FleetJournalPage() {
  const [query, setQuery] = useState("");
  const { rows: events, live } = useDriverEvents();
  const { rows: drivers } = useDrivers();
  const { rows: vehicles } = useTenantTable("vehicles", {
    map: (r) => ({ id: r.id, name: r.name, plate: r.plate }),
    order: "name",
    ascending: true,
  });

  const driverName = (id?: string) => drivers.find((d) => d.id === id)?.name ?? "—";
  const vehicleName = (id?: string) => {
    const v = vehicles.find((x) => x.id === id);
    return v ? `${v.name} (${v.plate})` : "—";
  };

  const filtered = useMemo(
    () =>
      events.filter((e) => {
        if (!query) return true;
        const q = query.toLowerCase();
        return (
          e.type.toLowerCase().includes(q) ||
          driverName(e.driverId).toLowerCase().includes(q) ||
          vehicleName(e.vehicleId).toLowerCase().includes(q)
        );
      }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [events, drivers, vehicles, query],
  );

  return (
    <PageContainer>
      <PageHeader
        title="Driver Journal"
        subtitle={`Chronological driver events${live ? "" : " (demo data)"}`}
      />

      <div className="relative mb-4 w-full max-w-xs">
        <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search driver, vehicle or event..."
          className="h-10 rounded-xl bg-card pl-9 text-[13px] shadow-card"
        />
      </div>

      <Panel className="overflow-hidden">
        <table className="w-full text-left text-[13px]">
          <thead>
            <tr className="border-b border-border/60 bg-accent/30 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
              <th className="px-5 py-3">Time</th>
              <th className="px-5 py-3">Driver</th>
              <th className="px-5 py-3">Vehicle</th>
              <th className="px-5 py-3">Event</th>
              <th className="px-5 py-3">Speed</th>
              <th className="px-5 py-3">Location</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border/50">
            {filtered.length === 0 && (
              <tr>
                <td colSpan={6} className="px-5 py-10 text-center text-muted-foreground">
                  No journal entries
                </td>
              </tr>
            )}
            {filtered.map((e) => (
              <tr key={e.id} className="transition-colors hover:bg-accent/30">
                <td className="px-5 py-3 text-muted-foreground tabular-nums">
                  {new Date(e.recordedAt).toLocaleString()}
                </td>
                <td className="px-5 py-3 font-medium">{driverName(e.driverId)}</td>
                <td className="px-5 py-3 text-muted-foreground">{vehicleName(e.vehicleId)}</td>
                <td className="px-5 py-3">
                  <Pill tone={TYPE_TONE[e.type] ?? "muted"}>{label(e.type)}</Pill>
                </td>
                <td className="px-5 py-3 tabular-nums">
                  {e.speedKmh != null ? `${Math.round(e.speedKmh)} km/h` : "—"}
                </td>
                <td className="px-5 py-3 text-muted-foreground tabular-nums">
                  {e.position ? `${e.position.lat.toFixed(4)}, ${e.position.lng.toFixed(4)}` : "—"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        <div className="border-t border-border/60 px-5 py-2.5 text-[11.5px] text-muted-foreground">
          Total: {filtered.length}
        </div>
      </Panel>
    </PageContainer>
  );
}
