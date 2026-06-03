import { apiRequest } from "./apiClient";
import { cacheKeys, cacheTtlMs } from "@/services/cachePolicy";
import { createMemoryBackedLocalCache, type MemoryBackedStorageCache } from "@/utils/storageCache";

export type AnalyticsTotals = {
  pages: number;
  publishedPages: number;
  entries: number;
  media: number;
  users: number;
};

export type TrendPoint = {
  date: string;
  value: number;
};

export type AnalyticsOverview = {
  rangeDays: number;
  generatedAt: string;
  totals: AnalyticsTotals;
  current: AnalyticsTotals;
  previous: AnalyticsTotals;
  trend: TrendPoint[];
};

export type TopContentItem = {
  id: string;
  type: "page" | "entry";
  title: string;
  slug: string | null;
  updatedAt: string;
  score: number;
};

export type TopContentExport = {
  fileName: string;
  contentType: "text/csv";
  content: string;
  rangeDays: number;
  totalRows: number;
};

export type TopContentRequest = {
  limit: number;
  rangeDays: number;
  type?: "page" | "entry";
};

type CachedTopContentRequest = TopContentRequest & {
  force?: boolean;
};

const cachedOverviewPromises = new Map<string, Promise<AnalyticsOverview>>();
const cachedTopContentPromises = new Map<string, Promise<TopContentItem[]>>();
const overviewCaches = new Map<string, MemoryBackedStorageCache<AnalyticsOverview>>();
const topContentCaches = new Map<string, MemoryBackedStorageCache<TopContentItem[]>>();

const isRecord = (value: unknown): value is Record<string, unknown> =>
  Boolean(value && typeof value === "object");

const isAnalyticsOverview = (value: unknown): value is AnalyticsOverview =>
  isRecord(value) && Array.isArray(value.trend);

const isTopContentList = (value: unknown): value is TopContentItem[] => Array.isArray(value);

const getOverviewCacheKey = (rangeDays: number) => cacheKeys.analyticsOverview(rangeDays);

const getTopContentCacheKey = (options: TopContentRequest) =>
  cacheKeys.analyticsTopContent(options.rangeDays, options.limit, options.type ?? "all");

const getOverviewCache = (rangeDays: number) => {
  const key = getOverviewCacheKey(rangeDays);
  const existing = overviewCaches.get(key);
  if (existing) return existing;
  const created = createMemoryBackedLocalCache({
    key,
    ttlMs: cacheTtlMs.detail,
    validate: isAnalyticsOverview,
  });
  overviewCaches.set(key, created);
  return created;
};

const getTopContentCache = (options: TopContentRequest) => {
  const key = getTopContentCacheKey(options);
  const existing = topContentCaches.get(key);
  if (existing) return existing;
  const created = createMemoryBackedLocalCache({
    key,
    ttlMs: cacheTtlMs.list,
    validate: isTopContentList,
  });
  topContentCaches.set(key, created);
  return created;
};

export const getCachedOverview = (rangeDays: number) => getOverviewCache(rangeDays).read();

export const getCachedTopContent = (options: TopContentRequest) =>
  getTopContentCache(options).read();

export async function getOverview(rangeDays: number) {
  const params = new URLSearchParams({ rangeDays: String(rangeDays) });
  return apiRequest<AnalyticsOverview>(`/analytics/overview?${params}`, {
    method: "GET",
  });
}

export async function getOverviewCached(rangeDays: number, options?: { force?: boolean }) {
  const key = getOverviewCacheKey(rangeDays);
  const cache = getOverviewCache(rangeDays);
  if (!options?.force) {
    const cached = cache.read();
    if (cached) return cached;
    const pending = cachedOverviewPromises.get(key);
    if (pending) return pending;
  }
  const request = getOverview(rangeDays);
  cachedOverviewPromises.set(key, request);
  try {
    const overview = await request;
    cache.write(overview);
    return overview;
  } finally {
    if (cachedOverviewPromises.get(key) === request) {
      cachedOverviewPromises.delete(key);
    }
  }
}

export async function getTopContent(options: TopContentRequest) {
  const params = new URLSearchParams({
    limit: String(options.limit),
    rangeDays: String(options.rangeDays),
  });
  if (options.type) params.set("type", options.type);
  return apiRequest<TopContentItem[]>(`/analytics/top-content?${params}`, {
    method: "GET",
  });
}

export async function getTopContentCached(options: CachedTopContentRequest) {
  const { force, ...requestOptions } = options;
  const key = getTopContentCacheKey(requestOptions);
  const cache = getTopContentCache(requestOptions);
  if (!force) {
    const cached = cache.read();
    if (cached) return cached;
    const pending = cachedTopContentPromises.get(key);
    if (pending) return pending;
  }
  const request = getTopContent(requestOptions);
  cachedTopContentPromises.set(key, request);
  try {
    const items = await request;
    cache.write(items);
    return items;
  } finally {
    if (cachedTopContentPromises.get(key) === request) {
      cachedTopContentPromises.delete(key);
    }
  }
}

export async function exportTopContent(options: TopContentRequest) {
  const params = new URLSearchParams({
    limit: String(options.limit),
    rangeDays: String(options.rangeDays),
    format: "csv",
  });
  if (options.type) params.set("type", options.type);
  return apiRequest<TopContentExport>(`/analytics/top-content/export?${params}`, {
    method: "GET",
  });
}
