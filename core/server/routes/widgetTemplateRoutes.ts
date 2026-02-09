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
import {
  listWidgetTemplateRevisions,
  restoreWidgetTemplateRevision,
} from "../../services/widgets/widgetTemplateRevisionService";
import { getWidgetTemplatePreviewModel } from "../../services/widgets/widgetTemplatePreviewService";
import { logAudit } from "../../services/audit/auditService";
import { createPreviewToken } from "../../services/pages/previewService";
import {
  createPublicUrlContextFromHeaders,
  resolvePreviewUrl,
} from "../utils/previewUrls";
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
    case "widget_template_revision_not_found":
      return new ApiError(
        "widget_template_revision_not_found",
        "Template revision not found",
        404
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

  const registerTemplateRoutes = (basePath: string) => {
    router.get(basePath, requirePermission("widgets:read"), async () => {
      return withWidgetTemplateErrors(async () => {
        const items = await listWidgetTemplates();
        return { items };
      });
    });

    router.get(
      `${basePath}/:id`,
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
      `${basePath}/:id/preview`,
      requirePermission("widgets:read"),
      async (ctx) => {
        return withWidgetTemplateErrors(async () => {
          const input = (ctx.body ?? {}) as { ttlMinutes?: number };
          validate(widgetTemplatePreviewSchema, input);

          const previewModel = await getWidgetTemplatePreviewModel(ctx.params.id);
          const { token, expiresAt } = await createPreviewToken({
            targetType: "widget-template",
            targetId: previewModel.id,
            ttlMinutes: input.ttlMinutes,
          });
          const previewUrl = await resolvePreviewUrl({
            targetType: "widget-template",
            token,
          }, createPublicUrlContextFromHeaders(ctx.headers));

          return {
            token,
            previewUrl,
            expiresAt,
            blocksCount: previewModel.blocksCount,
          };
        });
      }
    );

    router.get(
      `${basePath}/:id/revisions`,
      requirePermission("widgets:read"),
      async (ctx) => {
        return withWidgetTemplateErrors(async () => {
          const items = await listWidgetTemplateRevisions(ctx.params.id);
          return { items };
        });
      }
    );

    router.post(
      `${basePath}/:id/revisions/:revisionId/restore`,
      requirePermission("widgets:write"),
      async (ctx) => {
        return withWidgetTemplateErrors(async () => {
          const revision = await restoreWidgetTemplateRevision(
            ctx.params.revisionId,
            ctx.user?.id ?? null
          );
          await logAudit({
            actorId: ctx.user?.id ?? null,
            action: "widgets.template.restore",
            targetType: "widget_template",
            targetId: revision.templateId,
            metadata: { revisionId: revision.id },
          });
          return { ok: true };
        });
      }
    );

    router.post(
      basePath,
      requirePermission("widgets:write"),
      async (ctx) => {
        return withWidgetTemplateErrors(async () => {
          validate(widgetTemplateCreateSchema, ctx.body);
          const created = await createWidgetTemplate(
            ctx.body as WidgetTemplateCreateInput,
            ctx.user?.id ?? null
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
      `${basePath}/:id`,
      requirePermission("widgets:write"),
      async (ctx) => {
        return withWidgetTemplateErrors(async () => {
          validate(widgetTemplateUpdateSchema, ctx.body);
          const updated = await updateWidgetTemplate(
            ctx.params.id,
            ctx.body as WidgetTemplateUpdateInput,
            ctx.user?.id ?? null
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
      `${basePath}/:id`,
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
  };

  registerTemplateRoutes("/widget-templates");
  registerTemplateRoutes("/widgets/templates");
}
