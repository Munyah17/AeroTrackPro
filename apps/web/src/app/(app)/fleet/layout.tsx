"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

/**
 * Fleet Management — the customer's self-service fleet console.
 * Category tab bar modeled on the classic fleet-manager layout
 * (Vehicles / Garages / Drivers / Departments / Driver Journal /
 * Eco Driving / Maintenance).
 */

const TABS = [
  { label: "Vehicles", href: "/fleet/vehicles" },
  { label: "Garages", href: "/fleet/garages" },
  { label: "Drivers", href: "/fleet/drivers" },
  { label: "Departments", href: "/fleet/departments" },
  { label: "Driver Journal", href: "/fleet/journal" },
  { label: "Eco Driving", href: "/fleet/eco" },
  { label: "Maintenance", href: "/fleet/maintenance" },
] as const;

export default function FleetLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  return (
    <div className="flex h-full flex-col">
      <nav className="sticky top-0 z-20 -mx-1 flex items-center gap-1 overflow-x-auto border-b border-border/60 bg-background/95 px-1 backdrop-blur">
        {TABS.map((tab) => {
          const active = pathname === tab.href || pathname.startsWith(`${tab.href}/`);
          return (
            <Link
              key={tab.href}
              href={tab.href}
              className={cn(
                "whitespace-nowrap border-b-2 px-3.5 py-3 text-[11.5px] font-semibold uppercase tracking-wide transition-colors",
                active
                  ? "border-primary text-foreground"
                  : "border-transparent text-muted-foreground hover:border-border hover:text-foreground",
              )}
            >
              {tab.label}
            </Link>
          );
        })}
      </nav>
      <div className="flex-1 pt-5">{children}</div>
    </div>
  );
}
