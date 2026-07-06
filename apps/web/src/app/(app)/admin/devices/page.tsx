"use client";

import { Plus, Radio } from "lucide-react";
import { toast } from "sonner";
import { vehicles, tenants } from "@aerotrack/shared";
import { getDeviceModel } from "@aerotrack/protocols";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { PageContainer, PageHeader, Panel } from "@/components/shared/page";
import { Pill } from "@/components/shared/status";

export default function AdminDevicesPage() {
  return (
    <PageContainer className="max-w-[1100px]">
      <PageHeader
        title="Device Inventory"
        subtitle="Hardware stock, assignment and status across all organizations"
        actions={
          <Button className="gap-2 rounded-xl shadow-card" onClick={() => toast.info("Register devices: paste IMEI list or scan barcodes")}>
            <Plus className="size-4" /> Register Devices
          </Button>
        }
      />

      <Panel>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead className="pl-5">Device ID</TableHead>
                <TableHead>IMEI</TableHead>
                <TableHead>Model</TableHead>
                <TableHead>Protocol</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Assigned To</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {vehicles.slice(0, 16).map((v, i) => {
                const m = getDeviceModel(v.deviceModelId);
                const tenant = tenants[i % tenants.length]!;
                return (
                  <TableRow key={v.id}>
                    <TableCell className="pl-5 font-mono text-[12px]">TKD-{String(10001 + i)}</TableCell>
                    <TableCell className="font-mono text-[12px] text-muted-foreground">{v.imei}</TableCell>
                    <TableCell>
                      <span className="flex items-center gap-2 text-[13px] font-medium">
                        <Radio className="size-3.5 text-primary" /> {m?.vendor} {m?.model}
                      </span>
                    </TableCell>
                    <TableCell><Pill tone="primary">{m?.protocol.toUpperCase()}</Pill></TableCell>
                    <TableCell>
                      <Pill tone={v.status === "offline" ? "danger" : "success"}>
                        {v.status === "offline" ? "Offline" : "Online"}
                      </Pill>
                    </TableCell>
                    <TableCell className="text-[12.5px]">{tenant.name}</TableCell>
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
