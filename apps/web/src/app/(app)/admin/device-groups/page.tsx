"use client";

import { Package, Pencil, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { PageContainer, PageHeader, Panel } from "@/components/shared/page";

const GROUPS = [
  { name: "Trucks", devices: 45, color: "#1E40FF" },
  { name: "Vans", devices: 28, color: "#7c3aed" },
  { name: "Buses", devices: 15, color: "#059669" },
  { name: "Construction Equipment", devices: 22, color: "#d97706" },
  { name: "Motorcycles", devices: 12, color: "#0891b2" },
  { name: "Personal & Assets", devices: 31, color: "#dc2626" },
];

export default function DeviceGroupsPage() {
  return (
    <PageContainer className="max-w-[900px]">
      <PageHeader
        title="Device Groups"
        subtitle="Organize devices for easier management, permissions and reporting"
        actions={
          <Button className="gap-2 rounded-xl shadow-card" onClick={() => toast.info("New group: name, color, then drag devices in")}>
            <Plus className="size-4" /> Add Group
          </Button>
        }
      />

      <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
        {GROUPS.map((g) => (
          <Panel key={g.name} hover className="flex items-center gap-4 p-4.5">
            <div
              className="flex size-11 items-center justify-center rounded-xl"
              style={{ background: `${g.color}18`, color: g.color }}
            >
              <Package className="size-5" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="text-[14px] font-semibold">{g.name}</div>
              <div className="text-[12px] text-muted-foreground">{g.devices} devices</div>
            </div>
            <Button variant="ghost" size="icon-sm" className="rounded-lg" onClick={() => toast.info(`Editing ${g.name}`)}>
              <Pencil className="size-3.5" />
            </Button>
            <Button variant="ghost" size="icon-sm" className="rounded-lg text-destructive" onClick={() => toast.warning(`Delete ${g.name}? Devices become ungrouped.`)}>
              <Trash2 className="size-3.5" />
            </Button>
          </Panel>
        ))}
      </div>
    </PageContainer>
  );
}
