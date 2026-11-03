"use client";

import { useState } from "react";
import { Handshake, ShieldCheck, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { EmptyState } from "@/components/shared/empty-state";
import { PageContainer, PageHeader, Panel } from "@/components/shared/page";
import { Pill } from "@/components/shared/status";
import { useRole } from "@/components/shell/role-provider";
import { ROLE_LABELS } from "@/lib/rbac";

export default function FleetPartnershipsPage() {
  const { delegates, grantFleet, revokeFleet } = useRole();
  const [form, setForm] = useState({
    name: "",
    email: "",
    organization: "",
    role: "user" as "user" | "reseller",
  });

  const grant = () => {
    const name = form.name.trim();
    const email = form.email.trim();
    const organization = form.organization.trim();
    if (!name || !email.includes("@") || !organization) {
      toast.error("Add a name, a valid email, and the organization");
      return;
    }
    grantFleet({ name, email, organization, role: form.role });
    setForm({ name: "", email: "", organization: "", role: "user" });
    toast.success(`${name} can open fleet management`);
  };

  return (
    <PageContainer className="max-w-[960px]">
      <PageHeader
        title="Fleet Partnerships"
        subtitle="Corporate fleet management stays with you unless you delegate it"
      />

      <Panel className="mb-4 flex gap-3 p-4 sm:p-5">
        <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
          <ShieldCheck className="size-5" />
        </div>
        <div className="min-w-0 text-[13px] leading-relaxed text-muted-foreground">
          <p className="font-medium text-foreground">Master Admin only</p>
          <p className="mt-1">
            Fuel, drivers, maintenance, insurance, geofences, reports and remote commands
            are the corporate fleet product. Resellers run an admin portal for the tracking
            service they sell. End users get live tracking. Neither group can open fleet
            management until you add them here.
          </p>
        </div>
      </Panel>

      <Panel className="mb-4 p-4 sm:p-5">
        <h3 className="text-[15px] font-semibold">Delegate access</h3>
        <p className="mt-1 text-[12.5px] text-muted-foreground">
          The person keeps their own role. Fleet management is added on top.
        </p>
        <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label className="text-xs">Name</Label>
            <Input
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              placeholder="Rudo Chikwanha"
              className="h-10 rounded-xl"
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Email</Label>
            <Input
              type="email"
              value={form.email}
              onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
              placeholder="rudo@partner.co.zw"
              className="h-10 rounded-xl"
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Organization</Label>
            <Input
              value={form.organization}
              onChange={(e) => setForm((f) => ({ ...f, organization: e.target.value }))}
              placeholder="City Bus Company"
              className="h-10 rounded-xl"
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Their account</Label>
            <Select
              value={form.role}
              onValueChange={(value) => {
                if (value === "user" || value === "reseller") setForm((f) => ({ ...f, role: value }));
              }}
            >
              <SelectTrigger className="h-10 w-full rounded-xl">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="rounded-xl">
                <SelectItem value="user">User</SelectItem>
                <SelectItem value="reseller">Reseller</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        <div className="mt-4 flex justify-end">
          <Button className="w-full gap-2 rounded-xl shadow-card sm:w-auto" onClick={grant}>
            <Handshake className="size-4" /> Grant fleet access
          </Button>
        </div>
      </Panel>

      {delegates.length === 0 ? (
        <EmptyState
          icon={Handshake}
          title="No one else has fleet access"
          description="You are the only person who can open the corporate fleet console."
          className="min-h-[220px]"
        />
      ) : (
        <div className="flex flex-col gap-2.5">
          {delegates.map((d) => (
            <Panel key={d.id} className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center">
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="truncate text-[14px] font-semibold">{d.name}</span>
                  <Pill tone="primary">{ROLE_LABELS[d.role]}</Pill>
                </div>
                <div className="mt-0.5 truncate text-[12.5px] text-muted-foreground">
                  {d.email} · {d.organization}
                </div>
              </div>
              <div className="flex shrink-0 gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="rounded-xl text-destructive"
                  onClick={() => {
                    revokeFleet(d.id);
                    toast.success(`Fleet access removed for ${d.name}`);
                  }}
                >
                  <Trash2 className="size-4" />
                  <span className="sr-only">Revoke</span>
                </Button>
              </div>
            </Panel>
          ))}
        </div>
      )}
    </PageContainer>
  );
}
