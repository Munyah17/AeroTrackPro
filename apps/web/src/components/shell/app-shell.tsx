"use client";

import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";
import { AccessGuard } from "./access-guard";
import { BottomNav } from "./bottom-nav";
import { CommandPaletteProvider } from "./command-palette";
import { RoleProvider } from "./role-provider";
import { Sidebar } from "./sidebar";
import { Topbar } from "./topbar";

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
