import { ApiError } from "../errorHandler";
import { type Router, type RouteContext } from "../router";
import {
  buildSessionCookieOptions,
  createCsrfToken,
  createSession,
  evaluateLoginAlert,
  getLastSessionFingerprint,
  revokeAllSessions,
  revokeSessionByToken,
  SESSION_COOKIE_NAME,
  setCsrfToken,
} from "../../services/auth/sessionService";
import {
  getUserByEmail,
  updateLastLogin,
  updatePassword,
} from "../../services/auth/userService";
import { resolveEmailValue } from "../../services/security/piiEmail";
import { hashPassword, verifyPassword } from "../../services/auth/password";
import { enforceBotProtection } from "../../services/security/botProtection";
import { logAudit } from "../../services/audit/auditService";
import { getSecuritySettings } from "../../services/settings/securitySettings";
import {
  authLoginSchema,
  authResetConfirmSchema,
  authResetSchema,
  authVerifyOtpSchema,
} from "../validation/authSchemas";
import {
  consumeResetToken,
  createResetToken,
} from "../../services/auth/passwordResetService";

export type AuthRouteDeps = {
  requireAuth: (ctx: RouteContext) => Promise<void> | void;
  validate: (schema: unknown, payload: unknown) => void;
};

type LoginBody = { email: string; password: string; captchaToken?: string };
type OtpBody = { code?: string; recoveryCode?: string };
type ResetBody = { email: string; captchaToken?: string };
type ResetConfirmBody = { token: string; password: string };

type PublicUser = {
  id: string;
  email: string;
  name?: string | null;
};

const resolveUserEmail = (user: { email: string; emailEncrypted?: unknown }) =>
  resolveEmailValue({
    emailEncrypted: user.emailEncrypted,
    email: user.email,
  }) ?? user.email;

function toPublicUser(user: {
  id: string;
  email: string;
  emailEncrypted?: unknown;
  name?: string | null;
}): PublicUser {
  return { id: user.id, email: resolveUserEmail(user), name: user.name ?? null };
}

export function registerAuthRoutes(router: Router, deps: AuthRouteDeps) {
  const { requireAuth, validate } = deps;

  router.get("/auth/bot-protection", async () => {
    const settings = await getSecuritySettings();
    return {
      enabled: settings.botProtection.enabled,
      provider: settings.botProtection.provider,
      siteKey: settings.botProtection.siteKey,
      enforceOnLocalhost: settings.botProtection.enforceOnLocalhost,
    };
  });

  router.post("/auth/login", async (ctx) => {
    validate(authLoginSchema, ctx.body);
    const body = ctx.body as LoginBody;

    const securitySettings = await getSecuritySettings();
    await enforceBotProtection({
      token: body.captchaToken,
      action: "login",
      ip: ctx.ip,
      settings: securitySettings.botProtection,
    });

    const user = await getUserByEmail(body.email);
    if (!user || user.status !== "active") {
      throw new ApiError("auth_failed", "Invalid credentials", 401);
    }

    const ok = await verifyPassword(user.passwordHash, body.password);
    if (!ok) {
      throw new ApiError("auth_failed", "Invalid credentials", 401);
    }

    const lastFingerprint = await getLastSessionFingerprint(user.id);
    const alertFlags = evaluateLoginAlert(lastFingerprint, {
      ip: ctx.ip ?? null,
      userAgent: ctx.userAgent ?? null,
    });

    const { token, session, ttlDays } = await createSession({
      userId: user.id,
      ip: ctx.ip,
      userAgent: ctx.userAgent,
    });

    ctx.setCookie?.(SESSION_COOKIE_NAME, token, buildSessionCookieOptions(ttlDays));

    await updateLastLogin(user.id);
    await logAudit({
      actorId: user.id,
      action: "auth.login",
      targetType: "user",
      targetId: user.id,
      metadata: { email: resolveUserEmail(user) },
      ip: ctx.ip,
      userAgent: ctx.userAgent,
    });

    const shouldAlert =
      securitySettings.loginAlerts.enabled &&
      ((securitySettings.loginAlerts.notifyOnNewDevice && alertFlags.newDevice) ||
        (securitySettings.loginAlerts.notifyOnNewLocation && alertFlags.newLocation));

    if (shouldAlert) {
      await logAudit({
        actorId: user.id,
        action: "auth.login.alert",
        targetType: "user",
        targetId: user.id,
        metadata: {
          newDevice: alertFlags.newDevice,
          newLocation: alertFlags.newLocation,
          lastIp: lastFingerprint?.ip ?? null,
          lastUserAgent: lastFingerprint?.userAgent ?? null,
        },
        ip: ctx.ip,
        userAgent: ctx.userAgent,
      });
    }

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

  router.get("/auth/csrf", requireAuth, async (ctx) => {
    if (!ctx.sessionId) {
      throw new ApiError("auth_required", "Not authenticated", 401);
    }
    const { token, tokenHash } = createCsrfToken();
    await setCsrfToken(ctx.sessionId, tokenHash);
    return { token };
  });

  router.post("/auth/verify-otp", requireAuth, async (ctx) => {
    validate(authVerifyOtpSchema, ctx.body);
    const body = ctx.body as OtpBody;

    if (body.recoveryCode) {
      throw new ApiError("mfa_not_configured", "MFA not enabled", 400);
    }

    if (body.code) {
      throw new ApiError("mfa_not_configured", "MFA not enabled", 400);
    }

    throw new ApiError("validation_error", "Invalid payload", 400);
  });

  router.post("/auth/reset", async (ctx) => {
    validate(authResetSchema, ctx.body);
    const body = ctx.body as ResetBody;

    const securitySettings = await getSecuritySettings();
    await enforceBotProtection({
      token: body.captchaToken,
      action: "reset",
      ip: ctx.ip,
      settings: securitySettings.botProtection,
    });

    const user = await getUserByEmail(body.email);
    if (!user) {
      return { ok: true };
    }

    await createResetToken(user.id);

    await logAudit({
      actorId: null,
      action: "auth.reset.request",
      targetType: "user",
      targetId: user.id,
      metadata: { email: resolveUserEmail(user) },
      ip: ctx.ip,
      userAgent: ctx.userAgent,
    });

    return { ok: true };
  });

  router.post("/auth/reset/confirm", async (ctx) => {
    validate(authResetConfirmSchema, ctx.body);
    const body = ctx.body as ResetConfirmBody;

    const reset = await consumeResetToken(body.token);
    if (!reset) {
      throw new ApiError("reset_invalid", "Reset token invalid or expired", 400);
    }

    const passwordHash = await hashPassword(body.password);
    await updatePassword(reset.userId, passwordHash);
    await revokeAllSessions(reset.userId);

    await logAudit({
      actorId: reset.userId,
      action: "auth.reset.confirm",
      targetType: "user",
      targetId: reset.userId,
      ip: ctx.ip,
      userAgent: ctx.userAgent,
    });

    return { ok: true };
  });
}
