"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import Link from "next/link";
import {
  Bell,
  Building2,
  Menu,
  Moon,
  Plus,
  Search,
  Sun,
  LocateFixed,
  LogOut,
  User,
  Settings,
} from "lucide-react";
import { alerts } from "@aerotrack/shared";
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
import { NAV_META, FLEET_NAV, ADMIN_NAV } from "@/lib/nav";
import { useCommandPalette } from "./command-palette";

function useDarkMode() {
  const [dark, setDark] = useState(false);
  useEffect(() => {
    const stored = localStorage.getItem("at-theme");
    const prefers = window.matchMedia("(prefers-color-scheme: dark)").matches;
    const initial = stored ? stored === "dark" : prefers;
    setDark(initial);
    document.documentElement.classList.toggle("dark", initial);
  }, []);
  const toggle = () => {
    const next = !dark;
    setDark(next);
    document.documentElement.classList.toggle("dark", next);
    localStorage.setItem("at-theme", next ? "dark" : "light");
  };
  return { dark, toggle };
}

function MobileNav() {
  const pathname = usePathname();
  const isAdmin = pathname.startsWith("/admin");
  const sections = isAdmin ? ADMIN_NAV : FLEET_NAV;
  return (
    <Sheet>
      <SheetTrigger
        render={
          <Button variant="ghost" size="icon" className="rounded-xl lg:hidden">
            <Menu className="size-5" />
          </Button>
        }
      />
      <SheetContent side="left" className="w-72 bg-sidebar p-0 text-sidebar-foreground">
        <SheetTitle className="sr-only">Navigation</SheetTitle>
        <div className="flex items-center gap-2.5 px-5 pt-5 pb-3">
          <div className="flex size-9 items-center justify-center rounded-xl bg-white/15">
            <LocateFixed className="size-5 text-white" />
          </div>
          <span className="text-[15px] font-bold text-white">AeroTrack Pro</span>
        </div>
        <nav className="flex flex-col gap-4 overflow-y-auto p-4">
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
                    "flex items-center gap-3 rounded-xl px-3 py-2 text-sm font-medium",
                    pathname.startsWith(item.href)
                      ? "bg-white text-sidebar-primary-foreground"
                      : "text-sidebar-foreground/75",
                  )}
                >
                  <item.icon className="size-[18px]" />
                  {item.label}
                </Link>
              ))}
            </div>
          ))}
          <div className="mt-2 border-t border-white/10 pt-3">
            <Link
              href={isAdmin ? "/dashboard" : "/admin"}
              className="flex items-center gap-3 rounded-xl bg-white/10 px-3 py-2.5 text-sm font-semibold text-white"
            >
              <Building2 className="size-[18px]" />
              {isAdmin ? "Back to Fleet Console" : "Reseller Portal"}
            </Link>
          </div>
        </nav>
      </SheetContent>
    </Sheet>
  );
}

export function Topbar() {
  const pathname = usePathname();
  const palette = useCommandPalette();
  const { dark, toggle } = useDarkMode();
  const meta = NAV_META[pathname] ??
    NAV_META[Object.keys(NAV_META).find((k) => k !== "/admin" && pathname.startsWith(k)) ?? ""] ?? {
      title: "AeroTrack Pro",
    };
  const activeAlerts = alerts.filter((a) => a.status === "active");

  return (
    <header className="sticky top-0 z-30 flex h-16 items-center gap-3 border-b border-border/60 bg-background/80 px-4 backdrop-blur-xl md:px-6">
      <MobileNav />

      <div className="min-w-0 flex-1 md:flex-none">
        <h1 className="truncate text-[17px] font-semibold tracking-tight">{meta.title}</h1>
      </div>

      {/* Search */}
      <div className="ml-auto hidden w-full max-w-sm md:block">
        <button
          onClick={palette.open}
          className="group flex h-10 w-full items-center gap-2.5 rounded-xl border border-border/70 bg-card px-3.5 text-left shadow-card transition-shadow hover:shadow-card-hover"
        >
          <Search className="size-4 text-muted-foreground" />
          <span className="flex-1 truncate text-[13px] text-muted-foreground">
            Search vehicles, drivers, locations...
          </span>
          <kbd className="rounded-md border bg-muted px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground">
            Ctrl K
          </kbd>
        </button>
      </div>

      <Button className="hidden gap-1.5 rounded-xl shadow-card md:inline-flex" size="sm">
        <Plus className="size-4" /> Quick Create
      </Button>

      {/* Theme */}
      <Button variant="ghost" size="icon" onClick={toggle} className="rounded-xl">
        {dark ? <Sun className="size-[18px]" /> : <Moon className="size-[18px]" />}
      </Button>

      {/* Notifications */}
      <DropdownMenu>
        <DropdownMenuTrigger
          render={
            <Button variant="ghost" size="icon" className="relative rounded-xl">
              <Bell className="size-[18px]" />
              {activeAlerts.length > 0 && (
                <span className="absolute right-1.5 top-1.5 flex size-4 items-center justify-center rounded-full bg-primary text-[9.5px] font-bold text-white">
                  {activeAlerts.length}
                </span>
              )}
            </Button>
          }
        />
        <DropdownMenuContent align="end" className="w-80 rounded-2xl p-2 shadow-float">
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

      {/* Profile */}
      <DropdownMenu>
        <DropdownMenuTrigger
          render={
            <button className="flex items-center gap-2 rounded-xl border border-border/70 bg-card py-1.5 pl-1.5 pr-3 shadow-card transition-shadow hover:shadow-card-hover">
              <Avatar className="size-7">
                <AvatarFallback className="bg-primary text-[11px] font-semibold text-white">MM</AvatarFallback>
              </Avatar>
              <span className="hidden text-[13px] font-medium md:block">Munya M.</span>
            </button>
          }
        />
        <DropdownMenuContent align="end" className="w-52 rounded-2xl p-1.5 shadow-float">
          <DropdownMenuLabel>
            <div className="text-[13px] font-semibold">Munya M.</div>
            <div className="text-xs font-normal text-muted-foreground">SpeedTrack Ltd · Admin</div>
          </DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuItem className="rounded-lg"><User className="size-4" /> Profile</DropdownMenuItem>
          <DropdownMenuItem className="rounded-lg" render={<Link href="/settings" />}>
            <Settings className="size-4" /> Settings
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem className="rounded-lg text-destructive"><LogOut className="size-4" /> Sign out</DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </header>
  );
}
