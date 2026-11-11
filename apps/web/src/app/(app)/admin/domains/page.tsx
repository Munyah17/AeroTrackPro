"use client";

import { useState } from "react";
import { Globe, Lock, Plus, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { useTenants } from "@/hooks/use-platform-data";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { PageContainer, PageHeader, Panel } from "@/components/shared/page";
import { Pill } from "@/components/shared/status";
import { shortDate } from "@/lib/format";

export default function DomainsPage() {
  const { rows: tenants, update, refresh } = useTenants();
  const [addOpen, setAddOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [verifying, setVerifying] = useState<string | null>(null);
  const [form, setForm] = useState({ tenantId: "", domain: "" });

  const rows = tenants.map((t) => ({
    tenant: t,
    domain: t.customDomain ?? `${t.slug}.aerotrack.app`,
    type: t.customDomain ? "Custom" : "Subdomain",
    status: t.domainStatus ?? "active",
    ssl: t.domainStatus === "pending" || t.domainStatus === "failed" ? "pending" : "valid",
  }));

  const addDomain = async () => {
    const domain = form.domain.trim().toLowerCase();
    if (!form.tenantId) return toast.error("Choose an organization");
    if (!domain || !/^[a-z0-9.-]+\.[a-z]{2,}$/.test(domain)) {
      return toast.error("Enter a valid domain like gps.company.com");
    }
    setSaving(true);
    const ok = await update(form.tenantId, { custom_domain: domain, domain_status: "pending" });
    setSaving(false);
    if (!ok) return toast.error("Could not save domain");
    toast.success(`${domain} added — now point its CNAME to edge.aerotrack.app and verify`);
    setForm({ tenantId: "", domain: "" });
    setAddOpen(false);
  };

  const verify = async (tenantId: string, domain: string) => {
    setVerifying(tenantId);
    try {
      const res = await fetch("/api/portal/verify-domain", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tenantId }),
      });
      const body = (await res.json().catch(() => ({}))) as { status?: string; message?: string };
      if (res.ok && body.status === "active") {
        toast.success(body.message ?? `${domain} verified`);
      } else {
        toast.error(body.message ?? `Could not verify ${domain}`);
      }
      refresh();
    } catch {
      toast.error("Verification request failed");
    } finally {
      setVerifying(null);
    }
  };

  const clearDomain = async (tenantId: string, domain: string) => {
    const ok = await update(tenantId, { custom_domain: null, domain_status: "active" });
    if (ok) toast.success(`${domain} removed`);
    else toast.error("Could not remove domain");
  };

  return (
    <PageContainer className="max-w-[1100px]">
      <PageHeader
        title="Domain Management"
        subtitle="Custom domains and subdomains for client portals, with DNS verification and SSL"
        actions={
          <Button className="gap-2 rounded-xl shadow-card" onClick={() => setAddOpen(true)}>
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
              <TableHead className="w-36" />
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
                  <div className="flex gap-1.5">
                    {r.tenant.customDomain && (r.status === "pending" || r.status === "failed") && (
                      <Button
                        size="xs"
                        variant="outline"
                        className="rounded-lg"
                        disabled={verifying === r.tenant.id}
                        onClick={() => verify(r.tenant.id, r.domain)}
                      >
                        <RefreshCw className={verifying === r.tenant.id ? "size-3 animate-spin" : "size-3"} /> Verify
                      </Button>
                    )}
                    {r.tenant.customDomain && (
                      <Button
                        size="xs"
                        variant="ghost"
                        className="rounded-lg text-destructive hover:text-destructive"
                        onClick={() => clearDomain(r.tenant.id, r.domain)}
                      >
                        Remove
                      </Button>
                    )}
                  </div>
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

      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Add Custom Domain</DialogTitle>
            <DialogDescription>
              Attach a custom domain to an organization, then add the CNAME and verify it.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-3">
            <div className="grid gap-1.5">
              <Label htmlFor="d-org">Organization</Label>
              <select
                id="d-org"
                value={form.tenantId}
                onChange={(e) => setForm({ ...form, tenantId: e.target.value })}
                className="h-9 rounded-md border border-input bg-transparent px-3 text-sm shadow-xs outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50"
              >
                <option value="">Choose organization…</option>
                {tenants.map((t) => (
                  <option key={t.id} value={t.id}>{t.name}</option>
                ))}
              </select>
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="d-domain">Domain</Label>
              <Input
                id="d-domain"
                value={form.domain}
                onChange={(e) => setForm({ ...form, domain: e.target.value })}
                placeholder="gps.yourcompany.com"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddOpen(false)} disabled={saving}>
              Cancel
            </Button>
            <Button onClick={addDomain} disabled={saving} className="gap-2">
              <Plus className="size-4" /> {saving ? "Saving…" : "Add Domain"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </PageContainer>
  );
}
