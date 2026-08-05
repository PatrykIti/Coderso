import { ApiClientError, apiRequest } from "./apiClient";
import { broadcastCacheEvent } from "@/utils/cacheBus";
import { cacheKeys, cacheTtlMs } from "@/services/cachePolicy";
import { clearLocalCache, readLocalCache, writeLocalCache } from "@/utils/storageCache";
import { isEntryData, type EntryData } from "./entryData";

export { isEntryData, isEntryDataValue } from "./entryData";
export type { EntryData, EntryDataValue } from "./entryData";

export type EntryStatus = "draft" | "published" | "scheduled" | "archived";

export type EntryVisibility = "public" | "private" | "password";

export type EntryAuthor = {
  id: string;
  name: string | null;
  email: string;
};

export type EntrySummary = {
  id: string;
  typeId: string;
  title: string;
  slug: string;
  status: EntryStatus;
  visibility: EntryVisibility;
  hasPassword: boolean;
  data: EntryData;
  tags?: string[];
  scheduledAt?: string | null;
  createdAt: string;
  updatedAt: string;
  publishedAt?: string | null;
  author?: EntryAuthor | null;
  seo?: EntrySeo | null;
};

export type EntryListContentType = {
  id: string;
  slug: string;
  name: string;
  status: string;
};

export type EntryListItem = EntrySummary & {
  contentType: EntryListContentType;
};

export type EntryTaxonomyTerm = {
  id: string;
  name: string;
  slug: string;
};

export type EntryTaxonomy = {
  category?: EntryTaxonomyTerm | null;
  tags?: EntryTaxonomyTerm[];
};

export type EntryDetail = EntrySummary & {
  taxonomy?: EntryTaxonomy | null;
};

export type EntrySeo = {
  title?: string | null;
  description?: string | null;
  canonicalUrl?: string | null;
  robots?: string | null;
};

export type EntryPayload = {
  title: string;
  slug: string;
  data: EntryData;
};

export type EntryMetadataPayload = {
  status?: EntryStatus;
  visibility?: EntryVisibility;
  accessPassword?: string | null; // plaintext out; server hashes; null clears
  scheduledAt?: string | null;
  tags?: string[];
  taxonomy?: {
    categoryId?: string | null;
    tagIds?: string[];
  };
  seo?: EntrySeo;
};

export type PreviewResponse = {
  token: string;
  previewUrl: string;
  expiresAt: string;
};

const invalidEntryDataError = () =>
  new ApiClientError("entry_data_invalid", "Entry data is invalid.", 400, { field: "data" });

const assertCreateEntryData = (payload: EntryPayload) => {
  if (!isEntryData(payload.data)) throw invalidEntryDataError();
};

const assertUpdateEntryData = (payload: Partial<EntryPayload>) => {
  if (Object.prototype.hasOwnProperty.call(payload, "data") && !isEntryData(payload.data)) {
    throw invalidEntryDataError();
  }
};

type PendingVersioned<T> = Readonly<{ promise: Promise<T>; version: number }>;

type EntryItemChange =
  | Readonly<{ kind: "replace"; value: EntryDetail }>
  | Readonly<{ kind: "status"; value: EntryStatus }>
  | Readonly<{ kind: "delete" }>;

type EntryItemAuthority = Readonly<{ version: number; change: EntryItemChange }>;

const cachedEntries = new Map<string, EntrySummary[]>();
const pendingEntryLists = new Map<string, PendingVersioned<EntrySummary[]>>();
let cachedAllEntries: EntryListItem[] | null = null;
let cachedAllEntriesPromise: Promise<EntryListItem[]> | null = null;
const cachedEntryDetails = new Map<string, Map<string, EntryDetail>>();
const cachedEntryDetailVersions = new Map<string, Map<string, number>>();
const pendingEntryDetails = new Map<string, Map<string, PendingVersioned<EntryDetail>>>();
const settledEntryItemAuthority = new Map<string, Map<string, EntryItemAuthority>>();
const committedEntryListVersions = new Map<string, number>();
const knownEntryDetailIds = new Map<string, Set<string>>();
let entryPublicationVersion = 0;

const isEntryList = (value: unknown): value is EntrySummary[] => Array.isArray(value);
const isEntryListItemList = (value: unknown): value is EntryListItem[] => Array.isArray(value);
const isEntryDetail = (value: unknown): value is EntryDetail =>
  Boolean(value && typeof value === "object");

const toEntrySummary = (entry: EntrySummary | EntryDetail): EntrySummary => ({
  id: entry.id,
  typeId: entry.typeId,
  title: entry.title,
  slug: entry.slug,
  status: entry.status,
  visibility: entry.visibility,
  hasPassword: entry.hasPassword,
  data: entry.data,
  tags: entry.tags,
  scheduledAt: entry.scheduledAt,
  createdAt: entry.createdAt,
  updatedAt: entry.updatedAt,
  publishedAt: entry.publishedAt,
  author: entry.author ?? null,
  seo: entry.seo ?? null,
});

const toEntryDetail = (entry: EntrySummary | EntryDetail): EntryDetail => ({
  ...toEntrySummary(entry),
  taxonomy: "taxonomy" in entry ? (entry.taxonomy ?? null) : null,
});

const readEntriesCache = (typeSlug: string) =>
  readLocalCache(cacheKeys.entriesList(typeSlug), cacheTtlMs.list, isEntryList);

const readAllEntriesCache = () =>
  readLocalCache(cacheKeys.entriesAllList, cacheTtlMs.list, isEntryListItemList);

const readEntryDetailCache = (typeSlug: string, id: string) =>
  readLocalCache(cacheKeys.entryDetail(typeSlug, id), cacheTtlMs.detail, isEntryDetail);

const writeEntryDetailCache = (typeSlug: string, entry: EntryDetail) => {
  writeLocalCache(cacheKeys.entryDetail(typeSlug, entry.id), entry);
};

const primeEntriesCacheInternal = (typeSlug: string, items: EntrySummary[]) => {
  cachedEntries.set(typeSlug, items);
  writeLocalCache(cacheKeys.entriesList(typeSlug), items);
};

const primeAllEntriesCacheInternal = (items: EntryListItem[]) => {
  cachedAllEntries = items;
  writeLocalCache(cacheKeys.entriesAllList, items);
};

const nextEntryPublicationVersion = () => {
  entryPublicationVersion += 1;
  return entryPublicationVersion;
};

const rememberEntryDetailId = (typeSlug: string, id: string) => {
  const existing = knownEntryDetailIds.get(typeSlug);
  if (existing) {
    existing.add(id);
    return;
  }
  knownEntryDetailIds.set(typeSlug, new Set([id]));
};

const getCachedEntryDetailsMap = (typeSlug: string) => {
  const existing = cachedEntryDetails.get(typeSlug);
  if (existing) return existing;
  const created = new Map<string, EntryDetail>();
  cachedEntryDetails.set(typeSlug, created);
  return created;
};

const getCachedEntryDetailVersionsMap = (typeSlug: string) => {
  const existing = cachedEntryDetailVersions.get(typeSlug);
  if (existing) return existing;
  const created = new Map<string, number>();
  cachedEntryDetailVersions.set(typeSlug, created);
  return created;
};

const getPendingEntryDetailsMap = (typeSlug: string) => {
  const existing = pendingEntryDetails.get(typeSlug);
  if (existing) return existing;
  const created = new Map<string, PendingVersioned<EntryDetail>>();
  pendingEntryDetails.set(typeSlug, created);
  return created;
};

const getSettledEntryItemAuthorityMap = (typeSlug: string) => {
  const existing = settledEntryItemAuthority.get(typeSlug);
  if (existing) return existing;
  const created = new Map<string, EntryItemAuthority>();
  settledEntryItemAuthority.set(typeSlug, created);
  return created;
};

const removePendingEntryDetailIfExact = (
  typeSlug: string,
  id: string,
  pending: PendingVersioned<EntryDetail>
) => {
  const pendingById = pendingEntryDetails.get(typeSlug);
  if (pendingById?.get(id) !== pending) return;
  pendingById.delete(id);
  if (pendingById.size === 0) pendingEntryDetails.delete(typeSlug);
};

const revokePendingEntryDetail = (typeSlug: string, id: string) => {
  const pending = pendingEntryDetails.get(typeSlug);
  pending?.delete(id);
  if (pending?.size === 0) pendingEntryDetails.delete(typeSlug);
};

const settleEntryItemAuthority = (typeSlug: string, id: string, authority: EntryItemAuthority) => {
  const authorities = getSettledEntryItemAuthorityMap(typeSlug);
  const existing = authorities.get(id);
  if (existing && authority.version <= existing.version) return;
  if (existing?.change.kind === "replace" && authority.change.kind === "status") {
    authorities.set(id, {
      version: authority.version,
      change: {
        kind: "replace",
        value: { ...existing.change.value, status: authority.change.value },
      },
    });
    return;
  }
  authorities.set(id, authority);
};

const publishEntryDetailValue = (
  typeSlug: string,
  entry: EntrySummary | EntryDetail,
  version: number
) => {
  if (version <= (committedEntryListVersions.get(typeSlug) ?? 0)) return;
  const detail = toEntryDetail(entry);
  rememberEntryDetailId(typeSlug, detail.id);
  getCachedEntryDetailsMap(typeSlug).set(detail.id, detail);
  getCachedEntryDetailVersionsMap(typeSlug).set(detail.id, version);
  writeEntryDetailCache(typeSlug, detail);
};

const mergeSummaryIntoCurrentList = (
  typeSlug: string,
  entry: EntrySummary | EntryDetail,
  version: number
) => {
  if (version <= (committedEntryListVersions.get(typeSlug) ?? 0)) return;
  const current = cachedEntries.get(typeSlug) ?? readEntriesCache(typeSlug) ?? [];
  const summary = toEntrySummary(entry);
  const index = current.findIndex((item) => item.id === summary.id);
  const next = [...current];
  if (index === -1) {
    next.unshift(summary);
  } else {
    next[index] = { ...next[index], ...summary };
  }
  primeEntriesCacheInternal(typeSlug, next);
};

const patchCurrentListAndDetailStatus = (
  typeSlug: string,
  id: string,
  status: EntryStatus,
  version: number
) => {
  const current = cachedEntries.get(typeSlug) ?? readEntriesCache(typeSlug);
  if (current) {
    primeEntriesCacheInternal(
      typeSlug,
      current.map((item) => (item.id === id ? { ...item, status } : item))
    );
  }
  const cachedDetail =
    getCachedEntryDetailsMap(typeSlug).get(id) ?? readEntryDetailCache(typeSlug, id);
  if (cachedDetail) {
    publishEntryDetailValue(typeSlug, { ...cachedDetail, status }, version);
  }
};

const removeItemFromCurrentListAndDetail = (typeSlug: string, id: string) => {
  const current = cachedEntries.get(typeSlug) ?? readEntriesCache(typeSlug);
  if (current) {
    primeEntriesCacheInternal(
      typeSlug,
      current.filter((item) => item.id !== id)
    );
  }
  rememberEntryDetailId(typeSlug, id);
  getCachedEntryDetailsMap(typeSlug).delete(id);
  cachedEntryDetailVersions.get(typeSlug)?.delete(id);
  clearLocalCache(cacheKeys.entryDetail(typeSlug, id));
};

const publishSuccessfulEntryMutation = (typeSlug: string, entry: EntrySummary | EntryDetail) => {
  const version = nextEntryPublicationVersion();
  const detail = toEntryDetail(entry);
  revokePendingEntryDetail(typeSlug, detail.id);
  settleEntryItemAuthority(typeSlug, detail.id, {
    version,
    change: { kind: "replace", value: detail },
  });
  mergeSummaryIntoCurrentList(typeSlug, detail, version);
  publishEntryDetailValue(typeSlug, detail, version);
};

const publishSuccessfulEntryStatus = (typeSlug: string, id: string, status: EntryStatus) => {
  const version = nextEntryPublicationVersion();
  revokePendingEntryDetail(typeSlug, id);
  settleEntryItemAuthority(typeSlug, id, {
    version,
    change: { kind: "status", value: status },
  });
  patchCurrentListAndDetailStatus(typeSlug, id, status, version);
};

const publishSuccessfulEntryDelete = (typeSlug: string, id: string) => {
  const version = nextEntryPublicationVersion();
  revokePendingEntryDetail(typeSlug, id);
  settleEntryItemAuthority(typeSlug, id, { version, change: { kind: "delete" } });
  removeItemFromCurrentListAndDetail(typeSlug, id);
};

const reconcileEntryList = (typeSlug: string, serverItems: EntrySummary[], listVersion: number) => {
  const current = cachedEntries.get(typeSlug) ?? readEntriesCache(typeSlug) ?? [];
  const authorities = settledEntryItemAuthority.get(typeSlug);
  let reconciled = [...serverItems];

  for (const [id, authority] of authorities ?? []) {
    if (authority.version <= listVersion) continue;
    const index = reconciled.findIndex((item) => item.id === id);
    if (authority.change.kind === "delete") {
      if (index !== -1) reconciled = reconciled.filter((item) => item.id !== id);
      continue;
    }
    if (authority.change.kind === "replace") {
      const replacement = toEntrySummary(authority.change.value);
      if (index === -1) reconciled.unshift(replacement);
      else reconciled[index] = replacement;
      continue;
    }

    if (index !== -1) {
      reconciled[index] = { ...reconciled[index], status: authority.change.value };
      continue;
    }
    const currentItem = current.find((item) => item.id === id);
    if (currentItem) reconciled.unshift({ ...currentItem, status: authority.change.value });
  }

  return reconciled;
};

const invalidateEntryDetailsAtOrBefore = (
  typeSlug: string,
  listVersion: number,
  listItems: EntrySummary[]
) => {
  const pendingById = pendingEntryDetails.get(typeSlug);
  if (pendingById) {
    for (const [id, pending] of pendingById) {
      if (pending.version <= listVersion) pendingById.delete(id);
    }
    if (pendingById.size === 0) pendingEntryDetails.delete(typeSlug);
  }

  const ids = new Set<string>([
    ...(knownEntryDetailIds.get(typeSlug) ?? []),
    ...(cachedEntryDetails.get(typeSlug)?.keys() ?? []),
    ...(cachedEntryDetailVersions.get(typeSlug)?.keys() ?? []),
    ...listItems.map((item) => item.id),
  ]);
  const versions = cachedEntryDetailVersions.get(typeSlug);
  for (const id of ids) {
    rememberEntryDetailId(typeSlug, id);
    if ((versions?.get(id) ?? 0) > listVersion) continue;
    cachedEntryDetails.get(typeSlug)?.delete(id);
    versions?.delete(id);
    clearLocalCache(cacheKeys.entryDetail(typeSlug, id));
  }
  if (cachedEntryDetails.get(typeSlug)?.size === 0) cachedEntryDetails.delete(typeSlug);
  if (versions?.size === 0) cachedEntryDetailVersions.delete(typeSlug);
};

const discardSettledEntryAuthorityAtOrBefore = (typeSlug: string, listVersion: number) => {
  const authorities = settledEntryItemAuthority.get(typeSlug);
  if (!authorities) return;
  for (const [id, authority] of authorities) {
    if (authority.version <= listVersion) authorities.delete(id);
  }
  if (authorities.size === 0) settledEntryItemAuthority.delete(typeSlug);
};

const publishReconciledEntryList = (
  typeSlug: string,
  serverItems: EntrySummary[],
  listVersion: number
) => {
  if (listVersion <= (committedEntryListVersions.get(typeSlug) ?? 0)) return;
  const reconciled = reconcileEntryList(typeSlug, serverItems, listVersion);
  primeEntriesCacheInternal(typeSlug, reconciled);
  committedEntryListVersions.set(typeSlug, listVersion);
  invalidateEntryDetailsAtOrBefore(typeSlug, listVersion, reconciled);
  discardSettledEntryAuthorityAtOrBefore(typeSlug, listVersion);
};

export const getCachedEntries = (typeSlug: string) => {
  const cached = cachedEntries.get(typeSlug);
  if (cached) return cached;
  const stored = readEntriesCache(typeSlug);
  if (stored) cachedEntries.set(typeSlug, stored);
  return stored ?? null;
};

export const getCachedAllEntries = () => {
  if (cachedAllEntries) return cachedAllEntries;
  const stored = readAllEntriesCache();
  if (stored) cachedAllEntries = stored;
  return stored ?? null;
};

export const getCachedEntryDetail = (typeSlug: string, id: string) => {
  rememberEntryDetailId(typeSlug, id);
  const map = cachedEntryDetails.get(typeSlug);
  const existing = map?.get(id);
  if (existing) {
    if (!cachedEntryDetailVersions.get(typeSlug)?.has(id)) {
      getCachedEntryDetailVersionsMap(typeSlug).set(id, 0);
    }
    return existing;
  }
  const stored = readEntryDetailCache(typeSlug, id);
  if (stored) {
    if ((committedEntryListVersions.get(typeSlug) ?? 0) > 0) {
      clearLocalCache(cacheKeys.entryDetail(typeSlug, id));
      return null;
    }
    getCachedEntryDetailsMap(typeSlug).set(id, stored);
    getCachedEntryDetailVersionsMap(typeSlug).set(id, 0);
    return stored;
  }
  return null;
};

export const clearEntriesCache = (typeSlug: string) => {
  const detailIds = new Set<string>([
    ...(knownEntryDetailIds.get(typeSlug) ?? []),
    ...(cachedEntryDetails.get(typeSlug)?.keys() ?? []),
    ...(cachedEntryDetailVersions.get(typeSlug)?.keys() ?? []),
    ...(pendingEntryDetails.get(typeSlug)?.keys() ?? []),
    ...(settledEntryItemAuthority.get(typeSlug)?.keys() ?? []),
    ...(cachedEntries.get(typeSlug)?.map((item) => item.id) ?? []),
  ]);
  cachedEntries.delete(typeSlug);
  pendingEntryLists.delete(typeSlug);
  cachedEntryDetails.delete(typeSlug);
  cachedEntryDetailVersions.delete(typeSlug);
  pendingEntryDetails.delete(typeSlug);
  settledEntryItemAuthority.delete(typeSlug);
  committedEntryListVersions.delete(typeSlug);
  knownEntryDetailIds.delete(typeSlug);
  clearLocalCache(cacheKeys.entriesList(typeSlug));
  for (const id of detailIds) clearLocalCache(cacheKeys.entryDetail(typeSlug, id));
};

export const clearAllEntriesCache = () => {
  cachedAllEntries = null;
  cachedAllEntriesPromise = null;
  clearLocalCache(cacheKeys.entriesAllList);
};

const broadcastAllEntriesListEvent = (action: "invalidate" | "update") => {
  clearAllEntriesCache();
  broadcastCacheEvent({ key: cacheKeys.entriesAllList, action });
};

export async function listEntries(typeSlug: string) {
  return apiRequest<EntrySummary[]>(`/content/${typeSlug}/entries`, {
    method: "GET",
  });
}

export async function listAllEntries() {
  return apiRequest<EntryListItem[]>("/content-entries", {
    method: "GET",
  });
}

export function listEntriesCached(typeSlug: string, options?: { force?: boolean }) {
  if (!options?.force) {
    const cached = getCachedEntries(typeSlug);
    if (cached) return Promise.resolve(cached);
    const pending = pendingEntryLists.get(typeSlug);
    if (pending) return pending.promise;
  }

  const version = nextEntryPublicationVersion();
  let pending!: PendingVersioned<EntrySummary[]>;
  const promise = listEntries(typeSlug)
    .then((items) => {
      if (pendingEntryLists.get(typeSlug) === pending) {
        publishReconciledEntryList(typeSlug, items, version);
      }
      return items;
    })
    .finally(() => {
      if (pendingEntryLists.get(typeSlug) === pending) {
        pendingEntryLists.delete(typeSlug);
      }
    });
  pending = { promise, version };
  pendingEntryLists.set(typeSlug, pending);
  return promise;
}

export function listAllEntriesCached(options?: { force?: boolean }) {
  if (!options?.force) {
    const cached = getCachedAllEntries();
    if (cached) return Promise.resolve(cached);
    if (cachedAllEntriesPromise) return cachedAllEntriesPromise;
  }

  let request: Promise<EntryListItem[]>;
  request = listAllEntries()
    .then((items) => {
      if (cachedAllEntriesPromise === request) {
        primeAllEntriesCacheInternal(items);
      }
      return items;
    })
    .finally(() => {
      if (cachedAllEntriesPromise === request) {
        cachedAllEntriesPromise = null;
      }
    });
  cachedAllEntriesPromise = request;
  return request;
}

export async function getEntry(typeSlug: string, id: string) {
  return apiRequest<EntryDetail>(`/content/${typeSlug}/entries/${id}`, {
    method: "GET",
  });
}

export function getEntryCached(
  typeSlug: string,
  id: string,
  options?: { force?: boolean }
): Promise<EntryDetail> {
  if (!options?.force) {
    const cachedDetail = getCachedEntryDetail(typeSlug, id);
    if (cachedDetail) return Promise.resolve(cachedDetail);
    const cachedList = getCachedEntries(typeSlug);
    const match = cachedList?.find((entry) => entry.id === id);
    if (match) return Promise.resolve(toEntryDetail(match));
    const pending = pendingEntryDetails.get(typeSlug)?.get(id);
    if (pending) return pending.promise;
  }

  const version = nextEntryPublicationVersion();
  let pending!: PendingVersioned<EntryDetail>;
  const promise = getEntry(typeSlug, id)
    .then((detail) => {
      if (pendingEntryDetails.get(typeSlug)?.get(id) !== pending) return detail;
      settleEntryItemAuthority(typeSlug, id, {
        version,
        change: { kind: "replace", value: detail },
      });
      publishEntryDetailValue(typeSlug, detail, version);
      mergeSummaryIntoCurrentList(typeSlug, detail, version);
      return detail;
    })
    .finally(() => removePendingEntryDetailIfExact(typeSlug, id, pending));
  pending = { promise, version };
  rememberEntryDetailId(typeSlug, id);
  getPendingEntryDetailsMap(typeSlug).set(id, pending);
  return promise;
}

export async function createEntry(typeSlug: string, payload: EntryPayload) {
  assertCreateEntryData(payload);
  const created = await apiRequest<EntryDetail>(
    `/content/${typeSlug}/entries`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    },
    { withCsrf: true }
  );
  if (created) {
    publishSuccessfulEntryMutation(typeSlug, created);
    broadcastCacheEvent({ key: cacheKeys.entriesList(typeSlug), action: "update" });
    broadcastAllEntriesListEvent("update");
    broadcastCacheEvent({
      key: cacheKeys.entryDetail(typeSlug, created.id),
      action: "update",
    });
  }
  return created;
}

export async function updateEntry(typeSlug: string, id: string, payload: Partial<EntryPayload>) {
  assertUpdateEntryData(payload);
  const updated = await apiRequest<EntryDetail>(
    `/content/${typeSlug}/entries/${id}`,
    {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    },
    { withCsrf: true }
  );
  if (updated) {
    publishSuccessfulEntryMutation(typeSlug, updated);
    broadcastCacheEvent({ key: cacheKeys.entriesList(typeSlug), action: "update" });
    broadcastAllEntriesListEvent("update");
    broadcastCacheEvent({
      key: cacheKeys.entryDetail(typeSlug, updated.id),
      action: "update",
    });
  }
  return updated;
}

export async function updateEntryMetadata(
  typeSlug: string,
  id: string,
  payload: EntryMetadataPayload
) {
  const updated = await apiRequest<EntryDetail>(
    `/content/${typeSlug}/entries/${id}/metadata`,
    {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    },
    { withCsrf: true }
  );
  if (updated) {
    publishSuccessfulEntryMutation(typeSlug, updated);
    broadcastCacheEvent({ key: cacheKeys.entriesList(typeSlug), action: "update" });
    broadcastAllEntriesListEvent("update");
    broadcastCacheEvent({
      key: cacheKeys.entryDetail(typeSlug, updated.id),
      action: "update",
    });
  }
  return updated;
}

export async function duplicateEntry(typeSlug: string, id: string) {
  const duplicated = await apiRequest<EntryDetail>(
    `/content/${typeSlug}/entries/${id}/duplicate`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({}),
    },
    { withCsrf: true }
  );
  if (duplicated) {
    publishSuccessfulEntryMutation(typeSlug, duplicated);
    broadcastCacheEvent({ key: cacheKeys.entriesList(typeSlug), action: "update" });
    broadcastAllEntriesListEvent("update");
    broadcastCacheEvent({
      key: cacheKeys.entryDetail(typeSlug, duplicated.id),
      action: "update",
    });
  }
  return duplicated;
}

export async function previewEntry(typeSlug: string, id: string, ttlMinutes?: number) {
  return apiRequest<PreviewResponse>(
    `/content/${typeSlug}/entries/${id}/preview`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ttlMinutes }),
    },
    { withCsrf: true }
  );
}

export async function publishEntry(typeSlug: string, id: string) {
  const result = await apiRequest<{ ok: boolean }>(
    `/content/${typeSlug}/entries/${id}/publish`,
    { method: "POST" },
    { withCsrf: true }
  );
  if (result?.ok) {
    publishSuccessfulEntryStatus(typeSlug, id, "published");
    broadcastCacheEvent({ key: cacheKeys.entriesList(typeSlug), action: "update" });
    broadcastAllEntriesListEvent("update");
    broadcastCacheEvent({
      key: cacheKeys.entryDetail(typeSlug, id),
      action: "update",
    });
  }
  return result;
}

export async function unpublishEntry(typeSlug: string, id: string) {
  const result = await apiRequest<{ ok: boolean }>(
    `/content/${typeSlug}/entries/${id}/unpublish`,
    { method: "POST" },
    { withCsrf: true }
  );
  if (result?.ok) {
    publishSuccessfulEntryStatus(typeSlug, id, "draft");
    broadcastCacheEvent({ key: cacheKeys.entriesList(typeSlug), action: "update" });
    broadcastAllEntriesListEvent("update");
    broadcastCacheEvent({
      key: cacheKeys.entryDetail(typeSlug, id),
      action: "update",
    });
  }
  return result;
}

export async function deleteEntry(typeSlug: string, id: string) {
  const result = await apiRequest<{ ok: boolean }>(
    `/content/${typeSlug}/entries/${id}`,
    { method: "DELETE" },
    { withCsrf: true }
  );
  if (result?.ok) {
    publishSuccessfulEntryDelete(typeSlug, id);
    broadcastCacheEvent({ key: cacheKeys.entriesList(typeSlug), action: "invalidate" });
    broadcastAllEntriesListEvent("invalidate");
    broadcastCacheEvent({
      key: cacheKeys.entryDetail(typeSlug, id),
      action: "invalidate",
    });
  }
  return result;
}
