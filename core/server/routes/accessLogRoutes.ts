import { AdminQueryConventionError } from "../../services/admin/adminQueryConventions";
import {
  AccessLogDomainError,
  listAccessLogs,
  normalizeAccessLogQuery,
  revokeAccessLogSession,
} from "../../services/access/accessLogService";
import { logAudit } from "../../services/audit/auditService";
import { getUserPermissions, hasPermission } from "../../services/auth/roleService";
import { ApiError } from "../errorHandler";
import {
  accessLogQuerySchema,
  accessLogRevokeParamsSchema,
  accessLogRevokeSchema,
} from "../validation/accessLogSchemas";

export type RouteContext = {
  params: Record<string, string>;
  query: Record<string, string | undefined>;
  body: unknown;
  user?: { id: string };
  sessionId?: string;
  ip?: string;
  userAgent?: string;
};

export type RouteHandler = (ctx: RouteContext) => Promise<unknown> | unknown;

export type Router = {
  get: (path: string, ...handlers: RouteHandler[]) => void;
  post: (path: string, ...handlers: RouteHandler[]) => void;
};

export type AccessLogRouteDeps = {
  requirePermission: (permission: string) => RouteHandler;
  validate: (schema: unknown, payload: unknown) => void;
  listAccessLogs?: typeof listAccessLogs;
  revokeAccessLogSession?: typeof revokeAccessLogSession;
  logAudit?: typeof logAudit;
  resolvePermissions?: (ctx: RouteContext) => Promise<string[]> | string[];
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

export function mapAccessLogMutationError(error: unknown) {
  if (error instanceof AccessLogDomainError) {
    const status =
      error.code === "access_log_not_found" || error.code === "access_log_session_not_found"
        ? 404
        : error.code === "access_log_revoke_invalid"
          ? 400
          : 409;
    return new ApiError(error.code, error.message, status);
  }
  if (error instanceof ApiError && error.code === "validation_error") {
    return new ApiError(
      "access_log_revoke_invalid",
      "Access log revoke request is invalid",
      400,
      error.details
    );
  }
  return null;
}

const resolveDefaultPermissions = async (ctx: RouteContext) => {
  if (!ctx.user?.id) return [];
  return getUserPermissions(ctx.user.id);
};

export function registerAccessLogRoutes(router: Router, deps: AccessLogRouteDeps) {
  const { requirePermission, validate } = deps;
  const listAccessLogRecords = deps.listAccessLogs ?? listAccessLogs;
  const revokeAccessLog = deps.revokeAccessLogSession ?? revokeAccessLogSession;
  const auditLogger = deps.logAudit ?? logAudit;
  const resolvePermissions = deps.resolvePermissions ?? resolveDefaultPermissions;

  router.get("/access-logs", requirePermission("audit:read"), async (ctx) => {
    try {
      validate(accessLogQuerySchema, ctx.query);
      const permissions = await resolvePermissions(ctx);
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
      return await listAccessLogRecords(query, {
        currentSessionId: ctx.sessionId ?? null,
        canViewSession: hasPermission(permissions, "settings:read"),
        canRevokeSession: hasPermission(permissions, "settings:write"),
      });
    } catch (error) {
      const mapped = mapAccessLogQueryError(error);
      if (mapped) throw mapped;
      throw error;
    }
  });

  router.post("/access-logs/:id/revoke", requirePermission("settings:write"), async (ctx) => {
    try {
      validate(accessLogRevokeParamsSchema, ctx.params);
      validate(accessLogRevokeSchema, ctx.body ?? {});
      const body = ctx.body as { reason: "admin_manual_revoke" };
      const result = await revokeAccessLog({
        accessLogId: ctx.params.id,
        currentSessionId: ctx.sessionId ?? null,
        reason: body.reason,
      });
      await auditLogger({
        actorId: ctx.user?.id ?? null,
        action: "access_logs.revoke_session",
        targetType: "access_log",
        targetId: result.accessLogId,
        metadata: {
          accessLogRef: result.accessLogId,
          revokedSessionRef: result.revokedSessionRef,
          targetUserRef: result.targetUserRef,
          reason: body.reason,
          result: result.alreadyRevoked ? "already_revoked" : "revoked",
        },
        ip: ctx.ip,
        userAgent: ctx.userAgent,
      });
      return result;
    } catch (error) {
      const mapped = mapAccessLogMutationError(error);
      if (mapped) throw mapped;
      throw error;
    }
  });
}
