"use client";

import { Plus } from "lucide-react";
import { toast } from "sonner";
import { users, tenantById } from "@aerotrack/shared";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
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

export default function UsersPage() {
  return (
    <PageContainer className="max-w-[1100px]">
      <PageHeader
        title="User Management"
        subtitle="Users across all organizations, with roles and access status"
        actions={
          <Button className="gap-2 rounded-xl shadow-card" onClick={() => toast.info("Invite user: email → organization → role → send invite")}>
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
          </TableBody>
        </Table>
      </Panel>
    </PageContainer>
  );
}
