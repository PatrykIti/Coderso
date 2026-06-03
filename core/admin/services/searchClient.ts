import { apiRequest } from "./apiClient";
import { cacheKeys, cacheTtlMs, createBoundedCacheKeySegment } from "@/services/cachePolicy";
import {
  clearLocalCache,
  createMemoryBackedLocalCache,
  type MemoryBackedStorageCache,
} from "@/utils/storageCache";
import type { SearchDateRange, SearchResponseMeta } from "../../services/search/searchContract";

export {
  DEFAULT_SEARCH_DATE_RANGE,
  normalizeSearchDateRange,
  searchDateRanges,
} from "../../services/search/searchContract";
export type { SearchDateRange, SearchResponseMeta } from "../../services/search/searchContract";

export type SearchResultItem = {
  id: string;
  title: string;
  slug?: string | null;
  type: "page" | "entry" | "media" | "user";
  updatedAt: string;
  categoryId?: string;
  categoryLabel?: string;
  entryTypeSlug?: string;
};

export type SearchResponse = {
  items: SearchResultItem[];
  categories?: Array<{
    id: string;
    label: string;
    count: number;
  }>;
  meta?: SearchResponseMeta;
};

export type RecentSearchItem = {
  query: string;
  createdAt: string;
};

export type SearchAllOptions = {
  limit?: number;
  dateRange?: SearchDateRange;
  signal?: AbortSignal;
};

export type SearchAllCachedOptions = SearchAllOptions & {
  force?: boolean;
};

type SearchCacheOptions = Pick<SearchAllOptions, "limit" | "dateRange">;

let cachedRecentSearchesPromise: Promise<RecentSearchItem[]> | null = null;
const cachedSearchResponses = new Map<string, MemoryBackedStorageCache<SearchResponse>>();
const cachedSearchResponsePromises = new Map<string, Promise<SearchResponse>>();

const recentSearchesLimit = 10;

const isRecord = (value: unknown): value is Record<string, unknown> =>
  Boolean(value && typeof value === "object");

const isSearchResponse = (value: unknown): value is SearchResponse =>
  isRecord(value) && Array.isArray(value.items);

const isRecentSearchList = (value: unknown): value is RecentSearchItem[] => Array.isArray(value);

const recentSearchesCache = createMemoryBackedLocalCache({
  key: cacheKeys.searchRecent,
  ttlMs: cacheTtlMs.list,
  validate: isRecentSearchList,
});

const buildSearchResponseQueryKey = (query: string, options?: SearchCacheOptions) => {
  const queryKey = createBoundedCacheKeySegment(query, "empty");
  const limitKey = options?.limit === undefined ? "default" : String(options.limit);
  const dateRangeKey = options?.dateRange ?? "default";
  return `q:${queryKey}:limit:${limitKey}:date:${dateRangeKey}`;
};

export const getSearchResultsCacheKey = (query: string, options?: SearchCacheOptions) =>
  cacheKeys.searchResults(buildSearchResponseQueryKey(query, options));

const getSearchResponseCache = (key: string) => {
  const existing = cachedSearchResponses.get(key);
  if (existing) return existing;
  const created = createMemoryBackedLocalCache({
    key,
    ttlMs: cacheTtlMs.list,
    validate: isSearchResponse,
  });
  cachedSearchResponses.set(key, created);
  return created;
};

const writeRecentSearchesCache = (items: RecentSearchItem[]) => {
  cachedRecentSearchesPromise = null;
  recentSearchesCache.write(items.slice(0, recentSearchesLimit));
};

const rememberRecentSearch = (query: string) => {
  const normalized = query.trim();
  if (!normalized) return;
  const current = getCachedRecentSearches() ?? [];
  writeRecentSearchesCache([
    { query: normalized, createdAt: new Date().toISOString() },
    ...current.filter((item) => item.query !== normalized),
  ]);
};

export const getCachedRecentSearches = () => recentSearchesCache.read();

export const getCachedSearchResults = (query: string, options?: SearchCacheOptions) =>
  getSearchResponseCache(getSearchResultsCacheKey(query, options)).read();

export const clearRecentSearchesCache = () => {
  cachedRecentSearchesPromise = null;
  recentSearchesCache.clear();
};

export const clearSearchResultCache = (query: string, options?: SearchCacheOptions) => {
  const key = getSearchResultsCacheKey(query, options);
  cachedSearchResponsePromises.delete(key);
  cachedSearchResponses.get(key)?.clear();
  cachedSearchResponses.delete(key);
  clearLocalCache(key);
};

export const clearSearchResultsCache = () => {
  for (const [key, cache] of cachedSearchResponses) {
    cache.clear();
    clearLocalCache(key);
  }
  cachedSearchResponses.clear();
  cachedSearchResponsePromises.clear();
};

export const clearSearchCache = () => {
  clearRecentSearchesCache();
  clearSearchResultsCache();
};

export async function searchAll(query: string, options?: SearchAllOptions) {
  const params = new URLSearchParams();
  if (query) params.set("q", query);
  if (options?.limit) params.set("limit", String(options.limit));
  if (options?.dateRange) params.set("dateRange", options.dateRange);
  const suffix = params.toString();
  const path = suffix ? `/search?${suffix}` : "/search";
  return apiRequest<SearchResponse>(path, {
    method: "GET",
    signal: options?.signal,
  });
}

export async function searchAllCached(query: string, options: SearchAllCachedOptions = {}) {
  const { force, signal, limit, dateRange } = options;
  const cacheOptions: SearchCacheOptions = {};
  if (limit !== undefined) cacheOptions.limit = limit;
  if (dateRange !== undefined) cacheOptions.dateRange = dateRange;
  const key = getSearchResultsCacheKey(query, cacheOptions);
  const cache = getSearchResponseCache(key);
  if (!force) {
    const cached = cache.read();
    if (cached) {
      rememberRecentSearch(query);
      return cached;
    }
    const pending = cachedSearchResponsePromises.get(key);
    if (pending) return pending;
  }

  const requestOptions: SearchAllOptions = { ...cacheOptions };
  if (signal !== undefined) requestOptions.signal = signal;
  const request = searchAll(query, requestOptions);
  cachedSearchResponsePromises.set(key, request);
  try {
    const response = await request;
    cache.write(response);
    rememberRecentSearch(query);
    return response;
  } finally {
    if (cachedSearchResponsePromises.get(key) === request) {
      cachedSearchResponsePromises.delete(key);
    }
  }
}

export async function listRecentSearches() {
  const response = await apiRequest<{ items: RecentSearchItem[] }>("/search/recent", {
    method: "GET",
  });
  return response.items ?? [];
}

export async function listRecentSearchesCached(options?: { force?: boolean }) {
  if (!options?.force) {
    const cached = getCachedRecentSearches();
    if (cached) return cached;
    if (cachedRecentSearchesPromise) return cachedRecentSearchesPromise;
  }
  const request = listRecentSearches();
  cachedRecentSearchesPromise = request;
  const items = await request;
  writeRecentSearchesCache(items);
  return items;
}
