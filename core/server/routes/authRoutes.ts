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
import { getUserByEmail, updateLastLogin, updatePassword } from "../../services/auth/userService";
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
  consumeResetTokenWithStatus,
  createResetToken,
  invalidateResetTokensForUser,
} from "../../services/auth/passwordResetService";
import {
  assertSetPasswordEmailConfigured,
  sendSetPasswordEmail,
} from "../../services/auth/setPasswordEmailService";
import {
  getAdminPermissionSnapshot,
  type AdminPermissionSnapshot,
} from "../../services/auth/roleService";

export type AuthRouteDeps = {
  requireAuth: (ctx: RouteContext) => Promise<void> | void;
  validate: (schema: unknown, payload: unknown) => void;
  resolvePermissionSnapshot?: (userId: string) => Promise<AdminPermissionSnapshot>;
  consumeResetTokenWithStatus?: typeof consumeResetTokenWithStatus;
  createResetToken?: typeof createResetToken;
  invalidateResetTokensForUser?: typeof invalidateResetTokensForUser;
  assertSetPasswordEmailConfigured?: typeof assertSetPasswordEmailConfigured;
  sendSetPasswordEmail?: typeof sendSetPasswordEmail;
  hashPassword?: typeof hashPassword;
  updatePassword?: typeof updatePassword;
  revokeAllSessions?: typeof revokeAllSessions;
  logAudit?: typeof logAudit;
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

type CurrentAdminUser = PublicUser & {
  permissionSnapshot: AdminPermissionSnapshot;
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

const isStringArray = (value: unknown): value is string[] =>
  Array.isArray(value) && value.every((item) => typeof item === "string");

function assertPermissionSnapshot(value: unknown): asserts value is AdminPermissionSnapshot {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new ApiError(
      "auth_permission_snapshot_invalid",
      "Current user permission snapshot is invalid",
      500
    );
  }
  const snapshot = value as Partial<AdminPermissionSnapshot>;
  if (!isStringArray(snapshot.permissions) || !Array.isArray(snapshot.roles)) {
    throw new ApiError(
      "auth_permission_snapshot_invalid",
      "Current user permission snapshot is invalid",
      500
    );
  }
  for (const role of snapshot.roles) {
    if (
      !role ||
      typeof role !== "object" ||
      Array.isArray(role) ||
      typeof (role as AdminPermissionSnapshot["roles"][number]).id !== "string" ||
      typeof (role as AdminPermissionSnapshot["roles"][number]).slug !== "string" ||
      typeof (role as AdminPermissionSnapshot["roles"][number]).name !== "string"
    ) {
      throw new ApiError(
        "auth_permission_snapshot_invalid",
        "Current user permission snapshot is invalid",
        500
      );
    }
  }
}

function assertNoAuthMeQuery(query: RouteContext["query"]) {
  const unsupported = Object.entries(query ?? {}).filter(([, value]) => value !== undefined);
  if (unsupported.length === 0) return;
  throw new ApiError("auth_me_query_invalid", "Unsupported auth/me query parameter", 400, {
    fields: unsupported.map(([field]) => field),
  });
}

const mapPermissionSnapshotError = (error: unknown) => {
  if (error instanceof ApiError) return error;
  if (error instanceof Error && error.message === "forbidden") {
    return new ApiError(
      "auth_permission_snapshot_forbidden",
      "Current user permission snapshot is unavailable",
      403
    );
  }
  return new ApiError(
    "auth_permission_snapshot_invalid",
    "Current user permission snapshot is unavailable",
    500
  );
};

function toCurrentAdminUser(
  user: {
    id: string;
    email: string;
    emailEncrypted?: unknown;
    name?: string | null;
  },
  permissionSnapshot: AdminPermissionSnapshot
): CurrentAdminUser {
  return {
    ...toPublicUser(user),
    permissionSnapshot,
  };
}

export function registerAuthRoutes(router: Router, deps: AuthRouteDeps) {
  const { requireAuth, validate, resolvePermissionSnapshot = getAdminPermissionSnapshot } = deps;
  const consumeSetPasswordToken = deps.consumeResetTokenWithStatus ?? consumeResetTokenWithStatus;
  const createPasswordResetToken = deps.createResetToken ?? createResetToken;
  const invalidatePasswordResetTokens =
    deps.invalidateResetTokensForUser ?? invalidateResetTokensForUser;
  const assertPasswordEmailConfigured =
    deps.assertSetPasswordEmailConfigured ?? assertSetPasswordEmailConfigured;
  const deliverSetPasswordEmail = deps.sendSetPasswordEmail ?? sendSetPasswordEmail;
  const hashPasswordValue = deps.hashPassword ?? hashPassword;
  const updateUserPassword = deps.updatePassword ?? updatePassword;
  const revokeUserSessions = deps.revokeAllSessions ?? revokeAllSessions;
  const writeAudit = deps.logAudit ?? logAudit;

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
    await writeAudit({
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
      await writeAudit({
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
      await writeAudit({
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
    if (typeof ctx.user.email !== "string" || ctx.user.email.length === 0) {
      throw new ApiError("auth_user_invalid", "Current user payload is invalid", 500);
    }
    assertNoAuthMeQuery(ctx.query);
    try {
      const permissionSnapshot = await resolvePermissionSnapshot(ctx.user.id);
      assertPermissionSnapshot(permissionSnapshot);
      return {
        user: toCurrentAdminUser(
          {
            id: ctx.user.id,
            email: ctx.user.email,
            name: ctx.user.name ?? null,
          },
          permissionSnapshot
        ),
      };
    } catch (error) {
      throw mapPermissionSnapshotError(error);
    }
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

    try {
      await assertPasswordEmailConfigured();
    } catch (error) {
      if (error instanceof Error && error.message === "email_not_configured") {
        throw new ApiError("email_not_configured", "Email delivery is not configured", 400);
      }
      throw error;
    }

    const user = await getUserByEmail(body.email);
    if (!user) {
      return { ok: true };
    }

    const reset = await createPasswordResetToken(user.id);

    try {
      await deliverSetPasswordEmail({
        user: { email: resolveUserEmail(user), name: user.name ?? null },
        token: reset.token,
        expiresAt: reset.expiresAt,
        reason: "reset",
      });
    } catch (error) {
      await invalidatePasswordResetTokens(user.id).catch(() => undefined);
      if (error instanceof Error && error.message === "email_send_failed") {
        throw new ApiError("email_send_failed", "Reset email could not be sent", 400);
      }
      if (error instanceof Error && error.message === "email_not_configured") {
        throw new ApiError("email_not_configured", "Email delivery is not configured", 400);
      }
      throw error;
    }

    await writeAudit({
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

    const reset = await consumeSetPasswordToken(body.token);
    if (!reset.ok) {
      throw new ApiError(reset.code, "Set-password token is invalid or expired", 400);
    }

    const passwordHash = await hashPasswordValue(body.password);
    const updated = await updateUserPassword(reset.reset.userId, {
      passwordHash,
      activatePending: true,
    });
    if (!updated) {
      throw new ApiError("set_password_user_not_found", "Set-password user not found", 404);
    }
    await revokeUserSessions(reset.reset.userId);

    await writeAudit({
      actorId: reset.reset.userId,
      action: "auth.reset.confirm",
      targetType: "user",
      targetId: reset.reset.userId,
      ip: ctx.ip,
      userAgent: ctx.userAgent,
    });

    return { ok: true };
  });
}
