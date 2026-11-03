"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { defaultPortal, hasFleetAccess, isPortal, type Portal, type Role } from "@/lib/rbac";
import { readDelegates, writeDelegates, type FleetDelegate } from "@/lib/fleet-access";
import { resolveAccountTier, type AccountTier } from "@/lib/account-tier";

interface GrantInput {
  name: string;
  email: string;
  organization: string;
  role: "reseller" | "user";
}

interface RoleState {
  /** The signed-in account's role — always from the DB profile, never a switcher. */
  role: Role;
  /** Surface being shown. Super admins move between surfaces; everyone else is fixed. */
  portal: Portal;
  /** Fleet grants issued by Master Admin — the /admin/fleet-partnerships ledger. */
  delegates: FleetDelegate[];
  fleetAccess: boolean;
  /** True once the session's tier has been resolved (or confirmed absent). */
  ready: boolean;
  /** True when a signed-in account with a users profile resolved. */
  authed: boolean;
  /** The resolved account for identity display. Null when unauthenticated. */
  session: AccountTier | null;
  setPortal: (portal: Portal) => void;
  grantFleet: (input: GrantInput) => FleetDelegate;
  revokeFleet: (id: string) => void;
}

const RoleContext = createContext<RoleState | null>(null);

export function RoleProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<AccountTier | null>(null);
  const [portal, setPortalState] = useState<Portal>("master");
  const [delegates, setDelegates] = useState<FleetDelegate[]>([]);
  const [ready, setReady] = useState(false);
  const [authed, setAuthed] = useState(false);

  useEffect(() => {
    setDelegates(readDelegates());

    void resolveAccountTier().then((tier) => {
      if (tier) {
        setSession(tier);
        setPortalState(defaultPortal(tier.role));
        setAuthed(true);
      }
      setReady(true);
    });
  }, []);

  const role: Role = session?.role ?? "user";
  const fleetAccess = hasFleetAccess(role, false);

  const setPortal = useCallback(
    (next: Portal) => {
      if (!isPortal(next)) return;
      /* Only the master account moves between surfaces. */
      if (session?.role !== "super_admin") return;
      setPortalState(next);
    },
    [session],
  );

  const grantFleet = useCallback((input: GrantInput) => {
    const created: FleetDelegate = {
      ...input,
      id: crypto.randomUUID(),
      grantedAt: new Date().toISOString(),
    };
    setDelegates((current) => {
      const next = [created, ...current];
      writeDelegates(next);
      return next;
    });
    return created;
  }, []);

  const revokeFleet = useCallback((id: string) => {
    setDelegates((current) => {
      const next = current.filter((d) => d.id !== id);
      writeDelegates(next);
      return next;
    });
  }, []);

  const value = useMemo<RoleState>(
    () => ({
      role,
      portal,
      delegates,
      fleetAccess,
      ready,
      authed,
      session,
      setPortal,
      grantFleet,
      revokeFleet,
    }),
    [role, portal, delegates, fleetAccess, ready, authed, session, setPortal, grantFleet, revokeFleet],
  );

  return <RoleContext.Provider value={value}>{children}</RoleContext.Provider>;
}

export function useRole(): RoleState {
  const ctx = useContext(RoleContext);
  if (!ctx) throw new Error("useRole must be used within RoleProvider");
  return ctx;
}
