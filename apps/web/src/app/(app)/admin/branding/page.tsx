"use client";

import { useState } from "react";
import { LocateFixed, Paintbrush, Save, UploadCloud } from "lucide-react";
import { toast } from "sonner";
import { tenants } from "@aerotrack/shared";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { PageContainer, PageHeader, Panel } from "@/components/shared/page";

export default function BrandingPage() {
  const [tenantId, setTenantId] = useState(tenants[0]!.id);
  const tenant = tenants.find((t) => t.id === tenantId)!;
  const [primary, setPrimary] = useState(tenant.primaryColor);
  const [name, setName] = useState(tenant.name);

  return (
    <PageContainer className="max-w-[1100px]">
      <PageHeader
        title="White Label Branding"
        subtitle="Logo, colors, favicon and identity for each client portal"
        actions={
          <Select
            value={tenantId}
            onValueChange={(v) => {
              if (!v) return;
              setTenantId(v);
              const t = tenants.find((x) => x.id === v)!;
              setPrimary(t.primaryColor);
              setName(t.name);
            }}
          >
            <SelectTrigger className="w-56 rounded-xl bg-card"><SelectValue /></SelectTrigger>
            <SelectContent className="rounded-xl">
              {tenants.map((t) => (
                <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        }
      />

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Panel className="p-6">
          <h3 className="flex items-center gap-2 text-[15px] font-semibold">
            <Paintbrush className="size-4.5 text-primary" /> Brand Settings
          </h3>

          <div className="mt-5 space-y-5">
            <div className="space-y-1.5">
              <Label className="text-[12.5px]">Display name</Label>
              <Input value={name} onChange={(e) => setName(e.target.value)} className="rounded-xl" />
            </div>

            <div className="space-y-1.5">
              <Label className="text-[12.5px]">Logo</Label>
              <button
                className="flex h-28 w-full flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-border text-muted-foreground transition-colors hover:border-primary/50 hover:text-primary"
                onClick={() => toast.info("Logo upload — PNG/SVG, max 1MB, transparent background recommended")}
              >
                <UploadCloud className="size-6" />
                <span className="text-[12.5px] font-medium">Click to upload logo</span>
              </button>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label className="text-[12.5px]">Primary color</Label>
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={primary}
                    onChange={(e) => setPrimary(e.target.value)}
                    className="size-9 cursor-pointer rounded-lg border"
                  />
                  <Input value={primary} onChange={(e) => setPrimary(e.target.value)} className="rounded-xl font-mono text-[12.5px]" />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label className="text-[12.5px]">Favicon</Label>
                <Button variant="outline" className="w-full rounded-xl" onClick={() => toast.info("Favicon upload — 64×64 PNG or SVG")}>
                  Upload favicon
                </Button>
              </div>
            </div>

            <Button className="gap-2 rounded-xl shadow-card" onClick={() => toast.success(`Branding saved for ${name}`)}>
              <Save className="size-4" /> Save Changes
            </Button>
          </div>
        </Panel>

        {/* Live preview */}
        <Panel className="overflow-hidden">
          <div className="border-b border-border/60 px-5 py-4">
            <h3 className="text-[15px] font-semibold">Live Preview</h3>
          </div>
          <div className="p-6">
            <div className="overflow-hidden rounded-2xl border shadow-card">
              {/* Mini portal preview */}
              <div className="flex h-10 items-center gap-2 px-4" style={{ background: primary }}>
                <LocateFixed className="size-4 text-white" />
                <span className="text-[12.5px] font-bold text-white">{name}</span>
              </div>
              <div className="grid grid-cols-3 gap-2.5 bg-muted/50 p-4">
                {[0, 1, 2].map((i) => (
                  <div key={i} className="rounded-xl bg-card p-3 shadow-card">
                    <div className="h-1.5 w-8 rounded-full" style={{ background: primary }} />
                    <div className="mt-2 h-2 w-full rounded-full bg-muted" />
                    <div className="mt-1 h-2 w-2/3 rounded-full bg-muted" />
                  </div>
                ))}
                <div className="col-span-3 flex h-24 items-center justify-center rounded-xl bg-card shadow-card">
                  <span className="text-[11px] text-muted-foreground">Map area</span>
                </div>
                <div className="col-span-3 flex justify-end">
                  <div className="rounded-full px-4 py-1.5 text-[11px] font-semibold text-white" style={{ background: primary }}>
                    Primary Button
                  </div>
                </div>
              </div>
            </div>
            <p className="mt-4 text-[12px] leading-relaxed text-muted-foreground">
              Changes apply to the client&apos;s portal at{" "}
              <span className="font-medium text-foreground">{tenant.customDomain ?? `${tenant.slug}.aerotrack.app`}</span>,
              including login page, emails and PDF report headers.
            </p>
          </div>
        </Panel>
      </div>
    </PageContainer>
  );
}
