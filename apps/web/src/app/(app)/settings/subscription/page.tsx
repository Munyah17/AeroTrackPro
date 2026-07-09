"use client";

import { useState } from "react";
import { Check, CreditCard, Download, Gauge, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { cn } from "@/lib/utils";
import { PageContainer, PageHeader, Panel } from "@/components/shared/page";

const USAGE = [
  { label: "Devices", used: 128, limit: 250 },
  { label: "Users", used: 5, limit: 15 },
  { label: "SMS credits", used: 1840, limit: 5000 },
  { label: "API requests / day", used: 36500, limit: 100000 },
];

const PLANS = [
  {
    id: "starter",
    name: "Starter",
    price: 49,
    devices: 50,
    features: ["Live tracking", "Trips & reports", "Email alerts", "2 users"],
  },
  {
    id: "fleet",
    name: "Fleet Pro",
    price: 199,
    devices: 250,
    features: [
      "Everything in Starter",
      "Geofencing & fuel monitoring",
      "SMS alerts & webhooks",
      "15 users",
      "White-label branding",
    ],
    current: true,
  },
  {
    id: "enterprise",
    name: "Enterprise",
    price: 599,
    devices: 2000,
    features: [
      "Everything in Fleet Pro",
      "Unlimited users",
      "Dedicated ingest cluster",
      "Custom domain & SSO",
      "Priority support SLA",
    ],
  },
];

const INVOICES = [
  { id: "INV-2026-0107", date: "1 Jul 2026", amount: 199, status: "paid" },
  { id: "INV-2026-0106", date: "1 Jun 2026", amount: 199, status: "paid" },
  { id: "INV-2026-0105", date: "1 May 2026", amount: 199, status: "paid" },
  { id: "INV-2026-0104", date: "1 Apr 2026", amount: 149, status: "paid" },
];

export default function SubscriptionSettingsPage() {
  const [currentPlan, setCurrentPlan] = useState("fleet");

  const handleSwitch = (planId: string, name: string) => {
    if (planId === currentPlan) return;
    setCurrentPlan(planId);
    toast.success(`Plan change to ${name} scheduled for the next billing cycle`);
  };

  return (
    <PageContainer className="max-w-[1000px]">
      <PageHeader
        title="Subscription"
        subtitle="Your plan, usage and billing history"
      />

      <div className="space-y-4">
        <Panel className="p-6">
          <div className="flex items-center gap-2.5 pb-4">
            <Gauge className="size-4.5 text-primary" />
            <h3 className="text-[15px] font-semibold">Current Usage</h3>
            <Badge variant="secondary" className="ml-auto rounded-lg bg-primary/10 text-primary">
              Fleet Pro — renews 1 Aug 2026
            </Badge>
          </div>

          <div className="grid gap-x-8 gap-y-4 sm:grid-cols-2">
            {USAGE.map((u) => {
              const pct = Math.round((u.used / u.limit) * 100);
              return (
                <div key={u.label}>
                  <div className="flex items-baseline justify-between">
                    <span className="text-[13px] font-medium">{u.label}</span>
                    <span className="text-[12px] tabular-nums text-muted-foreground">
                      {u.used.toLocaleString()} / {u.limit.toLocaleString()}
                    </span>
                  </div>
                  <Progress
                    value={pct}
                    className={cn("mt-1.5 h-2", pct > 85 && "[&>*]:bg-destructive")}
                  />
                </div>
              );
            })}
          </div>
        </Panel>

        <div className="grid gap-4 lg:grid-cols-3">
          {PLANS.map((plan) => {
            const isCurrent = plan.id === currentPlan;
            return (
              <Panel
                key={plan.id}
                className={cn(
                  "flex flex-col p-6",
                  isCurrent && "border-primary/50 ring-1 ring-primary/30",
                )}
              >
                <div className="flex items-center justify-between">
                  <h3 className="text-[15px] font-semibold">{plan.name}</h3>
                  {isCurrent && (
                    <Badge className="rounded-lg bg-primary text-primary-foreground">
                      Current
                    </Badge>
                  )}
                </div>
                <div className="mt-3 flex items-baseline gap-1">
                  <span className="text-3xl font-bold tracking-tight">${plan.price}</span>
                  <span className="text-[12.5px] text-muted-foreground">/month</span>
                </div>
                <div className="mt-1 text-[12.5px] text-muted-foreground">
                  Up to {plan.devices.toLocaleString()} devices
                </div>

                <ul className="mt-4 flex-1 space-y-2">
                  {plan.features.map((f) => (
                    <li key={f} className="flex items-start gap-2 text-[13px]">
                      <Check className="mt-0.5 size-3.5 shrink-0 text-primary" />
                      {f}
                    </li>
                  ))}
                </ul>

                <Button
                  onClick={() => handleSwitch(plan.id, plan.name)}
                  disabled={isCurrent}
                  variant={isCurrent ? "outline" : "default"}
                  className="mt-5 w-full gap-2 rounded-xl"
                >
                  {isCurrent ? (
                    "Current plan"
                  ) : (
                    <>
                      <Sparkles className="size-4" />
                      {PLANS.findIndex((p) => p.id === plan.id) >
                      PLANS.findIndex((p) => p.id === currentPlan)
                        ? "Upgrade"
                        : "Downgrade"}
                    </>
                  )}
                </Button>
              </Panel>
            );
          })}
        </div>

        <Panel>
          <div className="flex items-center gap-2.5 border-b border-border/60 px-5 py-4">
            <CreditCard className="size-4.5 text-primary" />
            <h3 className="text-[15px] font-semibold">Billing History</h3>
            <Button
              variant="outline"
              size="sm"
              className="ml-auto rounded-lg"
              onClick={() => toast.info("Payment method management coming with billing integration")}
            >
              Manage payment method
            </Button>
          </div>

          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="pl-5">Invoice</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Amount</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="pr-5 text-right">Receipt</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {INVOICES.map((inv) => (
                <TableRow key={inv.id}>
                  <TableCell className="pl-5 font-mono text-[12.5px]">{inv.id}</TableCell>
                  <TableCell className="text-[13px] text-muted-foreground">{inv.date}</TableCell>
                  <TableCell className="text-[13px] font-medium tabular-nums">
                    ${inv.amount.toFixed(2)}
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant="secondary"
                      className="rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                    >
                      Paid
                    </Badge>
                  </TableCell>
                  <TableCell className="pr-5 text-right">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="size-8 rounded-lg"
                      onClick={() => toast.success(`${inv.id} downloaded`)}
                    >
                      <Download className="size-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Panel>
      </div>
    </PageContainer>
  );
}
