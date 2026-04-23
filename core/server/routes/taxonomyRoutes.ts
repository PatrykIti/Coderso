import { ApiError } from "../errorHandler";
import type { RouteContext } from "../router";
import {
  createTerm,
  deleteTerm,
  getTaxonomyOverview,
  listTaxonomies,
  listTerms,
  setTaxonomyConfig,
  updateTerm,
} from "../../services/content/taxonomyService";
import {
  taxonomyConfigSchema,
  taxonomyTermCreateSchema,
  taxonomyTermUpdateSchema,
} from "../validation/taxonomySchemas";

export type TaxonomyRouteHandler = (
  ctx: RouteContext
) => Promise<unknown> | unknown;

export type TaxonomyRouteDeps = {
  requirePermission: (permission: string) => TaxonomyRouteHandler;
  validate: (schema: unknown, payload: unknown) => void;
};

export type Router = {
  get: (path: string, ...handlers: TaxonomyRouteHandler[]) => void;
  post: (path: string, ...handlers: TaxonomyRouteHandler[]) => void;
  patch: (path: string, ...handlers: TaxonomyRouteHandler[]) => void;
  delete: (path: string, ...handlers: TaxonomyRouteHandler[]) => void;
};

const TAXONOMY_UNEXPECTED_MESSAGE = "Could not load taxonomy terms.";

export const mapTaxonomyDomainError = (error: unknown) => {
  if (error instanceof ApiError) return error;

  if (
    error &&
    typeof error === "object" &&
    "code" in error &&
    typeof (error as { code?: unknown }).code === "string"
  ) {
    const dbError = error as {
      code: string;
      constraint?: string;
      detail?: string;
    };
    if (dbError.code === "23503") {
      if (dbError.constraint?.includes("content_terms_taxonomy_id")) {
        return new ApiError(
          "taxonomy_not_found",
          "Taxonomy not found",
          404
        );
      }
      return new ApiError(
        "taxonomy_reference_invalid",
        "Taxonomy reference invalid",
        400
      );
    }
    if (dbError.code === "23505") {
      if (dbError.constraint?.includes("content_taxonomies_type_kind_idx")) {
        return new ApiError(
          "taxonomy_kind_duplicate",
          "Taxonomy kind already enabled",
          400
        );
      }
      if (dbError.constraint?.includes("content_taxonomies_type_slug_idx")) {
        return new ApiError(
          "taxonomy_slug_duplicate",
          "Taxonomy slug already exists",
          400
        );
      }
      if (dbError.constraint?.includes("content_terms_taxonomy_slug_idx")) {
        return new ApiError("term_slug_duplicate", "Term slug already exists", 400);
      }
    }
  }

  if (!(error instanceof Error)) return null;
  switch (error.message) {
    case "term_name_required":
      return new ApiError("term_name_required", "Term name is required", 400);
    case "term_slug_invalid":
      return new ApiError("term_slug_invalid", "Term slug is invalid", 400);
    case "taxonomy_category_disabled":
      return new ApiError(
        "taxonomy_category_disabled",
        "Categories are disabled for this content type",
        400
      );
    case "taxonomy_tag_disabled":
      return new ApiError(
        "taxonomy_tag_disabled",
        "Tags are disabled for this content type",
        400
      );
    case "taxonomy_term_invalid":
      return new ApiError(
        "taxonomy_term_invalid",
        "Term does not belong to taxonomy",
        400
      );
    case "taxonomy_term_missing":
      return new ApiError("taxonomy_term_missing", "Term not found", 404);
    default:
      return null;
  }
};

export const mapTaxonomyRouteError = (error: unknown) =>
  mapTaxonomyDomainError(error) ??
  new ApiError("taxonomy_unexpected_error", TAXONOMY_UNEXPECTED_MESSAGE, 500);

const withTaxonomyErrors = async <T>(fn: () => Promise<T>) => {
  try {
    return await fn();
  } catch (error) {
    throw mapTaxonomyRouteError(error);
  }
};

export function registerTaxonomyRoutes(router: Router, deps: TaxonomyRouteDeps) {
  const { requirePermission, validate } = deps;

  router.get(
    "/content-types/:id/taxonomies",
    requirePermission("content:read"),
    async (ctx) => {
      return withTaxonomyErrors(async () => {
        const items = await listTaxonomies(ctx.params.id);
        return { items };
      });
    }
  );

  router.patch(
    "/content-types/:id/taxonomies",
    requirePermission("content:write"),
    async (ctx) => {
      return withTaxonomyErrors(async () => {
        validate(taxonomyConfigSchema, ctx.body);
        const body = ctx.body as { categories?: boolean; tags?: boolean };
        const items = await setTaxonomyConfig(ctx.params.id, body);
        return { items };
      });
    }
  );

  router.get(
    "/content-types/:id/terms",
    requirePermission("content:read"),
    async (ctx) => {
      return withTaxonomyErrors(async () => {
        return getTaxonomyOverview(ctx.params.id);
      });
    }
  );

  router.get(
    "/taxonomies/:id/terms",
    requirePermission("content:read"),
    async (ctx) => {
      return withTaxonomyErrors(async () => {
        return listTerms(ctx.params.id);
      });
    }
  );

  router.post(
    "/taxonomies/:id/terms",
    requirePermission("content:write"),
    async (ctx) => {
      return withTaxonomyErrors(async () => {
        validate(taxonomyTermCreateSchema, ctx.body);
        const body = ctx.body as { name: string; slug?: string | null };
        const created = await createTerm(ctx.params.id, {
          name: body.name,
          slug: body.slug ?? null,
        });
        if (!created) throw new Error("term_not_found");
        return created;
      });
    }
  );

  router.patch(
    "/terms/:id",
    requirePermission("content:write"),
    async (ctx) => {
      return withTaxonomyErrors(async () => {
        validate(taxonomyTermUpdateSchema, ctx.body);
        const body = ctx.body as { name?: string | null; slug?: string | null };
        const updated = await updateTerm(ctx.params.id, body);
        if (!updated) throw new Error("term_not_found");
        return updated;
      });
    }
  );

  router.delete(
    "/terms/:id",
    requirePermission("content:write"),
    async (ctx) => {
      return withTaxonomyErrors(async () => {
        const removed = await deleteTerm(ctx.params.id);
        if (!removed) throw new Error("term_not_found");
        return { ok: true };
      });
    }
  );
}
