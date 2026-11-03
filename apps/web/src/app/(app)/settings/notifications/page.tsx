"use client";

import { useEffect, useState } from "react";
import { Bell, Loader2, Mail, MessageSquare, Save } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { PageContainer, PageHeader, Panel } from "@/components/shared/page";
import { NOTIFY_EVENTS, defaultPrefs, type ChannelPrefs } from "@/lib/notify-events";

/**
 * Notification Settings — persisted per-event channel opt-in.
 *
 * Loads prefs from /api/settings/notification-prefs (Supabase-backed).
 * Requires a signed-in session; failed loads show an error, not fake data.
 */

type PrefMap = Record<string, ChannelPrefs>;

export default function NotificationSettingsPage() {
  const [prefs, setPrefs] = useState<PrefMap>({});
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let active = true;
    fetch("/api/settings/notification-prefs")
      .then(async (r) => {
        if (!r.ok) throw new Error(String(r.status));
        return r.json();
      })
      .then((data) => {
        if (!active) return;
        setPrefs(data.prefs ?? {});
        setPhone(data.phone ?? "");
        setEmail(data.email ?? "");
      })
      .catch(() => {
        if (!active) return;
        toast.error("Couldn't load your preferences", {
          description: "Check your connection and refresh.",
        });
      })
      .finally(() => active && setLoading(false));
    return () => {
      active = false;
    };
  }, []);

  const prefFor = (id: string): ChannelPrefs => prefs[id] ?? defaultPrefs(id);

  const toggle = (id: string, channel: keyof ChannelPrefs) => {
    setPrefs((prev) => ({
      ...prev,
      [id]: { ...prefFor(id), [channel]: !prefFor(id)[channel] },
    }));
  };

  const save = async () => {
    setSaving(true);
    const payload = {
      phone: phone || null,
      prefs: NOTIFY_EVENTS.map((e) => ({ event_type: e.id, ...prefFor(e.id) })),
    };
    try {
      const res = await fetch("/api/settings/notification-prefs", {
        method: "PUT",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error(await res.text());
      toast.success("Notification preferences saved");
    } catch {
      toast.error("Failed to save preferences");
    } finally {
      setSaving(false);
    }
  };

  return (
    <PageContainer className="max-w-[900px]">
      <PageHeader
        title="Notification Settings"
        subtitle="Choose which events reach you — and by which channel"
        actions={
          <Button onClick={save} disabled={saving || loading} className="rounded-xl">
            {saving ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />}
            Save preferences
          </Button>
        }
      />

      <div className="space-y-4">
        <Panel className="p-6">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <label className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
                <Mail className="size-3.5" /> Email address
              </label>
              <Input value={email || "—"} disabled className="rounded-xl bg-accent/40" />
            </div>
            <div className="space-y-1.5">
              <label className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
                <MessageSquare className="size-3.5" /> SMS number (E.164, e.g. +2637…)
              </label>
              <Input
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="+263771234567"
                className="rounded-xl"
              />
            </div>
          </div>
        </Panel>

        <Panel className="overflow-hidden">
          <div className="grid grid-cols-[1fr_repeat(3,4.5rem)] items-center gap-2 border-b border-border/60 bg-accent/30 px-6 py-3 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
            <div>Event</div>
            <div className="text-center"><Bell className="mx-auto size-4" /></div>
            <div className="text-center"><Mail className="mx-auto size-4" /></div>
            <div className="text-center"><MessageSquare className="mx-auto size-4" /></div>
          </div>

          {loading ? (
            <div className="flex items-center justify-center gap-2 py-12 text-sm text-muted-foreground">
              <Loader2 className="size-4 animate-spin" /> Loading preferences…
            </div>
          ) : (
            <div className="divide-y divide-border/50">
              {NOTIFY_EVENTS.map((evt) => {
                const p = prefFor(evt.id);
                return (
                  <div
                    key={evt.id}
                    className="grid grid-cols-[1fr_repeat(3,4.5rem)] items-center gap-2 px-6 py-3.5"
                  >
                    <div>
                      <div className="text-[13.5px] font-medium">{evt.label}</div>
                      <div className="text-xs text-muted-foreground">{evt.description}</div>
                    </div>
                    {(
                      [
                        ["in_app_enabled", p.in_app_enabled],
                        ["email_enabled", p.email_enabled],
                        ["sms_enabled", p.sms_enabled],
                      ] as const
                    ).map(([channel, on]) => (
                      <div key={channel} className="flex justify-center">
                        <Switch
                          checked={on}
                          onCheckedChange={() => toggle(evt.id, channel)}
                          aria-label={`${evt.label} — ${channel}`}
                        />
                      </div>
                    ))}
                  </div>
                );
              })}
            </div>
          )}
        </Panel>

        <Panel className="p-4">
          <p className="text-xs text-muted-foreground">
            <Bell className="mr-1 inline size-3.5" /> In-app alerts appear in the notification center.
            <Mail className="ml-3 mr-1 inline size-3.5" /> Email is sent to your account address.
            <MessageSquare className="ml-3 mr-1 inline size-3.5" /> SMS may incur carrier charges.
          </p>
        </Panel>
      </div>
    </PageContainer>
  );
}
