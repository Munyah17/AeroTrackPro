"use client";

import { use, useEffect, useState } from "react";
import { CheckCircle2, Fuel, Loader2, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface CouponInfo {
  code: string;
  amount_usd: number | null;
  litres: number | null;
  fuel_type: string;
  status: string;
  expires_at: string | null;
  redeemed_station?: string | null;
}

type Phase = "loading" | "ready" | "redeeming" | "done" | "error";

export default function RedeemPage({ params }: { params: Promise<{ code: string }> }) {
  const { code } = use(params);
  const [phase, setPhase] = useState<Phase>("loading");
  const [coupon, setCoupon] = useState<CouponInfo | null>(null);
  const [error, setError] = useState<string>("");
  const [station, setStation] = useState("");
  const [litres, setLitres] = useState("");

  useEffect(() => {
    fetch(`/api/v1/coupons/redeem?code=${encodeURIComponent(code)}`)
      .then(async (r) => {
        const body = await r.json();
        if (!r.ok) throw new Error(body?.error?.message ?? "Coupon not found");
        setCoupon(body.data);
        if (body.data.status !== "active") {
          setError(
            body.data.status === "redeemed"
              ? `Already redeemed${body.data.redeemed_station ? ` at ${body.data.redeemed_station}` : ""}`
              : `Coupon is ${body.data.status}`,
          );
          setPhase("error");
        } else {
          setPhase("ready");
        }
      })
      .catch((e) => {
        setError(e.message);
        setPhase("error");
      });
  }, [code]);

  const redeem = async () => {
    if (!station.trim()) return setError("Enter the station name");
    setError("");
    setPhase("redeeming");
    try {
      const res = await fetch("/api/v1/coupons/redeem", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          code,
          station: station.trim(),
          litres: litres ? parseFloat(litres) : undefined,
        }),
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body?.error?.message ?? "Redemption failed");
      setPhase("done");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Redemption failed");
      setPhase("ready");
    }
  };

  const value = coupon?.amount_usd != null ? `$${coupon.amount_usd.toFixed(2)}` : coupon?.litres ? `${coupon.litres} L` : "";

  return (
    <div className="flex min-h-dvh items-center justify-center bg-gradient-to-b from-slate-50 to-slate-100 p-4 dark:from-slate-950 dark:to-slate-900">
      <div className="w-full max-w-sm rounded-3xl border border-border/60 bg-card p-6 shadow-float">
        <div className="mb-5 flex items-center gap-2.5">
          <div className="flex size-10 items-center justify-center rounded-xl bg-primary text-primary-foreground">
            <Fuel className="size-5" />
          </div>
          <div>
            <div className="text-[15px] font-bold tracking-tight">AeroTrack Fuel</div>
            <div className="text-[11.5px] text-muted-foreground">Station redemption</div>
          </div>
        </div>

        {phase === "loading" && (
          <div className="flex flex-col items-center gap-3 py-10 text-muted-foreground">
            <Loader2 className="size-7 animate-spin" />
            <span className="text-sm">Checking coupon…</span>
          </div>
        )}

        {phase === "error" && (
          <div className="flex flex-col items-center gap-3 py-8 text-center">
            <XCircle className="size-12 text-destructive" />
            <div className="font-mono text-[15px] font-semibold">{code}</div>
            <p className="text-sm text-muted-foreground">{error}</p>
          </div>
        )}

        {phase === "done" && (
          <div className="flex flex-col items-center gap-3 py-8 text-center">
            <CheckCircle2 className="size-14 text-emerald-500" />
            <div className="text-lg font-bold">Redeemed</div>
            <div className="font-mono text-[14px]">{code}</div>
            <p className="text-sm text-muted-foreground">
              {value} {coupon?.fuel_type} dispensed at {station}. The fleet admin has been notified.
            </p>
          </div>
        )}

        {(phase === "ready" || phase === "redeeming") && coupon && (
          <div className="space-y-4">
            <div className="rounded-2xl bg-accent/60 p-4 text-center">
              <div className="text-[11px] uppercase tracking-wider text-muted-foreground">Coupon value</div>
              <div className="mt-0.5 text-3xl font-bold tabular-nums">{value}</div>
              <div className="text-[12.5px] capitalize text-muted-foreground">{coupon.fuel_type}</div>
              <div className="mt-1 font-mono text-[12px] text-muted-foreground">{code}</div>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs">Station name</Label>
              <Input value={station} onChange={(e) => setStation(e.target.value)} placeholder="e.g. Puma Samora Machel" className="rounded-xl" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Litres dispensed (optional)</Label>
              <Input type="number" value={litres} onChange={(e) => setLitres(e.target.value)} placeholder="0.00" className="rounded-xl" />
            </div>

            {error && <p className="text-[12.5px] text-destructive">{error}</p>}

            <Button onClick={redeem} disabled={phase === "redeeming"} className="w-full gap-2 rounded-xl">
              {phase === "redeeming" ? <Loader2 className="size-4 animate-spin" /> : <CheckCircle2 className="size-4" />}
              Confirm redemption
            </Button>
            <p className="text-center text-[11px] text-muted-foreground">
              Redemption is final and immediately notifies the issuing organisation.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
