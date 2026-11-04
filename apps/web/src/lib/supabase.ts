import { createBrowserClient } from "@supabase/ssr";
import type { Database } from "@aerotrack/shared";

// NEXT_PUBLIC_* values are public-by-design (shipped to every browser; RLS
// enforces access), so the real project URL + anon key are safe defaults —
// keeps public live-data pages (vehicle guides, device catalogue) working
// even where deployment env vars aren't configured.
export const SUPABASE_URL =
  process.env.NEXT_PUBLIC_SUPABASE_URL ||
  "https://jmeokeatxqbiblxabvpq.supabase.co";
export const SUPABASE_ANON_KEY =
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImptZW9rZWF0eHFiaWJseGFidnBxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTMxODY1MzAsImV4cCI6MjEwODc2MjUzMH0.43AsZoOEzt_kDBHF1Lva5fjLAVXasicztpVWVxlUej0";

const supabaseUrl = SUPABASE_URL;
const supabaseAnonKey = SUPABASE_ANON_KEY;

export const supabase = createBrowserClient<Database>(supabaseUrl, supabaseAnonKey);

/** Fetch threw at network level (DNS/adblock/offline) — not an auth error. */
function isNetworkFailure(err: unknown): boolean {
  return (
    err instanceof Error &&
    (err.message === "Failed to fetch" || err.name === "TypeError" || err.name === "AuthRetryableFetchError")
  );
}

const NETWORK_ERROR = {
  message:
    "Can't reach the auth server — check your internet connection, VPN, or an adblocker/privacy extension blocking supabase.co, then reload.",
} as const;

export async function signUpWithEmail(email: string, password: string, fullName: string) {
  try {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { full_name: fullName },
      },
    });
    if (error && isNetworkFailure(error)) return { data, error: { ...error, message: NETWORK_ERROR.message } };
    return { data, error };
  } catch (err) {
    if (isNetworkFailure(err)) return { data: { user: null, session: null }, error: NETWORK_ERROR };
    throw err;
  }
}

export async function signInWithEmail(email: string, password: string) {
  try {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error && isNetworkFailure(error)) return { data, error: { ...error, message: NETWORK_ERROR.message } };
    return { data, error };
  } catch (err) {
    if (isNetworkFailure(err)) return { data: { user: null, session: null }, error: NETWORK_ERROR };
    throw err;
  }
}

export async function signOut() {
  return supabase.auth.signOut();
}

export async function resetPassword(email: string) {
  return supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${window.location.origin}/reset-password`,
  });
}

export async function updatePassword(newPassword: string) {
  return supabase.auth.updateUser({ password: newPassword });
}

export async function getCurrentUser() {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user;
}

export async function getCurrentTenant() {
  const user = await getCurrentUser();
  if (!user) return null;

  const { data } = await supabase
    .from("users")
    .select("tenant_id, tenants(id, name, slug, primary_color, plan, status)")
    .eq("auth_id", user.id)
    .single();

  return (data as { tenants: unknown } | null)?.tenants ?? null;
}

export async function getUserTenants() {
  const user = await getCurrentUser();
  if (!user) return [];

  const { data } = await supabase
    .from("users")
    .select("tenant_id")
    .eq("auth_id", user.id);

  // In a real app, fetch full tenant details here
  // For now return mock structure
  return data ?? [];
}
