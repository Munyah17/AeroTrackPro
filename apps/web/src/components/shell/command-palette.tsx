"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Car, Navigation, User } from "lucide-react";
import { useDrivers } from "@/hooks/use-live-data";
import { useFleet } from "@/hooks/use-fleet";
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "@/components/ui/command";
import { canVisit, FLEET_PORTAL_NAV, MASTER_NAV, navFor, RESELLER_NAV, USER_NAV } from "@/lib/rbac";
import { useRole } from "./role-provider";

const CommandPaletteContext = createContext<{ open: () => void }>({ open: () => {} });
export const useCommandPalette = () => useContext(CommandPaletteContext);

export function CommandPaletteProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const { vehicles } = useFleet();
  const { rows: drivers } = useDrivers();
  const { role, portal, fleetAccess } = useRole();
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen((o) => !o);
      }
    };
    document.addEventListener("keydown", down);
    return () => document.removeEventListener("keydown", down);
  }, []);

  const go = (href: string) => {
    setOpen(false);
    router.push(href);
  };

  const sections =
    role === "super_admin"
      ? [...MASTER_NAV, ...RESELLER_NAV, ...FLEET_PORTAL_NAV, ...USER_NAV]
      : [...navFor(role, portal === "fleet" ? "fleet" : role === "reseller" ? "reseller" : "tracking", fleetAccess), ...(fleetAccess ? FLEET_PORTAL_NAV : [])];
  const pages = sections
    .flatMap((s) => s.items.map((i) => ({ ...i, section: s.label })))
    .filter((page, index, all) => all.findIndex((other) => other.href === page.href) === index)
    .filter((page) => canVisit(page.href, role, fleetAccess));
  const showDrivers = canVisit("/drivers", role, fleetAccess);

  return (
    <CommandPaletteContext.Provider value={{ open: () => setOpen(true) }}>
      {children}
      <CommandDialog open={open} onOpenChange={setOpen} title="Global search" description="Search vehicles, drivers and pages" className="sm:max-w-xl">
        <CommandInput placeholder="Search vehicles, drivers, pages..." />
        <CommandList className="max-h-[420px]">
          <CommandEmpty>No results found.</CommandEmpty>

          <CommandGroup heading="Vehicles">
            {vehicles.slice(0, 24).map((v) => (
              <CommandItem
                key={v.id}
                value={`${v.plate} ${v.name} ${v.make} ${v.model}`}
                onSelect={() => go(`/vehicles/${v.id}`)}
              >
                <Car className="size-4 text-primary" />
                <span className="font-medium">{v.name || v.plate}</span>
                <span className="text-muted-foreground">{v.name && v.name !== v.plate ? v.plate : ""}</span>
                <span className="ml-auto text-[11px] capitalize text-muted-foreground">{v.status}</span>
              </CommandItem>
            ))}
          </CommandGroup>

          {showDrivers && (
            <>
              <CommandSeparator />
              <CommandGroup heading="Drivers">
                {drivers.map((d) => (
                  <CommandItem key={d.id} value={`driver ${d.name}`} onSelect={() => go("/drivers")}>
                    <User className="size-4 text-primary" />
                    <span className="font-medium">{d.name}</span>
                    <span className="ml-auto text-[11px] text-muted-foreground">score {d.behaviorScore}</span>
                  </CommandItem>
                ))}
              </CommandGroup>
            </>
          )}

          <CommandSeparator />

          <CommandGroup heading="Pages">
            {pages.map((p) => (
              <CommandItem key={p.href} value={`${p.label} ${p.section ?? ""} page`} onSelect={() => go(p.href)}>
                <p.icon className="size-4 text-primary" />
                <span className="font-medium">{p.label}</span>
                {p.section && <span className="ml-auto text-[11px] text-muted-foreground">{p.section}</span>}
              </CommandItem>
            ))}
            <CommandItem value="live tracking map" onSelect={() => go("/tracking")}>
              <Navigation className="size-4 text-primary" />
              <span className="font-medium">Open Live Map</span>
            </CommandItem>
          </CommandGroup>
        </CommandList>
      </CommandDialog>
    </CommandPaletteContext.Provider>
  );
}
