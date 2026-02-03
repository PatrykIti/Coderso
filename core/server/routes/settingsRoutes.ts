import {
  getSetting,
  listSettings,
  setSetting,
  setSettings,
} from "../../services/settings/settingsService";
import { ApiError } from "../errorHandler";
import {
  getStorageSettings,
  setStorageSettings,
  type StorageSettingsUpdate,
} from "../../services/settings/storageSettings";
import {
  getSecuritySettings,
  setSecuritySettings,
  type SecuritySettingsUpdate,
} from "../../services/settings/securitySettings";
import { getResolvedTokens } from "../../services/theme/tokenService";
import { logAudit } from "../../services/audit/auditService";
import {
  securitySettingsSchema,
  settingsBulkSchema,
  settingsUpdateSchema,
  storageSettingsSchema,
} from "../validation/settingsSchemas";

export type RouteContext = {
  params: Record<string, string>;
  query: Record<string, string | undefined>;
  body: unknown;
  user?: { id: string };
};

export type RouteHandler = (ctx: RouteContext) => Promise<unknown> | unknown;

export type Router = {
  get: (path: string, ...handlers: RouteHandler[]) => void;
  patch: (path: string, ...handlers: RouteHandler[]) => void;
};

export type SettingsRouteDeps = {
  requirePermission: (permission: string) => RouteHandler;
  validate: (schema: unknown, payload: unknown) => void;
};

export function registerSettingsRoutes(router: Router, deps: SettingsRouteDeps) {
  const { requirePermission, validate } = deps;

  const mapSettingsError = (error: unknown) => {
    if (!(error instanceof Error)) return null;
    switch (error.message) {
      case "settings_payload_invalid":
        return new ApiError("settings_payload_invalid", "Invalid settings payload", 400);
      case "settings_key_invalid":
        return new ApiError("settings_key_invalid", "Unknown setting key", 400);
      case "settings_value_invalid":
        return new ApiError("settings_value_invalid", "Invalid setting value", 400);
      case "design_tokens_invalid":
        return new ApiError("design_tokens_invalid", "Invalid design tokens", 400);
      default:
        return null;
    }
  };

  const withSettingsErrors = async <T>(fn: () => Promise<T>) => {
    try {
      return await fn();
    } catch (error) {
      const mapped = mapSettingsError(error);
      if (mapped) throw mapped;
      if (process.env.NODE_ENV !== "production" && error instanceof Error) {
        throw new ApiError("settings_error", error.message, 500);
      }
      throw error;
    }
  };

  router.get("/settings", requirePermission("settings:read"), async () => {
    const current = await listSettings();
    const tokens = await getResolvedTokens();
    return { ...current, "design.tokens": tokens };
  });

  router.get(
    "/settings/storage",
    requirePermission("settings:read"),
    async () => {
      return getStorageSettings();
    }
  );

  router.get(
    "/settings/security",
    requirePermission("settings:read"),
    async () => {
      return getSecuritySettings();
    }
  );

  router.get(
    "/settings/:key",
    requirePermission("settings:read"),
    async (ctx) => {
      if (ctx.params.key === "design.tokens") {
        const tokens = await getResolvedTokens();
        return { key: ctx.params.key, value: tokens };
      }

      const value = await getSetting(ctx.params.key);
      return { key: ctx.params.key, value };
    }
  );

  router.patch(
    "/settings/storage",
    requirePermission("settings:write"),
    async (ctx) => {
      validate(storageSettingsSchema, ctx.body);
      const payload = ctx.body as StorageSettingsUpdate;
      const updated = await setStorageSettings(payload);
      await logAudit({
        actorId: ctx.user?.id ?? null,
        action: "settings.update",
        targetType: "settings",
        targetId: "storage",
        metadata: { keys: Object.keys(payload) },
      });
      return updated;
    }
  );

  router.patch(
    "/settings/security",
    requirePermission("settings:write"),
    async (ctx) => {
      validate(securitySettingsSchema, ctx.body);
      const payload = ctx.body as SecuritySettingsUpdate;
      const updated = await setSecuritySettings(payload);
      await logAudit({
        actorId: ctx.user?.id ?? null,
        action: "settings.update",
        targetType: "settings",
        targetId: "security",
        metadata: { keys: Object.keys(payload) },
      });
      return updated;
    }
  );

  router.patch(
    "/settings/:key",
    requirePermission("settings:write"),
    async (ctx) => {
      validate(settingsUpdateSchema, ctx.body);
      const body = ctx.body as { value: unknown };
      const updated = await withSettingsErrors(() =>
        setSetting(ctx.params.key, body.value)
      );
      await logAudit({
        actorId: ctx.user?.id ?? null,
        action: "settings.update",
        targetType: "settings",
        targetId: ctx.params.key,
        metadata: { keys: [ctx.params.key] },
      });
      return updated;
    }
  );

  router.patch(
    "/settings",
    requirePermission("settings:write"),
    async (ctx) => {
      validate(settingsBulkSchema, ctx.body);
      const payload = ctx.body as Record<string, unknown>;
      const updated = await withSettingsErrors(() => setSettings(payload));
      const tokens = await getResolvedTokens();
      await logAudit({
        actorId: ctx.user?.id ?? null,
        action: "settings.update",
        targetType: "settings",
        targetId: "bulk",
        metadata: { keys: Object.keys(payload) },
      });
      return { ...updated, "design.tokens": tokens };
    }
  );
}
