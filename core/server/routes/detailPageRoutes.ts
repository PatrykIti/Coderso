import type { RouteContext } from "../router";
import { ApiError } from "../errorHandler";
import {
  autosaveDetailPageDocument,
  createDetailPageDraftDocument,
  deleteDetailPageDocument,
  getDetailPageDocument,
  issueDetailPagePreview,
  listDetailPageDocuments,
  publishDetailPageDocument,
  unpublishDetailPageDocument,
  updateDetailPageDraftDocument,
} from "../../services/content/detailPageDocumentService";
import {
  discardDetailPageAutosaveRevision,
  listDetailPageRevisions,
  restoreDetailPageRevision,
} from "../../services/content/detailPageRevisionService";
import {
  detailPageAutosaveSchema,
  detailPageCreateSchema,
  detailPageEmptyLifecycleSchema,
  detailPageListQuerySchema,
  detailPagePreviewSchema,
  detailPageUpdateSchema,
} from "../validation/detailPageSchemas";
import { createPublicUrlContextFromHeaders, resolvePreviewUrl } from "../utils/previewUrls";

export type DetailPageRouteHandler = (ctx: RouteContext) => Promise<unknown> | unknown;

export type DetailPageRouteDeps = {
  requirePermission: (permission: string) => DetailPageRouteHandler;
  validate: (schema: unknown, payload: unknown) => void;
};

export type Router = {
  get: (path: string, ...handlers: DetailPageRouteHandler[]) => void;
  post: (path: string, ...handlers: DetailPageRouteHandler[]) => void;
  patch: (path: string, ...handlers: DetailPageRouteHandler[]) => void;
  delete: (path: string, ...handlers: DetailPageRouteHandler[]) => void;
};

export const mapDetailPageError = (error: unknown) => {
  if (!(error instanceof Error)) return null;
  switch (error.message) {
    case "detail_page_not_found":
      return new ApiError("detail_page_not_found", "Detail page not found.", 404);
    case "detail_page_invalid":
      return new ApiError("detail_page_invalid", "Detail page payload is invalid.", 400);
    case "detail_page_conflict":
      return new ApiError("detail_page_conflict", "Detail page id conflict.", 409);
    case "detail_page_route_conflict":
      return new ApiError(
        "detail_page_route_conflict",
        "Detail page is still linked from site content routes.",
        409
      );
    case "detail_page_content_type_mismatch":
      return new ApiError(
        "detail_page_content_type_mismatch",
        "Detail page content type does not match the existing document.",
        409
      );
    case "detail_page_status_requires_lifecycle":
      return new ApiError(
        "detail_page_status_requires_lifecycle",
        "Detail page CRUD routes accept draft documents only. Use lifecycle routes to publish or unpublish.",
        409
      );
    case "detail_page_revision_not_found":
      return new ApiError("detail_page_revision_not_found", "Detail page revision not found.", 404);
    case "detail_page_revision_delete_forbidden":
      return new ApiError(
        "detail_page_revision_delete_forbidden",
        "Only autosave detail page revisions can be discarded.",
        409
      );
    default:
      return null;
  }
};

const withDetailPageErrors = async <T>(fn: () => Promise<T>) => {
  try {
    return await fn();
  } catch (error) {
    if (error instanceof ApiError) throw error;
    const mapped = mapDetailPageError(error);
    if (mapped) throw mapped;
    throw error;
  }
};

export function registerDetailPageRoutes(router: Router, deps: DetailPageRouteDeps) {
  const { requirePermission, validate } = deps;

  router.get("/detail-pages", requirePermission("content:read"), async (ctx) => {
    return withDetailPageErrors(async () => {
      validate(detailPageListQuerySchema, ctx.query ?? {});
      const contentTypeId = ctx.query.contentTypeId?.trim() || null;
      const items = await listDetailPageDocuments({ contentTypeId });
      return { items };
    });
  });

  router.get("/detail-pages/:id", requirePermission("content:read"), async (ctx) => {
    return withDetailPageErrors(async () => {
      const item = await getDetailPageDocument(ctx.params.id);
      if (!item) throw new Error("detail_page_not_found");
      return item;
    });
  });

  router.post("/detail-pages", requirePermission("content:write"), async (ctx) => {
    return withDetailPageErrors(async () => {
      validate(detailPageCreateSchema, ctx.body);
      const body = ctx.body as { document: unknown };
      return (
        await createDetailPageDraftDocument({
          document: body.document,
        })
      ).record;
    });
  });

  router.patch("/detail-pages/:id", requirePermission("content:write"), async (ctx) => {
    return withDetailPageErrors(async () => {
      validate(detailPageUpdateSchema, ctx.body);
      const body = ctx.body as { document: unknown };
      return (
        await updateDetailPageDraftDocument(ctx.params.id, {
          document: body.document,
        })
      ).record;
    });
  });

  router.delete("/detail-pages/:id", requirePermission("content:write"), async (ctx) => {
    return withDetailPageErrors(async () => {
      await deleteDetailPageDocument(ctx.params.id);
      return { ok: true };
    });
  });

  router.post("/detail-pages/:id/preview", requirePermission("content:read"), async (ctx) => {
    return withDetailPageErrors(async () => {
      validate(detailPagePreviewSchema, ctx.body);
      const body = ctx.body as { sampleEntryId: string; ttlMinutes?: number };
      const { token, expiresAt } = await issueDetailPagePreview({
        detailPageId: ctx.params.id,
        sampleEntryId: body.sampleEntryId,
        ttlMinutes: body.ttlMinutes,
      });
      const previewUrl = await resolvePreviewUrl(
        {
          targetType: "detail-page",
          token,
        },
        createPublicUrlContextFromHeaders(ctx.headers)
      );

      return {
        token,
        previewUrl,
        expiresAt,
      };
    });
  });

  router.post("/detail-pages/:id/publish", requirePermission("content:publish"), async (ctx) => {
    return withDetailPageErrors(async () => {
      validate(detailPageEmptyLifecycleSchema, ctx.body ?? {});
      if (!ctx.user?.id) throw new Error("auth_required");
      await publishDetailPageDocument(ctx.params.id, ctx.user.id);
      return { ok: true };
    });
  });

  router.post("/detail-pages/:id/unpublish", requirePermission("content:publish"), async (ctx) => {
    return withDetailPageErrors(async () => {
      validate(detailPageEmptyLifecycleSchema, ctx.body ?? {});
      await unpublishDetailPageDocument(ctx.params.id);
      return { ok: true };
    });
  });

  router.post("/detail-pages/:id/autosave", requirePermission("content:write"), async (ctx) => {
    return withDetailPageErrors(async () => {
      validate(detailPageAutosaveSchema, ctx.body);
      if (!ctx.user?.id) throw new Error("auth_required");
      const body = ctx.body as { document: unknown };
      return autosaveDetailPageDocument(
        ctx.params.id,
        {
          document: body.document,
        },
        ctx.user.id
      );
    });
  });

  router.get("/detail-pages/:id/revisions", requirePermission("content:read"), async (ctx) => {
    return withDetailPageErrors(async () => listDetailPageRevisions(ctx.params.id));
  });

  router.post(
    "/detail-pages/:id/revisions/:revisionId/restore",
    requirePermission("content:write"),
    async (ctx) => {
      return withDetailPageErrors(async () => {
        const result = await restoreDetailPageRevision(ctx.params.id, ctx.params.revisionId);
        return { ok: true, ...result };
      });
    }
  );

  router.delete(
    "/detail-pages/:id/revisions/:revisionId",
    requirePermission("content:write"),
    async (ctx) => {
      return withDetailPageErrors(async () => {
        await discardDetailPageAutosaveRevision(ctx.params.id, ctx.params.revisionId);
        return { ok: true };
      });
    }
  );
}
