import {
  activateThemeProfile,
  createThemeProfile,
  getThemeProfile,
  listThemeProfiles,
  setThemeRoutes,
  updateThemeProfile,
} from "../../services/themes/themeProfileService";
import { listThemes } from "../../services/themes/themeService";
import { logAudit } from "../../services/audit/auditService";
import {
  themeProfileCreateSchema,
  themeProfileUpdateSchema,
  themeRoutesSchema,
} from "../validation/themeSchemas";

export type ThemeRouteDeps = {
  requirePermission: (permission: string) => (ctx: { user?: { id: string } }) => Promise<void> | void;
  validate: (schema: unknown, payload: unknown) => void;
};

export type Router = {
  get: (path: string, ...handlers: Array<(ctx: any) => Promise<unknown> | unknown>) => void;
  post: (path: string, ...handlers: Array<(ctx: any) => Promise<unknown> | unknown>) => void;
  patch: (path: string, ...handlers: Array<(ctx: any) => Promise<unknown> | unknown>) => void;
  put: (path: string, ...handlers: Array<(ctx: any) => Promise<unknown> | unknown>) => void;
};

export function registerThemeRoutes(router: Router, deps: ThemeRouteDeps) {
  const { requirePermission, validate } = deps;

  router.get("/themes", requirePermission("themes:read"), async () => {
    const items = await listThemes();
    return { items };
  });

  router.get("/theme-profiles", requirePermission("themes:read"), async () => {
    const items = await listThemeProfiles();
    return { items };
  });

  router.get(
    "/theme-profiles/:id",
    requirePermission("themes:read"),
    async (ctx) => {
      const profile = await getThemeProfile(ctx.params.id);
      if (!profile) throw new Error("theme_profile_not_found");
      return profile;
    }
  );

  router.post(
    "/theme-profiles",
    requirePermission("themes:write"),
    async (ctx) => {
      validate(themeProfileCreateSchema, ctx.body);
      const created = await createThemeProfile(ctx.body as any);
      await logAudit({
        actorId: ctx.user?.id ?? null,
        action: "themes.profile.create",
        targetType: "theme_profile",
        targetId: created.id,
        metadata: { name: created.name, themeName: created.themeName },
      });
      return created;
    }
  );

  router.patch(
    "/theme-profiles/:id",
    requirePermission("themes:write"),
    async (ctx) => {
      validate(themeProfileUpdateSchema, ctx.body);
      const updated = await updateThemeProfile(ctx.params.id, ctx.body as any);
      if (!updated) throw new Error("theme_profile_not_found");
      await logAudit({
        actorId: ctx.user?.id ?? null,
        action: "themes.profile.update",
        targetType: "theme_profile",
        targetId: ctx.params.id,
        metadata: { keys: Object.keys(ctx.body ?? {}) },
      });
      return updated;
    }
  );

  router.post(
    "/theme-profiles/:id/activate",
    requirePermission("themes:write"),
    async (ctx) => {
      await activateThemeProfile(ctx.params.id);
      await logAudit({
        actorId: ctx.user?.id ?? null,
        action: "themes.profile.activate",
        targetType: "theme_profile",
        targetId: ctx.params.id,
        metadata: {},
      });
      return { ok: true };
    }
  );

  router.put(
    "/theme-profiles/:id/routes",
    requirePermission("themes:write"),
    async (ctx) => {
      validate(themeRoutesSchema, ctx.body);
      const updated = await setThemeRoutes(ctx.params.id, ctx.body as any);
      await logAudit({
        actorId: ctx.user?.id ?? null,
        action: "themes.routes.update",
        targetType: "theme_profile",
        targetId: ctx.params.id,
        metadata: { count: Array.isArray(ctx.body) ? ctx.body.length : 0 },
      });
      return updated;
    }
  );
}
