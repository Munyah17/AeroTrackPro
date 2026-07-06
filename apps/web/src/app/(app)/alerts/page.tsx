"use client";

import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import {
  AlertTriangle,
  Battery,
  Bell,
  Check,
  CheckCheck,
  Flame,
  Fuel,
  Gauge,
  Hexagon,
  Radio,
  ShieldCheck,
  Thermometer,
  Timer,
  Wrench,
} from "lucide-react";
import { toast } from "sonner";
import { alerts as allAlerts, vehicleById, type FleetAlert } from "@aerotrack/shared";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { PageContainer, PageHeader, Panel } from "@/components/shared/page";
import { AlertStatusChip, SeverityChip } from "@/components/shared/status";
import { cn } from "@/lib/utils";
import { timeAgo } from "@/lib/format";

const TYPE_ICONS: Record<FleetAlert["type"], typeof Bell> = {
  overspeed: Gauge,
  lowFuel: Fuel,
  geofenceEnter: Hexagon,
  geofenceExit: Hexagon,
  maintenanceDue: Wrench,
  harshBraking: AlertTriangle,
  harshAcceleration: AlertTriangle,
  batteryDisconnected: Battery,
  lowBattery: Battery,
  sos: Flame,
  powerCut: Battery,
  deviceOffline: Radio,
  insuranceExpiry: ShieldCheck,
  crash: AlertTriangle,
  idle: Timer,
  temperature: Thermometer,
  fuelTheft: Fuel,
};

type Tab = "all" | "active" | "acknowledged" | "resolved";

export default function AlertsPage() {
  const [tab, setTab] = useState<Tab>("all");
  const [acked, setAcked] = useState<Set<string>>(new Set());

  const rows = useMemo(() => {
    const withLocal = allAlerts.map((a) =>
      acked.has(a.id) ? { ...a, status: "acknowledged" as const } : a,
    );
    if (tab === "all") return withLocal;
    return withLocal.filter((a) => a.status === tab);
  }, [tab, acked]);

  const counts = {
    all: allAlerts.length,
    active: allAlerts.filter((a) => a.status === "active" && !acked.has(a.id)).length,
    acknowledged: allAlerts.filter((a) => a.status === "acknowledged" || acked.has(a.id)).length,
    resolved: allAlerts.filter((a) => a.status === "resolved").length,
  };

  return (
    <PageContainer className="max-w-[1100px]">
      <PageHeader
        title="Alerts"
        subtitle="Monitor all alerts and notifications in real time"
        actions={
          <Button
            variant="outline"
            className="gap-2 rounded-xl"
            onClick={() => {
              setAcked(new Set(allAlerts.filter((a) => a.status === "active").map((a) => a.id)));
              toast.success("All active alerts acknowledged");
            }}
          >
            <CheckCheck className="size-4" /> Acknowledge all
          </Button>
        }
      />

      <Tabs value={tab} onValueChange={(v) => setTab(v as Tab)}>
        <TabsList className="mb-4 h-10 rounded-xl p-1">
          {(["all", "active", "acknowledged", "resolved"] as const).map((t) => (
            <TabsTrigger key={t} value={t} className="rounded-lg px-4 text-[13px] capitalize">
              {t} <span className="ml-1.5 text-[11px] text-muted-foreground">({counts[t]})</span>
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>

      <div className="flex flex-col gap-2.5">
        {rows.map((a, i) => {
          const Icon = TYPE_ICONS[a.type];
          const vehicle = vehicleById(a.vehicleId);
          return (
            <motion.div
              key={a.id}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: Math.min(i * 0.04, 0.4) }}
            >
              <Panel hover className="flex items-center gap-4 p-4">
                <div
                  className={cn(
                    "flex size-11 shrink-0 items-center justify-center rounded-xl",
                    a.severity === "critical"
                      ? "bg-destructive/10 text-destructive"
                      : a.severity === "warning"
                        ? "bg-warning/15 text-warning-foreground"
                        : "bg-info/10 text-info",
                  )}
                >
                  <Icon className="size-5" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-[14px] font-semibold">{a.title}</span>
                    <SeverityChip severity={a.severity} />
                    <AlertStatusChip status={a.status} />
                  </div>
                  <p className="mt-0.5 truncate text-[13px] text-muted-foreground">{a.message}</p>
                  <div className="mt-1 text-[11.5px] text-muted-foreground/80">
                    {vehicle?.name} · {timeAgo(a.createdAt)}
                  </div>
                </div>
                {a.status === "active" && (
                  <Button
                    variant="outline"
                    size="sm"
                    className="shrink-0 gap-1.5 rounded-xl"
                    onClick={() => {
                      setAcked((prev) => new Set(prev).add(a.id));
                      toast.success(`Alert acknowledged — ${a.title}`);
                    }}
                  >
                    <Check className="size-3.5" /> Acknowledge
                  </Button>
                )}
              </Panel>
            </motion.div>
          );
        })}
        {rows.length === 0 && (
          <Panel className="p-12 text-center text-sm text-muted-foreground">No alerts in this view.</Panel>
        )}
      </div>
    </PageContainer>
  );
}
