"use client";

import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { canVisit, homeFor, isFleetPath, isTrackingOnlyPath } from "@/lib/rbac";
import { useRole } from "./role-provider";

/**
 * Keeps the open page inside the account's portal. Master Admin can open
 * every surface. Fleet-management routes stay closed unless this session
 * holds a delegation.
 */
export function AccessGuard({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { role, portal, fleetAccess, ready, authed, setPortal, impersonation } = useRole();
  const allowed = canVisit(pathname, role, fleetAccess);

  useEffect(() => {
    if (!ready) return;
    if (!authed) {
      router.replace("/login");
      return;
    }
    /* While a support session is open the admin console is out of scope —
       the platform powers are suspended until "Back To Super Admin". */
    if (impersonation && pathname.startsWith("/admin")) {
      router.replace("/dashboard");
      return;
    }
    if (!allowed) {
      router.replace(homeFor(role, portal, fleetAccess));
      return;
    }
    if (role !== "super_admin") return;
    /* The master portal embeds every surface (admin + fleet + reseller), so
       it never needs to follow the path into a focused portal. Only the
       dedicated fleet/reseller/tracking surfaces auto-switch. */
    if (portal === "master") return;
    if (pathname.startsWith("/admin")) setPortal("master");
    else if (pathname.startsWith("/reseller") && portal !== "reseller") setPortal("reseller");
    else if (isFleetPath(pathname) && portal !== "fleet") setPortal("fleet");
    else if (isTrackingOnlyPath(pathname) && portal !== "tracking") setPortal("tracking");
  }, [allowed, authed, fleetAccess, impersonation, pathname, portal, ready, role, router, setPortal]);

  if (!ready || !authed || !allowed) {
    return <div className="h-full min-h-[40vh]" />;
  }
  return children;
}
