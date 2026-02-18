import { ApiError } from "../errorHandler";
import type { RouteContext } from "../router";
import {
  createListingQuery,
  deleteListingQuery,
  getListingQuery,
  listListingQueries,
  previewListingQuery,
  updateListingQuery,
} from "../../services/content/listingQueriesService";
import {
  createListingTemplate,
  deleteListingTemplate,
  getListingTemplate,
  listListingTemplates,
  updateListingTemplate,
} from "../../services/content/listingTemplatesService";
import {
  listingQueryCreateSchema,
  listingQuerySchema,
  listingQueryUpdateSchema,
  listingTemplateCreateSchema,
  listingTemplateUpdateSchema,
} from "../validation/listingSchemas";

export type ListingsRouteHandler = (ctx: RouteContext) => Promise<unknown> | unknown;

export type ListingsRouteDeps = {
  requirePermission: (permission: string) => ListingsRouteHandler;
  validate: (schema: unknown, payload: unknown) => void;
};

export type Router = {
  get: (path: string, ...handlers: ListingsRouteHandler[]) => void;
  post: (path: string, ...handlers: ListingsRouteHandler[]) => void;
  patch: (path: string, ...handlers: ListingsRouteHandler[]) => void;
  delete: (path: string, ...handlers: ListingsRouteHandler[]) => void;
};

const mapListingError = (error: unknown) => {
  if (!(error instanceof Error)) return null;
  switch (error.message) {
    case "listing_query_not_found":
      return new ApiError("listing_query_not_found", "Listing query not found", 404);
    case "listing_template_invalid":
      return new ApiError("listing_template_invalid", "Listing template payload is invalid", 400);
    case "listing_template_slug_required":
      return new ApiError("listing_template_slug_required", "Listing template slug is required", 400);
    case "listing_template_slug_exists":
      return new ApiError("listing_template_slug_exists", "Listing template slug already exists", 409);
    case "listing_template_layout_invalid":
      return new ApiError("listing_template_layout_invalid", "Listing template layout is invalid", 400);
    case "listing_template_config_invalid":
      return new ApiError("listing_template_config_invalid", "Listing template config is invalid", 400);
    case "listing_template_not_found":
      return new ApiError("listing_template_not_found", "Listing template not found", 404);
    default:
      return null;
  }
};

const withListingErrors = async <T>(fn: () => Promise<T>) => {
  try {
    return await fn();
  } catch (error) {
    if (error instanceof ApiError) {
      throw error;
    }
    const mapped = mapListingError(error);
    if (mapped) throw mapped;
    throw error;
  }
};

export function registerListingsRoutes(
  router: Router,
  deps: ListingsRouteDeps
) {
  const { requirePermission, validate } = deps;

  router.get("/listings/queries", requirePermission("content:read"), async () => {
    return withListingErrors(async () => {
      const items = await listListingQueries();
      return { items };
    });
  });

  router.get(
    "/listings/queries/:id",
    requirePermission("content:read"),
    async (ctx) => {
      return withListingErrors(async () => {
        const query = await getListingQuery(ctx.params.id);
        if (!query) {
          throw new Error("listing_query_not_found");
        }
        return query;
      });
    }
  );

  router.post(
    "/listings/queries/preview",
    requirePermission("content:read"),
    async (ctx) => {
      return withListingErrors(async () => {
        validate(listingQuerySchema, ctx.body ?? {});
        return previewListingQuery(ctx.body ?? {});
      });
    }
  );

  router.post(
    "/listings/queries",
    requirePermission("content:write"),
    async (ctx) => {
      return withListingErrors(async () => {
        validate(listingQueryCreateSchema, ctx.body ?? {});
        return createListingQuery(ctx.body ?? {});
      });
    }
  );

  router.patch(
    "/listings/queries/:id",
    requirePermission("content:write"),
    async (ctx) => {
      return withListingErrors(async () => {
        validate(listingQueryUpdateSchema, ctx.body ?? {});
        const updated = await updateListingQuery(
          ctx.params.id,
          ctx.body ?? {}
        );
        if (!updated) {
          throw new Error("listing_query_not_found");
        }
        return updated;
      });
    }
  );

  router.delete(
    "/listings/queries/:id",
    requirePermission("content:write"),
    async (ctx) => {
      return withListingErrors(async () => {
        const removed = await deleteListingQuery(ctx.params.id);
        if (!removed) {
          throw new Error("listing_query_not_found");
        }
        return { ok: true };
      });
    }
  );

  router.get("/listings/templates", requirePermission("content:read"), async () => {
    return withListingErrors(async () => {
      const items = await listListingTemplates();
      return { items };
    });
  });

  router.get(
    "/listings/templates/:id",
    requirePermission("content:read"),
    async (ctx) => {
      return withListingErrors(async () => {
        const template = await getListingTemplate(ctx.params.id);
        if (!template) {
          throw new Error("listing_template_not_found");
        }
        return template;
      });
    }
  );

  router.post(
    "/listings/templates",
    requirePermission("content:write"),
    async (ctx) => {
      return withListingErrors(async () => {
        validate(listingTemplateCreateSchema, ctx.body ?? {});
        return createListingTemplate(
          ctx.body as {
            name: string;
            slug?: string | null;
            description?: string | null;
            layout?: "grid" | "list" | "table" | "calendar" | "map";
            config?: unknown;
          }
        );
      });
    }
  );

  router.patch(
    "/listings/templates/:id",
    requirePermission("content:write"),
    async (ctx) => {
      return withListingErrors(async () => {
        validate(listingTemplateUpdateSchema, ctx.body ?? {});
        const updated = await updateListingTemplate(
          ctx.params.id,
          ctx.body as {
            name?: string;
            slug?: string | null;
            description?: string | null;
            layout?: "grid" | "list" | "table" | "calendar" | "map";
            config?: unknown;
          }
        );
        if (!updated) {
          throw new Error("listing_template_not_found");
        }
        return updated;
      });
    }
  );

  router.delete(
    "/listings/templates/:id",
    requirePermission("content:write"),
    async (ctx) => {
      return withListingErrors(async () => {
        const removed = await deleteListingTemplate(ctx.params.id);
        if (!removed) {
          throw new Error("listing_template_not_found");
        }
        return { ok: true };
      });
    }
  );
}
