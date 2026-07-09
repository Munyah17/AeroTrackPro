"use client";

import { useState } from "react";
import { Bell, Mail, MessageSquare, Smartphone } from "lucide-react";
import { toast } from "sonner";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { PageContainer, PageHeader, Panel } from "@/components/shared/page";
import { MultiSelect, type MultiSelectOption } from "@/components/ui/multi-select";

const EMAIL_NOTIFICATIONS = [
  { id: "overspeed", label: "Overspeed alerts", enabled: true },
  { id: "geofence", label: "Geofence violations", enabled: true },
  { id: "sos", label: "SOS / Emergency alerts", enabled: true },
  { id: "maintenance", label: "Maintenance due reminders", enabled: true },
  { id: "insurance", label: "Insurance expiry warnings", enabled: true },
  { id: "fuel", label: "Fuel theft detection", enabled: false },
  { id: "offline", label: "Device offline alerts", enabled: false },
  { id: "weekly", label: "Weekly summary report", enabled: true },
];

const SMS_ALERTS = [
  { id: "sos", label: "SOS / Emergency only", enabled: true },
  { id: "critical", label: "Critical alerts", enabled: true },
  { id: "power", label: "Power disconnect", enabled: false },
];

const ALERT_TYPES: MultiSelectOption[] = [
  { label: "Overspeed", value: "overspeed" },
  { label: "Geofence Entry", value: "geofence_enter" },
  { label: "Geofence Exit", value: "geofence_exit" },
  { label: "SOS", value: "sos" },
  { label: "Harsh Braking", value: "harsh_brake" },
  { label: "Harsh Acceleration", value: "harsh_accel" },
  { label: "Fuel Theft", value: "fuel_theft" },
  { label: "Device Offline", value: "offline" },
];

export default function NotificationSettingsPage() {
  const [emailFreq, setEmailFreq] = useState("instant");
  const [pushAlerts, setPushAlerts] = useState<string[]>(["overspeed", "sos", "geofence_enter"]);

  return (
    <PageContainer className="max-w-[900px]">
      <PageHeader
        title="Notification Settings"
        subtitle="Configure how and when you receive alerts"
      />

      <div className="space-y-4">
        <Panel className="p-6">
          <div className="flex items-center gap-2.5 pb-4">
            <Mail className="size-4.5 text-primary" />
            <h3 className="text-[15px] font-semibold">Email Notifications</h3>
          </div>

          <div className="mb-4 flex items-center justify-between rounded-xl border border-border/60 bg-accent/40 p-3">
            <div className="text-sm font-medium">Email frequency</div>
            <Select value={emailFreq} onValueChange={(v) => setEmailFreq(v ?? "instant")}>
              <SelectTrigger className="w-44 rounded-lg bg-card">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="rounded-xl">
                <SelectItem value="instant">Instant</SelectItem>
                <SelectItem value="hourly">Hourly digest</SelectItem>
                <SelectItem value="daily">Daily digest</SelectItem>
                <SelectItem value="disabled">Disabled</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="divide-y divide-border/50">
            {EMAIL_NOTIFICATIONS.map((item) => (
              <div key={item.id} className="flex items-center justify-between py-3">
                <div className="text-[13.5px] font-medium">{item.label}</div>
                <Switch
                  defaultChecked={item.enabled}
                  onCheckedChange={(c) => toast.success(`${item.label} ${c ? "enabled" : "disabled"}`)}
                />
              </div>
            ))}
          </div>
        </Panel>

        <Panel className="p-6">
          <div className="flex items-center gap-2.5 pb-4">
            <MessageSquare className="size-4.5 text-primary" />
            <h3 className="text-[15px] font-semibold">SMS Alerts</h3>
          </div>

          <div className="mb-4 rounded-xl border border-warning/40 bg-warning/5 p-3 text-xs text-warning">
            <strong>Note:</strong> SMS alerts may incur additional charges based on your subscription plan.
          </div>

          <div className="divide-y divide-border/50">
            {SMS_ALERTS.map((item) => (
              <div key={item.id} className="flex items-center justify-between py-3">
                <div className="text-[13.5px] font-medium">{item.label}</div>
                <Switch
                  defaultChecked={item.enabled}
                  onCheckedChange={(c) => toast.success(`SMS: ${item.label} ${c ? "enabled" : "disabled"}`)}
                />
              </div>
            ))}
          </div>
        </Panel>

        <Panel className="p-6">
          <div className="flex items-center gap-2.5 pb-4">
            <Smartphone className="size-4.5 text-primary" />
            <h3 className="text-[15px] font-semibold">Push Notifications (Mobile App)</h3>
          </div>

          <div className="space-y-4">
            <div className="space-y-2">
              <label className="text-xs font-medium text-muted-foreground">
                Select alert types to receive as push notifications
              </label>
              <MultiSelect
                options={ALERT_TYPES}
                value={pushAlerts}
                onChange={setPushAlerts}
                placeholder="Select alert types..."
              />
            </div>

            <div className="flex items-center justify-between rounded-xl border border-border/60 bg-accent/40 p-3">
              <div className="text-sm font-medium">Notification sounds</div>
              <Switch defaultChecked onCheckedChange={(c) => toast.success(`Sounds ${c ? "on" : "off"}`)} />
            </div>
          </div>
        </Panel>

        <Panel className="p-6">
          <div className="flex items-center gap-2.5 pb-4">
            <Bell className="size-4.5 text-primary" />
            <h3 className="text-[15px] font-semibold">In-App Notifications</h3>
          </div>

          <div className="space-y-3">
            {[
              { label: "Desktop notifications", desc: "Show browser notifications", on: true },
              { label: "Toast notifications", desc: "Show toast messages in app", on: true },
              { label: "Notification badge", desc: "Show unread count badge", on: true },
            ].map((item) => (
              <div key={item.label} className="flex items-center justify-between py-2">
                <div>
                  <div className="text-[13.5px] font-medium">{item.label}</div>
                  <div className="text-xs text-muted-foreground">{item.desc}</div>
                </div>
                <Switch
                  defaultChecked={item.on}
                  onCheckedChange={(c) => toast.success(`${item.label} ${c ? "enabled" : "disabled"}`)}
                />
              </div>
            ))}
          </div>
        </Panel>
      </div>
    </PageContainer>
  );
}
