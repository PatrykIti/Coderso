import {
  createContentType,
  deleteContentType,
  duplicateContentType,
  getContentType,
  listContentTypes,
  updateContentType,
} from "../../services/content/typeService";
import { getCollectionWorkspaceSummary } from "../../services/content/collectionWorkspaceService";
import { getUserPermissions } from "../../services/auth/roleService";
import { ApiError } from "../errorHandler";
import {
  contentTypeCreateSchema,
  contentTypeDuplicateSchema,
  contentTypeUpdateSchema,
} from "../validation/contentSchemas";

export type RouteContext = {
  params: Record<string, string>;
  query: Record<string, string | undefined>;
  body: unknown;
  user?: { id: string };
};

export type RouteHandler = (ctx: RouteContext) => Promise<unknown> | unknown;

export type Router = {
  get: (path: string, ...handlers: RouteHandler[]) => void;
  post: (path: string, ...handlers: RouteHandler[]) => void;
  patch: (path: string, ...handlers: RouteHandler[]) => void;
  delete: (path: string, ...handlers: RouteHandler[]) => void;
};

export type ContentTypeRouteDeps = {
  requirePermission: (permission: string) => RouteHandler;
  validate: (schema: unknown, payload: unknown) => void;
  resolvePermissions?: (ctx: RouteContext) => Promise<string[]> | string[];
};

const mapContentTypeError = (error: unknown) => {
  if (!(error instanceof Error)) return null;
  switch (error.message) {
    case "content_type_not_found":
      return new ApiError("content_type_not_found", "Content type not found.", 404);
    case "content_type_name_required":
    case "content_type_slug_required":
    case "content_type_slug_invalid":
    case "content_type_status_invalid":
    case "content_type_name_generated_uuid":
    case "content_type_duplicate_slug_unavailable":
    case "content_type_duplicate_name_unavailable":
    case "content_type_config_invalid":
      return new ApiError(error.message, "Content type payload is invalid.", 400);
    case "content_type_name_exists":
      return new ApiError("content_type_name_exists", "Content type name already exists.", 409);
    case "content_type_slug_exists":
      return new ApiError("content_type_slug_exists", "Content type slug already exists.", 409);
    case "content_type_has_entries":
      return new ApiError("content_type_has_entries", "Content type has entries.", 409);
    case "content_type_has_custom_screens":
      return new ApiError(
        "content_type_has_custom_screens",
        "Content type is used by custom screens.",
        409
      );
    case "content_type_has_taxonomies":
      return new ApiError(
        "content_type_has_taxonomies",
        "Content type is used by taxonomies.",
        409
      );
    case "content_type_has_content_routes":
      return new ApiError(
        "content_type_has_content_routes",
        "Content type is used by content routes.",
        409
      );
    case "content_type_has_listings":
      return new ApiError("content_type_has_listings", "Content type is used by listings.", 409);
    case "content_type_has_detail_pages":
      return new ApiError(
        "content_type_has_detail_pages",
        "Content type is used by detail pages.",
        409
      );
    default:
      return null;
  }
};

const withContentTypeErrors = async <T>(fn: () => Promise<T>) => {
  try {
    return await fn();
  } catch (error) {
    if (error instanceof ApiError) throw error;
    const mapped = mapContentTypeError(error);
    if (mapped) throw mapped;
    throw error;
  }
};

const resolveRoutePermissions = async (
  ctx: RouteContext,
  resolvePermissions?: ContentTypeRouteDeps["resolvePermissions"]
) => {
  if (resolvePermissions) return resolvePermissions(ctx);
  if (!ctx.user?.id) return ["content:read"];
  return getUserPermissions(ctx.user.id);
};

export function registerContentTypeRoutes(router: Router, deps: ContentTypeRouteDeps) {
  const { requirePermission, validate, resolvePermissions } = deps;

  router.get("/content-types", requirePermission("content:read"), async () => {
    return withContentTypeErrors(() => listContentTypes());
  });

  router.get("/content-types/:id", requirePermission("content:read"), async (ctx) => {
    return withContentTypeErrors(async () => {
      const result = await getContentType(ctx.params.id);
      if (!result) throw new Error("content_type_not_found");
      return result;
    });
  });

  router.get(
    "/content-types/:id/collection-workspace",
    requirePermission("content:read"),
    async (ctx) =>
      withContentTypeErrors(async () =>
        getCollectionWorkspaceSummary(ctx.params.id, {
          permissions: await resolveRoutePermissions(ctx, resolvePermissions),
        })
      )
  );

  router.post("/content-types", requirePermission("content:write"), async (ctx) => {
    return withContentTypeErrors(async () => {
      validate(contentTypeCreateSchema, ctx.body);
      const body = ctx.body as {
        name: string;
        slug: string;
        schema: Record<string, unknown>;
        status?: "draft" | "published";
      };
      return createContentType(body);
    });
  });

  router.post("/content-types/:id/duplicate", requirePermission("content:write"), async (ctx) => {
    return withContentTypeErrors(async () => {
      validate(contentTypeDuplicateSchema, ctx.body ?? {});
      const body = ctx.body as { name?: string; slug?: string } | undefined;
      const duplicated = await duplicateContentType(ctx.params.id, body ?? {});
      if (!duplicated) throw new Error("content_type_not_found");
      return duplicated;
    });
  });

  router.patch("/content-types/:id", requirePermission("content:write"), async (ctx) => {
    return withContentTypeErrors(async () => {
      validate(contentTypeUpdateSchema, ctx.body);
      const body = ctx.body as {
        name?: string;
        slug?: string;
        schema?: Record<string, unknown>;
        status?: "draft" | "published";
      };
      const updated = await updateContentType(ctx.params.id, body);
      if (!updated) throw new Error("content_type_not_found");
      return updated;
    });
  });

  router.delete("/content-types/:id", requirePermission("content:write"), async (ctx) => {
    return withContentTypeErrors(async () => {
      const removed = await deleteContentType(ctx.params.id);
      if (!removed) throw new Error("content_type_not_found");
      return { ok: true };
    });
  });
}
