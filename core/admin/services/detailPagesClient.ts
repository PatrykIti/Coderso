import { apiRequest } from "./apiClient";
import { broadcastCacheEvent } from "@/utils/cacheBus";
import { cacheKeys, cacheTtlMs } from "@/services/cachePolicy";
import { clearContentTypeCollectionWorkspaceCache } from "@/services/contentTypesClient";
import {
  clearLocalCache,
  createMemoryBackedLocalCache,
  readLocalCache,
  writeLocalCache,
  type MemoryBackedStorageCache,
} from "@/utils/storageCache";
import type {
  DetailPageDocument,
  DetailPageRevisionKind,
} from "../../services/content/detailPageTypes";

export type DetailPageStatus = "draft" | "published";

export type DetailPageRecord = {
  id: string;
  contentTypeId: string;
  contentTypeSlug: string;
  name: string;
  status: DetailPageStatus;
  currentDocument: DetailPageDocument;
  publishedDocument?: DetailPageDocument | null;
  createdAt: string;
  updatedAt: string;
  publishedAt?: string | null;
  authorId?: string | null;
};

export type DetailPageRevisionSummary = {
  id: string;
  detailPageId: string;
  version: number;
  kind: DetailPageRevisionKind;
  createdAt: string;
  createdBy: string | null;
};

export type DetailPageAutosaveResponse = {
  savedAt: string;
  reusedRevision: boolean;
  revision: DetailPageRevisionSummary;
};

export type DetailPagePreviewResponse = {
  token: string;
  previewUrl: string;
  expiresAt: string;
};

export type DetailPageRestoreResponse = {
  ok: boolean;
  restored: boolean;
  revision: DetailPageRevisionSummary;
  detailPage: Pick<
    DetailPageRecord,
    "id" | "contentTypeId" | "name" | "status" | "updatedAt" | "publishedAt"
  >;
};

export type DetailPageListOptions = {
  contentTypeId?: string | null;
};

export type DetailPageCachedListOptions = DetailPageListOptions & {
  force?: boolean;
};

const isRecord = (value: unknown): value is Record<string, unknown> =>
  Boolean(value) && typeof value === "object" && !Array.isArray(value);

const isDetailPageStatus = (value: unknown): value is DetailPageStatus =>
  value === "draft" || value === "published";

const isDetailPageRecord = (value: unknown): value is DetailPageRecord =>
  isRecord(value) &&
  typeof value.id === "string" &&
  typeof value.contentTypeId === "string" &&
  typeof value.contentTypeSlug === "string" &&
  typeof value.name === "string" &&
  isDetailPageStatus(value.status) &&
  isRecord(value.currentDocument) &&
  (value.publishedDocument === undefined ||
    value.publishedDocument === null ||
    isRecord(value.publishedDocument)) &&
  typeof value.createdAt === "string" &&
  typeof value.updatedAt === "string";

const isDetailPageList = (value: unknown): value is DetailPageRecord[] =>
  Array.isArray(value) && value.every(isDetailPageRecord);

const listCacheByKey = new Map<string, MemoryBackedStorageCache<DetailPageRecord[]>>();
const cachedListPromises = new Map<string, Promise<DetailPageRecord[]>>();

export const detailPageListCacheKey = (contentTypeId?: string | null) =>
  contentTypeId?.trim()
    ? cacheKeys.detailPagesListByContentType(contentTypeId.trim())
    : cacheKeys.detailPagesList;

const getListCache = (contentTypeId?: string | null) => {
  const key = detailPageListCacheKey(contentTypeId);
  const existing = listCacheByKey.get(key);
  if (existing) return existing;
  const created = createMemoryBackedLocalCache({
    key,
    ttlMs: cacheTtlMs.list,
    validate: isDetailPageList,
  });
  listCacheByKey.set(key, created);
  return created;
};

const listCacheKeysFor = (contentTypeId?: string | null) => {
  const keys = [cacheKeys.detailPagesList];
  const normalized = contentTypeId?.trim();
  if (normalized) keys.push(cacheKeys.detailPagesListByContentType(normalized));
  return keys;
};

const readDetailPageListCache = (contentTypeId?: string | null) =>
  getListCache(contentTypeId).read();

const writeDetailPageListCache = (items: DetailPageRecord[], contentTypeId?: string | null) => {
  cachedListPromises.delete(detailPageListCacheKey(contentTypeId));
  getListCache(contentTypeId).write(items);
};

const readDetailPageDetailCache = (id: string) =>
  readLocalCache(cacheKeys.detailPageDetail(id), cacheTtlMs.detail, isDetailPageRecord);

const writeDetailPageDetailCache = (item: DetailPageRecord) => {
  writeLocalCache(cacheKeys.detailPageDetail(item.id), item);
};

const sortDetailPages = (items: DetailPageRecord[]) =>
  [...items].sort((left, right) => right.updatedAt.localeCompare(left.updatedAt));

const upsertListCache = (key: string, item: DetailPageRecord) => {
  const cache =
    listCacheByKey.get(key) ??
    createMemoryBackedLocalCache({
      key,
      ttlMs: cacheTtlMs.list,
      validate: isDetailPageList,
    });
  listCacheByKey.set(key, cache);
  const current = cache.read();
  if (!current) return;
  const index = current.findIndex((entry) => entry.id === item.id);
  const next = [...current];
  if (index === -1) {
    next.unshift(item);
  } else {
    next[index] = { ...next[index], ...item };
  }
  cache.write(sortDetailPages(next));
};

const removeFromListCache = (key: string, id: string) => {
  const cache = listCacheByKey.get(key);
  const current = cache?.read();
  if (!cache || !current) return;
  cache.write(current.filter((entry) => entry.id !== id));
};

const upsertCachedDetailPage = (item: DetailPageRecord) => {
  writeDetailPageDetailCache(item);
  for (const key of listCacheKeysFor(item.contentTypeId)) {
    upsertListCache(key, item);
  }
};

export const clearDetailPageListCache = (contentTypeId?: string | null) => {
  for (const key of listCacheKeysFor(contentTypeId)) {
    cachedListPromises.delete(key);
    listCacheByKey.get(key)?.clear();
    if (!listCacheByKey.has(key)) clearLocalCache(key);
  }
};

export const clearDetailPageDetailCache = (id: string) => {
  clearLocalCache(cacheKeys.detailPageDetail(id));
};

export const clearDetailPagesCache = () => {
  cachedListPromises.clear();
  const knownKeys = new Set([cacheKeys.detailPagesList, ...listCacheByKey.keys()]);
  for (const key of knownKeys) {
    const cache = listCacheByKey.get(key);
    if (cache) {
      cache.clear();
    } else {
      clearLocalCache(key);
    }
  }
};

export const invalidateDetailPageClientCaches = (input: {
  id?: string | null;
  contentTypeId?: string | null;
}) => {
  clearDetailPageListCache(input.contentTypeId);
  broadcastCacheEvent({ key: cacheKeys.detailPagesList, action: "invalidate" });
  if (input.contentTypeId?.trim()) {
    const contentTypeId = input.contentTypeId.trim();
    clearContentTypeCollectionWorkspaceCache(contentTypeId);
    broadcastCacheEvent({
      key: cacheKeys.detailPagesListByContentType(contentTypeId),
      action: "invalidate",
    });
    broadcastCacheEvent({
      key: cacheKeys.contentTypeCollectionWorkspace(contentTypeId),
      action: "invalidate",
    });
  }
  if (input.id?.trim()) {
    clearDetailPageDetailCache(input.id.trim());
    broadcastCacheEvent({ key: cacheKeys.detailPageDetail(input.id.trim()), action: "invalidate" });
  }
};

export const getCachedDetailPages = (contentTypeId?: string | null) =>
  readDetailPageListCache(contentTypeId);

export const getCachedDetailPage = (id: string) => readDetailPageDetailCache(id);

export async function listDetailPages(options: DetailPageListOptions = {}) {
  const contentTypeId = options.contentTypeId?.trim();
  const query = contentTypeId ? `?contentTypeId=${encodeURIComponent(contentTypeId)}` : "";
  const payload = await apiRequest<{ items: DetailPageRecord[] }>(`/detail-pages${query}`, {
    method: "GET",
  });
  return payload.items ?? [];
}

export async function listDetailPagesCached(options: DetailPageCachedListOptions = {}) {
  const contentTypeId = options.contentTypeId?.trim() || null;
  const key = detailPageListCacheKey(contentTypeId);
  if (!options.force) {
    const cached = getCachedDetailPages(contentTypeId);
    if (cached) return cached;
    const pending = cachedListPromises.get(key);
    if (pending) return pending;
  }
  const request = listDetailPages({ contentTypeId });
  cachedListPromises.set(key, request);
  const items = await request;
  writeDetailPageListCache(items, contentTypeId);
  items.forEach(writeDetailPageDetailCache);
  return items;
}

export async function getDetailPage(id: string) {
  return apiRequest<DetailPageRecord>(`/detail-pages/${encodeURIComponent(id)}`, {
    method: "GET",
  });
}

export async function getDetailPageCached(id: string, options?: { force?: boolean }) {
  if (!options?.force) {
    const cached = getCachedDetailPage(id);
    if (cached) return cached;
  }
  const item = await getDetailPage(id);
  if (item) upsertCachedDetailPage(item);
  return item;
}

export async function createDetailPage(document: DetailPageDocument) {
  const created = await apiRequest<DetailPageRecord>(
    "/detail-pages",
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ document }),
    },
    { withCsrf: true }
  );
  upsertCachedDetailPage(created);
  broadcastCacheEvent({ key: cacheKeys.detailPagesList, action: "update" });
  broadcastCacheEvent({
    key: cacheKeys.detailPagesListByContentType(created.contentTypeId),
    action: "update",
  });
  clearContentTypeCollectionWorkspaceCache(created.contentTypeId);
  broadcastCacheEvent({
    key: cacheKeys.contentTypeCollectionWorkspace(created.contentTypeId),
    action: "update",
  });
  broadcastCacheEvent({ key: cacheKeys.detailPageDetail(created.id), action: "update" });
  return created;
}

export async function updateDetailPage(id: string, document: DetailPageDocument) {
  const updated = await apiRequest<DetailPageRecord>(
    `/detail-pages/${encodeURIComponent(id)}`,
    {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ document }),
    },
    { withCsrf: true }
  );
  upsertCachedDetailPage(updated);
  broadcastCacheEvent({ key: cacheKeys.detailPagesList, action: "update" });
  broadcastCacheEvent({
    key: cacheKeys.detailPagesListByContentType(updated.contentTypeId),
    action: "update",
  });
  clearContentTypeCollectionWorkspaceCache(updated.contentTypeId);
  broadcastCacheEvent({
    key: cacheKeys.contentTypeCollectionWorkspace(updated.contentTypeId),
    action: "update",
  });
  broadcastCacheEvent({ key: cacheKeys.detailPageDetail(updated.id), action: "update" });
  return updated;
}

export async function deleteDetailPage(id: string, options?: { contentTypeId?: string | null }) {
  const cached = getCachedDetailPage(id);
  const result = await apiRequest<{ ok: boolean }>(
    `/detail-pages/${encodeURIComponent(id)}`,
    { method: "DELETE" },
    { withCsrf: true }
  );
  if (result?.ok) {
    const contentTypeId = options?.contentTypeId ?? cached?.contentTypeId ?? null;
    for (const key of listCacheKeysFor(contentTypeId)) {
      removeFromListCache(key, id);
    }
    clearDetailPageDetailCache(id);
    broadcastCacheEvent({ key: cacheKeys.detailPagesList, action: "invalidate" });
    if (contentTypeId?.trim()) {
      const normalizedContentTypeId = contentTypeId.trim();
      clearContentTypeCollectionWorkspaceCache(normalizedContentTypeId);
      broadcastCacheEvent({
        key: cacheKeys.detailPagesListByContentType(normalizedContentTypeId),
        action: "invalidate",
      });
      broadcastCacheEvent({
        key: cacheKeys.contentTypeCollectionWorkspace(normalizedContentTypeId),
        action: "invalidate",
      });
    }
    broadcastCacheEvent({ key: cacheKeys.detailPageDetail(id), action: "invalidate" });
  }
  return result;
}

export async function previewDetailPage(
  id: string,
  payload: { sampleEntryId: string; ttlMinutes?: number }
) {
  return apiRequest<DetailPagePreviewResponse>(
    `/detail-pages/${encodeURIComponent(id)}/preview`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    },
    { withCsrf: true }
  );
}

export async function publishDetailPage(id: string, contentTypeId?: string | null) {
  const result = await apiRequest<{ ok: boolean }>(
    `/detail-pages/${encodeURIComponent(id)}/publish`,
    { method: "POST" },
    { withCsrf: true }
  );
  if (result?.ok) invalidateDetailPageClientCaches({ id, contentTypeId });
  return result;
}

export async function unpublishDetailPage(id: string, contentTypeId?: string | null) {
  const result = await apiRequest<{ ok: boolean }>(
    `/detail-pages/${encodeURIComponent(id)}/unpublish`,
    { method: "POST" },
    { withCsrf: true }
  );
  if (result?.ok) invalidateDetailPageClientCaches({ id, contentTypeId });
  return result;
}

export async function autosaveDetailPage(id: string, document: DetailPageDocument) {
  return apiRequest<DetailPageAutosaveResponse>(
    `/detail-pages/${encodeURIComponent(id)}/autosave`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ document }),
    },
    { withCsrf: true }
  );
}

export async function listDetailPageRevisions(id: string) {
  return apiRequest<DetailPageRevisionSummary[]>(
    `/detail-pages/${encodeURIComponent(id)}/revisions`,
    { method: "GET" }
  );
}

export async function restoreDetailPageRevision(
  id: string,
  revisionId: string,
  contentTypeId?: string | null
) {
  const result = await apiRequest<DetailPageRestoreResponse>(
    `/detail-pages/${encodeURIComponent(id)}/revisions/${encodeURIComponent(revisionId)}/restore`,
    { method: "POST" },
    { withCsrf: true }
  );
  if (result?.ok) {
    invalidateDetailPageClientCaches({
      id,
      contentTypeId: contentTypeId ?? result.detailPage.contentTypeId,
    });
  }
  return result;
}

export async function discardDetailPageRevision(id: string, revisionId: string) {
  return apiRequest<{ ok: boolean }>(
    `/detail-pages/${encodeURIComponent(id)}/revisions/${encodeURIComponent(revisionId)}`,
    { method: "DELETE" },
    { withCsrf: true }
  );
}
