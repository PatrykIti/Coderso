import { logAudit } from "../../services/audit/auditService";
import {
  createBackup,
  getBackupById,
  getBackupSchedule,
  listBackups,
  restoreBackup,
  setBackupSchedule,
} from "../../services/backups/backupService";
import type { BackupKind, BackupScheduleUpdate } from "../../services/backups/backupTypes";
import { createBackupSchema, scheduleUpdateSchema } from "../validation/backupSchemas";

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
};

export type BackupRouteDeps = {
  requirePermission: (permission: string) => RouteHandler;
  validate: (schema: unknown, payload: unknown) => void;
};

type CreateBackupBody = {
  kind?: BackupKind;
};

export function registerBackupRoutes(router: Router, deps: BackupRouteDeps) {
  const { requirePermission, validate } = deps;

  router.get("/backups", requirePermission("backups:read"), async () => {
    const items = await listBackups();
    return { items };
  });

  router.post("/backups", requirePermission("backups:write"), async (ctx) => {
    validate(createBackupSchema, ctx.body ?? {});
    const body = (ctx.body ?? {}) as CreateBackupBody;
    const kind = body.kind === "scheduled" ? "scheduled" : "manual";
    const backup = await createBackup(kind);
    await logAudit({
      actorId: ctx.user?.id ?? null,
      action: "backups.create",
      targetType: "backup",
      targetId: backup.id,
      metadata: { kind },
      ip: ctx.ip,
      userAgent: ctx.userAgent,
    });
    return backup;
  });

  router.post(
    "/backups/:id/restore",
    requirePermission("backups:write"),
    async (ctx) => {
      const backup = await restoreBackup(ctx.params.id);
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
    }
  );

  router.get(
    "/backups/:id/download",
    requirePermission("backups:read"),
    async (ctx) => {
      const backup = await getBackupById(ctx.params.id);
      if (!backup) throw new Error("backup_not_found");
      return {
        url: backup.artifactPath,
        path: backup.artifactPath,
      };
    }
  );

  router.get(
    "/backups/schedule",
    requirePermission("backups:read"),
    async () => getBackupSchedule()
  );

  router.patch(
    "/backups/schedule",
    requirePermission("backups:write"),
    async (ctx) => {
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
    }
  );
}
