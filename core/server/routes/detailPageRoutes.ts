import type { RouteContext } from "../router";
import { ApiError } from "../errorHandler";
import {
  createDetailPageDocument,
  deleteDetailPageDocument,
  getDetailPageDocument,
  listDetailPageDocuments,
  updateDetailPageDocument,
} from "../../services/content/detailPageDocumentService";
import {
  detailPageCreateSchema,
  detailPageListQuerySchema,
  detailPageUpdateSchema,
} from "../validation/detailPageSchemas";

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
        await createDetailPageDocument({
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
        await updateDetailPageDocument(ctx.params.id, {
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
}
