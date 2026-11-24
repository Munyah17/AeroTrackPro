"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import {
  Check,
  Copy,
  Download,
  Laptop,
  Pencil,
  RefreshCw,
  Smartphone,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";
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
import { PageContainer, PageHeader, Panel } from "@/components/shared/page";
import { Pill } from "@/components/shared/status";
import { timeAgo } from "@/lib/format";
import { refreshAllLiveData } from "@/hooks/use-live-data";

interface Tracker {
  deviceId: string;
  name: string;
  imei: string;
  protocol: string;
  kind: "phone" | "laptop";
  vehicleId: string | null;
  vehicleName: string;
  status: string;
  connectionStatus: string;
  lastSeenAt: string | null;
  ingestToken: string | null;
  createdAt: string;
}

const isConfigured = Boolean(
  process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
);

function generateToken(): string {
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
}

function trackerKind(protocol: string): "phone" | "laptop" {
  return protocol === "osmand" ? "phone" : "laptop";
}

function isOnline(lastSeenAt: string | null, connectionStatus: string): boolean {
  if (connectionStatus === "sleeping") return false;
  if (!lastSeenAt) return false;
  return Date.now() - new Date(lastSeenAt).getTime() < 15 * 60_000;
}

export default function TrackersPage() {
  const [trackers, setTrackers] = useState<Tracker[]>([]);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState<string | null>(null);
  const [renameTarget, setRenameTarget] = useState<Tracker | null>(null);
  const [renameValue, setRenameValue] = useState("");
  const [deleteTarget, setDeleteTarget] = useState<Tracker | null>(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    if (!isConfigured) {
      setLoading(false);
      return;
    }
    try {
      const { supabase } = await import("@/lib/supabase");
      const [{ data: devices }, { data: vehicles }] = await Promise.all([
        supabase
          .from("devices")
          .select("id, name, imei, protocol, status, connection_status, last_seen_at, ingest_token, created_at")
          .in("protocol", ["osmand", "laptop-agent"])
          .order("created_at", { ascending: false }),
        supabase.from("vehicles").select("id, name, plate, kind, device_id").limit(500),
      ]);
      const byDevice = new Map((vehicles ?? []).map((v) => [v.device_id, v]));
      setTrackers(
        (devices ?? []).map((d) => {
          const v = byDevice.get(d.id);
          return {
            deviceId: d.id,
            name: d.name ?? "",
            imei: d.imei ?? "",
            protocol: d.protocol ?? "",
            kind: trackerKind(d.protocol ?? ""),
            vehicleId: v?.id ?? null,
            vehicleName: v?.name || v?.plate || "",
            status: d.status ?? "",
            connectionStatus: d.connection_status ?? "unknown",
            lastSeenAt: d.last_seen_at ?? null,
            ingestToken: d.ingest_token ?? null,
            createdAt: d.created_at ?? "",
          };
        }),
      );
    } catch {
      toast.error("Could not load trackers");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const copy = async (key: string, value: string) => {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(key);
      setTimeout(() => setCopied(null), 1500);
      toast.success("Copied");
    } catch {
      toast.error("Copy failed — select and copy manually");
    }
  };

  const ingestUrl = (t: Tracker) =>
    `${typeof window !== "undefined" ? window.location.origin : ""}/api/ingest/osmand?key=${t.ingestToken ?? ""}`;

  const regenerateToken = async (t: Tracker) => {
    setBusy(true);
    try {
      const { supabase } = await import("@/lib/supabase");
      const token = generateToken();
      const { error } = await supabase.from("devices").update({ ingest_token: token }).eq("id", t.deviceId);
      if (error) throw error;
      toast.success("New ingest URL generated — update the device with it");
      await load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not regenerate");
    } finally {
      setBusy(false);
    }
  };

  const saveRename = async () => {
    const name = renameValue.trim();
    if (!renameTarget || !name) return;
    setBusy(true);
    try {
      const { supabase } = await import("@/lib/supabase");
      const { error } = await supabase.from("devices").update({ name }).eq("id", renameTarget.deviceId);
      if (error) throw error;
      if (renameTarget.vehicleId) {
        await supabase.from("vehicles").update({ name }).eq("id", renameTarget.vehicleId);
      }
      toast.success("Tracker renamed");
      setRenameTarget(null);
      refreshAllLiveData();
      await load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not rename");
    } finally {
      setBusy(false);
    }
  };

  const removeTracker = async () => {
    if (!deleteTarget) return;
    setBusy(true);
    try {
      const { supabase } = await import("@/lib/supabase");
      if (deleteTarget.vehicleId) {
        await supabase.from("vehicles").delete().eq("id", deleteTarget.vehicleId);
      }
      const { error } = await supabase.from("devices").delete().eq("id", deleteTarget.deviceId);
      if (error) throw error;
      toast.success(`${deleteTarget.name || "Tracker"} removed`);
      setDeleteTarget(null);
      refreshAllLiveData();
      await load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not delete");
    } finally {
      setBusy(false);
    }
  };

  return (
    <PageContainer className="max-w-[900px]">
      <PageHeader
        title="App Trackers"
        subtitle="Phones and laptops reporting through the AeroTrack agent — manage their ingest links and labels"
        actions={
          <Button render={<Link href="/devices/onboard" />} className="gap-2 rounded-xl shadow-card">
            <Download className="size-4" /> Add Tracker
          </Button>
        }
      />

      {loading ? (
        <Panel className="p-10 text-center text-sm text-muted-foreground">Loading trackers…</Panel>
      ) : trackers.length === 0 ? (
        <Panel className="p-10 text-center">
          <Smartphone className="mx-auto size-8 text-muted-foreground/50" />
          <p className="mt-3 text-sm font-medium">No app trackers yet</p>
          <p className="mt-1 text-[13px] text-muted-foreground">
            Add a phone or laptop tracker to start reporting locations.
          </p>
          <Button render={<Link href="/devices/onboard" />} variant="outline" className="mt-4 rounded-xl">
            Add Tracker
          </Button>
        </Panel>
      ) : (
        <div className="flex flex-col gap-3">
          {trackers.map((t) => {
            const online = isOnline(t.lastSeenAt, t.connectionStatus);
            const Icon = t.kind === "phone" ? Smartphone : Laptop;
            return (
              <Panel key={t.deviceId} className="p-4 sm:p-5">
                <div className="flex flex-wrap items-start gap-3">
                  <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                    <Icon className="size-5" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-[14.5px] font-semibold">{t.name || t.vehicleName || "Unnamed tracker"}</span>
                      <Pill tone={online ? "success" : "muted"}>{online ? "Online" : "Offline"}</Pill>
                      <Pill tone="primary">{t.kind === "phone" ? "Phone" : "Laptop"}</Pill>
                    </div>
                    <div className="mt-1 flex flex-wrap gap-x-4 gap-y-0.5 text-[12px] text-muted-foreground">
                      <span>{t.vehicleName && t.vehicleName !== t.name ? `${t.vehicleName} · ` : ""}{t.imei}</span>
                      <span>Last seen {t.lastSeenAt ? timeAgo(t.lastSeenAt) : "never"}</span>
                      {t.kind === "laptop" && (
                        <Link href="/docs" className="font-medium text-primary hover:underline">
                          Laptop agent &amp; docs
                        </Link>
                      )}
                    </div>
                  </div>
                  <div className="flex shrink-0 gap-1.5">
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-8 gap-1.5 rounded-lg text-[12px]"
                      onClick={() => {
                        setRenameValue(t.name || t.vehicleName);
                        setRenameTarget(t);
                      }}
                    >
                      <Pencil className="size-3.5" /> Rename
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-8 gap-1.5 rounded-lg text-[12px] text-destructive hover:text-destructive"
                      onClick={() => setDeleteTarget(t)}
                    >
                      <Trash2 className="size-3.5" />
                    </Button>
                  </div>
                </div>

                {/* Ingest link — the private URL the device reports to */}
                <div className="mt-3 rounded-xl border border-border/60 bg-muted/40 p-3">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                      Ingest URL — keep private
                    </span>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 gap-1 rounded-md px-2 text-[11.5px]"
                      disabled={busy}
                      onClick={() => void regenerateToken(t)}
                    >
                      <RefreshCw className="size-3" /> Regenerate
                    </Button>
                  </div>
                  <div className="mt-1.5 flex items-center gap-2">
                    <code className="min-w-0 flex-1 truncate rounded-lg bg-background px-2.5 py-1.5 font-mono text-[11px]">
                      {ingestUrl(t)}
                    </code>
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-8 shrink-0 gap-1.5 rounded-lg text-[12px]"
                      onClick={() => void copy(t.deviceId, ingestUrl(t))}
                    >
                      {copied === t.deviceId ? <Check className="size-3.5 text-success" /> : <Copy className="size-3.5" />}
                      {copied === t.deviceId ? "Copied" : "Copy"}
                    </Button>
                  </div>
                  <p className="mt-1.5 text-[11px] text-muted-foreground">
                    {t.kind === "phone"
                      ? "Paste this as the Server URL in Traccar Client on the phone."
                      : "Pass this as --url when running laptop-agent.py on the laptop."}
                  </p>
                </div>
              </Panel>
            );
          })}
        </div>
      )}

      {/* Rename */}
      <Dialog open={!!renameTarget} onOpenChange={(o) => !o && setRenameTarget(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Rename tracker</DialogTitle>
            <DialogDescription>
              This label appears on Live Tracking, the vehicle list and alerts.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-1.5">
            <Label htmlFor="trk-name">Name</Label>
            <Input
              id="trk-name"
              value={renameValue}
              onChange={(e) => setRenameValue(e.target.value)}
              placeholder="e.g. Tendai's Phone"
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRenameTarget(null)} disabled={busy}>
              Cancel
            </Button>
            <Button onClick={() => void saveRename()} disabled={busy || !renameValue.trim()}>
              {busy ? "Saving…" : "Save"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete */}
      <Dialog open={!!deleteTarget} onOpenChange={(o) => !o && setDeleteTarget(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Remove tracker?</DialogTitle>
            <DialogDescription>
              {deleteTarget?.name || "This tracker"} and its asset will be deleted. The device will stop
              reporting — this cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteTarget(null)} disabled={busy}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={() => void removeTracker()} disabled={busy}>
              {busy ? "Removing…" : "Remove"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </PageContainer>
  );
}
