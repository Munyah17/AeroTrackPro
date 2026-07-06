"use client";

import { Copy, KeyRound, Plus, Webhook } from "lucide-react";
import { toast } from "sonner";
import { apiKeys, tenantById } from "@aerotrack/shared";
import { Button } from "@/components/ui/button";
import { PageContainer, PageHeader, Panel } from "@/components/shared/page";
import { Pill } from "@/components/shared/status";
import { shortDate, timeAgo } from "@/lib/format";

const WEBHOOKS = [
  { url: "https://erp.speedtrack.co.zw/hooks/positions", events: ["position.updated"], status: "healthy" },
  { url: "https://api.zimre.co.zw/telematics/events", events: ["trip.completed", "behavior.event"], status: "healthy" },
  { url: "https://legacy.metrogps.com/callback", events: ["alert.created"], status: "failing" },
];

export default function ApiPage() {
  return (
    <PageContainer className="max-w-[1100px]">
      <PageHeader
        title="API & Integration"
        subtitle="API keys, webhooks and developer access for third parties and insurers"
        actions={
          <Button className="gap-2 rounded-xl shadow-card" onClick={() => toast.success("New API key generated", { description: "atk_live_9f2e… — copy it now, it won't be shown again" })}>
            <Plus className="size-4" /> Generate Key
          </Button>
        }
      />

      <Panel>
        <div className="border-b border-border/60 px-5 py-4">
          <h3 className="flex items-center gap-2 text-[15px] font-semibold">
            <KeyRound className="size-4.5 text-primary" /> API Keys
          </h3>
        </div>
        <div className="divide-y divide-border/50">
          {apiKeys.map((k) => (
            <div key={k.id} className="flex flex-wrap items-center gap-4 px-5 py-3.5">
              <div className="min-w-0 flex-1">
                <div className="text-[13.5px] font-semibold">{k.name}</div>
                <div className="mt-0.5 flex items-center gap-2 text-[12px] text-muted-foreground">
                  <code className="rounded bg-muted px-1.5 py-0.5 font-mono text-[11px]">{k.prefix}••••••••••••</code>
                  <button
                    className="text-primary hover:underline"
                    onClick={() => toast.success("Key prefix copied")}
                  >
                    <Copy className="size-3" />
                  </button>
                  <span>· {tenantById(k.tenantId)?.name}</span>
                </div>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {k.scopes.map((s) => (
                  <Pill key={s} tone="muted">{s}</Pill>
                ))}
              </div>
              <div className="text-[11.5px] text-muted-foreground">
                Created {shortDate(k.createdAt)}
                {k.lastUsedAt && <span> · used {timeAgo(k.lastUsedAt)}</span>}
              </div>
              <Pill tone={k.status === "active" ? "success" : "danger"}>{k.status}</Pill>
            </div>
          ))}
        </div>
      </Panel>

      <Panel className="mt-4">
        <div className="border-b border-border/60 px-5 py-4">
          <h3 className="flex items-center gap-2 text-[15px] font-semibold">
            <Webhook className="size-4.5 text-primary" /> Webhooks
          </h3>
        </div>
        <div className="divide-y divide-border/50">
          {WEBHOOKS.map((w) => (
            <div key={w.url} className="flex flex-wrap items-center gap-4 px-5 py-3.5">
              <code className="min-w-0 flex-1 truncate font-mono text-[12px]">{w.url}</code>
              <div className="flex gap-1.5">
                {w.events.map((e) => (
                  <Pill key={e} tone="info">{e}</Pill>
                ))}
              </div>
              <Pill tone={w.status === "healthy" ? "success" : "danger"}>{w.status}</Pill>
            </div>
          ))}
        </div>
        <div className="border-t border-border/60 px-5 py-3 text-[12px] text-muted-foreground">
          Rate limit: 100,000 requests/month per key · Docs at <span className="font-medium text-primary">developers.aerotrack.app</span>
        </div>
      </Panel>
    </PageContainer>
  );
}
