"use client";

import { useState } from "react";
import { Mail, Plus, Shield, Trash2, Users2 } from "lucide-react";
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

type Role = "owner" | "admin" | "operator" | "viewer";

interface TeamUser {
  id: string;
  name: string;
  email: string;
  role: Role;
  lastActive: string;
  status: "active" | "invited";
}

const INITIAL_USERS: TeamUser[] = [
  { id: "u1", name: "Munya Muzvi", email: "mmuzvi@gmail.com", role: "owner", lastActive: "Now", status: "active" },
  { id: "u2", name: "Tendai Chikore", email: "t.chikore@aerotrack.io", role: "admin", lastActive: "2 hours ago", status: "active" },
  { id: "u3", name: "Rudo Mapfumo", email: "rudo.m@aerotrack.io", role: "operator", lastActive: "Yesterday", status: "active" },
  { id: "u4", name: "Blessing Ncube", email: "b.ncube@aerotrack.io", role: "operator", lastActive: "3 days ago", status: "active" },
  { id: "u5", name: "Kudzai Moyo", email: "kudzai@partner.co.zw", role: "viewer", lastActive: "—", status: "invited" },
];

const ROLE_DESCRIPTIONS: Record<Role, string> = {
  owner: "Full access including billing and workspace deletion",
  admin: "Manage users, devices, geofences and all settings",
  operator: "Track vehicles, manage trips, acknowledge alerts",
  viewer: "Read-only access to maps and reports",
};

const ROLE_TONE: Record<Role, string> = {
  owner: "bg-primary/10 text-primary",
  admin: "bg-violet-500/10 text-violet-600 dark:text-violet-400",
  operator: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
  viewer: "bg-muted text-muted-foreground",
};

export default function UsersSettingsPage() {
  const [users, setUsers] = useState<TeamUser[]>(INITIAL_USERS);
  const [inviteOpen, setInviteOpen] = useState(false);
  const [invite, setInvite] = useState({ email: "", role: "operator" as Role });

  const handleInvite = () => {
    if (!invite.email.includes("@")) {
      toast.error("Enter a valid email address");
      return;
    }
    const newUser: TeamUser = {
      id: `u-${Date.now()}`,
      name: invite.email.split("@")[0] ?? invite.email,
      email: invite.email,
      role: invite.role,
      lastActive: "—",
      status: "invited",
    };
    setUsers((prev) => [...prev, newUser]);
    setInviteOpen(false);
    setInvite({ email: "", role: "operator" });
    toast.success(`Invitation sent to ${newUser.email}`);
  };

  const handleRoleChange = (id: string, role: Role) => {
    setUsers((prev) => prev.map((u) => (u.id === id ? { ...u, role } : u)));
    toast.success("Role updated");
  };

  const handleRemove = (user: TeamUser) => {
    setUsers((prev) => prev.filter((u) => u.id !== user.id));
    toast.success(`${user.name} removed from workspace`);
  };

  return (
    <PageContainer className="max-w-[1000px]">
      <PageHeader
        title="User Management"
        subtitle="Invite teammates and control what they can access"
        actions={
          <Dialog open={inviteOpen} onOpenChange={setInviteOpen}>
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
                  <Label className="text-xs">Role</Label>
                  <Select
                    value={invite.role}
                    onValueChange={(v) => v && setInvite({ ...invite, role: v as Role })}
                  >
                    <SelectTrigger className="rounded-xl">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="rounded-xl">
                      {(["admin", "operator", "viewer"] as const).map((r) => (
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
                <Button onClick={handleInvite} className="w-full gap-2 rounded-xl">
                  <Mail className="size-4" /> Send Invitation
                </Button>
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
              {users.length} users
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
              {users.map((user) => (
                <TableRow key={user.id}>
                  <TableCell className="pl-5">
                    <div className="flex items-center gap-3">
                      <Avatar className="size-9">
                        <AvatarFallback className="text-xs font-semibold">
                          {user.name.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <div className="text-[13.5px] font-medium">{user.name}</div>
                        <div className="text-[12px] text-muted-foreground">{user.email}</div>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    {user.role === "owner" ? (
                      <Badge className={`rounded-lg capitalize ${ROLE_TONE.owner}`} variant="secondary">
                        <Shield className="mr-1 size-3" /> Owner
                      </Badge>
                    ) : (
                      <Select
                        value={user.role}
                        onValueChange={(v) => v && handleRoleChange(user.id, v as Role)}
                      >
                        <SelectTrigger className="h-8 w-28 rounded-lg text-xs">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="rounded-xl">
                          {(["admin", "operator", "viewer"] as const).map((r) => (
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
                        user.status === "active"
                          ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                          : "bg-amber-500/10 text-amber-600 dark:text-amber-400"
                      }`}
                    >
                      {user.status === "active" ? "Active" : "Invited"}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-[12.5px] text-muted-foreground">
                    {user.lastActive}
                  </TableCell>
                  <TableCell className="pr-5 text-right">
                    {user.role !== "owner" && (
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleRemove(user)}
                        className="size-8 rounded-lg text-muted-foreground hover:text-destructive"
                      >
                        <Trash2 className="size-4" />
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Panel>

        <Panel className="p-5">
          <h3 className="text-[14px] font-semibold">Role permissions</h3>
          <div className="mt-3 grid gap-2 sm:grid-cols-2">
            {(Object.keys(ROLE_DESCRIPTIONS) as Role[]).map((role) => (
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
