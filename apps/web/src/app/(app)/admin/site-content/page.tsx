"use client";

import { useCallback, useEffect, useState } from "react";
import { GripVertical, ImageIcon, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/lib/supabase";
import { fetchAllHeroSlides, type HeroSlide } from "@/lib/hero-slides";
import type { Database } from "@aerotrack/shared";

type HeroSlideUpdate = Database["public"]["Tables"]["hero_slides"]["Update"];
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PageContainer, PageHeader, Panel } from "@/components/shared/page";
import { Pill } from "@/components/shared/status";

const EMPTY = { title: "", description: "", cta_label: "Get Started", cta_href: "/register", image_url: "", sort_order: 0 };

export default function SiteContentPage() {
  const [slides, setSlides] = useState<HeroSlide[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState(EMPTY);

  const reload = useCallback(async () => {
    setSlides(await fetchAllHeroSlides());
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
    </PageContainer>
  );
}
