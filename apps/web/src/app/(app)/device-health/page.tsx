"use client";

import { Activity, BatteryWarning, RadioTower, WifiOff } from "lucide-react";
import { deviceHealth, vehicleById } from "@aerotrack/shared";
import { getDeviceModel } from "@aerotrack/protocols";
import { Progress } from "@/components/ui/progress";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { PageContainer, PageHeader, Panel } from "@/components/shared/page";
import { Pill } from "@/components/shared/status";
import { StatCard } from "@/components/shared/stat-card";
import { cn } from "@/lib/utils";
import { timeAgo } from "@/lib/format";

export default function DeviceHealthPage() {
  const online = deviceHealth.filter((d) => d.online).length;
  const offline = deviceHealth.length - online;
  const lowBattery = deviceHealth.filter((d) => (d.backupBatteryPct ?? 100) < 30).length;

  return (
    <PageContainer>
      <PageHeader title="Device Health" subtitle="Connectivity, battery, SIM and firmware status in real time" />

      <div className="mb-4 grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard label="Devices" value={deviceHealth.length} icon={RadioTower} />
        <StatCard label="Online" value={online} icon={Activity} iconClassName="bg-success/10 text-success" delay={0.05} />
        <StatCard label="Offline" value={offline} icon={WifiOff} iconClassName="bg-destructive/10 text-destructive" delay={0.1} />
        <StatCard label="Low Battery" value={lowBattery} icon={BatteryWarning} iconClassName="bg-warning/15 text-warning-foreground" delay={0.15} />
      </div>

      <Panel>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead className="pl-5">Vehicle / Device</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>SIM</TableHead>
                <TableHead>Signal</TableHead>
                <TableHead>Backup Battery</TableHead>
                <TableHead>GPS Accuracy</TableHead>
                <TableHead>Firmware</TableHead>
                <TableHead className="pr-5 text-right">Health</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {deviceHealth.map((d) => {
                const v = vehicleById(d.vehicleId);
                const model = v ? getDeviceModel(v.deviceModelId) : undefined;
                return (
                  <TableRow key={d.vehicleId}>
                    <TableCell className="pl-5">
                      <div className="text-[13px] font-semibold">{v?.plate}</div>
                      <div className="text-[11.5px] text-muted-foreground">
                        {model?.vendor} {model?.model} · {model?.protocol.toUpperCase()}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Pill tone={d.online ? "success" : "danger"}>{d.online ? "Online" : "Offline"}</Pill>
                      <div className="mt-0.5 text-[10.5px] text-muted-foreground">{timeAgo(d.lastSeen)}</div>
                    </TableCell>
                    <TableCell>
                      <Pill tone={d.simStatus === "active" ? "success" : "warning"}>{d.simStatus}</Pill>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Progress value={d.signal} className="h-1.5 w-16" />
                        <span className="text-[11.5px] text-muted-foreground tabular-nums">{d.signal}%</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <span
                        className={cn(
                          "text-[12.5px] font-semibold tabular-nums",
                          (d.backupBatteryPct ?? 100) < 30 ? "text-destructive" : "text-foreground",
                        )}
                      >
                        {d.backupBatteryPct}%
                      </span>
                      {d.charging && <span className="ml-1 text-[10.5px] text-success">charging</span>}
                    </TableCell>
                    <TableCell className="text-[12.5px] tabular-nums">±{d.gpsAccuracyM} m · {d.satellites} sats</TableCell>
                    <TableCell className="text-[12.5px]">{d.firmware}</TableCell>
                    <TableCell className="pr-5 text-right">
                      <span
                        className={cn(
                          "text-[14px] font-bold tabular-nums",
                          d.healthScore >= 80 ? "text-success" : d.healthScore >= 55 ? "text-warning-foreground" : "text-destructive",
                        )}
                      >
                        {d.healthScore}
                      </span>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      </Panel>
    </PageContainer>
  );
}
