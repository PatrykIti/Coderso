import { ApiError } from "../errorHandler";
import type { RouteContext } from "../router";
import {
  createWidgetTemplateCategory,
  deleteWidgetTemplateCategory,
  listWidgetTemplateCategories,
  updateWidgetTemplateCategory,
} from "../../services/widgets/widgetTemplateCategoryService";
import { logAudit } from "../../services/audit/auditService";
import {
  widgetTemplateCategoryCreateSchema,
  widgetTemplateCategoryUpdateSchema,
} from "../validation/widgetSchemas";

export type WidgetTemplateCategoryRouteHandler = (
  ctx: RouteContext
) => Promise<unknown> | unknown;

export type WidgetTemplateCategoryRouteDeps = {
  requirePermission: (permission: string) => WidgetTemplateCategoryRouteHandler;
  validate: (schema: unknown, payload: unknown) => void;
};

export type Router = {
  get: (path: string, ...handlers: WidgetTemplateCategoryRouteHandler[]) => void;
  post: (path: string, ...handlers: WidgetTemplateCategoryRouteHandler[]) => void;
  patch: (path: string, ...handlers: WidgetTemplateCategoryRouteHandler[]) => void;
  delete: (path: string, ...handlers: WidgetTemplateCategoryRouteHandler[]) => void;
};

const mapCategoryError = (error: unknown) => {
  if (!(error instanceof Error)) return null;
  switch (error.message) {
    case "widget_template_category_invalid":
      return new ApiError(
        "widget_template_category_invalid",
        "Category name is required",
        400
      );
    case "widget_template_category_duplicate":
      return new ApiError(
        "widget_template_category_duplicate",
        "Category name already exists",
        400
      );
    case "widget_template_category_not_found":
      return new ApiError(
        "widget_template_category_not_found",
        "Category not found",
        404
      );
    case "widget_template_category_last":
      return new ApiError(
        "widget_template_category_last",
        "At least one category is required",
        400
      );
    default:
      return null;
  }
};

const withCategoryErrors = async <T>(fn: () => Promise<T>) => {
  try {
    return await fn();
  } catch (error) {
    const mapped = mapCategoryError(error);
    if (mapped) throw mapped;
    if (process.env.NODE_ENV !== "production" && error instanceof Error) {
      throw new ApiError("widget_template_category_error", error.message, 500);
    }
    throw error;
  }
};

export function registerWidgetTemplateCategoryRoutes(
  router: Router,
  deps: WidgetTemplateCategoryRouteDeps
) {
  const { requirePermission, validate } = deps;

  router.get(
    "/widget-template-categories",
    requirePermission("widgets:read"),
    async () => {
      return withCategoryErrors(async () => {
        const items = await listWidgetTemplateCategories();
        return { items };
      });
    }
  );

  router.post(
    "/widget-template-categories",
    requirePermission("widgets:write"),
    async (ctx) => {
      return withCategoryErrors(async () => {
        validate(widgetTemplateCategoryCreateSchema, ctx.body);
        const body = ctx.body as { name: string };
        const created = await createWidgetTemplateCategory({ name: body.name });
        await logAudit({
          actorId: ctx.user?.id ?? null,
          action: "widgets.template-category.create",
          targetType: "widget_template_category",
          targetId: created.id,
          metadata: { name: created.name },
        });
        return created;
      });
    }
  );

  router.patch(
    "/widget-template-categories/:id",
    requirePermission("widgets:write"),
    async (ctx) => {
      return withCategoryErrors(async () => {
        validate(widgetTemplateCategoryUpdateSchema, ctx.body);
        const body = ctx.body as { name: string };
        const updated = await updateWidgetTemplateCategory(ctx.params.id, {
          name: body.name,
        });
        if (!updated) throw new Error("widget_template_category_not_found");
        await logAudit({
          actorId: ctx.user?.id ?? null,
          action: "widgets.template-category.update",
          targetType: "widget_template_category",
          targetId: ctx.params.id,
          metadata: { name: updated.name },
        });
        return updated;
      });
    }
  );

  router.delete(
    "/widget-template-categories/:id",
    requirePermission("widgets:write"),
    async (ctx) => {
      return withCategoryErrors(async () => {
        const deleted = await deleteWidgetTemplateCategory(ctx.params.id);
        if (!deleted) throw new Error("widget_template_category_not_found");
        await logAudit({
          actorId: ctx.user?.id ?? null,
          action: "widgets.template-category.delete",
          targetType: "widget_template_category",
          targetId: ctx.params.id,
          metadata: { name: deleted.name },
        });
        return { ok: true };
      });
    }
  );
}
