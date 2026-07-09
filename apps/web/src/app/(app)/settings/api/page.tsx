"use client";

import { useState } from "react";
import { BookOpen, Copy, Eye, EyeOff, KeyRound, Plus, Trash2, Webhook } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { PageContainer, PageHeader, Panel } from "@/components/shared/page";

interface ApiKey {
  id: string;
  label: string;
  key: string;
  createdAt: string;
  lastUsed: string;
  scope: "read" | "read_write";
}

const INITIAL_KEYS: ApiKey[] = [
  {
    id: "k1",
    label: "Production integration",
    key: "atk_live_8f2b1c9d4e6a7b3f5c8d9e0a1b2c3d4e",
    createdAt: "12 May 2026",
    lastUsed: "Today",
    scope: "read_write",
  },
  {
    id: "k2",
    label: "Reporting dashboard",
    key: "atk_live_2a4c6e8b0d1f3a5c7e9b1d3f5a7c9e0b",
    createdAt: "28 Jun 2026",
    lastUsed: "3 days ago",
    scope: "read",
  },
];

function maskKey(key: string) {
  return `${key.slice(0, 12)}${"•".repeat(16)}${key.slice(-4)}`;
}

function generateKey() {
  const hex = Array.from({ length: 32 }, () =>
    Math.floor(Math.random() * 16).toString(16),
  ).join("");
  return `atk_live_${hex}`;
}

export default function ApiSettingsPage() {
  const [keys, setKeys] = useState<ApiKey[]>(INITIAL_KEYS);
  const [visible, setVisible] = useState<Record<string, boolean>>({});
  const [newLabel, setNewLabel] = useState("");
  const [webhook, setWebhook] = useState({
    url: "",
    enabled: false,
    events: { positions: true, alerts: true, trips: false },
  });

  const handleCreate = () => {
    if (!newLabel.trim()) {
      toast.error("Give the key a label first");
      return;
    }
    const key: ApiKey = {
      id: `k-${Date.now()}`,
      label: newLabel.trim(),
      key: generateKey(),
      createdAt: new Date().toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" }),
      lastUsed: "Never",
      scope: "read_write",
    };
    setKeys((prev) => [...prev, key]);
    setVisible((prev) => ({ ...prev, [key.id]: true }));
    setNewLabel("");
    toast.success("API key created — copy it now, it is only shown once");
  };

  const handleCopy = async (key: ApiKey) => {
    await navigator.clipboard.writeText(key.key);
    toast.success("API key copied to clipboard");
  };

  const handleRevoke = (key: ApiKey) => {
    setKeys((prev) => prev.filter((k) => k.id !== key.id));
    toast.success(`Key "${key.label}" revoked`);
  };

  return (
    <PageContainer className="max-w-[900px]">
      <PageHeader
        title="API Integration"
        subtitle="API keys, webhooks and developer resources"
      />

      <div className="space-y-4">
        <Panel className="p-6">
          <div className="flex items-center gap-2.5 pb-4">
            <KeyRound className="size-4.5 text-primary" />
            <h3 className="text-[15px] font-semibold">API Keys</h3>
          </div>

          <div className="space-y-2.5">
            {keys.map((k) => (
              <div
                key={k.id}
                className="flex items-center gap-3 rounded-xl border border-border/60 bg-accent/30 p-3.5"
              >
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="text-[13.5px] font-medium">{k.label}</span>
                    <Badge variant="secondary" className="rounded-md text-[10.5px]">
                      {k.scope === "read_write" ? "Read & write" : "Read only"}
                    </Badge>
                  </div>
                  <div className="mt-1 font-mono text-[12px] text-muted-foreground">
                    {visible[k.id] ? k.key : maskKey(k.key)}
                  </div>
                  <div className="mt-0.5 text-[11.5px] text-muted-foreground/70">
                    Created {k.createdAt} · Last used {k.lastUsed}
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  className="size-8 rounded-lg"
                  onClick={() => setVisible((p) => ({ ...p, [k.id]: !p[k.id] }))}
                >
                  {visible[k.id] ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="size-8 rounded-lg"
                  onClick={() => handleCopy(k)}
                >
                  <Copy className="size-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="size-8 rounded-lg text-muted-foreground hover:text-destructive"
                  onClick={() => handleRevoke(k)}
                >
                  <Trash2 className="size-4" />
                </Button>
              </div>
            ))}
          </div>

          <div className="mt-4 flex gap-2">
            <Input
              value={newLabel}
              onChange={(e) => setNewLabel(e.target.value)}
              placeholder="Key label, e.g. Mobile app"
              className="max-w-xs rounded-xl"
            />
            <Button onClick={handleCreate} className="gap-2 rounded-xl">
              <Plus className="size-4" /> Generate Key
            </Button>
          </div>
        </Panel>

        <Panel className="p-6">
          <div className="flex items-center gap-2.5 pb-4">
            <Webhook className="size-4.5 text-primary" />
            <h3 className="text-[15px] font-semibold">Webhooks</h3>
            <div className="ml-auto flex items-center gap-2">
              <span className="text-[12px] text-muted-foreground">
                {webhook.enabled ? "Enabled" : "Disabled"}
              </span>
              <Switch
                checked={webhook.enabled}
                onCheckedChange={(c) => {
                  setWebhook((w) => ({ ...w, enabled: c }));
                  toast.success(`Webhooks ${c ? "enabled" : "disabled"}`);
                }}
              />
            </div>
          </div>

          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label className="text-xs">Endpoint URL</Label>
              <Input
                value={webhook.url}
                onChange={(e) => setWebhook((w) => ({ ...w, url: e.target.value }))}
                placeholder="https://your-server.com/webhooks/aerotrack"
                className="rounded-xl font-mono text-[13px]"
              />
              <p className="text-[12px] text-muted-foreground">
                POST requests with a JSON body are sent for each subscribed event. Deliveries are
                signed with your webhook secret.
              </p>
            </div>

            <div className="divide-y divide-border/50">
              {(
                [
                  { key: "positions", label: "Position updates", desc: "Every decoded GPS fix (high volume)" },
                  { key: "alerts", label: "Alerts", desc: "Overspeed, geofence, SOS and device alerts" },
                  { key: "trips", label: "Trip events", desc: "Trip started and trip completed" },
                ] as const
              ).map((e) => (
                <div key={e.key} className="flex items-center justify-between py-3">
                  <div>
                    <div className="text-[13.5px] font-medium">{e.label}</div>
                    <div className="text-[12px] text-muted-foreground">{e.desc}</div>
                  </div>
                  <Switch
                    checked={webhook.events[e.key]}
                    onCheckedChange={(c) =>
                      setWebhook((w) => ({ ...w, events: { ...w.events, [e.key]: c } }))
                    }
                  />
                </div>
              ))}
            </div>
          </div>
        </Panel>

        <Panel className="p-5">
          <div className="flex items-center gap-4">
            <div className="flex size-11 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <BookOpen className="size-5" />
            </div>
            <div className="flex-1">
              <div className="text-[14px] font-semibold">API Documentation</div>
              <div className="text-[12.5px] text-muted-foreground">
                REST endpoints for vehicles, positions, trips, geofences and commands
              </div>
            </div>
            <Button
              variant="outline"
              className="rounded-xl"
              onClick={() => toast.info("Developer portal ships with the public API release")}
            >
              Open Docs
            </Button>
          </div>
        </Panel>
      </div>
    </PageContainer>
  );
}
