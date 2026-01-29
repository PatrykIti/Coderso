import type { RouteContext } from "../router";
import { logAudit } from "../../services/audit/auditService";
import {
  createAdminThemeProfile,
  listAdminThemeProfiles,
  updateAdminThemeProfile,
  activateAdminThemeProfile,
  type AdminThemeProfileCreateInput,
  type AdminThemeProfileUpdateInput,
} from "../../services/adminThemes/adminThemeProfileService";
import {
  createAdminThemeTemplate,
  deleteAdminThemeTemplate,
  listAdminThemeTemplates,
  updateAdminThemeTemplate,
  type AdminThemeTemplateCreateInput,
  type AdminThemeTemplateUpdateInput,
} from "../../services/adminThemes/adminThemeTemplateService";
import {
  adminThemeProfileCreateSchema,
  adminThemeProfileUpdateSchema,
  adminThemeTemplateCreateSchema,
  adminThemeTemplateUpdateSchema,
} from "../validation/adminThemeSchemas";

export type AdminThemeRouteHandler = (ctx: RouteContext) => Promise<unknown> | unknown;

export type AdminThemeRouteDeps = {
  requirePermission: (permission: string) => AdminThemeRouteHandler;
  validate: (schema: unknown, payload: unknown) => void;
};

export type Router = {
  get: (path: string, ...handlers: AdminThemeRouteHandler[]) => void;
  post: (path: string, ...handlers: AdminThemeRouteHandler[]) => void;
  patch: (path: string, ...handlers: AdminThemeRouteHandler[]) => void;
  delete: (path: string, ...handlers: AdminThemeRouteHandler[]) => void;
};

export function registerAdminThemeRoutes(router: Router, deps: AdminThemeRouteDeps) {
  const { requirePermission, validate } = deps;

  router.get(
    "/admin-theme-templates",
    requirePermission("themes:read"),
    async () => {
      const items = await listAdminThemeTemplates();
      return { items };
    }
  );

  router.post(
    "/admin-theme-templates",
    requirePermission("themes:write"),
    async (ctx) => {
      validate(adminThemeTemplateCreateSchema, ctx.body);
      const created = await createAdminThemeTemplate(
        ctx.body as AdminThemeTemplateCreateInput
      );
      await logAudit({
        actorId: ctx.user?.id ?? null,
        action: "admin_theme.template.create",
        targetType: "admin_theme_template",
        targetId: created.id,
        metadata: { name: created.name },
      });
      return created;
    }
  );

  router.patch(
    "/admin-theme-templates/:id",
    requirePermission("themes:write"),
    async (ctx) => {
      validate(adminThemeTemplateUpdateSchema, ctx.body);
      const updated = await updateAdminThemeTemplate(
        ctx.params.id,
        ctx.body as AdminThemeTemplateUpdateInput
      );
      if (!updated) throw new Error("admin_theme_template_not_found");
      await logAudit({
        actorId: ctx.user?.id ?? null,
        action: "admin_theme.template.update",
        targetType: "admin_theme_template",
        targetId: updated.id,
        metadata: { keys: Object.keys(ctx.body ?? {}) },
      });
      return updated;
    }
  );

  router.delete(
    "/admin-theme-templates/:id",
    requirePermission("themes:write"),
    async (ctx) => {
      const deleted = await deleteAdminThemeTemplate(ctx.params.id);
      if (!deleted) throw new Error("admin_theme_template_not_found");
      await logAudit({
        actorId: ctx.user?.id ?? null,
        action: "admin_theme.template.delete",
        targetType: "admin_theme_template",
        targetId: deleted.id,
        metadata: { name: deleted.name },
      });
      return { ok: true };
    }
  );

  router.get(
    "/admin-theme-profiles",
    requirePermission("themes:read"),
    async () => {
      const items = await listAdminThemeProfiles();
      return { items };
    }
  );

  router.post(
    "/admin-theme-profiles",
    requirePermission("themes:write"),
    async (ctx) => {
      validate(adminThemeProfileCreateSchema, ctx.body);
      const created = await createAdminThemeProfile(
        ctx.body as AdminThemeProfileCreateInput
      );
      await logAudit({
        actorId: ctx.user?.id ?? null,
        action: "admin_theme.profile.create",
        targetType: "admin_theme_profile",
        targetId: created.id,
        metadata: { name: created.name, templateId: created.templateId },
      });
      return created;
    }
  );

  router.patch(
    "/admin-theme-profiles/:id",
    requirePermission("themes:write"),
    async (ctx) => {
      validate(adminThemeProfileUpdateSchema, ctx.body);
      const updated = await updateAdminThemeProfile(
        ctx.params.id,
        ctx.body as AdminThemeProfileUpdateInput
      );
      if (!updated) throw new Error("admin_theme_profile_not_found");
      await logAudit({
        actorId: ctx.user?.id ?? null,
        action: "admin_theme.profile.update",
        targetType: "admin_theme_profile",
        targetId: updated.id,
        metadata: { keys: Object.keys(ctx.body ?? {}) },
      });
      return updated;
    }
  );

  router.post(
    "/admin-theme-profiles/:id/activate",
    requirePermission("themes:write"),
    async (ctx) => {
      await activateAdminThemeProfile(ctx.params.id);
      await logAudit({
        actorId: ctx.user?.id ?? null,
        action: "admin_theme.profile.activate",
        targetType: "admin_theme_profile",
        targetId: ctx.params.id,
        metadata: {},
      });
      return { ok: true };
    }
  );
}
