import { ApiError, toErrorResponse } from "./errorHandler";
import { attachUserFromSession } from "./middleware/auth";
import { requirePermission } from "./middleware/rbac";
import { checkRateLimit } from "./middleware/rateLimit";
import { parseRequestBody } from "./requestBody";
import {
  handleFormAttachmentUploadRoute,
  handleFormSubmissionRoute,
  mapFormError,
  type RouteContext,
} from "./routes/formsRoutes";
import { validate } from "./validation/schemaValidator";
import type { SecuritySettings } from "../services/settings/securitySettings";

export type PublicFormsApiContext = {
  url: URL;
  ip?: string;
  userAgent?: string;
  security: SecuritySettings;
};

const FORM_SUBMISSION_PATH = /^\/forms\/([^/]+)\/submissions$/;
// TASK-516-07: the file-attachment upload route is public "like the submission route",
// so it is dispatched through this same anonymous entrypoint (the auth-gated admin
// router would otherwise 401 an anonymous submitter). It reuses the form's own
// submission access gate + nonce + bot-protection inside handleFormAttachmentUploadRoute.
const FORM_UPLOAD_PATH = /^\/forms\/([^/]+)\/uploads$/;

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
  const submissionMatch = ctx.url.pathname.match(FORM_SUBMISSION_PATH);
  const uploadMatch = submissionMatch ? null : ctx.url.pathname.match(FORM_UPLOAD_PATH);
  const match = submissionMatch ?? uploadMatch;
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

    const result = uploadMatch
      ? await handleFormAttachmentUploadRoute(routeContext, { requirePermission, validate })
      : await handleFormSubmissionRoute(routeContext, { requirePermission, validate });
    return jsonResponse(result);
  } catch (error) {
    return errorResponse(error);
  }
}
