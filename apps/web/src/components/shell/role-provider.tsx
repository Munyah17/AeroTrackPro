"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { defaultPortal, hasFleetAccess, isPortal, type Portal, type Role } from "@/lib/rbac";
import {
  deleteDelegate,
  fetchDelegates,
  insertDelegate,
  readDelegates,
  type FleetDelegate,
} from "@/lib/fleet-access";
import { resolveAccountTier, type AccountTier } from "@/lib/account-tier";
import {
  fetchActiveImpersonation,
  startImpersonation as startImpersonationRow,
  stopImpersonation as stopImpersonationRow,
  type Impersonation,
} from "@/lib/impersonation";
import { clearLiveDataCache, refreshAllLiveData } from "@/hooks/use-live-data";

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
  /** Open Master Admin support session on a tenant, if any. */
  impersonation: Impersonation | null;
  setPortal: (portal: Portal) => void;
  grantFleet: (input: GrantInput) => FleetDelegate;
  revokeFleet: (id: string) => void;
  /** Log into a tenant with temporary full access (support/maintenance). */
  startImpersonation: (tenantId: string, reason?: string) => Promise<Impersonation | null>;
  /** End the support session and return to the Master Admin portal. */
  stopImpersonation: () => Promise<void>;
}

const RoleContext = createContext<RoleState | null>(null);

export function RoleProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<AccountTier | null>(null);
  const [portal, setPortalState] = useState<Portal>("master");
  const [delegates, setDelegates] = useState<FleetDelegate[]>([]);
  const [ready, setReady] = useState(false);
  const [authed, setAuthed] = useState(false);
  const [impersonation, setImpersonation] = useState<Impersonation | null>(null);

  useEffect(() => {
    /* Delegates live in the fleet_delegates table; non-admins can only
       read their own grant row, super admins see the whole ledger.
       localStorage remains for signed-out/demo sessions. */
    void fetchDelegates().then((rows) => {
      setDelegates(rows ?? readDelegates());
    });

    void resolveAccountTier().then((tier) => {
      if (tier) {
        setSession(tier);
        setPortalState(defaultPortal(tier.role));
        setAuthed(true);
      }
      setReady(true);
    });

    /* Restore an open support session after reload — the DB row is the
       source of truth, so impersonation survives refreshes and new tabs. */
    void fetchActiveImpersonation().then((imp) => {
      if (imp) {
        setImpersonation(imp);
        setPortalState("fleet");
      }
    });
  }, []);

  const role: Role = session?.role ?? "user";
  /* A grant row matching the signed-in email confers fleet access. */
  const delegated = !!session?.email && delegates.some((d) => d.email.toLowerCase() === session.email.toLowerCase());
  const fleetAccess = hasFleetAccess(role, delegated);

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
    /* Optimistic row so the UI updates instantly; swapped for the real
       row when the insert answers. */
    const optimistic: FleetDelegate = {
      ...input,
      id: crypto.randomUUID(),
      grantedAt: new Date().toISOString(),
    };
    setDelegates((current) => [optimistic, ...current]);
    void insertDelegate(input).then((row) => {
      if (!row) {
        /* Insert failed (offline/unauthorized) — roll the row back. */
        setDelegates((current) => current.filter((d) => d.id !== optimistic.id));
        return;
      }
      setDelegates((current) => current.map((d) => (d.id === optimistic.id ? row : d)));
    });
    return optimistic;
  }, []);

  const revokeFleet = useCallback((id: string) => {
    setDelegates((current) => current.filter((d) => d.id !== id));
    void deleteDelegate(id);
  }, []);

  /* Every data hook caches the resolved tenant id for the session — drop
     all caches and force a reload so queries re-scope to the tenant. */
  const reloadForTenantChange = useCallback(() => {
    clearLiveDataCache();
    refreshAllLiveData();
  }, []);

  const startImpersonation = useCallback(
    async (tenantId: string, reason?: string) => {
      const imp = await startImpersonationRow(tenantId, reason);
      if (!imp) return null;
      setImpersonation(imp);
      setPortalState("fleet");
      reloadForTenantChange();
      return imp;
    },
    [reloadForTenantChange],
  );

  const stopImpersonation = useCallback(async () => {
    if (!impersonation) return;
    const ok = await stopImpersonationRow(impersonation.id);
    if (!ok) return;
    setImpersonation(null);
    setPortalState("master");
    reloadForTenantChange();
  }, [impersonation, reloadForTenantChange]);

  const value = useMemo<RoleState>(
    () => ({
      role,
      portal,
      delegates,
      fleetAccess,
      ready,
      authed,
      session,
      impersonation,
      setPortal,
      grantFleet,
      revokeFleet,
      startImpersonation,
      stopImpersonation,
    }),
    [role, portal, delegates, fleetAccess, ready, authed, session, impersonation, setPortal, grantFleet, revokeFleet, startImpersonation, stopImpersonation],
  );

  return <RoleContext.Provider value={value}>{children}</RoleContext.Provider>;
}

export function useRole(): RoleState {
  const ctx = useContext(RoleContext);
  if (!ctx) throw new Error("useRole must be used within RoleProvider");
  return ctx;
}
