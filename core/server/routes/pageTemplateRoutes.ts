import type { RouteContext } from "../router";
import { ApiError } from "../errorHandler";
import { isPageDocumentError } from "../../services/pages/pageDocumentV2";
import {
  clampPageTemplatePreviewTtlMinutes,
  isPageTemplateError,
  pageTemplateCreateSchema,
  pageTemplateDuplicateSchema,
  pageTemplatePreviewSchema,
  pageTemplateUpdateSchema,
} from "../../services/pages/pageTemplateLibrarySchema";
import {
  createPageTemplate,
  deletePageTemplate,
  duplicatePageTemplate,
  getPageTemplate,
  getPageTemplatePreviewModel,
  listPageTemplates,
  updatePageTemplate,
} from "../../services/pages/pageTemplateLibraryService";
import { createPreviewToken } from "../../services/pages/previewService";
import { logAudit } from "../../services/audit/auditService";
import { createPublicUrlContextFromHeaders, resolvePreviewUrl } from "../utils/previewUrls";

export type PageTemplateRouteHandler = (ctx: RouteContext) => Promise<unknown> | unknown;

export type PageTemplateRouteDeps = {
  requirePermission: (permission: string) => PageTemplateRouteHandler;
  validate: (schema: unknown, payload: unknown) => void;
};

export type Router = {
  get: (path: string, ...handlers: PageTemplateRouteHandler[]) => void;
  post: (path: string, ...handlers: PageTemplateRouteHandler[]) => void;
  patch: (path: string, ...handlers: PageTemplateRouteHandler[]) => void;
  delete: (path: string, ...handlers: PageTemplateRouteHandler[]) => void;
};

export const mapPageTemplateError = (error: unknown): ApiError | null => {
  if (isPageDocumentError(error)) {
    // Strict Page v2 document failures surface as template invalid with the
    // original field path preserved in the message.
    const path = error.path ? ` (${error.path})` : "";
    return new ApiError("page_template_invalid", `${error.message}${path}`, 400);
  }
  if (isPageTemplateError(error)) {
    switch (error.code) {
      case "page_template_not_found":
        return new ApiError("page_template_not_found", "Template not found.", 404);
      case "page_template_slug_conflict":
        return new ApiError("page_template_slug_conflict", "Template slug already exists.", 409);
      case "page_template_status_invalid":
        return new ApiError("page_template_status_invalid", "Template status is invalid.", 400);
      case "page_template_legacy_widget_blocks_invalid":
        return new ApiError(
          "page_template_legacy_widget_blocks_invalid",
          "Page templates store Page v2 sections, not legacy widget blocks.",
          400
        );
      case "page_template_invalid":
        return new ApiError("page_template_invalid", error.message, 400);
    }
  }
  return null;
};

const withPageTemplateErrors = async <T>(fn: () => Promise<T> | T): Promise<T> => {
  try {
    return await fn();
  } catch (error) {
    const mapped = mapPageTemplateError(error);
    if (mapped) throw mapped;
    throw error;
  }
};

export function registerPageTemplateRoutes(router: Router, deps: PageTemplateRouteDeps) {
  const { requirePermission, validate } = deps;

  router.get("/page-templates", requirePermission("content:read"), async () => {
    return withPageTemplateErrors(async () => {
      const items = await listPageTemplates();
      return { items };
    });
  });

  router.get("/page-templates/:id", requirePermission("content:read"), async (ctx) => {
    return withPageTemplateErrors(async () => {
      const template = await getPageTemplate(ctx.params.id);
      if (!template) throw new ApiError("page_template_not_found", "Template not found.", 404);
      return template;
    });
  });

  router.post("/page-templates", requirePermission("content:write"), async (ctx) => {
    validate(pageTemplateCreateSchema, ctx.body);
    return withPageTemplateErrors(async () => {
      const created = await createPageTemplate(ctx.body);
      await logAudit({
        actorId: ctx.user?.id ?? null,
        action: "pages.template.create",
        targetType: "page_template",
        targetId: created.id,
        metadata: { name: created.name, slug: created.slug },
      });
      return created;
    });
  });

  router.patch("/page-templates/:id", requirePermission("content:write"), async (ctx) => {
    validate(pageTemplateUpdateSchema, ctx.body);
    return withPageTemplateErrors(async () => {
      const updated = await updatePageTemplate(ctx.params.id, ctx.body);
      if (!updated) throw new ApiError("page_template_not_found", "Template not found.", 404);
      await logAudit({
        actorId: ctx.user?.id ?? null,
        action: "pages.template.update",
        targetType: "page_template",
        targetId: updated.id,
        metadata: { keys: Object.keys((ctx.body as Record<string, unknown>) ?? {}) },
      });
      return updated;
    });
  });

  router.delete("/page-templates/:id", requirePermission("content:write"), async (ctx) => {
    return withPageTemplateErrors(async () => {
      const deleted = await deletePageTemplate(ctx.params.id);
      if (!deleted) throw new ApiError("page_template_not_found", "Template not found.", 404);
      await logAudit({
        actorId: ctx.user?.id ?? null,
        action: "pages.template.delete",
        targetType: "page_template",
        targetId: deleted.id,
        metadata: { name: deleted.name, slug: deleted.slug },
      });
      return { ok: true };
    });
  });

  router.post("/page-templates/:id/duplicate", requirePermission("content:write"), async (ctx) => {
    validate(pageTemplateDuplicateSchema, ctx.body ?? {});
    return withPageTemplateErrors(async () => {
      const copy = await duplicatePageTemplate(ctx.params.id);
      await logAudit({
        actorId: ctx.user?.id ?? null,
        action: "pages.template.duplicate",
        targetType: "page_template",
        targetId: copy.id,
        metadata: { sourceId: ctx.params.id, name: copy.name, slug: copy.slug },
      });
      return copy;
    });
  });

  router.post("/page-templates/:id/preview", requirePermission("content:read"), async (ctx) => {
    validate(pageTemplatePreviewSchema, ctx.body ?? {});
    return withPageTemplateErrors(async () => {
      const model = await getPageTemplatePreviewModel(ctx.params.id);
      const body = (ctx.body ?? {}) as { ttlMinutes?: number };
      const { token, expiresAt } = await createPreviewToken({
        targetType: "page-template",
        targetId: model.id,
        ttlMinutes: clampPageTemplatePreviewTtlMinutes(body.ttlMinutes),
      });
      const previewUrl = await resolvePreviewUrl(
        {
          targetType: "page-template",
          token,
        },
        createPublicUrlContextFromHeaders(ctx.headers)
      );
      return {
        token,
        previewUrl,
        expiresAt,
        sectionsCount: model.sectionsCount,
      };
    });
  });
}
