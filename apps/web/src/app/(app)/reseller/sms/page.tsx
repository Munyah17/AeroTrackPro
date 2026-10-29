"use client";

import { useState } from "react";
import { MessageSquare, Send, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { PageContainer, PageHeader, Panel } from "@/components/shared/page";
import { Pill } from "@/components/shared/status";
import { useBrand } from "@/components/shell/brand-provider";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { maskSecret, providerLabel, SMS_PROVIDERS, type SmsProvider } from "@/lib/brand";

export default function ResellerSmsPage() {
  const { brand, ready, save } = useBrand();
  const [provider, setProvider] = useState<SmsProvider>("africastalking");
  const [senderId, setSenderId] = useState("");
  const [apiKey, setApiKey] = useState("");

  const addGateway = () => {
    const sender = senderId.trim().slice(0, 11);
    if (sender.length < 3) {
      toast.error("Sender ID needs at least 3 characters");
      return;
    }
    if (apiKey.trim().length < 8) {
      toast.error("Paste the provider API key");
      return;
    }
    const id = crypto.randomUUID();
    const name = providerLabel(provider);
    save({
      ...brand,
      sms: [
        ...brand.sms.map((gateway) => ({ ...gateway, isDefault: brand.sms.length === 0 ? false : gateway.isDefault })),
        {
          id,
          provider,
          name,
          senderId: sender,
          apiKey: apiKey.trim(),
          active: true,
          isDefault: brand.sms.length === 0,
        },
      ],
    });
    setSenderId("");
    setApiKey("");
    toast.success(`${name} saved`, { description: `Alerts can send as ${sender}.` });
  };

  const makeDefault = (id: string, on: boolean) => {
    save({
      ...brand,
      sms: brand.sms.map((gateway) => ({
        ...gateway,
        isDefault: on ? gateway.id === id : gateway.id === id ? false : gateway.isDefault,
      })),
    });
    const gateway = brand.sms.find((item) => item.id === id);
    toast.success(on ? `${gateway?.senderId} is the default sender` : "Default sender cleared");
  };

  const remove = (id: string) => {
    const next = brand.sms.filter((gateway) => gateway.id !== id);
    if (next.length && !next.some((gateway) => gateway.isDefault)) next[0] = { ...next[0], isDefault: true };
    save({ ...brand, sms: next });
    toast.success("Gateway removed");
  };

  return (
    <PageContainer className="max-w-[900px]">
      <PageHeader
        title="SMS gateway"
        subtitle="Send ignition, SOS, and geofence texts under your sender name"
      />

      <Panel className="p-5">
        <h3 className="flex items-center gap-2 text-[14px] font-semibold">
          <MessageSquare className="size-4 text-primary" /> Connect a gateway
        </h3>
        <form
          className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2"
          onSubmit={(event) => {
            event.preventDefault();
            addGateway();
          }}
        >
          <div className="space-y-1.5">
            <Label className="text-[12.5px]">Provider</Label>
            <Select value={provider} onValueChange={(value) => value && setProvider(value as SmsProvider)}>
              <SelectTrigger className="w-full rounded-xl bg-card">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="rounded-xl">
                {SMS_PROVIDERS.map((item) => (
                  <SelectItem key={item.id} value={item.id}>{item.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label className="text-[12.5px]">Sender ID</Label>
            <Input
              value={senderId}
              onChange={(event) => setSenderId(event.target.value)}
              placeholder="TrackZW"
              maxLength={11}
              className="rounded-xl"
            />
          </div>
          <div className="space-y-1.5 sm:col-span-2">
            <Label className="text-[12.5px]">API key</Label>
            <Input
              value={apiKey}
              onChange={(event) => setApiKey(event.target.value)}
              type="password"
              autoComplete="off"
              placeholder="Stored in this browser only"
              className="rounded-xl"
            />
          </div>
          <div className="sm:col-span-2">
            <Button type="submit" className="rounded-xl" disabled={!ready}>
              Save gateway
            </Button>
          </div>
        </form>
        <p className="mt-3 text-[12px] leading-relaxed text-muted-foreground">
          Keys stay in this browser for the demo. A live deployment sends through the provider from the server, using this sender ID on the client’s phone.
        </p>
      </Panel>

      <div className="mt-4 flex flex-col gap-3">
        {brand.sms.length === 0 && (
          <Panel className="p-5 text-[13px] text-muted-foreground">
            No gateway yet. Africa’s Talking, Twilio, Econet Bulk SMS, and SMSPortal are the usual choices for this region.
          </Panel>
        )}
        {brand.sms.map((gateway) => (
          <Panel key={gateway.id} className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center">
            <div className="flex size-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <MessageSquare className="size-4.5" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2 text-[13.5px] font-semibold">
                {gateway.name}
                <span className="font-mono text-[12px] text-muted-foreground">{gateway.senderId}</span>
                {gateway.isDefault && <Pill tone="primary">Default</Pill>}
              </div>
              <div className="text-[11.5px] text-muted-foreground">Key {maskSecret(gateway.apiKey)}</div>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-[12px] text-muted-foreground">Default</span>
              <Switch checked={gateway.isDefault} onCheckedChange={(checked) => makeDefault(gateway.id, checked === true)} />
              <Button
                size="sm"
                variant="outline"
                className="rounded-lg"
                onClick={() =>
                  toast.success(`Test queued as ${gateway.senderId}`, {
                    description: `This demo does not call ${gateway.name}. Live alerts will use that sender.`,
                  })
                }
              >
                <Send className="size-3.5" /> Test
              </Button>
              <Button size="sm" variant="ghost" className="rounded-lg text-destructive" onClick={() => remove(gateway.id)} aria-label={`Remove ${gateway.name}`}>
                <Trash2 className="size-3.5" />
              </Button>
            </div>
          </Panel>
        ))}
      </div>
    </PageContainer>
  );
}
