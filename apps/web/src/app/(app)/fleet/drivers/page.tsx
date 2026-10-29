"use client";

import { useMemo, useState } from "react";
import { Plus, Search } from "lucide-react";
import { toast } from "sonner";
import { useDrivers, useTenantTable } from "@/hooks/use-live-data";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { PageContainer, PageHeader, Panel } from "@/components/shared/page";
import { Pill } from "@/components/shared/status";

const STATUS_TONE: Record<string, "success" | "warning" | "danger" | "muted"> = {
  active: "success",
  inactive: "muted",
  suspended: "danger",
};

export default function FleetDriversPage() {
  const [query, setQuery] = useState("");
  const { rows: drivers, live } = useDrivers();

  const { rows: vehicles } = useTenantTable("vehicles", {
    map: (r) => ({ id: r.id, name: r.name, plate: r.plate, driverId: r.driver_id ?? undefined }),
    order: "name",
    ascending: true,
  });

  const vehicleFor = (driverId?: string) =>
    vehicles.find((v) => v.driverId === driverId);

  const filtered = useMemo(
    () =>
      drivers.filter(
        (d) =>
          !query ||
          d.name.toLowerCase().includes(query.toLowerCase()) ||
          d.licenseNumber.toLowerCase().includes(query.toLowerCase()),
      ),
    [drivers, query],
  );

  return (
    <PageContainer>
      <PageHeader
        title="Drivers"
        subtitle={`${filtered.length} of ${drivers.length} drivers${live ? "" : " (demo data)"}`}
        actions={
          <Button className="gap-2 rounded-xl shadow-card" onClick={() => toast.info("Driver onboarding is in Drivers → Add Driver")}>
            <Plus className="size-4" /> Add Driver
          </Button>
        }
      />

      <div className="relative mb-4 w-full max-w-xs">
        <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search name or license..."
          className="h-10 rounded-xl bg-card pl-9 text-[13px] shadow-card"
        />
      </div>

      <Panel className="overflow-hidden">
        <div className="overflow-x-auto">
        <table className="w-full min-w-[640px] text-left text-[13px]">
          <thead>
            <tr className="border-b border-border/60 bg-accent/30 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
              <th className="px-5 py-3">Name</th>
              <th className="px-5 py-3">Phone</th>
              <th className="px-5 py-3">License</th>
              <th className="px-5 py-3">Expires</th>
              <th className="px-5 py-3">Assigned vehicle</th>
              <th className="px-5 py-3">Score</th>
              <th className="px-5 py-3">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border/50">
            {filtered.length === 0 && (
              <tr>
                <td colSpan={7} className="px-5 py-10 text-center text-muted-foreground">
                  Drivers not found
                </td>
              </tr>
            )}
            {filtered.map((d) => {
              const veh = vehicleFor(d.id) ?? (d.assignedVehicleId ? vehicles.find((v) => v.id === d.assignedVehicleId) : undefined);
              return (
                <tr key={d.id} className="transition-colors hover:bg-accent/30">
                  <td className="px-5 py-3">
                    <span className="flex items-center gap-2.5 font-medium">
                      <Avatar className="size-7">
                        <AvatarFallback className="bg-primary/10 text-[10px] font-bold text-primary">
                          {d.name.split(" ").map((n) => n[0]).join("")}
                        </AvatarFallback>
                      </Avatar>
                      {d.name}
                    </span>
                  </td>
                  <td className="px-5 py-3 text-muted-foreground">{d.phone || "—"}</td>
                  <td className="px-5 py-3 font-medium tabular-nums">{d.licenseNumber}</td>
                  <td className="px-5 py-3 text-muted-foreground">{d.licenseExpiry?.slice(0, 10) ?? "—"}</td>
                  <td className="px-5 py-3 text-muted-foreground">
                    {veh ? `${veh.name} (${veh.plate})` : "—"}
                  </td>
                  <td className="px-5 py-3 font-semibold tabular-nums">{d.behaviorScore}</td>
                  <td className="px-5 py-3">
                    <Pill tone={STATUS_TONE[d.status] ?? "muted"}>{d.status}</Pill>
                  </td>
                </tr>
              );
            })}
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
