import { apiRequest } from "./apiClient";
import { broadcastCacheEvent } from "@/utils/cacheBus";
import { cacheKeys, cacheTtlMs } from "@/services/cachePolicy";
import {
  clearLocalCache,
  createMemoryBackedLocalCache,
  readLocalCache,
  writeLocalCache,
} from "@/utils/storageCache";

export type ContentSchemaProperty = {
  type?: "string" | "number" | "integer" | "boolean" | "array";
  items?: { type?: "string"; enum?: string[] };
  title?: string;
  description?: string;
  enum?: string[];
  default?: string | number | boolean | string[];
  minimum?: number;
  maximum?: number;
  multipleOf?: number;
  maxItems?: number;
  xFieldType?: string;
  xFieldConfig?: Record<string, unknown>;
  xRelationTarget?: string;
};

export type ContentSchema = {
  type: "object";
  additionalProperties: false;
  required?: string[];
  properties: Record<string, ContentSchemaProperty>;
};

export type ContentTypeSummary = {
  id: string;
  name: string;
  slug: string;
  schema: ContentSchema;
  status: "draft" | "published";
  createdAt: string;
  updatedAt: string;
  entryCount?: number;
};

export type ContentTypePayload = {
  name: string;
  slug: string;
  schema: ContentSchema;
  status?: "draft" | "published";
};

let cachedContentTypesPromise: Promise<ContentTypeSummary[]> | null = null;

const isContentTypeList = (value: unknown): value is ContentTypeSummary[] =>
  Array.isArray(value);

const isContentType = (value: unknown): value is ContentTypeSummary =>
  Boolean(value && typeof value === "object");

const contentTypesListCache = createMemoryBackedLocalCache({
  key: cacheKeys.contentTypesList,
  ttlMs: cacheTtlMs.list,
  validate: isContentTypeList,
});

const writeContentTypeDetailCache = (item: ContentTypeSummary) => {
  writeLocalCache(cacheKeys.contentTypeDetail(item.id), item);
};

const readContentTypeDetailCache = (id: string) =>
  readLocalCache(cacheKeys.contentTypeDetail(id), cacheTtlMs.detail, isContentType);

const primeContentTypesCacheInternal = (items: ContentTypeSummary[]) => {
  cachedContentTypesPromise = null;
  contentTypesListCache.write(items);
};

const upsertCachedContentType = (item: ContentTypeSummary) => {
  const current = contentTypesListCache.read() ?? [];
  const index = current.findIndex((cached) => cached.id === item.id);
  const next = [...current];
  if (index == -1) {
    next.unshift(item);
  } else {
    next[index] = item;
  }
  primeContentTypesCacheInternal(next);
  writeContentTypeDetailCache(item);
};

const removeCachedContentType = (id: string) => {
  const current = contentTypesListCache.read();
  if (!current) return;
  primeContentTypesCacheInternal(current.filter((item) => item.id !== id));
  clearLocalCache(cacheKeys.contentTypeDetail(id));
};

export const getCachedContentTypes = () => {
  return contentTypesListCache.read();
};

export const primeContentTypesCache = (items: ContentTypeSummary[]) => {
  primeContentTypesCacheInternal(items);
};

export const clearContentTypesCache = () => {
  cachedContentTypesPromise = null;
  contentTypesListCache.clear();
};

export async function listContentTypes() {
  return apiRequest<ContentTypeSummary[]>("/content-types", { method: "GET" });
}

export async function listContentTypesCached(options?: { force?: boolean }) {
  if (!options?.force) {
    const cached = getCachedContentTypes();
    if (cached) return cached;
    if (cachedContentTypesPromise) return cachedContentTypesPromise;
  }
  const request = listContentTypes();
  cachedContentTypesPromise = request;
  const items = await request;
  primeContentTypesCacheInternal(items);
  return items;
}

export async function getContentType(id: string) {
  return apiRequest<ContentTypeSummary>(`/content-types/${id}`, { method: "GET" });
}

export async function getContentTypeCached(
  id: string,
  options?: { force?: boolean }
) {
  if (!options?.force) {
    const cachedDetail = readContentTypeDetailCache(id);
    if (cachedDetail) return cachedDetail;
    const cached = getCachedContentTypes();
    const match = cached?.find((item) => item.id === id);
    if (match) return match;
  }
  const result = await getContentType(id);
  if (result) upsertCachedContentType(result);
  return result;
}

export async function getContentTypeBySlug(slug: string) {
  const types = await listContentTypesCached();
  return types.find((type) => type.slug === slug) ?? null;
}

export async function createContentType(payload: ContentTypePayload) {
  const created = await apiRequest<ContentTypeSummary>(
    "/content-types",
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    },
    { withCsrf: true }
  );
  if (created) {
    upsertCachedContentType(created);
    broadcastCacheEvent({ key: cacheKeys.contentTypesList, action: "update" });
    broadcastCacheEvent({ key: cacheKeys.contentTypeDetail(created.id), action: "update" });
  }
  return created;
}

export async function duplicateContentType(
  id: string,
  payload: { name?: string; slug?: string } = {}
) {
  const duplicated = await apiRequest<ContentTypeSummary>(
    `/content-types/${id}/duplicate`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    },
    { withCsrf: true }
  );
  if (duplicated) {
    upsertCachedContentType(duplicated);
    broadcastCacheEvent({ key: cacheKeys.contentTypesList, action: "update" });
    broadcastCacheEvent({
      key: cacheKeys.contentTypeDetail(duplicated.id),
      action: "update",
    });
  }
  return duplicated;
}

export async function updateContentType(
  id: string,
  payload: Partial<ContentTypePayload>
) {
  const updated = await apiRequest<ContentTypeSummary>(
    `/content-types/${id}`,
    {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    },
    { withCsrf: true }
  );
  if (updated) {
    upsertCachedContentType(updated);
    broadcastCacheEvent({ key: cacheKeys.contentTypesList, action: "update" });
    broadcastCacheEvent({ key: cacheKeys.contentTypeDetail(updated.id), action: "update" });
  }
  return updated;
}

export async function deleteContentType(id: string) {
  const result = await apiRequest<{ ok: boolean }>(
    `/content-types/${id}`,
    {
      method: "DELETE",
    },
    { withCsrf: true }
  );
  if (result?.ok) {
    removeCachedContentType(id);
    broadcastCacheEvent({ key: cacheKeys.contentTypesList, action: "invalidate" });
    broadcastCacheEvent({ key: cacheKeys.contentTypeDetail(id), action: "invalidate" });
  }
  return result;
}
