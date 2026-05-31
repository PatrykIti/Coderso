import { apiRequest } from "./apiClient";
import { broadcastCacheEvent } from "@/utils/cacheBus";
import { cacheKeys, cacheTtlMs } from "@/services/cachePolicy";
import { clearLocalCache, readLocalCache, writeLocalCache } from "@/utils/storageCache";

export type ListingSource = "entries" | "posts" | "users" | "taxonomies";
export type PublicSearchSource = "pages" | "entries" | "posts";
export type ListingFilterOperator =
  | "eq"
  | "neq"
  | "in"
  | "nin"
  | "contains"
  | "startsWith"
  | "gt"
  | "gte"
  | "lt"
  | "lte"
  | "between"
  | "exists";
export type ListingSortDirection = "asc" | "desc";
export type ListingTemplateLayout = "grid" | "list" | "table" | "calendar" | "map";
export type ListingTemplateConditionOperator =
  | "eq"
  | "neq"
  | "in"
  | "contains"
  | "exists"
  | "gt"
  | "gte"
  | "lt"
  | "lte";

export type ListingTemplateCondition = {
  id: string;
  field: string;
  op: ListingTemplateConditionOperator;
  value?: unknown;
};

export type ListingFilter = {
  field: string;
  op: ListingFilterOperator;
  value?: unknown;
};

export type ListingSort = {
  field: string;
  dir: ListingSortDirection;
};

export type ListingQueryPayload = {
  source: ListingSource;
  sourceConfig: {
    contentTypeId?: string;
    taxonomyId?: string;
    includeDrafts?: boolean;
  };
  filters: ListingFilter[];
  sort: ListingSort[];
  pagination: {
    limit: number;
    offset: number;
  };
  fields: string[];
};

export type ListingQueryRecord = {
  id: string;
  name: string;
  description: string | null;
  query: ListingQueryPayload;
  createdAt: string;
  updatedAt: string;
};

export type ListingTemplateField = {
  key: string;
  source: string;
  label: string | null;
  fallback: string | null;
  format: "text" | "date" | "badge" | "currency";
  conditions: ListingTemplateCondition[];
};

export type ListingTemplateAction = {
  id: string;
  label: string;
  kind: "view" | "edit" | "custom";
  href: string | null;
  opensInNewTab: boolean;
};

export type ListingTemplateConfig = {
  fields: ListingTemplateField[];
  itemActions: ListingTemplateAction[];
  emptyState: {
    title: string;
    description: string | null;
    ctaLabel: string | null;
    ctaHref: string | null;
  };
  style: {
    columns: number;
    gap: "xs" | "sm" | "md" | "lg" | "xl";
    cardVariant: "default" | "compact" | "minimal";
  };
};

export type ListingTemplateRecord = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  layout: ListingTemplateLayout;
  config: ListingTemplateConfig;
  createdAt: string;
  updatedAt: string;
};

export type ListingPreviewResult = {
  source: ListingSource;
  total: number;
  limit: number;
  offset: number;
  rows: Record<string, unknown>[];
};

export type ListingFiltersPreviewResult = {
  listingQueryId: string;
  total: number;
  limit: number;
  offset: number;
  rows: Record<string, unknown>[];
  rejectedTokens: string[];
  appliedFilters: ListingFilter[];
  appliedSort: ListingSort[];
  page: number | null;
  searchQuery: string | null;
};

export type PublicSearchPreviewItem = {
  id: string;
  source: PublicSearchSource;
  title: string;
  slug: string;
  href: string;
  updatedAt: string;
  typeSlug?: string;
};

export type PublicSearchPreviewResult = {
  query: string;
  sources: PublicSearchSource[];
  items: PublicSearchPreviewItem[];
};

let cachedQueries: ListingQueryRecord[] | null = null;
let cachedQueriesPromise: Promise<ListingQueryRecord[]> | null = null;
let cachedTemplates: ListingTemplateRecord[] | null = null;
let cachedTemplatesPromise: Promise<ListingTemplateRecord[]> | null = null;

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const isListingQueryRecord = (value: unknown): value is ListingQueryRecord =>
  isRecord(value) &&
  typeof value.id === "string" &&
  typeof value.name === "string" &&
  isRecord(value.query) &&
  typeof value.createdAt === "string" &&
  typeof value.updatedAt === "string";

const isListingTemplateRecord = (value: unknown): value is ListingTemplateRecord =>
  isRecord(value) &&
  typeof value.id === "string" &&
  typeof value.name === "string" &&
  typeof value.slug === "string" &&
  typeof value.layout === "string" &&
  isRecord(value.config) &&
  typeof value.createdAt === "string" &&
  typeof value.updatedAt === "string";

const isListingQueryList = (value: unknown): value is ListingQueryRecord[] =>
  Array.isArray(value) && value.every(isListingQueryRecord);

const isListingTemplateList = (value: unknown): value is ListingTemplateRecord[] =>
  Array.isArray(value) && value.every(isListingTemplateRecord);

const readQueriesCache = () =>
  readLocalCache(cacheKeys.listingQueriesList, cacheTtlMs.list, isListingQueryList);

const readQueryDetailCache = (id: string) =>
  readLocalCache(cacheKeys.listingQueryDetail(id), cacheTtlMs.detail, isListingQueryRecord);

const writeQueryDetailCache = (item: ListingQueryRecord) => {
  writeLocalCache(cacheKeys.listingQueryDetail(item.id), item);
};

const primeQueriesCacheInternal = (items: ListingQueryRecord[]) => {
  cachedQueries = items;
  cachedQueriesPromise = null;
  writeLocalCache(cacheKeys.listingQueriesList, items);
};

const upsertCachedQuery = (item: ListingQueryRecord) => {
  const current = cachedQueries ?? readQueriesCache() ?? [];
  const index = current.findIndex((entry) => entry.id === item.id);
  const next = [...current];
  if (index === -1) {
    next.unshift(item);
  } else {
    next[index] = { ...next[index], ...item };
  }
  primeQueriesCacheInternal(next);
  writeQueryDetailCache(item);
};

const removeCachedQuery = (id: string) => {
  const current = cachedQueries ?? readQueriesCache();
  if (current) {
    primeQueriesCacheInternal(current.filter((entry) => entry.id !== id));
  }
  clearLocalCache(cacheKeys.listingQueryDetail(id));
};

const readTemplatesCache = () =>
  readLocalCache(cacheKeys.listingTemplatesList, cacheTtlMs.list, isListingTemplateList);

const readTemplateDetailCache = (id: string) =>
  readLocalCache(cacheKeys.listingTemplateDetail(id), cacheTtlMs.detail, isListingTemplateRecord);

const writeTemplateDetailCache = (item: ListingTemplateRecord) => {
  writeLocalCache(cacheKeys.listingTemplateDetail(item.id), item);
};

const primeTemplatesCacheInternal = (items: ListingTemplateRecord[]) => {
  cachedTemplates = items;
  cachedTemplatesPromise = null;
  writeLocalCache(cacheKeys.listingTemplatesList, items);
};

const upsertCachedTemplate = (item: ListingTemplateRecord) => {
  const current = cachedTemplates ?? readTemplatesCache() ?? [];
  const index = current.findIndex((entry) => entry.id === item.id);
  const next = [...current];
  if (index === -1) {
    next.unshift(item);
  } else {
    next[index] = { ...next[index], ...item };
  }
  primeTemplatesCacheInternal(next);
  writeTemplateDetailCache(item);
};

const removeCachedTemplate = (id: string) => {
  const current = cachedTemplates ?? readTemplatesCache();
  if (current) {
    primeTemplatesCacheInternal(current.filter((entry) => entry.id !== id));
  }
  clearLocalCache(cacheKeys.listingTemplateDetail(id));
};

export const getCachedListingQueries = () => {
  if (cachedQueries) return cachedQueries;
  const cached = readQueriesCache();
  if (cached) cachedQueries = cached;
  return cachedQueries;
};

export const getCachedListingQuery = (id: string) => readQueryDetailCache(id);

export const clearListingQueriesCache = () => {
  cachedQueries = null;
  cachedQueriesPromise = null;
  clearLocalCache(cacheKeys.listingQueriesList);
};

export const getCachedListingTemplates = () => {
  if (cachedTemplates) return cachedTemplates;
  const cached = readTemplatesCache();
  if (cached) cachedTemplates = cached;
  return cachedTemplates;
};

export const getCachedListingTemplate = (id: string) => readTemplateDetailCache(id);

export const clearListingTemplatesCache = () => {
  cachedTemplates = null;
  cachedTemplatesPromise = null;
  clearLocalCache(cacheKeys.listingTemplatesList);
};

export async function listListingQueries() {
  const payload = await apiRequest<{ items: ListingQueryRecord[] }>("/listings/queries", {
    method: "GET",
  });
  return payload.items ?? [];
}

export async function listListingQueriesCached(options?: { force?: boolean }) {
  if (!options?.force) {
    const cached = getCachedListingQueries();
    if (cached) return cached;
  }
  if (cachedQueriesPromise) return cachedQueriesPromise;
  const request = listListingQueries();
  cachedQueriesPromise = request;
  const items = await request;
  primeQueriesCacheInternal(items);
  items.forEach(writeQueryDetailCache);
  return items;
}

export async function getListingQuery(id: string) {
  return apiRequest<ListingQueryRecord>(`/listings/queries/${id}`, { method: "GET" });
}

export async function getListingQueryCached(id: string, options?: { force?: boolean }) {
  if (!options?.force) {
    const cached = readQueryDetailCache(id);
    if (cached) return cached;
  }
  try {
    const result = await getListingQuery(id);
    if (result) upsertCachedQuery(result);
    return result;
  } catch {
    const list = await listListingQueriesCached({ force: true });
    const item = list.find((entry) => entry.id === id) ?? null;
    if (item) writeQueryDetailCache(item);
    return item;
  }
}

export async function createListingQuery(input: {
  name: string;
  description?: string | null;
  query: ListingQueryPayload;
}) {
  const created = await apiRequest<ListingQueryRecord>(
    "/listings/queries",
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input),
    },
    { withCsrf: true }
  );
  if (created) {
    upsertCachedQuery(created);
    broadcastCacheEvent({ key: cacheKeys.listingQueriesList, action: "update" });
    broadcastCacheEvent({
      key: cacheKeys.listingQueryDetail(created.id),
      action: "update",
    });
  }
  return created;
}

export async function updateListingQuery(
  id: string,
  input: {
    name?: string;
    description?: string | null;
    query?: ListingQueryPayload;
  }
) {
  const updated = await apiRequest<ListingQueryRecord>(
    `/listings/queries/${id}`,
    {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input),
    },
    { withCsrf: true }
  );
  if (updated) {
    upsertCachedQuery(updated);
    broadcastCacheEvent({ key: cacheKeys.listingQueriesList, action: "update" });
    broadcastCacheEvent({
      key: cacheKeys.listingQueryDetail(updated.id),
      action: "update",
    });
  }
  return updated;
}

export async function deleteListingQuery(id: string) {
  const result = await apiRequest<{ ok: boolean }>(
    `/listings/queries/${id}`,
    { method: "DELETE" },
    { withCsrf: true }
  );
  if (result?.ok) {
    removeCachedQuery(id);
    broadcastCacheEvent({ key: cacheKeys.listingQueriesList, action: "invalidate" });
    broadcastCacheEvent({
      key: cacheKeys.listingQueryDetail(id),
      action: "invalidate",
    });
  }
  return result;
}

export async function previewListingQuery(query: ListingQueryPayload) {
  return apiRequest<ListingPreviewResult>(
    "/listings/queries/preview",
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(query),
    },
    { withCsrf: true }
  );
}

export async function previewListingFilters(input: {
  listingQueryId: string;
  queryString?: string;
}) {
  return apiRequest<ListingFiltersPreviewResult>(
    "/filters/preview",
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input),
    },
    { withCsrf: true }
  );
}

export async function previewPublicSearch(input: {
  q: string;
  limit?: number;
  sources?: PublicSearchSource[];
}) {
  const params = new URLSearchParams();
  params.set("q", input.q);
  if (typeof input.limit === "number" && Number.isFinite(input.limit) && input.limit > 0) {
    params.set("limit", String(Math.floor(input.limit)));
  }
  if (Array.isArray(input.sources) && input.sources.length > 0) {
    params.set("sources", input.sources.join(","));
  }
  const query = params.toString();
  const route = query ? `/search/public-preview?${query}` : "/search/public-preview";
  return apiRequest<PublicSearchPreviewResult>(route, {
    method: "GET",
  });
}

export async function listListingTemplates() {
  const payload = await apiRequest<{ items: ListingTemplateRecord[] }>("/listings/templates", {
    method: "GET",
  });
  return payload.items ?? [];
}

export async function listListingTemplatesCached(options?: { force?: boolean }) {
  if (!options?.force) {
    const cached = getCachedListingTemplates();
    if (cached) return cached;
    if (cachedTemplatesPromise) return cachedTemplatesPromise;
  }
  const request = listListingTemplates();
  cachedTemplatesPromise = request;
  const items = await request;
  primeTemplatesCacheInternal(items);
  items.forEach(writeTemplateDetailCache);
  return items;
}

export async function getListingTemplate(id: string) {
  return apiRequest<ListingTemplateRecord>(`/listings/templates/${id}`, { method: "GET" });
}

export async function getListingTemplateCached(id: string, options?: { force?: boolean }) {
  if (!options?.force) {
    const cached = readTemplateDetailCache(id);
    if (cached) return cached;
  }
  try {
    const result = await getListingTemplate(id);
    if (result) upsertCachedTemplate(result);
    return result;
  } catch {
    const list = await listListingTemplatesCached({ force: true });
    const item = list.find((entry) => entry.id === id) ?? null;
    if (item) writeTemplateDetailCache(item);
    return item;
  }
}

export async function createListingTemplate(input: {
  name: string;
  slug?: string | null;
  description?: string | null;
  layout?: ListingTemplateLayout;
  config?: Record<string, unknown>;
}) {
  const created = await apiRequest<ListingTemplateRecord>(
    "/listings/templates",
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input),
    },
    { withCsrf: true }
  );
  if (created) {
    upsertCachedTemplate(created);
    broadcastCacheEvent({ key: cacheKeys.listingTemplatesList, action: "update" });
    broadcastCacheEvent({
      key: cacheKeys.listingTemplateDetail(created.id),
      action: "update",
    });
  }
  return created;
}

export async function updateListingTemplate(
  id: string,
  input: {
    name?: string;
    slug?: string | null;
    description?: string | null;
    layout?: ListingTemplateLayout;
    config?: Record<string, unknown>;
  }
) {
  const updated = await apiRequest<ListingTemplateRecord>(
    `/listings/templates/${id}`,
    {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input),
    },
    { withCsrf: true }
  );
  if (updated) {
    upsertCachedTemplate(updated);
    broadcastCacheEvent({ key: cacheKeys.listingTemplatesList, action: "update" });
    broadcastCacheEvent({
      key: cacheKeys.listingTemplateDetail(updated.id),
      action: "update",
    });
  }
  return updated;
}

export async function deleteListingTemplate(id: string) {
  const result = await apiRequest<{ ok: boolean }>(
    `/listings/templates/${id}`,
    { method: "DELETE" },
    { withCsrf: true }
  );
  if (result?.ok) {
    removeCachedTemplate(id);
    broadcastCacheEvent({ key: cacheKeys.listingTemplatesList, action: "invalidate" });
    broadcastCacheEvent({
      key: cacheKeys.listingTemplateDetail(id),
      action: "invalidate",
    });
  }
  return result;
}
