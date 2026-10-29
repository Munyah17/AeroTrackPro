"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion } from "framer-motion";
import { ChevronsLeft, LayoutGrid, ArrowLeftRight } from "lucide-react";
import { BrandMark } from "@/components/brand/mark";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { type NavSection } from "@/lib/nav";
import { isNavActive, navFor, portalLinks, ROLE_LABELS, surfaceLabel } from "@/lib/rbac";
import { useBrand } from "./brand-provider";
import { useRole } from "./role-provider";

function NavLink({
  item,
  active,
  collapsed,
  onNavigate,
}: {
  item: NavSection["items"][number];
  active: boolean;
  collapsed: boolean;
  onNavigate?: () => void;
}) {
  const link = (
    <Link
      href={item.href}
      onClick={onNavigate}
      className={cn(
        "group relative flex items-center gap-3 rounded-xl px-3 py-2 text-[13.5px] font-medium transition-colors duration-150",
        active
          ? "text-sidebar-primary-foreground"
          : "text-sidebar-foreground/75 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
        collapsed && "justify-center px-2",
      )}
    >
      {active && (
        <motion.span
          layoutId="sidebar-active"
          className="absolute inset-0 rounded-xl bg-sidebar-primary shadow-card"
          transition={{ type: "spring", stiffness: 420, damping: 36 }}
        />
      )}
      <item.icon className="relative z-10 size-[18px] shrink-0" strokeWidth={2} />
      {!collapsed && <span className="relative z-10 truncate">{item.label}</span>}
      {!collapsed && item.badge !== undefined && (
        <Badge className="relative z-10 ml-auto h-5 min-w-5 justify-center rounded-full bg-white/20 px-1.5 text-[11px] text-white">
          {item.badge}
        </Badge>
      )}
    </Link>
  );

  if (!collapsed) return link;
  return (
    <Tooltip>
      <TooltipTrigger render={link} />
      <TooltipContent side="right" sideOffset={10}>
        {item.label}
      </TooltipContent>
    </Tooltip>
  );
}

export function Sidebar({
  collapsed,
  onToggle,
}: {
  collapsed: boolean;
  onToggle: () => void;
}) {
  const pathname = usePathname();
  const { brand } = useBrand();
  const { role, portal, fleetAccess, ready, setPortal } = useRole();
  const sections = ready ? navFor(role, portal, fleetAccess) : [];
  const links = ready ? portalLinks(role, fleetAccess) : [];
  const showSwitcher = links.length > 1;
  const next = links.find((link) => link.portal !== portal) ?? links[0];

  return (
    <aside
      data-brand={brand.name}
      className={cn(
        "fixed inset-y-3 left-3 z-40 hidden max-h-[calc(100dvh-1.5rem)] flex-col rounded-2xl bg-sidebar text-sidebar-foreground shadow-float transition-[width] duration-300 lg:flex",
        collapsed ? "w-[68px]" : "w-[248px]",
      )}
    >
      <div className={cn("flex items-center gap-2.5 px-4 pt-5 pb-4", collapsed && "justify-center px-2")}>
        <div className="flex size-9 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-white/15 backdrop-blur">
          <BrandMark logo={brand.logoDataUrl} className="size-5 text-white" />
        </div>
        {!collapsed && (
          <div className="min-w-0">
            <div className="truncate text-[15px] font-bold tracking-tight text-white">{brand.name}</div>
            <div className="truncate text-[11px] text-sidebar-foreground/60">{ready ? surfaceLabel(role, portal) : "Loading"}</div>
          </div>
        )}
      </div>

      <ScrollArea className="min-h-0 flex-1 px-3">
        <nav className="flex flex-col gap-5 pb-4">
          {sections.map((section, i) => (
            <div key={i} className="flex flex-col gap-0.5">
              {section.label && !collapsed && (
                <div className="px-3 pb-1.5 text-[10.5px] font-semibold uppercase tracking-[0.08em] text-sidebar-foreground/45">
                  {section.label}
                </div>
              )}
              {section.items.map((item) => (
                <NavLink
                  key={item.href}
                  item={item}
                  collapsed={collapsed}
                  active={isNavActive(pathname, item.href)}
                />
              ))}
            </div>
          ))}
        </nav>
      </ScrollArea>

      <div className={cn("flex flex-col gap-1 p-3", collapsed && "items-center")}>
        {showSwitcher && !collapsed && (
          <div className="mb-1 flex flex-col gap-0.5 rounded-xl bg-white/5 p-1">
            {links.map((link) => (
              <Link
                key={link.portal}
                href={link.href}
                onClick={() => setPortal(link.portal)}
                className={cn(
                  "rounded-lg px-2.5 py-1.5 text-[12px] font-medium transition-colors",
                  portal === link.portal
                    ? "bg-white text-sidebar"
                    : "text-sidebar-foreground/80 hover:bg-white/10 hover:text-white",
                )}
              >
                {link.label}
              </Link>
            ))}
          </div>
        )}
        {showSwitcher && collapsed && next && (
          <Tooltip>
            <TooltipTrigger
              render={
                <Link
                  href={next.href}
                  onClick={() => setPortal(next.portal)}
                  className="flex size-9 items-center justify-center rounded-xl text-sidebar-foreground/80 hover:bg-sidebar-accent hover:text-white"
                >
                  <ArrowLeftRight className="size-[18px]" />
                </Link>
              }
            />
            <TooltipContent side="right">Switch to {next.label}</TooltipContent>
          </Tooltip>
        )}
        {!collapsed && ready && (
          <div className="flex items-center gap-2 px-3 py-1.5 text-[10.5px] text-sidebar-foreground/45">
            <LayoutGrid className="size-3.5" />
            {ROLE_LABELS[role]} account
          </div>
        )}
        <Button
          variant="ghost"
          size="sm"
          onClick={onToggle}
          className={cn(
            "justify-start gap-3 rounded-xl px-3 text-sidebar-foreground/60 hover:bg-sidebar-accent hover:text-white",
            collapsed && "justify-center px-2",
          )}
        >
          <ChevronsLeft className={cn("size-[18px] transition-transform duration-300", collapsed && "rotate-180")} />
          {!collapsed && <span className="text-[13px]">Collapse</span>}
        </Button>
      </div>
    </aside>
  );
}
