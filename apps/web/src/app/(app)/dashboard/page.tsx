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
import { useAlerts, useInsurancePolicies, useMaintenanceItems, useTrips } from "@/hooks/use-live-data";
import { useFleet } from "@/hooks/use-fleet";
import { useRole } from "@/components/shell/role-provider";
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

const DAY_MS = 86_400_000;

export default function DashboardPage() {
  const { vehicles } = useFleet();
  const { rows: alerts } = useAlerts();
  const { rows: maintenance } = useMaintenanceItems();
  const { rows: trips } = useTrips();
  const { rows: policies } = useInsurancePolicies();
  const { session } = useRole();
  const firstName = session?.fullName?.trim().split(/\s+/)[0];

  const moving = vehicles.filter((v) => v.status === "moving").length;
  const stats = {
    total: vehicles.length,
    moving,
    stopped: vehicles.filter((v) => v.status === "stopped" || v.status === "parked").length,
    idle: vehicles.filter((v) => v.status === "idle").length,
    offline: vehicles.filter((v) => v.status === "offline").length,
    activeAlerts: alerts.filter((a) => a.status === "active").length,
    onTrackPct: vehicles.length ? Math.round((moving / vehicles.length) * 100) : 0,
  };

  /* Distance stats come from recorded trips only — no estimates. */
  const now = Date.now();
  const distanceLast7d = trips
    .filter((t) => now - new Date(t.startAt).getTime() < 7 * DAY_MS)
    .reduce((s, t) => s + t.distanceKm, 0);
  const distancePrev7d = trips
    .filter((t) => {
      const age = now - new Date(t.startAt).getTime();
      return age >= 7 * DAY_MS && age < 14 * DAY_MS;
    })
    .reduce((s, t) => s + t.distanceKm, 0);
  const avgDailyDistanceKm = distanceLast7d / 7;
  const distanceTrend =
    distancePrev7d > 0 ? Math.round(((distanceLast7d - distancePrev7d) / distancePrev7d) * 100) : undefined;
  const weeklyDistance = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(now - (6 - i) * DAY_MS);
    return { day: d.toLocaleDateString("en-US", { weekday: "short" }), km: 0 };
  });
  for (const t of trips) {
    const ageDays = Math.floor((now - new Date(t.startAt).getTime()) / DAY_MS);
    if (ageDays >= 0 && ageDays < 7) weeklyDistance[6 - ageDays]!.km += t.distanceKm;
  }
  const maxDayKm = Math.max(...weeklyDistance.map((d) => d.km));

  const expiringPolicies = policies.filter((p) => {
    if (p.status !== "active") return false;
    return (new Date(p.expiryDate).getTime() - now) / DAY_MS <= 15;
  });
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
      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-end sm:justify-between">
        <div className="min-w-0">
          <h2 className="text-2xl font-bold tracking-tight sm:text-[26px]">
            Welcome back{firstName ? `, ${firstName}` : ""} <span className="align-middle">👋</span>
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Here&apos;s what&apos;s happening with your fleet today.
          </p>
        </div>
        <Button render={<Link href="/tracking" />} className="gap-2 rounded-xl shadow-card">
          <Navigation className="size-4" /> Open Live Tracking
        </Button>
      </div>

      {/* KPI row — 2 per row on phones, 4 across on wide screens */}
      <div className="grid grid-cols-2 gap-3 sm:gap-4 xl:grid-cols-4">
        <StatCard label="Total Vehicles" value={stats.total} icon={Car} compact />
        <StatCard
          label="Vehicles On Track"
          value={stats.moving}
          icon={Navigation}
          footer={`${stats.onTrackPct}% of fleet moving`}
          delay={0.05}
          compact
        />
        <StatCard
          label="Active Alerts"
          value={stats.activeAlerts}
          icon={Bell}
          iconClassName="bg-destructive/10 text-destructive"
          footer={<Link href="/alerts" className="font-medium text-primary">View all alerts</Link>}
          delay={0.1}
          compact
        />
        <StatCard
          label="Avg. Daily Distance"
          value={avgDailyDistanceKm}
          decimals={1}
          suffix="km"
          icon={TrendingUp}
          trend={distanceTrend}
          trendLabel="vs last week"
          footer={trips.length === 0 ? "No trips recorded yet" : undefined}
          delay={0.15}
          compact
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
                <span className="text-3xl font-bold tabular-nums">{stats.total}</span>
                <span className="text-xs text-muted-foreground">Total</span>
              </div>
            </div>
            <div className="flex flex-col gap-2.5">
              {donut.map((d) => (
                <div key={d.name} className="flex items-center gap-2 text-[13px]">
                  <span className="size-2.5 rounded-full" style={{ background: d.color }} />
                  <span className="font-medium">{d.name}</span>
                  <span className="text-muted-foreground">
                    {d.value} ({stats.total ? Math.round((d.value / stats.total) * 100) : 0}%)
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
            <span className="rounded-lg border px-2.5 py-1 text-xs text-muted-foreground">Last 7 days</span>
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
                    <Cell key={i} fill={d.km === maxDayKm && maxDayKm > 0 ? "var(--chart-1)" : "oklch(0.85 0.06 262)"} />
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
            {topVehicles.length === 0 && (
              <p className="px-2 py-6 text-center text-[13px] text-muted-foreground">
                No road vehicles in the fleet yet.
              </p>
            )}
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
                  <div className="truncate text-[13.5px] font-semibold">{v.name || v.plate}</div>
                  <div className="truncate text-xs text-muted-foreground">{v.position.address}</div>
                </div>
                <div className="text-right">
                  <div className="text-[13px] font-bold text-primary tabular-nums">
                    {km(v.odometerKm ?? 0)}
                  </div>
                  <VehicleStatusChip status={v.status} sleeping={v.sleeping} className="mt-0.5" />
                </div>
              </Link>
            ))}
          </div>
        </Panel>
      </div>

      {/* Insurance strip — only when the tenant actually has policies */}
      {policies.length > 0 && (
        <Panel className="mt-4 flex flex-wrap items-center gap-4 p-5">
          <div className="flex size-11 items-center justify-center rounded-xl bg-success/10 text-success">
            <ShieldCheck className="size-5" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="text-[14px] font-semibold">
              {expiringPolicies.length === 0
                ? `All ${policies.length} insurance ${policies.length === 1 ? "policy is" : "policies are"} current`
                : `${expiringPolicies.length} of ${policies.length} insurance ${policies.length === 1 ? "policy expires" : "policies expire"} within 15 days`}
            </div>
            <p className="text-[13px] text-muted-foreground">
              {expiringPolicies.length === 0
                ? "No renewals due right now."
                : "Renew now to stay covered."}
            </p>
          </div>
          <Button render={<Link href="/insurance" />} variant="outline" className="rounded-xl">
            Review policies
          </Button>
        </Panel>
      )}
    </PageContainer>
  );
}
