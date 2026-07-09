"use client";

import { useState } from "react";
import { Globe2, Map, Ruler, Save } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { PageContainer, PageHeader, Panel } from "@/components/shared/page";

const TIMEZONES = [
  "Africa/Harare",
  "Africa/Johannesburg",
  "Africa/Lagos",
  "Africa/Nairobi",
  "Europe/London",
  "America/New_York",
  "Asia/Dubai",
  "UTC",
];

export default function GeneralSettingsPage() {
  const [prefs, setPrefs] = useState({
    distanceUnit: "km",
    speedUnit: "kmh",
    fuelUnit: "liters",
    timezone: "Africa/Harare",
    dateFormat: "dd/MM/yyyy",
    language: "en",
    mapLayer: "streets",
    clusterMarkers: true,
    showTraffic: false,
    autoCenterFleet: true,
  });

  const set = (key: keyof typeof prefs) => (v: string | null) =>
    v !== null && setPrefs((p) => ({ ...p, [key]: v }));

  return (
    <PageContainer className="max-w-[900px]">
      <PageHeader
        title="General Settings"
        subtitle="Units, time zone, language and map preferences"
      />

      <div className="space-y-4">
        <Panel className="p-6">
          <div className="flex items-center gap-2.5 pb-4">
            <Ruler className="size-4.5 text-primary" />
            <h3 className="text-[15px] font-semibold">Units of Measurement</h3>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-1.5">
              <Label className="text-xs">Distance</Label>
              <Select value={prefs.distanceUnit} onValueChange={set("distanceUnit")}>
                <SelectTrigger className="rounded-xl">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="rounded-xl">
                  <SelectItem value="km">Kilometers (km)</SelectItem>
                  <SelectItem value="mi">Miles (mi)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs">Speed</Label>
              <Select value={prefs.speedUnit} onValueChange={set("speedUnit")}>
                <SelectTrigger className="rounded-xl">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="rounded-xl">
                  <SelectItem value="kmh">km/h</SelectItem>
                  <SelectItem value="mph">mph</SelectItem>
                  <SelectItem value="knots">knots</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs">Fuel volume</Label>
              <Select value={prefs.fuelUnit} onValueChange={set("fuelUnit")}>
                <SelectTrigger className="rounded-xl">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="rounded-xl">
                  <SelectItem value="liters">Liters</SelectItem>
                  <SelectItem value="gallons">US Gallons</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </Panel>

        <Panel className="p-6">
          <div className="flex items-center gap-2.5 pb-4">
            <Globe2 className="size-4.5 text-primary" />
            <h3 className="text-[15px] font-semibold">Localization</h3>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-1.5">
              <Label className="text-xs">Time zone</Label>
              <Select value={prefs.timezone} onValueChange={set("timezone")}>
                <SelectTrigger className="rounded-xl">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="rounded-xl">
                  {TIMEZONES.map((tz) => (
                    <SelectItem key={tz} value={tz}>
                      {tz.replace("_", " ")}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs">Date format</Label>
              <Select value={prefs.dateFormat} onValueChange={set("dateFormat")}>
                <SelectTrigger className="rounded-xl">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="rounded-xl">
                  <SelectItem value="dd/MM/yyyy">DD/MM/YYYY</SelectItem>
                  <SelectItem value="MM/dd/yyyy">MM/DD/YYYY</SelectItem>
                  <SelectItem value="yyyy-MM-dd">YYYY-MM-DD</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs">Language</Label>
              <Select value={prefs.language} onValueChange={set("language")}>
                <SelectTrigger className="rounded-xl">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="rounded-xl">
                  <SelectItem value="en">English</SelectItem>
                  <SelectItem value="fr">Français</SelectItem>
                  <SelectItem value="pt">Português</SelectItem>
                  <SelectItem value="sw">Kiswahili</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </Panel>

        <Panel className="p-6">
          <div className="flex items-center gap-2.5 pb-4">
            <Map className="size-4.5 text-primary" />
            <h3 className="text-[15px] font-semibold">Map Preferences</h3>
          </div>

          <div className="space-y-4">
            <div className="max-w-xs space-y-1.5">
              <Label className="text-xs">Default map layer</Label>
              <Select value={prefs.mapLayer} onValueChange={set("mapLayer")}>
                <SelectTrigger className="rounded-xl">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="rounded-xl">
                  <SelectItem value="streets">Streets</SelectItem>
                  <SelectItem value="satellite">Satellite</SelectItem>
                  <SelectItem value="terrain">Terrain</SelectItem>
                  <SelectItem value="dark">Dark</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="divide-y divide-border/50">
              {(
                [
                  { key: "clusterMarkers", label: "Cluster vehicle markers", desc: "Group nearby vehicles at low zoom levels" },
                  { key: "showTraffic", label: "Show traffic layer", desc: "Overlay live traffic conditions when available" },
                  { key: "autoCenterFleet", label: "Auto-center on fleet", desc: "Fit the map to all vehicles when tracking opens" },
                ] as const
              ).map((t) => (
                <div key={t.key} className="flex items-center justify-between py-3.5">
                  <div>
                    <div className="text-[13.5px] font-medium">{t.label}</div>
                    <div className="text-[12px] text-muted-foreground">{t.desc}</div>
                  </div>
                  <Switch
                    checked={prefs[t.key]}
                    onCheckedChange={(c) => setPrefs((p) => ({ ...p, [t.key]: c }))}
                  />
                </div>
              ))}
            </div>
          </div>
        </Panel>

        <div className="flex justify-end">
          <Button
            onClick={() => toast.success("General settings saved")}
            className="gap-2 rounded-xl shadow-card"
          >
            <Save className="size-4" /> Save Settings
          </Button>
        </div>
      </div>
    </PageContainer>
  );
}
