import type { WidgetBlock } from "../../widgets/types";
import type { ContentRouteSetting } from "../../services/settings/settingsService";
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

export const buildSiteCacheKey = (profileId: string, path: string) => `${profileId}|${path}`;

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
  const suffix = `|${normalized}`;
  for (const key of cache.keys()) {
    if (key.endsWith(suffix)) {
      cache.delete(key);
    }
  }
};

export const invalidateContentRouteCache = (route: ContentRouteSetting) => {
  for (const key of cache.keys()) {
    const separatorIndex = key.indexOf("|");
    const path = separatorIndex >= 0 ? key.slice(separatorIndex + 1) : key;
    if (matchContentRoute(path, [route])) {
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
