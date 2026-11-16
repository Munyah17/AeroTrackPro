"use client";

import { useEffect, useState } from "react";
import { ArrowLeft, Eye } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { AccessGuard } from "./access-guard";
import { BottomNav } from "./bottom-nav";
import { CommandPaletteProvider } from "./command-palette";
import { RoleProvider, useRole } from "./role-provider";
import { Sidebar } from "./sidebar";
import { Topbar } from "./topbar";

/** Persistent bar while a Master Admin support session is open. */
function ImpersonationBanner() {
  const { impersonation, stopImpersonation } = useRole();
  const [leaving, setLeaving] = useState(false);
  if (!impersonation) return null;

  const leave = async () => {
    setLeaving(true);
    await stopImpersonation();
    toast.success("Back to Super Admin");
  };

  return (
    <div className="flex shrink-0 items-center gap-3 border-b border-amber-500/30 bg-amber-500/10 px-4 py-2 text-[12.5px]">
      <Eye className="size-4 shrink-0 text-amber-600 dark:text-amber-400" />
      <span className="min-w-0 flex-1 truncate text-amber-900 dark:text-amber-200">
        <span className="font-semibold">Support session:</span> viewing{" "}
        <span className="font-semibold">{impersonation.tenantName}</span> with full access
        {impersonation.reason ? ` — ${impersonation.reason}` : ""}
      </span>
      <Button
        size="sm"
        variant="outline"
        className="h-7 shrink-0 gap-1.5 rounded-lg border-amber-500/40 text-[12px] text-amber-900 hover:bg-amber-500/20 dark:text-amber-200"
        disabled={leaving}
        onClick={() => void leave()}
      >
        <ArrowLeft className="size-3.5" /> {leaving ? "Leaving…" : "Back To Super Admin"}
      </Button>
    </div>
  );
}

export function AppShell({ children }: { children: React.ReactNode }) {
  const [collapsed, setCollapsed] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia("(max-width: 1279px)");
    if (mq.matches) setCollapsed(true);
  }, []);

  return (
    <RoleProvider>
      <CommandPaletteProvider>
        <div className="flex h-dvh min-w-0 overflow-hidden">
          <Sidebar collapsed={collapsed} onToggle={() => setCollapsed((c) => !c)} />
          <div
            className={cn(
              "flex min-h-0 min-w-0 flex-1 flex-col transition-[padding] duration-300",
              collapsed ? "lg:pl-[92px]" : "lg:pl-[272px]",
            )}
          >
            <Topbar />
            <ImpersonationBanner />
            <main className="min-h-0 min-w-0 flex-1 overflow-x-hidden overflow-y-auto pb-[calc(5.5rem+env(safe-area-inset-bottom))] lg:pb-0">
              <AccessGuard>{children}</AccessGuard>
            </main>
          </div>
          <BottomNav />
        </div>
      </CommandPaletteProvider>
    </RoleProvider>
  );
}
