"use client";

import { useState } from "react";
import Link from "next/link";
import { Palette, RotateCcw, Save } from "lucide-react";
import { toast } from "sonner";
import { ImageField } from "@/components/brand/image-field";
import { BrandMark } from "@/components/brand/mark";
import { PageContainer, PageHeader, Panel } from "@/components/shared/page";
import { useBrand } from "@/components/shell/brand-provider";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { DEFAULT_BRAND, normalizeHex, PLATFORM_NAME, PLATFORM_PRIMARY, type BrandConfig } from "@/lib/brand";

const SWATCHES = ["#1E40FF", "#0F766E", "#7C3AED", "#B45309", "#BE123C", "#0369A1"];

export default function ResellerBrandingPage() {
  const { ready } = useBrand();
  if (!ready) {
    return (
      <PageContainer className="max-w-[1100px]">
        <div className="h-40" />
      </PageContainer>
    );
  }
  return <BrandingEditor />;
}

function BrandingEditor() {
  const { brand, save } = useBrand();
  const [draft, setDraft] = useState<BrandConfig>(brand);

  const set = (patch: Partial<BrandConfig>) => setDraft((current) => ({ ...current, ...patch }));

  const persist = () => {
    const primary = normalizeHex(draft.primary);
    if (!primary) {
      toast.error("Enter a colour as #RRGGBB");
      return;
    }
    try {
      save({ ...draft, primary });
      toast.success("Brand applied", {
        description: "The app, login page, and client site now use this identity.",
      });
    } catch {
      toast.error("That logo is too large to store in this browser. Use a smaller image.");
    }
  };

  return (
    <PageContainer className="max-w-[1100px]">
      <PageHeader
        title="Branding"
        subtitle="Colour, logo, and name your clients see in the app"
        actions={
          <Button variant="outline" className="rounded-xl" render={<Link href="/login" />}>
            Preview login
          </Button>
        }
      />

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Panel className="p-6">
          <h3 className="flex items-center gap-2 text-[15px] font-semibold">
            <Palette className="size-4.5 text-primary" /> Brand identity
          </h3>
          <div className="mt-5 space-y-5">
            <div className="space-y-1.5">
              <Label className="text-[12.5px]">Brand name</Label>
              <Input
                value={draft.name}
                onChange={(event) => set({ name: event.target.value })}
                className="rounded-xl"
                maxLength={48}
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-[12.5px]">Tagline</Label>
              <Input
                value={draft.tagline}
                onChange={(event) => set({ tagline: event.target.value })}
                className="rounded-xl"
                maxLength={80}
              />
            </div>
            <ImageField
              label="Logo"
              hint="PNG or SVG, under 350 KB"
              value={draft.logoDataUrl}
              maxBytes={350_000}
              onChange={(logoDataUrl) => set({ logoDataUrl })}
            />
            <ImageField
              label="Favicon"
              hint="Square PNG, under 80 KB"
              value={draft.faviconDataUrl}
              maxBytes={80_000}
              onChange={(faviconDataUrl) => set({ faviconDataUrl })}
            />
            <div className="space-y-1.5">
              <Label className="text-[12.5px]">Primary colour</Label>
              <div className="flex flex-wrap gap-2">
                {SWATCHES.map((color) => (
                  <button
                    key={color}
                    type="button"
                    aria-label={color}
                    onClick={() => set({ primary: color })}
                    className="size-9 rounded-xl ring-offset-2"
                    style={{
                      background: color,
                      outline: draft.primary.toUpperCase() === color ? `2px solid ${color}` : "2px solid transparent",
                    }}
                  />
                ))}
              </div>
              <div className="flex items-center gap-2 pt-1">
                <input
                  type="color"
                  value={normalizeHex(draft.primary) ?? PLATFORM_PRIMARY}
                  onChange={(event) => set({ primary: event.target.value.toUpperCase() })}
                  className="size-9 cursor-pointer rounded-lg border"
                  aria-label="Custom colour"
                />
                <Input
                  value={draft.primary}
                  onChange={(event) => set({ primary: event.target.value })}
                  className="rounded-xl font-mono text-[12.5px]"
                />
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button type="button" className="gap-2 rounded-xl shadow-card" onClick={persist}>
                <Save className="size-4" /> Save and apply
              </Button>
              <Button
                type="button"
                variant="outline"
                className="gap-2 rounded-xl"
                onClick={() => {
                  const next: BrandConfig = {
                    ...draft,
                    name: PLATFORM_NAME,
                    tagline: DEFAULT_BRAND.tagline,
                    primary: PLATFORM_PRIMARY,
                    logoDataUrl: null,
                    faviconDataUrl: null,
                  };
                  try {
                    save(next);
                    setDraft(next);
                    toast.success("Restored AeroTrack colours and name");
                  } catch {
                    toast.error("Could not reset the brand in this browser.");
                  }
                }}
              >
                <RotateCcw className="size-4" /> Reset
              </Button>
            </div>
          </div>
        </Panel>

        <Panel className="overflow-hidden">
          <div className="border-b border-border/60 px-5 py-4">
            <h3 className="text-[15px] font-semibold">What clients see</h3>
          </div>
          <div className="p-6">
            <div className="overflow-hidden rounded-2xl border shadow-card">
              <div className="flex h-12 items-center gap-2 px-4 text-white" style={{ background: draft.primary }}>
                <span className="flex size-7 items-center justify-center overflow-hidden rounded-lg bg-white/15">
                  <BrandMark logo={draft.logoDataUrl} className="size-4 text-white" />
                </span>
                <span className="truncate text-[13px] font-bold">{draft.name || "Your brand"}</span>
              </div>
              <div className="grid grid-cols-3 gap-2.5 bg-muted/50 p-4">
                {[0, 1, 2].map((i) => (
                  <div key={i} className="rounded-xl bg-card p-3 shadow-card">
                    <div className="h-1.5 w-8 rounded-full" style={{ background: draft.primary }} />
                    <div className="mt-2 h-2 w-full rounded-full bg-muted" />
                  </div>
                ))}
                <div className="col-span-3 flex h-24 items-center justify-center rounded-xl bg-card text-[11px] text-muted-foreground shadow-card">
                  Live map
                </div>
                <div className="col-span-3 flex justify-end">
                  <div className="rounded-full px-4 py-1.5 text-[11px] font-semibold text-white" style={{ background: draft.primary }}>
                    Primary button
                  </div>
                </div>
              </div>
            </div>
            <p className="mt-4 text-[12.5px] leading-relaxed text-muted-foreground">
              Saving updates the sidebar, buttons, and login panel in this browser. Pair it with a domain and a landing template so the public site matches too.
            </p>
          </div>
        </Panel>
      </div>
    </PageContainer>
  );
}
