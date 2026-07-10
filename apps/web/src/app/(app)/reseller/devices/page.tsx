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
import { RESELLER_CLIENTS } from "@/lib/reseller";

const PROTOCOLS = ["GT06", "GPS103", "H02", "Queclink"];

/** Flatten the downline into a device roster (demo). */
function buildRoster() {
  const rows: { imei: string; client: string; protocol: string; online: boolean }[] = [];
  RESELLER_CLIENTS.forEach((c, ci) => {
    for (let i = 0; i < Math.min(c.devices, 12); i++) {
      rows.push({
        imei: `8${(ci + 1)}${String(100000000000 + i * 37).slice(0, 12)}`,
        client: c.name,
        protocol: PROTOCOLS[(ci + i) % PROTOCOLS.length]!,
        online: i < c.activeDevices,
      });
    }
  });
  return rows;
}

export default function ResellerDevicesPage() {
  const [query, setQuery] = useState("");
  const roster = useMemo(buildRoster, []);
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
        </div>
      </Panel>
    </PageContainer>
  );
}
