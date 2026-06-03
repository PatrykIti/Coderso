import {
  exportTopContentCsv,
  getAnalyticsOverview,
  getTopContent,
  type TopContentType,
} from "../../services/analytics/analyticsService";
import { ApiError } from "../errorHandler";
import {
  overviewQuerySchema,
  topContentExportQuerySchema,
  topContentQuerySchema,
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
}
