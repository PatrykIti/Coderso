import { ApiError } from "../errorHandler";
import { type Router, type RouteContext } from "../router";
import {
  buildSessionCookieOptions,
  createSession,
  revokeSessionByToken,
  SESSION_COOKIE_NAME,
} from "../../services/auth/sessionService";
import { getUserByEmail, updateLastLogin } from "../../services/auth/userService";
import { verifyPassword } from "../../services/auth/password";
import { logAudit } from "../../services/audit/auditService";
import { authLoginSchema } from "../validation/authSchemas";

export type AuthRouteDeps = {
  requireAuth: (ctx: RouteContext) => Promise<void> | void;
  validate: (schema: unknown, payload: unknown) => void;
};

type LoginBody = { email: string; password: string };

type PublicUser = {
  id: string;
  email: string;
  name?: string | null;
};

function toPublicUser(user: {
  id: string;
  email: string;
  name?: string | null;
}): PublicUser {
  return { id: user.id, email: user.email, name: user.name ?? null };
}

export function registerAuthRoutes(router: Router, deps: AuthRouteDeps) {
  const { requireAuth, validate } = deps;

  router.post("/auth/login", async (ctx) => {
    validate(authLoginSchema, ctx.body);
    const body = ctx.body as LoginBody;

    const user = await getUserByEmail(body.email);
    if (!user || user.status !== "active") {
      throw new ApiError("auth_failed", "Invalid credentials", 401);
    }

    const ok = await verifyPassword(user.passwordHash, body.password);
    if (!ok) {
      throw new ApiError("auth_failed", "Invalid credentials", 401);
    }

    const { token, session } = await createSession({
      userId: user.id,
      ip: ctx.ip,
      userAgent: ctx.userAgent,
    });

    ctx.setCookie?.(
      SESSION_COOKIE_NAME,
      token,
      buildSessionCookieOptions()
    );

    await updateLastLogin(user.id);
    await logAudit({
      actorId: user.id,
      action: "auth.login",
      targetType: "user",
      targetId: user.id,
      metadata: { email: user.email },
      ip: ctx.ip,
      userAgent: ctx.userAgent,
    });

    return {
      user: toPublicUser(user),
      session: { expiresAt: session.expiresAt },
    };
  });

  router.post("/auth/logout", requireAuth, async (ctx) => {
    const token = ctx.cookies?.[SESSION_COOKIE_NAME];
    if (token) {
      await revokeSessionByToken(token);
    }
    ctx.clearCookie?.(SESSION_COOKIE_NAME);
    if (ctx.user?.id) {
      await logAudit({
        actorId: ctx.user.id,
        action: "auth.logout",
        targetType: "user",
        targetId: ctx.user.id,
        ip: ctx.ip,
        userAgent: ctx.userAgent,
      });
    }
    return { ok: true };
  });

  router.get("/auth/me", requireAuth, async (ctx) => {
    if (!ctx.user) throw new ApiError("auth_required", "Not authenticated", 401);
    return { user: ctx.user };
  });
}
