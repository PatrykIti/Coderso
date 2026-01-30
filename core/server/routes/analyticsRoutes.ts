import { getAnalyticsOverview, getTopContent } from "../../services/analytics/analyticsService";
import { overviewQuerySchema, topContentQuerySchema } from "../validation/analyticsSchemas";

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

const parseNumber = (value: string | undefined) => {
  if (!value) return undefined;
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return undefined;
  return parsed;
};

export function registerAnalyticsRoutes(router: Router, deps: AnalyticsRouteDeps) {
  const { requirePermission, validate } = deps;

  router.get("/analytics/overview", requirePermission("content:read"), async (ctx) => {
    const rangeDays = parseNumber(ctx.query.rangeDays) ?? 30;
    validate(overviewQuerySchema, { rangeDays });
    return getAnalyticsOverview(rangeDays);
  });

  router.get("/analytics/top-content", requirePermission("content:read"), async (ctx) => {
    const limit = parseNumber(ctx.query.limit) ?? 10;
    const type = ctx.query.type;
    validate(topContentQuerySchema, {
      limit,
      type: type ?? undefined,
    });
    return getTopContent(limit, type === "page" || type === "entry" ? type : undefined);
  });
}
