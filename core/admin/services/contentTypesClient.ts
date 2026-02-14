import { apiRequest } from "./apiClient";
import { clearSessionCache, readSessionCache, writeSessionCache } from "@/utils/sessionCache";

export type ContentSchemaProperty = {
  type?: "string" | "number" | "boolean" | "array";
  items?: { type?: "string" };
  title?: string;
  description?: string;
  enum?: string[];
  default?: string | number | boolean | string[];
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
  createdAt: string;
  updatedAt: string;
  entryCount?: number;
};

export type ContentTypePayload = {
  name: string;
  slug: string;
  schema: ContentSchema;
};

let cachedContentTypes: ContentTypeSummary[] | null = null;
let cachedContentTypesPromise: Promise<ContentTypeSummary[]> | null = null;

const isContentTypeList = (value: unknown): value is ContentTypeSummary[] =>
  Array.isArray(value);

const CONTENT_TYPES_CACHE_KEY = "nextless.contentTypesCache";
const CONTENT_TYPES_CACHE_TTL_MS = 5 * 60 * 1000;

const primeContentTypesCacheInternal = (items: ContentTypeSummary[]) => {
  cachedContentTypes = items;
  cachedContentTypesPromise = null;
  writeSessionCache(CONTENT_TYPES_CACHE_KEY, items);
};

const upsertCachedContentType = (item: ContentTypeSummary) => {
  const current = cachedContentTypes ?? readSessionCache(CONTENT_TYPES_CACHE_KEY, CONTENT_TYPES_CACHE_TTL_MS, isContentTypeList) ?? [];
  const index = current.findIndex((cached) => cached.id === item.id);
  const next = [...current];
  if (index == -1) {
    next.unshift(item);
  } else {
    next[index] = item;
  }
  primeContentTypesCacheInternal(next);
};

const removeCachedContentType = (id: string) => {
  const current = cachedContentTypes ?? readSessionCache(CONTENT_TYPES_CACHE_KEY, CONTENT_TYPES_CACHE_TTL_MS, isContentTypeList);
  if (!current) return;
  primeContentTypesCacheInternal(current.filter((item) => item.id !== id));
};

export const getCachedContentTypes = () => {
  if (cachedContentTypes) return cachedContentTypes;
  const sessionCached = readSessionCache(CONTENT_TYPES_CACHE_KEY, CONTENT_TYPES_CACHE_TTL_MS, isContentTypeList);
  if (sessionCached) {
    cachedContentTypes = sessionCached;
  }
  return cachedContentTypes;
};

export const primeContentTypesCache = (items: ContentTypeSummary[]) => {
  primeContentTypesCacheInternal(items);
};

export const clearContentTypesCache = () => {
  cachedContentTypes = null;
  cachedContentTypesPromise = null;
  clearSessionCache(CONTENT_TYPES_CACHE_KEY);
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
  }
  return created;
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
  }
  return result;
}
