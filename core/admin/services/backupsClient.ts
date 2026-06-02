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
export type BackupIncludeOption = "database" | "media" | "settings";

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
  createdAt: string;
  updatedAt: string;
};

export type BackupScheduleUpdate = {
  enabled?: boolean;
  frequency?: BackupFrequency;
  retentionDays?: number;
  storageDriver?: BackupStorageDriver;
};

export type BackupListOptions = {
  page?: number;
  limit?: number;
  query?: string;
};

export type BackupCreatePayload = {
  kind?: BackupKind;
  include?: BackupIncludeOption[];
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
};

let cachedBackupSchedulePromise: Promise<BackupSchedule> | null = null;
const cachedBackupListPromises = new Map<string, Promise<BackupListResult>>();
const backupListCaches = new Map<string, MemoryBackedStorageCache<BackupListResult>>();

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
  if (existing) return existing;
  const created = createMemoryBackedLocalCache({
    key,
    ttlMs: cacheTtlMs.list,
    validate: isBackupListResult,
  });
  backupListCaches.set(key, created);
  return created;
};

const clearBackupListCacheByKey = (key: string) => {
  backupListCaches.get(key)?.clear();
  backupListCaches.delete(key);
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
  if (created) invalidateBackupListCaches();
  return created;
}

export async function deleteBackup(id: string) {
  const result = await apiRequest<{ ok: true; id: string }>(
    `/backups/${id}`,
    { method: "DELETE" },
    { withCsrf: true }
  );
  if (result?.ok) invalidateBackupListCaches();
  return result;
}

export async function restoreBackup(id: string) {
  const restored = await apiRequest<BackupItem>(
    `/backups/${id}/restore`,
    { method: "POST" },
    { withCsrf: true }
  );
  if (restored) invalidateBackupListCaches();
  return restored;
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
