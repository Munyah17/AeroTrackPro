"use client";

import { Check, Info, Wallet } from "lucide-react";
import { PageContainer, PageHeader, Panel } from "@/components/shared/page";
import {
  ADDON_MODULES,
  ENABLED_ADDONS,
  RESELLER_CLIENTS,
  RESELLER_PRICING,
  computeResellerBill,
} from "@/lib/reseller";
import { usd } from "@/lib/format";

export default function ResellerBillingPage() {
  const bill = computeResellerBill();

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
                  {bill.activeDevices} active devices × {usd(RESELLER_PRICING.baseTrackingPerDeviceUsd)}
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
              A one-time setup fee of {usd(RESELLER_PRICING.setupFeeUsd)} applied when your account was
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
                <span className="font-semibold tabular-nums">{usd(RESELLER_PRICING.setupFeeUsd)} once</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Base per device</span>
                <span className="font-semibold tabular-nums">{usd(RESELLER_PRICING.baseTrackingPerDeviceUsd)}/mo</span>
              </div>
            </div>
          </Panel>

          <Panel className="p-5">
            <h3 className="text-[14px] font-semibold">Add-on modules</h3>
            <div className="mt-3 space-y-2">
              {ADDON_MODULES.filter((m) => m.status === "available").map((m) => {
                const on = ENABLED_ADDONS.includes(m.id);
                return (
                  <div key={m.id} className="flex items-center justify-between text-[12.5px]">
                    <span className={on ? "font-medium" : "text-muted-foreground"}>
                      {on && <Check className="mr-1 inline size-3.5 text-emerald-500" />}
                      {m.name}
                    </span>
                    <span className="tabular-nums text-muted-foreground">{usd(m.pricePerDeviceUsd)}/dev</span>
                  </div>
                );
              })}
            </div>
          </Panel>

          <Panel className="p-5">
            <div className="text-[12px] text-muted-foreground">Clients billed under you</div>
            <div className="mt-1 text-2xl font-bold tabular-nums">{RESELLER_CLIENTS.length}</div>
            <div className="text-[11.5px] text-muted-foreground">{bill.totalDevices} devices total</div>
          </Panel>
        </div>
      </div>
    </PageContainer>
  );
}
