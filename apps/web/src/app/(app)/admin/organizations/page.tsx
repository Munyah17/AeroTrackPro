"use client";

import { useMemo, useState } from "react";
import { Building2, Globe, Plus, Search } from "lucide-react";
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
import { shortDate, usd } from "@/lib/format";

export default function OrganizationsPage() {
  const { rows: tenants, refresh } = useTenants();
  const [query, setQuery] = useState("");
  const [addOpen, setAddOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ name: "", adminName: "", adminEmail: "", accountKind: "client" });
  const rows = useMemo(
    () => tenants.filter((t) => !query || t.name.toLowerCase().includes(query.toLowerCase())),
    [tenants, query],
  );

  const provision = async () => {
    const adminEmail = form.adminEmail.trim().toLowerCase();
    if (!form.name.trim() || !adminEmail.includes("@")) {
      return toast.error("Organisation name and a valid admin email are required");
    }
    setSaving(true);
    try {
      const res = await fetch("/api/portal/provision-client", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: form.name.trim(),
          adminName: form.adminName.trim() || undefined,
          adminEmail,
          accountKind: form.accountKind,
        }),
      });
      const body = (await res.json().catch(() => ({}))) as {
        error?: string;
        login?: { tempPassword: string };
      };
      if (!res.ok) {
        toast.error(
          body.error === "provisioning_unavailable"
            ? "Provisioning is not configured on this deployment"
            : body.error === "auth_failed"
              ? "Could not create the admin login — the email may already be registered"
              : "Could not create the organisation",
        );
        return;
      }
      toast.success(
        body.login?.tempPassword
          ? `${form.name.trim()} created — temp password: ${body.login.tempPassword}`
          : `${form.name.trim()} created`,
        { duration: 12000 },
      );
      setForm({ name: "", adminName: "", adminEmail: "", accountKind: "client" });
      setAddOpen(false);
      refresh();
    } catch {
      toast.error("Could not reach the server");
    } finally {
      setSaving(false);
    }
  };

  return (
    <PageContainer>
      <PageHeader
        title="Organizations"
        subtitle="Client tracking companies (sub-accounts) on your platform"
        actions={
          <Button className="gap-2 rounded-xl shadow-card" onClick={() => setAddOpen(true)}>
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

      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Add Organization</DialogTitle>
            <DialogDescription>
              Provision a new organization with an admin login. Temporary credentials are shown once.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-3">
            <div className="grid gap-1.5">
              <Label htmlFor="o-name">Organization name</Label>
              <Input
                id="o-name"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="e.g. Delta Beverages"
              />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="o-kind">Account kind</Label>
              <select
                id="o-kind"
                value={form.accountKind}
                onChange={(e) => setForm({ ...form, accountKind: e.target.value })}
                className="h-9 rounded-md border border-input bg-transparent px-3 text-sm shadow-xs outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50"
              >
                <option value="client">Client — fleet customer</option>
                <option value="reseller">Reseller — sells tracking</option>
                <option value="owner">Owner — direct customer</option>
              </select>
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="o-admin">Admin name (optional)</Label>
              <Input
                id="o-admin"
                value={form.adminName}
                onChange={(e) => setForm({ ...form, adminName: e.target.value })}
                placeholder="e.g. Tendai Moyo"
              />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="o-email">Admin email</Label>
              <Input
                id="o-email"
                type="email"
                value={form.adminEmail}
                onChange={(e) => setForm({ ...form, adminEmail: e.target.value })}
                placeholder="admin@company.com"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddOpen(false)} disabled={saving}>
              Cancel
            </Button>
            <Button onClick={provision} disabled={saving} className="gap-2">
              <Plus className="size-4" /> {saving ? "Provisioning…" : "Provision"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </PageContainer>
  );
}
