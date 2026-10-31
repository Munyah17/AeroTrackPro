"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import Link from "next/link";
import {
  Bell,
  Check,
  Eye,
  Menu,
  Moon,
  Plus,
  Search,
  Sun,
  LogOut,
  User,
  Settings,
} from "lucide-react";
import { BrandMark } from "@/components/brand/mark";
import { useAlerts } from "@/hooks/use-live-data";
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
import { homeFor, isNavActive, navFor, portalLinks, ROLE_IDENTITY, ROLE_LABELS, type Role } from "@/lib/rbac";
import { useRole } from "./role-provider";
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
  const [open, setOpen] = useState(false);
  const { brand } = useBrand();
  const { role, portal, fleetAccess, ready, setPortal } = useRole();
  const sections = ready ? navFor(role, portal, fleetAccess) : [];
  const links = ready ? portalLinks(role, fleetAccess) : [];

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
          {links.length > 1 && (
            <div className="mt-1 flex flex-col gap-1 border-t border-white/10 pt-3">
              {links.map((link) => (
                <Link
                  key={link.portal}
                  href={link.href}
                  onClick={() => setPortal(link.portal)}
                  className={cn(
                    "rounded-xl px-3 py-2.5 text-sm font-semibold",
                    portal === link.portal ? "bg-white text-sidebar" : "bg-white/10 text-white",
                  )}
                >
                  {link.label}
                </Link>
              ))}
            </div>
          )}
        </nav>
      </SheetContent>
    </Sheet>
  );
}

const PREVIEW_ROLES: Role[] = ["super_admin", "reseller", "user"];

export function Topbar() {
  const pathname = usePathname();
  const router = useRouter();
  const palette = useCommandPalette();
  const { role, portal, fleetAccess, delegate, delegates, ready, setRole, previewDelegate } = useRole();
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
  const identity = !ready
    ? { name: "", initials: "" }
    : delegate
      ? { name: delegate.name, initials: delegate.name.split(" ").map((p) => p[0]).join("").slice(0, 2).toUpperCase() }
      : ROLE_IDENTITY[role];
  const showCreate = ready && (role !== "user" || portal === "fleet");
  const headerLinks = ready ? (navFor(role, portal, fleetAccess)[0]?.items ?? []) : [];

  return (
    <header className="z-30 flex h-14 shrink-0 items-center gap-1.5 border-b border-border/60 bg-background/80 px-3 backdrop-blur-xl sm:h-16 sm:gap-2 sm:px-4 md:px-6">
      <MobileNav />

      <div className="hidden min-w-0 flex-1 md:block">
        <h1 className="truncate text-[15px] font-semibold tracking-tight sm:text-[17px]">{meta.title}</h1>
      </div>

      {/* desktop nav links — right aligned, main section of current portal */}
      <nav className="ml-auto hidden items-center gap-1 lg:flex">
        {headerLinks.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              "rounded-lg px-3 py-2 text-[13px] font-medium transition-colors",
              isNavActive(pathname, item.href)
                ? "bg-primary/10 text-primary"
                : "text-muted-foreground hover:bg-muted hover:text-foreground",
            )}
          >
            {item.label}
          </Link>
        ))}
      </nav>

      <div className="ml-auto hidden w-full max-w-sm min-w-0 md:block lg:ml-0 lg:max-w-xs xl:max-w-sm">
        <button
          onClick={palette.open}
          className="group flex h-10 w-full items-center gap-2.5 rounded-xl border border-border/70 bg-card px-3.5 text-left shadow-card transition-shadow hover:shadow-card-hover"
        >
          <Search className="size-4 shrink-0 text-muted-foreground" />
          <span className="flex-1 truncate text-[13px] text-muted-foreground">
            {role === "user" ? "Search your vehicles..." : "Search vehicles, drivers, pages..."}
          </span>
          <kbd className="hidden rounded-md border bg-muted px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground xl:inline">
            Ctrl K
          </kbd>
        </button>
      </div>

      <Button
        variant="ghost"
        size="icon"
        onClick={palette.open}
        className="shrink-0 rounded-xl md:hidden"
        aria-label="Search"
      >
        <Search className="size-[18px]" />
      </Button>

      {showCreate && (
        <Button className="hidden shrink-0 gap-1.5 rounded-xl shadow-card md:inline-flex" size="sm">
          <Plus className="size-4" /> <span className="hidden lg:inline">Quick Create</span>
        </Button>
      )}

      <Button variant="ghost" size="icon" onClick={toggle} className="hidden shrink-0 rounded-xl md:inline-flex" aria-label="Toggle color theme">
        {dark ? <Sun className="size-[18px]" /> : <Moon className="size-[18px]" />}
      </Button>

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
            <div className="text-xs font-normal text-muted-foreground">
              {delegate ? `${ROLE_LABELS[delegate.role]} · fleet access` : ROLE_LABELS[role]}
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
          <DropdownMenuLabel className="text-[10.5px] uppercase tracking-wider text-muted-foreground">
            Preview dashboard as
          </DropdownMenuLabel>
          {PREVIEW_ROLES.map((r) => (
            <DropdownMenuItem
              key={r}
              className="rounded-lg"
              onClick={() => {
                setRole(r);
                router.push(homeFor(r, r === "super_admin" ? "master" : r === "reseller" ? "reseller" : "tracking", false));
              }}
            >
              <Eye className="size-4" />
              <span className="flex-1">{ROLE_LABELS[r]}</span>
              {role === r && !delegate && <Check className="size-3.5 text-primary" />}
            </DropdownMenuItem>
          ))}
          {delegates.length > 0 && (
            <>
              <DropdownMenuSeparator />
              <DropdownMenuLabel className="text-[10.5px] uppercase tracking-wider text-muted-foreground">
                Delegated fleet access
              </DropdownMenuLabel>
              {delegates.map((d) => (
                <DropdownMenuItem
                  key={d.id}
                  className="rounded-lg"
                  onClick={() => {
                    previewDelegate(d.id);
                    router.push("/dashboard");
                  }}
                >
                  <Eye className="size-4" />
                  <span className="flex min-w-0 flex-1 flex-col">
                    <span className="truncate">{d.name}</span>
                    <span className="text-[11px] text-muted-foreground">{ROLE_LABELS[d.role]}</span>
                  </span>
                  {delegate?.id === d.id && <Check className="size-3.5 text-primary" />}
                </DropdownMenuItem>
              ))}
            </>
          )}
          <DropdownMenuSeparator />
          <DropdownMenuItem className="rounded-lg text-destructive"><LogOut className="size-4" /> Sign out</DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </header>
  );
}
