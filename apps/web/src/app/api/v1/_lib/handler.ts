import type { NextRequest } from "next/server";
import { ZodError } from "zod";
import { ApiAuthError, authenticate, type ApiContext } from "./auth";
import { apiError, badRequest, serverError } from "./respond";

type RouteParams = Record<string, string>;

/**
 * Wraps a route handler with API-key authentication and uniform error
 * handling. Handlers receive the resolved tenant context and route params.
 */
export function withApi(
  handler: (req: NextRequest, ctx: ApiContext, params: RouteParams) => Promise<Response>,
) {
  return async (
    req: NextRequest,
    routeCtx?: { params?: Promise<RouteParams> },
  ): Promise<Response> => {
    try {
      const ctx = await authenticate(req);
      const params = routeCtx?.params ? await routeCtx.params : {};
      return await handler(req, ctx, params);
    } catch (error) {
      if (error instanceof ApiAuthError) {
        const code =
          error.status === 401 ? "unauthorized" : error.status === 403 ? "forbidden" : "unavailable";
        return apiError(error.status, code, error.message);
      }
      if (error instanceof ZodError) {
        return badRequest(error.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join("; "));
      }
      console.error("[api/v1] Unhandled error:", error);
      return serverError();
    }
  };
}
