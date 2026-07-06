import { createBrowserClient } from "@supabase/ssr";
import type { Database } from "@aerotrack/shared";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export const supabase = createBrowserClient<Database>(supabaseUrl, supabaseAnonKey);

export async function signUpWithEmail(email: string, password: string, fullName: string) {
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: { full_name: fullName },
    },
  });
  return { data, error };
}

export async function signInWithEmail(email: string, password: string) {
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  return { data, error };
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
