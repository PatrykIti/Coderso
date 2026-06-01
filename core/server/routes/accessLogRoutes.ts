import {
  AdminQueryConventionError,
  normalizeAdminDateRange,
  normalizeAdminQueryLimit,
  normalizeAdminSearchQuery,
} from "../../services/admin/adminQueryConventions";
import { listAccessLogs } from "../../services/access/accessLogService";
import { ApiError } from "../errorHandler";
import { accessLogQuerySchema } from "../validation/accessLogSchemas";

export type RouteContext = {
  params: Record<string, string>;
  query: Record<string, string | undefined>;
  body: unknown;
  user?: { id: string };
};

export type RouteHandler = (ctx: RouteContext) => Promise<unknown> | unknown;

export type Router = {
  get: (path: string, ...handlers: RouteHandler[]) => void;
};

export type AccessLogRouteDeps = {
  requirePermission: (permission: string) => RouteHandler;
  validate: (schema: unknown, payload: unknown) => void;
};

export function mapAccessLogQueryError(error: unknown) {
  if (error instanceof AdminQueryConventionError) {
    return new ApiError("access_log_query_invalid", "Access log query is invalid", 400, {
      code: error.code,
      field: error.field,
    });
  }
  if (error instanceof ApiError && error.code === "validation_error") {
    return new ApiError(
      "access_log_query_invalid",
      "Access log query is invalid",
      400,
      error.details
    );
  }
  return null;
}

export function registerAccessLogRoutes(router: Router, deps: AccessLogRouteDeps) {
  const { requirePermission, validate } = deps;

  router.get("/access-logs", requirePermission("audit:read"), async (ctx) => {
    try {
      validate(accessLogQuerySchema, ctx.query);
      const limit = normalizeAdminQueryLimit(ctx.query.limit, {
        defaultLimit: 100,
        maxLimit: 200,
      });
      const query = normalizeAdminSearchQuery(ctx.query.q);
      const { from, to } = normalizeAdminDateRange({
        from: ctx.query.from,
        to: ctx.query.to,
      });

      const items = await listAccessLogs({
        limit,
        status:
          ctx.query.status === "success" || ctx.query.status === "failed"
            ? ctx.query.status
            : undefined,
        query,
        userId: ctx.query.userId ?? undefined,
        from,
        to,
      });

      return { items };
    } catch (error) {
      const mapped = mapAccessLogQueryError(error);
      if (mapped) throw mapped;
      throw error;
    }
  });
}
