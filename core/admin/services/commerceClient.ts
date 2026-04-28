import { apiRequest } from "./apiClient";
import { broadcastCacheEvent } from "@/utils/cacheBus";
import { cacheKeys, cacheTtlMs } from "@/services/cachePolicy";
import { clearLocalCache, readLocalCache, writeLocalCache } from "@/utils/storageCache";

export type CommerceProductStatus = "draft" | "published" | "archived";
export type CommerceStockState = "in_stock" | "out_of_stock" | "backorder";

export type CommerceMoney = {
  amount: number;
  currency: string;
  compareAtAmount: number | null;
};

export type CommerceStock = {
  state: CommerceStockState;
  quantity: number | null;
};

export type CommerceVariant = {
  id?: string;
  sku: string | null;
  title: string;
  pricing: CommerceMoney;
  stock: CommerceStock;
  attributes: Record<string, string>;
  isDefault: boolean;
};

export type CommerceProductRecord = {
  id: string;
  title: string;
  slug: string;
  status: CommerceProductStatus;
  excerpt: string | null;
  description: string | null;
  pricing: CommerceMoney;
  stock: CommerceStock;
  collectionIds: string[];
  mediaIds: string[];
  variants: CommerceVariant[];
  metadata: Record<string, unknown>;
  data: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
  publishedAt: string | null;
};

export type CommerceCollectionRecord = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  createdAt: string;
  updatedAt: string;
};

export type CommerceQueryFilter = {
  field: string;
  op: "eq" | "neq" | "in" | "nin" | "contains" | "gt" | "gte" | "lt" | "lte" | "between" | "exists";
  value?: unknown;
};

export type CommerceQuerySort = {
  field:
    | "title"
    | "slug"
    | "status"
    | "pricing.amount"
    | "stock.state"
    | "createdAt"
    | "updatedAt"
    | "publishedAt";
  dir: "asc" | "desc";
};

export type CommerceQueryPayload = {
  filters: CommerceQueryFilter[];
  sort: CommerceQuerySort[];
  pagination: {
    limit: number;
    offset: number;
  };
  status?: CommerceProductStatus[];
  collectionIds?: string[];
  search?: string | null;
};

export type CommerceQueryResult = {
  total: number;
  limit: number;
  offset: number;
  query: CommerceQueryPayload;
  rows: CommerceProductRecord[];
};

export type CommerceProductInput = {
  title: string;
  slug?: string | null;
  status?: CommerceProductStatus;
  excerpt?: string | null;
  description?: string | null;
  pricing: CommerceMoney;
  stock: CommerceStock;
  collectionIds?: string[];
  mediaIds?: string[];
  variants?: CommerceVariant[];
  metadata?: Record<string, unknown>;
  data?: Record<string, unknown>;
};

export type CommerceProductUpdateInput = Partial<CommerceProductInput>;

export type CommerceCollectionInput = {
  name: string;
  slug?: string | null;
  description?: string | null;
};

export type CommerceCollectionUpdateInput = Partial<CommerceCollectionInput>;

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const isProductStatus = (value: unknown): value is CommerceProductStatus =>
  value === "draft" || value === "published" || value === "archived";

const isCommerceProductRecord = (value: unknown): value is CommerceProductRecord =>
  isRecord(value) &&
  typeof value.id === "string" &&
  typeof value.title === "string" &&
  typeof value.slug === "string" &&
  isProductStatus(value.status) &&
  typeof value.createdAt === "string" &&
  typeof value.updatedAt === "string";

const isCommerceCollectionRecord = (value: unknown): value is CommerceCollectionRecord =>
  isRecord(value) &&
  typeof value.id === "string" &&
  typeof value.name === "string" &&
  typeof value.slug === "string" &&
  typeof value.createdAt === "string" &&
  typeof value.updatedAt === "string";

const isCommerceProductList = (value: unknown): value is CommerceProductRecord[] =>
  Array.isArray(value) && value.every(isCommerceProductRecord);

const isCommerceCollectionList = (value: unknown): value is CommerceCollectionRecord[] =>
  Array.isArray(value) && value.every(isCommerceCollectionRecord);

let cachedProducts: CommerceProductRecord[] | null = null;
let cachedProductsPromise: Promise<CommerceProductRecord[]> | null = null;
let cachedCollections: CommerceCollectionRecord[] | null = null;
let cachedCollectionsPromise: Promise<CommerceCollectionRecord[]> | null = null;

const readProductsCache = () =>
  readLocalCache(cacheKeys.commerceProductsList, cacheTtlMs.list, isCommerceProductList);

const readProductDetailCache = (id: string) =>
  readLocalCache(cacheKeys.commerceProductDetail(id), cacheTtlMs.detail, isCommerceProductRecord);

const readCollectionsCache = () =>
  readLocalCache(cacheKeys.commerceCollectionsList, cacheTtlMs.list, isCommerceCollectionList);

const primeProductsCache = (items: CommerceProductRecord[]) => {
  cachedProducts = items;
  cachedProductsPromise = null;
  writeLocalCache(cacheKeys.commerceProductsList, items);
  for (const item of items) {
    writeLocalCache(cacheKeys.commerceProductDetail(item.id), item);
  }
};

const primeCollectionsCache = (items: CommerceCollectionRecord[]) => {
  cachedCollections = items;
  cachedCollectionsPromise = null;
  writeLocalCache(cacheKeys.commerceCollectionsList, items);
};

const upsertProduct = (item: CommerceProductRecord) => {
  const current = cachedProducts ?? readProductsCache() ?? [];
  const index = current.findIndex((entry) => entry.id === item.id);
  const next = [...current];
  if (index === -1) next.unshift(item);
  else next[index] = { ...next[index], ...item };
  next.sort((left, right) => right.updatedAt.localeCompare(left.updatedAt));
  primeProductsCache(next);
  writeLocalCache(cacheKeys.commerceProductDetail(item.id), item);
};

const removeProduct = (id: string) => {
  const current = cachedProducts ?? readProductsCache();
  if (current) primeProductsCache(current.filter((entry) => entry.id !== id));
  clearLocalCache(cacheKeys.commerceProductDetail(id));
};

const upsertCollection = (item: CommerceCollectionRecord) => {
  const current = cachedCollections ?? readCollectionsCache() ?? [];
  const index = current.findIndex((entry) => entry.id === item.id);
  const next = [...current];
  if (index === -1) next.push(item);
  else next[index] = { ...next[index], ...item };
  next.sort((left, right) => left.name.localeCompare(right.name));
  primeCollectionsCache(next);
};

const removeCollection = (id: string) => {
  const current = cachedCollections ?? readCollectionsCache();
  if (current) primeCollectionsCache(current.filter((entry) => entry.id !== id));
};

export const clearCommerceCache = () => {
  cachedProducts = null;
  cachedProductsPromise = null;
  cachedCollections = null;
  cachedCollectionsPromise = null;
  clearLocalCache(cacheKeys.commerceProductsList);
  clearLocalCache(cacheKeys.commerceCollectionsList);
};

export const getCachedCommerceProducts = () => {
  if (cachedProducts) return cachedProducts;
  const cached = readProductsCache();
  if (cached) cachedProducts = cached;
  return cachedProducts;
};

export const getCachedCommerceProduct = (id: string) => {
  const fromMemory = cachedProducts?.find((item) => item.id === id);
  if (fromMemory) return fromMemory;
  return readProductDetailCache(id);
};

export const getCachedCommerceCollections = () => {
  if (cachedCollections) return cachedCollections;
  const cached = readCollectionsCache();
  if (cached) cachedCollections = cached;
  return cachedCollections;
};

export async function listCommerceProducts() {
  const payload = await apiRequest<{ items: CommerceProductRecord[] }>("/commerce/products", {
    method: "GET",
  });
  return payload.items ?? [];
}

export async function listCommerceProductsCached(options?: { force?: boolean }) {
  if (!options?.force) {
    const cached = getCachedCommerceProducts();
    if (cached) return cached;
    if (cachedProductsPromise) return cachedProductsPromise;
  }
  const request = listCommerceProducts();
  cachedProductsPromise = request;
  const items = await request;
  primeProductsCache(items);
  return items;
}

export async function getCommerceProduct(id: string) {
  return apiRequest<CommerceProductRecord>(`/commerce/products/${id}`, { method: "GET" });
}

export async function getCommerceProductCached(id: string, options?: { force?: boolean }) {
  if (!options?.force) {
    const cached = getCachedCommerceProduct(id);
    if (cached) return cached;
  }
  const item = await getCommerceProduct(id);
  upsertProduct(item);
  return item;
}

export async function createCommerceProduct(input: CommerceProductInput) {
  const item = await apiRequest<CommerceProductRecord>(
    "/commerce/products",
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input),
    },
    { withCsrf: true }
  );
  upsertProduct(item);
  broadcastCacheEvent({ key: cacheKeys.commerceProductsList, action: "update" });
  return item;
}

export async function updateCommerceProduct(id: string, input: CommerceProductUpdateInput) {
  const item = await apiRequest<CommerceProductRecord>(
    `/commerce/products/${id}`,
    {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input),
    },
    { withCsrf: true }
  );
  upsertProduct(item);
  broadcastCacheEvent({ key: cacheKeys.commerceProductsList, action: "update" });
  return item;
}

export async function deleteCommerceProduct(id: string) {
  await apiRequest<{ ok: boolean }>(
    `/commerce/products/${id}`,
    { method: "DELETE" },
    { withCsrf: true }
  );
  removeProduct(id);
  broadcastCacheEvent({ key: cacheKeys.commerceProductsList, action: "invalidate" });
}

export async function setCommerceProductCollections(productId: string, collectionIds: string[]) {
  const item = await apiRequest<CommerceProductRecord>(
    `/commerce/products/${productId}/collections`,
    {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ collectionIds }),
    },
    { withCsrf: true }
  );
  upsertProduct(item);
  broadcastCacheEvent({ key: cacheKeys.commerceProductsList, action: "update" });
  return item;
}

export async function previewCommerceProductsQuery(input: CommerceQueryPayload) {
  return apiRequest<CommerceQueryResult>("/commerce/products/query", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
}

export async function listCommerceCollections() {
  const payload = await apiRequest<{ items: CommerceCollectionRecord[] }>("/commerce/collections", {
    method: "GET",
  });
  return payload.items ?? [];
}

export async function listCommerceCollectionsCached(options?: { force?: boolean }) {
  if (!options?.force) {
    const cached = getCachedCommerceCollections();
    if (cached) return cached;
    if (cachedCollectionsPromise) return cachedCollectionsPromise;
  }
  const request = listCommerceCollections();
  cachedCollectionsPromise = request;
  const items = await request;
  primeCollectionsCache(items);
  return items;
}

export async function createCommerceCollection(input: CommerceCollectionInput) {
  const item = await apiRequest<CommerceCollectionRecord>(
    "/commerce/collections",
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input),
    },
    { withCsrf: true }
  );
  upsertCollection(item);
  broadcastCacheEvent({ key: cacheKeys.commerceCollectionsList, action: "update" });
  return item;
}

export async function updateCommerceCollection(id: string, input: CommerceCollectionUpdateInput) {
  const item = await apiRequest<CommerceCollectionRecord>(
    `/commerce/collections/${id}`,
    {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input),
    },
    { withCsrf: true }
  );
  upsertCollection(item);
  broadcastCacheEvent({ key: cacheKeys.commerceCollectionsList, action: "update" });
  return item;
}

export async function deleteCommerceCollection(id: string) {
  await apiRequest<{ ok: boolean }>(
    `/commerce/collections/${id}`,
    { method: "DELETE" },
    { withCsrf: true }
  );
  removeCollection(id);
  broadcastCacheEvent({ key: cacheKeys.commerceCollectionsList, action: "invalidate" });
}
