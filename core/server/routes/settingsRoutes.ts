import {
  getSetting,
  listSettings,
  resolveSettingKey,
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
  getSecuritySettingsPublic,
  setSecuritySettingsPublic,
  type SecuritySettingsUpdate,
} from "../../services/settings/securitySettings";
import { getResolvedTokens } from "../../services/theme/tokenService";
import {
  SITE_FOOTER_TEMPLATE_SETTING_KEY,
  SITE_NAVIGATION_MENU_SETTING_KEY,
  assertSiteShellMenuExists,
  assertSiteShellTemplateExists,
} from "../../services/pages/publicSiteShell";
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
  // Optional persistence seams (default = real services), same additive
  // injection pattern as InstallRouteDeps.{isFirstRun,createFirstAdmin,logAudit}.
  // Lets the onboarding E2E drive the REAL bulk-settings handler (validation,
  // key resolution, audit-action strings, error mapping) over an in-memory world
  // without touching the shared remote Postgres.
  setSettings?: typeof setSettings;
  getResolvedTokens?: typeof getResolvedTokens;
  logAudit?: typeof logAudit;
};

export const resolveSettingsRouteKey = (key: string) => resolveSettingKey(key);

const SETTINGS_UNEXPECTED_MESSAGE = "Could not complete settings request.";

export const mapSettingsRouteError = (error: unknown) => {
  if (error instanceof ApiError) return error;
  if (!(error instanceof Error)) {
    return new ApiError("settings_error", SETTINGS_UNEXPECTED_MESSAGE, 500);
  }

  switch (error.message) {
    case "settings_payload_invalid":
      return new ApiError("settings_payload_invalid", "Invalid settings payload", 400);
    case "settings_key_invalid":
      return new ApiError("settings_key_invalid", "Unknown setting key", 400);
    case "settings_value_invalid":
      return new ApiError("settings_value_invalid", "Invalid setting value", 400);
    case "security_settings_invalid":
      return new ApiError("security_settings_invalid", "Invalid security settings", 400);
    case "design_tokens_invalid":
      return new ApiError("design_tokens_invalid", "Invalid design tokens", 400);
    case "site_shell_menu_not_found":
      return new ApiError("site_shell_menu_not_found", "Navigation menu not found", 400);
    case "site_shell_template_not_found":
      return new ApiError("site_shell_template_not_found", "Footer template not found", 400);
    default:
      return new ApiError("settings_error", SETTINGS_UNEXPECTED_MESSAGE, 500);
  }
};

/**
 * Site-shell reference keys (TASK-455) must point at existing records on
 * write. Non-string values pass through untouched so the settings schema
 * keeps rejecting them with `settings_value_invalid`.
 */
const assertSiteShellReferencesExist = async (
  entries: Array<{ key: string; value: unknown }>
): Promise<void> => {
  for (const entry of entries) {
    const value = typeof entry.value === "string" ? entry.value : null;
    if (entry.key === SITE_NAVIGATION_MENU_SETTING_KEY) {
      await assertSiteShellMenuExists(value);
    } else if (entry.key === SITE_FOOTER_TEMPLATE_SETTING_KEY) {
      await assertSiteShellTemplateExists(value);
    }
  }
};

export function registerSettingsRoutes(router: Router, deps: SettingsRouteDeps) {
  const { requirePermission, validate } = deps;
  const persistSettings = deps.setSettings ?? setSettings;
  const resolveTokens = deps.getResolvedTokens ?? getResolvedTokens;
  const audit = deps.logAudit ?? logAudit;

  const withSettingsErrors = async <T>(fn: () => Promise<T>) => {
    try {
      return await fn();
    } catch (error) {
      throw mapSettingsRouteError(error);
    }
  };

  router.get("/settings", requirePermission("settings:read"), async () => {
    return withSettingsErrors(async () => {
      const current = await listSettings();
      const tokens = await resolveTokens();
      return { ...current, "design.tokens": tokens };
    });
  });

  router.get("/settings/storage", requirePermission("settings:read"), async () => {
    return withSettingsErrors(() => getStorageSettings());
  });

  router.get("/settings/security", requirePermission("settings:read"), async () => {
    return withSettingsErrors(() => getSecuritySettingsPublic());
  });

  router.get("/settings/:key", requirePermission("settings:read"), async (ctx) => {
    const settingKey = await withSettingsErrors(async () =>
      resolveSettingsRouteKey(ctx.params.key)
    );
    if (settingKey === "design.tokens") {
      const tokens = await withSettingsErrors(() => resolveTokens());
      return { key: settingKey, value: tokens };
    }

    const value = await withSettingsErrors(() => getSetting(settingKey));
    return { key: settingKey, value };
  });

  router.patch("/settings/storage", requirePermission("settings:write"), async (ctx) => {
    validate(storageSettingsSchema, ctx.body);
    const payload = ctx.body as StorageSettingsUpdate;
    const updated = await withSettingsErrors(() => setStorageSettings(payload));
    await withSettingsErrors(async () => {
      await audit({
        actorId: ctx.user?.id ?? null,
        action: "settings.update",
        targetType: "settings",
        targetId: "storage",
        metadata: { keys: Object.keys(payload) },
      });
    });
    return updated;
  });

  router.patch("/settings/security", requirePermission("settings:write"), async (ctx) => {
    validate(securitySettingsSchema, ctx.body);
    const payload = ctx.body as SecuritySettingsUpdate;
    const updated = await withSettingsErrors(() => setSecuritySettingsPublic(payload));
    await withSettingsErrors(async () => {
      await audit({
        actorId: ctx.user?.id ?? null,
        action: "settings.update",
        targetType: "settings",
        targetId: "security",
        metadata: { keys: Object.keys(payload) },
      });
    });
    return updated;
  });

  router.patch("/settings/:key", requirePermission("settings:write"), async (ctx) => {
    validate(settingsUpdateSchema, ctx.body);
    const body = ctx.body as { value: unknown };
    const settingKey = await withSettingsErrors(async () =>
      resolveSettingsRouteKey(ctx.params.key)
    );
    await withSettingsErrors(() =>
      assertSiteShellReferencesExist([{ key: settingKey, value: body.value }])
    );
    const updated = await withSettingsErrors(() => setSetting(settingKey, body.value));
    await withSettingsErrors(async () => {
      await audit({
        actorId: ctx.user?.id ?? null,
        action: "settings.update",
        targetType: "settings",
        targetId: settingKey,
        metadata: { keys: [settingKey] },
      });
    });
    return updated;
  });

  router.patch("/settings", requirePermission("settings:write"), async (ctx) => {
    validate(settingsBulkSchema, ctx.body);
    const payload = ctx.body as Record<string, unknown>;
    const normalizedKeys = await withSettingsErrors(async () => {
      const unique = new Set<string>();
      for (const key of Object.keys(payload)) {
        unique.add(resolveSettingsRouteKey(key));
      }
      return [...unique];
    });
    await withSettingsErrors(() =>
      assertSiteShellReferencesExist(
        Object.entries(payload).map(([key, value]) => ({
          key: resolveSettingsRouteKey(key),
          value,
        }))
      )
    );
    const updated = await withSettingsErrors(() => persistSettings(payload));
    const tokens = await withSettingsErrors(() => resolveTokens());
    await withSettingsErrors(async () => {
      await audit({
        actorId: ctx.user?.id ?? null,
        action: "settings.update",
        targetType: "settings",
        targetId: "bulk",
        metadata: { keys: normalizedKeys },
      });
    });
    return { ...updated, "design.tokens": tokens };
  });
}
