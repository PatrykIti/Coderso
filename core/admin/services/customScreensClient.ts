import { apiRequest } from "./apiClient";
import { broadcastCacheEvent } from "@/utils/cacheBus";
import { cacheKeys, cacheTtlMs } from "@/services/cachePolicy";
import { clearLocalCache, readLocalCache, writeLocalCache } from "@/utils/storageCache";
import type { WidgetBlock } from "../../widgets/types";

export type CustomScreenStatus = "draft" | "active";

export type CustomScreenBinding = {
  id: string;
  widgetId: string;
  propPath: string;
  field: string;
  mode: "read" | "write" | "readwrite";
};

export type CustomScreenRecord = {
  id: string;
  name: string;
  contentTypeId: string;
  status: CustomScreenStatus;
  schemaVersion: number;
  blocks: WidgetBlock[];
  bindings: CustomScreenBinding[];
  createdAt: string;
  updatedAt: string;
};

export type CustomScreenCreateInput = {
  name: string;
  contentTypeId: string;
  status?: CustomScreenStatus;
  schemaVersion?: number;
  blocks?: WidgetBlock[] | null;
  bindings?: CustomScreenBinding[] | null;
};

export type CustomScreenUpdateInput = Partial<CustomScreenCreateInput>;

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const isCustomScreenStatus = (value: unknown): value is CustomScreenStatus =>
  value === "draft" || value === "active";

const isCustomScreenRecord = (value: unknown): value is CustomScreenRecord =>
  isRecord(value) &&
  typeof value.id === "string" &&
  typeof value.name === "string" &&
  typeof value.contentTypeId === "string" &&
  isCustomScreenStatus(value.status) &&
  typeof value.schemaVersion === "number" &&
  Array.isArray(value.blocks) &&
  Array.isArray(value.bindings) &&
  typeof value.createdAt === "string" &&
  typeof value.updatedAt === "string";

const isCustomScreenList = (value: unknown): value is CustomScreenRecord[] =>
  Array.isArray(value) && value.every(isCustomScreenRecord);

let cachedScreens: CustomScreenRecord[] | null = null;
let cachedScreensPromise: Promise<CustomScreenRecord[]> | null = null;

const readScreensCache = () =>
  readLocalCache(cacheKeys.customScreensList, cacheTtlMs.list, isCustomScreenList);

const readScreenDetailCache = (id: string) =>
  readLocalCache(cacheKeys.customScreenDetail(id), cacheTtlMs.detail, isCustomScreenRecord);

const writeScreenDetailCache = (item: CustomScreenRecord) => {
  writeLocalCache(cacheKeys.customScreenDetail(item.id), item);
};

const primeScreensCacheInternal = (items: CustomScreenRecord[]) => {
  cachedScreens = items;
  cachedScreensPromise = null;
  writeLocalCache(cacheKeys.customScreensList, items);
};

const upsertCachedScreen = (item: CustomScreenRecord) => {
  const current = cachedScreens ?? readScreensCache() ?? [];
  const index = current.findIndex((entry) => entry.id === item.id);
  const next = [...current];
  if (index === -1) {
    next.unshift(item);
  } else {
    next[index] = { ...next[index], ...item };
  }
  next.sort((left, right) => right.updatedAt.localeCompare(left.updatedAt));
  primeScreensCacheInternal(next);
  writeScreenDetailCache(item);
};

const removeCachedScreen = (id: string) => {
  const current = cachedScreens ?? readScreensCache();
  if (current) primeScreensCacheInternal(current.filter((entry) => entry.id !== id));
  clearLocalCache(cacheKeys.customScreenDetail(id));
};

export const getCachedCustomScreens = () => {
  if (cachedScreens) return cachedScreens;
  const cached = readScreensCache();
  if (cached) cachedScreens = cached;
  return cachedScreens;
};

export const getCachedCustomScreen = (id: string) => {
  const fromMemory = cachedScreens?.find((entry) => entry.id === id);
  if (fromMemory) return fromMemory;
  return readScreenDetailCache(id);
};

export const clearCustomScreensCache = () => {
  cachedScreens = null;
  cachedScreensPromise = null;
  clearLocalCache(cacheKeys.customScreensList);
};

export async function listCustomScreens() {
  const payload = await apiRequest<{ items: CustomScreenRecord[] }>("/custom-screens", {
    method: "GET",
  });
  return payload.items ?? [];
}

export async function listCustomScreensCached(options?: { force?: boolean }) {
  if (!options?.force) {
    const cached = getCachedCustomScreens();
    if (cached) return cached;
    if (cachedScreensPromise) return cachedScreensPromise;
  }
  const request = listCustomScreens();
  cachedScreensPromise = request;
  const items = await request;
  primeScreensCacheInternal(items);
  items.forEach(writeScreenDetailCache);
  return items;
}

export async function getCustomScreen(id: string) {
  return apiRequest<CustomScreenRecord>(`/custom-screens/${encodeURIComponent(id)}`);
}

export async function getCustomScreenCached(id: string, options?: { force?: boolean }) {
  if (!options?.force) {
    const cached = getCachedCustomScreen(id);
    if (cached) return cached;
  }
  try {
    const item = await getCustomScreen(id);
    if (item) upsertCachedScreen(item);
    return item;
  } catch {
    const list = await listCustomScreensCached({ force: true });
    const item = list.find((entry) => entry.id === id) ?? null;
    if (item) writeScreenDetailCache(item);
    return item;
  }
}

export async function createCustomScreen(input: CustomScreenCreateInput) {
  const created = await apiRequest<CustomScreenRecord>(
    "/custom-screens",
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input),
    },
    { withCsrf: true }
  );
  upsertCachedScreen(created);
  broadcastCacheEvent({ key: cacheKeys.customScreensList, action: "update" });
  broadcastCacheEvent({
    key: cacheKeys.customScreenDetail(created.id),
    action: "update",
  });
  return created;
}

export async function updateCustomScreen(id: string, input: CustomScreenUpdateInput) {
  const updated = await apiRequest<CustomScreenRecord>(
    `/custom-screens/${encodeURIComponent(id)}`,
    {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input),
    },
    { withCsrf: true }
  );
  upsertCachedScreen(updated);
  broadcastCacheEvent({ key: cacheKeys.customScreensList, action: "update" });
  broadcastCacheEvent({
    key: cacheKeys.customScreenDetail(updated.id),
    action: "update",
  });
  return updated;
}

export async function deleteCustomScreen(id: string) {
  const result = await apiRequest<{ ok: boolean }>(
    `/custom-screens/${encodeURIComponent(id)}`,
    { method: "DELETE" },
    { withCsrf: true }
  );
  if (result?.ok) {
    removeCachedScreen(id);
    broadcastCacheEvent({ key: cacheKeys.customScreensList, action: "invalidate" });
    broadcastCacheEvent({
      key: cacheKeys.customScreenDetail(id),
      action: "invalidate",
    });
  }
  return result;
}
