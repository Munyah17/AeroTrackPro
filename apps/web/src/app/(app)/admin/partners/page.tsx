"use client";

import { useMemo, useState } from "react";
import { Building2, Handshake, Plus, UserCheck, UserX } from "lucide-react";
import { toast } from "sonner";
import { usePartners } from "@/hooks/use-platform-data";
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
import { PageContainer, PageHeader, Panel } from "@/components/shared/page";
import { Pill } from "@/components/shared/status";
import { StatCard } from "@/components/shared/stat-card";
import { shortDate } from "@/lib/format";
import { cn } from "@/lib/utils";

type PartnerKind = "installer" | "reseller";
type PartnerStatus = "application" | "approved" | "active" | "suspended";

const STATUS_META: Record<PartnerStatus, { label: string; tone: "muted" | "info" | "success" | "danger" }> = {
  application: { label: "Application", tone: "info" },
  approved: { label: "Approved", tone: "muted" },
  active: { label: "Active", tone: "success" },
  suspended: { label: "Suspended", tone: "danger" },
};

const PIPELINE: PartnerStatus[] = ["application", "approved", "active", "suspended"];

export default function AdminPartnersPage() {
  const { rows: partners, live, loading, insert, update } = usePartners();
  const [kindFilter, setKindFilter] = useState<"all" | PartnerKind>("all");
  const [statusFilter, setStatusFilter] = useState<"all" | PartnerStatus>("all");
  const [addOpen, setAddOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ name: "", kind: "installer" as PartnerKind, contact: "", country: "" });

  const filtered = partners.filter(
    (p) =>
      (kindFilter === "all" || p.kind === kindFilter) &&
      (statusFilter === "all" || p.status === statusFilter),
  );

  const counts = useMemo(() => {
    const by = (s: PartnerStatus) => partners.filter((p) => p.status === s).length;
    return { applications: by("application"), approved: by("approved"), active: by("active"), suspended: by("suspended") };
  }, [partners]);

  const addPartner = async () => {
    if (!form.name.trim()) return toast.error("Partner name is required");
    setSaving(true);
    const ok = await insert({
      name: form.name.trim(),
      kind: form.kind,
      contact_email: form.contact.trim() || null,
      country: form.country.trim() || null,
      status: "application",
    });
    setSaving(false);
    if (!ok) return toast.error("Could not save partner — check your connection");
    toast.success(`${form.name.trim()} added to the pipeline`);
    setForm({ name: "", kind: "installer", contact: "", country: "" });
    setAddOpen(false);
  };

  const setStatus = async (id: string, status: PartnerStatus, name: string) => {
    const ok = await update(id, {
      status,
      ...(status === "approved" || status === "active" ? { approved_at: new Date().toISOString() } : {}),
    });
    if (ok) toast.success(`${name} → ${STATUS_META[status].label}`);
    else toast.error(`Could not update ${name}`);
  };

  return (
    <PageContainer>
      <PageHeader
        title="Partners & Installers"
        subtitle="Onboard retailers and hardware installers, review applications, and manage the partner network"
        actions={
          <Button className="gap-2 rounded-xl shadow-card" onClick={() => setAddOpen(true)}>
            <Plus className="size-4" /> Add Partner
          </Button>
        }
      />

      <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
        <StatCard compact label="Applications" value={counts.applications} icon={Handshake} iconClassName="bg-info/15 text-info" />
        <StatCard compact label="Approved" value={counts.approved} icon={UserCheck} delay={0.05} />
        <StatCard compact label="Active Partners" value={counts.active} icon={Building2} delay={0.1} />
        <StatCard compact label="Suspended" value={counts.suspended} icon={UserX} iconClassName="bg-destructive/15 text-destructive" delay={0.15} />
      </div>

      <Panel className="mt-4 overflow-hidden">
        <div className="flex flex-wrap items-center gap-2 border-b border-border/60 px-5 py-4">
          <h3 className="text-[15px] font-semibold">Pipeline</h3>
          <div className="ml-auto flex flex-wrap gap-1.5">
            {(["all", "installer", "reseller"] as const).map((k) => (
              <button
                key={k}
                onClick={() => setKindFilter(k)}
                className={cn(
                  "rounded-full px-3 py-1 text-[12px] font-medium transition-colors",
                  kindFilter === k ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:bg-accent",
                )}
              >
                {k === "all" ? "All kinds" : k === "installer" ? "Installers" : "Resellers"}
              </button>
            ))}
            <span className="mx-1 h-5 w-px bg-border" />
            {(["all", ...PIPELINE] as const).map((s) => (
              <button
                key={s}
                onClick={() => setStatusFilter(s)}
                className={cn(
                  "rounded-full px-3 py-1 text-[12px] font-medium transition-colors",
                  statusFilter === s ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:bg-accent",
                )}
              >
                {s === "all" ? "All statuses" : STATUS_META[s].label}
              </button>
            ))}
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-[13px]">
            <thead>
              <tr className="border-b border-border/60 text-left text-[11.5px] uppercase tracking-wide text-muted-foreground">
                <th className="px-5 py-3 font-medium">Partner</th>
                <th className="px-3 py-3 font-medium">Kind</th>
                <th className="px-3 py-3 font-medium">Contact</th>
                <th className="px-3 py-3 font-medium">Country</th>
                <th className="px-3 py-3 font-medium">Applied</th>
                <th className="px-3 py-3 font-medium">Status</th>
                <th className="px-5 py-3 font-medium text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/50">
              {filtered.map((p) => (
                <tr key={p.id} className="transition-colors hover:bg-accent/40">
                  <td className="px-5 py-3 font-semibold">{p.name}</td>
                  <td className="px-3 py-3">
                    <Pill tone={p.kind === "installer" ? "info" : "muted"}>{p.kind}</Pill>
                  </td>
                  <td className="px-3 py-3 text-muted-foreground">{p.contactEmail ?? "—"}</td>
                  <td className="px-3 py-3 text-muted-foreground">{p.country ?? "—"}</td>
                  <td className="px-3 py-3 text-muted-foreground">{shortDate(p.appliedAt)}</td>
                  <td className="px-3 py-3">
                    <Pill tone={STATUS_META[p.status].tone}>{STATUS_META[p.status].label}</Pill>
                  </td>
                  <td className="px-5 py-3 text-right">
                    <div className="flex justify-end gap-1.5">
                      {p.status === "application" && (
                        <Button size="sm" variant="outline" className="rounded-lg" onClick={() => setStatus(p.id, "approved", p.name)}>
                          Approve
                        </Button>
                      )}
                      {p.status === "approved" && (
                        <Button size="sm" variant="outline" className="rounded-lg" onClick={() => setStatus(p.id, "active", p.name)}>
                          Activate
                        </Button>
                      )}
                      {p.status === "active" && (
                        <Button size="sm" variant="outline" className="rounded-lg" onClick={() => setStatus(p.id, "suspended", p.name)}>
                          Suspend
                        </Button>
                      )}
                      {p.status === "suspended" && (
                        <Button size="sm" variant="outline" className="rounded-lg" onClick={() => setStatus(p.id, "active", p.name)}>
                          Reactivate
                        </Button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-5 py-10 text-center text-muted-foreground">
                    {loading
                      ? "Loading partners…"
                      : live
                        ? "No partners match the current filters."
                        : "Partner pipeline unavailable — sign in as a platform admin."}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Panel>

      <p className="mt-3 text-[12px] text-muted-foreground">
        Installers fit hardware and manage their own client fleets; resellers sell platform access and bill their clients privately.
        Approved resellers can then be provisioned as organizations.
      </p>

      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Add Partner</DialogTitle>
            <DialogDescription>
              Register a new installer or reseller into the onboarding pipeline.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-3">
            <div className="grid gap-1.5">
              <Label htmlFor="p-name">Company name</Label>
              <Input
                id="p-name"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="e.g. TrackRight Installers"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="grid gap-1.5">
                <Label htmlFor="p-kind">Kind</Label>
                <select
                  id="p-kind"
                  value={form.kind}
                  onChange={(e) => setForm({ ...form, kind: e.target.value as PartnerKind })}
                  className="h-9 rounded-md border border-input bg-transparent px-3 text-sm shadow-xs outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50"
                >
                  <option value="installer">Installer</option>
                  <option value="reseller">Reseller</option>
                </select>
              </div>
              <div className="grid gap-1.5">
                <Label htmlFor="p-country">Country</Label>
                <Input
                  id="p-country"
                  value={form.country}
                  onChange={(e) => setForm({ ...form, country: e.target.value })}
                  placeholder="Zimbabwe"
                />
              </div>
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="p-contact">Contact email</Label>
              <Input
                id="p-contact"
                type="email"
                value={form.contact}
                onChange={(e) => setForm({ ...form, contact: e.target.value })}
                placeholder="sales@company.com"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddOpen(false)} disabled={saving}>
              Cancel
            </Button>
            <Button onClick={addPartner} disabled={saving} className="gap-2">
              <Plus className="size-4" /> {saving ? "Saving…" : "Add to Pipeline"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </PageContainer>
  );
}
