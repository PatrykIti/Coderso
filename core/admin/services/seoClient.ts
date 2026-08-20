import { apiRequest } from "./apiClient";
import { broadcastCacheEvent } from "@/utils/cacheBus";
import { cacheKeys, cacheTtlMs } from "@/services/cachePolicy";
import {
  clearLocalCache,
  createMemoryBackedLocalCache,
  readLocalCache,
  writeLocalCache,
} from "@/utils/storageCache";
import {
  seoAuditCheckIds,
  type SeoAuditCheckId,
  type SeoOverview,
  type SeoSearchPerformance,
} from "../../services/seo/seoTypes";

export { seoAuditCheckIds, type SeoAuditCheckId };

export type SeoIssue = {
  code: string;
  severity: "error" | "warning";
  message: string;
};

export type SeoDocumentItem = {
  id: string;
  targetType: "page" | "entry";
  targetId: string;
  targetTitle: string;
  slug: string | null;
  title: string | null;
  description: string | null;
  canonicalUrl: string | null;
  robots: string | null;
  score: number | null;
  status: "ok" | "warning" | "issue";
  issues: SeoIssue[];
  lastAuditAt: string | null;
  createdAt: string;
  updatedAt: string;
};

export type SeoAuditPayload = {
  targetType?: "page" | "entry";
  targetId?: string;
  checks?: SeoAuditCheckId[];
};

let cachedSeoListPromise: Promise<SeoDocumentItem[]> | null = null;
const cachedSeoDetails = new Map<string, SeoDocumentItem>();
const knownSeoDetailIds = new Set<string>();

const isSeoList = (value: unknown): value is SeoDocumentItem[] => Array.isArray(value);

const isSeoDocument = (value: unknown): value is SeoDocumentItem =>
  Boolean(value && typeof value === "object");

const seoListCache = createMemoryBackedLocalCache({
  key: cacheKeys.seoList,
  ttlMs: cacheTtlMs.list,
  validate: isSeoList,
});

const readSeoListCache = () => seoListCache.read();

const readSeoDetailCache = (id: string) =>
  readLocalCache(cacheKeys.seoDetail(id), cacheTtlMs.detail, isSeoDocument);

const writeSeoDetailCache = (item: SeoDocumentItem) => {
  knownSeoDetailIds.add(item.id);
  cachedSeoDetails.set(item.id, item);
  writeLocalCache(cacheKeys.seoDetail(item.id), item);
};

const primeSeoListCache = (items: SeoDocumentItem[]) => {
  cachedSeoListPromise = null;
  seoListCache.write(items);
  for (const item of items) {
    knownSeoDetailIds.add(item.id);
  }
};

const upsertCachedSeo = (item: SeoDocumentItem) => {
  const current = readSeoListCache() ?? [];
  const index = current.findIndex((existing) => existing.id === item.id);
  const next = [...current];
  if (index === -1) next.unshift(item);
  else next[index] = item;
  primeSeoListCache(next);
  writeSeoDetailCache(item);
};

export const getCachedSeo = () => readSeoListCache();

export const getCachedSeoDetail = (id: string) => {
  const existing = cachedSeoDetails.get(id);
  if (existing) return existing;
  const stored = readSeoDetailCache(id);
  if (stored) {
    writeSeoDetailCache(stored);
    return stored;
  }
  const listed = readSeoListCache()?.find((item) => item.id === id) ?? null;
  if (listed) {
    writeSeoDetailCache(listed);
    return listed;
  }
  return null;
};

export const clearSeoCache = () => {
  cachedSeoListPromise = null;
  seoListCache.clear();
  cachedSeoDetails.clear();
  for (const id of knownSeoDetailIds) {
    clearLocalCache(cacheKeys.seoDetail(id));
  }
  knownSeoDetailIds.clear();
};

export async function listSeo() {
  return apiRequest<SeoDocumentItem[]>("/seo", { method: "GET" });
}

export async function listSeoCached(options?: { force?: boolean }) {
  if (!options?.force) {
    const cached = getCachedSeo();
    if (cached) return cached;
    if (cachedSeoListPromise) return cachedSeoListPromise;
  }
  const request = listSeo();
  cachedSeoListPromise = request;
  const items = await request;
  primeSeoListCache(items);
  return items;
}

export async function getSeo(id: string) {
  return apiRequest<SeoDocumentItem>(`/seo/${id}`, { method: "GET" });
}

export async function getSeoCached(id: string, options?: { force?: boolean }) {
  if (!options?.force) {
    const cached = getCachedSeoDetail(id);
    if (cached) return cached;
  }
  const item = await getSeo(id);
  if (item) upsertCachedSeo(item);
  return item;
}

export async function updateSeo(
  id: string,
  payload: {
    title?: string;
    description?: string;
    canonicalUrl?: string;
    robots?: string;
  }
) {
  const updated = await apiRequest<SeoDocumentItem>(
    `/seo/${id}`,
    {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    },
    { withCsrf: true }
  );
  if (updated) {
    upsertCachedSeo(updated);
    broadcastCacheEvent({ key: cacheKeys.seoList, action: "update" });
    broadcastCacheEvent({ key: cacheKeys.seoDetail(updated.id), action: "update" });
  }
  return updated;
}

export async function runSeoAudit(payload: SeoAuditPayload = {}) {
  const result = await apiRequest<{ audited: number }>(
    "/seo/audit",
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    },
    { withCsrf: true }
  );
  const detailIds = Array.from(knownSeoDetailIds);
  clearSeoCache();
  broadcastCacheEvent({ key: cacheKeys.seoList, action: "invalidate" });
  for (const id of detailIds) {
    broadcastCacheEvent({ key: cacheKeys.seoDetail(id), action: "invalidate" });
  }
  return result;
}

// --- TASK-493-05-L01: SEO overview / search-performance / sitemap surface ------
// Additive extension only. The list/detail methods above and their cache
// contract stay untouched; TASK-551-09-L04 later hardens admin cache clients.

export type SearchPerfParams = {
  targetId?: string;
  startDate?: string;
  endDate?: string;
  limit?: number;
};

const isSeoOverview = (value: unknown): value is SeoOverview =>
  Boolean(value && typeof value === "object");

// Read-through overview cache using the same helpers listSeoCached uses
// (createMemoryBackedLocalCache + cachePolicy TTL).
const seoOverviewCache = createMemoryBackedLocalCache({
  key: cacheKeys.seoOverview,
  ttlMs: cacheTtlMs.list,
  validate: isSeoOverview,
});

export const getCachedSeoOverview = () => seoOverviewCache.read();

export async function getSeoOverview(options?: { force?: boolean }) {
  if (!options?.force) {
    const cached = getCachedSeoOverview();
    if (cached) return cached;
  }
  const overview = await apiRequest<SeoOverview>("/seo/overview", { method: "GET" });
  seoOverviewCache.write(overview);
  return overview;
}

export function getSearchPerformance(p: SearchPerfParams) {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(p)) {
    if (value !== undefined) params.set(key, String(value));
  }
  return apiRequest<SeoSearchPerformance>(`/seo/search-performance?${params.toString()}`, {
    method: "GET",
  });
}

export function syncSearchPerformance(b?: { startDate?: string; endDate?: string }) {
  return apiRequest(
    "/seo/search-performance/sync",
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(b ?? {}),
    },
    { withCsrf: true }
  );
}

export function submitSitemap(b?: { sitemapPath?: string }) {
  return apiRequest(
    "/seo/sitemap/submit",
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(b ?? {}),
    },
    { withCsrf: true }
  );
}
