"use client";

import { useMemo, useState } from "react";
import { Building2, Handshake, Plus, UserCheck, UserX } from "lucide-react";
import { toast } from "sonner";
import { useResellerClients } from "@/hooks/use-platform-data";
import { Button } from "@/components/ui/button";
import { PageContainer, PageHeader, Panel } from "@/components/shared/page";
import { Pill } from "@/components/shared/status";
import { StatCard } from "@/components/shared/stat-card";
import { shortDate } from "@/lib/format";
import { cn } from "@/lib/utils";

type PartnerKind = "installer" | "reseller";
type PartnerStatus = "application" | "approved" | "active" | "suspended";

interface Partner {
  id: string;
  name: string;
  kind: PartnerKind;
  contact: string;
  country: string;
  devices: number;
  status: PartnerStatus;
  appliedAt: string;
  approvedAt?: string;
}

const STATUS_META: Record<PartnerStatus, { label: string; tone: "muted" | "info" | "success" | "danger" }> = {
  application: { label: "Application", tone: "info" },
  approved: { label: "Approved", tone: "muted" },
  active: { label: "Active", tone: "success" },
  suspended: { label: "Suspended", tone: "danger" },
};

const PIPELINE: PartnerStatus[] = ["application", "approved", "active", "suspended"];

const DEMO_PARTNERS: Partner[] = [
  { id: "pt-1", name: "TrackRight Installers", kind: "installer", contact: "sales@trackright.co.zw", country: "Zimbabwe", devices: 0, status: "application", appliedAt: "2026-11-02" },
  { id: "pt-2", name: "GPS Masters SA", kind: "installer", contact: "hello@gpsmasters.co.za", country: "South Africa", devices: 0, status: "application", appliedAt: "2026-10-28" },
  { id: "pt-3", name: "FleetLink Resellers", kind: "reseller", contact: "partners@fleetlink.com", country: "Kenya", devices: 0, status: "approved", appliedAt: "2026-10-15", approvedAt: "2026-10-20" },
  { id: "pt-4", name: "AutoGuard Distributors", kind: "reseller", contact: "trade@autoguard.io", country: "Nigeria", devices: 0, status: "active", appliedAt: "2026-08-01", approvedAt: "2026-08-05" },
  { id: "pt-5", name: "MoveTrack Solutions", kind: "installer", contact: "info@movetrack.co.zw", country: "Zimbabwe", devices: 0, status: "active", appliedAt: "2026-06-12", approvedAt: "2026-06-15" },
  { id: "pt-6", name: "QuickTrack Ghana", kind: "reseller", contact: "support@quicktrack.gh", country: "Ghana", devices: 0, status: "suspended", appliedAt: "2026-05-20", approvedAt: "2026-05-25" },
];

export default function AdminPartnersPage() {
  const { rows: liveClients, live } = useResellerClients();
  const [kindFilter, setKindFilter] = useState<"all" | PartnerKind>("all");
  const [statusFilter, setStatusFilter] = useState<"all" | PartnerStatus>("all");

  const partners = useMemo<Partner[]>(() => {
    if (!live) return DEMO_PARTNERS;
    /* Live mode: reseller/client tenants become the partner list. */
    return liveClients.map((c) => ({
      id: c.id,
      name: c.name,
      kind: "reseller" as PartnerKind,
      contact: c.contact,
      country: "—",
      devices: c.activeDevices,
      status: c.status === "suspended" ? "suspended" : c.status === "trial" ? "approved" : "active",
      appliedAt: c.joinedAt,
    }));
  }, [live, liveClients]);

  const filtered = partners.filter(
    (p) =>
      (kindFilter === "all" || p.kind === kindFilter) &&
      (statusFilter === "all" || p.status === statusFilter),
  );

  const counts = useMemo(() => {
    const by = (s: PartnerStatus) => partners.filter((p) => p.status === s).length;
    return { applications: by("application"), approved: by("approved"), active: by("active"), suspended: by("suspended") };
  }, [partners]);

  return (
    <PageContainer>
      <PageHeader
        title="Partners & Installers"
        subtitle="Onboard retailers and hardware installers, review applications, and manage the partner network"
        actions={
          <Button className="gap-2 rounded-xl shadow-card" onClick={() => toast.info("Partner invite: email, kind (installer/reseller), region, commission terms")}>
            <Plus className="size-4" /> Invite Partner
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
                <th className="px-3 py-3 font-medium">Devices</th>
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
                  <td className="px-3 py-3 text-muted-foreground">{p.contact}</td>
                  <td className="px-3 py-3 text-muted-foreground">{p.country}</td>
                  <td className="px-3 py-3 tabular-nums">{p.devices}</td>
                  <td className="px-3 py-3 text-muted-foreground">{shortDate(p.appliedAt)}</td>
                  <td className="px-3 py-3">
                    <Pill tone={STATUS_META[p.status].tone}>{STATUS_META[p.status].label}</Pill>
                  </td>
                  <td className="px-5 py-3 text-right">
                    <div className="flex justify-end gap-1.5">
                      {p.status === "application" && (
                        <Button size="sm" variant="outline" className="rounded-lg" onClick={() => toast.success(`Approved ${p.name} — welcome email queued`)}>
                          Approve
                        </Button>
                      )}
                      {p.status === "active" && (
                        <Button size="sm" variant="outline" className="rounded-lg" onClick={() => toast.info(`Suspending ${p.name}`)}>
                          Suspend
                        </Button>
                      )}
                      {p.status === "suspended" && (
                        <Button size="sm" variant="outline" className="rounded-lg" onClick={() => toast.success(`Reactivated ${p.name}`)}>
                          Reactivate
                        </Button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={8} className="px-5 py-10 text-center text-muted-foreground">
                    No partners match the current filters.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Panel>

      <p className="mt-3 text-[12px] text-muted-foreground">
        Installers fit hardware and manage their own client fleets; resellers sell platform access and bill their clients privately.
        Both onboard through the same pipeline with different permission sets.
      </p>
    </PageContainer>
  );
}
