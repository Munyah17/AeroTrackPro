"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Plus, Trash2, UserCog } from "lucide-react";
import { toast } from "sonner";
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
import { timeAgo } from "@/lib/format";
import { cn } from "@/lib/utils";

type StaffRole = "super_admin" | "admin" | "manager" | "dispatcher" | "driver" | "viewer" | "user";

interface StaffMember {
  id: string;
  email: string;
  full_name: string | null;
  role: StaffRole;
  status: "active" | "inactive" | "suspended";
  last_seen_at: string | null;
}

const ROLE_META: Record<StaffRole, { label: string; tone: "muted" | "info" | "warning" | "danger" }> = {
  super_admin: { label: "Master Admin", tone: "danger" },
  admin: { label: "Admin", tone: "info" },
  manager: { label: "Manager", tone: "warning" },
  dispatcher: { label: "Dispatcher", tone: "info" },
  driver: { label: "Driver", tone: "muted" },
  viewer: { label: "Viewer", tone: "muted" },
  user: { label: "User", tone: "muted" },
};

const ASSIGNABLE_ROLES: Exclude<StaffRole, "super_admin">[] = [
  "admin",
  "manager",
  "dispatcher",
  "driver",
  "viewer",
];

const STATUS_META: Record<StaffMember["status"], { label: string; tone: "success" | "muted" | "danger" }> = {
  active: { label: "Active", tone: "success" },
  inactive: { label: "Inactive", tone: "muted" },
  suspended: { label: "Suspended", tone: "danger" },
};

export default function AdminStaffPage() {
  const [members, setMembers] = useState<StaffMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [unavailable, setUnavailable] = useState(false);
  const [roleFilter, setRoleFilter] = useState<"all" | StaffRole>("all");
  const [addOpen, setAddOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ name: "", email: "", role: "manager" as StaffRole });

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/portal/team", { cache: "no-store" });
      if (!res.ok) {
        setUnavailable(true);
        setMembers([]);
        return;
      }
      const body = (await res.json()) as { users?: StaffMember[] };
      setMembers(body.users ?? []);
      setUnavailable(false);
    } catch {
      setUnavailable(true);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const filtered = useMemo(
    () => members.filter((s) => roleFilter === "all" || s.role === roleFilter),
    [members, roleFilter],
  );

  const stats = useMemo(() => {
    const active = members.filter((s) => s.status === "active").length;
    const admins = members.filter((s) => s.role === "super_admin" || s.role === "admin").length;
    return { active, admins, total: members.length };
  }, [members]);

  const addStaff = async () => {
    const email = form.email.trim().toLowerCase();
    if (!form.name.trim() || !email.includes("@")) return toast.error("Name and a valid email are required");
    setSaving(true);
    try {
      const res = await fetch("/api/portal/team", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, fullName: form.name.trim(), role: form.role }),
      });
      const body = (await res.json().catch(() => ({}))) as { error?: string; login?: { tempPassword: string } };
      if (!res.ok) {
        toast.error(body.error === "email_taken" ? "That email already has an account" : "Could not add staff member");
        return;
      }
      toast.success(
        body.login?.tempPassword
          ? `${form.name.trim()} added — temp password: ${body.login.tempPassword}`
          : `${form.name.trim()} added`,
        { duration: 12000 },
      );
      setForm({ name: "", email: "", role: "manager" });
      setAddOpen(false);
      void load();
    } catch {
      toast.error("Could not reach the server");
    } finally {
      setSaving(false);
    }
  };

  const changeRole = async (m: StaffMember, role: StaffRole) => {
    const res = await fetch("/api/portal/team", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId: m.id, role }),
    });
    if (res.ok) {
      toast.success(`${m.full_name ?? m.email} is now ${ROLE_META[role].label}`);
      void load();
    } else {
      toast.error("Could not change role");
    }
  };

  const removeStaff = async (m: StaffMember) => {
    const res = await fetch("/api/portal/team", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId: m.id }),
    });
    if (res.ok) {
      toast.success(`Removed ${m.full_name ?? m.email}`);
      void load();
    } else {
      const body = (await res.json().catch(() => ({}))) as { error?: string };
      toast.error(body.error === "forbidden" ? "You cannot remove that account" : "Could not remove staff member");
    }
  };

  return (
    <PageContainer>
      <PageHeader
        title="Staff"
        subtitle="Internal team members who operate the platform — separate from client portal users"
        actions={
          <Button className="gap-2 rounded-xl shadow-card" onClick={() => setAddOpen(true)}>
            <Plus className="size-4" /> Add Staff
          </Button>
        }
      />

      <div className="grid grid-cols-2 gap-3 xl:grid-cols-3">
        <StatCard compact label="Team Members" value={stats.total} icon={UserCog} />
        <StatCard compact label="Active" value={stats.active} icon={UserCog} delay={0.05} />
        <StatCard compact label="Admins" value={stats.admins} icon={UserCog} delay={0.1} />
      </div>

      <Panel className="mt-4 overflow-hidden">
        <div className="flex flex-wrap items-center gap-2 border-b border-border/60 px-5 py-4">
          <h3 className="text-[15px] font-semibold">Team Directory</h3>
          <div className="ml-auto flex flex-wrap gap-1.5">
            {(["all", "super_admin", "admin", "manager", "dispatcher", "viewer"] as const).map((r) => (
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
                <th className="px-3 py-3 font-medium">Status</th>
                <th className="px-5 py-3 font-medium text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/50">
              {filtered.map((s) => (
                <tr key={s.id} className="transition-colors hover:bg-accent/40">
                  <td className="px-5 py-3 font-semibold">{s.full_name ?? s.email}</td>
                  <td className="px-3 py-3 text-muted-foreground">{s.email}</td>
                  <td className="px-3 py-3">
                    <Pill tone={ROLE_META[s.role]?.tone ?? "muted"}>{ROLE_META[s.role]?.label ?? s.role}</Pill>
                  </td>
                  <td className="px-3 py-3 text-muted-foreground">
                    {s.last_seen_at ? timeAgo(s.last_seen_at) : "—"}
                  </td>
                  <td className="px-3 py-3">
                    <Pill tone={STATUS_META[s.status].tone}>{STATUS_META[s.status].label}</Pill>
                  </td>
                  <td className="px-5 py-3 text-right">
                    {s.role !== "super_admin" && (
                      <div className="flex items-center justify-end gap-1.5">
                        <select
                          value={s.role}
                          onChange={(e) => changeRole(s, e.target.value as StaffRole)}
                          className="h-7 rounded-md border border-input bg-transparent px-2 text-[12px] outline-none"
                        >
                          {ASSIGNABLE_ROLES.map((r) => (
                            <option key={r} value={r}>{ROLE_META[r].label}</option>
                          ))}
                        </select>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="rounded-lg text-destructive hover:text-destructive"
                          onClick={() => removeStaff(s)}
                        >
                          <Trash2 className="size-3.5" />
                        </Button>
                      </div>
                    )}
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-5 py-10 text-center text-muted-foreground">
                    {loading
                      ? "Loading staff…"
                      : unavailable
                        ? "Staff directory unavailable — sign in as a platform admin."
                        : "No staff members with this role."}
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

      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Add Staff</DialogTitle>
            <DialogDescription>
              Create a login and profile for a new team member. Their temporary password is shown once.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-3">
            <div className="grid gap-1.5">
              <Label htmlFor="s-name">Full name</Label>
              <Input
                id="s-name"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="e.g. Grace Ndlovu"
              />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="s-email">Email</Label>
              <Input
                id="s-email"
                type="email"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                placeholder="name@aerotrack.co.zw"
              />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="s-role">Role</Label>
              <select
                id="s-role"
                value={form.role}
                onChange={(e) => setForm({ ...form, role: e.target.value as StaffRole })}
                className="h-9 rounded-md border border-input bg-transparent px-3 text-sm shadow-xs outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50"
              >
                {ASSIGNABLE_ROLES.map((r) => (
                  <option key={r} value={r}>{ROLE_META[r].label}</option>
                ))}
              </select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddOpen(false)} disabled={saving}>
              Cancel
            </Button>
            <Button onClick={addStaff} disabled={saving} className="gap-2">
              <Plus className="size-4" /> {saving ? "Creating…" : "Create Account"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </PageContainer>
  );
}
