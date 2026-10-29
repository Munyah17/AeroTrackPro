"use client";

import { useMemo, useState } from "react";
import { Car, Plus, Search } from "lucide-react";
import { toast } from "sonner";
import Link from "next/link";
import { vehicles as mockVehicles } from "@aerotrack/shared";
import { useDrivers, useTenantTable } from "@/hooks/use-live-data";
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

interface FleetVehicleRow {
  id: string;
  name: string;
  plate: string;
  model: string;
  kind: string;
  group: string;
  status: string;
  driverId?: string;
  odometerKm?: number;
}

const STATUS_TONE: Record<string, "success" | "warning" | "danger" | "muted"> = {
  active: "success",
  inactive: "muted",
  maintenance: "warning",
  sold: "danger",
};

export default function FleetVehiclesPage() {
  const [query, setQuery] = useState("");
  const [group, setGroup] = useState("all");
  const { rows: drivers } = useDrivers();

  const { rows, live } = useTenantTable("vehicles", {
    map: (r): FleetVehicleRow => ({
      id: r.id,
      name: r.name,
      plate: r.plate,
      model: [r.make, r.model].filter(Boolean).join(" ") || "—",
      kind: r.fuel_type ?? "vehicle",
      group: r.group_name ?? "Ungrouped",
      status: r.status,
      driverId: r.driver_id ?? undefined,
      odometerKm: r.odometer_km != null ? Number(r.odometer_km) : undefined,
    }),
    fallback: mockVehicles.map((v) => ({
      id: v.id,
      name: v.name,
      plate: v.plate,
      model: `${v.make} ${v.model}`,
      kind: v.kind,
      group: v.groupId ? "Assigned" : "Ungrouped",
      status: v.status === "moving" || v.status === "idle" ? "active" : v.status,
      driverId: v.driverId,
      odometerKm: v.odometerKm,
    })),
    order: "name",
    ascending: true,
  });

  const groups = useMemo(
    () => Array.from(new Set(rows.map((r) => r.group))).sort(),
    [rows],
  );

  const filtered = useMemo(
    () =>
      rows.filter(
        (r) =>
          (group === "all" || r.group === group) &&
          (!query ||
            r.name.toLowerCase().includes(query.toLowerCase()) ||
            r.plate.toLowerCase().includes(query.toLowerCase())),
      ),
    [rows, group, query],
  );

  const driverName = (id?: string) => drivers.find((d) => d.id === id)?.name;

  return (
    <PageContainer>
      <PageHeader
        title="Vehicles"
        subtitle={`${filtered.length} of ${rows.length} vehicles${live ? "" : " (demo data)"}`}
        actions={
          <Button
            className="gap-2 rounded-xl shadow-card"
            onClick={() => toast.info("Full vehicle onboarding is at Devices → Onboard")}
          >
            <Plus className="size-4" /> Add Vehicle
          </Button>
        }
      />

      <div className="mb-4 flex flex-wrap items-center gap-3">
        <div className="relative w-full max-w-xs">
          <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search name or plate..."
            className="h-10 rounded-xl bg-card pl-9 text-[13px] shadow-card"
          />
        </div>
        <Select value={group} onValueChange={(v) => setGroup(v ?? "all")}>
          <SelectTrigger className="w-48 rounded-xl bg-card shadow-card">
            <SelectValue placeholder="Group" />
          </SelectTrigger>
          <SelectContent className="rounded-xl">
            <SelectItem value="all">All groups</SelectItem>
            {groups.map((g) => (
              <SelectItem key={g} value={g}>
                {g}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <Panel className="overflow-hidden">
        <table className="w-full text-left text-[13px]">
          <thead>
            <tr className="border-b border-border/60 bg-accent/30 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
              <th className="px-5 py-3">Name</th>
              <th className="px-5 py-3">License plate</th>
              <th className="px-5 py-3">Model</th>
              <th className="px-5 py-3">Type</th>
              <th className="px-5 py-3">Group</th>
              <th className="px-5 py-3">Driver</th>
              <th className="px-5 py-3">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border/50">
            {filtered.length === 0 && (
              <tr>
                <td colSpan={7} className="px-5 py-10 text-center text-muted-foreground">
                  Vehicles not found
                </td>
              </tr>
            )}
            {filtered.map((v) => (
              <tr key={v.id} className="transition-colors hover:bg-accent/30">
                <td className="px-5 py-3">
                  <Link
                    href={`/vehicles/${v.id}`}
                    className="flex items-center gap-2 font-medium text-primary hover:underline"
                  >
                    <Car className="size-4 shrink-0" /> {v.name}
                  </Link>
                </td>
                <td className="px-5 py-3 font-medium tabular-nums">{v.plate}</td>
                <td className="px-5 py-3 text-muted-foreground">{v.model}</td>
                <td className="px-5 py-3 text-muted-foreground capitalize">{v.kind}</td>
                <td className="px-5 py-3 text-muted-foreground">{v.group}</td>
                <td className="px-5 py-3 text-muted-foreground">{driverName(v.driverId) ?? "—"}</td>
                <td className="px-5 py-3">
                  <Pill tone={STATUS_TONE[v.status] ?? "muted"}>{v.status}</Pill>
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
