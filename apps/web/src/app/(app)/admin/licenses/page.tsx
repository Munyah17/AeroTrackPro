"use client";

import { KeyRound, Plus } from "lucide-react";
import { toast } from "sonner";
import { tenants } from "@aerotrack/shared";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { PageContainer, PageHeader, Panel } from "@/components/shared/page";
import { Pill } from "@/components/shared/status";
import { StatCard } from "@/components/shared/stat-card";
import { shortDate } from "@/lib/format";

export default function LicensesPage() {
  const total = 5000;
  const inUse = tenants.reduce((n, t) => n + t.vehicleCount, 0);

  return (
    <PageContainer className="max-w-[1000px]">
      <PageHeader
        title="License Management"
        subtitle="Device licenses issued, activated and available across the platform"
        actions={
          <Button className="gap-2 rounded-xl shadow-card" onClick={() => toast.success("License batch generated: 100 keys added to pool")}>
            <Plus className="size-4" /> Add Licenses
          </Button>
        }
      />

      <div className="mb-4 grid grid-cols-3 gap-4">
        <StatCard label="Total Licenses" value={total} icon={KeyRound} />
        <StatCard label="In Use" value={inUse} icon={KeyRound} iconClassName="bg-success/10 text-success" delay={0.05} />
        <StatCard label="Available" value={total - inUse} icon={KeyRound} iconClassName="bg-muted text-muted-foreground" delay={0.1} />
      </div>

      <Panel>
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <TableHead className="pl-5">License Pool</TableHead>
              <TableHead>Assigned To</TableHead>
              <TableHead className="text-right">Seats</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Renews</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {tenants.map((t, i) => (
              <TableRow key={t.id}>
                <TableCell className="pl-5 font-mono text-[12px]">LIC-{String(2026001 + i)}</TableCell>
                <TableCell className="text-[13px] font-medium">{t.name}</TableCell>
                <TableCell className="text-right tabular-nums">{t.vehicleCount}</TableCell>
                <TableCell>
                  <Pill tone={t.status === "active" ? "success" : t.status === "trial" ? "info" : "danger"}>
                    {t.status === "trial" ? "trial" : t.status === "active" ? "active" : "suspended"}
                  </Pill>
                </TableCell>
                <TableCell className="text-[12.5px] text-muted-foreground">
                  {shortDate(new Date(Date.now() + (30 + i * 11) * 86400000).toISOString())}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Panel>
    </PageContainer>
  );
}
