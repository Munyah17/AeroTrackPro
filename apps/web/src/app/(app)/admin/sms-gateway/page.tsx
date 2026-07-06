"use client";

import { MessageSquare, Plus } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { PageContainer, PageHeader, Panel } from "@/components/shared/page";
import { Pill } from "@/components/shared/status";

const GATEWAYS = [
  { name: "Twilio", provider: "Twilio", status: "active", isDefault: true, balance: "$142.60" },
  { name: "Africa's Talking", provider: "Africa's Talking", status: "active", isDefault: false, balance: "$88.15" },
  { name: "Econet Bulk SMS", provider: "Econet", status: "active", isDefault: false, balance: "ZWG 4,120" },
  { name: "Vonage (legacy)", provider: "Vonage", status: "inactive", isDefault: false, balance: "—" },
];

export default function SmsGatewayPage() {
  return (
    <PageContainer className="max-w-[900px]">
      <PageHeader
        title="SMS Gateway"
        subtitle="Gateways for alert SMS and device command fallback"
        actions={
          <Button className="gap-2 rounded-xl shadow-card" onClick={() => toast.info("Add gateway: provider, API key, sender ID, routing rules")}>
            <Plus className="size-4" /> Add Gateway
          </Button>
        }
      />

      <Panel className="divide-y divide-border/50">
        {GATEWAYS.map((g) => (
          <div key={g.name} className="flex flex-wrap items-center gap-4 px-5 py-4">
            <div className="flex size-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <MessageSquare className="size-4.5" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2 text-[13.5px] font-semibold">
                {g.name}
                {g.isDefault && <Pill tone="primary">Default</Pill>}
              </div>
              <div className="text-[11.5px] text-muted-foreground">{g.provider} · Balance {g.balance}</div>
            </div>
            <Pill tone={g.status === "active" ? "success" : "muted"}>{g.status}</Pill>
            <Switch
              defaultChecked={g.isDefault}
              onCheckedChange={(c) => toast.success(c ? `${g.name} set as default gateway` : `${g.name} removed as default`)}
            />
          </div>
        ))}
      </Panel>

      <Panel className="mt-4 p-5 text-[12.5px] leading-relaxed text-muted-foreground">
        Routing: SOS and power-cut alerts always use the default gateway. Device SMS commands route through the
        gateway matching the SIM&apos;s network where configured (e.g. Econet SIMs → Econet Bulk SMS) to reduce cost.
      </Panel>
    </PageContainer>
  );
}
