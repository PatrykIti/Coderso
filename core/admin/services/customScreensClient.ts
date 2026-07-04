import { apiRequest } from "./apiClient";
import { broadcastCacheEvent } from "@/utils/cacheBus";
import { cacheKeys, cacheTtlMs } from "@/services/cachePolicy";
import {
  clearCustomScreenDetailBrowserCache,
  clearCustomScreensBrowserCache,
} from "@/services/customScreensCache";
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
  customScreenCollectionRoleValues,
  getCustomScreenEditorViewBindings,
  getCustomScreenEditorViewBlocks,
  normalizeCustomScreenDefinitionForRead,
  type CustomScreenBindingWarning,
  type CustomScreenCollectionRole,
  type CustomScreenDefinition,
} from "../../services/customScreens/customScreenSchemas";
import {
  screenEntryPresentationOverridePropPaths,
  type ScreenEntryPresentationOverrideDraft,
  type ScreenEntryPresentationOverridePropPath,
} from "../../services/customScreens/screenEntryPresentationOverrideContract";

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
  collectionRole: CustomScreenCollectionRole | null;
  compositionKey: string | null;
  showInSidebar: boolean;
  sidebarLabel: string | null;
  schemaVersion: number;
  definition?: CustomScreenDefinition;
  blocks: WidgetBlock[];
  bindings: CustomScreenBinding[];
  capabilities?: CustomScreenCapabilities;
  createdAt: string;
  updatedAt: string;
  // TASK-505-03 (Item B3): TRANSIENT binding-GC warnings the server (505-01)
  // attaches to the PATCH 200 response when the save-path GC pruned orphaned
  // bindings — computed at normalize time, NEVER persisted. Type-only carry so
  // the raw returned record typechecks in the editor (`isCustomScreenRecord`
  // ignores extra keys; `normalizeCustomScreenRecord` spreads `...item`;
  // `updateCustomScreen` returns the raw record → the field survives to the UI).
  warnings?: CustomScreenBindingWarning[];
};

export type CustomScreenCreateInput = {
  name: string;
  contentTypeId: string;
  status?: CustomScreenStatus;
  collectionRole?: CustomScreenCollectionRole | null;
  compositionKey?: string | null;
  showInSidebar?: boolean;
  sidebarLabel?: string | null;
  schemaVersion?: 4;
  definition?: CustomScreenDefinition | null;
};

export type CustomScreenUpdateInput = Partial<CustomScreenCreateInput>;

export type CustomScreenEntryPresentationOverride = ScreenEntryPresentationOverrideDraft;

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const screenEntryPresentationOverridePropPathSet = new Set<string>(
  screenEntryPresentationOverridePropPaths
);

const isScreenEntryPresentationOverridePropPath = (
  value: unknown
): value is ScreenEntryPresentationOverridePropPath =>
  typeof value === "string" && screenEntryPresentationOverridePropPathSet.has(value);

const normalizeScreenEntryPresentationOverrideDraft = (
  value: unknown
): ScreenEntryPresentationOverrideDraft | null => {
  if (!isRecord(value)) return null;
  if (
    typeof value.blockId !== "string" ||
    !isScreenEntryPresentationOverridePropPath(value.propPath) ||
    typeof value.value !== "string"
  ) {
    return null;
  }
  return {
    blockId: value.blockId,
    propPath: value.propPath,
    value: value.value,
  };
};

const normalizeScreenEntryPresentationOverrides = (
  value: unknown[]
): ScreenEntryPresentationOverrideDraft[] =>
  value.flatMap((item) => {
    const normalized = normalizeScreenEntryPresentationOverrideDraft(item);
    return normalized ? [normalized] : [];
  });

const isScreenEntryPresentationOverrideList = (value: unknown): value is unknown[] =>
  Array.isArray(value) &&
  value.every((item) => normalizeScreenEntryPresentationOverrideDraft(item) !== null);

const isCustomScreenStatus = (value: unknown): value is CustomScreenStatus =>
  value === "draft" || value === "active";

const isCustomScreenCollectionRole = (value: unknown): value is CustomScreenCollectionRole =>
  customScreenCollectionRoleValues.includes(value as CustomScreenCollectionRole);

const isCustomScreenRecord = (value: unknown): value is CustomScreenRecord =>
  isRecord(value) &&
  typeof value.id === "string" &&
  typeof value.name === "string" &&
  typeof value.contentTypeId === "string" &&
  isCustomScreenStatus(value.status) &&
  (value.collectionRole === undefined ||
    value.collectionRole === null ||
    isCustomScreenCollectionRole(value.collectionRole)) &&
  (value.compositionKey === undefined ||
    value.compositionKey === null ||
    typeof value.compositionKey === "string") &&
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
const screenEntryOverridesPromises = new Map<
  string,
  Promise<ScreenEntryPresentationOverrideDraft[]>
>();

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
    blocks: getCustomScreenEditorViewBlocks(definition),
    bindings: getCustomScreenEditorViewBindings(definition),
    collectionRole: item.collectionRole ?? null,
    compositionKey: item.compositionKey ?? null,
    showInSidebar: item.showInSidebar ?? false,
    sidebarLabel: item.sidebarLabel ?? null,
    capabilities: item.capabilities ?? resolveCustomScreenCapabilities({ definition }),
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
  clearCustomScreenDetailBrowserCache(id);
};

const getScreenEntryOverridesCacheKey = (screenId: string, entryId: string) =>
  cacheKeys.customScreenEntryOverrides(screenId, entryId);

const readScreenEntryOverridesCache = (screenId: string, entryId: string) => {
  const cached = readLocalCache(
    getScreenEntryOverridesCacheKey(screenId, entryId),
    cacheTtlMs.detail,
    isScreenEntryPresentationOverrideList
  );
  return cached ? normalizeScreenEntryPresentationOverrides(cached) : null;
};

const writeScreenEntryOverridesCache = (
  screenId: string,
  entryId: string,
  overrides: ScreenEntryPresentationOverrideDraft[]
) => {
  writeLocalCache(getScreenEntryOverridesCacheKey(screenId, entryId), overrides);
};

const clearScreenEntryOverridesCache = (screenId: string, entryId: string) => {
  const key = getScreenEntryOverridesCacheKey(screenId, entryId);
  screenEntryOverridesPromises.delete(key);
  clearLocalCache(key);
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

export const getCachedScreenEntryOverrides = (screenId: string, entryId: string) =>
  readScreenEntryOverridesCache(screenId, entryId);

export const clearCustomScreensCache = () => {
  cachedScreensPromise = null;
  customScreensListCache.clear();
  clearCustomScreensBrowserCache();
};

async function getScreenEntryOverrides(screenId: string, entryId: string) {
  const payload = await apiRequest<{ overrides: unknown[] }>(
    `/custom-screens/${encodeURIComponent(screenId)}/entries/${encodeURIComponent(entryId)}/overrides`,
    { method: "GET" }
  );
  return normalizeScreenEntryPresentationOverrides(payload.overrides ?? []);
}

export async function getScreenEntryOverridesCached(
  screenId: string,
  entryId: string,
  options?: { force?: boolean }
) {
  const key = getScreenEntryOverridesCacheKey(screenId, entryId);
  if (!options?.force) {
    const cached = getCachedScreenEntryOverrides(screenId, entryId);
    if (cached) return cached;
    const pending = screenEntryOverridesPromises.get(key);
    if (pending) return pending;
  }

  const request = getScreenEntryOverrides(screenId, entryId);
  screenEntryOverridesPromises.set(key, request);
  try {
    const overrides = await request;
    writeScreenEntryOverridesCache(screenId, entryId, overrides);
    return overrides;
  } finally {
    if (screenEntryOverridesPromises.get(key) === request) {
      screenEntryOverridesPromises.delete(key);
    }
  }
}

export async function replaceScreenEntryOverrides(
  screenId: string,
  entryId: string,
  overrides: ScreenEntryPresentationOverrideDraft[]
) {
  const normalized = normalizeScreenEntryPresentationOverrides(overrides);
  const payload = await apiRequest<{ overrides: unknown[] }>(
    `/custom-screens/${encodeURIComponent(screenId)}/entries/${encodeURIComponent(entryId)}/overrides`,
    {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ overrides: normalized }),
    },
    { withCsrf: true }
  );
  const saved = normalizeScreenEntryPresentationOverrides(payload.overrides ?? []);
  writeScreenEntryOverridesCache(screenId, entryId, saved);
  broadcastCacheEvent({
    key: getScreenEntryOverridesCacheKey(screenId, entryId),
    action: "update",
  });
  return saved;
}

export const invalidateScreenEntryOverrides = (screenId: string, entryId: string) => {
  clearScreenEntryOverridesCache(screenId, entryId);
  broadcastCacheEvent({
    key: getScreenEntryOverridesCacheKey(screenId, entryId),
    action: "invalidate",
  });
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
