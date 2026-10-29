"use client";

import Link from "next/link";
import { Building2, CircleDollarSign, Radio, TrendingUp, Wallet } from "lucide-react";
import {
  Area,
  AreaChart,
  ResponsiveContainer,
  Tooltip as ChartTooltip,
  XAxis,
  YAxis,
} from "recharts";
import { PageContainer, PageHeader, Panel } from "@/components/shared/page";
import { Pill } from "@/components/shared/status";
import { useBrand } from "@/components/shell/brand-provider";
import { defaultSms, subdomainHost } from "@/lib/brand";
import { Button } from "@/components/ui/button";
import { computeResellerBill } from "@/lib/reseller";
import { useResellerClients } from "@/hooks/use-platform-data";
import { usd } from "@/lib/format";

const DEVICE_TREND = [
  { m: "Feb", d: 118 }, { m: "Mar", d: 132 }, { m: "Apr", d: 150 },
  { m: "May", d: 161 }, { m: "Jun", d: 172 }, { m: "Jul", d: 181 },
];

export default function ResellerOverviewPage() {
  const { rows: clients } = useResellerClients();
  const { brand } = useBrand();
  const connected = brand.domains.find((domain) => domain.status === "active");
  const sender = defaultSms(brand);
  const bill = computeResellerBill(clients);
  const activeClients = clients.filter((c) => c.status === "active").length;

  const stats = [
    { label: "Clients", value: clients.length, sub: `${activeClients} active`, icon: Building2 },
    { label: "Active devices", value: bill.activeDevices, sub: `${bill.totalDevices} total`, icon: Radio },
    { label: "Your monthly bill", value: usd(bill.monthlyTotal), sub: "billed to you", icon: Wallet },
    { label: "Est. margin", value: usd(bill.activeDevices * 4.5 - bill.monthlyTotal), sub: "at $7/device retail", icon: TrendingUp },
  ];

  return (
    <PageContainer>
      <PageHeader
        title="Reseller Overview"
        subtitle="Admin portal for the tracking service you provide to your clients"
        actions={
          <Button render={<Link href="/reseller/billing" />} className="gap-2 rounded-xl shadow-card">
            <CircleDollarSign className="size-4" /> View billing
          </Button>
        }
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {stats.map((s) => (
          <Panel key={s.label} className="p-4">
            <div className="flex items-center gap-2 text-muted-foreground">
              <s.icon className="size-4" />
              <span className="text-[12px]">{s.label}</span>
            </div>
            <div className="mt-1.5 text-2xl font-bold tabular-nums">{s.value}</div>
            <div className="text-[11.5px] text-muted-foreground">{s.sub}</div>
          </Panel>
        ))}
      </div>

      <Panel className="mt-4 flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <div className="text-[14px] font-semibold">Client-facing brand</div>
          <p className="truncate text-[12.5px] text-muted-foreground">
            {brand.name} · {subdomainHost(brand.slug)}
            {connected ? ` · ${connected.host}` : ""}
            {sender ? ` · SMS ${sender.senderId}` : ""}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" className="rounded-xl" render={<Link href="/reseller/branding" />}>
            Edit brand
          </Button>
          <Button variant="outline" className="rounded-xl" render={<Link href="/site" />}>
            View site
          </Button>
        </div>
      </Panel>

      <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Panel className="p-5 lg:col-span-2">
          <h3 className="text-[15px] font-semibold">Devices under management</h3>
          <div className="mt-4 h-64">
            <ResponsiveContainer>
              <AreaChart data={DEVICE_TREND}>
                <defs>
                  <linearGradient id="devFill" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="var(--chart-1)" stopOpacity={0.22} />
                    <stop offset="100%" stopColor="var(--chart-1)" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <XAxis dataKey="m" axisLine={false} tickLine={false} fontSize={11} stroke="var(--muted-foreground)" />
                <YAxis axisLine={false} tickLine={false} fontSize={11} width={32} stroke="var(--muted-foreground)" />
                <ChartTooltip contentStyle={{ borderRadius: 12, border: "1px solid var(--border)", background: "var(--card)", fontSize: 12 }} />
                <Area type="monotone" dataKey="d" stroke="var(--chart-1)" strokeWidth={2.5} fill="url(#devFill)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </Panel>

        <Panel className="p-5">
          <h3 className="text-[15px] font-semibold">Top clients</h3>
          <div className="mt-3 space-y-2.5">
            {[...clients].sort((a, b) => b.devices - a.devices).slice(0, 5).map((c) => (
              <Link
                key={c.id}
                href="/reseller/clients"
                className="flex items-center justify-between rounded-xl border border-border/60 px-3 py-2.5 transition-colors hover:bg-accent/50"
              >
                <div className="min-w-0">
                  <div className="truncate text-[13px] font-medium">{c.name}</div>
                  <div className="text-[11px] text-muted-foreground">{c.devices} devices</div>
                </div>
                <Pill tone={c.status === "active" ? "success" : c.status === "trial" ? "warning" : "danger"}>
                  {c.status}
                </Pill>
              </Link>
            ))}
          </div>
        </Panel>
      </div>
    </PageContainer>
  );
}
