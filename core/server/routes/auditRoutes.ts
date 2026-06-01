import {
  AdminQueryConventionError,
  normalizeAdminQueryLimit,
} from "../../services/admin/adminQueryConventions";
import { listAudit } from "../../services/audit/auditService";
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
};

export function mapAuditQueryError(error: unknown) {
  if (error instanceof AdminQueryConventionError) {
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

  router.get("/audit", requirePermission("audit:read"), async (ctx) => {
    try {
      validate(auditLogQuerySchema, ctx.query);
      const limit = normalizeAdminQueryLimit(ctx.query.limit, {
        defaultLimit: 50,
        maxLimit: 200,
      });
      const items = await listAudit(limit);
      return { items };
    } catch (error) {
      const mapped = mapAuditQueryError(error);
      if (mapped) throw mapped;
      throw error;
    }
  });
}
