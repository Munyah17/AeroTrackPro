"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu } from "lucide-react";
import type { NavItem } from "@/lib/nav";
import { isNavActive, navFor } from "@/lib/rbac";
import { useAlerts } from "@/hooks/use-live-data";
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet";
import { cn } from "@/lib/utils";
import { useRole } from "./role-provider";

function BarLink({
  item,
  active,
  badge,
}: {
  item: NavItem;
  active: boolean;
  badge?: number;
}) {
  return (
    <Link
      href={item.href}
      className={cn(
        "flex flex-1 flex-col items-center gap-0.5 rounded-xl py-1.5 transition-colors",
        active ? "text-primary" : "text-muted-foreground",
      )}
    >
      <span className="relative">
        <item.icon className="size-5" strokeWidth={active ? 2.4 : 2} />
        {badge ? (
          <span className="absolute -right-2.5 -top-1 flex h-3.5 min-w-3.5 items-center justify-center rounded-full bg-destructive px-0.5 text-[8px] font-bold text-white">
            {badge > 9 ? "9+" : badge}
          </span>
        ) : null}
      </span>
      <span className="max-w-full truncate text-[10px] font-semibold">{item.label}</span>
    </Link>
  );
}

/**
 * Mobile bottom navigation — a floating drawer-style bar with five slots.
 * The centre slot is a raised primary button for the live-tracking page;
 * "More" opens a bottom sheet with the full role-aware navigation.
 */
export function BottomNav() {
  const pathname = usePathname();
  const { role, portal, fleetAccess, ready } = useRole();
  const { rows: alerts } = useAlerts();
  const [moreOpen, setMoreOpen] = useState(false);

  const sections = ready ? navFor(role, portal, fleetAccess) : [];
  const flat = sections.flatMap((s) => s.items);
  const pick = (href: string) => flat.find((i) => i.href === href);
  const home = flat[0];
  const track = pick("/tracking") ?? flat[1] ?? home;
  const vehicles = pick("/vehicles") ?? flat[2] ?? home;
  const alertsItem = pick("/alerts") ?? flat[3] ?? home;
  const activeAlerts = alerts.filter((a) => a.status === "active").length;

  if (!ready || !home || !track || !vehicles || !alertsItem) return null;

  const trackActive = isNavActive(pathname, track.href);

  return (
    <>
      <nav aria-label="Primary" className="fixed inset-x-3 bottom-3 z-40 lg:hidden">
        <div className="relative flex items-stretch rounded-[1.35rem] border border-border/60 bg-card/95 px-1.5 pb-[calc(0.4rem+env(safe-area-inset-bottom))] pt-2 shadow-float backdrop-blur-xl">
          <BarLink item={home} active={isNavActive(pathname, home.href)} />
          <BarLink item={vehicles} active={isNavActive(pathname, vehicles.href)} />

          {/* Centre slot — label stays in flow, the icon floats above the bar */}
          <div className="flex flex-1 flex-col items-center">
            <Link
              href={track.href}
              aria-label={track.label}
              className={cn(
                "-mt-8 flex size-14 items-center justify-center rounded-full text-white shadow-float ring-4 ring-card transition-transform active:scale-95",
                trackActive ? "bg-primary" : "bg-primary/90",
              )}
            >
              <track.icon className="size-6" strokeWidth={2.2} />
            </Link>
            <span
              className={cn(
                "mt-1 max-w-full truncate text-[10px] font-semibold",
                trackActive ? "text-primary" : "text-muted-foreground",
              )}
            >
              {track.label}
            </span>
          </div>

          <BarLink item={alertsItem} active={isNavActive(pathname, alertsItem.href)} badge={activeAlerts} />
          <button
            type="button"
            onClick={() => setMoreOpen(true)}
            className={cn(
              "flex flex-1 flex-col items-center gap-0.5 rounded-xl py-1.5 transition-colors",
              moreOpen ? "text-primary" : "text-muted-foreground",
            )}
          >
            <Menu className="size-5" />
            <span className="text-[10px] font-semibold">More</span>
          </button>
        </div>
      </nav>

      {/* Full navigation drawer */}
      <Sheet open={moreOpen} onOpenChange={setMoreOpen}>
        <SheetContent
          side="bottom"
          className="max-h-[75dvh] gap-0 overflow-y-auto rounded-t-3xl p-0 pb-[env(safe-area-inset-bottom)]"
        >
          <SheetTitle className="sr-only">All navigation</SheetTitle>
          <div className="mx-auto mt-2.5 h-1.5 w-10 shrink-0 rounded-full bg-muted-foreground/25" />
          <nav className="flex flex-col gap-4 p-4 pb-8">
            {sections.map((s, i) => (
              <div key={i} className="flex flex-col gap-0.5">
                {s.label && (
                  <div className="px-3 pb-1 text-[10.5px] font-semibold uppercase tracking-wider text-muted-foreground/60">
                    {s.label}
                  </div>
                )}
                {s.items.map((item) => (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setMoreOpen(false)}
                    className={cn(
                      "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium",
                      isNavActive(pathname, item.href)
                        ? "bg-primary/10 text-primary"
                        : "text-foreground/80",
                    )}
                  >
                    <item.icon className="size-[18px] shrink-0" />
                    <span className="truncate">{item.label}</span>
                  </Link>
                ))}
              </div>
            ))}
          </nav>
        </SheetContent>
      </Sheet>
    </>
  );
}
