"use client";

import Link from "next/link";
import { Handshake, LocateFixed, Shield, Store } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PageContainer, PageHeader, Panel } from "@/components/shared/page";
import { Pill } from "@/components/shared/status";

const ROLES = [
  {
    name: "Master Admin",
    icon: Shield,
    desc: "You. The platform, every reseller portal, and corporate fleet management.",
  },
  {
    name: "Reseller",
    icon: Store,
    desc: "Admin dashboard for a tracking business: clients, devices, billing and branding.",
  },
  {
    name: "User",
    icon: LocateFixed,
    desc: "The end customer. Live map, their vehicles, trip history and alerts.",
  },
];

const MODULES = [
  { name: "Platform admin", access: ["Yes", "No", "No"] },
  { name: "Reseller portal", access: ["Yes", "Yes", "No"] },
  { name: "Live tracking", access: ["Yes", "Yes", "Yes"] },
  { name: "Vehicles, trips, alerts", access: ["Yes", "Yes", "Yes"] },
  { name: "Fleet management", access: ["Yes", "Delegated", "Delegated"] },
];

export default function RolesPage() {
  return (
    <PageContainer className="max-w-[1100px]">
      <PageHeader
        title="Roles & Permissions"
        subtitle="Three account types. Fleet management is a separate grant."
        actions={
          <Button render={<Link href="/admin/fleet-partnerships" />} className="gap-2 rounded-xl shadow-card">
            <Handshake className="size-4" /> Fleet access
          </Button>
        }
      />

      <div className="mb-4 grid grid-cols-1 gap-2.5 md:grid-cols-3">
        {ROLES.map((r) => (
          <Panel key={r.name} className="flex items-start gap-3.5 p-4">
            <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <r.icon className="size-4.5" />
            </div>
            <div className="min-w-0">
              <div className="text-[13.5px] font-semibold">{r.name}</div>
              <div className="mt-0.5 text-[12px] leading-snug text-muted-foreground">{r.desc}</div>
            </div>
          </Panel>
        ))}
      </div>

      <Panel className="overflow-x-auto">
        <table className="w-full min-w-[520px] text-[12.5px]">
          <thead>
            <tr className="border-b border-border/60 text-left">
              <th className="py-3 pl-5 font-semibold">Surface</th>
              {ROLES.map((r) => (
                <th key={r.name} className="px-3 py-3 text-center font-semibold">{r.name}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-border/50">
            {MODULES.map((m) => (
              <tr key={m.name}>
                <td className="py-3 pl-5 font-medium">{m.name}</td>
                {m.access.map((value, i) => (
                  <td key={ROLES[i]!.name} className="px-3 py-3 text-center">
                    <Pill tone={value === "Yes" ? "success" : value === "Delegated" ? "warning" : "muted"}>
                      {value}
                    </Pill>
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </Panel>
      <p className="mt-3 text-[12.5px] text-muted-foreground">
        Delegated means that person can open fleet management only after you grant it on Fleet Partnerships.
      </p>
    </PageContainer>
  );
}
