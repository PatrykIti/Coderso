import { AdminQueryConventionError } from "../../services/admin/adminQueryConventions";
import { listAudit, normalizeAuditLogQuery } from "../../services/audit/auditService";
import { ApiError } from "../errorHandler";
import { auditLogQuerySchema } from "../validation/auditSchemas";

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

export type AuditRouteDeps = {
  requirePermission: (permission: string) => RouteHandler;
  validate: (schema: unknown, payload: unknown) => void;
  listAudit?: typeof listAudit;
};

export function mapAuditQueryError(error: unknown) {
  if (error instanceof AdminQueryConventionError) {
    if (error.code === "admin_query_cursor_invalid") {
      return new ApiError("audit_cursor_invalid", "Audit cursor is invalid", 400, {
        code: error.code,
        field: error.field,
      });
    }
    return new ApiError("audit_query_invalid", "Audit query is invalid", 400, {
      code: error.code,
      field: error.field,
    });
  }
  if (error instanceof ApiError && error.code === "validation_error") {
    return new ApiError("audit_query_invalid", "Audit query is invalid", 400, error.details);
  }
  return null;
}

export function registerAuditRoutes(router: Router, deps: AuditRouteDeps) {
  const { requirePermission, validate } = deps;
  const listAuditRecords = deps.listAudit ?? listAudit;

  router.get("/audit", requirePermission("audit:read"), async (ctx) => {
    try {
      validate(auditLogQuerySchema, ctx.query);
      const query = normalizeAuditLogQuery({
        limit: ctx.query.limit,
        query: ctx.query.q,
        category: ctx.query.category,
        severity: ctx.query.severity,
        from: ctx.query.from,
        to: ctx.query.to,
        cursor: ctx.query.cursor,
      });
      return await listAuditRecords(query);
    } catch (error) {
      const mapped = mapAuditQueryError(error);
      if (mapped) throw mapped;
      throw error;
    }
  });
}
