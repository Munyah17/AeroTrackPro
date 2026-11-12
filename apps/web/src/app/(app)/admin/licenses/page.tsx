"use client";

import { useMemo } from "react";
import { KeyRound, MonitorSmartphone } from "lucide-react";
import { useDevices, useTenants } from "@/hooks/use-platform-data";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { PageContainer, PageHeader, Panel } from "@/components/shared/page";
import { Pill } from "@/components/shared/status";
import { StatCard } from "@/components/shared/stat-card";

const PER_DEVICE_MONTHLY_USD = 3.5;

export default function LicensesPage() {
  const { rows: tenants } = useTenants();
  const { rows: devices } = useDevices();

  const stats = useMemo(() => {
    const total = devices.length;
    const active = devices.filter((d) => d.status === "active").length;
    const billableTenants = new Set(
      devices.filter((d) => d.status === "active").map((d) => d.tenantId),
    ).size;
    return { total, active, billableTenants };
  }, [devices]);

  const rows = useMemo(() => {
    const byTenant = new Map<string, { total: number; active: number }>();
    for (const d of devices) {
      const cur = byTenant.get(d.tenantId) ?? { total: 0, active: 0 };
      cur.total += 1;
      if (d.status === "active") cur.active += 1;
      byTenant.set(d.tenantId, cur);
    }
    return tenants
      .map((t) => ({ tenant: t, ...(byTenant.get(t.id) ?? { total: 0, active: 0 }) }))
      .filter((r) => r.total > 0)
      .sort((a, b) => b.total - a.total);
  }, [tenants, devices]);

  return (
    <PageContainer className="max-w-[1000px]">
      <PageHeader
        title="License Management"
        subtitle={`Device licenses in use across the platform — billed at $${PER_DEVICE_MONTHLY_USD.toFixed(2)} per device per month`}
      />

      <div className="mb-4 grid grid-cols-1 gap-3 sm:grid-cols-3 sm:gap-4">
        <StatCard label="Total Devices" value={stats.total} icon={MonitorSmartphone} />
        <StatCard label="Active Licenses" value={stats.active} icon={KeyRound} iconClassName="bg-success/10 text-success" delay={0.05} />
        <StatCard label="Organizations" value={stats.billableTenants} icon={KeyRound} iconClassName="bg-muted text-muted-foreground" delay={0.1} />
      </div>

      <Panel>
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <TableHead className="pl-5">Organization</TableHead>
              <TableHead>Plan</TableHead>
              <TableHead className="text-right">Devices</TableHead>
              <TableHead className="text-right">Active</TableHead>
              <TableHead className="text-right">Monthly</TableHead>
              <TableHead>Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map(({ tenant: t, total, active }) => (
              <TableRow key={t.id}>
                <TableCell className="pl-5 text-[13px] font-medium">{t.name}</TableCell>
                <TableCell><Pill tone="primary">{t.plan}</Pill></TableCell>
                <TableCell className="text-right tabular-nums">{total}</TableCell>
                <TableCell className="text-right tabular-nums">{active}</TableCell>
                <TableCell className="text-right font-semibold tabular-nums">
                  ${(active * PER_DEVICE_MONTHLY_USD).toFixed(2)}
                </TableCell>
                <TableCell>
                  <Pill tone={t.status === "active" ? "success" : t.status === "trial" ? "info" : "danger"}>
                    {t.status === "trial" ? "trial" : t.status === "active" ? "active" : "suspended"}
                  </Pill>
                </TableCell>
              </TableRow>
            ))}
            {rows.length === 0 && (
              <TableRow>
                <TableCell colSpan={6} className="py-10 text-center text-muted-foreground">
                  No devices registered yet.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </Panel>
    </PageContainer>
  );
}
