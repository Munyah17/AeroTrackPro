"use client";

import { Globe, Lock, Plus, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { tenants } from "@aerotrack/shared";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { PageContainer, PageHeader, Panel } from "@/components/shared/page";
import { Pill } from "@/components/shared/status";
import { shortDate } from "@/lib/format";

export default function DomainsPage() {
  const rows = tenants.map((t) => ({
    tenant: t,
    domain: t.customDomain ?? `${t.slug}.aerotrack.app`,
    type: t.customDomain ? "Custom" : "Subdomain",
    status: t.domainStatus ?? "active",
    ssl: t.domainStatus === "pending" ? "pending" : "valid",
  }));

  return (
    <PageContainer className="max-w-[1100px]">
      <PageHeader
        title="Domain Management"
        subtitle="Custom domains and subdomains for client portals, with DNS verification and SSL"
        actions={
          <Button className="gap-2 rounded-xl shadow-card" onClick={() => toast.info("Add domain: enter domain → we issue CNAME target → verify → SSL auto-provisions")}>
            <Plus className="size-4" /> Add Domain
          </Button>
        }
      />

      <Panel>
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <TableHead className="pl-5">Domain</TableHead>
              <TableHead>Organization</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>DNS Status</TableHead>
              <TableHead>SSL</TableHead>
              <TableHead>Connected</TableHead>
              <TableHead className="w-24" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((r) => (
              <TableRow key={r.domain}>
                <TableCell className="pl-5">
                  <span className="flex items-center gap-2 text-[13px] font-medium">
                    <Globe className="size-4 text-muted-foreground" /> {r.domain}
                  </span>
                </TableCell>
                <TableCell className="text-[13px]">{r.tenant.name}</TableCell>
                <TableCell><Pill tone={r.type === "Custom" ? "primary" : "muted"}>{r.type}</Pill></TableCell>
                <TableCell>
                  <Pill tone={r.status === "active" ? "success" : r.status === "pending" ? "warning" : "danger"}>{r.status}</Pill>
                </TableCell>
                <TableCell>
                  <span className="flex items-center gap-1.5 text-[12px]">
                    <Lock className={r.ssl === "valid" ? "size-3.5 text-success" : "size-3.5 text-warning-foreground"} />
                    {r.ssl}
                  </span>
                </TableCell>
                <TableCell className="text-[12px] text-muted-foreground">{shortDate(r.tenant.createdAt)}</TableCell>
                <TableCell>
                  {r.status === "pending" && (
                    <Button size="xs" variant="outline" className="rounded-lg" onClick={() => toast.info(`Re-checking DNS for ${r.domain}... CNAME should point to edge.aerotrack.app`)}>
                      <RefreshCw className="size-3" /> Verify
                    </Button>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Panel>

      <Panel className="mt-4 p-5">
        <h3 className="text-[14px] font-semibold">DNS Setup Instructions</h3>
        <div className="mt-3 overflow-x-auto rounded-xl bg-muted/60 p-4 font-mono text-[12px] leading-7">
          <div><span className="text-muted-foreground"># For custom domains, add a CNAME record:</span></div>
          <div>gps.yourcompany.com &nbsp;&nbsp;CNAME&nbsp;&nbsp; edge.aerotrack.app</div>
          <div><span className="text-muted-foreground"># SSL certificates are provisioned automatically after verification.</span></div>
        </div>
      </Panel>
    </PageContainer>
  );
}
