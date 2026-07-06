"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { motion } from "framer-motion";
import {
  AlertTriangle,
  ArrowRight,
  Bell,
  Car,
  Fuel,
  Gauge,
  Hexagon,
  Navigation,
  Route,
  ShieldCheck,
  TrendingUp,
  Wrench,
} from "lucide-react";
import {
  Bar,
  BarChart,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip as ChartTooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  alerts,
  fleetStats,
  maintenance,
  vehicles,
  weeklyDistance,
} from "@aerotrack/shared";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { PageContainer, Panel } from "@/components/shared/page";
import { StatCard } from "@/components/shared/stat-card";
import { VehicleStatusChip } from "@/components/shared/status";
import { timeAgo, km } from "@/lib/format";

const FleetMap = dynamic(() => import("@/components/map/fleet-map").then((m) => m.FleetMap), {
  ssr: false,
  loading: () => <Skeleton className="h-full w-full rounded-2xl" />,
});

const ALERT_ICONS: Record<string, typeof Bell> = {
  overspeed: Gauge,
  lowFuel: Fuel,
  geofenceExit: Hexagon,
  geofenceEnter: Hexagon,
  maintenanceDue: Wrench,
  sos: AlertTriangle,
};

export default function DashboardPage() {
  const stats = fleetStats();
  const donut = [
    { name: "Moving", value: stats.moving, color: "var(--chart-1)" },
    { name: "Stopped", value: stats.stopped, color: "oklch(0.72 0.09 262)" },
    { name: "Idle", value: stats.idle, color: "oklch(0.85 0.05 262)" },
    { name: "Offline", value: stats.offline, color: "oklch(0.93 0.015 262)" },
  ];
  const activeAlerts = alerts.filter((a) => a.status === "active").slice(0, 4);
  const topVehicles = [...vehicles]
    .filter((v) => ["car", "truck", "suv", "pickup", "bus"].includes(v.kind))
    .slice(0, 4);
  const upcoming = maintenance.filter((m) => m.status !== "completed").slice(0, 3);

  return (
    <PageContainer>
      {/* Greeting */}
      <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-[26px] font-bold tracking-tight">
            Welcome back, Munya <span className="align-middle">👋</span>
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Here&apos;s what&apos;s happening with your fleet today.
          </p>
        </div>
        <Button render={<Link href="/tracking" />} className="gap-2 rounded-xl shadow-card">
          <Navigation className="size-4" /> Open Live Tracking
        </Button>
      </div>

      {/* KPI row */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Total Vehicles" value={stats.total} icon={Car} trend={8} trendLabel="this month" />
        <StatCard
          label="Vehicles On Track"
          value={stats.moving}
          icon={Navigation}
          footer={`${stats.onTrackPct}% of fleet moving`}
          delay={0.05}
        />
        <StatCard
          label="Active Alerts"
          value={stats.activeAlerts}
          icon={Bell}
          iconClassName="bg-destructive/10 text-destructive"
          footer={<Link href="/alerts" className="font-medium text-primary">View all alerts</Link>}
          delay={0.1}
        />
        <StatCard
          label="Avg. Daily Distance"
          value={stats.avgDailyDistanceKm}
          decimals={1}
          suffix="km"
          icon={TrendingUp}
          trend={12.5}
          trendLabel="vs yesterday"
          delay={0.15}
        />
      </div>

      {/* Map + alerts */}
      <div className="mt-4 grid grid-cols-1 gap-4 xl:grid-cols-3">
        <Panel className="relative overflow-hidden xl:col-span-2">
          <div className="flex items-center justify-between px-5 py-4">
            <h3 className="text-[15px] font-semibold">Live Tracking</h3>
            <span className="flex items-center gap-1.5 text-xs font-medium text-success">
              <span className="size-2 animate-pulse rounded-full bg-success" /> Live
            </span>
          </div>
          <div className="relative h-[380px]">
            <FleetMap vehicles={vehicles.slice(0, 12)} />
            <Button
              render={<Link href="/tracking" />}
              variant="secondary"
              size="sm"
              className="absolute bottom-4 left-4 z-10 gap-1.5 rounded-xl bg-card shadow-float"
            >
              View full map <ArrowRight className="size-3.5" />
            </Button>
          </div>
        </Panel>

        <Panel className="flex flex-col">
          <div className="flex items-center justify-between px-5 py-4">
            <h3 className="text-[15px] font-semibold">Recent Alerts</h3>
            <Link href="/alerts" className="text-[13px] font-medium text-primary hover:underline">
              View all
            </Link>
          </div>
          <div className="flex flex-1 flex-col gap-1 px-3 pb-3">
            {activeAlerts.map((a, i) => {
              const Icon = ALERT_ICONS[a.type] ?? Bell;
              return (
                <motion.div
                  key={a.id}
                  initial={{ opacity: 0, x: 10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.1 + i * 0.06 }}
                >
                  <Link
                    href="/alerts"
                    className="flex items-start gap-3 rounded-xl p-2.5 transition-colors hover:bg-accent/60"
                  >
                    <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-destructive/10 text-destructive">
                      <Icon className="size-4" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-2">
                        <span className="truncate text-[13.5px] font-semibold">{a.title}</span>
                        <span className="shrink-0 text-[11px] text-muted-foreground">{timeAgo(a.createdAt)}</span>
                      </div>
                      <p className="mt-0.5 line-clamp-1 text-xs text-muted-foreground">{a.message}</p>
                    </div>
                  </Link>
                </motion.div>
              );
            })}
            <div className="mt-auto px-2.5 pt-2">
              {upcoming.map((m) => (
                <div key={m.id} className="flex items-center gap-3 border-t border-border/60 py-2.5">
                  <Wrench className="size-4 shrink-0 text-warning-foreground" />
                  <span className="truncate text-xs text-muted-foreground">{m.title}</span>
                  <span className="ml-auto shrink-0 text-[11px] font-medium text-muted-foreground">
                    {timeAgo(m.dueDate)}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </Panel>
      </div>

      {/* Bottom row */}
      <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-2 xl:grid-cols-3">
        {/* Fleet overview donut */}
        <Panel className="p-5">
          <h3 className="text-[15px] font-semibold">Fleet Overview</h3>
          <div className="mt-2 flex items-center gap-4">
            <div className="relative h-44 w-44 shrink-0">
              <ResponsiveContainer>
                <PieChart>
                  <Pie
                    data={donut}
                    dataKey="value"
                    innerRadius={56}
                    outerRadius={80}
                    paddingAngle={2}
                    strokeWidth={0}
                    animationDuration={800}
                  >
                    {donut.map((d) => (
                      <Cell key={d.name} fill={d.color} />
                    ))}
                  </Pie>
                </PieChart>
              </ResponsiveContainer>
              <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-3xl font-bold tabular-nums">{fleetStats().total}</span>
                <span className="text-xs text-muted-foreground">Total</span>
              </div>
            </div>
            <div className="flex flex-col gap-2.5">
              {donut.map((d) => (
                <div key={d.name} className="flex items-center gap-2 text-[13px]">
                  <span className="size-2.5 rounded-full" style={{ background: d.color }} />
                  <span className="font-medium">{d.name}</span>
                  <span className="text-muted-foreground">
                    {d.value} ({Math.round((d.value / fleetStats().total) * 100)}%)
                  </span>
                </div>
              ))}
            </div>
          </div>
        </Panel>

        {/* Weekly distance */}
        <Panel className="p-5">
          <div className="flex items-center justify-between">
            <h3 className="text-[15px] font-semibold">Daily Distance (km)</h3>
            <span className="rounded-lg border px-2.5 py-1 text-xs text-muted-foreground">This Week</span>
          </div>
          <div className="mt-4 h-44">
            <ResponsiveContainer>
              <BarChart data={weeklyDistance} barSize={26}>
                <XAxis dataKey="day" axisLine={false} tickLine={false} fontSize={11} stroke="var(--muted-foreground)" />
                <YAxis axisLine={false} tickLine={false} fontSize={11} width={32} stroke="var(--muted-foreground)" />
                <ChartTooltip
                  cursor={{ fill: "var(--accent)" }}
                  contentStyle={{
                    borderRadius: 12,
                    border: "1px solid var(--border)",
                    background: "var(--card)",
                    fontSize: 12,
                  }}
                />
                <Bar dataKey="km" radius={[7, 7, 2, 2]} animationDuration={800}>
                  {weeklyDistance.map((d, i) => (
                    <Cell key={i} fill={d.km === Math.max(...weeklyDistance.map((x) => x.km)) ? "var(--chart-1)" : "oklch(0.85 0.06 262)"} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Panel>

        {/* Top vehicles */}
        <Panel className="p-5 lg:col-span-2 xl:col-span-1">
          <div className="flex items-center justify-between">
            <h3 className="text-[15px] font-semibold">Top Vehicles</h3>
            <Link href="/vehicles" className="text-[13px] font-medium text-primary hover:underline">
              View all
            </Link>
          </div>
          <div className="mt-3 flex flex-col">
            {topVehicles.map((v) => (
              <Link
                key={v.id}
                href={`/vehicles/${v.id}`}
                className="flex items-center gap-3 rounded-xl border-b border-border/50 px-2 py-3 transition-colors last:border-0 hover:bg-accent/60"
              >
                <div className="flex size-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
                  <Route className="size-4" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="truncate text-[13.5px] font-semibold">{v.plate}</div>
                  <div className="truncate text-xs text-muted-foreground">{v.position.address}</div>
                </div>
                <div className="text-right">
                  <div className="text-[13px] font-bold text-primary tabular-nums">
                    {km((v.odometerKm % 400) + 120)}
                  </div>
                  <VehicleStatusChip status={v.status} className="mt-0.5" />
                </div>
              </Link>
            ))}
          </div>
        </Panel>
      </div>

      {/* Insurance strip */}
      <Panel className="mt-4 flex flex-wrap items-center gap-4 p-5">
        <div className="flex size-11 items-center justify-center rounded-xl bg-success/10 text-success">
          <ShieldCheck className="size-5" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="text-[14px] font-semibold">Fleet insurance is 92% compliant</div>
          <p className="text-[13px] text-muted-foreground">
            2 policies expire within 15 days — renew now to stay covered.
          </p>
        </div>
        <Button render={<Link href="/insurance" />} variant="outline" className="rounded-xl">
          Review policies
        </Button>
      </Panel>
    </PageContainer>
  );
}
