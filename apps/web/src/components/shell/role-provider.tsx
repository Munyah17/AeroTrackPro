"use client";

import { createContext, useContext, useEffect, useMemo, useState } from "react";
import type { Portal, Role } from "@/lib/rbac";

interface RoleState {
  role: Role;
  portal: Portal;
  /** Demo affordance: lets the owner preview each dashboard tier. */
  setRole: (role: Role) => void;
  setPortal: (portal: Portal) => void;
}

const RoleContext = createContext<RoleState | null>(null);

const ROLE_KEY = "at-role";
const PORTAL_KEY = "at-portal";

export function RoleProvider({ children }: { children: React.ReactNode }) {
  // Default to the platform owner so the account that set the project up sees
  // everything. In production this is seeded from the authenticated user's row.
  const [role, setRoleState] = useState<Role>("super_admin");
  const [portal, setPortalState] = useState<Portal>("master");

  useEffect(() => {
    const r = localStorage.getItem(ROLE_KEY) as Role | null;
    const p = localStorage.getItem(PORTAL_KEY) as Portal | null;
    if (r) setRoleState(r);
    if (p) setPortalState(p);
  }, []);

  const value = useMemo<RoleState>(
    () => ({
      role,
      portal,
      setRole: (r) => {
        setRoleState(r);
        localStorage.setItem(ROLE_KEY, r);
        // Non-owners can't sit on the master portal.
        if (r !== "super_admin") {
          setPortalState("reseller");
          localStorage.setItem(PORTAL_KEY, "reseller");
        }
      },
      setPortal: (p) => {
        setPortalState(p);
        localStorage.setItem(PORTAL_KEY, p);
      },
    }),
    [role, portal],
  );

  return <RoleContext.Provider value={value}>{children}</RoleContext.Provider>;
}

export function useRole(): RoleState {
  const ctx = useContext(RoleContext);
  if (!ctx) throw new Error("useRole must be used within RoleProvider");
  return ctx;
}
