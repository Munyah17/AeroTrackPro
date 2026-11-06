"use client";

import { useCallback, useEffect, useState } from "react";
import { Copy, Loader2, Mail, Plus, Shield, Trash2, Users2 } from "lucide-react";
import { toast } from "sonner";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { PageContainer, PageHeader, Panel } from "@/components/shared/page";

type Role = "super_admin" | "admin" | "manager" | "dispatcher" | "driver" | "viewer";

interface TeamMember {
  id: string;
  email: string;
  full_name: string;
  role: Role;
  status: string;
  last_seen_at: string | null;
}

const ASSIGNABLE_ROLES = ["admin", "manager", "dispatcher", "driver", "viewer"] as const;

const ROLE_DESCRIPTIONS: Record<string, string> = {
  super_admin: "Platform master admin — cannot be changed here",
  admin: "Manage users, devices, geofences and all settings",
  manager: "Day-to-day operations: vehicles, drivers, maintenance, reports",
  dispatcher: "Track vehicles, manage trips, acknowledge alerts",
  driver: "Driver profile — linked to trips and behaviour scoring",
  viewer: "Read-only access to maps and reports",
};

const ROLE_TONE: Record<string, string> = {
  super_admin: "bg-primary/10 text-primary",
  admin: "bg-violet-500/10 text-violet-600 dark:text-violet-400",
  manager: "bg-sky-500/10 text-sky-600 dark:text-sky-400",
  dispatcher: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
  driver: "bg-amber-500/10 text-amber-600 dark:text-amber-400",
  viewer: "bg-muted text-muted-foreground",
};

const fmtLastSeen = (iso: string | null) =>
  iso ? new Date(iso).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" }) : "—";

export default function UsersSettingsPage() {
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [inviteOpen, setInviteOpen] = useState(false);
  const [invite, setInvite] = useState({ email: "", name: "", role: "dispatcher" as Role });
  const [sending, setSending] = useState(false);
  const [issued, setIssued] = useState<{ email: string; tempPassword: string } | null>(null);

  const load = useCallback(async () => {
    const res = await fetch("/api/portal/team");
    if (res.ok) {
      const data = (await res.json()) as { users?: TeamMember[] };
      setMembers(data.users ?? []);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const handleInvite = async () => {
    if (!invite.email.includes("@")) {
      toast.error("Enter a valid email address");
      return;
    }
    setSending(true);
    const res = await fetch("/api/portal/team", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: invite.email, fullName: invite.name, role: invite.role }),
    });
    setSending(false);
    const data = (await res.json().catch(() => ({}))) as {
      message?: string;
      error?: string;
      login?: { email: string; tempPassword: string };
    };
    if (!res.ok) {
      toast.error("Invite failed", { description: data.message ?? data.error });
      return;
    }
    if (data.login) setIssued(data.login);
    toast.success(`Account created for ${invite.email}`);
    setInvite({ email: "", name: "", role: "dispatcher" });
    load();
  };

  const handleRoleChange = async (id: string, role: Role) => {
    const res = await fetch("/api/portal/team", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId: id, role }),
    });
    if (!res.ok) {
      toast.error("Role update failed");
      return;
    }
    setMembers((prev) => prev.map((u) => (u.id === id ? { ...u, role } : u)));
    toast.success("Role updated");
  };

  const handleRemove = async (member: TeamMember) => {
    const res = await fetch("/api/portal/team", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId: member.id }),
    });
    if (!res.ok) {
      const data = (await res.json().catch(() => ({}))) as { message?: string };
      toast.error("Remove failed", { description: data.message });
      return;
    }
    setMembers((prev) => prev.filter((u) => u.id !== member.id));
    toast.success(`${member.full_name} removed`);
  };

  const copy = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success("Copied");
  };

  return (
    <PageContainer className="max-w-[1000px]">
      <PageHeader
        title="User Management"
        subtitle="Invite teammates and control what they can access"
        actions={
          <Dialog
            open={inviteOpen}
            onOpenChange={(open) => {
              setInviteOpen(open);
              if (!open) setIssued(null);
            }}
          >
            <DialogTrigger
              render={
                <Button className="gap-2 rounded-xl shadow-card">
                  <Plus className="size-4" /> Invite User
                </Button>
              }
            />
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>Invite a teammate</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 pt-4">
                {issued ? (
                  <div className="space-y-3 rounded-xl border border-emerald-500/30 bg-emerald-500/5 p-4">
                    <p className="text-[13px] font-medium text-emerald-600 dark:text-emerald-400">
                      Login created — share these credentials once:
                    </p>
                    {(
                      [
                        ["Email", issued.email],
                        ["Temporary password", issued.tempPassword],
                      ] as const
                    ).map(([label, value]) => (
                      <div key={label} className="flex items-center justify-between gap-2 text-[12.5px]">
                        <span className="text-muted-foreground">{label}</span>
                        <button
                          onClick={() => copy(value)}
                          className="flex items-center gap-1.5 font-mono font-medium hover:text-primary"
                        >
                          {value} <Copy className="size-3" />
                        </button>
                      </div>
                    ))}
                    <Button
                      variant="outline"
                      className="w-full rounded-xl"
                      onClick={() => {
                        setIssued(null);
                        setInviteOpen(false);
                      }}
                    >
                      Done
                    </Button>
                  </div>
                ) : (
                  <>
                    <div className="space-y-1.5">
                      <Label className="text-xs">Email address</Label>
                      <Input
                        type="email"
                        value={invite.email}
                        onChange={(e) => setInvite({ ...invite, email: e.target.value })}
                        placeholder="teammate@company.com"
                        className="rounded-xl"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs">Full name</Label>
                      <Input
                        value={invite.name}
                        onChange={(e) => setInvite({ ...invite, name: e.target.value })}
                        placeholder="Tendai Chikore"
                        className="rounded-xl"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs">Role</Label>
                      <Select
                        value={invite.role}
                        onValueChange={(v) => v && setInvite({ ...invite, role: v as Role })}
                      >
                        <SelectTrigger className="rounded-xl">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="rounded-xl">
                          {ASSIGNABLE_ROLES.map((r) => (
                            <SelectItem key={r} value={r}>
                              <span className="capitalize">{r}</span>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <p className="pt-1 text-[12px] text-muted-foreground">
                        {ROLE_DESCRIPTIONS[invite.role]}
                      </p>
                    </div>
                    <Button onClick={handleInvite} disabled={sending} className="w-full gap-2 rounded-xl">
                      {sending ? <Loader2 className="size-4 animate-spin" /> : <Mail className="size-4" />}
                      Create account
                    </Button>
                  </>
                )}
              </div>
            </DialogContent>
          </Dialog>
        }
      />

      <div className="space-y-4">
        <Panel>
          <div className="flex items-center gap-2.5 border-b border-border/60 px-5 py-4">
            <Users2 className="size-4.5 text-primary" />
            <h3 className="text-[15px] font-semibold">Team Members</h3>
            <span className="ml-auto text-[12.5px] text-muted-foreground">
              {members.length} users
            </span>
          </div>

          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="pl-5">User</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Last active</TableHead>
                <TableHead className="pr-5 text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={5} className="py-10 text-center">
                    <Loader2 className="mx-auto size-5 animate-spin text-muted-foreground" />
                  </TableCell>
                </TableRow>
              ) : members.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="py-10 text-center text-sm text-muted-foreground">
                    No team members yet — invite someone.
                  </TableCell>
                </TableRow>
              ) : (
                members.map((member) => (
                  <TableRow key={member.id}>
                    <TableCell className="pl-5">
                      <div className="flex items-center gap-3">
                        <Avatar className="size-9">
                          <AvatarFallback className="text-xs font-semibold">
                            {member.full_name
                              .split(" ")
                              .map((n) => n[0])
                              .join("")
                              .slice(0, 2)
                              .toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <div className="text-[13.5px] font-medium">{member.full_name}</div>
                          <div className="text-[12px] text-muted-foreground">{member.email}</div>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      {member.role === "super_admin" ? (
                        <Badge
                          className={`rounded-lg ${ROLE_TONE.super_admin}`}
                          variant="secondary"
                        >
                          <Shield className="mr-1 size-3" /> Master Admin
                        </Badge>
                      ) : (
                        <Select
                          value={member.role}
                          onValueChange={(v) => v && handleRoleChange(member.id, v as Role)}
                        >
                          <SelectTrigger className="h-8 w-28 rounded-lg text-xs">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent className="rounded-xl">
                            {ASSIGNABLE_ROLES.map((r) => (
                              <SelectItem key={r} value={r}>
                                <span className="capitalize">{r}</span>
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      )}
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant="secondary"
                        className={`rounded-lg ${
                          member.status === "active"
                            ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                            : "bg-amber-500/10 text-amber-600 dark:text-amber-400"
                        }`}
                      >
                        {member.status === "active" ? "Active" : member.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-[12.5px] text-muted-foreground">
                      {fmtLastSeen(member.last_seen_at)}
                    </TableCell>
                    <TableCell className="pr-5 text-right">
                      {member.role !== "super_admin" && (
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleRemove(member)}
                          className="size-8 rounded-lg text-muted-foreground hover:text-destructive"
                        >
                          <Trash2 className="size-4" />
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </Panel>

        <Panel className="p-5">
          <h3 className="text-[14px] font-semibold">Role permissions</h3>
          <div className="mt-3 grid gap-2 sm:grid-cols-2">
            {ASSIGNABLE_ROLES.map((role) => (
              <div key={role} className="rounded-xl border border-border/60 bg-accent/30 p-3.5">
                <div className="text-[13px] font-semibold capitalize">{role}</div>
                <div className="mt-0.5 text-[12px] text-muted-foreground">
                  {ROLE_DESCRIPTIONS[role]}
                </div>
              </div>
            ))}
          </div>
        </Panel>
      </div>
    </PageContainer>
  );
}
