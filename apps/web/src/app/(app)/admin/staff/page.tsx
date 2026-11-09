"use client";

import { useMemo, useState } from "react";
import { Plus, UserCog } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { PageContainer, PageHeader, Panel } from "@/components/shared/page";
import { Pill } from "@/components/shared/status";
import { StatCard } from "@/components/shared/stat-card";
import { timeAgo } from "@/lib/format";
import { cn } from "@/lib/utils";

type StaffRole = "super_admin" | "admin" | "manager" | "support";
type StaffStatus = "active" | "invited" | "suspended";

interface StaffMember {
  id: string;
  name: string;
  email: string;
  role: StaffRole;
  status: StaffStatus;
  lastActiveAt?: string;
}

const ROLE_META: Record<StaffRole, { label: string; tone: "muted" | "info" | "warning" | "danger" }> = {
  super_admin: { label: "Super Admin", tone: "danger" },
  admin: { label: "Admin", tone: "info" },
  manager: { label: "Manager", tone: "warning" },
  support: { label: "Support", tone: "muted" },
};

const STATUS_META: Record<StaffStatus, { label: string; tone: "success" | "info" | "danger" }> = {
  active: { label: "Active", tone: "success" },
  invited: { label: "Invited", tone: "info" },
  suspended: { label: "Suspended", tone: "danger" },
};

const DEMO_STAFF: StaffMember[] = [
  { id: "st-1", name: "Tendai Moyo", email: "tendai@aerotrack.co.zw", role: "super_admin", status: "active", lastActiveAt: "2026-11-09T14:00:00Z" },
  { id: "st-2", name: "Grace Ndlovu", email: "grace@aerotrack.co.zw", role: "admin", status: "active", lastActiveAt: "2026-11-09T11:30:00Z" },
  { id: "st-3", name: "Brian Chikafu", email: "brian@aerotrack.co.zw", role: "manager", status: "active", lastActiveAt: "2026-11-08T16:45:00Z" },
  { id: "st-4", name: "Rutendo Moyo", email: "rutendo@aerotrack.co.zw", role: "support", status: "active", lastActiveAt: "2026-11-09T09:15:00Z" },
  { id: "st-5", name: "Simba Dube", email: "simba@aerotrack.co.zw", role: "support", status: "invited" },
  { id: "st-6", name: "Chipo Moyo", email: "chipo@aerotrack.co.zw", role: "manager", status: "suspended", lastActiveAt: "2026-10-02T10:00:00Z" },
];

export default function AdminStaffPage() {
  const [roleFilter, setRoleFilter] = useState<"all" | StaffRole>("all");

  const filtered = useMemo(
    () => DEMO_STAFF.filter((s) => roleFilter === "all" || s.role === roleFilter),
    [roleFilter],
  );

  const stats = useMemo(() => {
    const active = DEMO_STAFF.filter((s) => s.status === "active").length;
    const admins = DEMO_STAFF.filter((s) => s.role === "super_admin" || s.role === "admin").length;
    const support = DEMO_STAFF.filter((s) => s.role === "support").length;
    return { active, admins, support, total: DEMO_STAFF.length };
  }, []);

  return (
    <PageContainer>
      <PageHeader
        title="Staff"
        subtitle="Internal team members who operate the platform — separate from client portal users"
        actions={
          <Button className="gap-2 rounded-xl shadow-card" onClick={() => toast.info("Invite staff: name, email, role, permission set")}>
            <Plus className="size-4" /> Invite Staff
          </Button>
        }
      />

      <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
        <StatCard compact label="Team Members" value={stats.total} icon={UserCog} />
        <StatCard compact label="Active" value={stats.active} icon={UserCog} delay={0.05} />
        <StatCard compact label="Admins" value={stats.admins} icon={UserCog} delay={0.1} />
        <StatCard compact label="Support Agents" value={stats.support} icon={UserCog} delay={0.15} />
      </div>

      <Panel className="mt-4 overflow-hidden">
        <div className="flex flex-wrap items-center gap-2 border-b border-border/60 px-5 py-4">
          <h3 className="text-[15px] font-semibold">Team Directory</h3>
          <div className="ml-auto flex flex-wrap gap-1.5">
            {(["all", "super_admin", "admin", "manager", "support"] as const).map((r) => (
              <button
                key={r}
                onClick={() => setRoleFilter(r)}
                className={cn(
                  "rounded-full px-3 py-1 text-[12px] font-medium transition-colors",
                  roleFilter === r ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:bg-accent",
                )}
              >
                {r === "all" ? "All roles" : ROLE_META[r].label}
              </button>
            ))}
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-[13px]">
            <thead>
              <tr className="border-b border-border/60 text-left text-[11.5px] uppercase tracking-wide text-muted-foreground">
                <th className="px-5 py-3 font-medium">Name</th>
                <th className="px-3 py-3 font-medium">Email</th>
                <th className="px-3 py-3 font-medium">Role</th>
                <th className="px-3 py-3 font-medium">Last Active</th>
                <th className="px-5 py-3 font-medium">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/50">
              {filtered.map((s) => (
                <tr key={s.id} className="transition-colors hover:bg-accent/40">
                  <td className="px-5 py-3 font-semibold">{s.name}</td>
                  <td className="px-3 py-3 text-muted-foreground">{s.email}</td>
                  <td className="px-3 py-3">
                    <Pill tone={ROLE_META[s.role].tone}>{ROLE_META[s.role].label}</Pill>
                  </td>
                  <td className="px-3 py-3 text-muted-foreground">
                    {s.lastActiveAt ? timeAgo(s.lastActiveAt) : "—"}
                  </td>
                  <td className="px-5 py-3">
                    <Pill tone={STATUS_META[s.status].tone}>{STATUS_META[s.status].label}</Pill>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-5 py-10 text-center text-muted-foreground">
                    No staff members with this role.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Panel>

      <p className="mt-3 text-[12px] text-muted-foreground">
        Staff accounts operate the Master Portal. Client portal users (fleet managers, drivers, viewers) are managed under Organizations.
      </p>
    </PageContainer>
  );
}
