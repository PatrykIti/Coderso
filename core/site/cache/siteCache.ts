import type { ContentRouteSetting } from "../../services/settings/settingsService";
import { getSetting } from "../../services/settings/settingsService";

export const DEFAULT_SITE_CACHE_TTL_SECONDS = 30;
export const SITE_CACHE_MAX_ENTRIES = 200;

export type SiteCacheEntry = {
  value: string;
  expiresAt: number;
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

export const buildSiteCacheKey = (profileId: string, path: string) =>
  `${profileId}|${path}`;

export const normalizeSitePath = (value: string) => {
  const trimmed = value.trim();
  if (!trimmed) return "/";
  const prefixed = trimmed.startsWith("/") ? trimmed : `/${trimmed}`;
  return prefixed.length > 1 && prefixed.endsWith("/")
    ? prefixed.slice(0, -1)
    : prefixed;
};

export const configureSiteCache = (ttlSeconds: number) => {
  if (ttlSeconds !== cachedTtlSeconds) {
    cachedTtlSeconds = ttlSeconds;
    cache.clear();
  }
  return cachedTtlSeconds;
};

export const getSiteCacheEntry = (key: string, now?: number) =>
  cache.get(key, now);

export const setSiteCacheEntry = (
  key: string,
  value: string,
  ttlSeconds: number,
  now?: number
) => {
  cache.set(key, value, ttlSeconds, now);
};

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
    options.routes ??
    ((await getSetting("site.contentRoutes")) as ContentRouteSetting[]);
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
