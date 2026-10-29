"use client";

import { useMemo, useState } from "react";
import { Building2, Plus, Search } from "lucide-react";
import { toast } from "sonner";
import { useTenantTable, useVehicleGroups } from "@/hooks/use-live-data";
import { vehicles as mockVehicles } from "@aerotrack/shared";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PageContainer, PageHeader, Panel } from "@/components/shared/page";

/**
 * Departments — fleet subdivisions (backed by vehicle_groups). Each row shows
 * how many vehicles and drivers sit under it.
 */
export default function FleetDepartmentsPage() {
  const [query, setQuery] = useState("");
  const [newName, setNewName] = useState("");
  const [adding, setAdding] = useState(false);
  const groups = useVehicleGroups();

  const { rows: vehicles } = useTenantTable("vehicles", {
    map: (r) => ({ id: r.id, name: r.name, plate: r.plate, groupId: r.group_id ?? null, groupName: r.group_name ?? null, driverId: r.driver_id ?? null }),
    fallback: mockVehicles.map((v) => ({ id: v.id, name: v.name, plate: v.plate, groupId: v.groupId ?? null, groupName: null, driverId: v.driverId ?? null })),
    order: "name",
    ascending: true,
  });

  const rows = useMemo(() => {
    const list = groups.rows.map((g) => {
      const vids = new Set(g.vehicleIds ?? []);
      const members = vehicles.filter((v) => vids.has(v.id) || v.groupName === g.name);
      return {
        id: g.id,
        name: g.name,
        color: g.color,
        vehicleCount: members.length,
        driverCount: new Set(members.map((v) => v.driverId).filter(Boolean)).size,
        members,
      };
    });
    return list.filter((g) => !query || g.name.toLowerCase().includes(query.toLowerCase()));
  }, [groups.rows, vehicles, query]);

  const add = async () => {
    if (!newName.trim()) return toast.error("Department name is required");
    const ok = await groups.insert({ name: newName.trim(), color: "#0ea5e9" });
    if (ok) {
      toast.success(`Department "${newName.trim()}" created`);
      setNewName("");
      setAdding(false);
      groups.refresh();
    } else {
      toast.error("Could not save — sign in to persist departments");
    }
  };

  return (
    <PageContainer>
      <PageHeader
        title="Departments"
        subtitle="Group vehicles and drivers by team or cost centre"
        actions={
          <Button className="gap-2 rounded-xl shadow-card" onClick={() => setAdding((a) => !a)}>
            <Plus className="size-4" /> Add Department
          </Button>
        }
      />

      {adding && (
        <Panel className="mb-4 flex items-center gap-3 p-5">
          <Input
            placeholder="Department name *"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            className="max-w-xs rounded-xl"
          />
          <Button onClick={add} className="rounded-xl">Save</Button>
        </Panel>
      )}

      <div className="relative mb-4 w-full max-w-xs">
        <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search departments..."
          className="h-10 rounded-xl bg-card pl-9 text-[13px] shadow-card"
        />
      </div>

      <Panel className="overflow-hidden">
        <table className="w-full text-left text-[13px]">
          <thead>
            <tr className="border-b border-border/60 bg-accent/30 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
              <th className="px-5 py-3">Department</th>
              <th className="px-5 py-3">Vehicles</th>
              <th className="px-5 py-3">Drivers</th>
              <th className="px-5 py-3">Members</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border/50">
            {rows.length === 0 && (
              <tr>
                <td colSpan={4} className="px-5 py-10 text-center text-muted-foreground">
                  Departments not found
                </td>
              </tr>
            )}
            {rows.map((g) => (
              <tr key={g.id} className="transition-colors hover:bg-accent/30">
                <td className="px-5 py-3">
                  <span className="flex items-center gap-2.5 font-medium">
                    <span className="grid size-7 place-items-center rounded-lg" style={{ backgroundColor: `${g.color}22`, color: g.color }}>
                      <Building2 className="size-4" />
                    </span>
                    {g.name}
                  </span>
                </td>
                <td className="px-5 py-3 tabular-nums">{g.vehicleCount}</td>
                <td className="px-5 py-3 tabular-nums">{g.driverCount}</td>
                <td className="px-5 py-3 text-muted-foreground">
                  {g.members.slice(0, 4).map((v) => v.plate).join(", ")}
                  {g.members.length > 4 ? ` +${g.members.length - 4}` : ""}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        <div className="border-t border-border/60 px-5 py-2.5 text-[11.5px] text-muted-foreground">
          Total: {rows.length}
        </div>
      </Panel>
    </PageContainer>
  );
}
