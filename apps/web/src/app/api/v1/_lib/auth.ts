import "server-only";

import { createHash } from "crypto";
import type { NextRequest } from "next/server";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@aerotrack/shared";
import { createAdminClient, isServiceRoleConfigured } from "@/lib/supabase/server";

export type ApiContext = {
  mode: "live";
  db: SupabaseClient<Database>;
  tenantId: string;
  scopes: string[];
  apiKeyId: string;
};

export class ApiAuthError extends Error {
  constructor(
    public status: 401 | 403 | 503,
    message: string,
  ) {
    super(message);
  }
}

export function hashApiKey(rawKey: string): string {
  return createHash("sha256").update(rawKey).digest("hex");
}

/**
 * Resolves the caller's tenant from a bearer API key (`Authorization: Bearer atk_...`).
 * Requires the service-role key — the API never fabricates demo responses.
 */
export async function authenticate(request: NextRequest): Promise<ApiContext> {
  if (!isServiceRoleConfigured()) {
    throw new ApiAuthError(503, "API is not configured on this deployment");
  }

  const header = request.headers.get("authorization") ?? "";
  const [scheme, rawKey] = header.split(" ");

  if (scheme?.toLowerCase() !== "bearer" || !rawKey?.startsWith("atk_")) {
    throw new ApiAuthError(401, "Provide an API key: Authorization: Bearer atk_...");
  }

  const db = createAdminClient();
  const { data: key } = await db
    .from("api_keys")
    .select("id, tenant_id, scopes, status, expires_at")
    .eq("key_hash", hashApiKey(rawKey))
    .maybeSingle();

  if (!key || key.status !== "active") {
    throw new ApiAuthError(401, "Unknown or revoked API key");
  }
  if (key.expires_at && new Date(key.expires_at) < new Date()) {
    throw new ApiAuthError(401, "API key has expired");
  }

  // Best-effort usage stamp; never blocks the request.
  void db.from("api_keys").update({ last_used_at: new Date().toISOString() }).eq("id", key.id).then();

  return {
    mode: "live",
    db,
    tenantId: key.tenant_id,
    scopes: key.scopes,
    apiKeyId: key.id,
  };
}

export function requireScope(ctx: ApiContext, scope: "read" | "write") {
  if (ctx.scopes.includes(scope) || ctx.scopes.includes("*")) return;
  throw new ApiAuthError(403, `API key lacks the "${scope}" scope`);
}
