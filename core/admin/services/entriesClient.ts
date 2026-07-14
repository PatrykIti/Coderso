import { apiRequest } from "./apiClient";
import { broadcastCacheEvent } from "@/utils/cacheBus";
import { cacheKeys, cacheTtlMs } from "@/services/cachePolicy";
import { clearLocalCache, readLocalCache, writeLocalCache } from "@/utils/storageCache";

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
  data: Record<string, unknown>;
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
  data: Record<string, unknown>;
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

const cachedEntries = new Map<string, EntrySummary[]>();
const cachedEntriesPromise = new Map<string, Promise<EntrySummary[]>>();
let cachedAllEntries: EntryListItem[] | null = null;
let cachedAllEntriesPromise: Promise<EntryListItem[]> | null = null;
const cachedEntryDetails = new Map<string, Map<string, EntryDetail>>();

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

const getCachedEntryDetailsMap = (typeSlug: string) => {
  const existing = cachedEntryDetails.get(typeSlug);
  if (existing) return existing;
  const created = new Map<string, EntryDetail>();
  cachedEntryDetails.set(typeSlug, created);
  return created;
};

const upsertCachedEntry = (typeSlug: string, entry: EntrySummary | EntryDetail) => {
  cachedEntriesPromise.delete(typeSlug);
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
  const detail = toEntryDetail(entry);
  getCachedEntryDetailsMap(typeSlug).set(detail.id, detail);
  writeEntryDetailCache(typeSlug, detail);
};

const updateCachedEntryStatus = (typeSlug: string, id: string, status: EntryStatus) => {
  cachedEntriesPromise.delete(typeSlug);
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
    const detail = { ...cachedDetail, status };
    getCachedEntryDetailsMap(typeSlug).set(id, detail);
    writeEntryDetailCache(typeSlug, detail);
  }
};

const removeCachedEntry = (typeSlug: string, id: string) => {
  cachedEntriesPromise.delete(typeSlug);
  const current = cachedEntries.get(typeSlug) ?? readEntriesCache(typeSlug);
  if (current) {
    primeEntriesCacheInternal(
      typeSlug,
      current.filter((item) => item.id !== id)
    );
  }
  getCachedEntryDetailsMap(typeSlug).delete(id);
  clearLocalCache(cacheKeys.entryDetail(typeSlug, id));
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
  const map = cachedEntryDetails.get(typeSlug);
  const existing = map?.get(id);
  if (existing) return existing;
  const stored = readEntryDetailCache(typeSlug, id);
  if (stored) {
    getCachedEntryDetailsMap(typeSlug).set(id, stored);
    return stored;
  }
  return null;
};

export const clearEntriesCache = (typeSlug: string) => {
  cachedEntries.delete(typeSlug);
  cachedEntriesPromise.delete(typeSlug);
  cachedEntryDetails.delete(typeSlug);
  clearLocalCache(cacheKeys.entriesList(typeSlug));
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
    const pending = cachedEntriesPromise.get(typeSlug);
    if (pending) return pending;
  }

  let request: Promise<EntrySummary[]>;
  request = listEntries(typeSlug)
    .then((items) => {
      if (cachedEntriesPromise.get(typeSlug) === request) {
        primeEntriesCacheInternal(typeSlug, items);
      }
      return items;
    })
    .finally(() => {
      if (cachedEntriesPromise.get(typeSlug) === request) {
        cachedEntriesPromise.delete(typeSlug);
      }
    });
  cachedEntriesPromise.set(typeSlug, request);
  return request;
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

export async function getEntryCached(typeSlug: string, id: string, options?: { force?: boolean }) {
  if (!options?.force) {
    const cachedDetail = getCachedEntryDetail(typeSlug, id);
    if (cachedDetail) return cachedDetail;
    const cachedList = getCachedEntries(typeSlug);
    const match = cachedList?.find((entry) => entry.id === id);
    if (match) return toEntryDetail(match);
  }
  const result = await getEntry(typeSlug, id);
  if (result) upsertCachedEntry(typeSlug, result);
  return result;
}

export async function createEntry(typeSlug: string, payload: EntryPayload) {
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
    upsertCachedEntry(typeSlug, created);
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
    upsertCachedEntry(typeSlug, updated);
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
    upsertCachedEntry(typeSlug, updated);
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
    upsertCachedEntry(typeSlug, duplicated);
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
    updateCachedEntryStatus(typeSlug, id, "published");
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
    updateCachedEntryStatus(typeSlug, id, "draft");
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
    removeCachedEntry(typeSlug, id);
    broadcastCacheEvent({ key: cacheKeys.entriesList(typeSlug), action: "invalidate" });
    broadcastAllEntriesListEvent("invalidate");
    broadcastCacheEvent({
      key: cacheKeys.entryDetail(typeSlug, id),
      action: "invalidate",
    });
  }
  return result;
}
