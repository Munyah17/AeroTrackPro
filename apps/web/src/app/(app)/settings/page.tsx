"use client";

import { Bell, ChevronRight, CreditCard, Globe2, Plug, Settings2, UserCircle2, Users2 } from "lucide-react";
import { toast } from "sonner";
import { Switch } from "@/components/ui/switch";
import { PageContainer, PageHeader, Panel } from "@/components/shared/page";

const SECTIONS = [
  { icon: UserCircle2, title: "Profile Settings", desc: "Manage your profile information" },
  { icon: Bell, title: "Notification Settings", desc: "Configure alert and email notifications" },
  { icon: Globe2, title: "General Settings", desc: "Units, time zone and general preferences" },
  { icon: Users2, title: "User Management", desc: "Manage users and access permissions" },
  { icon: Plug, title: "API Integration", desc: "Integrate with third-party applications" },
  { icon: CreditCard, title: "Subscription", desc: "Manage your plan and billing" },
];

const TOGGLES = [
  { label: "Email alerts", desc: "Critical alerts to your inbox", on: true },
  { label: "SMS alerts", desc: "SOS and power-cut alerts by SMS", on: true },
  { label: "Push notifications", desc: "Mobile app push notifications", on: true },
  { label: "Weekly summary", desc: "Fleet digest every Monday morning", on: false },
];

export default function SettingsPage() {
  return (
    <PageContainer className="max-w-[900px]">
      <PageHeader title="Settings" subtitle="Configure your workspace, users, notifications and integrations" />

      <div className="flex flex-col gap-2.5">
        {SECTIONS.map((s) => (
          <Panel key={s.title} hover className="cursor-pointer">
            <button
              className="flex w-full items-center gap-4 p-4.5 text-left"
              onClick={() => toast.info(`${s.title} opens in this build`)}
            >
              <div className="flex size-11 items-center justify-center rounded-xl bg-primary/10 text-primary">
                <s.icon className="size-5" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="text-[14px] font-semibold">{s.title}</div>
                <div className="text-[12.5px] text-muted-foreground">{s.desc}</div>
              </div>
              <ChevronRight className="size-4 text-muted-foreground" />
            </button>
          </Panel>
        ))}
      </div>

      <Panel className="mt-5 p-5">
        <div className="flex items-center gap-2.5">
          <Settings2 className="size-4.5 text-primary" />
          <h3 className="text-[15px] font-semibold">Notification Preferences</h3>
        </div>
        <div className="mt-3 divide-y divide-border/50">
          {TOGGLES.map((t) => (
            <div key={t.label} className="flex items-center justify-between py-3.5">
              <div>
                <div className="text-[13.5px] font-medium">{t.label}</div>
                <div className="text-[12px] text-muted-foreground">{t.desc}</div>
              </div>
              <Switch
                defaultChecked={t.on}
                onCheckedChange={(c) => toast.success(`${t.label} ${c ? "enabled" : "disabled"}`)}
              />
            </div>
          ))}
        </div>
      </Panel>
    </PageContainer>
  );
}
