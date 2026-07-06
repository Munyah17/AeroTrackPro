"use client";

import { Save, Server, Settings } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { PageContainer, PageHeader, Panel } from "@/components/shared/page";
import { Pill } from "@/components/shared/status";

const LISTENERS = [
  { protocol: "GT06", port: 5023, connections: 128 },
  { protocol: "H02", port: 5013, connections: 84 },
  { protocol: "GPS103", port: 5001, connections: 41 },
  { protocol: "Queclink", port: 5004, connections: 17 },
  { protocol: "Meitrack", port: 5020, connections: 9 },
  { protocol: "Eelink", port: 5064, connections: 6 },
  { protocol: "Topflytech", port: 5049, connections: 4 },
  { protocol: "VT200", port: 5045, connections: 3 },
];

export default function SystemSettingsPage() {
  return (
    <PageContainer className="max-w-[1000px]">
      <PageHeader title="System Settings" subtitle="Global platform configuration and ingest server status" />

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Panel className="p-6">
          <h3 className="flex items-center gap-2 text-[15px] font-semibold">
            <Settings className="size-4.5 text-primary" /> General
          </h3>
          <div className="mt-5 space-y-4">
            <div className="space-y-1.5">
              <Label className="text-[12.5px]">Platform name</Label>
              <Input defaultValue="AeroTrack Pro" className="rounded-xl" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label className="text-[12.5px]">Time zone</Label>
                <Select defaultValue="cat">
                  <SelectTrigger className="rounded-xl"><SelectValue /></SelectTrigger>
                  <SelectContent className="rounded-xl">
                    <SelectItem value="cat">(UTC+02:00) Harare</SelectItem>
                    <SelectItem value="eat">(UTC+03:00) Nairobi</SelectItem>
                    <SelectItem value="utc">UTC</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-[12.5px]">Units</Label>
                <Select defaultValue="metric">
                  <SelectTrigger className="rounded-xl"><SelectValue /></SelectTrigger>
                  <SelectContent className="rounded-xl">
                    <SelectItem value="metric">Metric (km, L)</SelectItem>
                    <SelectItem value="imperial">Imperial (mi, gal)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-3 border-t border-border/60 pt-4">
              {[
                { label: "Maintenance mode", desc: "Show maintenance page to all client portals", on: false },
                { label: "New signups", desc: "Allow self-service organization signups", on: true },
                { label: "Position history compression", desc: "Downsample points older than 90 days", on: true },
              ].map((t) => (
                <div key={t.label} className="flex items-center justify-between">
                  <div>
                    <div className="text-[13px] font-medium">{t.label}</div>
                    <div className="text-[11.5px] text-muted-foreground">{t.desc}</div>
                  </div>
                  <Switch defaultChecked={t.on} onCheckedChange={(c) => toast.success(`${t.label} ${c ? "on" : "off"}`)} />
                </div>
              ))}
            </div>
            <Button className="gap-2 rounded-xl shadow-card" onClick={() => toast.success("System settings saved")}>
              <Save className="size-4" /> Save Changes
            </Button>
          </div>
        </Panel>

        <Panel className="overflow-hidden">
          <div className="flex items-center gap-2 border-b border-border/60 px-5 py-4">
            <Server className="size-4.5 text-primary" />
            <h3 className="text-[15px] font-semibold">Protocol Listeners</h3>
            <Pill tone="success">All healthy</Pill>
          </div>
          <div className="divide-y divide-border/50">
            {LISTENERS.map((l) => (
              <div key={l.protocol} className="flex items-center gap-3 px-5 py-3">
                <span className="size-2 rounded-full bg-success" />
                <span className="w-24 text-[13px] font-semibold">{l.protocol}</span>
                <code className="font-mono text-[12px] text-muted-foreground">tcp/{l.port}</code>
                <span className="ml-auto text-[12px] text-muted-foreground tabular-nums">{l.connections} connections</span>
              </div>
            ))}
          </div>
          <div className="border-t border-border/60 px-5 py-3 text-[12px] text-muted-foreground">
            Ingest tier decodes frames via <code className="font-mono">@aerotrack/protocols</code> and publishes to the realtime bus.
          </div>
        </Panel>
      </div>
    </PageContainer>
  );
}
