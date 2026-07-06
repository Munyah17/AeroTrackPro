"use client";

import { CreditCard, Download, Wallet } from "lucide-react";
import { toast } from "sonner";
import { tenants, invoices } from "@aerotrack/shared";
import { Button } from "@/components/ui/button";
import { PageContainer, PageHeader, Panel } from "@/components/shared/page";
import { Pill } from "@/components/shared/status";
import { StatCard } from "@/components/shared/stat-card";
import { usd } from "@/lib/format";

export default function BillingPage() {
  const mrr = tenants.reduce((n, t) => n + t.mrrUsd, 0);
  const arr = mrr * 12;
  const overdueAmt = invoices.filter((i) => i.status === "overdue").reduce((n, i) => n + i.amountUsd, 0);

  return (
    <PageContainer className="max-w-[1000px]">
      <PageHeader
        title="Billing"
        subtitle="Revenue, subscriptions and collection health"
        actions={
          <Button variant="outline" className="gap-2 rounded-xl" onClick={() => toast.success("Billing report exported")}>
            <Download className="size-4" /> Export
          </Button>
        }
      />

      <div className="mb-4 grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard label="MRR" value={mrr} suffix="USD" icon={Wallet} trend={9.8} trendLabel="MoM" />
        <StatCard label="ARR (run rate)" value={arr} suffix="USD" icon={CreditCard} delay={0.05} />
        <StatCard label="Paying Clients" value={tenants.filter((t) => t.mrrUsd > 0).length} icon={CreditCard} delay={0.1} />
        <StatCard label="Overdue" value={overdueAmt} suffix="USD" icon={CreditCard} iconClassName="bg-destructive/10 text-destructive" delay={0.15} />
      </div>

      <Panel className="divide-y divide-border/50">
        {tenants.map((t) => (
          <div key={t.id} className="flex flex-wrap items-center gap-4 px-5 py-4">
            <div
              className="flex size-10 items-center justify-center rounded-xl text-[12px] font-bold text-white"
              style={{ background: t.primaryColor }}
            >
              {t.name.slice(0, 2).toUpperCase()}
            </div>
            <div className="min-w-0 flex-1">
              <div className="text-[13.5px] font-semibold">{t.name}</div>
              <div className="text-[11.5px] text-muted-foreground">
                {t.plan} plan · {t.vehicleCount} vehicles · renews monthly
              </div>
            </div>
            <span className="text-[15px] font-bold tabular-nums">{usd(t.mrrUsd)}<span className="text-[11px] font-medium text-muted-foreground">/mo</span></span>
            <Pill tone={t.status === "active" ? "success" : t.status === "trial" ? "info" : "danger"}>{t.status}</Pill>
            <Button size="sm" variant="outline" className="rounded-xl" onClick={() => toast.info(`Subscription editor for ${t.name}`)}>
              Manage
            </Button>
          </div>
        ))}
      </Panel>
    </PageContainer>
  );
}
