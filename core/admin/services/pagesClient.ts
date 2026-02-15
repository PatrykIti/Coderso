import { apiRequest } from "./apiClient";
import { broadcastCacheEvent } from "@/utils/cacheBus";
import { cacheKeys, cacheTtlMs } from "@/services/cachePolicy";
import { clearLocalCache, readLocalCache, writeLocalCache } from "@/utils/storageCache";

export type PageStatus = "draft" | "published" | "scheduled" | "archived";

export type PageAuthor = {
  id: string;
  name: string | null;
  email: string;
};

export type PageSummary = {
  id: string;
  title: string;
  slug: string;
  status: PageStatus;
  updatedAt: string;
  author: PageAuthor | null;
};

export type PageDetail = {
  id: string;
  title: string;
  slug: string;
  status: PageStatus;
  currentData: Record<string, unknown>;
  publishedData?: Record<string, unknown> | null;
  updatedAt: string;
  publishedAt?: string | null;
  authorId?: string | null;
  author?: PageAuthor | null;
};

export type PagePayload = {
  title: string;
  slug: string;
  template?: string;
  data: Record<string, unknown>;
};

export type PreviewResponse = {
  token: string;
  previewUrl: string;
  expiresAt: string;
};

export type PageTemplateOption = {
  key: string;
  label: string;
};

export type PageTemplateOptionsResponse = {
  themeName: string;
  templates: PageTemplateOption[];
};

let cachedPages: PageSummary[] | null = null;
let cachedPagesPromise: Promise<PageSummary[]> | null = null;

const isPageList = (value: unknown): value is PageSummary[] => Array.isArray(value);

const isPageDetail = (value: unknown): value is PageDetail =>
  Boolean(value && typeof value === "object");

const isPageDetailPayload = (
  value: PageSummary | PageDetail
): value is PageDetail => "currentData" in value;

const toPageSummary = (page: PageSummary | PageDetail): PageSummary => ({
  id: page.id,
  title: page.title,
  slug: page.slug,
  status: page.status,
  updatedAt: page.updatedAt,
  author: page.author ?? null,
});

const readPagesCache = () =>
  readLocalCache(cacheKeys.pagesList, cacheTtlMs.list, isPageList);

const readPageDetailCache = (id: string) =>
  readLocalCache(cacheKeys.pageDetail(id), cacheTtlMs.detail, isPageDetail);

const writePageDetailCache = (page: PageDetail) => {
  writeLocalCache(cacheKeys.pageDetail(page.id), page);
};

const primePagesCacheInternal = (items: PageSummary[]) => {
  cachedPages = items;
  cachedPagesPromise = null;
  writeLocalCache(cacheKeys.pagesList, items);
};

const upsertCachedPage = (page: PageSummary | PageDetail) => {
  const current = cachedPages ?? readPagesCache() ?? [];
  const summary = toPageSummary(page);
  const index = current.findIndex((item) => item.id === summary.id);
  const next = [...current];
  if (index === -1) {
    next.unshift(summary);
  } else {
    next[index] = { ...next[index], ...summary };
  }
  primePagesCacheInternal(next);
  if (isPageDetailPayload(page)) {
    writePageDetailCache(page);
  }
};

const updateCachedPageStatus = (id: string, status: PageStatus) => {
  const current = cachedPages ?? readPagesCache();
  if (current) {
    primePagesCacheInternal(
      current.map((item) => (item.id === id ? { ...item, status } : item))
    );
  }
  const detail = readPageDetailCache(id);
  if (detail) {
    writePageDetailCache({ ...detail, status });
  }
};

const removeCachedPage = (id: string) => {
  const current = cachedPages ?? readPagesCache();
  if (!current) return;
  primePagesCacheInternal(current.filter((item) => item.id !== id));
  clearLocalCache(cacheKeys.pageDetail(id));
};

export const getCachedPages = () => {
  if (cachedPages) return cachedPages;
  const cached = readPagesCache();
  if (cached) cachedPages = cached;
  return cachedPages;
};

export const getCachedPageDetail = (id: string) => readPageDetailCache(id);

export const clearPagesCache = () => {
  cachedPages = null;
  cachedPagesPromise = null;
  clearLocalCache(cacheKeys.pagesList);
};

export async function listPages() {
  return apiRequest<PageSummary[]>("/pages", { method: "GET" });
}

export async function listPagesCached(options?: { force?: boolean }) {
  if (!options?.force) {
    const cached = getCachedPages();
    if (cached) return cached;
    if (cachedPagesPromise) return cachedPagesPromise;
  }
  const request = listPages();
  cachedPagesPromise = request;
  const items = await request;
  primePagesCacheInternal(items);
  return items;
}

export async function getPage(id: string) {
  return apiRequest<PageDetail>(`/pages/${id}`, { method: "GET" });
}

export async function getPageCached(id: string, options?: { force?: boolean }) {
  if (!options?.force) {
    const cachedDetail = readPageDetailCache(id);
    if (cachedDetail) return cachedDetail;
  }
  const result = await getPage(id);
  if (result) upsertCachedPage(result);
  return result;
}

export async function createPage(payload: PagePayload) {
  const created = await apiRequest<PageDetail>(
    "/pages",
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    },
    { withCsrf: true }
  );
  if (created) {
    upsertCachedPage(created);
    broadcastCacheEvent({ key: cacheKeys.pagesList, action: "update" });
    broadcastCacheEvent({ key: cacheKeys.pageDetail(created.id), action: "update" });
  }
  return created;
}

export async function updatePage(id: string, payload: Partial<PagePayload>) {
  const updated = await apiRequest<PageDetail>(
    `/pages/${id}`,
    {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    },
    { withCsrf: true }
  );
  if (updated) {
    upsertCachedPage(updated);
    broadcastCacheEvent({ key: cacheKeys.pagesList, action: "update" });
    broadcastCacheEvent({ key: cacheKeys.pageDetail(updated.id), action: "update" });
  }
  return updated;
}

export async function publishPage(id: string, data?: Record<string, unknown>) {
  const result = await apiRequest<{ ok: boolean }>(
    `/pages/${id}/publish`,
    data
      ? {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ data }),
        }
      : { method: "POST" },
    { withCsrf: true }
  );
  if (result?.ok) {
    updateCachedPageStatus(id, "published");
    broadcastCacheEvent({ key: cacheKeys.pagesList, action: "update" });
    broadcastCacheEvent({ key: cacheKeys.pageDetail(id), action: "update" });
  }
  return result;
}

export async function unpublishPage(id: string) {
  const result = await apiRequest<{ ok: boolean }>(
    `/pages/${id}/unpublish`,
    { method: "POST" },
    { withCsrf: true }
  );
  if (result?.ok) {
    updateCachedPageStatus(id, "draft");
    broadcastCacheEvent({ key: cacheKeys.pagesList, action: "update" });
    broadcastCacheEvent({ key: cacheKeys.pageDetail(id), action: "update" });
  }
  return result;
}

export async function previewPage(id: string, ttlMinutes?: number) {
  return apiRequest<PreviewResponse>(
    `/pages/${id}/preview`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ttlMinutes }),
    },
    { withCsrf: true }
  );
}

export async function duplicatePage(id: string) {
  const clone = await apiRequest<PageDetail>(
    `/pages/${id}/duplicate`,
    { method: "POST" },
    { withCsrf: true }
  );
  if (clone) {
    upsertCachedPage(clone);
    broadcastCacheEvent({ key: cacheKeys.pagesList, action: "update" });
    broadcastCacheEvent({ key: cacheKeys.pageDetail(clone.id), action: "update" });
  }
  return clone;
}

export async function deletePage(id: string) {
  const result = await apiRequest<{ ok: boolean }>(
    `/pages/${id}`,
    { method: "DELETE" },
    { withCsrf: true }
  );
  if (result?.ok) {
    removeCachedPage(id);
    broadcastCacheEvent({ key: cacheKeys.pagesList, action: "invalidate" });
    broadcastCacheEvent({ key: cacheKeys.pageDetail(id), action: "invalidate" });
  }
  return result;
}

export async function getPageTemplateOptions() {
  return apiRequest<PageTemplateOptionsResponse>("/pages/template-options", {
    method: "GET",
  });
}
