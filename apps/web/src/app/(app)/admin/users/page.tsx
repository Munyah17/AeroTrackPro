"use client";

import { useState } from "react";
import { Plus } from "lucide-react";
import { toast } from "sonner";
import { usePlatformUsers, useTenants } from "@/hooks/use-platform-data";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
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
import { timeAgo } from "@/lib/format";

const ROLE_TONE = {
  superAdmin: "danger",
  admin: "primary",
  manager: "info",
  dispatcher: "warning",
  driver: "muted",
  viewer: "muted",
} as const;

const ASSIGNABLE = ["admin", "manager", "dispatcher", "driver", "viewer"] as const;

export default function UsersPage() {
  const { rows: users, refresh } = usePlatformUsers();
  const { rows: tenants } = useTenants();
  const tenantById = (id: string) => tenants.find((t) => t.id === id);
  const [addOpen, setAddOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ name: "", email: "", role: "admin" as string, tenantId: "" });

  const invite = async () => {
    const email = form.email.trim().toLowerCase();
    if (!form.tenantId) return toast.error("Choose an organization");
    if (!form.name.trim() || !email.includes("@")) return toast.error("Name and a valid email are required");
    setSaving(true);
    try {
      const res = await fetch("/api/portal/team", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email,
          fullName: form.name.trim(),
          role: form.role,
          tenantId: form.tenantId,
        }),
      });
      const body = (await res.json().catch(() => ({}))) as { error?: string; login?: { tempPassword: string } };
      if (!res.ok) {
        toast.error(body.error === "email_taken" ? "That email already has an account" : "Could not create user");
        return;
      }
      toast.success(
        body.login?.tempPassword
          ? `${form.name.trim()} added — temp password: ${body.login.tempPassword}`
          : `${form.name.trim()} added`,
        { duration: 12000 },
      );
      setForm({ name: "", email: "", role: "admin", tenantId: "" });
      setAddOpen(false);
      refresh();
    } catch {
      toast.error("Could not reach the server");
    } finally {
      setSaving(false);
    }
  };

  return (
    <PageContainer className="max-w-[1100px]">
      <PageHeader
        title="User Management"
        subtitle="Users across all organizations, with roles and access status"
        actions={
          <Button className="gap-2 rounded-xl shadow-card" onClick={() => setAddOpen(true)}>
            <Plus className="size-4" /> Invite User
          </Button>
        }
      />

      <Panel>
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <TableHead className="pl-5">User</TableHead>
              <TableHead>Organization</TableHead>
              <TableHead>Role</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Last Active</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {users.map((u) => (
              <TableRow key={u.id}>
                <TableCell className="pl-5">
                  <div className="flex items-center gap-3">
                    <Avatar className="size-9">
                      <AvatarFallback className="bg-primary/10 text-[12px] font-bold text-primary">
                        {u.name.split(" ").map((n) => n[0]).join("")}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <div className="text-[13.5px] font-semibold">{u.name}</div>
                      <div className="text-[11.5px] text-muted-foreground">{u.email}</div>
                    </div>
                  </div>
                </TableCell>
                <TableCell className="text-[13px]">{tenantById(u.tenantId)?.name}</TableCell>
                <TableCell><Pill tone={ROLE_TONE[u.role]}>{u.role}</Pill></TableCell>
                <TableCell>
                  <Pill tone={u.status === "active" ? "success" : u.status === "invited" ? "info" : "muted"}>{u.status}</Pill>
                </TableCell>
                <TableCell className="text-[12.5px] text-muted-foreground">{timeAgo(u.lastActive)}</TableCell>
              </TableRow>
            ))}
            {users.length === 0 && (
              <TableRow>
                <TableCell colSpan={5} className="px-5 py-10 text-center text-muted-foreground">
                  No users found.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </Panel>

      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Invite User</DialogTitle>
            <DialogDescription>
              Create a login and profile in a client organization. The temporary password is shown once.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-3">
            <div className="grid gap-1.5">
              <Label htmlFor="u-org">Organization</Label>
              <select
                id="u-org"
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
              <Label htmlFor="u-name">Full name</Label>
              <Input
                id="u-name"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="e.g. Tendai Moyo"
              />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="u-email">Email</Label>
              <Input
                id="u-email"
                type="email"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                placeholder="user@company.com"
              />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="u-role">Role</Label>
              <select
                id="u-role"
                value={form.role}
                onChange={(e) => setForm({ ...form, role: e.target.value })}
                className="h-9 rounded-md border border-input bg-transparent px-3 text-sm shadow-xs outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50"
              >
                {ASSIGNABLE.map((r) => (
                  <option key={r} value={r}>{r}</option>
                ))}
              </select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddOpen(false)} disabled={saving}>
              Cancel
            </Button>
            <Button onClick={invite} disabled={saving} className="gap-2">
              <Plus className="size-4" /> {saving ? "Creating…" : "Create User"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </PageContainer>
  );
}
