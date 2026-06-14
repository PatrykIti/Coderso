import { apiRequest } from "./apiClient";
import { broadcastCacheEvent } from "@/utils/cacheBus";
import { cacheKeys, cacheTtlMs } from "@/services/cachePolicy";
import {
  clearLocalCache,
  createMemoryBackedLocalCache,
  readLocalCache,
  writeLocalCache,
} from "@/utils/storageCache";

export type PageTemplateStatus = "draft" | "published";

export type PageTemplateSummary = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  category: string | null;
  status: PageTemplateStatus;
  sectionsCount: number;
  createdAt: string;
  updatedAt: string;
};

export type PageTemplateDetail = PageTemplateSummary & {
  document: Record<string, unknown>;
};

export type PageTemplateCreatePayload = {
  name: string;
  slug?: string;
  description?: string | null;
  category?: string | null;
  status?: PageTemplateStatus;
  document: Record<string, unknown>;
};

export type PageTemplateUpdatePayload = Partial<PageTemplateCreatePayload>;

export type PageTemplatePreviewResponse = {
  token: string;
  previewUrl: string;
  expiresAt: string;
  sectionsCount: number;
};

let cachedListPromise: Promise<PageTemplateSummary[]> | null = null;

const isPageTemplateList = (value: unknown): value is PageTemplateSummary[] => Array.isArray(value);

const isPageTemplateDetail = (value: unknown): value is PageTemplateDetail =>
  Boolean(value && typeof value === "object" && "document" in (value as Record<string, unknown>));

const listCache = createMemoryBackedLocalCache({
  key: cacheKeys.pageTemplatesList,
  ttlMs: cacheTtlMs.list,
  validate: isPageTemplateList,
});

const readDetailCache = (id: string) =>
  readLocalCache(cacheKeys.pageTemplateDetail(id), cacheTtlMs.detail, isPageTemplateDetail);

const writeDetailCache = (detail: PageTemplateDetail) => {
  writeLocalCache(cacheKeys.pageTemplateDetail(detail.id), detail);
};

const primeListCache = (items: PageTemplateSummary[]) => {
  cachedListPromise = null;
  listCache.write(items);
};

const toSummary = (detail: PageTemplateDetail): PageTemplateSummary => ({
  id: detail.id,
  name: detail.name,
  slug: detail.slug,
  description: detail.description,
  category: detail.category,
  status: detail.status,
  sectionsCount: detail.sectionsCount,
  createdAt: detail.createdAt,
  updatedAt: detail.updatedAt,
});

const mergeIntoList = (detail: PageTemplateDetail) => {
  const current = listCache.read();
  // A detail-driven merge must never ESTABLISH the list cache: writing a
  // single-item list when the full list was never fetched (or expired) makes
  // a partial list look authoritative, shadowing published templates in
  // pickers until the key is cleared (client-readiness smoke FIX 3). With no
  // existing full list the detail cache is still written and the next list
  // call fetches the complete set from the API.
  if (current) {
    const summary = toSummary(detail);
    const index = current.findIndex((item) => item.id === summary.id);
    const next = [...current];
    if (index === -1) {
      next.unshift(summary);
    } else {
      next[index] = { ...next[index], ...summary };
    }
    primeListCache(next);
  }
  writeDetailCache(detail);
};

const removeFromCaches = (id: string) => {
  clearLocalCache(cacheKeys.pageTemplateDetail(id));
  const current = listCache.read();
  if (!current) return;
  primeListCache(current.filter((item) => item.id !== id));
};

export const getCachedPageTemplates = () => listCache.read();

export const getCachedPageTemplateDetail = (id: string) => readDetailCache(id);

export const clearPageTemplatesCache = () => {
  cachedListPromise = null;
  listCache.clear();
};

export async function listPageTemplates() {
  const response = await apiRequest<{ items: PageTemplateSummary[] }>("/page-templates", {
    method: "GET",
  });
  return response?.items ?? [];
}

export async function listPageTemplatesCached(options?: { force?: boolean }) {
  if (!options?.force) {
    const cached = getCachedPageTemplates();
    if (cached) return cached;
    if (cachedListPromise) return cachedListPromise;
  }
  const request = listPageTemplates();
  cachedListPromise = request;
  const items = await request;
  primeListCache(items);
  return items;
}

export async function getPageTemplate(id: string) {
  return apiRequest<PageTemplateDetail>(`/page-templates/${id}`, { method: "GET" });
}

export async function getPageTemplateCached(id: string, options?: { force?: boolean }) {
  if (!options?.force) {
    const cached = readDetailCache(id);
    if (cached) return cached;
  }
  const result = await getPageTemplate(id);
  if (result) mergeIntoList(result);
  return result;
}

export async function createPageTemplate(payload: PageTemplateCreatePayload) {
  const created = await apiRequest<PageTemplateDetail>(
    "/page-templates",
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    },
    { withCsrf: true }
  );
  if (created) {
    mergeIntoList(created);
    broadcastCacheEvent({ key: cacheKeys.pageTemplatesList, action: "update" });
    broadcastCacheEvent({ key: cacheKeys.pageTemplateDetail(created.id), action: "update" });
  }
  return created;
}

export async function updatePageTemplate(id: string, payload: PageTemplateUpdatePayload) {
  const updated = await apiRequest<PageTemplateDetail>(
    `/page-templates/${id}`,
    {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    },
    { withCsrf: true }
  );
  if (updated) {
    mergeIntoList(updated);
    broadcastCacheEvent({ key: cacheKeys.pageTemplatesList, action: "update" });
    broadcastCacheEvent({ key: cacheKeys.pageTemplateDetail(updated.id), action: "update" });
  }
  return updated;
}

export async function duplicatePageTemplate(id: string) {
  const copy = await apiRequest<PageTemplateDetail>(
    `/page-templates/${id}/duplicate`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({}),
    },
    { withCsrf: true }
  );
  if (copy) {
    mergeIntoList(copy);
    broadcastCacheEvent({ key: cacheKeys.pageTemplatesList, action: "update" });
    broadcastCacheEvent({ key: cacheKeys.pageTemplateDetail(copy.id), action: "update" });
  }
  return copy;
}

export async function deletePageTemplate(id: string) {
  const result = await apiRequest<{ ok: boolean }>(
    `/page-templates/${id}`,
    { method: "DELETE" },
    { withCsrf: true }
  );
  if (result?.ok) {
    removeFromCaches(id);
    broadcastCacheEvent({ key: cacheKeys.pageTemplatesList, action: "invalidate" });
    broadcastCacheEvent({ key: cacheKeys.pageTemplateDetail(id), action: "invalidate" });
  }
  return result;
}

export async function previewPageTemplate(id: string, options?: { ttlMinutes?: number }) {
  return apiRequest<PageTemplatePreviewResponse>(
    `/page-templates/${id}/preview`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(
        options?.ttlMinutes !== undefined ? { ttlMinutes: options.ttlMinutes } : {}
      ),
    },
    { withCsrf: true }
  );
}
