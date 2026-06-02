import { apiRequest } from "./apiClient";
import { broadcastCacheEvent } from "@/utils/cacheBus";
import { cacheKeys, cacheTtlMs } from "@/services/cachePolicy";
import { createMemoryBackedLocalCache } from "@/utils/storageCache";

export type RedirectStatusCode = 301 | 302 | 307 | 308;

export type RedirectItem = {
  id: string;
  fromPath: string;
  toPath: string;
  statusCode: RedirectStatusCode;
  enabled: boolean;
  createdAt: string;
  updatedAt: string;
};

export type RedirectCreateInput = {
  fromPath: string;
  toPath: string;
  statusCode: RedirectStatusCode;
  enabled?: boolean;
};

export type RedirectUpdateInput = Partial<RedirectCreateInput>;

let cachedRedirectsPromise: Promise<RedirectItem[]> | null = null;

const isRedirectList = (value: unknown): value is RedirectItem[] => Array.isArray(value);

const redirectsListCache = createMemoryBackedLocalCache({
  key: cacheKeys.redirectsList,
  ttlMs: cacheTtlMs.list,
  validate: isRedirectList,
});

const primeRedirectsCache = (items: RedirectItem[]) => {
  cachedRedirectsPromise = null;
  redirectsListCache.write(items);
};

const upsertCachedRedirect = (item: RedirectItem) => {
  const current = getCachedRedirects() ?? [];
  const index = current.findIndex((redirect) => redirect.id === item.id);
  const next = [...current];
  if (index === -1) next.unshift(item);
  else next[index] = item;
  primeRedirectsCache(next);
};

const removeCachedRedirect = (id: string) => {
  const current = getCachedRedirects();
  if (!current) return;
  primeRedirectsCache(current.filter((redirect) => redirect.id !== id));
};

export const getCachedRedirects = () => redirectsListCache.read();

export const clearRedirectsCache = () => {
  cachedRedirectsPromise = null;
  redirectsListCache.clear();
};

export async function listRedirects() {
  return apiRequest<RedirectItem[]>("/redirects", { method: "GET" });
}

export async function listRedirectsCached(options?: { force?: boolean }) {
  if (!options?.force) {
    const cached = getCachedRedirects();
    if (cached) return cached;
    if (cachedRedirectsPromise) return cachedRedirectsPromise;
  }
  const request = listRedirects();
  cachedRedirectsPromise = request;
  const items = await request;
  primeRedirectsCache(items);
  return items;
}

export async function createRedirect(payload: RedirectCreateInput) {
  const created = await apiRequest<RedirectItem>(
    "/redirects",
    {
      method: "POST",
      body: JSON.stringify(payload),
      headers: { "Content-Type": "application/json" },
    },
    { withCsrf: true }
  );
  if (created) {
    upsertCachedRedirect(created);
    broadcastCacheEvent({ key: cacheKeys.redirectsList, action: "update" });
  }
  return created;
}

export async function updateRedirect(id: string, payload: RedirectUpdateInput) {
  const updated = await apiRequest<RedirectItem>(
    `/redirects/${id}`,
    {
      method: "PATCH",
      body: JSON.stringify(payload),
      headers: { "Content-Type": "application/json" },
    },
    { withCsrf: true }
  );
  if (updated) {
    upsertCachedRedirect(updated);
    broadcastCacheEvent({ key: cacheKeys.redirectsList, action: "update" });
  }
  return updated;
}

export async function deleteRedirect(id: string) {
  const result = await apiRequest<{ ok: true }>(
    `/redirects/${id}`,
    { method: "DELETE" },
    { withCsrf: true }
  );
  if (result?.ok) {
    removeCachedRedirect(id);
    broadcastCacheEvent({ key: cacheKeys.redirectsList, action: "update" });
  }
  return result;
}
