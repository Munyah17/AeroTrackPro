"use client";

import { useState } from "react";
import { LocateFixed, Save, UploadCloud } from "lucide-react";
import { toast } from "sonner";
import { tenants } from "@aerotrack/shared";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { PageContainer, PageHeader, Panel } from "@/components/shared/page";

export default function LoginPageCustomizer() {
  const [tenantId, setTenantId] = useState(tenants[0]!.id);
  const tenant = tenants.find((t) => t.id === tenantId)!;
  const [welcome, setWelcome] = useState("Welcome back");

  return (
    <PageContainer className="max-w-[1100px]">
      <PageHeader
        title="Login Page Customization"
        subtitle="The first thing each client's users see — make it theirs"
        actions={
          <Select value={tenantId} onValueChange={(v) => v && setTenantId(v)}>
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
          <h3 className="text-[15px] font-semibold">Layout & Content</h3>
          <div className="mt-5 space-y-4">
            <div className="space-y-1.5">
              <Label className="text-[12.5px]">Welcome text</Label>
              <Input value={welcome} onChange={(e) => setWelcome(e.target.value)} className="rounded-xl" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-[12.5px]">Background image</Label>
              <button
                className="flex h-24 w-full flex-col items-center justify-center gap-1.5 rounded-xl border-2 border-dashed border-border text-muted-foreground transition-colors hover:border-primary/50 hover:text-primary"
                onClick={() => toast.info("Background upload — 1920×1080 JPG recommended")}
              >
                <UploadCloud className="size-5" />
                <span className="text-[12px] font-medium">Upload background</span>
              </button>
            </div>
            <div className="space-y-3 border-t border-border/60 pt-4">
              {[
                { label: "Show 'Powered by AeroTrack'", on: false },
                { label: "Allow password reset", on: true },
                { label: "Enable 2FA prompt", on: true },
              ].map((t) => (
                <div key={t.label} className="flex items-center justify-between text-[13px] font-medium">
                  {t.label}
                  <Switch defaultChecked={t.on} onCheckedChange={() => toast.success("Saved")} />
                </div>
              ))}
            </div>
            <Button className="gap-2 rounded-xl shadow-card" onClick={() => toast.success(`Login page saved for ${tenant.name}`)}>
              <Save className="size-4" /> Save Changes
            </Button>
          </div>
        </Panel>

        {/* Preview */}
        <Panel className="overflow-hidden">
          <div className="border-b border-border/60 px-5 py-4">
            <h3 className="text-[15px] font-semibold">Preview — {tenant.customDomain ?? `${tenant.slug}.aerotrack.app`}</h3>
          </div>
          <div
            className="flex h-[420px] items-center justify-center p-6"
            style={{ background: `linear-gradient(135deg, ${tenant.primaryColor}22, ${tenant.primaryColor}66)` }}
          >
            <div className="w-72 rounded-2xl bg-card p-6 shadow-float">
              <div className="flex flex-col items-center gap-2">
                <div className="flex size-11 items-center justify-center rounded-xl" style={{ background: tenant.primaryColor }}>
                  <LocateFixed className="size-5 text-white" />
                </div>
                <div className="text-[14px] font-bold">{tenant.name}</div>
                <div className="text-[11.5px] text-muted-foreground">{welcome}</div>
              </div>
              <div className="mt-5 space-y-2.5">
                <div className="h-9 rounded-lg border bg-muted/40 px-3 text-[11px] leading-9 text-muted-foreground">Email</div>
                <div className="h-9 rounded-lg border bg-muted/40 px-3 text-[11px] leading-9 text-muted-foreground">Password</div>
                <div
                  className="h-9 rounded-lg text-center text-[12px] font-semibold leading-9 text-white"
                  style={{ background: tenant.primaryColor }}
                >
                  Sign In
                </div>
              </div>
            </div>
          </div>
        </Panel>
      </div>
    </PageContainer>
  );
}
