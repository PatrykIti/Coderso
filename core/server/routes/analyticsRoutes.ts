import {
  exportTopContentCsv,
  getAnalyticsOverview,
  getTopContent,
  type TopContentType,
} from "../../services/analytics/analyticsService";
import {
  exportTopPagesCsv,
  getTopPages,
  getTrafficOverview,
} from "../../services/analytics/trafficAggregationService";
import { ApiError } from "../errorHandler";
import {
  overviewQuerySchema,
  topContentExportQuerySchema,
  topContentQuerySchema,
  topPagesExportQuerySchema,
  topPagesQuerySchema,
  trafficOverviewQuerySchema,
} from "../validation/analyticsSchemas";

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
  delete: (path: string, ...handlers: RouteHandler[]) => void;
};

export type AnalyticsRouteDeps = {
  requirePermission: (permission: string) => RouteHandler;
  validate: (schema: unknown, payload: unknown) => void;
};

// Net-new shared mapper for the traffic-analytics stream (TASK-483). This leaf
// (TASK-483-02-L02) lands it FIRST; the admin read routes in TASK-483-04-L03
// EXTEND the same switch (adding the read-side `analytics_query_failed` case) by
// importing and reusing it — they never redeclare it.
//
// Error convention (binding, two lanes exactly like forms/booking): (1)
// beaconNonce.ts (analytics_nonce_*) and visitorIdentity.ts
// (analytics_ip_hash_secret_missing) throw ApiError DIRECTLY and return via the
// route's `instanceof ApiError` branch — they NEVER reach this mapper; (2) the
// contract normalizers (analytics_beacon_invalid) and the repository
// (analytics_persist_failed) throw plain Errors with machine-readable code
// messages — ONLY those flow through here (mirroring mapBookingError in
// bookingRoutes.ts, imported by publicBookingApi.ts).
//
// Unlike mapBookingError (which returns a NULLABLE ApiError), mapAnalyticsError
// intentionally always returns a non-null ApiError, so its caller needs no null
// branch.
export function mapAnalyticsError(error: unknown): ApiError {
  const code = (error as Error)?.message ?? "";
  switch (code) {
    // --- ingestion / write side (owned here, TASK-483-02-L02) ---
    case "analytics_beacon_invalid":
      return new ApiError(code, "Invalid analytics payload", 400);
    case "analytics_persist_failed":
      return new ApiError(code, "Analytics write failed", 500);
    // --- read / aggregation side (extended by TASK-483-04-L03; listed for the full set) ---
    case "analytics_query_failed":
      return new ApiError(code, "Analytics query failed", 500);
    default:
      return new ApiError("internal_error", "Internal Server Error", 500);
  }
}

const overviewQueryKeys = new Set(["rangeDays"]);
const topContentQueryKeys = new Set(["limit", "rangeDays", "type"]);
const topContentExportQueryKeys = new Set(["limit", "rangeDays", "type", "format"]);

const validationError = (path: string, message: string, keyword: string) =>
  new ApiError("validation_error", "Invalid payload", 400, [{ path, message, keyword }]);

const assertKnownQuery = (query: Record<string, string | undefined>, allowed: Set<string>) => {
  const unknown = Object.keys(query).find((key) => query[key] !== undefined && !allowed.has(key));
  if (unknown) {
    throw validationError(unknown, "must NOT have additional properties", "additionalProperties");
  }
};

const parseNumber = (query: Record<string, string | undefined>, key: string, fallback: number) => {
  const value = query[key];
  if (value === undefined || value === "") return fallback;
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) {
    throw validationError(key, "must be a number", "type");
  }
  return parsed;
};

// analyticsRoutes.ts has no ambient error boundary (the existing
// overview/top-content handlers return the service call directly), so this
// module-local wrapper (TASK-483-04-L03) mirrors the repo-wide
// withContentEntryErrors convention: RE-THROW ApiError unchanged (so
// assertKnownQuery/validate's 400s pass through) and map plain Errors via the
// shared mapAnalyticsError. Keeps handlers orchestration-only with map*Error at
// the boundary.
const withAnalyticsErrors = async <T>(fn: () => Promise<T>): Promise<T> => {
  try {
    return await fn();
  } catch (error) {
    if (error instanceof ApiError) throw error; // validation 400s pass through
    throw mapAnalyticsError(error); // plain Error -> mapped ApiError
  }
};

const trafficOverviewQueryKeys = new Set(["rangeDays"]);
const topPagesQueryKeys = new Set(["limit", "rangeDays"]);
const topPagesExportQueryKeys = new Set(["limit", "rangeDays", "format"]);

export function registerAnalyticsRoutes(router: Router, deps: AnalyticsRouteDeps) {
  const { requirePermission, validate } = deps;

  router.get("/analytics/overview", requirePermission("content:read"), async (ctx) => {
    assertKnownQuery(ctx.query, overviewQueryKeys);
    const rangeDays = parseNumber(ctx.query, "rangeDays", 30);
    validate(overviewQuerySchema, { rangeDays });
    return getAnalyticsOverview(rangeDays);
  });

  router.get("/analytics/top-content", requirePermission("content:read"), async (ctx) => {
    assertKnownQuery(ctx.query, topContentQueryKeys);
    const limit = parseNumber(ctx.query, "limit", 10);
    const rangeDays = parseNumber(ctx.query, "rangeDays", 30);
    const type = ctx.query.type;
    validate(topContentQuerySchema, {
      limit,
      rangeDays,
      type: type ?? undefined,
    });
    return getTopContent({
      limit,
      rangeDays,
      type: type === "page" || type === "entry" ? type : undefined,
    });
  });

  router.get("/analytics/top-content/export", requirePermission("content:read"), async (ctx) => {
    assertKnownQuery(ctx.query, topContentExportQueryKeys);
    const limit = parseNumber(ctx.query, "limit", 50);
    const rangeDays = parseNumber(ctx.query, "rangeDays", 30);
    const type = ctx.query.type;
    const format = ctx.query.format ?? "csv";
    validate(topContentExportQuerySchema, {
      limit,
      rangeDays,
      type: type ?? undefined,
      format,
    });
    return exportTopContentCsv({
      limit,
      rangeDays,
      type: type === "page" || type === "entry" ? (type as TopContentType) : undefined,
    });
  });

  router.get("/analytics/traffic/overview", requirePermission("content:read"), async (ctx) =>
    withAnalyticsErrors(async () => {
      assertKnownQuery(ctx.query, trafficOverviewQueryKeys);
      const rangeDays = parseNumber(ctx.query, "rangeDays", 30);
      validate(trafficOverviewQuerySchema, { rangeDays });
      return getTrafficOverview({ rangeDays });
    })
  );

  router.get("/analytics/traffic/top-pages", requirePermission("content:read"), async (ctx) =>
    withAnalyticsErrors(async () => {
      assertKnownQuery(ctx.query, topPagesQueryKeys);
      const limit = parseNumber(ctx.query, "limit", 10);
      const rangeDays = parseNumber(ctx.query, "rangeDays", 30);
      validate(topPagesQuerySchema, { limit, rangeDays });
      return getTopPages({ limit, rangeDays });
    })
  );

  router.get(
    "/analytics/traffic/top-pages/export",
    requirePermission("content:read"),
    async (ctx) =>
      withAnalyticsErrors(async () => {
        assertKnownQuery(ctx.query, topPagesExportQueryKeys);
        const limit = parseNumber(ctx.query, "limit", 50);
        const rangeDays = parseNumber(ctx.query, "rangeDays", 30);
        validate(topPagesExportQuerySchema, {
          limit,
          rangeDays,
          format: ctx.query.format ?? "csv",
        });
        return exportTopPagesCsv({ limit, rangeDays });
      })
  );
}
