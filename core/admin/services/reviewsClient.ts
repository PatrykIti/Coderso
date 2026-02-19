import { apiRequest } from "./apiClient";
import { broadcastCacheEvent } from "@/utils/cacheBus";
import { cacheKeys, cacheTtlMs } from "@/services/cachePolicy";
import { clearLocalCache, readLocalCache, writeLocalCache } from "@/utils/storageCache";

export type ReviewStatus = "pending" | "approved" | "rejected" | "spam";

export type ReviewRecord = {
  id: string;
  entityType: string;
  entityId: string;
  status: ReviewStatus;
  rating: number;
  title: string | null;
  body: string | null;
  authorName: string;
  authorEmail: string | null;
  metadata: Record<string, unknown>;
  moderatedBy: string | null;
  moderatedAt: string | null;
  createdAt: string;
  updatedAt: string;
  publishedAt: string | null;
};

export type ReviewCreateInput = {
  entityType: string;
  entityId: string;
  status?: ReviewStatus;
  rating: number;
  title?: string | null;
  body?: string | null;
  authorName: string;
  authorEmail?: string | null;
  metadata?: Record<string, unknown>;
};

export type ReviewUpdateInput = {
  rating?: number;
  title?: string | null;
  body?: string | null;
  authorName?: string;
  authorEmail?: string | null;
  metadata?: Record<string, unknown>;
};

export type ReviewListParams = {
  entityType?: string;
  entityId?: string;
  status?: ReviewStatus;
  limit?: number;
  offset?: number;
};

const reviewStatuses: ReviewStatus[] = ["pending", "approved", "rejected", "spam"];

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const isReviewStatus = (value: unknown): value is ReviewStatus =>
  typeof value === "string" && reviewStatuses.includes(value as ReviewStatus);

const isReviewRecord = (value: unknown): value is ReviewRecord =>
  isRecord(value) &&
  typeof value.id === "string" &&
  typeof value.entityType === "string" &&
  typeof value.entityId === "string" &&
  isReviewStatus(value.status) &&
  typeof value.rating === "number" &&
  typeof value.authorName === "string" &&
  typeof value.createdAt === "string" &&
  typeof value.updatedAt === "string";

const isReviewList = (value: unknown): value is ReviewRecord[] =>
  Array.isArray(value) && value.every(isReviewRecord);

let cachedReviews: ReviewRecord[] | null = null;
let cachedReviewsPromise: Promise<ReviewRecord[]> | null = null;

const readReviewsCache = () =>
  readLocalCache(cacheKeys.reviewsList, cacheTtlMs.list, isReviewList);

const readReviewDetailCache = (id: string) =>
  readLocalCache(cacheKeys.reviewDetail(id), cacheTtlMs.detail, isReviewRecord);

const primeReviewsCacheInternal = (items: ReviewRecord[]) => {
  cachedReviews = items;
  cachedReviewsPromise = null;
  writeLocalCache(cacheKeys.reviewsList, items);
};

const writeReviewDetailCache = (item: ReviewRecord) => {
  writeLocalCache(cacheKeys.reviewDetail(item.id), item);
};

const upsertCachedReview = (item: ReviewRecord) => {
  const current = cachedReviews ?? readReviewsCache() ?? [];
  const index = current.findIndex((entry) => entry.id === item.id);
  const next = [...current];
  if (index === -1) {
    next.unshift(item);
  } else {
    next[index] = { ...next[index], ...item };
  }
  next.sort((left, right) => right.createdAt.localeCompare(left.createdAt));
  primeReviewsCacheInternal(next);
  writeReviewDetailCache(item);
};

const removeCachedReview = (id: string) => {
  const current = cachedReviews ?? readReviewsCache();
  if (current) primeReviewsCacheInternal(current.filter((entry) => entry.id !== id));
  clearLocalCache(cacheKeys.reviewDetail(id));
};

const toQueryString = (params?: ReviewListParams) => {
  if (!params) return "";
  const query = new URLSearchParams();
  if (typeof params.entityType === "string" && params.entityType.trim().length > 0) {
    query.set("entityType", params.entityType.trim());
  }
  if (typeof params.entityId === "string" && params.entityId.trim().length > 0) {
    query.set("entityId", params.entityId.trim());
  }
  if (params.status) query.set("status", params.status);
  if (typeof params.limit === "number" && Number.isFinite(params.limit) && params.limit > 0) {
    query.set("limit", String(Math.floor(params.limit)));
  }
  if (typeof params.offset === "number" && Number.isFinite(params.offset) && params.offset >= 0) {
    query.set("offset", String(Math.floor(params.offset)));
  }
  const serialized = query.toString();
  return serialized ? `?${serialized}` : "";
};

export const getCachedReviews = () => {
  if (cachedReviews) return cachedReviews;
  const cached = readReviewsCache();
  if (cached) cachedReviews = cached;
  return cachedReviews;
};

export const getCachedReview = (id: string) => {
  const fromMemory = cachedReviews?.find((entry) => entry.id === id);
  if (fromMemory) return fromMemory;
  return readReviewDetailCache(id);
};

export const clearReviewsCache = () => {
  cachedReviews = null;
  cachedReviewsPromise = null;
  clearLocalCache(cacheKeys.reviewsList);
};

export async function listReviews(params?: ReviewListParams) {
  const route = `/reviews${toQueryString(params)}`;
  const payload = await apiRequest<{ items: ReviewRecord[] }>(route, {
    method: "GET",
  });
  return payload.items ?? [];
}

export async function listReviewsCached(options?: { force?: boolean }) {
  if (!options?.force) {
    const cached = getCachedReviews();
    if (cached) return cached;
    if (cachedReviewsPromise) return cachedReviewsPromise;
  }
  const request = listReviews();
  cachedReviewsPromise = request;
  const items = await request;
  primeReviewsCacheInternal(items);
  items.forEach(writeReviewDetailCache);
  return items;
}

export async function getReview(id: string) {
  return apiRequest<ReviewRecord>(`/reviews/${id}`, { method: "GET" });
}

export async function getReviewCached(id: string, options?: { force?: boolean }) {
  if (!options?.force) {
    const cached = getCachedReview(id);
    if (cached) return cached;
  }
  try {
    const item = await getReview(id);
    if (item) upsertCachedReview(item);
    return item;
  } catch {
    const list = await listReviewsCached({ force: true });
    const item = list.find((entry) => entry.id === id) ?? null;
    if (item) writeReviewDetailCache(item);
    return item;
  }
}

export async function createReview(input: ReviewCreateInput) {
  const created = await apiRequest<ReviewRecord>(
    "/reviews",
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input),
    },
    { withCsrf: true }
  );
  upsertCachedReview(created);
  broadcastCacheEvent({ key: cacheKeys.reviewsList, action: "update" });
  broadcastCacheEvent({ key: cacheKeys.reviewDetail(created.id), action: "update" });
  return created;
}

export async function updateReview(id: string, input: ReviewUpdateInput) {
  const updated = await apiRequest<ReviewRecord>(
    `/reviews/${id}`,
    {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input),
    },
    { withCsrf: true }
  );
  upsertCachedReview(updated);
  broadcastCacheEvent({ key: cacheKeys.reviewsList, action: "update" });
  broadcastCacheEvent({ key: cacheKeys.reviewDetail(updated.id), action: "update" });
  return updated;
}

export async function updateReviewStatus(id: string, status: ReviewStatus) {
  const updated = await apiRequest<ReviewRecord>(
    `/reviews/${id}/status`,
    {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    },
    { withCsrf: true }
  );
  upsertCachedReview(updated);
  broadcastCacheEvent({ key: cacheKeys.reviewsList, action: "update" });
  broadcastCacheEvent({ key: cacheKeys.reviewDetail(updated.id), action: "update" });
  return updated;
}

export async function deleteReview(id: string) {
  const result = await apiRequest<{ ok: boolean }>(
    `/reviews/${id}`,
    { method: "DELETE" },
    { withCsrf: true }
  );
  if (result?.ok) {
    removeCachedReview(id);
    broadcastCacheEvent({ key: cacheKeys.reviewsList, action: "invalidate" });
    broadcastCacheEvent({ key: cacheKeys.reviewDetail(id), action: "invalidate" });
  }
  return result;
}
