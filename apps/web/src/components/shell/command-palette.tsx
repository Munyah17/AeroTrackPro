"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Car, Navigation, User } from "lucide-react";
import { drivers, vehicles } from "@aerotrack/shared";
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "@/components/ui/command";
import { ADMIN_NAV, FLEET_NAV } from "@/lib/nav";

const CommandPaletteContext = createContext<{ open: () => void }>({ open: () => {} });
export const useCommandPalette = () => useContext(CommandPaletteContext);

export function CommandPaletteProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter();
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

  const pages = [...FLEET_NAV, ...ADMIN_NAV].flatMap((s) =>
    s.items.map((i) => ({ ...i, section: s.label })),
  );

  return (
    <CommandPaletteContext.Provider value={{ open: () => setOpen(true) }}>
      {children}
      <CommandDialog open={open} onOpenChange={setOpen} title="Global search" description="Search vehicles, drivers and pages">
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
                <span className="font-medium">{v.plate}</span>
                <span className="text-muted-foreground">{v.name}</span>
                <span className="ml-auto text-[11px] capitalize text-muted-foreground">{v.status}</span>
              </CommandItem>
            ))}
          </CommandGroup>

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
