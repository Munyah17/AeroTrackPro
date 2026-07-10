"use client";

import { useState } from "react";
import { Clock } from "lucide-react";
import { toast } from "sonner";
import { PageContainer, PageHeader, Panel } from "@/components/shared/page";
import { Pill } from "@/components/shared/status";
import { Switch } from "@/components/ui/switch";
import { ADDON_MODULES, ENABLED_ADDONS, computeResellerBill } from "@/lib/reseller";
import { usd } from "@/lib/format";

export default function ResellerFeaturesPage() {
  const [enabled, setEnabled] = useState<string[]>(ENABLED_ADDONS);
  const bill = computeResellerBill(undefined, enabled);

  const toggle = (id: string, name: string, on: boolean) => {
    setEnabled((prev) => (on ? [...prev, id] : prev.filter((x) => x !== id)));
    toast.success(`${name} ${on ? "enabled" : "disabled"} for your account`);
  };

  return (
    <PageContainer className="max-w-[900px]">
      <PageHeader
        title="Add-on Features"
        subtitle="Enable premium modules for your whole fleet — billed per active device"
      />

      <div className="mb-4 rounded-xl bg-primary/8 p-4 text-[13px]">
        Enabling a module applies it to all {bill.activeDevices} active devices across your clients.
        Add-ons currently add <span className="font-semibold text-primary">{usd(bill.addonsMonthly)}/mo</span> to your bill.
      </div>

      <div className="space-y-3">
        {ADDON_MODULES.map((m) => {
          const on = enabled.includes(m.id);
          const planned = m.status === "planned";
          return (
            <Panel key={m.id} className="flex items-center gap-4 p-4">
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-[14px] font-semibold">{m.name}</span>
                  {planned && (
                    <Pill tone="muted">
                      <Clock className="mr-1 size-3" /> Planned
                    </Pill>
                  )}
                </div>
                <div className="mt-0.5 text-[12.5px] text-muted-foreground">{m.description}</div>
              </div>
              <div className="shrink-0 text-right">
                <div className="text-[13px] font-semibold tabular-nums">{usd(m.pricePerDeviceUsd)}</div>
                <div className="text-[10.5px] text-muted-foreground">per device/mo</div>
              </div>
              <Switch
                checked={on}
                disabled={planned}
                onCheckedChange={(c) => toggle(m.id, m.name, c)}
              />
            </Panel>
          );
        })}
      </div>
    </PageContainer>
  );
}
