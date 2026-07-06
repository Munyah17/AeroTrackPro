"use client";

import { useMemo, useState } from "react";
import { CalendarClock, CircleCheck, Clock4, Plus, Wrench } from "lucide-react";
import { toast } from "sonner";
import { maintenance, vehicleById } from "@aerotrack/shared";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { PageContainer, PageHeader, Panel } from "@/components/shared/page";
import { Pill } from "@/components/shared/status";
import { StatCard } from "@/components/shared/stat-card";
import { shortDate, usd } from "@/lib/format";

type Tab = "upcoming" | "overdue" | "completed";

export default function MaintenancePage() {
  const [tab, setTab] = useState<Tab>("upcoming");
  const rows = useMemo(() => maintenance.filter((m) => m.status === tab), [tab]);
  const counts = {
    upcoming: maintenance.filter((m) => m.status === "upcoming").length,
    overdue: maintenance.filter((m) => m.status === "overdue").length,
    completed: maintenance.filter((m) => m.status === "completed").length,
  };
  const totalCost = maintenance.reduce((n, m) => n + (m.costUsd ?? 0), 0);

  return (
    <PageContainer className="max-w-[1100px]">
      <PageHeader
        title="Maintenance"
        subtitle="Schedules, alerts and service history"
        actions={
          <Button className="gap-2 rounded-xl shadow-card" onClick={() => toast.info("Maintenance scheduling form coming in this build")}>
            <Plus className="size-4" /> Add Maintenance
          </Button>
        }
      />

      <div className="mb-5 grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard label="Upcoming" value={counts.upcoming} icon={CalendarClock} />
        <StatCard label="Overdue" value={counts.overdue} icon={Clock4} iconClassName="bg-destructive/10 text-destructive" delay={0.05} />
        <StatCard label="Completed" value={counts.completed} icon={CircleCheck} iconClassName="bg-success/10 text-success" delay={0.1} />
        <StatCard label="Total Cost" value={totalCost} suffix="USD" icon={Wrench} delay={0.15} />
      </div>

      <Tabs value={tab} onValueChange={(v) => setTab(v as Tab)}>
        <TabsList className="mb-4 h-10 rounded-xl p-1">
          {(["upcoming", "overdue", "completed"] as const).map((t) => (
            <TabsTrigger key={t} value={t} className="rounded-lg px-4 text-[13px] capitalize">
              {t} ({counts[t]})
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>

      <div className="flex flex-col gap-2.5">
        {rows.map((m) => {
          const v = vehicleById(m.vehicleId);
          return (
            <Panel key={m.id} hover className="flex flex-wrap items-center gap-4 p-4">
              <div className="flex size-11 items-center justify-center rounded-xl bg-primary/10 text-primary">
                <Wrench className="size-5" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-[14px] font-semibold">{v?.plate}</span>
                  <span className="text-[13.5px]">{m.title}</span>
                  <Pill tone={m.status === "overdue" ? "danger" : m.status === "completed" ? "success" : "info"}>
                    {m.status}
                  </Pill>
                </div>
                <div className="mt-0.5 text-[12.5px] text-muted-foreground">
                  {m.status === "completed" ? "Completed" : "Due"} {shortDate(m.dueDate)}
                  {m.costUsd ? ` · Est. ${usd(m.costUsd)}` : ""}
                  {m.notes ? ` · ${m.notes}` : ""}
                </div>
              </div>
              {m.status !== "completed" && (
                <Button
                  variant="outline"
                  size="sm"
                  className="rounded-xl"
                  onClick={() => toast.success(`${m.title} marked complete`)}
                >
                  Mark complete
                </Button>
              )}
            </Panel>
          );
        })}
        {rows.length === 0 && (
          <Panel className="p-12 text-center text-sm text-muted-foreground">Nothing here.</Panel>
        )}
      </div>
    </PageContainer>
  );
}
