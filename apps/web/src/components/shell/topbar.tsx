"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import Link from "next/link";
import { Bell, Menu, Moon, RefreshCw, Sun, LogOut, User, Settings } from "lucide-react";
import { toast } from "sonner";
import { BrandMark } from "@/components/brand/mark";
import { useAlerts, refreshAllLiveData } from "@/hooks/use-live-data";
import { cn } from "@/lib/utils";
import { timeAgo } from "@/lib/format";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Sheet, SheetContent, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { NAV_META } from "@/lib/nav";
import { useBrand } from "./brand-provider";
import { isNavActive, navFor, ROLE_LABELS } from "@/lib/rbac";
import { useRole } from "./role-provider";

function useDarkMode() {
  // Initial class is applied by the inline script in layout.tsx before
  // paint, so the DOM is the source of truth — no effect, no flash, no
  // hydration mismatch.
  const [dark, setDark] = useState(() =>
    typeof document !== "undefined"
      ? document.documentElement.classList.contains("dark")
      : false,
  );
  const toggle = () => {
    setDark((current) => {
      const next = !current;
      document.documentElement.classList.toggle("dark", next);
      localStorage.setItem("at-theme", next ? "dark" : "light");
      return next;
    });
  };
  return { dark, toggle };
}

/** Sun | switch | moon theme toggle. */
function ThemeSwitch({ dark, onToggle }: { dark: boolean; onToggle: () => void }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={dark}
      aria-label="Toggle color theme"
      onClick={onToggle}
      className="relative hidden h-8 w-[68px] shrink-0 items-center justify-between rounded-full border border-border/70 bg-muted px-2 transition-colors md:inline-flex"
    >
      <Sun className="size-3.5 text-amber-500" />
      <Moon className="size-3.5 text-slate-500 dark:text-slate-300" />
      <span
        aria-hidden
        className={cn(
          "absolute top-1/2 size-6 -translate-y-1/2 rounded-full bg-background shadow-md transition-[left] duration-200",
          dark ? "left-[40px]" : "left-1",
        )}
      />
    </button>
  );
}

function MobileNav() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const { brand } = useBrand();
  const { role, portal, fleetAccess, ready } = useRole();
  const sections = ready ? navFor(role, portal, fleetAccess) : [];

  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger
        render={
          <Button variant="ghost" size="icon" className="shrink-0 rounded-xl lg:hidden" aria-label="Open navigation">
            <Menu className="size-5" />
          </Button>
        }
      />
      <SheetContent
        side="left"
        className="flex h-full w-[min(100vw-1.25rem,18rem)] max-w-none flex-col gap-0 overflow-hidden bg-sidebar p-0 text-sidebar-foreground sm:max-w-none [&_[data-slot=sheet-close]]:text-white [&_[data-slot=sheet-close]]:hover:bg-white/10"
      >
        <SheetTitle className="sr-only">Navigation</SheetTitle>
        <div className="flex shrink-0 items-center gap-2.5 px-5 pt-5 pr-12 pb-3">
          <div className="flex size-9 items-center justify-center overflow-hidden rounded-xl bg-white/15">
            <BrandMark logo={brand.logoDataUrl} className="size-5 text-white" />
          </div>
          <div className="min-w-0">
            <div className="truncate text-[15px] font-bold text-white">{brand.name}</div>
            <div className="truncate text-[11px] text-white/60">{ready ? ROLE_LABELS[role] : ""}</div>
          </div>
        </div>
        <nav className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto overscroll-contain p-4 pb-8">
          {sections.map((s, i) => (
            <div key={i} className="flex flex-col gap-0.5">
              {s.label && (
                <div className="px-3 pb-1 text-[10.5px] font-semibold uppercase tracking-wider text-sidebar-foreground/45">
                  {s.label}
                </div>
              )}
              {s.items.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium",
                    isNavActive(pathname, item.href)
                      ? "bg-white text-sidebar-primary-foreground"
                      : "text-sidebar-foreground/75",
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
  );
}

export function Topbar() {
  const pathname = usePathname();
  const router = useRouter();
  const { role, session, ready } = useRole();
  const { dark, toggle } = useDarkMode();
  const { rows: alerts } = useAlerts();
  const meta =
    NAV_META[pathname] ??
    NAV_META[
      Object.keys(NAV_META)
        .filter((k) => pathname.startsWith(`${k}/`))
        .sort((a, b) => b.length - a.length)[0] ?? ""
    ] ?? { title: "AeroTrack Pro" };
  const activeAlerts = alerts.filter((a) => a.status === "active");
  const name = session?.fullName?.trim() || (ready ? ROLE_LABELS[role] : "");
  const identity = {
    name,
    initials: name
      .split(" ")
      .map((p) => p[0])
      .join("")
      .slice(0, 2)
      .toUpperCase(),
  };

  const [refreshing, setRefreshing] = useState(false);

  const hardRefresh = async () => {
    if (refreshing) return;
    setRefreshing(true);
    refreshAllLiveData();
    router.refresh();
    try {
      const res = await fetch("/api/health", { cache: "no-store" });
      const body = (await res.json().catch(() => ({}))) as {
        ok?: boolean;
        supabase?: string;
        ms?: number;
        error?: string;
      };
      if (res.ok && body.ok) {
        toast.success("Data refreshed", {
          description: `Server OK · Supabase ${body.ms ?? "?"}ms`,
        });
      } else {
        toast.error("Server unreachable", {
          description: body.error ?? `Supabase: ${body.supabase ?? "unknown"}`,
        });
      }
    } catch {
      toast.error("Server unreachable", { description: "Could not reach the health endpoint." });
    } finally {
      setRefreshing(false);
    }
  };

  const signOut = async () => {
    const [{ supabase }, { clearAccountTierCache }, { clearLiveDataCache }, { clearFleetCache }] =
      await Promise.all([
        import("@/lib/supabase"),
        import("@/lib/account-tier"),
        import("@/hooks/use-live-data"),
        import("@/hooks/use-fleet"),
      ]);
    clearAccountTierCache();
    clearLiveDataCache();
    clearFleetCache();
    await supabase.auth.signOut();
    router.replace("/login");
  };

  return (
    <header className="z-30 flex h-14 shrink-0 items-center gap-1.5 border-b border-border/60 bg-background/80 px-3 backdrop-blur-xl sm:h-16 sm:gap-2 sm:px-4 md:px-6">
      <MobileNav />

      <div className="hidden min-w-0 flex-1 md:block">
        <h1 className="truncate text-[15px] font-semibold tracking-tight sm:text-[17px]">{meta.title}</h1>
      </div>

      <div className="ml-auto" />

      <Button
        variant="ghost"
        size="icon"
        className="inline-flex shrink-0 rounded-xl"
        aria-label="Hard refresh — reload all live data and check server status"
        title="Refresh all data + server status"
        disabled={refreshing}
        onClick={() => void hardRefresh()}
      >
        <RefreshCw className={cn("size-[18px]", refreshing && "animate-spin")} />
      </Button>

      <ThemeSwitch dark={dark} onToggle={toggle} />

      <DropdownMenu>
        <DropdownMenuTrigger
          render={
            <Button variant="ghost" size="icon" className="relative hidden shrink-0 rounded-xl md:inline-flex" aria-label="Notifications">
              <Bell className="size-[18px]" />
              {activeAlerts.length > 0 && (
                <span className="absolute right-1.5 top-1.5 flex size-4 items-center justify-center rounded-full bg-primary text-[9.5px] font-bold text-white">
                  {activeAlerts.length}
                </span>
              )}
            </Button>
          }
        />
        <DropdownMenuContent align="end" className="w-[min(20rem,calc(100vw-1.5rem))] rounded-2xl p-2 shadow-float">
          <DropdownMenuLabel className="flex items-center justify-between">
            Notifications
            <Badge variant="secondary" className="rounded-full">{activeAlerts.length} new</Badge>
          </DropdownMenuLabel>
          <DropdownMenuSeparator />
          {activeAlerts.slice(0, 5).map((a) => (
            <DropdownMenuItem key={a.id} render={<Link href="/alerts" />} className="rounded-xl p-3">
              <span
                className={cn(
                  "mt-0.5 size-2 shrink-0 rounded-full",
                  a.severity === "critical" ? "bg-destructive" : a.severity === "warning" ? "bg-warning" : "bg-info",
                )}
              />
              <span className="flex min-w-0 flex-col gap-0.5">
                <span className="truncate text-[13px] font-medium">{a.title}</span>
                <span className="truncate text-xs text-muted-foreground">{a.message}</span>
                <span className="text-[11px] text-muted-foreground/70">{timeAgo(a.createdAt)}</span>
              </span>
            </DropdownMenuItem>
          ))}
          <DropdownMenuSeparator />
          <DropdownMenuItem
            render={<Link href="/alerts" />}
            className="justify-center rounded-xl text-[13px] font-medium text-primary"
          >
            View all alerts
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <DropdownMenu>
        <DropdownMenuTrigger
          render={
            <button className="flex shrink-0 items-center gap-2 rounded-xl border border-border/70 bg-card py-1.5 pr-2 pl-1.5 shadow-card transition-shadow hover:shadow-card-hover sm:pr-3">
              <Avatar className="size-7">
                <AvatarFallback className="bg-primary text-[11px] font-semibold text-white">
                  {identity.initials}
                </AvatarFallback>
              </Avatar>
              <span className="hidden max-w-32 truncate text-[13px] font-medium md:block">{identity.name}</span>
            </button>
          }
        />
        <DropdownMenuContent align="end" className="w-[min(18rem,calc(100vw-1.5rem))] rounded-2xl p-1.5 shadow-float">
          <DropdownMenuLabel>
            <div className="truncate text-[13px] font-semibold">{identity.name}</div>
            <div className="truncate text-xs font-normal text-muted-foreground">
              {session?.email ?? ROLE_LABELS[role]}
            </div>
          </DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuItem className="rounded-lg md:hidden" render={<Link href="/alerts" />}>
            <Bell className="size-4" /> Notifications
            {activeAlerts.length > 0 && (
              <Badge variant="secondary" className="ml-auto rounded-full">{activeAlerts.length}</Badge>
            )}
          </DropdownMenuItem>
          <DropdownMenuItem className="rounded-lg" render={<Link href="/settings/profile" />}>
            <User className="size-4" /> My Profile
          </DropdownMenuItem>
          <DropdownMenuItem className="rounded-lg" render={<Link href="/settings" />}>
            <Settings className="size-4" /> Settings
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem className="rounded-lg text-destructive" onClick={() => void signOut()}>
            <LogOut className="size-4" /> Sign out
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </header>
  );
}
