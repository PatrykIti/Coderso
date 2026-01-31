import {
  listActiveSessions,
  revokeAllForUser,
  revokeSession,
} from "../../services/admin/sessionAdminService";
import { logAudit } from "../../services/audit/auditService";
import { sessionRevokeAllSchema } from "../validation/sessionAdminSchemas";

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

export type SessionRouteDeps = {
  requirePermission: (permission: string) => RouteHandler;
  validate: (schema: unknown, payload: unknown) => void;
};

export function registerSessionAdminRoutes(router: Router, deps: SessionRouteDeps) {
  const { requirePermission, validate } = deps;

  router.get("/sessions", requirePermission("settings:read"), async (ctx) => {
    const userId = ctx.query.userId ?? ctx.user?.id;
    if (!userId) throw new Error("user_required");

    const items = await listActiveSessions(userId);
    return {
      items: items.map((session) => ({
        ...session,
        current: session.id === ctx.sessionId,
      })),
    };
  });

  router.post(
    "/sessions/:id/revoke",
    requirePermission("settings:write"),
    async (ctx) => {
      const revoked = await revokeSession(ctx.params.id);
      if (!revoked) throw new Error("session_not_found");
      await logAudit({
        actorId: ctx.user?.id ?? null,
        action: "sessions.revoke",
        targetType: "session",
        targetId: ctx.params.id,
        metadata: {},
        ip: ctx.ip,
        userAgent: ctx.userAgent,
      });
      return { ok: true };
    }
  );

  router.post(
    "/sessions/revoke-all",
    requirePermission("settings:write"),
    async (ctx) => {
      validate(sessionRevokeAllSchema, ctx.body ?? {});
      const body = (ctx.body ?? {}) as { userId?: string };
      const userId = body.userId ?? ctx.user?.id;
      if (!userId) throw new Error("user_required");
      const revokedCount = await revokeAllForUser(userId, ctx.sessionId);
      await logAudit({
        actorId: ctx.user?.id ?? null,
        action: "sessions.revoke_all",
        targetType: "user",
        targetId: userId,
        metadata: { revokedCount },
        ip: ctx.ip,
        userAgent: ctx.userAgent,
      });
      return { ok: true, revokedCount };
    }
  );
}
