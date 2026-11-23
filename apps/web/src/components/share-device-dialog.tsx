"use client";

import { useEffect, useState } from "react";
import { Loader2, Share2, Trash2, UserPlus } from "lucide-react";
import { toast } from "sonner";
import type { Vehicle } from "@aerotrack/shared";
import {
  createDeviceShare,
  deleteDeviceShare,
  fetchOutgoingShares,
  fetchShareTargets,
  type DeviceShare,
  type ShareTarget,
} from "@/lib/device-shares";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { shortDate } from "@/lib/format";

/**
 * Bind/share dialog — clone a device's live view to another tenant without
 * sharing credentials. Only privileged roles see the trigger; RLS enforces
 * the same rule server-side.
 */
export function ShareDeviceDialog({
  vehicle,
  open,
  onOpenChange,
}: {
  vehicle: Vehicle | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const [targets, setTargets] = useState<ShareTarget[]>([]);
  const [shares, setShares] = useState<DeviceShare[]>([]);
  const [targetId, setTargetId] = useState("");
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  const deviceId = vehicle?.deviceId;

  useEffect(() => {
    if (!open || !deviceId) return;
    setLoading(true);
    void Promise.all([fetchShareTargets(), fetchOutgoingShares(deviceId)]).then(
      ([t, s]) => {
        setTargets(t);
        setShares(s);
        setLoading(false);
      },
    );
  }, [open, deviceId]);

  const sharedTenantIds = new Set(shares.map((s) => s.toTenantId));
  const available = targets.filter((t) => !sharedTenantIds.has(t.id));

  const share = async () => {
    if (!deviceId || !targetId) return;
    setSaving(true);
    const ok = await createDeviceShare(deviceId, targetId);
    setSaving(false);
    if (!ok) {
      toast.error("Could not share this device — check your permissions");
      return;
    }
    toast.success("Device bound — the other account can now track it live");
    setTargetId("");
    const s = await fetchOutgoingShares(deviceId);
    setShares(s);
  };

  const revoke = async (id: string) => {
    const ok = await deleteDeviceShare(id);
    if (!ok) {
      toast.error("Could not revoke the binding");
      return;
    }
    toast.success("Binding revoked");
    if (deviceId) setShares(await fetchOutgoingShares(deviceId));
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Share2 className="size-4 text-primary" /> Bind device
          </DialogTitle>
          <DialogDescription>
            Share <span className="font-semibold text-foreground">{vehicle?.name || vehicle?.plate}</span>{" "}
            with another account. They&apos;ll see this vehicle and its live position — no passwords shared.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label className="text-[12.5px]">Share with</Label>
            <Select value={targetId} onValueChange={(v) => setTargetId(v ?? "")}>
              <SelectTrigger className="h-10 rounded-xl">
                <SelectValue placeholder={loading ? "Loading…" : "Choose an account"} />
              </SelectTrigger>
              <SelectContent>
                {available.map((t) => (
                  <SelectItem key={t.id} value={t.id}>
                    {t.name}
                    {t.accountKind === "reseller" ? " (reseller)" : ""}
                  </SelectItem>
                ))}
                {available.length === 0 && !loading && (
                  <SelectItem value="__none" disabled>
                    No accounts available
                  </SelectItem>
                )}
              </SelectContent>
            </Select>
          </div>

          <Button
            className="h-10 w-full gap-2 rounded-xl"
            disabled={!targetId || saving || loading}
            onClick={() => void share()}
          >
            {saving ? <Loader2 className="size-4 animate-spin" /> : <UserPlus className="size-4" />}
            Bind device
          </Button>

          {shares.length > 0 && (
            <div className="space-y-1.5">
              <Label className="text-[12.5px]">Active bindings</Label>
              <div className="divide-y divide-border/60 rounded-xl border border-border/60">
                {shares.map((s) => (
                  <div key={s.id} className="flex items-center gap-2 px-3 py-2">
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-[13px] font-medium">{s.toTenantName}</div>
                      <div className="text-[11px] text-muted-foreground">since {shortDate(s.createdAt)}</div>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="size-8 rounded-lg text-muted-foreground hover:text-destructive"
                      onClick={() => void revoke(s.id)}
                      aria-label={`Revoke binding for ${s.toTenantName}`}
                    >
                      <Trash2 className="size-3.5" />
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
