"use client";

import Link from "next/link";
import { ExternalLink } from "lucide-react";
import { toast } from "sonner";
import { PageContainer, PageHeader, Panel } from "@/components/shared/page";
import { useBrand } from "@/components/shell/brand-provider";
import { Button } from "@/components/ui/button";
import { LANDING_TEMPLATES, type LandingTemplateId } from "@/lib/brand";

export default function ResellerLandingPage() {
  const { brand, ready, save } = useBrand();

  const choose = (template: LandingTemplateId) => {
    save({ ...brand, template });
    toast.success(`${LANDING_TEMPLATES.find((item) => item.id === template)?.name} is now the client site`);
  };

  return (
    <PageContainer className="max-w-[1100px]">
      <PageHeader
        title="Landing templates"
        subtitle="Pick the public page clients see on your domain, the way a white-label GPS portal does"
        actions={
          <Button className="gap-2 rounded-xl shadow-card" render={<Link href="/site" />}>
            <ExternalLink className="size-4" /> Open client site
          </Button>
        }
      />

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        {LANDING_TEMPLATES.map((template) => {
          const selected = ready && brand.template === template.id;
          return (
            <Panel key={template.id} className="flex flex-col p-5">
              <TemplateSketch id={template.id} color={brand.primary} />
              <div className="mt-4 flex items-start justify-between gap-3">
                <div>
                  <h3 className="text-[15px] font-semibold">{template.name}</h3>
                  <p className="mt-1 text-[12.5px] leading-relaxed text-muted-foreground">{template.blurb}</p>
                </div>
              </div>
              <div className="mt-4 flex flex-wrap gap-2">
                <Button
                  type="button"
                  variant={selected ? "secondary" : "default"}
                  className="rounded-xl"
                  disabled={!ready || selected}
                  onClick={() => choose(template.id)}
                >
                  {selected ? "In use" : "Use this template"}
                </Button>
                {selected && (
                  <Button variant="outline" className="rounded-xl" render={<Link href="/site" />}>
                    Preview
                  </Button>
                )}
              </div>
            </Panel>
          );
        })}
      </div>
    </PageContainer>
  );
}

function TemplateSketch({ id, color }: { id: LandingTemplateId; color: string }) {
  if (id === "tracker-store") {
    return (
      <div className="grid h-28 grid-cols-3 gap-2 rounded-xl bg-muted/60 p-3">
        {[0, 1, 2].map((item) => (
          <div key={item} className="rounded-lg bg-card shadow-card">
            <div className="h-2 rounded-t-lg" style={{ background: color }} />
          </div>
        ))}
      </div>
    );
  }
  if (id === "operations-desk") {
    return (
      <div className="flex h-28 flex-col gap-2 rounded-xl border bg-card p-3">
        <div className="grid grid-cols-3 gap-2">
          {[0, 1, 2].map((item) => (
            <div key={item} className="h-6 rounded-md" style={{ background: `${color}22` }} />
          ))}
        </div>
        <div className="flex-1 rounded-md bg-muted" />
      </div>
    );
  }
  if (id === "simple-sign-in") {
    return (
      <div className="grid h-28 grid-cols-2 overflow-hidden rounded-xl border">
        <div style={{ background: color }} />
        <div className="flex items-center justify-center bg-card">
          <div className="h-10 w-16 rounded-lg border" />
        </div>
      </div>
    );
  }
  return (
    <div className="flex h-28 items-end rounded-xl p-3" style={{ background: `linear-gradient(135deg, ${color}, #07111f)` }}>
      <div className="h-8 w-24 rounded-lg bg-white/80" />
    </div>
  );
}
