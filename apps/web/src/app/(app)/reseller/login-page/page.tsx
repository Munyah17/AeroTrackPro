"use client";

import { useState } from "react";
import Link from "next/link";
import { Save, Smartphone } from "lucide-react";
import { toast } from "sonner";
import { ImageField } from "@/components/brand/image-field";
import { BrandMark } from "@/components/brand/mark";
import { PageContainer, PageHeader, Panel } from "@/components/shared/page";
import { useBrand } from "@/components/shell/brand-provider";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { type LoginStyle } from "@/lib/brand";

export default function ResellerLoginPage() {
  const { ready } = useBrand();
  if (!ready) {
    return (
      <PageContainer className="max-w-[1100px]">
        <div className="h-40" />
      </PageContainer>
    );
  }
  return <LoginEditor />;
}

function LoginEditor() {
  const { brand, save } = useBrand();
  const [login, setLogin] = useState<LoginStyle>(brand.login);

  const set = (patch: Partial<LoginStyle>) => setLogin((current) => ({ ...current, ...patch }));

  const persist = () => {
    try {
      save({ ...brand, login });
      toast.success("Login page updated", { description: "Open Preview login to see it full size." });
    } catch {
      toast.error("That background image is too large to store in this browser.");
    }
  };

  return (
    <PageContainer className="max-w-[1100px]">
      <PageHeader
        title="Login page"
        subtitle="The screen your clients see before they reach the map"
        actions={
          <Button variant="outline" className="rounded-xl" render={<Link href="/login" />}>
            Preview login
          </Button>
        }
      />

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Panel className="p-6">
          <h3 className="flex items-center gap-2 text-[15px] font-semibold">
            <Smartphone className="size-4.5 text-primary" /> Layout and copy
          </h3>
          <div className="mt-5 space-y-4">
            <div className="space-y-1.5">
              <Label className="text-[12.5px]">Welcome text</Label>
              <Input value={login.welcome} onChange={(event) => set({ welcome: event.target.value })} className="rounded-xl" maxLength={60} />
            </div>
            <div className="space-y-1.5">
              <Label className="text-[12.5px]">Subtitle</Label>
              <Input value={login.subtitle} onChange={(event) => set({ subtitle: event.target.value })} className="rounded-xl" maxLength={90} />
            </div>
            <div className="space-y-1.5">
              <Label className="text-[12.5px]">Panel headline</Label>
              <Input value={login.headline} onChange={(event) => set({ headline: event.target.value })} className="rounded-xl" maxLength={100} />
            </div>
            <div className="space-y-1.5">
              <Label className="text-[12.5px]">Layout</Label>
              <div className="grid grid-cols-2 gap-2">
                {([
                  ["split", "Split screen"],
                  ["centered", "Centered card"],
                ] as const).map(([value, label]) => (
                  <button
                    key={value}
                    type="button"
                    onClick={() => set({ layout: value })}
                    className={`rounded-xl border px-3 py-2 text-[13px] font-medium ${login.layout === value ? "border-primary bg-primary/10 text-primary" : "border-border"}`}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>
            <ImageField
              label="Background image"
              hint="Optional, under 700 KB"
              value={login.backgroundDataUrl}
              maxBytes={700_000}
              onChange={(backgroundDataUrl) => set({ backgroundDataUrl })}
            />
            <div className="space-y-3 border-t border-border/60 pt-4">
              <div className="flex items-center justify-between gap-3 text-[13px] font-medium">
                Show “Powered by AeroTrack”
                <Switch checked={login.showPoweredBy} onCheckedChange={(checked) => set({ showPoweredBy: checked === true })} />
              </div>
              <div className="flex items-center justify-between gap-3 text-[13px] font-medium">
                Allow password reset
                <Switch checked={login.allowPasswordReset} onCheckedChange={(checked) => set({ allowPasswordReset: checked === true })} />
              </div>
            </div>
            <Button type="button" className="gap-2 rounded-xl shadow-card" onClick={persist}>
              <Save className="size-4" /> Save login page
            </Button>
          </div>
        </Panel>

        <Panel className="overflow-hidden">
          <div className="border-b border-border/60 px-5 py-4">
            <h3 className="text-[15px] font-semibold">Preview</h3>
          </div>
          <div
            className="flex min-h-[420px] items-center justify-center p-6"
            style={{
              background: login.backgroundDataUrl
                ? `linear-gradient(160deg, ${brand.primary}cc, ${brand.primary}88), url("${login.backgroundDataUrl}") center/cover`
                : `linear-gradient(160deg, ${brand.primary}, ${brand.primary}99)`,
            }}
          >
            <div className="w-full max-w-xs rounded-2xl bg-card p-6 text-foreground shadow-float">
              <div className="flex flex-col items-center gap-2 text-center">
                <div className="flex size-11 items-center justify-center overflow-hidden rounded-xl" style={{ background: brand.primary }}>
                  <BrandMark logo={brand.logoDataUrl} className="size-5 text-white" />
                </div>
                <div className="text-[14px] font-bold">{brand.name}</div>
                <div className="text-[13px] font-semibold">{login.welcome || "Welcome back"}</div>
                <div className="text-[11.5px] text-muted-foreground">{login.subtitle}</div>
              </div>
              <div className="mt-5 space-y-2.5">
                <div className="h-9 rounded-lg border bg-muted/40 px-3 text-[11px] leading-9 text-muted-foreground">Email</div>
                <div className="h-9 rounded-lg border bg-muted/40 px-3 text-[11px] leading-9 text-muted-foreground">Password</div>
                <div className="h-9 rounded-lg text-center text-[12px] font-semibold leading-9 text-white" style={{ background: brand.primary }}>
                  Sign in
                </div>
              </div>
            </div>
          </div>
        </Panel>
      </div>
    </PageContainer>
  );
}
