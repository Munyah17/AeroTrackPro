"use client";

import { useState } from "react";
import { Plus, Radio } from "lucide-react";
import { toast } from "sonner";
import { useTenants } from "@/hooks/use-platform-data";
import { useTenantTable } from "@/hooks/use-live-data";
import { useFleet } from "@/hooks/use-fleet";
import { getDeviceModel } from "@aerotrack/protocols";
import { vehicleLiveStatus, LIVE_STATUS } from "@/lib/live-status";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { PageContainer, PageHeader, Panel } from "@/components/shared/page";
import { Pill } from "@/components/shared/status";

const PROTOCOLS = [
  { id: "h02", label: "H02 — SinoTrack/TKStar", port: 5013 },
  { id: "gt06", label: "GT06 — Concox/WanWay", port: 5023 },
  { id: "gps103", label: "GPS103 — Coban/Coban clones", port: 5001 },
  { id: "teltonika", label: "Teltonika — FMB/FMC/FMM", port: 5027 },
  { id: "queclink", label: "Queclink — GV/GL series", port: 5004 },
  { id: "meitrack", label: "Meitrack — T series", port: 5020 },
  { id: "jt808", label: "JT808 — Chinese standard", port: 5015 },
  { id: "vt200", label: "VT200 — iStartek", port: 5045 },
  { id: "topflytech", label: "TopFlyTech — T880x", port: 5049 },
  { id: "eelink", label: "EELink — GPT/TK series", port: 5064 },
];

export default function AdminDevicesPage() {
  const { vehicles } = useFleet();
  const { rows: tenants } = useTenants();
  const { insert } = useTenantTable("devices", { tenantScoped: false, order: "created_at" });
  const [addOpen, setAddOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ tenantId: "", imei: "", protocol: "h02", model: "", name: "" });

  const register = async () => {
    if (!form.tenantId) return toast.error("Choose the organization this device belongs to");
    if (!form.imei.trim()) return toast.error("IMEI / tracker ID is required");
    const ok = await insert({
      tenant_id: form.tenantId,
      imei: form.imei.trim(),
      protocol: form.protocol,
      device_model: form.model.trim() || form.protocol,
      name: form.name.trim() || form.imei.trim(),
      status: "active",
      serial_number: null,
      phone_number: null,
      sim_number: null,
      battery_level: null,
      signal_strength: null,
      server_ip: null,
      server_port: PROTOCOLS.find((p) => p.id === form.protocol)?.port ?? null,
      last_position_at: null,
      last_valid_fix_at: null,
      last_gps_valid: null,
      last_seen_at: null,
      last_lat: null,
      last_lng: null,
      last_speed_kmh: null,
      last_course: null,
      connection_status: "unknown",
      traccar_id: null,
      last_fuel_level: null,
      last_fuel_at: null,
      last_fuel_used_l: null,
      ingest_token: null,
      firmware_version: null,
      notes: null,
    });
    setSaving(false);
    if (!ok) return toast.error("Could not register device — check your connection");
    toast.success(`Device ${form.imei.trim()} registered — point it at the platform IP on port ${PROTOCOLS.find((p) => p.id === form.protocol)?.port}`);
    setForm({ tenantId: "", imei: "", protocol: "h02", model: "", name: "" });
    setAddOpen(false);
  };

  return (
    <PageContainer className="max-w-[1100px]">
      <PageHeader
        title="Device Inventory"
        subtitle="Hardware stock, assignment and status across all organizations"
        actions={
          <Button className="gap-2 rounded-xl shadow-card" onClick={() => setAddOpen(true)}>
            <Plus className="size-4" /> Register Devices
          </Button>
        }
      />

      <Panel>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead className="pl-5">Device ID</TableHead>
                <TableHead>IMEI</TableHead>
                <TableHead>Model</TableHead>
                <TableHead>Protocol</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Assigned To</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {vehicles.slice(0, 16).map((v, i) => {
                const m = getDeviceModel(v.deviceModelId);
                const tenant = tenants.find((t) => t.id === v.tenantId) ?? tenants[i % Math.max(1, tenants.length)];
                return (
                  <TableRow key={v.id}>
                    <TableCell className="pl-5 font-mono text-[12px]">TKD-{String(10001 + i)}</TableCell>
                    <TableCell className="font-mono text-[12px] text-muted-foreground">{v.imei}</TableCell>
                    <TableCell>
                      <span className="flex items-center gap-2 text-[13px] font-medium">
                        <Radio className="size-3.5 text-primary" /> {m?.vendor} {m?.model}
                      </span>
                    </TableCell>
                    <TableCell><Pill tone="primary">{m?.protocol.toUpperCase()}</Pill></TableCell>
                    <TableCell>
                      {(() => {
                        const ls = LIVE_STATUS[vehicleLiveStatus(v)];
                        return (
                          <Pill tone={vehicleLiveStatus(v) === "online" ? "success" : vehicleLiveStatus(v) === "sleeping" ? "warning" : "danger"}>
                            {ls.label}
                          </Pill>
                        );
                      })()}
                    </TableCell>
                    <TableCell className="text-[12.5px]">{tenant?.name ?? "—"}</TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      </Panel>

      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Register Device</DialogTitle>
            <DialogDescription>
              Add hardware to an organization&apos;s inventory. The device starts reporting once pointed at the platform.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-3">
            <div className="grid gap-1.5">
              <Label htmlFor="dv-org">Organization</Label>
              <select
                id="dv-org"
                value={form.tenantId}
                onChange={(e) => setForm({ ...form, tenantId: e.target.value })}
                className="h-9 rounded-md border border-input bg-transparent px-3 text-sm shadow-xs outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50"
              >
                <option value="">Choose organization…</option>
                {tenants.map((t) => (
                  <option key={t.id} value={t.id}>{t.name}</option>
                ))}
              </select>
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="dv-imei">IMEI / Tracker ID</Label>
              <Input
                id="dv-imei"
                value={form.imei}
                onChange={(e) => setForm({ ...form, imei: e.target.value })}
                placeholder="e.g. 8160528336"
              />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="dv-protocol">Protocol</Label>
              <select
                id="dv-protocol"
                value={form.protocol}
                onChange={(e) => setForm({ ...form, protocol: e.target.value })}
                className="h-9 rounded-md border border-input bg-transparent px-3 text-sm shadow-xs outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50"
              >
                {PROTOCOLS.map((p) => (
                  <option key={p.id} value={p.id}>{p.label} (port {p.port})</option>
                ))}
              </select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="grid gap-1.5">
                <Label htmlFor="dv-model">Model (optional)</Label>
                <Input
                  id="dv-model"
                  value={form.model}
                  onChange={(e) => setForm({ ...form, model: e.target.value })}
                  placeholder="ST-901A"
                />
              </div>
              <div className="grid gap-1.5">
                <Label htmlFor="dv-name">Label (optional)</Label>
                <Input
                  id="dv-name"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  placeholder="Stock unit #12"
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddOpen(false)} disabled={saving}>
              Cancel
            </Button>
            <Button
              onClick={async () => {
                setSaving(true);
                await register();
              }}
              disabled={saving}
              className="gap-2"
            >
              <Plus className="size-4" /> {saving ? "Registering…" : "Register"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </PageContainer>
  );
}
