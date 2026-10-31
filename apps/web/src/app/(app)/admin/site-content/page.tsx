"use client";

import { useCallback, useEffect, useState } from "react";
import { GripVertical, ImageIcon, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/lib/supabase";
import { fetchAllHeroSlides, type HeroSlide } from "@/lib/hero-slides";
import { fetchAllPartnerLogos, type PartnerLogo } from "@/lib/partner-logos";
import type { Database } from "@aerotrack/shared";

type HeroSlideUpdate = Database["public"]["Tables"]["hero_slides"]["Update"];
type PartnerLogoUpdate = Database["public"]["Tables"]["partner_logos"]["Update"];
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PageContainer, PageHeader, Panel } from "@/components/shared/page";
import { Pill } from "@/components/shared/status";

const EMPTY = { title: "", description: "", cta_label: "Get Started", cta_href: "/register", image_url: "", sort_order: 0 };
const EMPTY_LOGO = { name: "", logo_url: "", sort_order: 0 };

export default function SiteContentPage() {
  const [slides, setSlides] = useState<HeroSlide[]>([]);
  const [logos, setLogos] = useState<PartnerLogo[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [showLogoForm, setShowLogoForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [savingLogo, setSavingLogo] = useState(false);
  const [form, setForm] = useState(EMPTY);
  const [logoForm, setLogoForm] = useState(EMPTY_LOGO);

  const reload = useCallback(async () => {
    const [s, l] = await Promise.all([fetchAllHeroSlides(), fetchAllPartnerLogos()]);
    setSlides(s);
    setLogos(l);
    setLoading(false);
  }, []);

  useEffect(() => { reload(); }, [reload]);

  function set<K extends keyof typeof EMPTY>(key: K, value: (typeof EMPTY)[K]) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  async function saveSlide(e: React.FormEvent) {
    e.preventDefault();
    if (!form.title || !form.image_url) {
      toast.error("Title and image URL are required");
      return;
    }
    setSaving(true);
    const { error } = await supabase.from("hero_slides").insert({
      title: form.title.trim(),
      description: form.description.trim(),
      cta_label: form.cta_label.trim() || "Get Started",
      cta_href: form.cta_href.trim() || "/register",
      image_url: form.image_url.trim(),
      sort_order: form.sort_order || slides.length + 1,
    });
    setSaving(false);
    if (error) { toast.error(`Save failed: ${error.message}`); return; }
    toast.success("Slide added");
    setForm(EMPTY);
    setShowForm(false);
    reload();
  }

  async function updateField(id: string, field: keyof HeroSlide, value: string | number) {
    const { error } = await supabase.from("hero_slides").update({ [field]: value } as HeroSlideUpdate).eq("id", id);
    if (error) toast.error(`Update failed: ${error.message}`);
    else setSlides((s) => s.map((x) => (x.id === id ? { ...x, [field]: value } : x)));
  }

  async function togglePublished(s: HeroSlide) {
    const { error } = await supabase.from("hero_slides").update({ is_published: !s.is_published }).eq("id", s.id);
    if (error) { toast.error(`Update failed: ${error.message}`); return; }
    setSlides((x) => x.map((y) => (y.id === s.id ? { ...y, is_published: !s.is_published } : y)));
  }

  async function removeSlide(s: HeroSlide) {
    const { error } = await supabase.from("hero_slides").delete().eq("id", s.id);
    if (error) { toast.error(`Delete failed: ${error.message}`); return; }
    setSlides((x) => x.filter((y) => y.id !== s.id));
    toast.success("Slide removed");
  }

  async function saveLogo(e: React.FormEvent) {
    e.preventDefault();
    if (!logoForm.name.trim()) {
      toast.error("Name is required");
      return;
    }
    setSavingLogo(true);
    const { error } = await supabase.from("partner_logos").insert({
      name: logoForm.name.trim(),
      logo_url: logoForm.logo_url.trim(),
      sort_order: logoForm.sort_order || logos.length + 1,
    });
    setSavingLogo(false);
    if (error) { toast.error(`Save failed: ${error.message}`); return; }
    toast.success("Logo added");
    setLogoForm(EMPTY_LOGO);
    setShowLogoForm(false);
    reload();
  }

  async function updateLogoField(id: string, field: keyof PartnerLogo, value: string | number) {
    const { error } = await supabase.from("partner_logos").update({ [field]: value } as PartnerLogoUpdate).eq("id", id);
    if (error) toast.error(`Update failed: ${error.message}`);
    else setLogos((s) => s.map((x) => (x.id === id ? { ...x, [field]: value } : x)));
  }

  async function toggleLogoPublished(l: PartnerLogo) {
    const { error } = await supabase.from("partner_logos").update({ is_published: !l.is_published }).eq("id", l.id);
    if (error) { toast.error(`Update failed: ${error.message}`); return; }
    setLogos((x) => x.map((y) => (y.id === l.id ? { ...y, is_published: !l.is_published } : y)));
  }

  async function removeLogo(l: PartnerLogo) {
    const { error } = await supabase.from("partner_logos").delete().eq("id", l.id);
    if (error) { toast.error(`Delete failed: ${error.message}`); return; }
    setLogos((x) => x.filter((y) => y.id !== l.id));
    toast.success("Logo removed");
  }

  return (
    <PageContainer className="max-w-[1100px]">
      <PageHeader
        title="Site Content"
        subtitle="Landing-page hero slides shown on the public homepage"
        actions={
          <Button className="gap-2 rounded-xl shadow-card" onClick={() => setShowForm((s) => !s)}>
            <Plus className="size-4" /> {showForm ? "Close Form" : "Add Slide"}
          </Button>
        }
      />

      {showForm && (
        <Panel className="mb-4 p-5">
          <h3 className="text-[15px] font-semibold">New hero slide</h3>
          <form onSubmit={saveSlide} className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div><Label className="text-xs">Title</Label>
              <Input value={form.title} onChange={(e) => set("title", e.target.value)} className="mt-1" placeholder="Every vehicle on one live map" /></div>
            <div><Label className="text-xs">Sort order</Label>
              <Input value={String(form.sort_order)} onChange={(e) => set("sort_order", Number(e.target.value) || 0)} className="mt-1" /></div>
            <div className="sm:col-span-2"><Label className="text-xs">Description</Label>
              <textarea value={form.description} onChange={(e) => set("description", e.target.value)} rows={2}
                className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm" /></div>
            <div><Label className="text-xs">Button label</Label>
              <Input value={form.cta_label} onChange={(e) => set("cta_label", e.target.value)} className="mt-1" /></div>
            <div><Label className="text-xs">Button link</Label>
              <Input value={form.cta_href} onChange={(e) => set("cta_href", e.target.value)} className="mt-1" placeholder="/register or #apply" /></div>
            <div className="sm:col-span-2"><Label className="text-xs">Background image URL</Label>
              <Input value={form.image_url} onChange={(e) => set("image_url", e.target.value)} className="mt-1" placeholder="https://… 1600×900" /></div>
            <div className="sm:col-span-2">
              <Button type="submit" disabled={saving} className="rounded-xl">{saving ? "Saving…" : "Save Slide"}</Button>
            </div>
          </form>
        </Panel>
      )}

      <div className="space-y-3">
        {loading ? (
          <Panel className="p-10 text-center text-sm text-muted-foreground">Loading slides…</Panel>
        ) : slides.length === 0 ? (
          <Panel className="p-10 text-center text-sm text-muted-foreground">
            No slides yet. Add one above — the homepage shows up to five.
          </Panel>
        ) : slides.map((s) => (
          <Panel key={s.id} className="flex gap-4 p-4">
            <div className="relative h-20 w-32 shrink-0 overflow-hidden rounded-xl bg-muted">
              {s.image_url ? (
                <img src={s.image_url} alt="" className="absolute inset-0 size-full object-cover" />
              ) : (
                <ImageIcon className="absolute inset-0 m-auto size-6 text-muted-foreground" />
              )}
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <GripVertical className="size-4 shrink-0 text-muted-foreground/50" />
                <Input
                  defaultValue={s.title}
                  onBlur={(e) => e.target.value !== s.title && updateField(s.id, "title", e.target.value)}
                  className="h-8 border-transparent bg-transparent px-1 text-[14px] font-semibold hover:border-input focus:border-input"
                />
              </div>
              <textarea
                defaultValue={s.description}
                onBlur={(e) => e.target.value !== s.description && updateField(s.id, "description", e.target.value)}
                rows={2}
                className="mt-1 w-full resize-none rounded-md border-transparent bg-transparent px-1 text-[12.5px] text-muted-foreground hover:border-input focus:border-input"
              />
              <div className="mt-1 flex flex-wrap items-center gap-2 text-[11px] text-muted-foreground">
                <Pill tone="info">#{s.sort_order}</Pill>
                <span>{s.cta_label} → {s.cta_href}</span>
                <button onClick={() => togglePublished(s)} title="Toggle visibility">
                  <Pill tone={s.is_published ? "success" : "muted"}>{s.is_published ? "Live" : "Hidden"}</Pill>
                </button>
              </div>
            </div>
            <div className="flex shrink-0 flex-col items-end gap-2">
              <div className="flex w-40 flex-col gap-1">
                <Label className="text-[10.5px]">Order</Label>
                <Input
                  defaultValue={String(s.sort_order)}
                  onBlur={(e) => Number(e.target.value) !== s.sort_order && updateField(s.id, "sort_order", Number(e.target.value) || 0)}
                  className="h-8"
                />
              </div>
              <Button variant="ghost" size="icon" onClick={() => removeSlide(s)} title="Delete slide">
                <Trash2 className="size-4 text-destructive" />
              </Button>
            </div>
          </Panel>
        ))}
      </div>

      {/* ── Partner logos — landing-page marquee ── */}
      <div className="mt-10 flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold tracking-tight">Partner Logos</h2>
          <p className="text-[12.5px] text-muted-foreground">
            Customer and device-brand entries in the homepage marquee
          </p>
        </div>
        <Button variant="outline" className="gap-2 rounded-xl" onClick={() => setShowLogoForm((s) => !s)}>
          <Plus className="size-4" /> {showLogoForm ? "Close Form" : "Add Logo"}
        </Button>
      </div>

      {showLogoForm && (
        <Panel className="mt-4 p-5">
          <h3 className="text-[15px] font-semibold">New partner logo</h3>
          <form onSubmit={saveLogo} className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
            <div><Label className="text-xs">Name</Label>
              <Input value={logoForm.name} onChange={(e) => setLogoForm((f) => ({ ...f, name: e.target.value }))} className="mt-1" placeholder="Teltonika" /></div>
            <div><Label className="text-xs">Logo image URL</Label>
              <Input value={logoForm.logo_url} onChange={(e) => setLogoForm((f) => ({ ...f, logo_url: e.target.value }))} className="mt-1" placeholder="https://… (transparent PNG works best)" /></div>
            <div><Label className="text-xs">Sort order</Label>
              <Input value={String(logoForm.sort_order)} onChange={(e) => setLogoForm((f) => ({ ...f, sort_order: Number(e.target.value) || 0 }))} className="mt-1" /></div>
            <div className="sm:col-span-3">
              <Button type="submit" disabled={savingLogo} className="rounded-xl">{savingLogo ? "Saving…" : "Save Logo"}</Button>
            </div>
          </form>
        </Panel>
      )}

      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        {logos.map((l) => (
          <Panel key={l.id} className="flex items-center gap-4 p-4">
            <div className="flex h-14 w-24 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-muted">
              {l.logo_url ? (
                <img src={l.logo_url} alt="" className="max-h-10 max-w-20 object-contain" />
              ) : (
                <ImageIcon className="size-5 text-muted-foreground" />
              )}
            </div>
            <div className="min-w-0 flex-1 space-y-1">
              <Input
                defaultValue={l.name}
                onBlur={(e) => e.target.value !== l.name && updateLogoField(l.id, "name", e.target.value)}
                className="h-8 border-transparent bg-transparent px-1 text-[14px] font-semibold hover:border-input focus:border-input"
              />
              <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
                <Pill tone="info">#{l.sort_order}</Pill>
                <button onClick={() => toggleLogoPublished(l)} title="Toggle visibility">
                  <Pill tone={l.is_published ? "success" : "muted"}>{l.is_published ? "Live" : "Hidden"}</Pill>
                </button>
              </div>
            </div>
            <div className="flex shrink-0 flex-col items-end gap-1.5">
              <Input
                defaultValue={String(l.sort_order)}
                onBlur={(e) => Number(e.target.value) !== l.sort_order && updateLogoField(l.id, "sort_order", Number(e.target.value) || 0)}
                className="h-8 w-16"
              />
              <Button variant="ghost" size="icon" onClick={() => removeLogo(l)} title="Delete logo">
                <Trash2 className="size-4 text-destructive" />
              </Button>
            </div>
          </Panel>
        ))}
      </div>
      {!loading && logos.length === 0 && (
        <Panel className="mt-3 p-8 text-center text-sm text-muted-foreground">
          No partner logos yet — add one above, or the homepage shows defaults.
        </Panel>
      )}
    </PageContainer>
  );
}

