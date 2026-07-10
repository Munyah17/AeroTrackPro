"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion } from "framer-motion";
import { ChevronsLeft, LocateFixed, LayoutGrid, ArrowLeftRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { type NavSection } from "@/lib/nav";
import { canSwitchPortal, navFor, ROLE_LABELS } from "@/lib/rbac";
import { useRole } from "./role-provider";

function NavLink({
  item,
  active,
  collapsed,
}: {
  item: NavSection["items"][number];
  active: boolean;
  collapsed: boolean;
}) {
  const link = (
    <Link
      href={item.href}
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
        <Badge className="relative z-10 ml-auto h-5 min-w-5 justify-center rounded-full bg-white/20 px-1.5 text-[11px] text-white group-hover:bg-white/25">
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
  const { role, portal, setPortal } = useRole();
  const sections = navFor(role, portal);
  const showSwitcher = canSwitchPortal(role);
  const onMaster = role === "super_admin" && portal === "master";

  const surfaceLabel =
    role === "super_admin"
      ? onMaster
        ? "Platform Admin"
        : "Reseller Portal"
      : role === "reseller"
        ? "Reseller Portal"
        : "Fleet Console";

  return (
    <aside
      className={cn(
        "fixed inset-y-3 left-3 z-40 hidden flex-col rounded-2xl bg-sidebar text-sidebar-foreground shadow-float transition-[width] duration-300 lg:flex",
        collapsed ? "w-[68px]" : "w-[248px]",
      )}
    >
      {/* Logo */}
      <div className={cn("flex items-center gap-2.5 px-4 pt-5 pb-4", collapsed && "justify-center px-2")}>
        <div className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-white/15 backdrop-blur">
          <LocateFixed className="size-5 text-white" />
        </div>
        {!collapsed && (
          <div className="min-w-0">
            <div className="truncate text-[15px] font-bold tracking-tight text-white">AeroTrack Pro</div>
            <div className="truncate text-[11px] text-sidebar-foreground/60">{surfaceLabel}</div>
          </div>
        )}
      </div>

      {/* Nav */}
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
                  active={
                    item.href === "/admin" || item.href === "/reseller" || item.href === "/dashboard"
                      ? pathname === item.href
                      : pathname.startsWith(item.href)
                  }
                />
              ))}
            </div>
          ))}
        </nav>
      </ScrollArea>

      {/* Portal switcher (platform owner only) + collapse */}
      <div className={cn("flex flex-col gap-1 p-3", collapsed && "items-center")}>
        {showSwitcher && (
          <Link
            href={onMaster ? "/reseller" : "/admin"}
            onClick={() => setPortal(onMaster ? "reseller" : "master")}
            className={cn(
              "flex items-center gap-3 rounded-xl bg-white/5 px-3 py-2 text-[13px] font-medium text-sidebar-foreground/85 transition-colors hover:bg-sidebar-accent hover:text-white",
              collapsed && "justify-center px-2",
            )}
          >
            <ArrowLeftRight className="size-[18px] shrink-0" />
            {!collapsed && <span>Switch to {onMaster ? "Reseller" : "Master"} portal</span>}
          </Link>
        )}
        {!collapsed && (
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
