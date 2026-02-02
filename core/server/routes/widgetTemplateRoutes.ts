import type { RouteContext } from "../router";
import { ApiError } from "../errorHandler";
import {
  createWidgetTemplate,
  deleteWidgetTemplate,
  getWidgetTemplate,
  listWidgetTemplates,
  updateWidgetTemplate,
  type WidgetTemplateCreateInput,
  type WidgetTemplateUpdateInput,
} from "../../services/widgets/widgetTemplateService";
import { renderWidgetTemplatePreview } from "../../services/widgets/widgetTemplatePreviewService";
import { logAudit } from "../../services/audit/auditService";
import {
  widgetTemplateCreateSchema,
  widgetTemplatePreviewSchema,
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

const mapWidgetTemplateError = (error: unknown) => {
  if (!(error instanceof Error)) return null;
  switch (error.message) {
    case "widget_template_not_found":
      return new ApiError("widget_template_not_found", "Template not found", 404);
    case "widget_template_invalid":
      return new ApiError("widget_template_invalid", "Invalid template data", 400);
    case "widget_template_category_invalid":
      return new ApiError(
        "widget_template_category_invalid",
        "Template category is invalid",
        400
      );
    case "widget_template_status_invalid":
      return new ApiError(
        "widget_template_status_invalid",
        "Template status is invalid",
        400
      );
    default:
      return null;
  }
};

const withWidgetTemplateErrors = async <T>(fn: () => Promise<T>) => {
  try {
    return await fn();
  } catch (error) {
    const mapped = mapWidgetTemplateError(error);
    if (mapped) throw mapped;
    if (process.env.NODE_ENV !== "production" && error instanceof Error) {
      throw new ApiError("widget_template_error", error.message, 500);
    }
    throw error;
  }
};

export function registerWidgetTemplateRoutes(
  router: Router,
  deps: WidgetTemplateRouteDeps
) {
  const { requirePermission, validate } = deps;

  router.get("/widget-templates", requirePermission("widgets:read"), async () => {
    return withWidgetTemplateErrors(async () => {
      const items = await listWidgetTemplates();
      return { items };
    });
  });

  router.get(
    "/widget-templates/:id",
    requirePermission("widgets:read"),
    async (ctx) => {
      return withWidgetTemplateErrors(async () => {
        const template = await getWidgetTemplate(ctx.params.id);
        if (!template) throw new Error("widget_template_not_found");
        return template;
      });
    }
  );

  router.post(
    "/widget-templates/:id/preview",
    requirePermission("widgets:read"),
    async (ctx) => {
      return withWidgetTemplateErrors(async () => {
        const input = (ctx.body ?? {}) as Parameters<
          typeof renderWidgetTemplatePreview
        >[1];
        validate(widgetTemplatePreviewSchema, input);
        const preview = await renderWidgetTemplatePreview(ctx.params.id, input);
        return preview;
      });
    }
  );

  router.post(
    "/widget-templates",
    requirePermission("widgets:write"),
    async (ctx) => {
      return withWidgetTemplateErrors(async () => {
        validate(widgetTemplateCreateSchema, ctx.body);
        const created = await createWidgetTemplate(
          ctx.body as WidgetTemplateCreateInput
        );
        await logAudit({
          actorId: ctx.user?.id ?? null,
          action: "widgets.template.create",
          targetType: "widget_template",
          targetId: created.id,
          metadata: { name: created.name, category: created.category },
        });
        return created;
      });
    }
  );

  router.patch(
    "/widget-templates/:id",
    requirePermission("widgets:write"),
    async (ctx) => {
      return withWidgetTemplateErrors(async () => {
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
      });
    }
  );

  router.delete(
    "/widget-templates/:id",
    requirePermission("widgets:write"),
    async (ctx) => {
      return withWidgetTemplateErrors(async () => {
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
      });
    }
  );
}
