"use client";

import { Plus, Shield } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { PageContainer, PageHeader, Panel } from "@/components/shared/page";
import { Pill } from "@/components/shared/status";

const ROLES = [
  { name: "Super Admin", users: 2, desc: "Full access to all modules and all tenants" },
  { name: "Admin", users: 12, desc: "Manage users, vehicles and settings within own organization" },
  { name: "Manager", users: 18, desc: "Manage vehicles, drivers and reports" },
  { name: "Dispatcher", users: 9, desc: "Live tracking, trip assignment and driver contact" },
  { name: "Driver", users: 41, desc: "Own trips, own vehicle, mobile app access" },
  { name: "Viewer", users: 25, desc: "Read-only access to dashboards and reports" },
];

const MODULES = ["Live Tracking", "Vehicles", "Drivers", "Geofences", "Reports", "Commands", "Billing", "Settings"];
const MATRIX: Record<string, boolean[]> = {
  "Super Admin": [true, true, true, true, true, true, true, true],
  Admin: [true, true, true, true, true, true, true, true],
  Manager: [true, true, true, true, true, false, false, false],
  Dispatcher: [true, true, true, false, false, true, false, false],
  Driver: [true, false, false, false, false, false, false, false],
  Viewer: [true, true, false, false, true, false, false, false],
};

export default function RolesPage() {
  return (
    <PageContainer className="max-w-[1100px]">
      <PageHeader
        title="Roles & Permissions"
        subtitle="Granular access control for users and sub-accounts"
        actions={
          <Button className="gap-2 rounded-xl shadow-card" onClick={() => toast.info("Custom role builder with per-module read/write toggles")}>
            <Plus className="size-4" /> Add Role
          </Button>
        }
      />

      <div className="mb-4 grid grid-cols-1 gap-2.5 md:grid-cols-2 xl:grid-cols-3">
        {ROLES.map((r) => (
          <Panel key={r.name} hover className="flex items-center gap-3.5 p-4">
            <div className="flex size-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <Shield className="size-4.5" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="text-[13.5px] font-semibold">{r.name}</div>
              <div className="line-clamp-1 text-[11.5px] text-muted-foreground">{r.desc}</div>
            </div>
            <Pill tone="muted">{r.users}</Pill>
          </Panel>
        ))}
      </div>

      <Panel className="overflow-x-auto">
        <table className="w-full text-[12.5px]">
          <thead>
            <tr className="border-b border-border/60 text-left">
              <th className="py-3 pl-5 font-semibold">Module</th>
              {ROLES.map((r) => (
                <th key={r.name} className="px-3 py-3 text-center font-semibold">{r.name}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-border/50">
            {MODULES.map((m, mi) => (
              <tr key={m}>
                <td className="py-3 pl-5 font-medium">{m}</td>
                {ROLES.map((r) => (
                  <td key={r.name} className="px-3 py-3 text-center">
                    <Checkbox
                      defaultChecked={MATRIX[r.name]![mi]}
                      onCheckedChange={(c) => toast.success(`${r.name} ${c ? "granted" : "revoked"}: ${m}`)}
                    />
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </Panel>
    </PageContainer>
  );
}
