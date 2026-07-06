"use client";

import { AlertTriangle, ShieldCheck, ShoppingBag, FileCheck2 } from "lucide-react";
import { toast } from "sonner";
import { vehicles } from "@aerotrack/shared";
import { Button } from "@/components/ui/button";
import { PageContainer, PageHeader, Panel } from "@/components/shared/page";
import { Pill } from "@/components/shared/status";
import { StatCard } from "@/components/shared/stat-card";
import { shortDate } from "@/lib/format";

const DAY = 86_400_000;

export default function InsurancePage() {
  const insured = vehicles.filter((v) => v.insuranceExpiry);
  const now = Date.now();
  const status = (expiry: string) => {
    const days = Math.round((new Date(expiry).getTime() - now) / DAY);
    if (days < 0) return { tone: "danger" as const, label: "Expired", days };
    if (days <= 15) return { tone: "warning" as const, label: `Expires in ${days}d`, days };
    return { tone: "success" as const, label: "Active", days };
  };

  const expiring = insured.filter((v) => {
    const d = status(v.insuranceExpiry!).days;
    return d >= 0 && d <= 15;
  }).length;
  const expired = insured.filter((v) => status(v.insuranceExpiry!).days < 0).length;

  return (
    <PageContainer className="max-w-[1100px]">
      <PageHeader
        title="Insurance"
        subtitle="Policies, expiry alerts and the insurance marketplace"
        actions={
          <Button
            className="gap-2 rounded-xl shadow-card"
            onClick={() => toast.info("Insurance marketplace opens with partner quotes (ZimRe, Old Mutual, Nicoz)")}
          >
            <ShoppingBag className="size-4" /> Buy Insurance
          </Button>
        }
      />

      <div className="mb-5 grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard label="Active Policies" value={insured.length - expired} icon={ShieldCheck} iconClassName="bg-success/10 text-success" />
        <StatCard label="Expiring Soon" value={expiring} icon={AlertTriangle} iconClassName="bg-warning/15 text-warning-foreground" delay={0.05} />
        <StatCard label="Expired" value={expired} icon={AlertTriangle} iconClassName="bg-destructive/10 text-destructive" delay={0.1} />
        <StatCard label="Compliance" value={Math.round(((insured.length - expired) / insured.length) * 100)} suffix="%" icon={FileCheck2} delay={0.15} />
      </div>

      <Panel>
        <div className="border-b border-border/60 px-5 py-4">
          <h3 className="text-[15px] font-semibold">Fleet Policies</h3>
        </div>
        <div className="divide-y divide-border/60">
          {insured.slice(0, 14).map((v) => {
            const s = status(v.insuranceExpiry!);
            return (
              <div key={v.id} className="flex flex-wrap items-center gap-4 px-5 py-3.5">
                <div className="flex size-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
                  <ShieldCheck className="size-4.5" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="text-[13.5px] font-semibold">{v.plate} — {v.make} {v.model}</div>
                  <div className="text-[12px] text-muted-foreground">
                    Policy FLEET-2026-{v.id.replace("veh-", "").padStart(3, "0")} · Expires {shortDate(v.insuranceExpiry!)}
                  </div>
                </div>
                <Pill tone={s.tone}>{s.label}</Pill>
                {s.tone !== "success" && (
                  <Button size="sm" variant="outline" className="rounded-xl" onClick={() => toast.success(`Renewal quote requested for ${v.plate}`)}>
                    Renew
                  </Button>
                )}
              </div>
            );
          })}
        </div>
      </Panel>
    </PageContainer>
  );
}
