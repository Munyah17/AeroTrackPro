"use client";

import { BadgeCheck, Plus } from "lucide-react";
import { toast } from "sonner";
import { plans, tenants } from "@aerotrack/shared";
import { Button } from "@/components/ui/button";
import { PageContainer, PageHeader, Panel } from "@/components/shared/page";
import { Pill } from "@/components/shared/status";
import { cn } from "@/lib/utils";

export default function PlansPage() {
  const subscribers = (planId: string) =>
    tenants.filter((t) => `pln-${t.plan}` === planId).length;

  return (
    <PageContainer className="max-w-[1200px]">
      <PageHeader
        title="Plans & Billing"
        subtitle="Subscription plans available to your client organizations"
        actions={
          <Button className="gap-2 rounded-xl shadow-card" onClick={() => toast.info("Plan editor: name, price, vehicle limits, feature flags")}>
            <Plus className="size-4" /> Add Plan
          </Button>
        }
      />

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
        {plans.map((p) => {
          const highlight = p.id === "pln-pro";
          return (
            <Panel
              key={p.id}
              hover
              className={cn("relative flex flex-col p-6", highlight && "ring-2 ring-primary")}
            >
              {highlight && (
                <span className="absolute -top-2.5 left-1/2 -translate-x-1/2 rounded-full bg-primary px-3 py-0.5 text-[10.5px] font-bold text-white">
                  MOST POPULAR
                </span>
              )}
              <div className="text-[15px] font-semibold">{p.name}</div>
              <div className="mt-2 flex items-baseline gap-1">
                <span className="text-[32px] font-bold tracking-tight tabular-nums">${p.priceMonthlyUsd}</span>
                <span className="text-[13px] text-muted-foreground">/month</span>
              </div>
              <div className="mt-1 text-[12.5px] text-muted-foreground">
                {p.maxVehicles ? `Up to ${p.maxVehicles} vehicles` : "Unlimited vehicles"}
              </div>
              <div className="my-4 h-px bg-border/70" />
              <ul className="flex flex-1 flex-col gap-2.5">
                {p.features.map((f) => (
                  <li key={f} className="flex items-start gap-2 text-[12.5px]">
                    <BadgeCheck className="mt-0.5 size-3.5 shrink-0 text-success" /> {f}
                  </li>
                ))}
              </ul>
              <div className="mt-5 flex items-center justify-between">
                <Pill tone="muted">{subscribers(p.id)} subscribers</Pill>
                <Button size="sm" variant={highlight ? "default" : "outline"} className="rounded-xl" onClick={() => toast.info(`Editing ${p.name} plan`)}>
                  Edit
                </Button>
              </div>
            </Panel>
          );
        })}
      </div>
    </PageContainer>
  );
}
