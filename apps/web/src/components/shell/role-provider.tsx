"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import {
  defaultPortal,
  hasFleetAccess,
  isPortal,
  normalizeRole,
  type Portal,
  type Role,
} from "@/lib/rbac";
import {
  ACTIVE_DELEGATE_KEY,
  readDelegates,
  writeDelegates,
  type FleetDelegate,
} from "@/lib/fleet-access";

interface GrantInput {
  name: string;
  email: string;
  organization: string;
  role: "reseller" | "user";
}

interface RoleState {
  role: Role;
  portal: Portal;
  /** The grant currently being previewed. Null for the founder's own login. */
  delegateId: string | null;
  delegate: FleetDelegate | null;
  delegates: FleetDelegate[];
  /** True for Master Admin, and for a session previewing a fleet grant. */
  fleetAccess: boolean;
  ready: boolean;
  setRole: (role: Role) => void;
  setPortal: (portal: Portal) => void;
  grantFleet: (input: GrantInput) => FleetDelegate;
  revokeFleet: (id: string) => void;
  previewDelegate: (id: string) => void;
}

const RoleContext = createContext<RoleState | null>(null);

const ROLE_KEY = "at-role";
const PORTAL_KEY = "at-portal";

export function RoleProvider({ children }: { children: React.ReactNode }) {
  const [role, setRoleState] = useState<Role>("super_admin");
  const [portal, setPortalState] = useState<Portal>("master");
  const [delegateId, setDelegateId] = useState<string | null>(null);
  const [delegates, setDelegates] = useState<FleetDelegate[]>([]);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const storedDelegates = readDelegates();
    const storedDelegateId = localStorage.getItem(ACTIVE_DELEGATE_KEY);
    const delegate = storedDelegates.find((d) => d.id === storedDelegateId) ?? null;
    const nextRole = delegate ? delegate.role : normalizeRole(localStorage.getItem(ROLE_KEY));
    const storedPortal = localStorage.getItem(PORTAL_KEY);
    let nextPortal = isPortal(storedPortal) ? storedPortal : defaultPortal(nextRole);
    const access = hasFleetAccess(nextRole, !!delegate);
    if (nextPortal === "fleet" && !access) nextPortal = defaultPortal(nextRole);
    if (nextRole === "user" && nextPortal === "reseller") nextPortal = "tracking";
    if (nextRole === "reseller" && (nextPortal === "master" || nextPortal === "tracking")) {
      nextPortal = "reseller";
    }
    if (nextRole === "super_admin" && nextPortal === "tracking") nextPortal = "master";
    setDelegates(storedDelegates);
    setDelegateId(delegate?.id ?? null);
    setRoleState(nextRole);
    setPortalState(nextPortal);
    if (!delegate && storedDelegateId) localStorage.removeItem(ACTIVE_DELEGATE_KEY);
    setReady(true);
  }, []);

  const persistPortal = useCallback((next: Portal) => {
    setPortalState(next);
    localStorage.setItem(PORTAL_KEY, next);
  }, []);

  const clearDelegate = useCallback(() => {
    setDelegateId(null);
    localStorage.removeItem(ACTIVE_DELEGATE_KEY);
  }, []);

  const delegate = delegates.find((d) => d.id === delegateId) ?? null;
  const fleetAccess = hasFleetAccess(role, !!delegate);

  const setRole = useCallback(
    (next: Role) => {
      setRoleState(next);
      clearDelegate();
      localStorage.setItem(ROLE_KEY, next);
      persistPortal(defaultPortal(next));
    },
    [clearDelegate, persistPortal],
  );

  const setPortal = useCallback(
    (next: Portal) => {
      if (next === "fleet" && !hasFleetAccess(role, !!delegate)) return;
      if (role === "user" && next === "reseller") return;
      if (role === "user" && next === "master") return;
      if (role === "reseller" && (next === "master" || next === "tracking")) return;
      if (role === "super_admin" && next === "tracking") return;
      persistPortal(next);
    },
    [delegate, persistPortal, role],
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

  const revokeFleet = useCallback(
    (id: string) => {
      setDelegates((current) => {
        const next = current.filter((d) => d.id !== id);
        writeDelegates(next);
        return next;
      });
      if (delegateId === id) {
        clearDelegate();
        setRoleState("super_admin");
        localStorage.setItem(ROLE_KEY, "super_admin");
        persistPortal("master");
      }
    },
    [clearDelegate, delegateId, persistPortal],
  );

  const previewDelegate = useCallback(
    (id: string) => {
      const target = delegates.find((d) => d.id === id);
      if (!target) return;
      setRoleState(target.role);
      setDelegateId(target.id);
      localStorage.setItem(ROLE_KEY, target.role);
      localStorage.setItem(ACTIVE_DELEGATE_KEY, target.id);
      persistPortal("fleet");
    },
    [delegates, persistPortal],
  );

  const value = useMemo<RoleState>(
    () => ({
      role,
      portal,
      delegateId,
      delegate,
      delegates,
      fleetAccess,
      ready,
      setRole,
      setPortal,
      grantFleet,
      revokeFleet,
      previewDelegate,
    }),
    [
      role,
      portal,
      delegateId,
      delegate,
      delegates,
      fleetAccess,
      ready,
      setRole,
      setPortal,
      grantFleet,
      revokeFleet,
      previewDelegate,
    ],
  );

  return <RoleContext.Provider value={value}>{children}</RoleContext.Provider>;
}

export function useRole(): RoleState {
  const ctx = useContext(RoleContext);
  if (!ctx) throw new Error("useRole must be used within RoleProvider");
  return ctx;
}
