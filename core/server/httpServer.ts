import path from "node:path";
import { ApiError, toErrorResponse } from "./errorHandler";
import { parseRequestBody } from "./requestBody";
import { attachUserFromSession, requireAuth } from "./middleware/auth";
import { applyCorsHeaders } from "./middleware/cors";
import { enforceCsrf } from "./middleware/csrf";
import { requirePermission } from "./middleware/rbac";
import { checkRateLimit } from "./middleware/rateLimit";
import { createRequestIdContext } from "./middleware/requestId";
import { applySecurityHeaders } from "./middleware/securityHeaders";
import { recordAccessLog } from "./middleware/accessLog";
import { enforceIpAllowlist } from "./middleware/ipAllowlist";
import { enforceHostPolicy } from "./middleware/hostPolicy";
import { createRouter, matchRoute, normalizePath, type RouteContext } from "./router";
import { registerAllRoutes } from "./routes";
import { validate } from "./validation/schemaValidator";
import { getMediaStorageAdapter } from "../services/media/storage";
import { getSecuritySettings } from "../services/settings/securitySettings";
import { getStorageSettingsInternal } from "../services/settings/storageSettings";
import { authenticateApiKey } from "../services/security/apiKeyAuth";
import { evaluateMediaAccess } from "../services/media/mediaAccess";
import { initializeDocsIndexOnBootIfEnabled } from "../services/assistant/docsIndexService";
import { ensureThemesLoaded } from "../themes/registry";
import { handlePublicRequest } from "./publicSite";
import { resolveAdminPath } from "./utils/adminPath";

const MEDIA_PREFIX = "/media";

const READ_METHODS = new Set(["GET", "HEAD"]);

const isReadMethod = (method: string) => READ_METHODS.has(method.toUpperCase());

const isPublicWritePath = (pathname: string) =>
  /^\/forms\/[^/]+\/submissions$/.test(pathname);

const resolvePublicWriteIdentifier = (pathname: string) => {
  const match = pathname.match(/^\/forms\/([^/]+)\/submissions$/);
  return match ? match[1] : null;
};

const parseCookies = (header: string | null) => {
  if (!header) return {} as Record<string, string>;
  const entries = header.split(";").map((pair) => pair.trim());
  const cookies: Record<string, string> = {};
  for (const entry of entries) {
    if (!entry) continue;
    const index = entry.indexOf("=");
    if (index === -1) continue;
    const key = entry.slice(0, index).trim();
    const value = entry.slice(index + 1).trim();
    cookies[key] = decodeURIComponent(value);
  }
  return cookies;
};

const createCookieValue = (
  name: string,
  value: string,
  options: {
    httpOnly: boolean;
    secure: boolean;
    sameSite: "strict" | "lax" | "none";
    path: string;
    maxAge: number;
  }
) => {
  const segments = [`${name}=${encodeURIComponent(value)}`];
  segments.push(`Path=${options.path}`);
  segments.push(`Max-Age=${options.maxAge}`);
  segments.push(`SameSite=${options.sameSite}`);
  if (options.httpOnly) segments.push("HttpOnly");
  if (options.secure) segments.push("Secure");
  return segments.join("; ");
};

const jsonResponse = (payload: unknown, init?: ResponseInit) => {
  const body = payload === undefined ? "" : JSON.stringify(payload);
  const headers = new Headers(init?.headers);
  headers.set("Content-Type", "application/json");
  return new Response(body, {
    status: init?.status ?? 200,
    headers,
  });
};

const errorResponse = (error: unknown) => {
  if (error instanceof ApiError) {
    return jsonResponse(toErrorResponse(error), { status: error.status });
  }
  if (error instanceof Error) {
    if (error.message === "auth_required") {
      return jsonResponse(toErrorResponse(new ApiError("auth_required", "Not authenticated", 401)), {
        status: 401,
      });
    }
    if (error.message === "forbidden") {
      return jsonResponse(toErrorResponse(new ApiError("forbidden", "Forbidden", 403)), {
        status: 403,
      });
    }
    if (error.message === "validation_error") {
      return jsonResponse(toErrorResponse(new ApiError("validation_error", "Invalid payload", 400)), {
        status: 400,
      });
    }
    if (error.message === "media_file_invalid") {
      return jsonResponse(
        toErrorResponse(new ApiError("media_file_invalid", "Invalid upload payload", 400)),
        { status: 400 }
      );
    }
    if (error.message === "media_file_too_large") {
      return jsonResponse(
        toErrorResponse(new ApiError("media_file_too_large", "File exceeds size limit", 413)),
        { status: 413 }
      );
    }
    if (error.message === "media_mime_not_allowed") {
      return jsonResponse(
        toErrorResponse(new ApiError("media_mime_not_allowed", "File type not allowed", 400)),
        { status: 400 }
      );
    }
    if (error.message === "media_not_found") {
      return jsonResponse(
        toErrorResponse(new ApiError("media_not_found", "Media item not found", 404)),
        { status: 404 }
      );
    }
    if (error.message === "media_storage_unavailable") {
      return jsonResponse(
        toErrorResponse(
          new ApiError("media_storage_unavailable", "Storage path is not writable", 503)
        ),
        { status: 503 }
      );
    }
  }
  return jsonResponse(toErrorResponse(error), { status: 500 });
};

const resolveIp = (req: Request) => {
  const forwarded = req.headers.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0]?.trim();
  return undefined;
};

const buildRouter = () => {
  const router = createRouter();
  registerAllRoutes(router, {
    requireAuth: requireAuth(),
    requirePermission,
    validate,
  });
  return router;
};

const router = buildRouter();

export type HttpServerOptions = {
  adminDevUrl?: string;
  port?: number;
};

const ensureTrailingSlash = (value: string) => (value.endsWith("/") ? value : `${value}/`);

export const injectAdminBaseHref = (html: string, adminPath: string) => {
  if (/<base\s+href=/i.test(html)) return html;
  const baseHref = ensureTrailingSlash(adminPath);
  return html.replace(/<head([^>]*)>/i, `<head$1>\n    <base href="${baseHref}" />`);
};

export const normalizeAdminAssetPath = (pathname: string, adminPath: string) => {
  const assetPrefix = `${adminPath}/assets/`;
  if (pathname.startsWith(assetPrefix) || pathname === `${adminPath}/favicon.ico`) {
    return pathname;
  }
  if (!pathname.startsWith(adminPath)) return null;
  const relative = pathname.slice(adminPath.length);
  const nestedAssetIndex = relative.indexOf("/assets/");
  if (nestedAssetIndex === -1) return null;
  return `${adminPath}${relative.slice(nestedAssetIndex)}`;
};

const resolveAdminFile = (pathname: string, adminPath: string) => {
  const distDir = path.resolve(process.cwd(), "dist/client");
  const relative = pathname.replace(adminPath, "") || "/index.html";
  const filePath = path.resolve(distDir, `.${relative}`);
  if (!filePath.startsWith(distDir)) return null;
  return filePath;
};

const redirectToDev = (req: Request, devUrl: string) => {
  const url = new URL(req.url);
  const target = new URL(url.pathname + url.search, devUrl);
  return Response.redirect(target.toString(), 307);
};

const handleAdmin = async (req: Request, adminPath: string, devUrl?: string) => {
  const url = new URL(req.url);
  try {
    await enforceIpAllowlist(resolveIp(req));
  } catch (error) {
    return errorResponse(error);
  }
  if (url.pathname === adminPath) {
    return Response.redirect(`${adminPath}/`, 307);
  }

  if (devUrl) return redirectToDev(req, devUrl);

  const security = await getSecuritySettings();
  checkRateLimit(
    "public_read",
    {
      ip: resolveIp(req),
      userAgent: req.headers.get("user-agent") ?? undefined,
    },
    security.rateLimit
  );

  const normalizedAssetPath = normalizeAdminAssetPath(url.pathname, adminPath);
  if (normalizedAssetPath) {
    const filePath = resolveAdminFile(normalizedAssetPath, adminPath);
    if (!filePath) return new Response("Forbidden", { status: 403 });
    const file = Bun.file(filePath);
    if (!(await file.exists())) return new Response("Not Found", { status: 404 });
    const headers = new Headers({ "Content-Type": file.type });
    applySecurityHeaders(headers, security.headers);
    return new Response(file, { headers });
  }

  const indexPath = resolveAdminFile(`${adminPath}/index.html`, adminPath);
  if (!indexPath) return new Response("Not Found", { status: 404 });
  const indexFile = Bun.file(indexPath);
  if (!(await indexFile.exists())) return new Response("Not Found", { status: 404 });
  const indexHtml = injectAdminBaseHref(await indexFile.text(), adminPath);
  const headers = new Headers({ "Content-Type": "text/html" });
  applySecurityHeaders(headers, security.headers);
  return new Response(indexHtml, { headers });
};

const handleApi = async (req: Request, apiPrefix: string) => {
  const url = new URL(req.url);
  const pathname = normalizePath(url.pathname).replace(apiPrefix, "") || "/";
  const security = await getSecuritySettings();
  const requestContext = createRequestIdContext(security.requestId);
  const requestStart = requestContext?.requestStart ?? Date.now();
  const responseHeaders = new Headers();
  if (requestContext) {
    responseHeaders.set(requestContext.headerName, requestContext.requestId);
  }
  applySecurityHeaders(responseHeaders, security.headers);
  applyCorsHeaders(req, responseHeaders, security.cors);

  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: responseHeaders });
  }

  try {
    await enforceIpAllowlist(resolveIp(req));
  } catch (error) {
    const response = errorResponse(error);
    responseHeaders.forEach((value, key) => response.headers.append(key, value));
    void recordAccessLog({
      method: req.method,
      path: url.pathname,
      status: response.status,
      ip: resolveIp(req) ?? null,
      userAgent: req.headers.get("user-agent") ?? null,
      userId: null,
      durationMs: Date.now() - requestStart,
    });
    return response;
  }

  for (const route of router.routes) {
    if (route.method !== req.method) continue;
    const match = matchRoute(route.path, pathname);
    if (!match.matched) continue;

    const headersObj: Record<string, string> = {};
    req.headers.forEach((value, key) => {
      headersObj[key] = value;
    });
    const cookies = parseCookies(req.headers.get("cookie"));

    const ctx: RouteContext = {
      params: match.params,
      query: Object.fromEntries(url.searchParams.entries()),
      body: await parseRequestBody(req),
      headers: headersObj,
      cookies,
      ip: resolveIp(req),
      userAgent: req.headers.get("user-agent") ?? undefined,
      requestId: requestContext?.requestId,
      requestStart: requestContext?.requestStart,
      setCookie: (name, value, options) => {
        responseHeaders.append("Set-Cookie", createCookieValue(name, value, options));
      },
      clearCookie: (name) => {
        responseHeaders.append(
          "Set-Cookie",
          createCookieValue(name, "", {
            httpOnly: true,
            secure: true,
            sameSite: "strict",
            path: "/",
            maxAge: 0,
          })
        );
      },
    };

    await attachUserFromSession(ctx);

    try {
      const isAuthRoute = pathname.startsWith("/auth");
      const isAssistantRoute = pathname.startsWith("/assistant");
      const isAssistantSiteBuilderRoute = pathname.startsWith("/assistant/site-builder/");
      const isPublicWrite = req.method === "POST" && isPublicWritePath(pathname);
      const bucket = isAuthRoute
        ? "auth"
        : isAssistantSiteBuilderRoute
          ? pathname.endsWith("/execute")
            ? "admin_write"
            : "admin_read"
          : isAssistantRoute
          ? "assistant"
          : isPublicWrite
            ? "public_write"
            : isReadMethod(req.method)
              ? "admin_read"
              : "admin_write";
      const identifierFromBody =
        isAuthRoute && ctx.body && typeof ctx.body === "object"
          ? (ctx.body as { email?: string }).email
          : undefined;
      const identifier = isPublicWrite
        ? resolvePublicWriteIdentifier(pathname) ?? undefined
        : identifierFromBody;
      checkRateLimit(
        bucket,
        {
          ip: ctx.ip,
          userAgent: ctx.userAgent,
          userId: ctx.user?.id,
          identifier,
        },
        security.rateLimit,
        { isAuthenticated: Boolean(ctx.user) }
      );
      await enforceCsrf(req, ctx, security.csrf);
      let result: unknown = undefined;
      for (const handler of route.handlers) {
        const output = await handler(ctx);
        if (output !== undefined) result = output;
      }
      const response = jsonResponse(result ?? { ok: true }, { headers: responseHeaders });
      void recordAccessLog({
        method: req.method,
        path: url.pathname,
        status: response.status,
        ip: ctx.ip ?? null,
        userAgent: ctx.userAgent ?? null,
        userId: ctx.user?.id ?? null,
        durationMs: Date.now() - requestStart,
      });
      return response;
    } catch (error) {
      const response = errorResponse(error);
      responseHeaders.forEach((value, key) => response.headers.append(key, value));
      void recordAccessLog({
        method: req.method,
        path: url.pathname,
        status: response.status,
        ip: ctx.ip ?? null,
        userAgent: ctx.userAgent ?? null,
        userId: ctx.user?.id ?? null,
        durationMs: Date.now() - requestStart,
      });
      return response;
    }
  }

  const response = new Response("Not Found", { status: 404, headers: responseHeaders });
  void recordAccessLog({
    method: req.method,
    path: url.pathname,
    status: response.status,
    ip: resolveIp(req) ?? null,
    userAgent: req.headers.get("user-agent") ?? null,
    userId: null,
    durationMs: Date.now() - requestStart,
  });
  return response;
};

const handleMedia = async (req: Request) => {
  const url = new URL(req.url);
  if (!url.pathname.startsWith(MEDIA_PREFIX)) {
    return new Response("Not Found", { status: 404 });
  }

  const key = url.pathname.slice(MEDIA_PREFIX.length).replace(/^\/+/, "");
  if (!key) return new Response("Not Found", { status: 404 });

  const security = await getSecuritySettings();
  checkRateLimit(
    "public_read",
    {
      ip: resolveIp(req),
      userAgent: req.headers.get("user-agent") ?? undefined,
    },
    security.rateLimit
  );

  const config = await getStorageSettingsInternal();

  if (config.delivery.accessMode === "internal") {
    const headersObj: Record<string, string | undefined> = {};
    req.headers.forEach((value, key) => {
      headersObj[key] = value;
    });

    const authContext: {
      user?: { id: string };
      cookies?: Record<string, string | undefined>;
      headers?: Record<string, string | undefined>;
    } = {
      headers: headersObj,
      cookies: parseCookies(req.headers.get("cookie")),
    };

    await attachUserFromSession(authContext);
    const apiKey = authContext.user
      ? null
      : await authenticateApiKey(req.headers.get("authorization"));
    const access = evaluateMediaAccess({
      mode: "internal",
      isAuthenticated: Boolean(authContext.user),
      apiKeyScopes: apiKey?.scopes,
    });

    if (!access.allow) {
      if (access.reason === "forbidden") {
        return new Response("Forbidden", { status: 403 });
      }
      return new Response("Unauthorized", { status: 401 });
    }

    if (authContext.user) {
      try {
        await requirePermission("media:read")({ user: authContext.user });
      } catch {
        return new Response("Forbidden", { status: 403 });
      }
    }
  }

  if (config.driver !== "local") {
    const adapter = await getMediaStorageAdapter();
    if (config.delivery.accessMode === "public") {
      return Response.redirect(adapter.getPublicUrl(key), 302);
    }
    try {
      const stream = await adapter.get(key);
      return new Response(stream as unknown as BodyInit, {
        headers: { "Content-Type": "application/octet-stream" },
      });
    } catch {
      return new Response("Not Found", { status: 404 });
    }
  }

  const baseDir = path.resolve(config.localDir ?? "/data/media");
  const targetPath = path.resolve(baseDir, key);
  if (targetPath !== baseDir && !targetPath.startsWith(`${baseDir}${path.sep}`)) {
    return new Response("Forbidden", { status: 403 });
  }

  const file = Bun.file(targetPath);
  if (!(await file.exists())) return new Response("Not Found", { status: 404 });
  return new Response(file, { headers: { "Content-Type": file.type } });
};

export function startHttpServer(options: HttpServerOptions = {}) {
  const port = options.port ?? Number(process.env.PORT ?? 3000);
  const adminDevUrl = options.adminDevUrl ?? process.env.VITE_DEV_SERVER_URL;
  void ensureThemesLoaded().catch((error) => {
    console.warn("Theme registry failed to load:", error);
  });
  void initializeDocsIndexOnBootIfEnabled().catch((error) => {
    console.warn("Assistant docs index initialization failed:", error);
  });

  return Bun.serve({
    port,
    async fetch(req) {
      const url = new URL(req.url);
      const adminPath = await resolveAdminPath();
      const apiPrefix = `${adminPath}/api`;

      const hostPolicy = await enforceHostPolicy(req);
      if (hostPolicy) return hostPolicy;
      if (url.pathname.startsWith(apiPrefix)) {
        return handleApi(req, apiPrefix);
      }
      if (url.pathname.startsWith(MEDIA_PREFIX)) {
        return handleMedia(req);
      }
      if (url.pathname.startsWith(adminPath)) {
        return handleAdmin(req, adminPath, adminDevUrl);
      }
      return handlePublicRequest(req);
    },
  });
}
