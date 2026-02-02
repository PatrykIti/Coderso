import type { RouteContext } from "../router";
import {
  createWidgetTemplate,
  deleteWidgetTemplate,
  getWidgetTemplate,
  listWidgetTemplates,
  updateWidgetTemplate,
  type WidgetTemplateCreateInput,
  type WidgetTemplateUpdateInput,
} from "../../services/widgets/widgetTemplateService";
import { logAudit } from "../../services/audit/auditService";
import {
  widgetTemplateCreateSchema,
  widgetTemplateUpdateSchema,
} from "../validation/widgetSchemas";

export type WidgetTemplateRouteHandler = (ctx: RouteContext) => Promise<unknown> | unknown;

export type WidgetTemplateRouteDeps = {
  requirePermission: (permission: string) => WidgetTemplateRouteHandler;
  validate: (schema: unknown, payload: unknown) => void;
};

export type Router = {
  get: (path: string, ...handlers: WidgetTemplateRouteHandler[]) => void;
  post: (path: string, ...handlers: WidgetTemplateRouteHandler[]) => void;
  patch: (path: string, ...handlers: WidgetTemplateRouteHandler[]) => void;
  delete: (path: string, ...handlers: WidgetTemplateRouteHandler[]) => void;
};

export function registerWidgetTemplateRoutes(
  router: Router,
  deps: WidgetTemplateRouteDeps
) {
  const { requirePermission, validate } = deps;

  router.get("/widget-templates", requirePermission("widgets:read"), async () => {
    const items = await listWidgetTemplates();
    return { items };
  });

  router.get(
    "/widget-templates/:id",
    requirePermission("widgets:read"),
    async (ctx) => {
      const template = await getWidgetTemplate(ctx.params.id);
      if (!template) throw new Error("widget_template_not_found");
      return template;
    }
  );

  router.post(
    "/widget-templates",
    requirePermission("widgets:write"),
    async (ctx) => {
      validate(widgetTemplateCreateSchema, ctx.body);
      const created = await createWidgetTemplate(ctx.body as WidgetTemplateCreateInput);
      await logAudit({
        actorId: ctx.user?.id ?? null,
        action: "widgets.template.create",
        targetType: "widget_template",
        targetId: created.id,
        metadata: { name: created.name, category: created.category },
      });
      return created;
    }
  );

  router.patch(
    "/widget-templates/:id",
    requirePermission("widgets:write"),
    async (ctx) => {
      validate(widgetTemplateUpdateSchema, ctx.body);
      const updated = await updateWidgetTemplate(
        ctx.params.id,
        ctx.body as WidgetTemplateUpdateInput
      );
      if (!updated) throw new Error("widget_template_not_found");
      await logAudit({
        actorId: ctx.user?.id ?? null,
        action: "widgets.template.update",
        targetType: "widget_template",
        targetId: ctx.params.id,
        metadata: { keys: Object.keys(ctx.body ?? {}) },
      });
      return updated;
    }
  );

  router.delete(
    "/widget-templates/:id",
    requirePermission("widgets:write"),
    async (ctx) => {
      const deleted = await deleteWidgetTemplate(ctx.params.id);
      if (!deleted) throw new Error("widget_template_not_found");
      await logAudit({
        actorId: ctx.user?.id ?? null,
        action: "widgets.template.delete",
        targetType: "widget_template",
        targetId: ctx.params.id,
        metadata: { name: deleted.name },
      });
      return { ok: true };
    }
  );
}
