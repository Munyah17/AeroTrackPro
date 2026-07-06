"use client";

import Link from "next/link";
import { Building2, CreditCard, LifeBuoy, Radio, TrendingUp, Users } from "lucide-react";
import {
  Area,
  AreaChart,
  ResponsiveContainer,
  Tooltip as ChartTooltip,
  XAxis,
  YAxis,
} from "recharts";
import { tenants, tickets, invoices } from "@aerotrack/shared";
import { PageContainer, PageHeader, Panel } from "@/components/shared/page";
import { Pill } from "@/components/shared/status";
import { StatCard } from "@/components/shared/stat-card";
import { usd, timeAgo } from "@/lib/format";

const MRR_TREND = [
  { m: "Jan", mrr: 640 }, { m: "Feb", mrr: 720 }, { m: "Mar", mrr: 810 },
  { m: "Apr", mrr: 905 }, { m: "May", mrr: 1015 }, { m: "Jun", mrr: 1116 }, { m: "Jul", mrr: 1215 },
];

export default function AdminOverviewPage() {
  const mrr = tenants.reduce((n, t) => n + t.mrrUsd, 0);
  const devices = tenants.reduce((n, t) => n + t.vehicleCount, 0);
  const openTickets = tickets.filter((t) => t.status !== "closed").length;
  const overdue = invoices.filter((i) => i.status === "overdue").length;

  return (
    <PageContainer>
      <PageHeader title="Platform Overview" subtitle="Your white-label tracking business at a glance" />

      <div className="grid grid-cols-2 gap-4 xl:grid-cols-4">
        <StatCard label="Client Organizations" value={tenants.length} icon={Building2} trend={2} trendLabel="this quarter" />
        <StatCard label="Monthly Recurring Revenue" value={mrr} suffix="USD" icon={CreditCard} trend={9.8} trendLabel="MoM" delay={0.05} />
        <StatCard label="Devices Online" value={devices} icon={Radio} delay={0.1} />
        <StatCard label="Open Tickets" value={openTickets} icon={LifeBuoy} iconClassName="bg-warning/15 text-warning-foreground" delay={0.15} />
      </div>

      <div className="mt-4 grid grid-cols-1 gap-4 xl:grid-cols-3">
        <Panel className="p-5 xl:col-span-2">
          <div className="flex items-center gap-2">
            <TrendingUp className="size-4.5 text-primary" />
            <h3 className="text-[15px] font-semibold">MRR Growth (USD)</h3>
          </div>
          <div className="mt-4 h-64">
            <ResponsiveContainer>
              <AreaChart data={MRR_TREND}>
                <defs>
                  <linearGradient id="mrrFill" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="var(--chart-1)" stopOpacity={0.25} />
                    <stop offset="100%" stopColor="var(--chart-1)" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <XAxis dataKey="m" axisLine={false} tickLine={false} fontSize={11} stroke="var(--muted-foreground)" />
                <YAxis axisLine={false} tickLine={false} fontSize={11} width={44} stroke="var(--muted-foreground)" />
                <ChartTooltip contentStyle={{ borderRadius: 12, border: "1px solid var(--border)", background: "var(--card)", fontSize: 12 }} />
                <Area type="monotone" dataKey="mrr" stroke="var(--chart-1)" strokeWidth={2.5} fill="url(#mrrFill)" animationDuration={900} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </Panel>

        <Panel className="overflow-hidden">
          <div className="flex items-center justify-between border-b border-border/60 px-5 py-4">
            <h3 className="text-[15px] font-semibold">Clients</h3>
            <Link href="/admin/organizations" className="text-[12.5px] font-medium text-primary hover:underline">Manage</Link>
          </div>
          <div className="divide-y divide-border/50">
            {tenants.map((t) => (
              <div key={t.id} className="flex items-center gap-3 px-5 py-3">
                <div
                  className="flex size-9 items-center justify-center rounded-lg text-[12px] font-bold text-white"
                  style={{ background: t.primaryColor }}
                >
                  {t.name.slice(0, 2).toUpperCase()}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="truncate text-[13px] font-semibold">{t.name}</div>
                  <div className="text-[11px] text-muted-foreground">{t.vehicleCount} vehicles · {usd(t.mrrUsd)}/mo</div>
                </div>
                <Pill tone={t.status === "active" ? "success" : t.status === "trial" ? "info" : "danger"}>{t.status}</Pill>
              </div>
            ))}
          </div>
        </Panel>
      </div>

      <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Panel className="overflow-hidden">
          <div className="flex items-center justify-between border-b border-border/60 px-5 py-4">
            <h3 className="text-[15px] font-semibold">Latest Tickets</h3>
            <Link href="/admin/tickets" className="text-[12.5px] font-medium text-primary hover:underline">All tickets</Link>
          </div>
          <div className="divide-y divide-border/50">
            {tickets.slice(0, 4).map((t) => (
              <div key={t.id} className="flex items-center gap-3 px-5 py-3">
                <div className="min-w-0 flex-1">
                  <div className="truncate text-[13px] font-medium">{t.subject}</div>
                  <div className="text-[11px] text-muted-foreground">{t.id} · {timeAgo(t.createdAt)}</div>
                </div>
                <Pill tone={t.priority === "urgent" || t.priority === "high" ? "danger" : "muted"}>{t.priority}</Pill>
                <Pill tone={t.status === "open" ? "warning" : t.status === "inProgress" ? "info" : "success"}>
                  {t.status === "inProgress" ? "in progress" : t.status}
                </Pill>
              </div>
            ))}
          </div>
        </Panel>

        <Panel className="overflow-hidden">
          <div className="flex items-center justify-between border-b border-border/60 px-5 py-4">
            <h3 className="text-[15px] font-semibold">Billing Health</h3>
            <Link href="/admin/payments" className="text-[12.5px] font-medium text-primary hover:underline">Payments</Link>
          </div>
          <div className="grid grid-cols-3 divide-x divide-border/50 text-center">
            {[
              { label: "Paid (90d)", value: invoices.filter((i) => i.status === "paid").length, tone: "text-success" },
              { label: "Pending", value: invoices.filter((i) => i.status === "pending").length, tone: "text-warning-foreground" },
              { label: "Overdue", value: overdue, tone: "text-destructive" },
            ].map((s) => (
              <div key={s.label} className="px-4 py-6">
                <div className={`text-2xl font-bold tabular-nums ${s.tone}`}>{s.value}</div>
                <div className="mt-1 text-[11.5px] text-muted-foreground">{s.label}</div>
              </div>
            ))}
          </div>
          <div className="border-t border-border/60 px-5 py-3 text-[12px] text-muted-foreground">
            <Users className="mr-1.5 inline size-3.5" />
            {tenants.reduce((n, t) => n + t.userCount, 0)} users across all client portals
          </div>
        </Panel>
      </div>
    </PageContainer>
  );
}
