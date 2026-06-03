import { AdminQueryConventionError } from "../../services/admin/adminQueryConventions";
import { exportAuditLogs } from "../../services/audit/auditExport";
import { AuditExportError } from "../../services/audit/auditExportContract";
import { listAudit, normalizeAuditLogQuery } from "../../services/audit/auditService";
import { ApiError } from "../errorHandler";
import { auditExportRequestSchema, auditLogQuerySchema } from "../validation/auditSchemas";

export type RouteContext = {
  params: Record<string, string>;
  query: Record<string, string | undefined>;
  body: unknown;
  user?: { id: string };
  ip?: string;
  userAgent?: string;
  requestId?: string;
};

export type RouteHandler = (ctx: RouteContext) => Promise<unknown> | unknown;

export type Router = {
  get: (path: string, ...handlers: RouteHandler[]) => void;
  post: (path: string, ...handlers: RouteHandler[]) => void;
};

export type AuditRouteDeps = {
  requirePermission: (permission: string) => RouteHandler;
  validate: (schema: unknown, payload: unknown) => void;
  listAudit?: typeof listAudit;
  exportAuditLogs?: typeof exportAuditLogs;
};

const mapAuditExportValidationError = (error: ApiError) => {
  const details = Array.isArray(error.details) ? (error.details as Array<{ path?: string }>) : [];
  const columnFailure = details.some((detail) => detail.path?.startsWith("columns"));
  if (columnFailure) {
    return new ApiError(
      "audit_export_invalid_columns",
      "Audit export columns are invalid",
      400,
      error.details
    );
  }
  return new ApiError(
    "audit_export_invalid",
    "Audit export request is invalid",
    400,
    error.details
  );
};

export function mapAuditError(error: unknown, context: "query" | "export" = "query") {
  if (context === "export" && error instanceof AuditExportError) {
    return new ApiError(error.code, error.message, error.status, {
      field: error.field,
    });
  }
  if (
    context === "export" &&
    error instanceof ApiError &&
    (error.code === "permission_denied" || error.status === 403)
  ) {
    return new ApiError("audit_export_forbidden", "Audit export is forbidden", 403, error.details);
  }
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
    if (context === "export") return mapAuditExportValidationError(error);
    return new ApiError("audit_query_invalid", "Audit query is invalid", 400, error.details);
  }
  return null;
}

export const mapAuditQueryError = (error: unknown) => mapAuditError(error, "query");

export function registerAuditRoutes(router: Router, deps: AuditRouteDeps) {
  const { requirePermission, validate } = deps;
  const requireAuditRead = requirePermission("audit:read");
  const listAuditRecords = deps.listAudit ?? listAudit;
  const exportAuditRecords = deps.exportAuditLogs ?? exportAuditLogs;

  router.get("/audit", requireAuditRead, async (ctx) => {
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

  router.post(
    "/audit/export",
    async (ctx) => {
      try {
        await requireAuditRead(ctx);
      } catch (error) {
        const mapped = mapAuditError(error, "export");
        if (mapped) throw mapped;
        throw error;
      }
    },
    async (ctx) => {
      try {
        validate(auditExportRequestSchema, ctx.body);
        return await exportAuditRecords(ctx.body as Parameters<typeof exportAuditLogs>[0], {
          actorId: ctx.user?.id ?? null,
          requestId: ctx.requestId,
          ip: ctx.ip,
          userAgent: ctx.userAgent,
        });
      } catch (error) {
        const mapped = mapAuditError(error, "export");
        if (mapped) throw mapped;
        throw error;
      }
    }
  );
}
