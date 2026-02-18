import {
  buildSearchCategories,
  normalizeSearchQuery,
  searchAll,
} from "../../services/search/searchService";
import { searchPublicIndex } from "../../services/search/searchIndexService";
import {
  listRecentSearches,
  recordSearch,
} from "../../services/search/searchHistoryService";
import { getSetting, type ContentRouteSetting } from "../../services/settings/settingsService";

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

export type SearchRouteDeps = {
  requirePermission: (permission: string) => RouteHandler;
};

function parseLimit(input: string | undefined) {
  if (!input) return undefined;
  const value = Number(input);
  if (!Number.isFinite(value)) return undefined;
  return value;
}

export function registerSearchRoutes(router: Router, deps: SearchRouteDeps) {
  const { requirePermission } = deps;

  router.get("/search", requirePermission("content:read"), async (ctx) => {
    const query = ctx.query.q ?? "";
    const normalized = normalizeSearchQuery(query);
    const limit = parseLimit(ctx.query.limit);
    if (normalized.length < 2) {
      return { items: [], categories: [] };
    }
    const items = await searchAll(query, { limit });
    const categories = await buildSearchCategories(items);
    if (ctx.user?.id && normalized.length >= 2) {
      await recordSearch(ctx.user.id, normalized, {
        limit: limit ?? undefined,
      });
    }
    return { items, categories };
  });

  router.get(
    "/search/recent",
    requirePermission("content:read"),
    async (ctx) => {
      if (!ctx.user?.id) return { items: [] };
      const items = await listRecentSearches(ctx.user.id, 10);
      return { items };
    }
  );

  router.get(
    "/search/public-preview",
    requirePermission("content:read"),
    async (ctx) => {
      const query = ctx.query.q ?? "";
      const limit = parseLimit(ctx.query.limit);
      const sources = ctx.query.sources ?? undefined;
      const contentRoutes = (await getSetting("site.contentRoutes")) as ContentRouteSetting[];

      return searchPublicIndex(query, {
        ...(limit !== undefined ? { limit } : {}),
        ...(sources ? { sources } : {}),
        contentRoutes,
      });
    }
  );
}
