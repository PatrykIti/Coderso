import {
  autosavePage,
  createPage,
  duplicatePage,
  deletePage,
  getPage,
  listPages,
  publishPage,
  unpublishPage,
  updatePage,
  type PageData,
} from "../../services/pages/pageService";
import { isPageDocumentError } from "../../services/pages/pageDocumentV2";
import { listPageTemplateOptions } from "../../services/pages/pageTemplateService";
import { createPreviewToken, probeGeneratedPreviewUrl } from "../../services/pages/previewService";
import {
  discardAutosaveRevision,
  listRevisions,
  restoreRevision,
} from "../../services/pages/revisionService";
import { logAudit } from "../../services/audit/auditService";
import { getActiveThemeProfile } from "../../services/themes/themeProfileService";
import { createPublicUrlContextFromHeaders, resolvePreviewUrl } from "../utils/previewUrls";
import {
  pageAutosaveSchema,
  pageCreateSchema,
  pagePreviewSchema,
  pagePublishSchema,
  pageUpdateSchema,
} from "../validation/pageSchemas";
import { ApiError } from "../errorHandler";

export type RouteContext = {
  params: Record<string, string>;
  query: Record<string, string | undefined>;
  body: unknown;
  headers?: Record<string, string | undefined>;
  user?: { id: string };
};

export type RouteHandler = (ctx: RouteContext) => Promise<unknown> | unknown;

export type Router = {
  get: (path: string, ...handlers: RouteHandler[]) => void;
  post: (path: string, ...handlers: RouteHandler[]) => void;
  patch: (path: string, ...handlers: RouteHandler[]) => void;
  delete: (path: string, ...handlers: RouteHandler[]) => void;
};

export type PageRouteDeps = {
  requirePermission: (permission: string) => RouteHandler;
  validate: (schema: unknown, payload: unknown) => void;
};

const canServerProbePreviewUrl = (value: string) => {
  try {
    const parsed = new URL(value);
    return parsed.protocol === "http:" || parsed.protocol === "https:";
  } catch {
    return false;
  }
};

export const mapPageError = (error: unknown): ApiError | null => {
  if (isPageDocumentError(error, "page_document_invalid")) {
    return new ApiError("page_document_invalid", "Page document is invalid.", 400);
  }
  if (isPageDocumentError(error, "page_document_unknown_field")) {
    return new ApiError(
      "page_document_unknown_field",
      "Page document contains an unknown field.",
      400,
      error.path ? { path: error.path } : undefined
    );
  }

  const code = error instanceof Error ? error.message : String(error);
  switch (code) {
    case "page_not_found":
      return new ApiError("page_not_found", "Page not found.", 404);
    case "revision_not_found":
      return new ApiError("revision_not_found", "Page revision was not found.", 404);
    case "revision_delete_forbidden":
      return new ApiError("revision_delete_forbidden", "Page revision cannot be deleted.", 409);
    case "page_revision_autosave_failed":
      return new ApiError(
        "page_revision_autosave_failed",
        "Page autosave revision could not be saved.",
        500
      );
    default:
      return null;
  }
};

const withPageErrors = async <T>(fn: () => Promise<T> | T): Promise<T> => {
  try {
    return await fn();
  } catch (error) {
    const mapped = mapPageError(error);
    if (mapped) throw mapped;
    throw error;
  }
};

export function registerPageRoutes(router: Router, deps: PageRouteDeps) {
  const { requirePermission, validate } = deps;

  router.get("/pages", requirePermission("content:read"), async () => {
    return listPages();
  });

  router.get("/pages/template-options", requirePermission("content:read"), async () => {
    const profile = await getActiveThemeProfile();
    const themeName = profile?.themeName ?? "default";
    const resolved = await listPageTemplateOptions({ themeName });
    return {
      themeName: resolved.themeName,
      templates: resolved.templates.map((item) => ({ key: item.key, label: item.label })),
    };
  });

  router.post("/pages", requirePermission("content:write"), async (ctx) => {
    validate(pageCreateSchema, ctx.body);
    const body = ctx.body as {
      title: string;
      slug: string;
      data: PageData;
      template?: string;
    };
    return withPageErrors(() => {
      return createPage({
        title: body.title,
        slug: body.slug,
        data: body.data,
        template: body.template,
        authorId: ctx.user?.id,
      });
    });
  });

  router.get("/pages/:id", requirePermission("content:read"), async (ctx) => {
    return withPageErrors(async () => {
      const page = await getPage(ctx.params.id);
      if (!page) throw new Error("page_not_found");
      return page;
    });
  });

  router.patch("/pages/:id", requirePermission("content:write"), async (ctx) => {
    validate(pageUpdateSchema, ctx.body);
    const body = ctx.body as {
      title?: string;
      slug?: string;
      data?: PageData;
    };
    return withPageErrors(async () => {
      const page = await updatePage(ctx.params.id, {
        title: body.title,
        slug: body.slug,
        data: body.data,
      });
      if (!page) throw new Error("page_not_found");
      return page;
    });
  });

  router.post("/pages/:id/autosave", requirePermission("content:write"), async (ctx) => {
    validate(pageAutosaveSchema, ctx.body);
    if (!ctx.user?.id) throw new Error("auth_required");
    const actorId = ctx.user.id;
    const body = ctx.body as {
      title?: string;
      slug?: string;
      data?: PageData;
    };
    return withPageErrors(() =>
      autosavePage(
        ctx.params.id,
        {
          title: body.title,
          slug: body.slug,
          data: body.data,
        },
        actorId
      )
    );
  });

  router.post("/pages/:id/publish", requirePermission("content:publish"), async (ctx) => {
    validate(pagePublishSchema, ctx.body);
    if (!ctx.user?.id) throw new Error("auth_required");
    const actorId = ctx.user.id;
    const body = ctx.body as { data?: PageData };
    return withPageErrors(async () => {
      const page = await publishPage(ctx.params.id, actorId, body.data);
      if (!page) throw new Error("page_not_found");
      await logAudit({
        actorId,
        action: "pages.publish",
        targetType: "page",
        targetId: page.id,
        metadata: { slug: page.slug },
      });
      return { ok: true };
    });
  });

  router.post("/pages/:id/unpublish", requirePermission("content:publish"), async (ctx) => {
    return withPageErrors(async () => {
      const page = await unpublishPage(ctx.params.id);
      if (!page) throw new Error("page_not_found");
      return { ok: true };
    });
  });

  router.post("/pages/:id/preview", requirePermission("content:read"), async (ctx) => {
    validate(pagePreviewSchema, ctx.body);
    return withPageErrors(async () => {
      const page = await getPage(ctx.params.id);
      if (!page) throw new Error("page_not_found");

      const body = ctx.body as { ttlMinutes?: number; probe?: boolean };
      const { token, expiresAt } = await createPreviewToken({
        targetType: "page",
        targetId: page.id,
        ttlMinutes: body.ttlMinutes,
      });

      const slugPath = page.slug.startsWith("/") ? page.slug : `/${page.slug}`;
      const previewUrl = await resolvePreviewUrl(
        {
          targetType: "page",
          token,
          path: slugPath,
        },
        createPublicUrlContextFromHeaders(ctx.headers)
      );
      const probe =
        body.probe && canServerProbePreviewUrl(previewUrl)
          ? await probeGeneratedPreviewUrl(previewUrl, {
              allowedOrigins: [previewUrl],
            })
          : undefined;
      return probe ? { token, previewUrl, expiresAt, probe } : { token, previewUrl, expiresAt };
    });
  });

  router.post("/pages/:id/duplicate", requirePermission("content:write"), async (ctx) => {
    return withPageErrors(async () => {
      const clone = await duplicatePage(ctx.params.id, ctx.user?.id);
      if (!clone) throw new Error("page_not_found");
      return clone;
    });
  });

  router.delete("/pages/:id", requirePermission("content:write"), async (ctx) => {
    return withPageErrors(async () => {
      const page = await getPage(ctx.params.id);
      if (!page) throw new Error("page_not_found");
      const deleted = await deletePage(ctx.params.id);
      if (!deleted) throw new Error("page_not_found");
      await logAudit({
        actorId: ctx.user?.id ?? null,
        action: "pages.delete",
        targetType: "page",
        targetId: deleted.id,
        metadata: { slug: deleted.slug, title: deleted.title },
      });
      return { ok: true };
    });
  });

  router.get("/pages/:id/revisions", requirePermission("content:read"), async (ctx) => {
    return listRevisions(ctx.params.id);
  });

  router.post(
    "/pages/:id/revisions/:revisionId/restore",
    requirePermission("content:write"),
    async (ctx) => {
      return withPageErrors(async () => {
        const result = await restoreRevision(ctx.params.id, ctx.params.revisionId);
        await logAudit({
          actorId: ctx.user?.id ?? null,
          action: "pages.restore",
          targetType: "page",
          targetId: ctx.params.id,
          metadata: {
            revisionId: result.revision.id,
            kind: result.revision.kind,
            restored: result.restored,
          },
        });
        return { ok: true, ...result };
      });
    }
  );

  router.delete(
    "/pages/:id/revisions/:revisionId",
    requirePermission("content:write"),
    async (ctx) => {
      return withPageErrors(async () => {
        const discarded = await discardAutosaveRevision(ctx.params.id, ctx.params.revisionId);
        await logAudit({
          actorId: ctx.user?.id ?? null,
          action: "pages.autosave.discard",
          targetType: "page",
          targetId: ctx.params.id,
          metadata: { revisionId: discarded.id },
        });
        return { ok: true };
      });
    }
  );
}
