"use client";

import { useMemo, useState } from "react";
import { Building2, Globe, Plus, Search } from "lucide-react";
import { toast } from "sonner";
import { tenants } from "@aerotrack/shared";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { PageContainer, PageHeader, Panel } from "@/components/shared/page";
import { Pill } from "@/components/shared/status";
import { shortDate, usd } from "@/lib/format";

export default function OrganizationsPage() {
  const [query, setQuery] = useState("");
  const rows = useMemo(
    () => tenants.filter((t) => !query || t.name.toLowerCase().includes(query.toLowerCase())),
    [query],
  );

  return (
    <PageContainer>
      <PageHeader
        title="Organizations"
        subtitle="Client tracking companies (sub-accounts) on your platform"
        actions={
          <Button className="gap-2 rounded-xl shadow-card" onClick={() => toast.info("New organization wizard: company → plan → branding → invite admin")}>
            <Plus className="size-4" /> Add Organization
          </Button>
        }
      />

      <div className="relative mb-4 w-full max-w-xs">
        <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search organizations..."
          className="h-10 rounded-xl bg-card pl-9 text-[13px] shadow-card"
        />
      </div>

      <Panel>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead className="pl-5">Organization</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Plan</TableHead>
                <TableHead className="text-right">Users</TableHead>
                <TableHead className="text-right">Vehicles</TableHead>
                <TableHead className="text-right">MRR</TableHead>
                <TableHead>Domain</TableHead>
                <TableHead>Created</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((t) => (
                <TableRow key={t.id}>
                  <TableCell className="pl-5">
                    <div className="flex items-center gap-3">
                      <div
                        className="flex size-9 items-center justify-center rounded-lg text-[12px] font-bold text-white"
                        style={{ background: t.primaryColor }}
                      >
                        {t.name.slice(0, 2).toUpperCase()}
                      </div>
                      <div>
                        <div className="text-[13.5px] font-semibold">{t.name}</div>
                        <div className="text-[11.5px] text-muted-foreground">{t.contactEmail}</div>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Pill tone={t.status === "active" ? "success" : t.status === "trial" ? "info" : "danger"}>{t.status}</Pill>
                  </TableCell>
                  <TableCell><Pill tone="primary">{t.plan}</Pill></TableCell>
                  <TableCell className="text-right tabular-nums">{t.userCount}</TableCell>
                  <TableCell className="text-right tabular-nums">{t.vehicleCount}</TableCell>
                  <TableCell className="text-right font-semibold tabular-nums">{usd(t.mrrUsd)}</TableCell>
                  <TableCell>
                    {t.customDomain ? (
                      <span className="flex items-center gap-1.5 text-[12px]">
                        <Globe className="size-3.5 text-muted-foreground" /> {t.customDomain}
                      </span>
                    ) : (
                      <span className="text-[12px] text-muted-foreground">{t.slug}.aerotrack.app</span>
                    )}
                  </TableCell>
                  <TableCell className="text-[12px] text-muted-foreground">{shortDate(t.createdAt)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
        <div className="flex items-center gap-2 border-t border-border/60 px-5 py-3 text-[12px] text-muted-foreground">
          <Building2 className="size-3.5" /> {rows.length} organizations
        </div>
      </Panel>
    </PageContainer>
  );
}
