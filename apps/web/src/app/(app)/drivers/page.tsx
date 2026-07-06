"use client";

import { useMemo, useState } from "react";
import { Phone, Plus, Search, ShieldAlert, Star, TrendingUp } from "lucide-react";
import { toast } from "sonner";
import { drivers, vehicleById } from "@aerotrack/shared";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { PageContainer, PageHeader, Panel } from "@/components/shared/page";
import { Pill } from "@/components/shared/status";
import { km } from "@/lib/format";

const RISK_TONE = { low: "success", medium: "warning", high: "danger" } as const;

export default function DriversPage() {
  const [query, setQuery] = useState("");
  const rows = useMemo(
    () =>
      drivers.filter(
        (d) => !query || d.name.toLowerCase().includes(query.toLowerCase()),
      ),
    [query],
  );

  return (
    <PageContainer>
      <PageHeader
        title="Drivers"
        subtitle="Manage drivers, scores and vehicle assignments"
        actions={
          <Button className="gap-2 rounded-xl shadow-card" onClick={() => toast.info("Driver onboarding form coming in this build")}>
            <Plus className="size-4" /> Add Driver
          </Button>
        }
      />

      <div className="relative mb-4 w-full max-w-xs">
        <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search drivers..."
          className="h-10 rounded-xl bg-card pl-9 text-[13px] shadow-card"
        />
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
        {rows.map((d) => {
          const vehicle = vehicleById(d.assignedVehicleId ?? "");
          return (
            <Panel key={d.id} hover className="p-5">
              <div className="flex items-start gap-3.5">
                <Avatar className="size-12">
                  <AvatarFallback className="bg-primary/10 text-[14px] font-bold text-primary">
                    {d.name.split(" ").map((n) => n[0]).join("")}
                  </AvatarFallback>
                </Avatar>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-2">
                    <span className="truncate text-[14.5px] font-semibold">{d.name}</span>
                    <Pill tone={d.status === "active" ? "success" : "muted"}>{d.status}</Pill>
                  </div>
                  <div className="mt-0.5 flex items-center gap-1.5 text-[12px] text-muted-foreground">
                    <Phone className="size-3" /> {d.phone}
                  </div>
                </div>
              </div>

              <div className="mt-4">
                <div className="flex items-center justify-between text-[12px]">
                  <span className="flex items-center gap-1.5 font-medium">
                    <Star className="size-3.5 fill-warning text-warning" /> Behavior Score
                  </span>
                  <span className="font-bold tabular-nums">{d.behaviorScore}/100</span>
                </div>
                <Progress value={d.behaviorScore} className="mt-1.5 h-2" />
              </div>

              <div className="mt-4 grid grid-cols-3 gap-2 rounded-xl border border-border/60 p-3 text-center">
                <div>
                  <div className="text-[15px] font-bold tabular-nums">{d.tripsThisMonth}</div>
                  <div className="text-[10.5px] text-muted-foreground">Trips</div>
                </div>
                <div>
                  <div className="text-[15px] font-bold tabular-nums">{km(d.distanceThisMonthKm)}</div>
                  <div className="text-[10.5px] text-muted-foreground">Distance</div>
                </div>
                <div className="flex flex-col items-center">
                  <Pill tone={RISK_TONE[d.riskLevel]}>
                    <ShieldAlert className="mr-1 size-3" /> {d.riskLevel}
                  </Pill>
                  <div className="mt-0.5 text-[10.5px] text-muted-foreground">Risk</div>
                </div>
              </div>

              <div className="mt-3.5 flex items-center justify-between text-[12.5px]">
                <span className="text-muted-foreground">Assigned vehicle</span>
                {vehicle ? (
                  <span className="font-semibold">{vehicle.plate}</span>
                ) : (
                  <Button
                    size="xs"
                    variant="outline"
                    className="rounded-lg"
                    onClick={() => toast.info(`Assignment dialog for ${d.name}`)}
                  >
                    <TrendingUp className="size-3" /> Assign
                  </Button>
                )}
              </div>
            </Panel>
          );
        })}
      </div>
    </PageContainer>
  );
}
