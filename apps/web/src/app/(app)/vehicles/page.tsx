"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Car, ChevronRight, Download, Filter, Plus, Search, Star } from "lucide-react";
import { toast } from "sonner";
import { vehicles, driverById, groups } from "@aerotrack/shared";
import { getDeviceModel } from "@aerotrack/protocols";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { PageContainer, PageHeader, Panel } from "@/components/shared/page";
import { VehicleStatusChip } from "@/components/shared/status";
import { timeAgo } from "@/lib/format";

export default function VehiclesPage() {
  const [query, setQuery] = useState("");
  const [groupFilter, setGroupFilter] = useState<string[]>([]);

  const rows = useMemo(
    () =>
      vehicles.filter((v) => {
        if (groupFilter.length && !groupFilter.includes(v.groupId ?? "")) return false;
        if (!query) return true;
        const q = query.toLowerCase();
        return (
          v.plate.toLowerCase().includes(q) ||
          v.name.toLowerCase().includes(q) ||
          `${v.make} ${v.model}`.toLowerCase().includes(q)
        );
      }),
    [query, groupFilter],
  );

  return (
    <PageContainer>
      <PageHeader
        title="Vehicles"
        subtitle={`${vehicles.length} vehicles and assets across ${groups.length} groups`}
        actions={
          <>
            <Button variant="outline" className="gap-2 rounded-xl" onClick={() => toast.success("Export started — vehicles.csv")}>
              <Download className="size-4" /> Export
            </Button>
            <Button className="gap-2 rounded-xl shadow-card" onClick={() => toast.info("Vehicle onboarding wizard coming in this build")}>
              <Plus className="size-4" /> Add Vehicle
            </Button>
          </>
        }
      />

      <Panel>
        {/* Toolbar */}
        <div className="flex flex-wrap items-center gap-2.5 border-b border-border/60 p-4">
          <div className="relative w-full max-w-xs">
            <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search vehicles..."
              className="h-9 rounded-xl bg-background pl-9 text-[13px]"
            />
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger
              render={
                <Button variant="outline" size="sm" className="gap-2 rounded-xl">
                  <Filter className="size-4" />
                  Groups {groupFilter.length > 0 && `(${groupFilter.length})`}
                </Button>
              }
            />
            <DropdownMenuContent className="w-52 rounded-xl">
              <DropdownMenuLabel>Filter by group</DropdownMenuLabel>
              <DropdownMenuSeparator />
              {groups.map((g) => (
                <DropdownMenuCheckboxItem
                  key={g.id}
                  checked={groupFilter.includes(g.id)}
                  onCheckedChange={(c) =>
                    setGroupFilter((prev) => (c ? [...prev, g.id] : prev.filter((x) => x !== g.id)))
                  }
                >
                  <span className="mr-2 size-2 rounded-full" style={{ background: g.color }} />
                  {g.name}
                </DropdownMenuCheckboxItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
          <span className="ml-auto text-[12.5px] text-muted-foreground">
            Showing {rows.length} of {vehicles.length}
          </span>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <Table>
            <TableHeader className="sticky top-0 bg-card">
              <TableRow className="hover:bg-transparent">
                <TableHead className="pl-5">Vehicle</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Driver</TableHead>
                <TableHead>Device</TableHead>
                <TableHead>Location</TableHead>
                <TableHead className="text-right">Odometer</TableHead>
                <TableHead>Last Update</TableHead>
                <TableHead className="w-10" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((v) => {
                const driver = driverById(v.driverId);
                const device = getDeviceModel(v.deviceModelId);
                return (
                  <TableRow key={v.id} className="group cursor-pointer">
                    <TableCell className="pl-5">
                      <Link href={`/vehicles/${v.id}`} className="flex items-center gap-3">
                        <div className="flex size-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
                          <Car className="size-4" />
                        </div>
                        <div>
                          <div className="flex items-center gap-1.5 text-[13.5px] font-semibold">
                            {v.plate}
                            {v.favourite && <Star className="size-3 fill-warning text-warning" />}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {v.make} {v.model} · {v.year}
                          </div>
                        </div>
                      </Link>
                    </TableCell>
                    <TableCell><VehicleStatusChip status={v.status} /></TableCell>
                    <TableCell className="text-[13px]">{driver?.name ?? <span className="text-muted-foreground">—</span>}</TableCell>
                    <TableCell>
                      <div className="text-[12.5px] font-medium">{device?.model}</div>
                      <div className="text-[11px] uppercase text-muted-foreground">{device?.protocol}</div>
                    </TableCell>
                    <TableCell className="max-w-[220px] truncate text-[12.5px] text-muted-foreground">
                      {v.position.address}
                    </TableCell>
                    <TableCell className="text-right text-[13px] tabular-nums">
                      {v.odometerKm.toLocaleString()} km
                    </TableCell>
                    <TableCell className="text-[12.5px] text-muted-foreground">{timeAgo(v.position.updatedAt)}</TableCell>
                    <TableCell>
                      <ChevronRight className="size-4 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100" />
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      </Panel>
    </PageContainer>
  );
}
