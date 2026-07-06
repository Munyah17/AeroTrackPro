"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";
import { CommandPaletteProvider } from "./command-palette";
import { Sidebar } from "./sidebar";
import { Topbar } from "./topbar";

export function AppShell({ children }: { children: React.ReactNode }) {
  const [collapsed, setCollapsed] = useState(false);

  return (
    <CommandPaletteProvider>
      <div className="min-h-dvh">
      <Sidebar collapsed={collapsed} onToggle={() => setCollapsed((c) => !c)} />
      <div
        className={cn(
          "flex min-h-dvh flex-col transition-[padding] duration-300",
          collapsed ? "lg:pl-[92px]" : "lg:pl-[272px]",
        )}
      >
          <Topbar />
          <main className="flex-1">{children}</main>
        </div>
      </div>
    </CommandPaletteProvider>
  );
}
