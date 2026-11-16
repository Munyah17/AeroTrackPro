"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { MoreHorizontal, Navigation, Search } from "lucide-react";
import { toast } from "sonner";
import { PageContainer, PageHeader, Panel } from "@/components/shared/page";
import { Pill } from "@/components/shared/status";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useTenantTable } from "@/hooks/use-live-data";
import { useResellerClients } from "@/hooks/use-platform-data";
import { useFleet } from "@/hooks/use-fleet";
import { vehicleLiveStatus, LIVE_STATUS, type LiveStatus } from "@/lib/live-status";

const ONLINE_WINDOW_MS = 15 * 60_000;

interface RosterRow {
  imei: string;
  client: string;
  protocol: string;
  status: LiveStatus;
  vehicleId: string | null;
}

interface DeviceRow {
  imei: string;
  tenantId: string;
  protocol: string;
  online: boolean;
}

export default function ResellerDevicesPage() {
  const [query, setQuery] = useState("");
  const router = useRouter();

  const { rows: devices } = useTenantTable("devices", {
    map: (r): DeviceRow => ({
      imei: r.imei,
      tenantId: r.tenant_id,
      protocol: (r.protocol ?? "").toUpperCase(),
      online: r.last_seen_at
        ? Date.now() - new Date(r.last_seen_at).getTime() < ONLINE_WINDOW_MS
        : r.status === "active",
    }),
    order: "imei",
    ascending: true,
  });
  const { rows: clients } = useResellerClients();
  const { vehicles } = useFleet();

  const roster = useMemo<RosterRow[]>(() => {
    const nameByTenant = new Map(clients.map((c) => [c.id, c.name]));
    const liveByImei = new Map(vehicles.map((v) => [v.imei, vehicleLiveStatus(v)]));
    const vehicleByImei = new Map(vehicles.map((v) => [v.imei, v.id]));
    return devices.map((d) => {
      /* Canonical status: same LIVE_STATUS as tracking/devices pages when the
         device maps to a fleet vehicle; connectivity fallback otherwise. */
      const status =
        liveByImei.get(d.imei) ?? (d.online ? "online" : "offline");
      return {
        imei: d.imei,
        client: nameByTenant.get(d.tenantId) ?? "—",
        protocol: d.protocol,
        status,
        vehicleId: vehicleByImei.get(d.imei) ?? null,
      };
    });
  }, [devices, clients, vehicles]);

  const trackLive = (r: RosterRow) =>
    router.push(r.vehicleId ? `/tracking?vehicle=${r.vehicleId}` : `/tracking?imei=${r.imei}`);

  const copyImei = async (imei: string) => {
    try {
      await navigator.clipboard.writeText(imei);
      toast.success("IMEI copied");
    } catch {
      toast.error("Could not copy IMEI");
    }
  };

  const filtered = roster.filter(
    (r) => r.imei.includes(query) || r.client.toLowerCase().includes(query.toLowerCase()),
  );

  return (
    <PageContainer>
      <PageHeader title="Devices" subtitle="Every device across all your clients" />
      <Panel>
        <div className="border-b border-border/60 p-3">
          <div className="relative max-w-sm">
            <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search by IMEI or client..."
              className="h-9 rounded-xl pl-9 text-[13px]"
            />
          </div>
        </div>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="pl-5">IMEI</TableHead>
                <TableHead>Client</TableHead>
                <TableHead>Protocol</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.slice(0, 60).map((r) => (
                <TableRow
                  key={r.imei}
                  className="cursor-pointer"
                  onClick={() => trackLive(r)}
                >
                  <TableCell className="pl-5 font-mono text-[12.5px]">{r.imei}</TableCell>
                  <TableCell className="text-[13px]">{r.client}</TableCell>
                  <TableCell className="text-[12.5px] text-muted-foreground">{r.protocol}</TableCell>
                  <TableCell>
                    <Pill tone={r.status === "online" ? "success" : r.status === "sleeping" ? "warning" : "danger"}>
                      {LIVE_STATUS[r.status].label}
                    </Pill>
                  </TableCell>
                  <TableCell className="pr-3 text-right">
                    <div onClick={(e) => e.stopPropagation()}>
                    <DropdownMenu>
                      <DropdownMenuTrigger
                        render={
                          <Button
                            variant="ghost"
                            size="icon"
                            className="size-8 rounded-lg"
                            aria-label={`Actions for ${r.imei}`}
                          />
                        }
                      >
                        <MoreHorizontal className="size-4" />
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-48 rounded-xl">
                        <DropdownMenuItem onClick={() => trackLive(r)}>
                          <Navigation className="size-4" /> Track live
                        </DropdownMenuItem>
                        {r.vehicleId && (
                          <DropdownMenuItem
                            onClick={() => router.push(`/vehicles/${r.vehicleId}`)}
                          >
                            View vehicle
                          </DropdownMenuItem>
                        )}
                        <DropdownMenuSeparator />
                        <DropdownMenuItem onClick={() => void copyImei(r.imei)}>
                          Copy IMEI
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
        <div className="border-t border-border/60 px-5 py-2.5 text-[11.5px] text-muted-foreground">
          Showing {Math.min(filtered.length, 60)} of {roster.length} devices
          {roster.length === 0 && " — no devices registered under your clients yet"}
        </div>
      </Panel>
    </PageContainer>
  );
}
