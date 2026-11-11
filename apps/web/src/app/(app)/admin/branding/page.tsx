"use client";

import { useRef, useState } from "react";
import { LocateFixed, Paintbrush, Save, UploadCloud } from "lucide-react";
import { toast } from "sonner";
import { useTenants } from "@/hooks/use-platform-data";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { PageContainer, PageHeader, Panel } from "@/components/shared/page";

export default function BrandingPage() {
  const { rows: tenants, update } = useTenants();
  const [tenantId, setTenantId] = useState("");
  const tenant = tenants.find((t) => t.id === tenantId) ?? tenants[0];
  const [primary, setPrimary] = useState(tenant?.primaryColor ?? "#1E40FF");
  const [name, setName] = useState(tenant?.name ?? "");
  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  if (!tenant) return null;

  const switchTenant = (v: string | null) => {
    if (!v) return;
    setTenantId(v);
    const t = tenants.find((x) => x.id === v)!;
    setPrimary(t.primaryColor);
    setName(t.name);
    setLogoUrl(null);
  };

  const uploadLogo = async (file: File) => {
    if (file.size > 5 * 1024 * 1024) return toast.error("Logo must be under 5MB");
    setUploading(true);
    try {
      const { supabase } = await import("@/lib/supabase");
      const ext = file.name.split(".").pop()?.toLowerCase() ?? "png";
      const path = `${tenant.id}/logo.${ext}`;
      const { error } = await supabase.storage.from("branding").upload(path, file, { upsert: true });
      if (error) return toast.error("Upload failed — check storage permissions");
      const { data } = supabase.storage.from("branding").getPublicUrl(path);
      const url = `${data.publicUrl}?v=${Date.now()}`;
      const ok = await update(tenant.id, { logo_url: url });
      if (!ok) return toast.error("Uploaded but could not save logo URL");
      setLogoUrl(url);
      toast.success("Logo uploaded");
    } catch {
      toast.error("Upload failed");
    } finally {
      setUploading(false);
    }
  };

  const save = async () => {
    if (!name.trim()) return toast.error("Display name is required");
    setSaving(true);
    const ok = await update(tenant.id, { name: name.trim(), primary_color: primary });
    setSaving(false);
    if (!ok) return toast.error("Could not save branding");
    toast.success(`Branding saved for ${name.trim()}`);
  };

  return (
    <PageContainer className="max-w-[1100px]">
      <PageHeader
        title="White Label Branding"
        subtitle="Logo, colors, favicon and identity for each client portal"
        actions={
          <Select value={tenantId || tenant.id} onValueChange={switchTenant}>
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
              <input
                ref={fileRef}
                type="file"
                accept="image/png,image/jpeg,image/webp,image/svg+xml"
                className="hidden"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) void uploadLogo(f);
                  e.target.value = "";
                }}
              />
              <button
                className="flex h-28 w-full flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-border text-muted-foreground transition-colors hover:border-primary/50 hover:text-primary disabled:opacity-50"
                onClick={() => fileRef.current?.click()}
                disabled={uploading}
              >
                {logoUrl ?? tenant.logoUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={logoUrl ?? tenant.logoUrl ?? ""} alt="Logo" className="max-h-16 max-w-[70%] object-contain" />
                ) : (
                  <>
                    <UploadCloud className="size-6" />
                    <span className="text-[12.5px] font-medium">
                      {uploading ? "Uploading…" : "Click to upload logo"}
                    </span>
                  </>
                )}
              </button>
            </div>

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

            <Button className="gap-2 rounded-xl shadow-card" onClick={save} disabled={saving}>
              <Save className="size-4" /> {saving ? "Saving…" : "Save Changes"}
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
