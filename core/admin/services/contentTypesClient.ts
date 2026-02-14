import { apiRequest } from "./apiClient";

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

const primeContentTypesCacheInternal = (items: ContentTypeSummary[]) => {
  cachedContentTypes = items;
  cachedContentTypesPromise = null;
};

const upsertCachedContentType = (item: ContentTypeSummary) => {
  if (!cachedContentTypes) {
    cachedContentTypes = [item];
    return;
  }
  const index = cachedContentTypes.findIndex((cached) => cached.id === item.id);
  if (index === -1) {
    cachedContentTypes = [item, ...cachedContentTypes];
    return;
  }
  const next = [...cachedContentTypes];
  next[index] = item;
  cachedContentTypes = next;
};

const removeCachedContentType = (id: string) => {
  if (!cachedContentTypes) return;
  cachedContentTypes = cachedContentTypes.filter((item) => item.id !== id);
};

export const getCachedContentTypes = () => cachedContentTypes;

export const primeContentTypesCache = (items: ContentTypeSummary[]) => {
  primeContentTypesCacheInternal(items);
};

export const clearContentTypesCache = () => {
  cachedContentTypes = null;
  cachedContentTypesPromise = null;
};

export async function listContentTypes() {
  return apiRequest<ContentTypeSummary[]>("/content-types", { method: "GET" });
}

export async function listContentTypesCached(options?: { force?: boolean }) {
  if (cachedContentTypes && !options?.force) return cachedContentTypes;
  if (cachedContentTypesPromise) return cachedContentTypesPromise;
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
  if (!options?.force && cachedContentTypes) {
    const cached = cachedContentTypes.find((item) => item.id === id);
    if (cached) return cached;
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
