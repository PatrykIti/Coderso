import { syncIndexedPages, syncSearchPerformance } from "../../services/seo/gscSyncService";
import { getSeoOverview, getSearchPerformance } from "../../services/seo/seoPerformanceService";
import {
  listSeoDocuments,
  getSeoDocument,
  updateSeoDocumentById,
  runSeoAudit,
} from "../../services/seo/seoService";
import {
  getSitemapStatus,
  refreshSitemapStatus,
  submitSitemap,
} from "../../services/seo/sitemapSubmissionService";
import type { SeoAuditCheckId } from "../../services/seo/seoTypes";
import { ApiError } from "../errorHandler";
import {
  seoAuditSchema,
  seoSearchPerformanceQuerySchema,
  seoSitemapSubmitSchema,
  seoSyncSchema,
  seoUpdateSchema,
} from "../validation/seoSchemas";

export type RouteContext = {
  params: Record<string, string>;
  query: Record<string, string | undefined>;
  body: unknown;
  user?: { id: string };
};

export type RouteHandler = (ctx: RouteContext) => Promise<unknown> | unknown;

export type Router = {
  get: (path: string, ...handlers: RouteHandler[]) => void;
  post: (path: string, ...handlers: RouteHandler[]) => void;
  patch: (path: string, ...handlers: RouteHandler[]) => void;
};

export type SeoRouteDeps = {
  requirePermission: (permission: string) => RouteHandler;
  validate: (schema: unknown, payload: unknown) => void;
};

export const mapSeoError = (error: unknown) => {
  if (error instanceof ApiError) return error;
  if (error instanceof Error) {
    if (error.message === "seo_not_found") {
      return new ApiError("seo_not_found", "SEO document not found.", 404);
    }
    if (error.message === "seo_audit_checks_required") {
      return new ApiError(
        "seo_audit_checks_required",
        "At least one SEO audit check is required.",
        400
      );
    }
    if (error.message === "seo_audit_target_invalid") {
      return new ApiError(
        "seo_audit_target_invalid",
        "SEO audit targetType and targetId must be provided together.",
        400
      );
    }
    if (error.message === "seo_canonical_invalid") {
      return new ApiError("seo_canonical_invalid", "Canonical URL is invalid.", 400);
    }
    if (error.message === "seo_robots_invalid") {
      return new ApiError("seo_robots_invalid", "Robots directive is invalid.", 400);
    }
    if (error.message === "gsc_not_configured") {
      return new ApiError(
        "gsc_not_configured",
        "Google Search Console is not configured for this site.",
        409
      );
    }
    if (error.message === "gsc_credential_invalid") {
      return new ApiError(
        "gsc_credential_invalid",
        "Google Search Console credentials are invalid.",
        400
      );
    }
    if (error.message === "gsc_sync_window_invalid") {
      return new ApiError(
        "gsc_sync_window_invalid",
        "The requested sync window is invalid or out of range.",
        400
      );
    }
    if (error.message.startsWith("gsc_request_failed:")) {
      return new ApiError("gsc_request_failed", "Google Search Console request failed.", 502);
    }
    if (error.message === "sitemap_path_invalid") {
      return new ApiError(
        "sitemap_path_invalid",
        "Sitemap path must be an own-origin relative path.",
        400
      );
    }
    if (error.message === "sitemap_submit_failed") {
      return new ApiError(
        "sitemap_submit_failed",
        "Sitemap submission to Google Search Console failed.",
        502
      );
    }
  }
  return null;
};

const throwMappedSeoError = (error: unknown): never => {
  const mapped = mapSeoError(error);
  if (mapped) throw mapped;
  if (error instanceof Error) {
    throw new ApiError("seo_error", error.message, 500);
  }
  throw error;
};

const SEARCH_PERFORMANCE_QUERY_KEYS = new Set(["targetId", "startDate", "endDate", "limit"]);

const assertKnownQuery = (query: Record<string, string | undefined>, allowed: Set<string>) => {
  const unknown = Object.keys(query).find((key) => query[key] !== undefined && !allowed.has(key));
  if (unknown) {
    throw new ApiError("validation_error", "Invalid payload", 400, [
      {
        path: unknown,
        message: "must NOT have additional properties",
        keyword: "additionalProperties",
      },
    ]);
  }
};

export function registerSeoRoutes(router: Router, deps: SeoRouteDeps) {
  const { requirePermission, validate } = deps;

  router.get("/seo", requirePermission("content:read"), async () => {
    return listSeoDocuments();
  });

  // TASK-493-04-L02: SEO Manager read/sync/sitemap surface. The three literal
  // GET paths are registered BEFORE `/:id` because the router matches first by
  // registration order; `/seo/overview` would otherwise resolve as `id`.
  router.get("/seo/overview", requirePermission("content:read"), async () => {
    return getSeoOverview();
  });

  router.get("/seo/search-performance", requirePermission("content:read"), async (ctx) => {
    try {
      assertKnownQuery(ctx.query, SEARCH_PERFORMANCE_QUERY_KEYS);
      // Query values arrive as strings; coerce `limit` so the schema's number
      // type is checked on the parsed value (the clamp itself stays in the
      // L01 service).
      validate(seoSearchPerformanceQuerySchema, {
        targetId: ctx.query.targetId,
        startDate: ctx.query.startDate,
        endDate: ctx.query.endDate,
        limit: ctx.query.limit ? Number(ctx.query.limit) : undefined,
      });
      return await getSearchPerformance({
        targetId: ctx.query.targetId,
        startDate: ctx.query.startDate,
        endDate: ctx.query.endDate,
        limit: ctx.query.limit ? Number(ctx.query.limit) : undefined,
      });
    } catch (error) {
      throwMappedSeoError(error);
    }
  });

  router.get("/seo/sitemap", requirePermission("content:read"), async () => {
    await refreshSitemapStatus();
    return getSitemapStatus();
  });

  router.post("/seo/search-performance/sync", requirePermission("settings:write"), async (ctx) => {
    try {
      validate(seoSyncSchema, ctx.body);
      const out = await syncSearchPerformance(ctx.body as { startDate?: string; endDate?: string });
      await syncIndexedPages();
      return out;
    } catch (error) {
      throwMappedSeoError(error);
    }
  });

  router.post("/seo/sitemap/submit", requirePermission("settings:write"), async (ctx) => {
    try {
      validate(seoSitemapSubmitSchema, ctx.body);
      return await submitSitemap(ctx.body as { sitemapPath?: string });
    } catch (error) {
      throwMappedSeoError(error);
    }
  });

  router.get("/seo/:id", requirePermission("content:read"), async (ctx) => {
    const doc = await getSeoDocument(ctx.params.id);
    if (!doc) throw new ApiError("seo_not_found", "SEO document not found.", 404);
    return doc;
  });

  router.patch("/seo/:id", requirePermission("content:write"), async (ctx) => {
    try {
      validate(seoUpdateSchema, ctx.body);
      const body = ctx.body as {
        title?: string;
        description?: string;
        canonicalUrl?: string;
        robots?: string;
      };
      const doc = await updateSeoDocumentById(ctx.params.id, body);
      if (!doc) throw new Error("seo_not_found");
      return doc;
    } catch (error) {
      throwMappedSeoError(error);
    }
  });

  router.post("/seo/audit", requirePermission("content:read"), async (ctx) => {
    try {
      validate(seoAuditSchema, ctx.body);
      const body = ctx.body as {
        targetType?: "page" | "entry";
        targetId?: string;
        checks?: SeoAuditCheckId[];
      };
      if ((body.targetType && !body.targetId) || (!body.targetType && body.targetId)) {
        throw new Error("seo_audit_target_invalid");
      }
      return runSeoAudit(body.targetType, body.targetId, body.checks);
    } catch (error) {
      throwMappedSeoError(error);
    }
  });
}
