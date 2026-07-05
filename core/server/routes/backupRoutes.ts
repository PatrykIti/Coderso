import { logAudit } from "../../services/audit/auditService";
import {
  createBackup,
  deleteBackup,
  getBackupById,
  getBackupSchedule,
  getBackupStorageUsage,
  listBackups,
  normalizeBackupInclude,
  pruneExpiredBackups,
  resolveBackupDownload,
  restoreBackup,
  setBackupSchedule,
} from "../../services/backups/backupService";
import type {
  BackupCreateInput,
  BackupKind,
  BackupListQuery,
  BackupScheduleUpdate,
} from "../../services/backups/backupTypes";
import { ApiError } from "../errorHandler";
import {
  backupListQuerySchema,
  createBackupSchema,
  pruneBackupsSchema,
  restoreBackupSchema,
  scheduleUpdateSchema,
} from "../validation/backupSchemas";

export type RouteContext = {
  params: Record<string, string>;
  query: Record<string, string | undefined>;
  body: unknown;
  user?: { id: string };
  ip?: string;
  userAgent?: string;
};

export type RouteHandler = (ctx: RouteContext) => Promise<unknown> | unknown;

export type Router = {
  get: (path: string, ...handlers: RouteHandler[]) => void;
  post: (path: string, ...handlers: RouteHandler[]) => void;
  patch: (path: string, ...handlers: RouteHandler[]) => void;
  delete: (path: string, ...handlers: RouteHandler[]) => void;
};

export type BackupRouteDeps = {
  requirePermission: (permission: string) => RouteHandler;
  validate: (schema: unknown, payload: unknown) => void;
};

type CreateBackupBody = {
  kind?: BackupKind;
  include?: BackupCreateInput["include"];
};

const backupListQueryKeys = new Set(["page", "limit", "query"]);

const validationError = (path: string, message: string, keyword: string) =>
  new ApiError("validation_error", "Invalid payload", 400, [{ path, message, keyword }]);

const assertKnownQuery = (query: Record<string, string | undefined>, allowed: Set<string>) => {
  const unknown = Object.keys(query).find((key) => query[key] !== undefined && !allowed.has(key));
  if (unknown) {
    throw validationError(unknown, "must NOT have additional properties", "additionalProperties");
  }
};

const parseInteger = (query: Record<string, string | undefined>, key: string, fallback: number) => {
  const value = query[key];
  if (value === undefined || value === "") return fallback;
  const parsed = Number(value);
  if (!Number.isInteger(parsed)) {
    throw validationError(key, "must be an integer", "type");
  }
  return parsed;
};

export const mapBackupError = (error: unknown) => {
  if (error instanceof ApiError) return error;
  const code = error instanceof Error ? error.message : String(error);
  switch (code) {
    case "backup_not_found":
      return new ApiError("backup_not_found", "Backup not found.", 404);
    case "backup_not_ready":
      return new ApiError("backup_not_ready", "Backup is not ready for this action.", 409);
    case "backup_restore_confirmation_required":
      return new ApiError(
        "backup_restore_confirmation_required",
        "Restore requires an explicit confirmation.",
        400
      );
    case "backup_restore_invalid_artifact":
      return new ApiError(
        "backup_restore_invalid_artifact",
        "Backup artifact is missing or malformed.",
        422
      );
    case "backup_artifact_unreadable":
      return new ApiError("backup_artifact_unreadable", "Backup artifact could not be read.", 502);
    // Restore no longer throws this — the service now performs a real restore.
    // Kept mapped for back-compat with older stored errors / API consumers.
    case "backup_restore_unsupported":
      return new ApiError(
        "backup_restore_unsupported",
        "Backup restore is not available for CMS-managed backup files yet.",
        409
      );
    case "backup_artifact_invalid":
      return new ApiError("backup_artifact_invalid", "Backup artifact is not downloadable.", 400);
    case "backup_include_required":
      return new ApiError("backup_include_required", "Select at least one backup section.", 400);
    case "backup_include_invalid":
      return new ApiError("backup_include_invalid", "Backup include options are invalid.", 400);
    case "backup_schedule_invalid":
      return new ApiError("backup_schedule_invalid", "Backup schedule is invalid.", 400);
    case "backup_schedule_not_found":
      return new ApiError("backup_schedule_not_found", "Backup schedule not found.", 404);
    default:
      return null;
  }
};

const withBackupErrors = async <T>(fn: () => Promise<T>) => {
  try {
    return await fn();
  } catch (error) {
    const mapped = mapBackupError(error);
    if (mapped) throw mapped;
    throw error;
  }
};

export function registerBackupRoutes(router: Router, deps: BackupRouteDeps) {
  const { requirePermission, validate } = deps;

  router.get("/backups", requirePermission("backups:read"), async (ctx) => {
    return withBackupErrors(async () => {
      assertKnownQuery(ctx.query, backupListQueryKeys);
      const page = parseInteger(ctx.query, "page", 1);
      const limit = parseInteger(ctx.query, "limit", 10);
      const query = ctx.query.query?.trim() || undefined;
      const payload: BackupListQuery = { page, limit, query };
      validate(backupListQuerySchema, payload);
      return listBackups(payload);
    });
  });

  router.post("/backups", requirePermission("backups:write"), async (ctx) => {
    return withBackupErrors(async () => {
      validate(createBackupSchema, ctx.body ?? {});
      const body = (ctx.body ?? {}) as CreateBackupBody;
      const kind = body.kind === "scheduled" ? "scheduled" : "manual";
      const include = normalizeBackupInclude(body.include);
      const backup = await createBackup({ kind, include });
      await logAudit({
        actorId: ctx.user?.id ?? null,
        action: "backups.create",
        targetType: "backup",
        targetId: backup.id,
        metadata: { kind, include },
        ip: ctx.ip,
        userAgent: ctx.userAgent,
      });
      return backup;
    });
  });

  router.post("/backups/:id/restore", requirePermission("backups:write"), async (ctx) => {
    return withBackupErrors(async () => {
      validate(restoreBackupSchema, ctx.body ?? {});
      const body = (ctx.body ?? {}) as { confirm?: boolean };
      const backup = await restoreBackup(ctx.params.id, { confirm: body.confirm === true });
      await logAudit({
        actorId: ctx.user?.id ?? null,
        action: "backups.restore",
        targetType: "backup",
        targetId: backup.id,
        metadata: { status: backup.status },
        ip: ctx.ip,
        userAgent: ctx.userAgent,
      });
      return backup;
    });
  });

  router.get("/backups/:id/download", requirePermission("backups:read"), async (ctx) => {
    return withBackupErrors(async () => resolveBackupDownload(ctx.params.id));
  });

  router.delete("/backups/:id", requirePermission("backups:write"), async (ctx) => {
    return withBackupErrors(async () => {
      const existing = await getBackupById(ctx.params.id);
      if (!existing) throw new Error("backup_not_found");
      const result = await deleteBackup(ctx.params.id);
      await logAudit({
        actorId: ctx.user?.id ?? null,
        action: "backups.delete",
        targetType: "backup",
        targetId: result.id,
        metadata: { status: existing.status, kind: existing.kind },
        ip: ctx.ip,
        userAgent: ctx.userAgent,
      });
      return result;
    });
  });

  router.post("/backups/prune", requirePermission("backups:write"), async (ctx) => {
    return withBackupErrors(async () => {
      validate(pruneBackupsSchema, ctx.body ?? {});
      const schedule = await getBackupSchedule();
      const result = await pruneExpiredBackups(schedule.retentionDays); // server-owned window
      await logAudit({
        actorId: ctx.user?.id ?? null,
        action: "backups.prune",
        targetType: "backup",
        targetId: "retention", // sentinel: target-less admin write (AuditEvent.targetId is required)
        metadata: { prunedCount: result.prunedCount, retentionDays: schedule.retentionDays },
        ip: ctx.ip,
        userAgent: ctx.userAgent,
      });
      return result;
    });
  });

  router.get("/backups/usage", requirePermission("backups:read"), async () =>
    withBackupErrors(async () => getBackupStorageUsage())
  );

  router.get("/backups/schedule", requirePermission("backups:read"), async () =>
    getBackupSchedule()
  );

  router.patch("/backups/schedule", requirePermission("backups:write"), async (ctx) => {
    return withBackupErrors(async () => {
      validate(scheduleUpdateSchema, ctx.body ?? {});
      const payload = (ctx.body ?? {}) as BackupScheduleUpdate;
      const updated = await setBackupSchedule(payload);
      await logAudit({
        actorId: ctx.user?.id ?? null,
        action: "backups.schedule.update",
        targetType: "backup_schedule",
        targetId: updated.id,
        metadata: { keys: Object.keys(payload) },
        ip: ctx.ip,
        userAgent: ctx.userAgent,
      });
      return updated;
    });
  });
}
