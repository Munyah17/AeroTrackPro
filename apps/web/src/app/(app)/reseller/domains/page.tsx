"use client";

import { useEffect, useState, type ReactNode } from "react";
import { Globe, Lock, RefreshCw, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { PageContainer, PageHeader, Panel } from "@/components/shared/page";
import { Pill } from "@/components/shared/status";
import { useBrand } from "@/components/shell/brand-provider";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { EDGE_HOST, isHostname, slugify, subdomainHost } from "@/lib/brand";

export default function ResellerDomainsPage() {
  const { brand, ready, save } = useBrand();
  const [slug, setSlug] = useState(brand.slug);
  const [host, setHost] = useState("");
  const [checking, setChecking] = useState<string | null>(null);

  useEffect(() => {
    if (ready) setSlug(brand.slug);
  }, [ready, brand.slug]);

  const shownSlug = ready ? slug : brand.slug;

  const saveSlug = () => {
    const next = slugify(slug);
    setSlug(next);
    save({ ...brand, slug: next });
    toast.success(`Free address saved as ${subdomainHost(next)}`);
  };

  const addDomain = () => {
    const cleaned = host.trim().toLowerCase().replace(/^https?:\/\//, "").replace(/\/.*$/, "");
    if (!isHostname(cleaned)) {
      toast.error("Enter a domain like gps.yourcompany.co.zw");
      return;
    }
    if (cleaned === "aerotrack.app" || cleaned.endsWith(".aerotrack.app")) {
      toast.error("Use the free subdomain for aerotrack.app addresses");
      return;
    }
    if (brand.domains.some((domain) => domain.host === cleaned)) {
      toast.error("That domain is already on this account");
      return;
    }
    save({
      ...brand,
      domains: [
        ...brand.domains,
        { host: cleaned, status: "pending", ssl: "pending", addedAt: new Date().toISOString() },
      ],
    });
    setHost("");
    toast.success("Domain added", { description: `Point a CNAME at ${EDGE_HOST}, then verify.` });
  };

  const verify = (target: string) => {
    setChecking(target);
    window.setTimeout(() => {
      save({
        ...brand,
        domains: brand.domains.map((domain) =>
          domain.host === target ? { ...domain, status: "active", ssl: "valid" } : domain,
        ),
      });
      setChecking(null);
      toast.success(`${target} is connected`, {
        description: "In this demo the check is local. On the live platform it confirms the CNAME, then the certificate is issued.",
      });
    }, 700);
  };

  const remove = (target: string) => {
    save({ ...brand, domains: brand.domains.filter((domain) => domain.host !== target) });
    toast.success(`${target} removed`);
  };

  const sample = brand.domains.find((domain) => domain.status === "pending")?.host ?? "gps.yourcompany.co.zw";

  return (
    <PageContainer className="max-w-[900px]">
      <PageHeader
        title="Domains"
        subtitle="Give clients your own address. Same CNAME and automatic SSL pattern used by Navixy-style portals."
      />

      <Panel className="p-5">
        <h3 className="text-[14px] font-semibold">Free subdomain</h3>
        <p className="mt-1 text-[12.5px] text-muted-foreground">Works immediately. No DNS change.</p>
        <div className="mt-3 flex flex-col gap-2 sm:flex-row">
          <div className="flex min-w-0 flex-1 items-center rounded-xl border bg-card">
            <Input
              value={shownSlug}
              onChange={(event) => setSlug(event.target.value)}
              className="border-0 shadow-none focus-visible:ring-0"
              aria-label="Subdomain"
            />
            <span className="pr-3 text-[12.5px] text-muted-foreground">.aerotrack.app</span>
          </div>
          <Button type="button" className="rounded-xl" onClick={saveSlug} disabled={!ready}>
            Save subdomain
          </Button>
        </div>
      </Panel>

      <Panel className="mt-4 p-5">
        <h3 className="text-[14px] font-semibold">Custom domain</h3>
        <p className="mt-1 text-[12.5px] leading-relaxed text-muted-foreground">
          Add the host your clients already know. Create a CNAME to <span className="font-medium text-foreground">{EDGE_HOST}</span>, then verify. The certificate follows a successful check.
        </p>
        <form
          className="mt-3 flex flex-col gap-2 sm:flex-row"
          onSubmit={(event) => {
            event.preventDefault();
            addDomain();
          }}
        >
          <Input
            value={host}
            onChange={(event) => setHost(event.target.value)}
            placeholder="gps.yourcompany.co.zw"
            className="rounded-xl"
            aria-label="Custom domain"
          />
          <Button type="submit" className="rounded-xl" disabled={!ready}>
            Add domain
          </Button>
        </form>
      </Panel>

      <div className="mt-4 flex flex-col gap-3">
        <DomainRow
          host={subdomainHost(brand.slug)}
          kind="Subdomain"
          status="active"
          ssl="valid"
        />
        {brand.domains.map((domain) => (
          <DomainRow
            key={domain.host}
            host={domain.host}
            kind="Custom"
            status={domain.status}
            ssl={domain.ssl}
            pendingAction={
              domain.status === "pending" ? (
                <Button
                  size="sm"
                  variant="outline"
                  className="rounded-lg"
                  disabled={checking === domain.host}
                  onClick={() => verify(domain.host)}
                >
                  <RefreshCw className={checking === domain.host ? "size-3.5 animate-spin" : "size-3.5"} />
                  Verify
                </Button>
              ) : null
            }
            onRemove={() => remove(domain.host)}
          />
        ))}
      </div>

      <Panel className="mt-4 p-5">
        <h3 className="flex items-center gap-2 text-[14px] font-semibold">
          <Globe className="size-4 text-primary" /> DNS setup
        </h3>
        <Label className="mt-3 block text-[12px] text-muted-foreground">At your DNS host, add this record:</Label>
        <div className="mt-2 overflow-x-auto rounded-xl bg-muted/60 p-4 font-mono text-[12.5px] leading-7">
          <div>{sample} &nbsp; CNAME &nbsp; {EDGE_HOST}</div>
        </div>
        <p className="mt-3 text-[12px] leading-relaxed text-muted-foreground">
          Leave the record in place. After Verify reports the name as connected, HTTPS is served on that host and the login page, app, and landing template use this brand.
        </p>
      </Panel>
    </PageContainer>
  );
}

function DomainRow({
  host,
  kind,
  status,
  ssl,
  pendingAction,
  onRemove,
}: {
  host: string;
  kind: string;
  status: "pending" | "active";
  ssl: "pending" | "valid";
  pendingAction?: ReactNode;
  onRemove?: () => void;
}) {
  return (
    <Panel className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center">
      <div className="min-w-0 flex-1">
        <div className="truncate text-[13.5px] font-semibold">{host}</div>
        <div className="mt-1 flex flex-wrap items-center gap-2">
          <Pill tone={kind === "Custom" ? "primary" : "muted"}>{kind}</Pill>
          <Pill tone={status === "active" ? "success" : "warning"}>{status === "active" ? "DNS connected" : "Waiting for DNS"}</Pill>
          <span className="inline-flex items-center gap-1 text-[12px] text-muted-foreground">
            <Lock className={ssl === "valid" ? "size-3.5 text-success" : "size-3.5 text-warning-foreground"} />
            SSL {ssl}
          </span>
        </div>
      </div>
      <div className="flex items-center gap-2">
        {pendingAction}
        {onRemove && (
          <Button size="sm" variant="ghost" className="rounded-lg text-destructive" onClick={onRemove} aria-label={`Remove ${host}`}>
            <Trash2 className="size-3.5" />
          </Button>
        )}
      </div>
    </Panel>
  );
}
