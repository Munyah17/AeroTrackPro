"use client";

import { use } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  ArrowLeft,
  Battery,
  Fuel,
  Gauge,
  MapPin,
  Radio,
  Route as RouteIcon,
  Satellite,
  ShieldCheck,
  Signal,
  Timer,
  User,
  Wrench,
} from "lucide-react";
import {
  driverById,
  maintenance,
  trips,
  vehicleById,
} from "@aerotrack/shared";
import { getDeviceModel } from "@aerotrack/protocols";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { PageContainer, Panel } from "@/components/shared/page";
import { Pill, VehicleStatusChip } from "@/components/shared/status";
import { coords, km, kmh, mapLinks, shortDate, shortDateTime, timeAgo } from "@/lib/format";

const FleetMap = dynamic(() => import("@/components/map/fleet-map").then((m) => m.FleetMap), {
  ssr: false,
  loading: () => <Skeleton className="h-full w-full rounded-2xl" />,
});

export default function VehicleDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const vehicle = vehicleById(id);
  if (!vehicle) notFound();

  const driver = driverById(vehicle.driverId);
  const device = getDeviceModel(vehicle.deviceModelId);
  const vehicleTrips = trips.filter((t) => t.vehicleId === vehicle.id).slice(0, 6);
  const lastTrip = vehicleTrips[0];
  const vehicleMaintenance = maintenance.filter((m) => m.vehicleId === vehicle.id);

  return (
    <PageContainer>
      {/* Header */}
      <div className="mb-5 flex flex-wrap items-center gap-3">
        <Button render={<Link href="/vehicles" />} variant="ghost" size="icon" className="rounded-xl">
          <ArrowLeft className="size-4.5" />
        </Button>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2.5">
            <h2 className="text-2xl font-bold tracking-tight">{vehicle.plate}</h2>
            <VehicleStatusChip status={vehicle.status} />
            {vehicle.blocked && <Pill tone="danger">Immobilized</Pill>}
          </div>
          <p className="mt-0.5 text-sm text-muted-foreground">
            {vehicle.name} · {vehicle.make} {vehicle.model} {vehicle.year} · {vehicle.color}
          </p>
        </div>
        <Button render={<Link href="/commands" />} variant="outline" className="rounded-xl">
          Send Command
        </Button>
        <Button render={<Link href="/tracking" />} className="rounded-xl shadow-card">
          Track Live
        </Button>
      </div>

      {/* Quick stats */}
      <div className="mb-4 grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
        {[
          { icon: Gauge, label: "Speed", value: kmh(vehicle.position.speedKmh) },
          { icon: RouteIcon, label: "Odometer", value: `${vehicle.odometerKm.toLocaleString()} km` },
          { icon: Timer, label: "Engine hours", value: `${vehicle.engineHours.toLocaleString()} h` },
          ...(vehicle.fuelLevelPct !== undefined
            ? [{ icon: Fuel, label: "Fuel", value: `${vehicle.fuelLevelPct}%` }]
            : []),
          ...(vehicle.batteryVoltage !== undefined
            ? [{ icon: Battery, label: "Battery", value: `${vehicle.batteryVoltage} V` }]
            : []),
          { icon: Signal, label: "GSM", value: `${vehicle.gsmSignal}%` },
          { icon: Satellite, label: "Satellites", value: String(vehicle.satellites) },
        ]
          .slice(0, 6)
          .map((s) => (
            <Panel key={s.label} className="flex items-center gap-3 p-3.5">
              <s.icon className="size-4.5 text-primary" />
              <div>
                <div className="text-[14px] font-bold tabular-nums">{s.value}</div>
                <div className="text-[11px] text-muted-foreground">{s.label}</div>
              </div>
            </Panel>
          ))}
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
        {/* Map */}
        <Panel className="overflow-hidden xl:col-span-2">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border/60 px-4 py-3.5">
            <div className="flex min-w-0 items-center gap-2">
              <MapPin className="size-4 shrink-0 text-primary" />
              <span className="truncate text-[13.5px] font-medium">{vehicle.position.address}</span>
              <span className="shrink-0 text-[11.5px] text-muted-foreground">{timeAgo(vehicle.position.updatedAt)}</span>
            </div>
            <div className="flex gap-1.5">
              <Button
                render={<a href={mapLinks.google(vehicle.position.lat, vehicle.position.lng)} target="_blank" rel="noreferrer" />}
                size="xs"
                variant="outline"
                className="rounded-lg"
              >
                Google Maps
              </Button>
              <Button
                render={<a href={mapLinks.waze(vehicle.position.lat, vehicle.position.lng)} target="_blank" rel="noreferrer" />}
                size="xs"
                variant="outline"
                className="rounded-lg"
              >
                Waze
              </Button>
            </div>
          </div>
          <div className="h-[380px]">
            <FleetMap
              vehicles={[vehicle]}
              selectedId={vehicle.id}
              path={lastTrip?.path}
              center={[vehicle.position.lng, vehicle.position.lat]}
              zoom={12.5}
            />
          </div>
          <div className="border-t border-border/60 px-4 py-2.5 text-[11.5px] text-muted-foreground">
            {coords(vehicle.position.lat, vehicle.position.lng)}
            {lastTrip && <span> · showing last trip route ({km(lastTrip.distanceKm)})</span>}
          </div>
        </Panel>

        {/* Right column */}
        <div className="flex flex-col gap-4">
          <Panel className="p-5">
            <h3 className="flex items-center gap-2 text-[14px] font-semibold">
              <User className="size-4 text-primary" /> Assignment
            </h3>
            <div className="mt-3 space-y-2 text-[13px]">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Driver</span>
                <span className="font-medium">{driver?.name ?? "Unassigned"}</span>
              </div>
              {driver && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Behavior score</span>
                  <span className="font-medium tabular-nums">{driver.behaviorScore}/100</span>
                </div>
              )}
            </div>
          </Panel>

          <Panel className="p-5">
            <h3 className="flex items-center gap-2 text-[14px] font-semibold">
              <Radio className="size-4 text-primary" /> Device
            </h3>
            <div className="mt-3 space-y-2 text-[13px]">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Model</span>
                <span className="font-medium">{device?.vendor} {device?.model}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Protocol</span>
                <Pill tone="primary">{device?.protocol.toUpperCase()}</Pill>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">IMEI</span>
                <span className="font-mono text-[12px]">{vehicle.imei}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">SIM</span>
                <span className="font-medium">{vehicle.simMsisdn}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Health score</span>
                <span className="font-bold tabular-nums text-success">{vehicle.healthScore}</span>
              </div>
            </div>
          </Panel>

          <Panel className="p-5">
            <h3 className="flex items-center gap-2 text-[14px] font-semibold">
              <ShieldCheck className="size-4 text-primary" /> Compliance
            </h3>
            <div className="mt-3 space-y-2 text-[13px]">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Insurance expiry</span>
                <span className="font-medium">{vehicle.insuranceExpiry ? shortDate(vehicle.insuranceExpiry) : "—"}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">License expiry</span>
                <span className="font-medium">{vehicle.licenseExpiry ? shortDate(vehicle.licenseExpiry) : "—"}</span>
              </div>
            </div>
          </Panel>
        </div>
      </div>

      {/* Trips + maintenance */}
      <div className="mt-4 grid grid-cols-1 gap-4 xl:grid-cols-2">
        <Panel className="overflow-hidden">
          <div className="flex items-center justify-between border-b border-border/60 px-5 py-4">
            <h3 className="text-[14px] font-semibold">Recent Trips</h3>
            <Link href="/trips" className="text-[12.5px] font-medium text-primary hover:underline">All trips</Link>
          </div>
          <div className="divide-y divide-border/50">
            {vehicleTrips.length === 0 && (
              <div className="p-8 text-center text-[13px] text-muted-foreground">No recorded trips yet.</div>
            )}
            {vehicleTrips.map((t) => (
              <div key={t.id} className="flex items-center gap-3 px-5 py-3">
                <RouteIcon className="size-4 shrink-0 text-primary" />
                <div className="min-w-0 flex-1">
                  <div className="truncate text-[12.5px] font-medium">
                    {t.startAddress} → {t.endAddress}
                  </div>
                  <div className="text-[11px] text-muted-foreground">{shortDateTime(t.startAt)}</div>
                </div>
                <div className="text-right text-[12px] tabular-nums">
                  <div className="font-semibold">{km(t.distanceKm)}</div>
                  <div className="text-muted-foreground">{Math.floor(t.durationMin / 60)}h {t.durationMin % 60}m</div>
                </div>
              </div>
            ))}
          </div>
        </Panel>

        <Panel className="overflow-hidden">
          <div className="flex items-center justify-between border-b border-border/60 px-5 py-4">
            <h3 className="text-[14px] font-semibold">Maintenance</h3>
            <Link href="/maintenance" className="text-[12.5px] font-medium text-primary hover:underline">Schedule</Link>
          </div>
          <div className="divide-y divide-border/50">
            {vehicleMaintenance.length === 0 && (
              <div className="p-8 text-center text-[13px] text-muted-foreground">No maintenance scheduled.</div>
            )}
            {vehicleMaintenance.map((m) => (
              <div key={m.id} className="flex items-center gap-3 px-5 py-3">
                <Wrench className="size-4 shrink-0 text-primary" />
                <div className="min-w-0 flex-1">
                  <div className="truncate text-[12.5px] font-medium">{m.title}</div>
                  <div className="text-[11px] text-muted-foreground">Due {shortDate(m.dueDate)}</div>
                </div>
                <Pill tone={m.status === "overdue" ? "danger" : m.status === "completed" ? "success" : "info"}>
                  {m.status}
                </Pill>
              </div>
            ))}
          </div>
        </Panel>
      </div>
    </PageContainer>
  );
}
