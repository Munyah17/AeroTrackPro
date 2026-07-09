import "server-only";

import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "@aerotrack/shared";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

/** True when the app has Supabase credentials; false = demo mode on mock data. */
export function isSupabaseConfigured(): boolean {
  return Boolean(url && anonKey);
}

/** True when server-side privileged access (REST API, ingest hooks) is available. */
export function isServiceRoleConfigured(): boolean {
  return Boolean(url && serviceRoleKey);
}

/**
 * Cookie-bound client for Server Components, Route Handlers and Server Actions.
 * Runs as the signed-in user; RLS enforces tenant isolation.
 */
export async function createSupabaseServerClient() {
  if (!url || !anonKey) {
    throw new Error("Supabase is not configured (NEXT_PUBLIC_SUPABASE_URL / ANON_KEY missing)");
  }

  const cookieStore = await cookies();

  return createServerClient<Database>(url, anonKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options),
          );
        } catch {
          // Called from a Server Component — middleware refreshes sessions instead.
        }
      },
    },
  });
}

/**
 * Service-role client that bypasses RLS. Server-only; used by the public REST
 * API (which authenticates via API key, then scopes every query by tenant_id).
 */
export function createAdminClient() {
  if (!url || !serviceRoleKey) {
    throw new Error("Supabase service role is not configured (SUPABASE_SERVICE_ROLE_KEY missing)");
  }

  return createClient<Database>(url, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
