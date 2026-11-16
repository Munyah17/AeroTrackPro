"use client";

import { useState } from "react";
import { Check, Info, Wallet } from "lucide-react";
import { toast } from "sonner";
import { PageContainer, PageHeader, Panel } from "@/components/shared/page";
import { Switch } from "@/components/ui/switch";
import {
  ENABLED_ADDONS,
  computeResellerBill,
} from "@/lib/reseller";
import { usd } from "@/lib/format";
import { useTenantTable } from "@/hooks/use-live-data";
import { useResellerClients, useResellerPricing, useTenantAddons } from "@/hooks/use-platform-data";

export default function ResellerBillingPage() {
  const { rows: devices } = useTenantTable("devices", {
    map: (r) => ({ active: r.status === "active" }),
  });
  const { rows: clients } = useResellerClients();
  const { rows: addons, live, insert, update } = useTenantAddons();
  const { pricing, modules } = useResellerPricing();
  const [local, setLocal] = useState<string[]>(ENABLED_ADDONS);
  const enabled = live ? addons.filter((a) => a.active).map((a) => a.module) : local;

  const total = devices.length;
  const active = devices.filter((d) => d.active).length;
  const bill = computeResellerBill(
    [
      { id: "live", name: "downline", contact: "", joinedAt: "", status: "active", devices: total, activeDevices: active },
    ],
    enabled,
    pricing,
    modules,
  );

  const toggleAddon = async (id: string, name: string, on: boolean) => {
    if (live) {
      const row = addons.find((a) => a.module === id);
      if (row) void update(row.id, { active: on });
      else if (on) void insert({ module: id });
    }
    setLocal((prev) => (on ? [...prev, id] : prev.filter((x) => x !== id)));
    toast.success(`${name} ${on ? "enabled" : "disabled"} — bill updated`);
  };

  return (
    <PageContainer className="max-w-[1000px]">
      <PageHeader title="Billing" subtitle="How the platform bills you, and what you owe this month" />

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        {/* Invoice-style breakdown */}
        <Panel className="p-6 lg:col-span-2">
          <div className="flex items-center gap-2.5 pb-4">
            <Wallet className="size-4.5 text-primary" />
            <h3 className="text-[15px] font-semibold">This month</h3>
          </div>

          <div className="space-y-2.5 text-[13.5px]">
            <div className="flex items-center justify-between border-b border-border/50 pb-2.5">
              <div>
                <div className="font-medium">Base tracking</div>
                <div className="text-[12px] text-muted-foreground">
                  {bill.activeDevices} active devices × {usd(pricing.baseTrackingPerDeviceUsd)}
                </div>
              </div>
              <div className="font-semibold tabular-nums">{usd(bill.baseMonthly)}</div>
            </div>

            {bill.addonBreakdown.map(({ module, monthly }) => (
              <div key={module.id} className="flex items-center justify-between border-b border-border/50 pb-2.5">
                <div>
                  <div className="font-medium">{module.name}</div>
                  <div className="text-[12px] text-muted-foreground">
                    {bill.activeDevices} devices × {usd(module.pricePerDeviceUsd)}
                  </div>
                </div>
                <div className="font-semibold tabular-nums">{usd(monthly)}</div>
              </div>
            ))}

            <div className="flex items-center justify-between pt-1.5">
              <div className="text-[15px] font-bold">Monthly total</div>
              <div className="text-[18px] font-bold tabular-nums text-primary">{usd(bill.monthlyTotal)}</div>
            </div>
          </div>

          <div className="mt-4 flex items-start gap-2 rounded-xl bg-accent/50 p-3 text-[12.5px] text-muted-foreground">
            <Info className="mt-0.5 size-4 shrink-0" />
            <p>
              You are billed for every device across all your clients. What you charge each client is
              set privately between you and them — the platform does not bill your clients directly.
              A one-time setup fee of {usd(pricing.setupFeeUsd)} applied when your account was
              provisioned.
            </p>
          </div>
        </Panel>

        {/* Model summary */}
        <div className="space-y-4">
          <Panel className="p-5">
            <h3 className="text-[14px] font-semibold">Your pricing</h3>
            <div className="mt-3 space-y-2 text-[13px]">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Setup fee</span>
                <span className="font-semibold tabular-nums">{usd(pricing.setupFeeUsd)} once</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Base per device</span>
                <span className="font-semibold tabular-nums">{usd(pricing.baseTrackingPerDeviceUsd)}/mo</span>
              </div>
            </div>
          </Panel>

          <Panel className="p-5">
            <h3 className="text-[14px] font-semibold">Add-on modules</h3>
            <p className="mt-1 text-[11.5px] text-muted-foreground">
              Toggle modules on or off — your monthly total updates immediately.
            </p>
            <div className="mt-3 space-y-1">
              {modules.filter((m) => m.status === "available").map((m) => {
                const on = enabled.includes(m.id);
                return (
                  <div key={m.id} className="flex items-center justify-between gap-3 rounded-lg px-1.5 py-1.5">
                    <div className="min-w-0">
                      <div className={`text-[12.5px] ${on ? "font-medium" : "text-muted-foreground"}`}>
                        {on && <Check className="mr-1 inline size-3.5 text-emerald-500" />}
                        {m.name}
                      </div>
                      <div className="text-[10.5px] text-muted-foreground tabular-nums">
                        {usd(m.pricePerDeviceUsd)}/dev/mo
                      </div>
                    </div>
                    <Switch
                      checked={on}
                      onCheckedChange={(c) => void toggleAddon(m.id, m.name, c)}
                      aria-label={`Toggle ${m.name}`}
                    />
                  </div>
                );
              })}
            </div>
          </Panel>

          <Panel className="p-5">
            <div className="text-[12px] text-muted-foreground">Clients billed under you</div>
            <div className="mt-1 text-2xl font-bold tabular-nums">{clients.length}</div>
            <div className="text-[11.5px] text-muted-foreground">{bill.totalDevices} devices total</div>
          </Panel>
        </div>
      </div>
    </PageContainer>
  );
}
