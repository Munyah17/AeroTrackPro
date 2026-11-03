"use client";

import { useMemo, useState } from "react";
import { Search } from "lucide-react";
import { PageContainer, PageHeader, Panel } from "@/components/shared/page";
import { Pill } from "@/components/shared/status";
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

const ONLINE_WINDOW_MS = 15 * 60_000;

interface RosterRow {
  imei: string;
  client: string;
  protocol: string;
  online: boolean;
}

export default function ResellerDevicesPage() {
  const [query, setQuery] = useState("");

  const { rows: devices } = useTenantTable("devices", {
    map: (r): Omit<RosterRow, "client"> & { tenantId: string } => ({
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

  const roster = useMemo<RosterRow[]>(() => {
    const nameByTenant = new Map(clients.map((c) => [c.id, c.name]));
    return devices.map((d) => ({
      imei: d.imei,
      client: nameByTenant.get(d.tenantId) ?? "—",
      protocol: d.protocol,
      online: d.online,
    }));
  }, [devices, clients]);

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
                <TableRow key={r.imei}>
                  <TableCell className="pl-5 font-mono text-[12.5px]">{r.imei}</TableCell>
                  <TableCell className="text-[13px]">{r.client}</TableCell>
                  <TableCell className="text-[12.5px] text-muted-foreground">{r.protocol}</TableCell>
                  <TableCell>
                    <Pill tone={r.online ? "success" : "danger"}>{r.online ? "Online" : "Offline"}</Pill>
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
