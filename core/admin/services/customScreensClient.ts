import { apiRequest } from "./apiClient";
import { broadcastCacheEvent } from "@/utils/cacheBus";
import { cacheKeys, cacheTtlMs } from "@/services/cachePolicy";
import {
  clearLocalCache,
  createMemoryBackedLocalCache,
  readLocalCache,
  writeLocalCache,
} from "@/utils/storageCache";
import type { WidgetBlock } from "../../widgets/types";
import {
  resolveCustomScreenCapabilities,
  type CustomScreenCapabilities,
} from "../../services/customScreens/capabilities";
import {
  normalizeCustomScreenDefinitionForRead,
  type CustomScreenDefinition,
} from "../../services/customScreens/customScreenSchemas";

export type CustomScreenStatus = "draft" | "active";

export type CustomScreenBinding = {
  id: string;
  widgetId: string;
  propPath: string;
  field: string;
  mode: "read" | "write" | "readwrite";
};

const isCustomScreenCapabilities = (value: unknown): value is CustomScreenCapabilities => {
  if (!isRecord(value)) return false;
  const counts = isRecord(value.bindingCounts) ? value.bindingCounts : null;
  return (
    (value.mode === "collection-only" || value.mode === "dashboard" || value.mode === "editor") &&
    typeof value.hasBlocks === "boolean" &&
    typeof value.hasBindings === "boolean" &&
    typeof value.hasReadableBindings === "boolean" &&
    typeof value.hasWritableBindings === "boolean" &&
    typeof value.supportsDedicatedPreview === "boolean" &&
    typeof value.supportsDedicatedEditor === "boolean" &&
    counts !== null &&
    typeof counts.total === "number" &&
    typeof counts.readable === "number" &&
    typeof counts.writable === "number"
  );
};

export type CustomScreenRecord = {
  id: string;
  name: string;
  contentTypeId: string;
  status: CustomScreenStatus;
  showInSidebar: boolean;
  sidebarLabel: string | null;
  schemaVersion: number;
  definition?: CustomScreenDefinition;
  blocks: WidgetBlock[];
  bindings: CustomScreenBinding[];
  capabilities?: CustomScreenCapabilities;
  createdAt: string;
  updatedAt: string;
};

export type CustomScreenCreateInput = {
  name: string;
  contentTypeId: string;
  status?: CustomScreenStatus;
  showInSidebar?: boolean;
  sidebarLabel?: string | null;
  schemaVersion?: number;
  definition?: CustomScreenDefinition | null;
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
  (value.showInSidebar === undefined || typeof value.showInSidebar === "boolean") &&
  (value.sidebarLabel === undefined ||
    value.sidebarLabel === null ||
    typeof value.sidebarLabel === "string") &&
  typeof value.schemaVersion === "number" &&
  (value.definition === undefined || isRecord(value.definition)) &&
  Array.isArray(value.blocks) &&
  Array.isArray(value.bindings) &&
  (value.capabilities === undefined || isCustomScreenCapabilities(value.capabilities)) &&
  typeof value.createdAt === "string" &&
  typeof value.updatedAt === "string";

const isCustomScreenList = (value: unknown): value is CustomScreenRecord[] =>
  Array.isArray(value) && value.every(isCustomScreenRecord);

let cachedScreensPromise: Promise<CustomScreenRecord[]> | null = null;

const normalizeCustomScreenRecord = (item: CustomScreenRecord): CustomScreenRecord => {
  const definition = normalizeCustomScreenDefinitionForRead({
    definition: item.definition,
    schemaVersion: item.schemaVersion,
    blocks: item.blocks,
    bindings: item.bindings,
  });
  return {
    ...item,
    schemaVersion: definition.schemaVersion,
    definition,
    blocks: definition.editorView.blocks,
    bindings: definition.editorView.bindings,
    showInSidebar: item.showInSidebar ?? false,
    sidebarLabel: item.sidebarLabel ?? null,
    capabilities: item.capabilities ?? resolveCustomScreenCapabilities(definition),
  };
};

const customScreensListCache = createMemoryBackedLocalCache({
  key: cacheKeys.customScreensList,
  ttlMs: cacheTtlMs.list,
  validate: isCustomScreenList,
});

const readScreensCache = () =>
  customScreensListCache.read()?.map(normalizeCustomScreenRecord) ?? null;

const readScreenDetailCache = (id: string) =>
  readLocalCache(cacheKeys.customScreenDetail(id), cacheTtlMs.detail, isCustomScreenRecord);

const writeScreenDetailCache = (item: CustomScreenRecord) => {
  writeLocalCache(cacheKeys.customScreenDetail(item.id), normalizeCustomScreenRecord(item));
};

const primeScreensCacheInternal = (items: CustomScreenRecord[]) => {
  cachedScreensPromise = null;
  customScreensListCache.write(items.map(normalizeCustomScreenRecord));
};

const upsertCachedScreen = (item: CustomScreenRecord) => {
  const current = readScreensCache() ?? [];
  const index = current.findIndex((entry) => entry.id === item.id);
  const next = [...current];
  if (index === -1) {
    next.unshift(normalizeCustomScreenRecord(item));
  } else {
    next[index] = normalizeCustomScreenRecord({ ...next[index], ...item });
  }
  next.sort((left, right) => right.updatedAt.localeCompare(left.updatedAt));
  primeScreensCacheInternal(next);
  writeScreenDetailCache(item);
};

const removeCachedScreen = (id: string) => {
  const current = readScreensCache();
  if (current) primeScreensCacheInternal(current.filter((entry) => entry.id !== id));
  clearLocalCache(cacheKeys.customScreenDetail(id));
};

export const getCachedCustomScreens = () => {
  return readScreensCache();
};

export const getCachedCustomScreen = (id: string) => {
  const fromMemory = readScreensCache()?.find((entry) => entry.id === id);
  if (fromMemory) return fromMemory;
  const cached = readScreenDetailCache(id);
  return cached ? normalizeCustomScreenRecord(cached) : cached;
};

export const clearCustomScreensCache = () => {
  cachedScreensPromise = null;
  customScreensListCache.clear();
};

export async function listCustomScreens() {
  const payload = await apiRequest<{ items: CustomScreenRecord[] }>("/custom-screens", {
    method: "GET",
  });
  return (payload.items ?? []).map(normalizeCustomScreenRecord);
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
  const item = await apiRequest<CustomScreenRecord>(`/custom-screens/${encodeURIComponent(id)}`);
  return normalizeCustomScreenRecord(item);
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
  upsertCachedScreen(normalizeCustomScreenRecord(created));
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
  upsertCachedScreen(normalizeCustomScreenRecord(updated));
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
