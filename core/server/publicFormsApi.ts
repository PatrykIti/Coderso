import { ApiError, toErrorResponse } from "./errorHandler";
import { attachUserFromSession } from "./middleware/auth";
import { requirePermission } from "./middleware/rbac";
import { checkRateLimit } from "./middleware/rateLimit";
import { parseRequestBody } from "./requestBody";
import { handleFormSubmissionRoute, mapFormError, type RouteContext } from "./routes/formsRoutes";
import { validate } from "./validation/schemaValidator";
import type { SecuritySettings } from "../services/settings/securitySettings";

export type PublicFormsApiContext = {
  url: URL;
  ip?: string;
  userAgent?: string;
  security: SecuritySettings;
};

const FORM_SUBMISSION_PATH = /^\/forms\/([^/]+)\/submissions$/;

const jsonResponse = (payload: unknown, status = 200) =>
  new Response(JSON.stringify(payload), {
    status,
    headers: { "Content-Type": "application/json" },
  });

const errorResponse = (error: unknown) => {
  if (error instanceof ApiError) {
    return jsonResponse(toErrorResponse(error), error.status);
  }
  const mapped = mapFormError(error);
  if (mapped) {
    return jsonResponse(toErrorResponse(mapped), mapped.status);
  }
  return jsonResponse(toErrorResponse(error), 500);
};

const parseCookies = (header: string | null) => {
  if (!header) return {} as Record<string, string>;
  const cookies: Record<string, string> = {};
  for (const entry of header.split(";")) {
    const chunk = entry.trim();
    if (!chunk) continue;
    const splitIndex = chunk.indexOf("=");
    if (splitIndex <= 0) continue;
    const key = chunk.slice(0, splitIndex).trim();
    const value = chunk.slice(splitIndex + 1).trim();
    cookies[key] = decodeURIComponent(value);
  }
  return cookies;
};

const buildHeadersRecord = (req: Request) => {
  const headers: Record<string, string | undefined> = {};
  req.headers.forEach((value, key) => {
    headers[key] = value;
  });
  return headers;
};

export async function handlePublicFormsApi(
  req: Request,
  ctx: PublicFormsApiContext
): Promise<Response | null> {
  const match = ctx.url.pathname.match(FORM_SUBMISSION_PATH);
  if (!match) return null;
  if (req.method !== "POST") return null;

  const formId = decodeURIComponent(match[1] ?? "");
  try {
    checkRateLimit(
      "public_write",
      {
        ip: ctx.ip,
        userAgent: ctx.userAgent,
        identifier: formId,
      },
      ctx.security.rateLimit
    );

    const headers = buildHeadersRecord(req);
    const routeContext: RouteContext = {
      params: { id: formId },
      query: Object.fromEntries(ctx.url.searchParams.entries()),
      body: await parseRequestBody(req),
      headers,
      cookies: parseCookies(req.headers.get("cookie")),
      ip: ctx.ip,
      userAgent: ctx.userAgent,
    };
    await attachUserFromSession(routeContext);

    const result = await handleFormSubmissionRoute(routeContext, {
      requirePermission,
      validate,
    });
    return jsonResponse(result);
  } catch (error) {
    return errorResponse(error);
  }
}
