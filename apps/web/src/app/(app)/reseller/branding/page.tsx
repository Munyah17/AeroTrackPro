"use client";

import { useState } from "react";
import { Palette, Save } from "lucide-react";
import { toast } from "sonner";
import { PageContainer, PageHeader, Panel } from "@/components/shared/page";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const SWATCHES = ["#1E40FF", "#7c3aed", "#059669", "#dc2626", "#0891b2", "#d97706"];

export default function ResellerBrandingPage() {
  const [brand, setBrand] = useState({ name: "My Tracking Co", color: "#1E40FF", domain: "" });

  return (
    <PageContainer className="max-w-[800px]">
      <PageHeader title="Branding" subtitle="Present the platform under your own brand to your clients" />
      <Panel className="p-6">
        <div className="flex items-center gap-2.5 pb-4">
          <Palette className="size-4.5 text-primary" />
          <h3 className="text-[15px] font-semibold">White-label settings</h3>
        </div>
        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label className="text-xs">Brand name</Label>
            <Input value={brand.name} onChange={(e) => setBrand({ ...brand, name: e.target.value })} className="rounded-xl" />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Primary colour</Label>
            <div className="flex gap-2">
              {SWATCHES.map((c) => (
                <button
                  key={c}
                  onClick={() => setBrand({ ...brand, color: c })}
                  className="size-9 rounded-xl ring-offset-2 transition-transform hover:scale-110"
                  style={{ background: c, outline: brand.color === c ? `2px solid ${c}` : "none" }}
                  aria-label={c}
                />
              ))}
            </div>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Custom domain</Label>
            <Input value={brand.domain} onChange={(e) => setBrand({ ...brand, domain: e.target.value })} placeholder="track.mycompany.co.zw" className="rounded-xl" />
          </div>
          <Button onClick={() => toast.success("Branding saved")} className="gap-2 rounded-xl">
            <Save className="size-4" /> Save Branding
          </Button>
        </div>
      </Panel>
    </PageContainer>
  );
}
