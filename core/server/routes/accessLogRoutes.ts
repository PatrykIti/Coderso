import { AdminQueryConventionError } from "../../services/admin/adminQueryConventions";
import { listAccessLogs, normalizeAccessLogQuery } from "../../services/access/accessLogService";
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
  listAccessLogs?: typeof listAccessLogs;
};

export function mapAccessLogQueryError(error: unknown) {
  if (error instanceof AdminQueryConventionError) {
    if (error.code === "admin_query_cursor_invalid") {
      return new ApiError("access_log_cursor_invalid", "Access log cursor is invalid", 400, {
        code: error.code,
        field: error.field,
      });
    }
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
  const listAccessLogRecords = deps.listAccessLogs ?? listAccessLogs;

  router.get("/access-logs", requirePermission("audit:read"), async (ctx) => {
    try {
      validate(accessLogQuerySchema, ctx.query);
      const query = normalizeAccessLogQuery({
        limit: ctx.query.limit,
        status: ctx.query.status,
        query: ctx.query.q,
        userId: ctx.query.userId,
        method: ctx.query.method,
        ip: ctx.query.ip,
        from: ctx.query.from,
        to: ctx.query.to,
        cursor: ctx.query.cursor,
      });
      return await listAccessLogRecords(query);
    } catch (error) {
      const mapped = mapAccessLogQueryError(error);
      if (mapped) throw mapped;
      throw error;
    }
  });
}
