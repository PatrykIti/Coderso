import { ApiError } from "../errorHandler";
import {
  getListingQuery,
  previewListingQuery,
} from "../../services/content/listingQueriesService";
import {
  parseListingRuntimeOverrides,
  resolveListingRuntimeOverrides,
} from "../../services/search/filterEngine";
import { listingFilterPreviewSchema } from "../validation/filterSchemas";

export type RouteContext = {
  params: Record<string, string>;
  query: Record<string, string | undefined>;
  body: unknown;
};

export type RouteHandler = (ctx: RouteContext) => Promise<unknown> | unknown;

export type Router = {
  get: (path: string, ...handlers: RouteHandler[]) => void;
  post: (path: string, ...handlers: RouteHandler[]) => void;
  patch: (path: string, ...handlers: RouteHandler[]) => void;
  delete: (path: string, ...handlers: RouteHandler[]) => void;
};

export type FilterRouteDeps = {
  requirePermission: (permission: string) => RouteHandler;
  validate: (schema: unknown, payload: unknown) => void;
};

type ListingFilterPreviewBody = {
  listingQueryId: string;
  queryString?: string;
};

export function registerFilterRoutes(router: Router, deps: FilterRouteDeps) {
  const { requirePermission, validate } = deps;

  router.post(
    "/filters/preview",
    requirePermission("content:read"),
    async (ctx) => {
      validate(listingFilterPreviewSchema, ctx.body ?? {});
      const body = ctx.body as ListingFilterPreviewBody;
      const listingQueryId = body.listingQueryId.trim();
      const listingQuery = await getListingQuery(listingQueryId);
      if (!listingQuery) {
        throw new ApiError("listing_query_not_found", "Listing query not found", 404);
      }

      const searchParams = new URLSearchParams(body.queryString ?? "");
      const draft = parseListingRuntimeOverrides(searchParams, listingQuery.id);
      const runtime = resolveListingRuntimeOverrides(listingQuery.query, draft);
      const preview = await previewListingQuery(runtime.query);

      return {
        listingQueryId: listingQuery.id,
        total: preview.total,
        limit: preview.limit,
        offset: preview.offset,
        rows: preview.rows,
        rejectedTokens: runtime.rejectedTokens,
        appliedFilters: runtime.appliedFilters,
        appliedSort: runtime.appliedSort,
        page: runtime.page,
        searchQuery: runtime.searchQuery,
      };
    }
  );
}
