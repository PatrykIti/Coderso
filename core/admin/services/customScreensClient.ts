// TASK-467-02: lightweight browser custom-screens client.
//
// This module owns the browser list/cache/mutation machinery for custom
// screens and deliberately imports NO domain editor machinery: it never
// reaches the full definition schema, the capability resolver, the binding
// resolver, or the widget runtime. Server responses already carry fully
// normalized definition/blocks/bindings/capabilities, so this client preserves
// them as summary pass-through values. Full editor normalization lives in
// customScreensEditorClient.ts.

import { apiRequest } from "./apiClient";
import { broadcastCacheEvent } from "@/utils/cacheBus";
import { cacheKeys, cacheTtlMs } from "@/services/cachePolicy";
import {
  clearCustomScreenDetailBrowserCache,
  clearCustomScreensBrowserCache,
  registerCustomScreensCacheInvalidator,
} from "@/services/customScreensCache";
import {
  clearLocalCache,
  createMemoryBackedLocalCache,
  readLocalCache,
  writeLocalCache,
} from "@/utils/storageCache";
import type {
  CustomScreenCollectionRole,
  CustomScreenStatus,
} from "../../services/customScreens/customScreenContracts";
import {
  normalizeCustomScreenSummaryRecord,
  isCustomScreenSummaryList,
  isCustomScreenSummaryRecord,
  type CustomScreenCreateInput,
  type CustomScreenMutationOptions,
  type CustomScreenSummaryRecord,
  type CustomScreenUpdateInput,
} from "../../services/customScreens/customScreenSummaryContract";
import {
  normalizeScreenEntryPresentationOverrideList,
  type ScreenEntryPresentationOverrideDraft,
} from "../../services/customScreens/screenEntryPresentationOverrideContract";

export type { CustomScreenStatus, CustomScreenCollectionRole };
export type {
  CustomScreenCreateInput,
  CustomScreenUpdateInput,
  CustomScreenMutationOptions,
  CustomScreenSummaryRecord,
};

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

type PendingVersioned<T> = Readonly<{ promise: Promise<T>; version: number }>;

type ScreenItemAuthority = Readonly<{
  version: number;
  change:
    Readonly<{ kind: "replace"; value: CustomScreenSummaryRecord }> | Readonly<{ kind: "delete" }>;
}>;

let pendingScreensList: PendingVersioned<CustomScreenSummaryRecord[]> | null = null;
let committedScreensListVersion = 0;
let screenPublicationVersion = 0;
const pendingScreenDetails = new Map<string, PendingVersioned<CustomScreenSummaryRecord | null>>();
const settledScreenItemAuthority = new Map<string, ScreenItemAuthority>();
const screenDetailValueVersions = new Map<string, number>();
const knownScreenDetailIds = new Set<string>();
const screenEntryOverridesPromises = new Map<
  string,
  Promise<ScreenEntryPresentationOverrideDraft[]>
>();

const customScreensListCache = createMemoryBackedLocalCache({
  key: cacheKeys.customScreensList,
  ttlMs: cacheTtlMs.list,
  validate: isCustomScreenSummaryList,
});

const readScreensCache = () =>
  customScreensListCache.read()?.map(normalizeCustomScreenSummaryRecord) ?? null;

const readScreenDetailCache = (id: string) =>
  readLocalCache(cacheKeys.customScreenDetail(id), cacheTtlMs.detail, isCustomScreenSummaryRecord);

const writeScreenDetailCache = (item: CustomScreenSummaryRecord) => {
  writeLocalCache(cacheKeys.customScreenDetail(item.id), normalizeCustomScreenSummaryRecord(item));
};

const primeScreensCacheInternal = (items: CustomScreenSummaryRecord[]) => {
  customScreensListCache.write(items.map(normalizeCustomScreenSummaryRecord));
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
  return normalizeCustomScreenSummaryRecord(cached);
};

const writeScreenDetailValue = (item: CustomScreenSummaryRecord, version: number) => {
  if (version <= committedScreensListVersion) return;
  if ((screenDetailValueVersions.get(item.id) ?? 0) > version) return;
  const normalized = normalizeCustomScreenSummaryRecord(item);
  knownScreenDetailIds.add(normalized.id);
  screenDetailValueVersions.set(normalized.id, version);
  writeScreenDetailCache(normalized);
};

const mergeScreenIntoCurrentList = (item: CustomScreenSummaryRecord, version: number) => {
  if (version <= committedScreensListVersion) return;
  const normalized = normalizeCustomScreenSummaryRecord(item);
  const current = readScreensCache() ?? [];
  const index = current.findIndex((entry) => entry.id === normalized.id);
  const next = [...current];
  if (index === -1) {
    next.unshift(normalized);
  } else {
    next[index] = normalizeCustomScreenSummaryRecord({ ...next[index], ...normalized });
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
  pending: PendingVersioned<CustomScreenSummaryRecord | null>
) => {
  if (pendingScreenDetails.get(id) === pending) pendingScreenDetails.delete(id);
};

const publishSuccessfulScreenReplace = (item: CustomScreenSummaryRecord) => {
  const normalized = normalizeCustomScreenSummaryRecord(item);
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

const reconcileCompleteScreenList = (
  serverItems: CustomScreenSummaryRecord[],
  listVersion: number
) => {
  let reconciled = serverItems.map(normalizeCustomScreenSummaryRecord);
  for (const [id, authority] of settledScreenItemAuthority) {
    if (authority.version <= listVersion) continue;
    const index = reconciled.findIndex((item) => item.id === id);
    if (authority.change.kind === "delete") {
      if (index !== -1) reconciled = reconciled.filter((item) => item.id !== id);
      continue;
    }
    const replacement = normalizeCustomScreenSummaryRecord(authority.change.value);
    if (index === -1) reconciled.unshift(replacement);
    else reconciled[index] = replacement;
  }
  return reconciled;
};

const invalidateScreenDetailsAtOrBefore = (
  listVersion: number,
  reconciled: CustomScreenSummaryRecord[]
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

const publishScreenList = (items: CustomScreenSummaryRecord[], listVersion: number) => {
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

const resetScreenMemoryState = () => {
  pendingScreensList = null;
  pendingScreenDetails.clear();
  settledScreenItemAuthority.clear();
  screenDetailValueVersions.clear();
  knownScreenDetailIds.clear();
  committedScreensListVersion = 0;
  customScreensListCache.clear();
};

export const clearCustomScreensCache = () => {
  const detailIds = new Set([
    ...knownScreenDetailIds,
    ...screenDetailValueVersions.keys(),
    ...pendingScreenDetails.keys(),
    ...settledScreenItemAuthority.keys(),
    ...readCachedScreenIdsForClear(),
  ]);
  resetScreenMemoryState();
  clearCustomScreensBrowserCache();
  for (const id of detailIds) clearCustomScreenDetailBrowserCache(id);
};

// TASK-467-01 registry: the lightweight shared invalidation path resets the
// whole memory-backed custom-screens cache family (list + detail + overrides).
registerCustomScreensCacheInvalidator(() => {
  resetScreenMemoryState();
  screenEntryOverridesPromises.clear();
});

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
  const payload = await apiRequest<{ items: CustomScreenSummaryRecord[] }>("/custom-screens", {
    method: "GET",
  });
  return (payload.items ?? []).map(normalizeCustomScreenSummaryRecord);
}

export function listCustomScreensCached(options?: {
  force?: boolean;
}): Promise<CustomScreenSummaryRecord[]> {
  if (!options?.force) {
    const cached = getCachedCustomScreens();
    if (cached) return Promise.resolve(cached);
    if (pendingScreensList) return pendingScreensList.promise;
  }

  const version = nextScreenPublicationVersion();
  let pending!: PendingVersioned<CustomScreenSummaryRecord[]>;
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
  const item = await apiRequest<CustomScreenSummaryRecord>(
    `/custom-screens/${encodeURIComponent(id)}`
  );
  return normalizeCustomScreenSummaryRecord(item);
}

export function getCustomScreenRawCached(
  id: string,
  options?: { force?: boolean }
): Promise<CustomScreenSummaryRecord | null> {
  if (!options?.force) {
    const cached = getCachedCustomScreen(id);
    if (cached) return Promise.resolve(cached);
    const pending = pendingScreenDetails.get(id);
    if (pending) return pending.promise;
  }

  const version = nextScreenPublicationVersion();
  let pending!: PendingVersioned<CustomScreenSummaryRecord | null>;
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
): Promise<CustomScreenSummaryRecord> {
  const created = await apiRequest<CustomScreenSummaryRecord>(
    "/custom-screens",
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input),
    },
    { withCsrf: true }
  );
  publishSuccessfulScreenReplace(normalizeCustomScreenSummaryRecord(created));
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
): Promise<CustomScreenSummaryRecord> {
  const updated = await apiRequest<CustomScreenSummaryRecord>(
    `/custom-screens/${encodeURIComponent(id)}`,
    {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input),
    },
    { withCsrf: true }
  );
  publishSuccessfulScreenReplace(normalizeCustomScreenSummaryRecord(updated));
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
