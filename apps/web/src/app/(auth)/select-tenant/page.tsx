"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { Building2, ChevronRight, Loader2, Plus } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/lib/supabase";
import { clearAccountTierCache } from "@/lib/account-tier";
import { Pill } from "@/components/shared/status";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

interface Membership {
  tenantId: string;
  name: string;
  primaryColor: string;
  status: string;
  accountKind: string;
}

/** Home route for a tenant based on what kind of account it is. */
function homeForKind(accountKind: string) {
  return accountKind === "reseller" ? "/reseller" : "/tracking";
}

export default function SelectTenantPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [memberships, setMemberships] = useState<Membership[]>([]);
  const [creating, setCreating] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [orgName, setOrgName] = useState("");

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        router.replace("/login");
        return;
      }
      const { data } = await supabase
        .from("users")
        .select("tenant_id, tenants(name, primary_color, status, account_kind)")
        .eq("auth_id", user.id);
      if (cancelled) return;

      const rows = (data ?? [])
        .map((r) => {
          const t = r.tenants as unknown as {
            name: string;
            primary_color: string | null;
            status: string;
            account_kind: string | null;
          } | null;
          if (!t) return null;
          return {
            tenantId: r.tenant_id,
            name: t.name,
            primaryColor: t.primary_color ?? "#1E40FF",
            status: t.status,
            accountKind: t.account_kind ?? "owner",
          } as Membership;
        })
        .filter((m): m is Membership => m !== null);

      setMemberships(rows);
      setLoading(false);

      /* One org → no choice to make, go straight in. */
      if (rows.length === 1) {
        router.replace(homeForKind(rows[0].accountKind));
      }
      /* Zero orgs → show the create form by default. */
      if (rows.length === 0) setShowForm(true);
    })();
    return () => {
      cancelled = true;
    };
  }, [router]);

  const pick = (m: Membership) => {
    toast.success(`Signed in to ${m.name}`);
    router.push(homeForKind(m.accountKind));
  };

  const createOrg = async () => {
    const name = orgName.trim();
    if (name.length < 2) {
      toast.error("Enter an organisation name");
      return;
    }
    setCreating(true);
    try {
      const res = await fetch("/api/portal/onboard", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name }),
      });
      const data = (await res.json().catch(() => ({}))) as { error?: string; message?: string };
      if (!res.ok) {
        toast.error("Setup failed", { description: data.message ?? data.error });
        setCreating(false);
        return;
      }
      clearAccountTierCache();
      toast.success(`Welcome to ${name}`);
      router.push("/tracking");
      router.refresh();
    } catch {
      toast.error("Setup failed", { description: "Network error — try again." });
      setCreating(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center gap-2.5 text-sm text-muted-foreground">
        <Loader2 className="size-4 animate-spin" /> Loading your workspaces…
      </div>
    );
  }

  return (
    <div>
      <h2 className="text-2xl font-bold tracking-tight">
        {memberships.length ? "Choose a workspace" : "Create your workspace"}
      </h2>
      <p className="mt-1.5 text-sm text-muted-foreground">
        {memberships.length
          ? `Your account belongs to ${memberships.length} organisation${memberships.length === 1 ? "" : "s"}`
          : "Set up your organisation to start tracking."}
      </p>

      <div className="mt-7 flex flex-col gap-2.5">
        {memberships.map((m, i) => (
          <motion.button
            key={m.tenantId}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.07 }}
            onClick={() => pick(m)}
            className="group flex w-full items-center gap-3.5 rounded-2xl border border-border/70 bg-card p-4 text-left shadow-card transition-all hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-card-hover"
          >
            <div
              className="flex size-11 shrink-0 items-center justify-center rounded-xl text-[13px] font-bold text-white"
              style={{ background: m.primaryColor }}
            >
              {m.name.slice(0, 2).toUpperCase()}
            </div>
            <div className="min-w-0 flex-1">
              <div className="text-[14px] font-semibold">{m.name}</div>
              <div className="text-[12px] capitalize text-muted-foreground">{m.accountKind}</div>
            </div>
            <Pill
              tone={m.status === "active" ? "success" : m.status === "trial" ? "info" : "danger"}
            >
              {m.status}
            </Pill>
            <ChevronRight className="size-4 text-muted-foreground transition-transform group-hover:translate-x-0.5 group-hover:text-primary" />
          </motion.button>
        ))}

        {showForm ? (
          <div className="flex flex-col gap-3 rounded-2xl border border-border/70 bg-card p-4 shadow-card">
            <div className="flex items-center gap-2.5">
              <Building2 className="size-4 text-primary" />
              <span className="text-[13.5px] font-medium">New organisation</span>
            </div>
            <Input
              value={orgName}
              onChange={(e) => setOrgName(e.target.value)}
              placeholder="e.g. Moyo Family, Tenda Haulage"
              className="rounded-xl"
              autoFocus
              onKeyDown={(e) => e.key === "Enter" && createOrg()}
            />
            <Button onClick={createOrg} disabled={creating} className="w-full gap-2 rounded-xl">
              {creating && <Loader2 className="size-4 animate-spin" />}
              Create workspace
            </Button>
          </div>
        ) : (
          <button
            onClick={() => setShowForm(true)}
            className="flex w-full items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-border p-4 text-[13.5px] font-medium text-muted-foreground transition-colors hover:border-primary/50 hover:text-primary"
          >
            <Plus className="size-4" /> Create new organisation
          </button>
        )}
      </div>
    </div>
  );
}
