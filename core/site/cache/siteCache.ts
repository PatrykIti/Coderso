import type { WidgetBlock } from "../../widgets/types";
import type { ContentRouteSetting } from "../../services/settings/settingsContracts";
import { getSetting } from "../../services/settings/settingsService";
import { matchContentRoute } from "../contentRouteMatcher";

export const DEFAULT_SITE_CACHE_TTL_SECONDS = 30;
export const SITE_CACHE_MAX_ENTRIES = 200;

export type SiteCacheEntry = {
  value: string;
  expiresAt: number;
};

const hasRuntimeSubmissionNonce = (block: WidgetBlock): boolean => {
  const blockData =
    block.data && typeof block.data === "object" && !Array.isArray(block.data)
      ? (block.data as Record<string, unknown>)
      : null;
  const resolved =
    blockData?.resolved &&
    typeof blockData.resolved === "object" &&
    !Array.isArray(blockData.resolved)
      ? (blockData.resolved as Record<string, unknown>)
      : null;
  if (typeof resolved?.submissionNonce === "string" && resolved.submissionNonce.trim().length > 0) {
    return true;
  }

  const slotBlocks = block.slots ? Object.values(block.slots).flat() : [];
  if (slotBlocks.some(hasRuntimeSubmissionNonce)) {
    return true;
  }

  if (Array.isArray(block.children) && block.children.some(hasRuntimeSubmissionNonce)) {
    return true;
  }

  return false;
};

class LruCache {
  private store = new Map<string, SiteCacheEntry>();
  private maxEntries: number;

  constructor(maxEntries: number) {
    this.maxEntries = maxEntries;
  }

  get(key: string, now = Date.now()) {
    const entry = this.store.get(key);
    if (!entry) return null;
    if (entry.expiresAt <= now) {
      this.store.delete(key);
      return null;
    }
    this.store.delete(key);
    this.store.set(key, entry);
    return entry.value;
  }

  set(key: string, value: string, ttlSeconds: number, now = Date.now()) {
    if (ttlSeconds <= 0) return;
    const expiresAt = now + ttlSeconds * 1000;
    if (expiresAt <= now) return;

    if (this.store.has(key)) {
      this.store.delete(key);
    }
    this.store.set(key, { value, expiresAt });
    if (this.store.size > this.maxEntries) {
      const oldestKey = this.store.keys().next().value as string | undefined;
      if (oldestKey) {
        this.store.delete(oldestKey);
      }
    }
  }

  delete(key: string) {
    this.store.delete(key);
  }

  clear() {
    this.store.clear();
  }

  keys() {
    return Array.from(this.store.keys());
  }

  size() {
    return this.store.size;
  }
}

let cache = new LruCache(SITE_CACHE_MAX_ENTRIES);
let cachedTtlSeconds = DEFAULT_SITE_CACHE_TTL_SECONDS;

/**
 * Param-aware site cache keys (TASK-459-04). The third segment is the
 * canonical listing-param signature (empty for plain paths); `|` never
 * appears in profile ids (uuid/default), normalized paths, or signatures
 * (URLSearchParams percent-encodes it), so the segments parse unambiguously.
 *
 * TASK-572: an optional fourth segment carries the LIST-route visibility
 * signature (empty for detail/static/homepage keys, so legacy keys stay
 * byte-identical). The signature changes on a public↔restricted transition,
 * which lands the stale anonymous body under a different key — fail-closed
 * transition fence without relying on TTL invalidation. The value is a
 * bounded `v1:<sha256-hex>` digest (no `|`), so path parsing and
 * path/route-based invalidation are unaffected.
 */
export const buildSiteCacheKey = (
  profileId: string,
  path: string,
  searchSignature = "",
  visibilitySignature = ""
) =>
  visibilitySignature
    ? `${profileId}|${path}|${searchSignature}|${visibilitySignature}`
    : `${profileId}|${path}|${searchSignature}`;

const readSiteCacheKeyPath = (key: string) => {
  const start = key.indexOf("|");
  if (start < 0) return key;
  const end = key.indexOf("|", start + 1);
  return end < 0 ? key.slice(start + 1) : key.slice(start + 1, end);
};

/**
 * Allowlist of query params that participate in cached rendering: the
 * listing runtime grammar (`lq.*`), legacy content-list pager params
 * (`cl.*`), and the entry-list route params (`page`, `sort`). Anything else
 * (tracking params, unknown input) makes the request uncacheable instead of
 * being dropped from the key — unknown params still leak into rendered pager
 * hrefs, so serving them from a normalized key could poison the cache.
 */
const listingRuntimeCacheParamPattern = new RegExp(
  "^lq\\.[A-Za-z0-9_-]{1,128}\\.(?:" +
    "__(?:sort|page|q)" +
    "|[A-Za-z0-9_.-]{1,160}\\.(?:eq|neq|in|nin|contains|startsWith|gt|gte|lt|lte|between|exists)" +
    ")$"
);
const contentListCacheParamPattern = /^cl\.[A-Za-z0-9_-]{1,128}\.page$/;

const isCacheableSiteSearchParam = (key: string) =>
  listingRuntimeCacheParamPattern.test(key) ||
  contentListCacheParamPattern.test(key) ||
  key === "page" ||
  key === "sort";

const SITE_CACHE_SEARCH_SIGNATURE_MAX_LENGTH = 512;

export type SiteCacheSearchSignature = {
  cacheable: boolean;
  signature: string;
};

/**
 * Canonicalizes a request's search params into a bounded cache-key signature
 * (TASK-459-04): allowlisted params only, sorted by key then value so every
 * param order maps to one cache entry, with a hard length cap so deep filter
 * combinations render uncached instead of fragmenting the cache.
 */
export const resolveSiteCacheSearchSignature = (
  searchParams: URLSearchParams
): SiteCacheSearchSignature => {
  const entries = [...searchParams.entries()];
  if (entries.length === 0) return { cacheable: true, signature: "" };
  if (!entries.every(([key]) => isCacheableSiteSearchParam(key))) {
    return { cacheable: false, signature: "" };
  }

  entries.sort(([leftKey, leftValue], [rightKey, rightValue]) => {
    if (leftKey !== rightKey) return leftKey < rightKey ? -1 : 1;
    if (leftValue === rightValue) return 0;
    return leftValue < rightValue ? -1 : 1;
  });

  const canonical = new URLSearchParams();
  for (const [key, value] of entries) {
    canonical.append(key, value);
  }
  const signature = canonical.toString();
  if (signature.length > SITE_CACHE_SEARCH_SIGNATURE_MAX_LENGTH) {
    return { cacheable: false, signature: "" };
  }
  return { cacheable: true, signature };
};

export const normalizeSitePath = (value: string) => {
  const trimmed = value.trim();
  if (!trimmed) return "/";
  const prefixed = trimmed.startsWith("/") ? trimmed : `/${trimmed}`;
  return prefixed.length > 1 && prefixed.endsWith("/") ? prefixed.slice(0, -1) : prefixed;
};

export const configureSiteCache = (ttlSeconds: number) => {
  if (ttlSeconds !== cachedTtlSeconds) {
    cachedTtlSeconds = ttlSeconds;
    cache.clear();
  }
  return cachedTtlSeconds;
};

export const getSiteCacheEntry = (key: string, now?: number) => cache.get(key, now);

export const setSiteCacheEntry = (key: string, value: string, ttlSeconds: number, now?: number) => {
  cache.set(key, value, ttlSeconds, now);
};

export const blocksAllowSiteHtmlCache = (blocks: WidgetBlock[]) =>
  !blocks.some(hasRuntimeSubmissionNonce);

export const clearSiteCache = () => {
  cache.clear();
};

export const invalidateSiteCachePath = (path: string) => {
  const normalized = normalizeSitePath(path);
  for (const key of cache.keys()) {
    // Drops every filtered/paged variant of the path as well (TASK-459-04).
    if (readSiteCacheKeyPath(key) === normalized) {
      cache.delete(key);
    }
  }
};

export const invalidateContentRouteCache = (route: ContentRouteSetting) => {
  for (const key of cache.keys()) {
    if (matchContentRoute(readSiteCacheKeyPath(key), [route])) {
      cache.delete(key);
    }
  }
};

export const invalidateContentRouteCacheTransition = (options: {
  previousRoutes: ContentRouteSetting[];
  nextRoutes: ContentRouteSetting[];
  typeSlug: string;
}) => {
  const previous = options.previousRoutes.find((entry) => entry.type === options.typeSlug) ?? null;
  const next = options.nextRoutes.find((entry) => entry.type === options.typeSlug) ?? null;

  if (previous) {
    invalidateContentRouteCache(previous);
  }

  if (
    next &&
    (!previous ||
      previous.listPath !== next.listPath ||
      previous.detailPath !== next.detailPath ||
      previous.enabled !== next.enabled ||
      (previous.detailPageId ?? null) !== (next.detailPageId ?? null))
  ) {
    invalidateContentRouteCache(next);
  }
};

export async function invalidateLinkedDetailPageRouteCaches(routes?: ContentRouteSetting[]) {
  const resolvedRoutes =
    routes ?? ((await getSetting("site.contentRoutes")) as ContentRouteSetting[] | null) ?? [];

  for (const route of resolvedRoutes) {
    if (!route.enabled) continue;
    if (!route.detailPageId) continue;
    invalidateContentRouteCache(route);
  }
}

export const resolveContentEntryPaths = (options: {
  routes: ContentRouteSetting[];
  typeSlug: string;
  entrySlug: string;
  entryId?: string;
}) => {
  const route = options.routes.find((entry) => entry.type === options.typeSlug);
  if (!route) return null;

  const listPath = normalizeSitePath(route.listPath);
  let detailPath = route.detailPath;
  if (detailPath.includes(":slug")) {
    detailPath = detailPath.replace(":slug", encodeURIComponent(options.entrySlug));
  } else if (options.entryId && detailPath.includes(":id")) {
    detailPath = detailPath.replace(":id", encodeURIComponent(options.entryId));
  }

  return {
    listPath,
    detailPath: normalizeSitePath(detailPath),
  };
};

export async function invalidateContentEntryCache(options: {
  typeSlug: string;
  entrySlug: string;
  entryId?: string;
  routes?: ContentRouteSetting[];
}) {
  const routes =
    options.routes ?? ((await getSetting("site.contentRoutes")) as ContentRouteSetting[]);
  const paths = resolveContentEntryPaths({
    routes,
    typeSlug: options.typeSlug,
    entrySlug: options.entrySlug,
    entryId: options.entryId,
  });
  if (!paths) return;
  invalidateSiteCachePath(paths.listPath);
  invalidateSiteCachePath(paths.detailPath);
}

export const getSiteCacheStats = () => ({
  size: cache.size(),
  ttlSeconds: cachedTtlSeconds,
  maxEntries: SITE_CACHE_MAX_ENTRIES,
});
