"use client";

import { useRef, useState } from "react";
import { LocateFixed, Save, UploadCloud } from "lucide-react";
import { toast } from "sonner";
import { useTenants } from "@/hooks/use-platform-data";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { PageContainer, PageHeader, Panel } from "@/components/shared/page";

export default function LoginPageCustomizer() {
  const { rows: tenants, update } = useTenants();
  const [tenantId, setTenantId] = useState("");
  const tenant = tenants.find((t) => t.id === tenantId) ?? tenants[0];
  const [welcome, setWelcome] = useState("Welcome back");
  const [poweredBy, setPoweredBy] = useState(true);
  const [allowReset, setAllowReset] = useState(true);
  const [twoFa, setTwoFa] = useState(false);
  const [bgUrl, setBgUrl] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  if (!tenant) return null;

  const switchTenant = (v: string | null) => {
    if (!v) return;
    setTenantId(v);
    setWelcome("Welcome back");
    setPoweredBy(true);
    setAllowReset(true);
    setTwoFa(false);
    setBgUrl(null);
  };

  const uploadBg = async (file: File) => {
    if (file.size > 5 * 1024 * 1024) return toast.error("Background must be under 5MB");
    setUploading(true);
    try {
      const { supabase } = await import("@/lib/supabase");
      const ext = file.name.split(".").pop()?.toLowerCase() ?? "jpg";
      const path = `${tenant.id}/login-bg.${ext}`;
      const { error } = await supabase.storage.from("branding").upload(path, file, { upsert: true });
      if (error) return toast.error("Upload failed — check storage permissions");
      const { data } = supabase.storage.from("branding").getPublicUrl(path);
      const url = `${data.publicUrl}?v=${Date.now()}`;
      const ok = await update(tenant.id, { login_bg_url: url });
      if (!ok) return toast.error("Uploaded but could not save background URL");
      setBgUrl(url);
      toast.success("Background uploaded");
    } catch {
      toast.error("Upload failed");
    } finally {
      setUploading(false);
    }
  };

  const save = async () => {
    setSaving(true);
    const ok = await update(tenant.id, {
      login_welcome: welcome.trim() || "Welcome back",
      login_show_powered_by: poweredBy,
      login_allow_reset: allowReset,
      login_2fa: twoFa,
    });
    setSaving(false);
    if (!ok) return toast.error("Could not save login page settings");
    toast.success(`Login page saved for ${tenant.name}`);
  };

  return (
    <PageContainer className="max-w-[1100px]">
      <PageHeader
        title="Login Page Customization"
        subtitle="The first thing each client's users see — make it theirs"
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
          <h3 className="text-[15px] font-semibold">Layout & Content</h3>
          <div className="mt-5 space-y-4">
            <div className="space-y-1.5">
              <Label className="text-[12.5px]">Welcome text</Label>
              <Input value={welcome} onChange={(e) => setWelcome(e.target.value)} className="rounded-xl" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-[12.5px]">Background image</Label>
              <input
                ref={fileRef}
                type="file"
                accept="image/png,image/jpeg,image/webp"
                className="hidden"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) void uploadBg(f);
                  e.target.value = "";
                }}
              />
              <button
                className="flex h-24 w-full flex-col items-center justify-center gap-1.5 overflow-hidden rounded-xl border-2 border-dashed border-border text-muted-foreground transition-colors hover:border-primary/50 hover:text-primary disabled:opacity-50"
                onClick={() => fileRef.current?.click()}
                disabled={uploading}
              >
                {bgUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={bgUrl} alt="Background" className="h-full w-full object-cover" />
                ) : (
                  <>
                    <UploadCloud className="size-5" />
                    <span className="text-[12px] font-medium">
                      {uploading ? "Uploading…" : "Upload background"}
                    </span>
                  </>
                )}
              </button>
            </div>
            <div className="space-y-3 border-t border-border/60 pt-4">
              <div className="flex items-center justify-between text-[13px] font-medium">
                Show &apos;Powered by AeroTrack&apos;
                <Switch checked={poweredBy} onCheckedChange={setPoweredBy} />
              </div>
              <div className="flex items-center justify-between text-[13px] font-medium">
                Allow password reset
                <Switch checked={allowReset} onCheckedChange={setAllowReset} />
              </div>
              <div className="flex items-center justify-between text-[13px] font-medium">
                Enable 2FA prompt
                <Switch checked={twoFa} onCheckedChange={setTwoFa} />
              </div>
            </div>
            <Button className="gap-2 rounded-xl shadow-card" onClick={save} disabled={saving}>
              <Save className="size-4" /> {saving ? "Saving…" : "Save Changes"}
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
            style={
              bgUrl
                ? { background: `url(${bgUrl}) center/cover` }
                : { background: `linear-gradient(135deg, ${tenant.primaryColor}22, ${tenant.primaryColor}66)` }
            }
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
                {allowReset && (
                  <div className="text-center text-[11px] text-muted-foreground">Forgot password?</div>
                )}
                {poweredBy && (
                  <div className="pt-2 text-center text-[10px] text-muted-foreground/70">Powered by AeroTrack</div>
                )}
              </div>
            </div>
          </div>
        </Panel>
      </div>
    </PageContainer>
  );
}
