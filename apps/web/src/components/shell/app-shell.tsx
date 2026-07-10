"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";
import { CommandPaletteProvider } from "./command-palette";
import { RoleProvider } from "./role-provider";
import { Sidebar } from "./sidebar";
import { Topbar } from "./topbar";

export function AppShell({ children }: { children: React.ReactNode }) {
  const [collapsed, setCollapsed] = useState(false);

  return (
    <RoleProvider>
      <CommandPaletteProvider>
      <div className="min-h-dvh">
      <Sidebar collapsed={collapsed} onToggle={() => setCollapsed((c) => !c)} />
      <div
        className={cn(
          "flex min-h-dvh min-w-0 flex-col transition-[padding] duration-300",
          collapsed ? "lg:pl-[92px]" : "lg:pl-[272px]",
        )}
      >
          <Topbar />
          <main className="min-w-0 flex-1 overflow-x-hidden">{children}</main>
        </div>
      </div>
      </CommandPaletteProvider>
    </RoleProvider>
  );
}
