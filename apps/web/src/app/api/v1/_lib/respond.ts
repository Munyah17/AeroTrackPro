import { NextResponse } from "next/server";

export function ok<T>(data: T, init?: { meta?: Record<string, unknown>; status?: number }) {
  return NextResponse.json(
    { data, ...(init?.meta ? { meta: init.meta } : {}) },
    { status: init?.status ?? 200 },
  );
}

export function created<T>(data: T) {
  return ok(data, { status: 201 });
}

export function apiError(status: number, code: string, message: string) {
  return NextResponse.json({ error: { code, message } }, { status });
}

export const unauthorized = (message = "Missing or invalid API key") =>
  apiError(401, "unauthorized", message);
export const forbidden = (message = "API key lacks the required scope") =>
  apiError(403, "forbidden", message);
export const notFound = (resource = "resource") =>
  apiError(404, "not_found", `The requested ${resource} was not found`);
export const badRequest = (message: string) => apiError(400, "bad_request", message);
export const serverError = (message = "Internal server error") =>
  apiError(500, "server_error", message);

export function parseListParams(url: URL, defaults: { limit?: number } = {}) {
  const limit = Math.min(
    Math.max(parseInt(url.searchParams.get("limit") ?? String(defaults.limit ?? 50), 10) || 50, 1),
    500,
  );
  const page = Math.max(parseInt(url.searchParams.get("page") ?? "1", 10) || 1, 1);
  return { limit, page, offset: (page - 1) * limit };
}
