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
        return apiError(error.status, error.status === 401 ? "unauthorized" : "forbidden", error.message);
      }
      if (error instanceof ZodError) {
        return badRequest(error.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join("; "));
      }
      console.error("[api/v1] Unhandled error:", error);
      return serverError();
    }
  };
}
