import { resolvePublicPopups } from "../services/popups/popupService";
import type { SecuritySettings } from "../services/settings/securitySettings";
import { attachUserFromSession, type AuthContext } from "./middleware/auth";
import { checkRateLimit } from "./middleware/rateLimit";
import { ApiError, toErrorResponse } from "./errorHandler";
import { mapPopupError } from "./routes/popupsRoutes";
import { validate } from "./validation/schemaValidator";
import { popupPublicQuerySchema } from "./validation/popupSchemas";

export type PublicPopupsApiContext = {
  url: URL;
  ip?: string;
  userAgent?: string;
  security: SecuritySettings;
};

const json = (payload: unknown, status = 200) =>
  new Response(JSON.stringify(payload), {
    status,
    headers: { "Content-Type": "application/json" },
  });

// Parse the Cookie header into a record so attachUserFromSession can read the
// session token. Mirrors parseCookies in publicBookingApi.ts:239 /
// publicFormsApi.ts:179 (TASK-486-01-L03).
const parseCookies = (header: string | null): Record<string, string> => {
  if (!header) return {};
  const cookies: Record<string, string> = {};
  for (const entry of header.split(";")) {
    const chunk = entry.trim();
    if (!chunk) continue;
    const splitIndex = chunk.indexOf("=");
    if (splitIndex <= 0) continue;
    const key = chunk.slice(0, splitIndex).trim();
    const rawValue = chunk.slice(splitIndex + 1).trim();
    try {
      cookies[key] = decodeURIComponent(rawValue);
    } catch {
      cookies[key] = rawValue;
    }
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

export async function handlePublicPopupsApi(
  req: Request,
  ctx: PublicPopupsApiContext,
): Promise<Response | null> {
  if (ctx.url.pathname !== "/api/popups") return null;
  if (req.method !== "GET") return null;

  try {
    checkRateLimit(
      "public_read",
      { ip: ctx.ip, userAgent: ctx.userAgent },
      ctx.security.rateLimit,
    );

    // Validate the FULL parsed query (all params), not a hand-picked
    // `{ path }`: the schema has `additionalProperties: false`, so a filtered
    // object would never see unknown params and reject-unknown would silently
    // no-op (`?foo=bar&path=/` must 400, not 200).
    const query = Object.fromEntries(ctx.url.searchParams.entries());
    validate(popupPublicQuerySchema, query);

    // Audience is resolved server-side; the client cannot assert it. Parse the
    // Cookie header into routeCtx.cookies BEFORE attaching the session:
    // attachUserFromSession reads `ctx.cookies?.[SESSION_COOKIE_NAME]`
    // (core/server/middleware/auth.ts:19). Without populated cookies the token
    // is undefined and isLoggedIn silently collapses to false, breaking the
    // logged_in/logged_out audience.
    const routeCtx: AuthContext = {
      headers: buildHeadersRecord(req),
      cookies: parseCookies(req.headers.get("cookie")),
    };
    await attachUserFromSession(routeCtx);
    const isLoggedIn = Boolean(routeCtx.user);

    const items = await resolvePublicPopups({ path: query.path, isLoggedIn });
    return json({ items });
  } catch (error) {
    if (error instanceof ApiError) {
      return json(toErrorResponse(error), error.status);
    }
    const mapped = mapPopupError(error);
    if (mapped) {
      return json(toErrorResponse(mapped), mapped.status);
    }
    // Unmapped errors (DB outage, driver failure) are server faults, not
    // client errors: mirror publicBookingApi.ts:52 and return 500, never 400.
    return json(toErrorResponse(error), 500);
  }
}
