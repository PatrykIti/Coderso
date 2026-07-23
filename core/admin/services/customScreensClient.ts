import { apiRequest } from "./apiClient";
import { broadcastCacheEvent, type CacheEventOperationToken } from "@/utils/cacheBus";
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
  normalizeScreenEntryPresentationOverrideList,
  type ScreenEntryPresentationOverrideDraft,
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

export type CustomScreenMutationOptions = Readonly<{
  cacheEventOperationToken?: CacheEventOperationToken;
}>;

export type CustomScreenEntryPresentationOverride = ScreenEntryPresentationOverrideDraft;

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const isScreenEntryPresentationOverrideList = (
  value: unknown
): value is ScreenEntryPresentationOverrideDraft[] => {
  try {
    normalizeScreenEntryPresentationOverrideList(value, { source: "draft-cache" });
    return true;
  } catch {
    return false;
  }
};

const normalizeOverrideResponseEnvelope = (
  value: unknown
): ScreenEntryPresentationOverrideDraft[] => {
  if (!isRecord(value) || Object.keys(value).some((key) => key !== "overrides")) {
    throw new Error("custom_screen_override_invalid");
  }
  return normalizeScreenEntryPresentationOverrideList(value.overrides, {
    source: "transport-response",
  });
};

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

type PendingVersioned<T> = Readonly<{ promise: Promise<T>; version: number }>;

type ScreenItemAuthority = Readonly<{
  version: number;
  change: Readonly<{ kind: "replace"; value: CustomScreenRecord }> | Readonly<{ kind: "delete" }>;
}>;

let pendingScreensList: PendingVersioned<CustomScreenRecord[]> | null = null;
let committedScreensListVersion = 0;
let screenPublicationVersion = 0;
const pendingScreenDetails = new Map<string, PendingVersioned<CustomScreenRecord | null>>();
const settledScreenItemAuthority = new Map<string, ScreenItemAuthority>();
const screenDetailValueVersions = new Map<string, number>();
const knownScreenDetailIds = new Set<string>();
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
  customScreensListCache.write(items.map(normalizeCustomScreenRecord));
};

const nextScreenPublicationVersion = () => {
  screenPublicationVersion += 1;
  return screenPublicationVersion;
};

const readScreenDetailValue = (id: string) => {
  knownScreenDetailIds.add(id);
  const cached = readScreenDetailCache(id);
  if (!cached) return null;
  const version = screenDetailValueVersions.get(id);
  if (version === undefined) {
    if (committedScreensListVersion > 0) {
      clearCustomScreenDetailBrowserCache(id);
      return null;
    }
    screenDetailValueVersions.set(id, 0);
  }
  return normalizeCustomScreenRecord(cached);
};

const writeScreenDetailValue = (item: CustomScreenRecord, version: number) => {
  if (version <= committedScreensListVersion) return;
  if ((screenDetailValueVersions.get(item.id) ?? 0) > version) return;
  const normalized = normalizeCustomScreenRecord(item);
  knownScreenDetailIds.add(normalized.id);
  screenDetailValueVersions.set(normalized.id, version);
  writeScreenDetailCache(normalized);
};

const mergeScreenIntoCurrentList = (item: CustomScreenRecord, version: number) => {
  if (version <= committedScreensListVersion) return;
  const normalized = normalizeCustomScreenRecord(item);
  const current = readScreensCache() ?? [];
  const index = current.findIndex((entry) => entry.id === normalized.id);
  const next = [...current];
  if (index === -1) {
    next.unshift(normalized);
  } else {
    next[index] = normalizeCustomScreenRecord({ ...next[index], ...normalized });
  }
  next.sort((left, right) => right.updatedAt.localeCompare(left.updatedAt));
  primeScreensCacheInternal(next);
};

const removeScreenFromCurrentListAndDetail = (id: string) => {
  const current = readScreensCache();
  if (current) primeScreensCacheInternal(current.filter((entry) => entry.id !== id));
  knownScreenDetailIds.add(id);
  screenDetailValueVersions.delete(id);
  clearCustomScreenDetailBrowserCache(id);
};

const settleScreenItemAuthority = (id: string, authority: ScreenItemAuthority) => {
  const existing = settledScreenItemAuthority.get(id);
  if (!existing || authority.version > existing.version) {
    settledScreenItemAuthority.set(id, authority);
  }
};

const revokePendingScreenDetail = (id: string) => {
  pendingScreenDetails.delete(id);
};

const removePendingScreenDetailIfExact = (
  id: string,
  pending: PendingVersioned<CustomScreenRecord | null>
) => {
  if (pendingScreenDetails.get(id) === pending) pendingScreenDetails.delete(id);
};

const publishSuccessfulScreenReplace = (item: CustomScreenRecord) => {
  const normalized = normalizeCustomScreenRecord(item);
  const version = nextScreenPublicationVersion();
  revokePendingScreenDetail(normalized.id);
  settleScreenItemAuthority(normalized.id, {
    version,
    change: { kind: "replace", value: normalized },
  });
  mergeScreenIntoCurrentList(normalized, version);
  writeScreenDetailValue(normalized, version);
};

const publishSuccessfulScreenDelete = (id: string) => {
  const version = nextScreenPublicationVersion();
  revokePendingScreenDetail(id);
  settleScreenItemAuthority(id, { version, change: { kind: "delete" } });
  removeScreenFromCurrentListAndDetail(id);
};

const reconcileCompleteScreenList = (serverItems: CustomScreenRecord[], listVersion: number) => {
  let reconciled = serverItems.map(normalizeCustomScreenRecord);
  for (const [id, authority] of settledScreenItemAuthority) {
    if (authority.version <= listVersion) continue;
    const index = reconciled.findIndex((item) => item.id === id);
    if (authority.change.kind === "delete") {
      if (index !== -1) reconciled = reconciled.filter((item) => item.id !== id);
      continue;
    }
    const replacement = normalizeCustomScreenRecord(authority.change.value);
    if (index === -1) reconciled.unshift(replacement);
    else reconciled[index] = replacement;
  }
  return reconciled;
};

const invalidateScreenDetailsAtOrBefore = (
  listVersion: number,
  reconciled: CustomScreenRecord[]
) => {
  for (const [id, pending] of pendingScreenDetails) {
    if (pending.version <= listVersion) pendingScreenDetails.delete(id);
  }

  const ids = new Set([
    ...knownScreenDetailIds,
    ...screenDetailValueVersions.keys(),
    ...reconciled.map((item) => item.id),
  ]);
  for (const id of ids) {
    knownScreenDetailIds.add(id);
    if ((screenDetailValueVersions.get(id) ?? 0) > listVersion) continue;
    screenDetailValueVersions.delete(id);
    clearCustomScreenDetailBrowserCache(id);
  }
};

const discardSettledScreenAuthorityAtOrBefore = (listVersion: number) => {
  for (const [id, authority] of settledScreenItemAuthority) {
    if (authority.version <= listVersion) settledScreenItemAuthority.delete(id);
  }
};

const publishScreenList = (items: CustomScreenRecord[], listVersion: number) => {
  if (listVersion <= committedScreensListVersion) return;
  const reconciled = reconcileCompleteScreenList(items, listVersion);
  invalidateScreenDetailsAtOrBefore(listVersion, reconciled);
  primeScreensCacheInternal(reconciled);
  reconciled.forEach((item) => writeScreenDetailValue(item, listVersion));
  committedScreensListVersion = listVersion;
  discardSettledScreenAuthorityAtOrBefore(listVersion);
};

const getScreenEntryOverridesCacheKey = (screenId: string, entryId: string) =>
  cacheKeys.customScreenEntryOverrides(screenId, entryId);

const readScreenEntryOverridesCache = (screenId: string, entryId: string) => {
  const cached = readLocalCache(
    getScreenEntryOverridesCacheKey(screenId, entryId),
    cacheTtlMs.detail,
    isScreenEntryPresentationOverrideList
  );
  return cached
    ? normalizeScreenEntryPresentationOverrideList(cached, { source: "draft-cache" })
    : null;
};

const writeScreenEntryOverridesCache = (
  screenId: string,
  entryId: string,
  overrides: ScreenEntryPresentationOverrideDraft[]
) => {
  writeLocalCache(
    getScreenEntryOverridesCacheKey(screenId, entryId),
    normalizeScreenEntryPresentationOverrideList(overrides, { source: "draft-cache" })
  );
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
  return readScreenDetailValue(id);
};

export const getCachedScreenEntryOverrides = (screenId: string, entryId: string) =>
  readScreenEntryOverridesCache(screenId, entryId);

const readCachedScreenIdsForClear = () => {
  try {
    return readScreensCache()?.map((item) => item.id) ?? [];
  } catch {
    return [];
  }
};

export const clearCustomScreensCache = () => {
  const detailIds = new Set([
    ...knownScreenDetailIds,
    ...screenDetailValueVersions.keys(),
    ...pendingScreenDetails.keys(),
    ...settledScreenItemAuthority.keys(),
    ...readCachedScreenIdsForClear(),
  ]);
  pendingScreensList = null;
  pendingScreenDetails.clear();
  settledScreenItemAuthority.clear();
  screenDetailValueVersions.clear();
  knownScreenDetailIds.clear();
  committedScreensListVersion = 0;
  customScreensListCache.clear();
  clearCustomScreensBrowserCache();
  for (const id of detailIds) clearCustomScreenDetailBrowserCache(id);
};

async function getScreenEntryOverrides(screenId: string, entryId: string) {
  const payload = await apiRequest<unknown>(
    `/custom-screens/${encodeURIComponent(screenId)}/entries/${encodeURIComponent(entryId)}/overrides`,
    { method: "GET" }
  );
  return normalizeOverrideResponseEnvelope(payload);
}

export function getScreenEntryOverridesCached(
  screenId: string,
  entryId: string,
  options?: { force?: boolean }
): Promise<ScreenEntryPresentationOverrideDraft[]> {
  const key = getScreenEntryOverridesCacheKey(screenId, entryId);
  if (!options?.force) {
    const cached = getCachedScreenEntryOverrides(screenId, entryId);
    if (cached) return Promise.resolve(cached);
    const pending = screenEntryOverridesPromises.get(key);
    if (pending) return pending;
  }

  let request: Promise<ScreenEntryPresentationOverrideDraft[]>;
  request = getScreenEntryOverrides(screenId, entryId)
    .then((overrides) => {
      if (screenEntryOverridesPromises.get(key) === request) {
        writeScreenEntryOverridesCache(screenId, entryId, overrides);
      }
      return overrides;
    })
    .finally(() => {
      if (screenEntryOverridesPromises.get(key) === request) {
        screenEntryOverridesPromises.delete(key);
      }
    });
  screenEntryOverridesPromises.set(key, request);
  return request;
}

export async function replaceScreenEntryOverrides(
  screenId: string,
  entryId: string,
  overrides: ScreenEntryPresentationOverrideDraft[]
) {
  const normalized = normalizeScreenEntryPresentationOverrideList(overrides, {
    source: "draft-cache",
  });
  const payload = await apiRequest<unknown>(
    `/custom-screens/${encodeURIComponent(screenId)}/entries/${encodeURIComponent(entryId)}/overrides`,
    {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ overrides: normalized }),
    },
    { withCsrf: true }
  );
  const saved = normalizeOverrideResponseEnvelope(payload);
  screenEntryOverridesPromises.delete(getScreenEntryOverridesCacheKey(screenId, entryId));
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

export function listCustomScreensCached(options?: {
  force?: boolean;
}): Promise<CustomScreenRecord[]> {
  if (!options?.force) {
    const cached = getCachedCustomScreens();
    if (cached) return Promise.resolve(cached);
    if (pendingScreensList) return pendingScreensList.promise;
  }

  const version = nextScreenPublicationVersion();
  let pending!: PendingVersioned<CustomScreenRecord[]>;
  const promise = listCustomScreens()
    .then((items) => {
      if (pendingScreensList === pending) publishScreenList(items, version);
      return items;
    })
    .finally(() => {
      if (pendingScreensList === pending) pendingScreensList = null;
    });
  pending = { promise, version };
  pendingScreensList = pending;
  return promise;
}

export async function getCustomScreen(id: string) {
  const item = await apiRequest<CustomScreenRecord>(`/custom-screens/${encodeURIComponent(id)}`);
  return normalizeCustomScreenRecord(item);
}

export function getCustomScreenCached(
  id: string,
  options?: { force?: boolean }
): Promise<CustomScreenRecord | null> {
  if (!options?.force) {
    const cached = getCachedCustomScreen(id);
    if (cached) return Promise.resolve(cached);
    const pending = pendingScreenDetails.get(id);
    if (pending) return pending.promise;
  }

  const version = nextScreenPublicationVersion();
  let pending!: PendingVersioned<CustomScreenRecord | null>;
  const promise = getCustomScreen(id)
    .then((item) => ({ kind: "detail" as const, item }))
    .catch(async () => {
      const items = await listCustomScreens();
      return {
        kind: "fallback-list" as const,
        items,
        item: items.find((entry) => entry.id === id) ?? null,
      };
    })
    .then((result) => {
      if (pendingScreenDetails.get(id) !== pending) return result.item;
      if (result.kind === "fallback-list") {
        publishScreenList(result.items, version);
      } else {
        settleScreenItemAuthority(id, {
          version,
          change: { kind: "replace", value: result.item },
        });
        mergeScreenIntoCurrentList(result.item, version);
        writeScreenDetailValue(result.item, version);
      }
      return result.item;
    })
    .finally(() => removePendingScreenDetailIfExact(id, pending));
  pending = { promise, version };
  knownScreenDetailIds.add(id);
  pendingScreenDetails.set(id, pending);
  return promise;
}

export async function createCustomScreen(
  input: CustomScreenCreateInput,
  options?: CustomScreenMutationOptions
): Promise<CustomScreenRecord> {
  const created = await apiRequest<CustomScreenRecord>(
    "/custom-screens",
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input),
    },
    { withCsrf: true }
  );
  publishSuccessfulScreenReplace(normalizeCustomScreenRecord(created));
  broadcastCacheEvent(
    { key: cacheKeys.customScreensList, action: "update" },
    { operationToken: options?.cacheEventOperationToken }
  );
  broadcastCacheEvent(
    {
      key: cacheKeys.customScreenDetail(created.id),
      action: "update",
    },
    { operationToken: options?.cacheEventOperationToken }
  );
  return created;
}

export async function updateCustomScreen(
  id: string,
  input: CustomScreenUpdateInput,
  options?: CustomScreenMutationOptions
): Promise<CustomScreenRecord> {
  const updated = await apiRequest<CustomScreenRecord>(
    `/custom-screens/${encodeURIComponent(id)}`,
    {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input),
    },
    { withCsrf: true }
  );
  publishSuccessfulScreenReplace(normalizeCustomScreenRecord(updated));
  broadcastCacheEvent(
    { key: cacheKeys.customScreensList, action: "update" },
    { operationToken: options?.cacheEventOperationToken }
  );
  broadcastCacheEvent(
    {
      key: cacheKeys.customScreenDetail(updated.id),
      action: "update",
    },
    { operationToken: options?.cacheEventOperationToken }
  );
  return updated;
}

export async function deleteCustomScreen(id: string) {
  const result = await apiRequest<{ ok: boolean }>(
    `/custom-screens/${encodeURIComponent(id)}`,
    { method: "DELETE" },
    { withCsrf: true }
  );
  if (result?.ok) {
    publishSuccessfulScreenDelete(id);
    broadcastCacheEvent({ key: cacheKeys.customScreensList, action: "invalidate" });
    broadcastCacheEvent({
      key: cacheKeys.customScreenDetail(id),
      action: "invalidate",
    });
  }
  return result;
}
