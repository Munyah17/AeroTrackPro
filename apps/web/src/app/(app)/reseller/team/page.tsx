"use client";

import { Plus } from "lucide-react";
import { toast } from "sonner";
import { PageContainer, PageHeader, Panel } from "@/components/shared/page";
import { Pill } from "@/components/shared/status";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";

const TEAM = [
  { name: "You (Owner)", email: "owner@mytrackingco.com", role: "Owner" },
  { name: "Tariro Chikoto", email: "tariro@mytrackingco.com", role: "Support" },
  { name: "Blessing Sibanda", email: "blessing@mytrackingco.com", role: "Installer" },
];

export default function ResellerTeamPage() {
  return (
    <PageContainer className="max-w-[800px]">
      <PageHeader
        title="Team"
        subtitle="Staff who help you run tracking services"
        actions={
          <Button className="gap-2 rounded-xl shadow-card" onClick={() => toast.info("Invite flow uses the same email invite as client users")}>
            <Plus className="size-4" /> Invite
          </Button>
        }
      />
      <div className="space-y-2.5">
        {TEAM.map((m) => (
          <Panel key={m.email} className="flex items-center gap-3 p-4">
            <Avatar className="size-10">
              <AvatarFallback className="text-xs font-semibold">
                {m.name.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <div className="min-w-0 flex-1">
              <div className="text-[13.5px] font-medium">{m.name}</div>
              <div className="text-[12px] text-muted-foreground">{m.email}</div>
            </div>
            <Pill tone={m.role === "Owner" ? "primary" : "muted"}>{m.role}</Pill>
          </Panel>
        ))}
      </div>
    </PageContainer>
  );
}
