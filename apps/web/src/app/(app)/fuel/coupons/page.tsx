"use client";

import { useMemo, useState } from "react";
import {
  CheckCircle2,
  Clock,
  Download,
  Fuel,
  Plus,
  Printer,
  QrCode as QrIcon,
  Ticket,
} from "lucide-react";
import { toast } from "sonner";
import { PageContainer, PageHeader, Panel } from "@/components/shared/page";
import { Pill } from "@/components/shared/status";
import { QrCode } from "@/components/shared/qr-code";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { downloadCsv } from "@/lib/export";
import { usd } from "@/lib/format";

type CouponStatus = "active" | "redeemed" | "expired" | "void";

interface Coupon {
  code: string;
  amountUsd: number | null;
  litres: number | null;
  fuelType: "diesel" | "petrol" | "any";
  status: CouponStatus;
  driver?: string;
  createdAt: string;
  expiresAt?: string;
  redeemedAt?: string;
  redeemedStation?: string;
}

const ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
function generateCode() {
  let s = "";
  for (let i = 0; i < 8; i++) s += ALPHABET[Math.floor(Math.random() * ALPHABET.length)];
  return `ATF-${s}`;
}

const DAY = 86_400_000;
const iso = (d: number) => new Date(Date.now() - d * DAY).toISOString();

const SEED: Coupon[] = [
  { code: "ATF-8H2K4M9P", amountUsd: 50, litres: null, fuelType: "diesel", status: "active", driver: "Tendai Moyo", createdAt: iso(1), expiresAt: iso(-29) },
  { code: "ATF-3N7Q1R5T", amountUsd: 40, litres: null, fuelType: "diesel", status: "active", driver: "Rudo Mapfumo", createdAt: iso(2), expiresAt: iso(-28) },
  { code: "ATF-6B9C2D4E", amountUsd: 30, litres: null, fuelType: "petrol", status: "active", driver: "Blessing Ncube", createdAt: iso(3), expiresAt: iso(-11) },
  { code: "ATF-1X5Y8Z2W", amountUsd: null, litres: 40, fuelType: "diesel", status: "redeemed", driver: "Tendai Moyo", createdAt: iso(5), redeemedAt: iso(2), redeemedStation: "Puma Samora Machel" },
  { code: "ATF-7K3M9N2P", amountUsd: 25, litres: null, fuelType: "diesel", status: "redeemed", driver: "Kudzai Moyo", createdAt: iso(8), redeemedAt: iso(6), redeemedStation: "Total Borrowdale" },
];

const STATUS_TONE: Record<CouponStatus, "success" | "warning" | "muted" | "danger"> = {
  active: "success",
  redeemed: "muted",
  expired: "warning",
  void: "danger",
};

function couponValue(c: Coupon) {
  return c.amountUsd != null ? usd(c.amountUsd) : `${c.litres} L`;
}

function redeemUrl(code: string) {
  if (typeof window === "undefined") return `/redeem/${code}`;
  return `${window.location.origin}/redeem/${code}`;
}

export default function FuelCouponsPage() {
  const [coupons, setCoupons] = useState<Coupon[]>(SEED);
  const [issueOpen, setIssueOpen] = useState(false);
  const [viewing, setViewing] = useState<Coupon | null>(null);
  const [form, setForm] = useState({
    valueType: "amount" as "amount" | "litres",
    amount: "50",
    litres: "40",
    fuelType: "diesel" as Coupon["fuelType"],
    quantity: "1",
    validDays: "30",
    driver: "",
  });

  const stats = useMemo(() => {
    const active = coupons.filter((c) => c.status === "active");
    const redeemed = coupons.filter((c) => c.status === "redeemed");
    const outstanding = active.reduce((n, c) => n + (c.amountUsd ?? 0), 0);
    return { active: active.length, redeemed: redeemed.length, outstanding };
  }, [coupons]);

  const issue = () => {
    const qty = Math.min(Math.max(parseInt(form.quantity || "1"), 1), 100);
    const amount = form.valueType === "amount" ? parseFloat(form.amount) : null;
    const litres = form.valueType === "litres" ? parseFloat(form.litres) : null;
    if (form.valueType === "amount" && (!amount || amount <= 0)) return toast.error("Enter a valid amount");
    if (form.valueType === "litres" && (!litres || litres <= 0)) return toast.error("Enter valid litres");

    const fresh: Coupon[] = Array.from({ length: qty }, () => ({
      code: generateCode(),
      amountUsd: amount,
      litres,
      fuelType: form.fuelType,
      status: "active" as const,
      driver: form.driver || undefined,
      createdAt: new Date().toISOString(),
      expiresAt: new Date(Date.now() + parseInt(form.validDays || "30") * DAY).toISOString(),
    }));
    setCoupons((prev) => [...fresh, ...prev]);
    setIssueOpen(false);
    if (qty === 1) setViewing(fresh[0]!);
    toast.success(`${qty} coupon${qty > 1 ? "s" : ""} issued`);
  };

  const exportCoupons = () => {
    downloadCsv(
      "fuel-coupons",
      ["Code", "Value", "Fuel", "Status", "Driver", "Issued", "Redeemed at", "Station"],
      coupons.map((c) => [
        c.code,
        couponValue(c),
        c.fuelType,
        c.status,
        c.driver ?? "",
        new Date(c.createdAt).toLocaleDateString(),
        c.redeemedAt ? new Date(c.redeemedAt).toLocaleDateString() : "",
        c.redeemedStation ?? "",
      ]),
    );
    toast.success("Coupons exported");
  };

  return (
    <PageContainer>
      <PageHeader
        title="Fuel Coupons"
        subtitle="Issue QR fuel coupons to drivers — redeemable at any participating station"
        actions={
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" className="gap-2 rounded-xl" onClick={exportCoupons}>
              <Download className="size-4" /> Export
            </Button>
            <Dialog open={issueOpen} onOpenChange={setIssueOpen}>
              <DialogTrigger
                render={
                  <Button className="gap-2 rounded-xl shadow-card">
                    <Plus className="size-4" /> Issue Coupons
                  </Button>
                }
              />
              <DialogContent className="max-w-md">
                <DialogHeader>
                  <DialogTitle>Issue fuel coupons</DialogTitle>
                </DialogHeader>
                <div className="space-y-4 pt-4">
                  <div className="space-y-2">
                    <Label className="text-xs">Coupon value</Label>
                    <RadioGroup
                      value={form.valueType}
                      onValueChange={(v) => v && setForm({ ...form, valueType: v as "amount" | "litres" })}
                      className="grid grid-cols-2 gap-2"
                    >
                      {(["amount", "litres"] as const).map((t) => (
                        <label
                          key={t}
                          className="flex cursor-pointer items-center gap-2 rounded-xl border border-border/60 p-2.5 text-[13px] has-[:checked]:border-primary has-[:checked]:bg-primary/5"
                        >
                          <RadioGroupItem value={t} />
                          {t === "amount" ? "Fixed amount" : "Fixed litres"}
                        </label>
                      ))}
                    </RadioGroup>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    {form.valueType === "amount" ? (
                      <div className="space-y-1.5">
                        <Label className="text-xs">Amount (USD)</Label>
                        <Input type="number" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} className="rounded-xl" />
                      </div>
                    ) : (
                      <div className="space-y-1.5">
                        <Label className="text-xs">Litres</Label>
                        <Input type="number" value={form.litres} onChange={(e) => setForm({ ...form, litres: e.target.value })} className="rounded-xl" />
                      </div>
                    )}
                    <div className="space-y-1.5">
                      <Label className="text-xs">Fuel type</Label>
                      <Select value={form.fuelType} onValueChange={(v) => v && setForm({ ...form, fuelType: v as Coupon["fuelType"] })}>
                        <SelectTrigger className="rounded-xl"><SelectValue /></SelectTrigger>
                        <SelectContent className="rounded-xl">
                          <SelectItem value="diesel">Diesel</SelectItem>
                          <SelectItem value="petrol">Petrol</SelectItem>
                          <SelectItem value="any">Any</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <Label className="text-xs">Quantity</Label>
                      <Input type="number" value={form.quantity} onChange={(e) => setForm({ ...form, quantity: e.target.value })} className="rounded-xl" />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs">Valid for (days)</Label>
                      <Input type="number" value={form.validDays} onChange={(e) => setForm({ ...form, validDays: e.target.value })} className="rounded-xl" />
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-xs">Assign to driver (optional)</Label>
                    <Input value={form.driver} onChange={(e) => setForm({ ...form, driver: e.target.value })} placeholder="Driver name" className="rounded-xl" />
                  </div>

                  <Button onClick={issue} className="w-full gap-2 rounded-xl">
                    <Ticket className="size-4" /> Issue
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        }
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        {[
          { label: "Active coupons", value: stats.active, icon: Ticket, tone: "text-emerald-500" },
          { label: "Redeemed", value: stats.redeemed, icon: CheckCircle2, tone: "text-muted-foreground" },
          { label: "Outstanding value", value: usd(stats.outstanding), icon: Fuel, tone: "text-primary" },
        ].map((s) => (
          <Panel key={s.label} className="p-4">
            <div className="flex items-center gap-2 text-muted-foreground">
              <s.icon className={`size-4 ${s.tone}`} />
              <span className="text-[12px]">{s.label}</span>
            </div>
            <div className="mt-1.5 text-2xl font-bold tabular-nums">{s.value}</div>
          </Panel>
        ))}
      </div>

      <Panel className="mt-4">
        <div className="flex items-center justify-between border-b border-border/60 px-5 py-3.5">
          <h3 className="text-[14px] font-semibold">Issued coupons</h3>
          <span className="text-xs text-muted-foreground">{coupons.length} total</span>
        </div>
        <div className="divide-y divide-border/50">
          {coupons.map((c) => (
            <div key={c.code} className="flex items-center gap-3 px-4 py-3 sm:px-5">
              <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <Fuel className="size-4" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className="truncate font-mono text-[13px] font-semibold">{c.code}</span>
                  <Pill tone={STATUS_TONE[c.status]}>{c.status}</Pill>
                </div>
                <div className="truncate text-[11.5px] text-muted-foreground">
                  {couponValue(c)} · {c.fuelType}
                  {c.driver && ` · ${c.driver}`}
                  {c.status === "redeemed" && c.redeemedStation && ` · at ${c.redeemedStation}`}
                </div>
              </div>
              <Button
                variant="ghost"
                size="icon"
                className="size-8 shrink-0 rounded-lg"
                onClick={() => setViewing(c)}
                aria-label="Show QR"
              >
                <QrIcon className="size-4" />
              </Button>
            </div>
          ))}
        </div>
      </Panel>

      {/* Coupon QR dialog */}
      <Dialog open={!!viewing} onOpenChange={(o) => !o && setViewing(null)}>
        <DialogContent className="max-w-xs">
          <DialogHeader>
            <DialogTitle>Fuel coupon</DialogTitle>
          </DialogHeader>
          {viewing && (
            <div className="flex flex-col items-center gap-3 pt-2 text-center">
              <div className="rounded-2xl border border-border/60 bg-white p-4">
                <QrCode value={redeemUrl(viewing.code)} size={190} />
              </div>
              <div className="font-mono text-[15px] font-bold tracking-wide">{viewing.code}</div>
              <div className="text-[13px] text-muted-foreground">
                {couponValue(viewing)} · {viewing.fuelType}
                {viewing.expiresAt && (
                  <span className="mt-0.5 flex items-center justify-center gap-1 text-[11.5px]">
                    <Clock className="size-3" /> Expires {new Date(viewing.expiresAt).toLocaleDateString()}
                  </span>
                )}
              </div>
              <div className="grid w-full grid-cols-2 gap-2 pt-1">
                <Button
                  variant="outline"
                  size="sm"
                  className="gap-1.5 rounded-xl"
                  onClick={() => {
                    navigator.clipboard.writeText(viewing.code);
                    toast.success("Code copied");
                  }}
                >
                  Copy code
                </Button>
                <Button size="sm" className="gap-1.5 rounded-xl" onClick={() => window.print()}>
                  <Printer className="size-3.5" /> Print
                </Button>
              </div>
              <p className="text-[11px] text-muted-foreground">
                Any participating station scans this QR to redeem.
              </p>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </PageContainer>
  );
}
