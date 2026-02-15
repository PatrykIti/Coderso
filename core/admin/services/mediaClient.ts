import { apiRequest } from "./apiClient";
import { broadcastCacheEvent } from "@/utils/cacheBus";
import { cacheKeys, cacheTtlMs } from "@/services/cachePolicy";
import { clearLocalCache, readLocalCache, writeLocalCache } from "@/utils/storageCache";

export type MediaRecord = {
  id: string;
  key: string;
  url: string;
  originalName?: string | null;
  type: "image" | "file";
  mimeType: string;
  size: number;
  width?: number | null;
  height?: number | null;
  alt?: string | null;
  title?: string | null;
  caption?: string | null;
  createdAt: string;
  createdBy?: string | null;
};

export type MediaUploadResponse = {
  id: string;
  url: string;
  key: string;
};

export type MediaUpdatePayload = {
  alt?: string | null;
  title?: string | null;
  caption?: string | null;
};

let cachedMedia: MediaRecord[] | null = null;
let cachedMediaPromise: Promise<MediaRecord[]> | null = null;

const isMediaList = (value: unknown): value is MediaRecord[] => Array.isArray(value);

const readMediaCache = () =>
  readLocalCache(cacheKeys.mediaList, cacheTtlMs.list, isMediaList);

const primeMediaCacheInternal = (items: MediaRecord[]) => {
  cachedMedia = items;
  cachedMediaPromise = null;
  writeLocalCache(cacheKeys.mediaList, items);
};

const upsertCachedMedia = (item: MediaRecord) => {
  const current = cachedMedia ?? readMediaCache() ?? [];
  const index = current.findIndex((media) => media.id === item.id);
  const next = [...current];
  if (index === -1) {
    next.unshift(item);
  } else {
    next[index] = item;
  }
  primeMediaCacheInternal(next);
};

const removeCachedMedia = (id: string) => {
  const current = cachedMedia ?? readMediaCache();
  if (!current) return;
  primeMediaCacheInternal(current.filter((media) => media.id !== id));
};

export const getCachedMedia = () => {
  if (cachedMedia) return cachedMedia;
  const cached = readMediaCache();
  if (cached) cachedMedia = cached;
  return cachedMedia;
};

export const clearMediaCache = () => {
  cachedMedia = null;
  cachedMediaPromise = null;
  clearLocalCache(cacheKeys.mediaList);
};

export async function listMedia() {
  return apiRequest<MediaRecord[]>("/media", { method: "GET" });
}

export async function listMediaCached(options?: { force?: boolean }) {
  if (!options?.force) {
    const cached = getCachedMedia();
    if (cached) return cached;
    if (cachedMediaPromise) return cachedMediaPromise;
  }
  const request = listMedia();
  cachedMediaPromise = request;
  const items = await request;
  primeMediaCacheInternal(items);
  return items;
}

export async function uploadMedia(file: File, meta?: MediaUpdatePayload) {
  const formData = new FormData();
  formData.set("file", file, file.name);
  if (meta?.alt) formData.set("alt", meta.alt);
  if (meta?.title) formData.set("title", meta.title);
  if (meta?.caption) formData.set("caption", meta.caption);

  const result = await apiRequest<MediaUploadResponse>(
    "/media",
    {
      method: "POST",
      body: formData,
    },
    { withCsrf: true }
  );
  if (result) {
    clearMediaCache();
    broadcastCacheEvent({ key: cacheKeys.mediaList, action: "invalidate" });
  }
  return result;
}

export async function updateMedia(id: string, payload: MediaUpdatePayload) {
  const updated = await apiRequest<MediaRecord>(
    `/media/${encodeURIComponent(id)}`,
    {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    },
    { withCsrf: true }
  );
  if (updated) {
    upsertCachedMedia(updated);
    broadcastCacheEvent({ key: cacheKeys.mediaList, action: "update" });
  }
  return updated;
}

export async function deleteMedia(id: string) {
  const result = await apiRequest<{ ok: boolean }>(
    `/media/${encodeURIComponent(id)}`,
    {
      method: "DELETE",
    },
    { withCsrf: true }
  );
  if (result?.ok) {
    removeCachedMedia(id);
    broadcastCacheEvent({ key: cacheKeys.mediaList, action: "invalidate" });
  }
  return result;
}
