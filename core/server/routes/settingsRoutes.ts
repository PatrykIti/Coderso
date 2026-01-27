import {
  getSetting,
  listSettings,
  setSetting,
  setSettings,
} from "../../services/settings/settingsService";
import { getResolvedTokens } from "../../services/theme/tokenService";
import { logAudit } from "../../services/audit/auditService";
import { settingsBulkSchema, settingsUpdateSchema } from "../validation/settingsSchemas";

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

  router.get("/settings", requirePermission("settings:read"), async () => {
    const current = await listSettings();
    const tokens = await getResolvedTokens();
    return { ...current, "design.tokens": tokens };
  });

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
    "/settings/:key",
    requirePermission("settings:write"),
    async (ctx) => {
      validate(settingsUpdateSchema, ctx.body);
      const body = ctx.body as { value: unknown };
      const updated = await setSetting(ctx.params.key, body.value);
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
      const updated = await setSettings(payload);
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
