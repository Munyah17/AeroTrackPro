"use client";

import { useMemo } from "react";
import Link from "next/link";
import {
  ArrowRight,
  BadgeCheck,
  Eye,
  MousePointerClick,
  Smartphone,
} from "lucide-react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip as ChartTooltip,
  XAxis,
  YAxis,
} from "recharts";
import { useTenantTable } from "@/hooks/use-live-data";
import { PageContainer, PageHeader, Panel } from "@/components/shared/page";
import { Pill } from "@/components/shared/status";
import { StatCard } from "@/components/shared/stat-card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { timeAgo } from "@/lib/format";

type EventType = "page_view" | "install_tap" | "app_installed";
type Platform = "ios" | "android" | "desktop" | "unknown";

const EVENT_LABEL: Record<EventType, string> = {
  page_view: "Page view",
  install_tap: "Install tap",
  app_installed: "Installed",
};

const EVENT_TONE: Record<EventType, "muted" | "primary" | "success"> = {
  page_view: "muted",
  install_tap: "primary",
  app_installed: "success",
};

const PLATFORM_LABEL: Record<Platform, string> = {
  ios: "iOS",
  android: "Android",
  desktop: "Desktop",
  unknown: "Unknown",
};

const DAY_MS = 86_400_000;

function dayKey(iso: string): string {
  return iso.slice(0, 10);
}

export default function AdminDownloadsPage() {
  const { rows, live, loading } = useTenantTable("pwa_install_events", {
    tenantScoped: false,
    order: "created_at",
    ascending: false,
    limit: 5000,
  });

  const stats = useMemo(() => {
    const counts: Record<EventType, number> = { page_view: 0, install_tap: 0, app_installed: 0 };
    const byPlatform: Record<Platform, Record<EventType, number>> = {
      ios: { page_view: 0, install_tap: 0, app_installed: 0 },
      android: { page_view: 0, install_tap: 0, app_installed: 0 },
      desktop: { page_view: 0, install_tap: 0, app_installed: 0 },
      unknown: { page_view: 0, install_tap: 0, app_installed: 0 },
    };

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const days: { key: string; label: string; page_view: number; install_tap: number; app_installed: number }[] = [];
    for (let i = 13; i >= 0; i--) {
      const d = new Date(today.getTime() - i * DAY_MS);
      days.push({
        key: dayKey(d.toISOString()),
        label: d.toLocaleDateString("en-US", { month: "short", day: "numeric" }),
        page_view: 0,
        install_tap: 0,
        app_installed: 0,
      });
    }
    const dayIndex = new Map(days.map((d, i) => [d.key, i]));

    /* Week-over-week for the trend chip: last 7d vs the 7 before. */
    const cutoff7 = today.getTime() - 7 * DAY_MS;
    const cutoff14 = today.getTime() - 14 * DAY_MS;
    let views7 = 0;
    let viewsPrev7 = 0;

    for (const r of rows) {
      const t = r.event_type as EventType;
      const p = (r.platform as Platform) ?? "unknown";
      if (counts[t] !== undefined) counts[t]++;
      if (byPlatform[p]?.[t] !== undefined) byPlatform[p][t]++;
      const idx = dayIndex.get(dayKey(r.created_at));
      if (idx !== undefined) days[idx]![t]++;
      const ts = new Date(r.created_at).getTime();
      if (t === "page_view") {
        if (ts >= cutoff7) views7++;
        else if (ts >= cutoff14) viewsPrev7++;
      }
    }

    const trend =
      viewsPrev7 > 0 ? Math.round(((views7 - viewsPrev7) / viewsPrev7) * 100) : views7 > 0 ? 100 : 0;

    return { counts, byPlatform, days, trend };
  }, [rows]);

  const recent = rows.slice(0, 50);
  const conversion =
    stats.counts.page_view > 0
      ? Math.round((stats.counts.app_installed / stats.counts.page_view) * 1000) / 10
      : 0;

  return (
    <PageContainer>
      <PageHeader
        title="App Downloads"
        subtitle="PWA install funnel — page visits, install taps and confirmed installs"
        actions={
          <Button render={<Link href="/download" />} variant="outline" className="gap-2 rounded-xl">
            <Smartphone className="size-4" /> Open download page <ArrowRight className="size-3.5" />
          </Button>
        }
      />

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Page visits"
          value={stats.counts.page_view}
          icon={Eye}
          trend={stats.trend}
          trendLabel="vs prior week"
          footer={loading ? "Loading…" : live ? "Last 14 days on chart" : "Live data unavailable"}
          delay={0}
        />
        <StatCard
          label="Install taps"
          value={stats.counts.install_tap}
          icon={MousePointerClick}
          footer="Install button presses"
          delay={0.05}
        />
        <StatCard
          label="Confirmed installs"
          value={stats.counts.app_installed}
          icon={BadgeCheck}
          footer="appinstalled events"
          delay={0.1}
        />
        <StatCard
          label="Visit → install"
          value={conversion}
          decimals={1}
          suffix="%"
          icon={Smartphone}
          footer="Installs per page visit"
          delay={0.15}
        />
      </div>

      <div className="mt-4 grid gap-4 xl:grid-cols-[1.6fr_1fr]">
        {/* 14-day funnel */}
        <Panel className="p-4 sm:p-5">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="text-[14.5px] font-semibold">Last 14 days</h3>
            <div className="flex items-center gap-3 text-[11.5px] text-muted-foreground">
              <span className="flex items-center gap-1.5"><span className="size-2 rounded-full bg-primary" /> Visits</span>
              <span className="flex items-center gap-1.5"><span className="size-2 rounded-full bg-warning" /> Taps</span>
              <span className="flex items-center gap-1.5"><span className="size-2 rounded-full bg-success" /> Installs</span>
            </div>
          </div>
          <div className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={stats.days} margin={{ top: 4, right: 4, bottom: 0, left: -18 }}>
                <defs>
                  <linearGradient id="pv" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#1E40FF" stopOpacity={0.28} />
                    <stop offset="100%" stopColor="#1E40FF" stopOpacity={0.02} />
                  </linearGradient>
                  <linearGradient id="it" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#f59e0b" stopOpacity={0.25} />
                    <stop offset="100%" stopColor="#f59e0b" stopOpacity={0.02} />
                  </linearGradient>
                  <linearGradient id="ai" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#10b981" stopOpacity={0.3} />
                    <stop offset="100%" stopColor="#10b981" stopOpacity={0.02} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="currentColor" className="text-border/50" vertical={false} />
                <XAxis dataKey="label" tick={{ fontSize: 11 }} tickLine={false} axisLine={false} interval={1} />
                <YAxis tick={{ fontSize: 11 }} tickLine={false} axisLine={false} allowDecimals={false} />
                <ChartTooltip
                  contentStyle={{ borderRadius: 12, fontSize: 12 }}
                  labelStyle={{ fontWeight: 600 }}
                />
                <Area type="monotone" dataKey="page_view" name="Visits" stroke="#1E40FF" fill="url(#pv)" strokeWidth={2} />
                <Area type="monotone" dataKey="install_tap" name="Taps" stroke="#f59e0b" fill="url(#it)" strokeWidth={2} />
                <Area type="monotone" dataKey="app_installed" name="Installs" stroke="#10b981" fill="url(#ai)" strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </Panel>

        {/* Platform split */}
        <Panel className="p-4 sm:p-5">
          <h3 className="mb-4 text-[14.5px] font-semibold">By platform</h3>
          <div className="space-y-3">
            {(Object.keys(PLATFORM_LABEL) as Platform[]).map((p) => {
              const c = stats.byPlatform[p];
              const total = c.page_view + c.install_tap + c.app_installed;
              return (
                <div key={p} className="rounded-xl border border-border/50 p-3">
                  <div className="flex items-center justify-between">
                    <span className="text-[13px] font-semibold">{PLATFORM_LABEL[p]}</span>
                    <span className="text-[11.5px] text-muted-foreground">{total} events</span>
                  </div>
                  <div className="mt-2 grid grid-cols-3 gap-2 text-center">
                    {(["page_view", "install_tap", "app_installed"] as EventType[]).map((t) => (
                      <div key={t} className="rounded-lg bg-muted/50 px-2 py-1.5">
                        <div className="text-[14px] font-bold tabular-nums">{c[t]}</div>
                        <div className="text-[10px] font-medium text-muted-foreground">
                          {t === "page_view" ? "Visits" : t === "install_tap" ? "Taps" : "Installs"}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
          <p className="mt-4 text-[11.5px] leading-relaxed text-muted-foreground">
            iOS has no install event — Add to Home Screen installs are only visible as
            page visits. Confirmed installs are most complete on Android/desktop.
          </p>
        </Panel>
      </div>

      {/* Recent events */}
      <Panel className="mt-4 overflow-hidden">
        <div className="flex items-center justify-between px-4 py-3.5 sm:px-5">
          <h3 className="text-[14.5px] font-semibold">Recent events</h3>
          <span className="text-[11.5px] text-muted-foreground">latest {recent.length}</span>
        </div>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="pl-4 sm:pl-5">When</TableHead>
                <TableHead>Event</TableHead>
                <TableHead>Platform</TableHead>
                <TableHead className="pr-4 sm:pr-5">User agent</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {recent.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={4} className="py-10 text-center text-[13px] text-muted-foreground">
                    {loading ? "Loading…" : "No download events yet — share the /download link to start the funnel."}
                  </TableCell>
                </TableRow>
              ) : (
                recent.map((r) => (
                  <TableRow key={r.id}>
                    <TableCell className="pl-4 text-[12.5px] text-muted-foreground sm:pl-5">
                      {timeAgo(r.created_at)}
                    </TableCell>
                    <TableCell>
                      <Pill tone={EVENT_TONE[r.event_type as EventType] ?? "muted"}>
                        {EVENT_LABEL[r.event_type as EventType] ?? r.event_type}
                      </Pill>
                    </TableCell>
                    <TableCell>
                      <Pill tone={r.platform === "ios" ? "muted" : r.platform === "android" ? "primary" : "info"}>
                        {PLATFORM_LABEL[r.platform as Platform] ?? r.platform}
                      </Pill>
                    </TableCell>
                    <TableCell className="max-w-[280px] truncate pr-4 font-mono text-[11px] text-muted-foreground sm:pr-5">
                      {r.user_agent ?? "—"}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </Panel>
    </PageContainer>
  );
}
