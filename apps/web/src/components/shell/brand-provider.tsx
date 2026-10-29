"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { usePathname } from "next/navigation";
import {
  applyBrandTheme,
  applyFavicon,
  clearBrandTheme,
  DEFAULT_BRAND,
  isPlatformSurface,
  normalizeBrand,
  readBrand,
  writeBrand,
  type BrandConfig,
} from "@/lib/brand";

interface BrandState {
  brand: BrandConfig;
  ready: boolean;
  save: (next: BrandConfig) => void;
}

const BrandContext = createContext<BrandState | null>(null);

export function BrandProvider({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [brand, setBrand] = useState<BrandConfig>(DEFAULT_BRAND);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    setBrand(readBrand());
    setReady(true);
  }, []);

  useEffect(() => {
    if (!ready) return;
    if (isPlatformSurface(pathname)) {
      clearBrandTheme();
      applyFavicon(null);
      return;
    }
    applyBrandTheme(brand);
    applyFavicon(brand.faviconDataUrl);
    if (pathname === "/site" || pathname.startsWith("/login") || pathname.startsWith("/register")) {
      document.title = brand.name;
    }
  }, [brand, pathname, ready]);

  const save = useCallback((next: BrandConfig) => {
    const normalized = normalizeBrand(next);
    writeBrand(normalized);
    setBrand(normalized);
  }, []);

  const value = useMemo(() => ({ brand, ready, save }), [brand, ready, save]);

  return <BrandContext.Provider value={value}>{children}</BrandContext.Provider>;
}

export function useBrand() {
  const ctx = useContext(BrandContext);
  if (!ctx) throw new Error("useBrand must be used within BrandProvider");
  return ctx;
}
