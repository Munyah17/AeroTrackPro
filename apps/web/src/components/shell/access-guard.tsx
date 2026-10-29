"use client";

import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { canVisit, homeFor, isFleetPath } from "@/lib/rbac";
import { useRole } from "./role-provider";

/**
 * Keeps the open page inside the account's portal. Master Admin can open
 * every surface. Fleet-management routes stay closed unless this session
 * holds a delegation.
 */
export function AccessGuard({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { role, portal, fleetAccess, ready, setPortal } = useRole();
  const allowed = canVisit(pathname, role, fleetAccess);

  useEffect(() => {
    if (!ready) return;
    if (!allowed) {
      router.replace(homeFor(role, portal, fleetAccess));
      return;
    }
    if (role !== "super_admin") return;
    if (pathname.startsWith("/admin") && portal !== "master") setPortal("master");
    else if (pathname.startsWith("/reseller") && portal !== "reseller") setPortal("reseller");
    else if (isFleetPath(pathname) && portal !== "fleet") setPortal("fleet");
  }, [allowed, fleetAccess, pathname, portal, ready, role, router, setPortal]);

  if (!ready || !allowed) {
    return <div className="h-full min-h-[40vh]" />;
  }
  return children;
}
