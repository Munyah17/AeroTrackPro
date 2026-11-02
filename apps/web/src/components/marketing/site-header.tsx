"use client";

import { useState } from "react";
import Link from "next/link";
import { LocateFixed, Menu, X } from "lucide-react";

const NAV = [
  { href: "/", label: "Home" },
  { href: "/#corporate", label: "For Businesses" },
  { href: "/supported-devices", label: "Devices" },
  { href: "/supported-vehicles", label: "Installation Guide" },
  { href: "/#pricing", label: "Pricing" },
];

export function SiteHeader() {
  const [open, setOpen] = useState(false);

  return (
    <header className="sticky top-0 z-40 border-b border-border/60 bg-background/80 backdrop-blur-md">
      <nav className="mx-auto flex h-16 max-w-6xl items-center gap-2 px-4 sm:px-6">
        <Link href="/" className="flex min-w-0 items-center gap-2.5" aria-label="AeroTrack home">
          <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-primary">
            <LocateFixed className="size-5 text-white" />
          </span>
          <span className="truncate text-[15px] font-bold tracking-tight">AeroTrack Pro</span>
        </Link>

        {/* desktop links — right aligned */}
        <div className="ml-auto hidden items-center gap-7 text-sm text-muted-foreground md:flex">
          {NAV.map((l) => (
            <Link key={l.href + l.label} href={l.href} className="transition-colors hover:text-foreground">
              {l.label}
            </Link>
          ))}
        </div>
        <div className="ml-auto flex shrink-0 items-center gap-1.5 sm:gap-2.5 md:ml-0">
          <Link
            href="/login"
            className="hidden rounded-lg px-3.5 py-2 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground sm:block"
          >
            Sign in
          </Link>
          <Link
            href="/register"
            className="rounded-lg bg-primary px-3 py-2 text-sm font-semibold text-primary-foreground shadow-sm transition-colors hover:bg-primary/90 sm:px-4"
          >
            Get started
          </Link>
          <button
            onClick={() => setOpen((o) => !o)}
            className="flex size-10 items-center justify-center rounded-xl md:hidden"
            aria-label="Toggle menu"
          >
            {open ? <X className="size-5" /> : <Menu className="size-5" />}
          </button>
        </div>
      </nav>

      {/* mobile dropdown */}
      {open && (
        <div className="border-t border-border/60 bg-background px-4 py-3 md:hidden">
          <div className="flex flex-col gap-1">
            {NAV.map((l) => (
              <Link
                key={l.href + l.label}
                href={l.href}
                onClick={() => setOpen(false)}
                className="rounded-lg px-3 py-2.5 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
              >
                {l.label}
              </Link>
            ))}
            <Link
              href="/login"
              onClick={() => setOpen(false)}
              className="rounded-lg px-3 py-2.5 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            >
              Sign in
            </Link>
          </div>
        </div>
      )}
    </header>
  );
}
