import { apiRequest } from "./apiClient";
import { broadcastCacheEvent } from "@/utils/cacheBus";
import { cacheKeys, cacheTtlMs, createBoundedCacheKeySegment } from "@/services/cachePolicy";
import {
  clearLocalCache,
  createMemoryBackedLocalCache,
  type MemoryBackedStorageCache,
} from "@/utils/storageCache";

export type BackupStatus = "queued" | "running" | "complete" | "failed";
export type BackupKind = "manual" | "scheduled";
export type BackupStorageDriver = "local" | "s3" | "azure";
export type BackupFrequency = "daily" | "weekly" | "monthly";
export type BackupIncludeOption = "database" | "media" | "settings" | "users";

export type BackupItem = {
  id: string;
  status: BackupStatus;
  kind: BackupKind;
  storageDriver: BackupStorageDriver;
  artifactPath: string | null;
  sizeBytes: number | null;
  error: string | null;
  createdAt: string;
  finishedAt: string | null;
};

export type BackupWorkerHealth = {
  mode: "internal" | "external";
  healthy: boolean;
  queuedCount: number;
  oldestQueuedAt: string | null;
  message: string;
};

export type BackupListResult = {
  items: BackupItem[];
  page: number;
  limit: number;
  total: number;
  hasNext: boolean;
  hasPrevious: boolean;
  worker: BackupWorkerHealth;
};

export type BackupSchedule = {
  id: string;
  enabled: boolean;
  frequency: BackupFrequency;
  retentionDays: number;
  storageDriver: BackupStorageDriver;
  include: BackupIncludeOption[];
  createdAt: string;
  updatedAt: string;
};

export type BackupScheduleUpdate = {
  enabled?: boolean;
  frequency?: BackupFrequency;
  retentionDays?: number;
  storageDriver?: BackupStorageDriver;
  include?: BackupIncludeOption[];
};

export type BackupListOptions = {
  page?: number;
  limit?: number;
  query?: string;
};

export type BackupCreatePayload = {
  kind?: BackupKind;
  include?: BackupIncludeOption[];
  // Every v2 `.cbk` is encrypted; the operator-supplied passphrase is forwarded
  // to POST /backups only and never stored/logged server-side.
  passphrase?: string;
};

type BackupListCachedOptions = BackupListOptions & {
  force?: boolean;
};

export type BackupDownload = {
  url: string | null;
  path: string | null;
  fileName?: string;
  contentType?: string;
  content?: string;
  // v2 `.cbk` payloads are base64-encoded binary (JSON cannot carry raw bytes).
  encoding?: "base64";
};

export type BackupImportResult = {
  tablesRestored: number;
  rowsRestored: number;
  usersRestored: number;
  mediaRestored: number;
};

let cachedBackupSchedulePromise: Promise<BackupSchedule> | null = null;
const cachedBackupListPromises = new Map<string, Promise<BackupListResult>>();
const backupListCaches = new Map<string, MemoryBackedStorageCache<BackupListResult>>();
const backupListCacheOptions = new Map<string, BackupListOptions>();

const isRecord = (value: unknown): value is Record<string, unknown> =>
  Boolean(value && typeof value === "object");

const isBackupListResult = (value: unknown): value is BackupListResult =>
  isRecord(value) && Array.isArray(value.items);

const isBackupSchedule = (value: unknown): value is BackupSchedule =>
  isRecord(value) && typeof value.id === "string";

const backupScheduleCache = createMemoryBackedLocalCache({
  key: cacheKeys.backupSchedule,
  ttlMs: cacheTtlMs.detail,
  validate: isBackupSchedule,
});

const getBackupListCacheParts = (options: BackupListOptions = {}) => {
  const page = options.page ?? 1;
  const limit = options.limit ?? 10;
  const queryKey = createBoundedCacheKeySegment(options.query, "all");
  return { page, limit, queryKey };
};

const getBackupListCacheKey = (options: BackupListOptions = {}) => {
  const { page, limit, queryKey } = getBackupListCacheParts(options);
  return cacheKeys.backupsList(page, limit, queryKey);
};

const getBackupListCache = (options: BackupListOptions = {}) => {
  const key = getBackupListCacheKey(options);
  const existing = backupListCaches.get(key);
  if (existing) {
    backupListCacheOptions.set(key, {
      page: options.page ?? 1,
      limit: options.limit ?? 10,
      query: options.query,
    });
    return existing;
  }
  const created = createMemoryBackedLocalCache({
    key,
    ttlMs: cacheTtlMs.list,
    validate: isBackupListResult,
  });
  backupListCaches.set(key, created);
  backupListCacheOptions.set(key, {
    page: options.page ?? 1,
    limit: options.limit ?? 10,
    query: options.query,
  });
  return created;
};

const backupMatchesQuery = (backup: BackupItem, query?: string) => {
  const needle = query?.trim().toLowerCase();
  if (!needle) return true;
  return [
    backup.id,
    backup.status,
    backup.kind,
    backup.storageDriver,
    backup.error ?? "",
    backup.artifactPath ?? "",
  ].some((value) => value.toLowerCase().includes(needle));
};

const clearBackupListCacheByKey = (key: string) => {
  backupListCaches.get(key)?.clear();
  backupListCaches.delete(key);
  backupListCacheOptions.delete(key);
  cachedBackupListPromises.delete(key);
  clearLocalCache(key);
};

const isPublicDownloadUrl = (value: string) => {
  try {
    const url = new URL(value);
    return url.protocol === "https:" || url.protocol === "http:";
  } catch {
    return false;
  }
};

const sanitizeBackupItemForBrowserCache = (item: BackupItem): BackupItem => ({
  ...item,
  artifactPath:
    item.artifactPath && !isPublicDownloadUrl(item.artifactPath) ? "local" : item.artifactPath,
});

const sanitizeBackupListForBrowserCache = (result: BackupListResult): BackupListResult => ({
  ...result,
  items: result.items.map(sanitizeBackupItemForBrowserCache),
});

const invalidateBackupListCaches = () => {
  const keys = Array.from(backupListCaches.keys());
  for (const key of keys) {
    clearBackupListCacheByKey(key);
    broadcastCacheEvent({ key, action: "invalidate" });
  }
};

const invalidateBackupListCachesWhere = (predicate: (options: BackupListOptions) => boolean) => {
  for (const [key, options] of Array.from(backupListCacheOptions.entries())) {
    if (!predicate(options)) continue;
    clearBackupListCacheByKey(key);
    broadcastCacheEvent({ key, action: "invalidate" });
  }
};

const patchBackupListCaches = (
  patch: (cache: BackupListResult, options: BackupListOptions) => BackupListResult | null
) => {
  for (const [key, cache] of backupListCaches.entries()) {
    const current = cache.read();
    if (!current) continue;
    const next = patch(current, backupListCacheOptions.get(key) ?? {});
    if (!next) continue;
    cache.write(next);
    broadcastCacheEvent({ key, action: "update" });
  }
};

const patchBackupCreated = (created: BackupItem) => {
  const safeCreated = sanitizeBackupItemForBrowserCache(created);
  const isProcessing = safeCreated.status === "queued" || safeCreated.status === "running";
  invalidateBackupListCachesWhere(
    (options) => (options.page ?? 1) !== 1 && backupMatchesQuery(safeCreated, options.query)
  );
  patchBackupListCaches((current, options) => {
    if (!backupMatchesQuery(safeCreated, options.query)) return null;
    if ((options.page ?? current.page) !== 1) return null;
    const nextItems = [
      safeCreated,
      ...current.items.filter((item) => item.id !== safeCreated.id),
    ].slice(0, current.limit);
    const nextTotal = current.items.some((item) => item.id === safeCreated.id)
      ? current.total
      : current.total + 1;
    return {
      ...current,
      items: nextItems,
      total: nextTotal,
      hasPrevious: false,
      hasNext: nextTotal > current.limit,
      worker: {
        ...current.worker,
        queuedCount: isProcessing ? current.worker.queuedCount + 1 : current.worker.queuedCount,
        oldestQueuedAt: isProcessing
          ? (current.worker.oldestQueuedAt ?? safeCreated.createdAt)
          : current.worker.oldestQueuedAt,
        message:
          isProcessing && current.worker.queuedCount === 0
            ? "CMS backup worker is processing backup jobs."
            : current.worker.message,
      },
    };
  });
};

const patchBackupDeleted = (id: string) => {
  const snapshots = Array.from(backupListCaches.entries())
    .map(([key, cache]) => ({
      key,
      cache,
      options: backupListCacheOptions.get(key) ?? {},
      current: cache.read(),
    }))
    .filter(
      (
        snapshot
      ): snapshot is {
        key: string;
        cache: MemoryBackedStorageCache<BackupListResult>;
        options: BackupListOptions;
        current: BackupListResult;
      } => Boolean(snapshot.current)
    );
  const deletedItem = snapshots
    .flatMap((snapshot) => snapshot.current.items)
    .find((item) => item.id === id);

  for (const snapshot of snapshots) {
    if (deletedItem && !backupMatchesQuery(deletedItem, snapshot.options.query)) continue;
    if (!deletedItem && !snapshot.current.items.some((item) => item.id === id)) continue;
    const current = snapshot.current;
    const hadItem = current.items.some((item) => item.id === id);
    if (!hadItem || current.hasNext) {
      clearBackupListCacheByKey(snapshot.key);
      broadcastCacheEvent({ key: snapshot.key, action: "invalidate" });
      continue;
    }
    const nextTotal = Math.max(0, current.total - 1);
    snapshot.cache.write({
      ...current,
      items: current.items.filter((item) => item.id !== id),
      total: nextTotal,
      hasPrevious: current.page > 1,
      hasNext: current.page * current.limit < nextTotal,
    });
    broadcastCacheEvent({ key: snapshot.key, action: "update" });
  }
};

export const getCachedBackups = (options: BackupListOptions = {}) => {
  const cached = getBackupListCache(options).read();
  return cached ? sanitizeBackupListForBrowserCache(cached) : null;
};

export const getCachedBackupSchedule = () => backupScheduleCache.read();

export const clearBackupsCache = (options?: BackupListOptions) => {
  if (options) {
    clearBackupListCacheByKey(getBackupListCacheKey(options));
    return;
  }
  for (const key of Array.from(backupListCaches.keys())) {
    clearBackupListCacheByKey(key);
  }
};

export const clearBackupScheduleCache = () => {
  cachedBackupSchedulePromise = null;
  backupScheduleCache.clear();
};

export async function listBackups(options: BackupListOptions = {}) {
  const params = new URLSearchParams({
    page: String(options.page ?? 1),
    limit: String(options.limit ?? 10),
  });
  if (options.query?.trim()) params.set("query", options.query.trim());
  return apiRequest<BackupListResult>(`/backups?${params}`, {
    method: "GET",
  });
}

export async function listBackupsCached(options: BackupListCachedOptions = {}) {
  const { force, ...listOptions } = options;
  const key = getBackupListCacheKey(listOptions);
  const cache = getBackupListCache(listOptions);
  if (!force) {
    const cached = cache.read();
    if (cached) return sanitizeBackupListForBrowserCache(cached);
    const pending = cachedBackupListPromises.get(key);
    if (pending) return pending;
  }
  const request = listBackups(listOptions).then(sanitizeBackupListForBrowserCache);
  cachedBackupListPromises.set(key, request);
  try {
    const result = await request;
    cache.write(result);
    return result;
  } finally {
    if (cachedBackupListPromises.get(key) === request) {
      cachedBackupListPromises.delete(key);
    }
  }
}

export async function createBackup(input?: BackupCreatePayload) {
  const created = await apiRequest<BackupItem>(
    "/backups",
    {
      method: "POST",
      body: JSON.stringify(input ?? {}),
      headers: { "Content-Type": "application/json" },
    },
    { withCsrf: true }
  );
  if (created) patchBackupCreated(created);
  return created;
}

export async function deleteBackup(id: string) {
  const result = await apiRequest<{ ok: true; id: string }>(
    `/backups/${id}`,
    { method: "DELETE" },
    { withCsrf: true }
  );
  if (result?.ok) patchBackupDeleted(id);
  return result;
}

export async function restoreBackup(id: string) {
  // The route hardens restore behind an explicit confirmation (restoreBackupSchema
  // requires `confirm: true`); the body MUST carry it or the request fails
  // validation with a 400 before any restore runs.
  const restored = await apiRequest<BackupItem>(
    `/backups/${id}/restore`,
    {
      method: "POST",
      body: JSON.stringify({ confirm: true }),
      headers: { "Content-Type": "application/json" },
    },
    { withCsrf: true }
  );
  if (restored) invalidateBackupListCaches();
  return restored;
}

// v2 disaster restore (TASK-511-05): upload a downloaded `.cbk` archive with the
// passphrase that encrypted it. Multipart, mirroring mediaClient's FormData
// pattern — the browser sets the boundary; no manual Content-Type. Scalar fields
// arrive as strings on the server, so `confirm`/`restoreUsers` use "true"/"false".
export async function importBackup(input: {
  file: File;
  passphrase: string;
  restoreUsers?: boolean;
}) {
  const formData = new FormData();
  formData.set("file", input.file, input.file.name);
  formData.set("passphrase", input.passphrase);
  formData.set("confirm", "true");
  formData.set("restoreUsers", input.restoreUsers ? "true" : "false");
  const result = await apiRequest<BackupImportResult>(
    "/backups/import",
    {
      method: "POST",
      body: formData,
    },
    { withCsrf: true }
  );
  if (result) invalidateBackupListCaches();
  return result;
}

export async function downloadBackup(id: string) {
  return apiRequest<BackupDownload>(`/backups/${id}/download`, {
    method: "GET",
  });
}

export async function getBackupSchedule() {
  return apiRequest<BackupSchedule>("/backups/schedule", { method: "GET" });
}

export async function getBackupScheduleCached(options?: { force?: boolean }) {
  if (!options?.force) {
    const cached = getCachedBackupSchedule();
    if (cached) return cached;
    if (cachedBackupSchedulePromise) return cachedBackupSchedulePromise;
  }
  const request = getBackupSchedule();
  cachedBackupSchedulePromise = request;
  try {
    const schedule = await request;
    backupScheduleCache.write(schedule);
    return schedule;
  } finally {
    if (cachedBackupSchedulePromise === request) {
      cachedBackupSchedulePromise = null;
    }
  }
}

export async function updateBackupSchedule(payload: BackupScheduleUpdate) {
  const schedule = await apiRequest<BackupSchedule>(
    "/backups/schedule",
    {
      method: "PATCH",
      body: JSON.stringify(payload),
      headers: { "Content-Type": "application/json" },
    },
    { withCsrf: true }
  );
  if (schedule) {
    clearBackupScheduleCache();
    backupScheduleCache.write(schedule);
    broadcastCacheEvent({ key: cacheKeys.backupSchedule, action: "update" });
  }
  return schedule;
}
