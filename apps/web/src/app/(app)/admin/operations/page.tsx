"use client";

import Link from "next/link";
import {
  Activity,
  Crosshair,
  MapPin,
  Moon,
  Radio,
  RotateCcw,
  Satellite,
  Send,
  Wifi,
  WifiOff,
} from "lucide-react";
import { toast } from "sonner";
import type { Database } from "@aerotrack/shared";
import { useTenantTable } from "@/hooks/use-live-data";
import { useTenants } from "@/hooks/use-platform-data";
import { PageContainer, PageHeader, Panel } from "@/components/shared/page";
import { Pill } from "@/components/shared/status";
import { StatCard } from "@/components/shared/stat-card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { coords, timeAgo } from "@/lib/format";
import { cn } from "@/lib/utils";

type DeviceRow = Database["public"]["Tables"]["devices"]["Row"];

const ONLINE_WINDOW_MS = 15 * 60_000;

function deviceStatus(d: DeviceRow): "online" | "sleeping" | "offline" | "never" {
  if (d.connection_status === "sleeping") return "sleeping";
  if (!d.last_seen_at) return "never";
  return Date.now() - new Date(d.last_seen_at).getTime() <= ONLINE_WINDOW_MS ? "online" : "offline";
}

const STATUS_META = {
  online: { label: "Online", dot: "bg-success", tone: "success" as const },
  sleeping: { label: "Sleeping", dot: "bg-warning", tone: "warning" as const },
  offline: { label: "Offline", dot: "bg-destructive", tone: "danger" as const },
  never: { label: "Never seen", dot: "bg-muted-foreground/40", tone: "muted" as const },
};

export default function AdminOperationsPage() {
  const { rows: devices } = useTenantTable("devices", {
    tenantScoped: false,
    order: "last_seen_at",
    limit: 1000,
  });
  const { rows: vehicles } = useTenantTable("vehicles", { tenantScoped: false, limit: 1000 });
  const { rows: positions } = useTenantTable("positions", {
    tenantScoped: false,
    order: "recorded_at",
    limit: 200,
  });
  const { rows: commands } = useTenantTable("device_commands", {
    tenantScoped: false,
    order: "created_at",
    limit: 60,
  });
  const { rows: tenants } = useTenants();

  const tenantName = new Map(tenants.map((t) => [t.id, t.name]));
  const vehicleByDevice = new Map(vehicles.filter((v) => v.device_id).map((v) => [v.device_id!, v]));
  const vehicleById = new Map(vehicles.map((v) => [v.id, v]));

  const deviceLabel = (d: DeviceRow) =>
    vehicleByDevice.get(d.id)?.name || d.name || d.imei;

  const counts = { online: 0, sleeping: 0, offline: 0, never: 0 };
  for (const d of devices) counts[deviceStatus(d)]++;

  const protocolCounts = new Map<string, number>();
  for (const d of devices) {
    const p = d.protocol || "unknown";
    protocolCounts.set(p, (protocolCounts.get(p) ?? 0) + 1);
  }
  const protocolMix = [...protocolCounts.entries()].sort((a, b) => b[1] - a[1]);
  const maxProtocol = Math.max(1, ...protocolMix.map(([, n]) => n));

  /* Per-tenant fleet health. */
  const tenantHealth = tenants
    .map((t) => {
      const devs = devices.filter((d) => d.tenant_id === t.id);
      const vehs = vehicles.filter((v) => v.tenant_id === t.id);
      const online = devs.filter((d) => deviceStatus(d) === "online").length;
      const sleeping = devs.filter((d) => deviceStatus(d) === "sleeping").length;
      const offline = devs.filter((d) => deviceStatus(d) === "offline" || deviceStatus(d) === "never").length;
      const lastFix = devs
        .map((d) => d.last_position_at)
        .filter((x): x is string => !!x)
        .sort()
        .at(-1);
      return { tenant: t, devices: devs.length, vehicles: vehs.length, online, sleeping, offline, lastFix };
    })
    .filter((h) => h.devices > 0 || h.vehicles > 0)
    .sort((a, b) => b.devices - a.devices);

  const fixes24h = positions.filter(
    (p) => Date.now() - new Date(p.recorded_at).getTime() <= 24 * 60 * 60_000,
  ).length;
  const pendingCommands = commands.filter((c) => c.status === "pending").length;

  const sendCommand = async (device: DeviceRow, type: "locate" | "reboot") => {
    try {
      const { supabase } = await import("@/lib/supabase");
      const {
        data: { user },
      } = await supabase.auth.getUser();
      const { error } = await supabase.from("device_commands").insert({
        tenant_id: device.tenant_id,
        device_id: device.id,
        command: { type },
        channel: "gprs",
        transport: "ingest",
        requested_by: user?.id ?? null,
        requested_by_name: "Master Admin",
      } as Database["public"]["Tables"]["device_commands"]["Insert"]);
      if (error) throw error;
      toast.success(`${type === "locate" ? "Locate" : "Reboot"} queued for ${deviceLabel(device)}`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to queue command");
    }
  };

  const recentFixes = positions.slice(0, 12);
  const recentCommands = commands.slice(0, 12);

  return (
    <PageContainer>
      <PageHeader
        title="Live Operations"
        subtitle="Cross-tenant fleet instruments — devices, positions and commands"
      />

      {/* Instruments */}
      <div className="grid grid-cols-2 gap-3 xl:grid-cols-6">
        <StatCard compact label="Devices" value={devices.length} icon={Radio} />
        <StatCard compact label="Online now" value={counts.online} icon={Wifi} iconClassName="bg-success/15 text-success" delay={0.03} />
        <StatCard compact label="Offline" value={counts.offline} icon={WifiOff} iconClassName="bg-destructive/15 text-destructive" delay={0.06} />
        <StatCard compact label="Sleeping" value={counts.sleeping} icon={Moon} iconClassName="bg-warning/15 text-warning-foreground" delay={0.09} />
        <StatCard compact label="Fixes (24h)" value={fixes24h} icon={Satellite} delay={0.12} />
        <StatCard compact label="Commands pending" value={pendingCommands} icon={Send} iconClassName="bg-info/15 text-info" delay={0.15} />
      </div>

      <div className="mt-4 grid grid-cols-1 gap-4 xl:grid-cols-3">
        {/* Protocol mix */}
        <Panel className="p-5">
          <h3 className="flex items-center gap-2 text-[15px] font-semibold">
            <Activity className="size-4.5 text-primary" /> Protocol Mix
          </h3>
          <div className="mt-4 space-y-3">
            {protocolMix.length === 0 && (
              <p className="text-[12.5px] text-muted-foreground">No devices registered yet.</p>
            )}
            {protocolMix.map(([proto, n]) => (
              <div key={proto}>
                <div className="flex items-center justify-between text-[12.5px]">
                  <span className="font-medium uppercase">{proto}</span>
                  <span className="tabular-nums text-muted-foreground">{n}</span>
                </div>
                <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-muted">
                  <div
                    className="h-full rounded-full bg-primary"
                    style={{ width: `${(n / maxProtocol) * 100}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </Panel>

        {/* Tenant fleet health */}
        <Panel className="overflow-hidden">
          <div className="border-b border-border/60 px-5 py-4">
            <h3 className="text-[15px] font-semibold">Fleet Health by Organization</h3>
          </div>
          <div className="max-h-72 overflow-y-auto">
            <Table>
              <TableHeader className="sticky top-0 bg-card">
                <TableRow className="hover:bg-transparent">
                  <TableHead>Organization</TableHead>
                  <TableHead className="text-right">Devices</TableHead>
                  <TableHead className="text-right">Online</TableHead>
                  <TableHead className="text-right">Off</TableHead>
                  <TableHead>Last fix</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {tenantHealth.map((h) => (
                  <TableRow key={h.tenant.id}>
                    <TableCell className="max-w-[160px] truncate text-[12.5px] font-medium">
                      {h.tenant.name}
                    </TableCell>
                    <TableCell className="text-right text-[12.5px] tabular-nums">{h.devices}</TableCell>
                    <TableCell className="text-right text-[12.5px] tabular-nums text-success">{h.online}</TableCell>
                    <TableCell className="text-right text-[12.5px] tabular-nums text-destructive">{h.offline}</TableCell>
                    <TableCell className="text-[11.5px] text-muted-foreground">
                      {h.lastFix ? timeAgo(h.lastFix) : "—"}
                    </TableCell>
                  </TableRow>
                ))}
                {tenantHealth.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={5} className="py-8 text-center text-[12.5px] text-muted-foreground">
                      No fleet data yet.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </Panel>

        {/* Recent fixes */}
        <Panel className="overflow-hidden">
          <div className="flex items-center justify-between border-b border-border/60 px-5 py-4">
            <h3 className="text-[15px] font-semibold">Latest Fixes</h3>
            <Link href="/admin/devices" className="text-[12.5px] font-medium text-primary hover:underline">
              All devices
            </Link>
          </div>
          <div className="divide-y divide-border/50">
            {recentFixes.map((p) => {
              const veh = p.vehicle_id ? vehicleById.get(p.vehicle_id) : undefined;
              const dev = devices.find((d) => d.id === p.device_id);
              return (
                <div key={p.id} className="flex items-center gap-3 px-5 py-2.5">
                  <MapPin className="size-4 shrink-0 text-primary" />
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-[12.5px] font-medium">
                      {veh?.name || dev?.name || p.device_id.slice(0, 8)}
                    </div>
                    <div className="truncate text-[11px] text-muted-foreground">
                      {tenantName.get(p.tenant_id) ?? "—"} · {coords(Number(p.lat), Number(p.lng))}
                    </div>
                  </div>
                  <div className="shrink-0 text-right text-[11px] text-muted-foreground">
                    <div className="tabular-nums">{Number(p.speed_kmh ?? 0)} km/h</div>
                    <div>{timeAgo(p.recorded_at)}</div>
                  </div>
                </div>
              );
            })}
            {recentFixes.length === 0 && (
              <div className="p-8 text-center text-[12.5px] text-muted-foreground">No positions yet.</div>
            )}
          </div>
        </Panel>
      </div>

      {/* Live devices + commands */}
      <div className="mt-4 grid grid-cols-1 gap-4 xl:grid-cols-3">
        <Panel className="overflow-hidden xl:col-span-2">
          <div className="flex items-center justify-between border-b border-border/60 px-5 py-4">
            <h3 className="text-[15px] font-semibold">Live Devices</h3>
            <span className="text-[12px] text-muted-foreground">{devices.length} registered</span>
          </div>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader className="sticky top-0 bg-card">
                <TableRow className="hover:bg-transparent">
                  <TableHead>Status</TableHead>
                  <TableHead>Label</TableHead>
                  <TableHead>Organization</TableHead>
                  <TableHead>Protocol</TableHead>
                  <TableHead>Tracker ID</TableHead>
                  <TableHead>Last seen</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {devices.map((d) => {
                  const st = deviceStatus(d);
                  const meta = STATUS_META[st];
                  const veh = vehicleByDevice.get(d.id);
                  return (
                    <TableRow key={d.id}>
                      <TableCell>
                        <span className="flex items-center gap-2">
                          <span className={cn("size-2 rounded-full", meta.dot)} />
                          <Pill tone={meta.tone}>{meta.label}</Pill>
                        </span>
                      </TableCell>
                      <TableCell className="max-w-[180px]">
                        <div className="truncate text-[12.5px] font-semibold">{deviceLabel(d)}</div>
                        {veh && veh.name !== d.name && (
                          <div className="truncate text-[11px] text-muted-foreground">{d.name}</div>
                        )}
                      </TableCell>
                      <TableCell className="max-w-[140px] truncate text-[12px] text-muted-foreground">
                        {tenantName.get(d.tenant_id) ?? "—"}
                      </TableCell>
                      <TableCell>
                        <Pill tone="primary">{(d.protocol || "—").toUpperCase()}</Pill>
                      </TableCell>
                      <TableCell className="font-mono text-[11.5px]">{d.imei}</TableCell>
                      <TableCell className="text-[11.5px] text-muted-foreground">
                        {d.last_seen_at ? timeAgo(d.last_seen_at) : "—"}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1.5">
                          <Button
                            variant="outline"
                            size="sm"
                            className="h-7 gap-1 rounded-lg px-2 text-[11px]"
                            onClick={() => sendCommand(d, "locate")}
                          >
                            <Crosshair className="size-3" /> Locate
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            className="h-7 gap-1 rounded-lg px-2 text-[11px]"
                            onClick={() => sendCommand(d, "reboot")}
                          >
                            <RotateCcw className="size-3" /> Reboot
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
                {devices.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={7} className="py-10 text-center text-[12.5px] text-muted-foreground">
                      No devices registered on the platform yet.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </Panel>

        {/* Recent commands */}
        <Panel className="overflow-hidden">
          <div className="border-b border-border/60 px-5 py-4">
            <h3 className="text-[15px] font-semibold">Recent Commands</h3>
          </div>
          <div className="divide-y divide-border/50">
            {recentCommands.map((c) => {
              const dev = devices.find((d) => d.id === c.device_id);
              const cmd = c.command as { type?: string } | null;
              return (
                <div key={c.id} className="flex items-center gap-3 px-5 py-2.5">
                  <Send className="size-4 shrink-0 text-primary" />
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-[12.5px] font-medium">
                      {cmd?.type ?? "command"} → {dev ? deviceLabel(dev) : c.device_id.slice(0, 8)}
                    </div>
                    <div className="truncate text-[11px] text-muted-foreground">
                      {tenantName.get(c.tenant_id) ?? "—"} · {c.requested_by_name ?? "system"}
                    </div>
                  </div>
                  <Pill
                    tone={
                      c.status === "acked" || c.status === "sent"
                        ? "success"
                        : c.status === "failed"
                          ? "danger"
                          : c.status === "pending"
                            ? "warning"
                            : "muted"
                    }
                  >
                    {c.status}
                  </Pill>
                </div>
              );
            })}
            {recentCommands.length === 0 && (
              <div className="p-8 text-center text-[12.5px] text-muted-foreground">No commands yet.</div>
            )}
          </div>
        </Panel>
      </div>
    </PageContainer>
  );
}
