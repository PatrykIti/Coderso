import { ApiError } from "../errorHandler";
import { logAudit } from "../../services/audit/auditService";
import {
  getEmailSettings,
  listDeliveryLogs,
  sendTestEmail,
  updateEmailSettings,
  type EmailSettingsUpdate,
} from "../../services/email/emailSettingsService";
import { emailSettingsSchema, emailTestSchema } from "../validation/emailSchemas";

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
  put: (path: string, ...handlers: RouteHandler[]) => void;
  post: (path: string, ...handlers: RouteHandler[]) => void;
};

export type EmailRouteDeps = {
  requirePermission: (permission: string) => RouteHandler;
  validate: (schema: unknown, payload: unknown) => void;
};

export function mapEmailSettingsError(error: unknown): ApiError | null {
  if (!(error instanceof Error)) return null;
  if (error.message === "secret_master_key_invalid") {
    return new ApiError("secret_master_key_invalid", "Secret master key invalid", 400);
  }
  if (error.message === "email_settings_invalid") {
    return new ApiError("email_settings_invalid", "Invalid email settings", 400);
  }
  if (error.message === "email_not_configured") {
    return new ApiError("email_not_configured", "Email is not configured", 400);
  }
  if (error.message === "email_recipient_invalid") {
    return new ApiError("email_recipient_invalid", "Recipient invalid", 400);
  }
  if (error.message === "email_send_failed") {
    return new ApiError("email_send_failed", "Test email failed", 400);
  }
  return null;
}

export function registerEmailSettingsRoutes(router: Router, deps: EmailRouteDeps) {
  const { requirePermission, validate } = deps;

  router.get("/settings/email", requirePermission("settings:read"), async () => {
    return getEmailSettings();
  });

  router.put("/settings/email", requirePermission("settings:write"), async (ctx) => {
    validate(emailSettingsSchema, ctx.body ?? {});
    try {
      const updated = await updateEmailSettings(ctx.body as EmailSettingsUpdate);
      await logAudit({
        actorId: ctx.user?.id ?? null,
        action: "email.settings.update",
        targetType: "email_settings",
        targetId: updated.provider,
        metadata: {
          provider: updated.provider,
          keys: Object.keys(ctx.body ?? {}),
        },
        ip: ctx.ip,
        userAgent: ctx.userAgent,
      });
      return updated;
    } catch (error) {
      const apiError = mapEmailSettingsError(error);
      if (apiError) throw apiError;
      throw error;
    }
  });

  router.post("/settings/email/test", requirePermission("settings:write"), async (ctx) => {
    validate(emailTestSchema, ctx.body ?? {});
    const body = ctx.body as { to: string };
    try {
      const settings = await getEmailSettings();
      await sendTestEmail(body.to);
      await logAudit({
        actorId: ctx.user?.id ?? null,
        action: "email.test",
        targetType: "email_settings",
        targetId: settings.provider,
        metadata: { provider: settings.provider, to: body.to },
        ip: ctx.ip,
        userAgent: ctx.userAgent,
      });
      return { ok: true };
    } catch (error) {
      const apiError = mapEmailSettingsError(error);
      if (apiError) throw apiError;
      throw error;
    }
  });

  router.get("/settings/email/logs", requirePermission("settings:read"), async () => {
    const items = await listDeliveryLogs();
    return { items };
  });
}
