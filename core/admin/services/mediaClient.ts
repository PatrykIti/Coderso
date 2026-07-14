import { apiRequest } from "./apiClient";
import { broadcastCacheEvent } from "@/utils/cacheBus";
import { cacheKeys, cacheTtlMs } from "@/services/cachePolicy";
import { createMemoryBackedLocalCache } from "@/utils/storageCache";

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
  folderId?: string | null;
  tags?: string[];
  focalX?: number | null;
  focalY?: number | null;
  description?: string | null;
  credit?: string | null;
  createdAt: string;
  createdBy?: string | null;
};

export type MediaUsageSummary = {
  id: string;
  type: "page" | "entry" | "post" | "commerce" | "submission";
  title: string;
  context: string;
  targetId: string;
  targetSlug?: string | null;
  adminHref: string;
};

export type MediaUpdatePayload = {
  alt?: string | null;
  title?: string | null;
  caption?: string | null;
  folderId?: string | null;
  tags?: string[];
  focalX?: number | null;
  focalY?: number | null;
  description?: string | null;
  credit?: string | null;
};

/**
 * Narrow upload-meta shape (the pre-extension `MediaUpdatePayload`). Upload bodies
 * MUST NOT carry folder/tag/focal/etc — those are set via upload-first-then-PATCH
 * (see 512-03 `mediaUploadSchema` is `additionalProperties:false`). Re-typing the
 * upload entry points to this type makes `uploadMedia(file, { folderId })` a compile
 * error (type-enforced, not convention).
 */
export type UploadMediaMeta = {
  alt?: string | null;
  title?: string | null;
  caption?: string | null;
};

const clipboardMimeToExtension = (mimeType: string) => {
  const normalized = mimeType.trim().toLowerCase();
  if (normalized === "image/jpeg" || normalized === "image/jpg") return "jpg";
  if (normalized === "image/png") return "png";
  if (normalized === "image/webp") return "webp";
  if (normalized === "image/gif") return "gif";
  if (normalized === "image/avif") return "avif";
  if (normalized === "image/svg+xml") return "svg";
  return "png";
};

export const createClipboardImageFilename = (mimeType: string, now = new Date()) => {
  const iso = now.toISOString().replace(/[:.]/g, "-");
  const extension = clipboardMimeToExtension(mimeType);
  return `clipboard-image-${iso}.${extension}`;
};

export const normalizeClipboardImageFile = (file: File, now = new Date()) => {
  const type = file.type || "application/octet-stream";
  if (!type.toLowerCase().startsWith("image/")) {
    throw new Error("clipboard_image_type_invalid");
  }
  const rawName = typeof file.name === "string" ? file.name : "";
  const filename =
    rawName.trim().length > 0 ? rawName.trim() : createClipboardImageFilename(type, now);
  if (filename === rawName) {
    return file;
  }
  return new File([file], filename, {
    type,
    lastModified: file.lastModified || now.getTime(),
  });
};

let cachedMediaPromise: Promise<MediaRecord[]> | null = null;

const isMediaList = (value: unknown): value is MediaRecord[] => Array.isArray(value);

const mediaListCache = createMemoryBackedLocalCache({
  key: cacheKeys.mediaList,
  ttlMs: cacheTtlMs.list,
  validate: isMediaList,
});

const primeMediaCacheInternal = (items: MediaRecord[]) => {
  mediaListCache.write(items);
};

const upsertCachedMedia = (item: MediaRecord) => {
  cachedMediaPromise = null;
  const current = getCachedMedia();
  // If there is no valid cached list (unset or TTL-expired) do NOT seed a
  // partial single-item cache: writing `[item]` would masquerade as the
  // complete list and hide every other asset until the TTL lapses again
  // (e.g. tagging/foldering one asset after the list cache expired collapsed
  // the library to that one row). Mirror removeCachedMedia's guard and leave
  // the cache empty — the update cache-event drives a forced refetch that
  // rebuilds the full list including this mutation.
  if (!current) return;
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
  cachedMediaPromise = null;
  const current = getCachedMedia();
  if (!current) return;
  primeMediaCacheInternal(current.filter((media) => media.id !== id));
};

export const getCachedMedia = () => mediaListCache.read();

export const getCachedMediaForEvent = () => mediaListCache.readStorageFirst();

export const clearMediaCache = () => {
  cachedMediaPromise = null;
  mediaListCache.clear();
};

export async function listMedia() {
  return apiRequest<MediaRecord[]>("/media", { method: "GET" });
}

export function listMediaCached(options?: { force?: boolean }) {
  if (!options?.force) {
    const cached = getCachedMedia();
    if (cached) return Promise.resolve(cached);
    if (cachedMediaPromise) return cachedMediaPromise;
  }

  let request: Promise<MediaRecord[]>;
  request = listMedia()
    .then((items) => {
      if (cachedMediaPromise === request) {
        primeMediaCacheInternal(items);
      }
      return items;
    })
    .finally(() => {
      if (cachedMediaPromise === request) {
        cachedMediaPromise = null;
      }
    });
  cachedMediaPromise = request;
  return request;
}

export async function uploadMedia(file: File, meta?: UploadMediaMeta) {
  const formData = new FormData();
  formData.set("file", file, file.name);
  if (meta?.alt) formData.set("alt", meta.alt);
  if (meta?.title) formData.set("title", meta.title);
  if (meta?.caption) formData.set("caption", meta.caption);

  const result = await apiRequest<MediaRecord>(
    "/media",
    {
      method: "POST",
      body: formData,
    },
    { withCsrf: true }
  );
  if (result) {
    upsertCachedMedia(result);
    broadcastCacheEvent({ key: cacheKeys.mediaList, action: "update" });
  }
  return result;
}

export async function uploadClipboardImage(file: File, meta?: UploadMediaMeta) {
  const normalizedFile = normalizeClipboardImageFile(file);
  return uploadMedia(normalizedFile, meta);
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

export async function getMediaUsage(id: string, options?: { limit?: number }) {
  const params = new URLSearchParams();
  if (options?.limit) params.set("limit", String(options.limit));
  const suffix = params.toString() ? `?${params.toString()}` : "";
  return apiRequest<MediaUsageSummary[]>(`/media/${encodeURIComponent(id)}/usage${suffix}`, {
    method: "GET",
  });
}

export async function recoverMediaDimensions(id: string) {
  const updated = await apiRequest<MediaRecord>(
    `/media/${encodeURIComponent(id)}/dimensions/recover`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({}),
    },
    { withCsrf: true }
  );
  if (updated) {
    upsertCachedMedia(updated);
    broadcastCacheEvent({ key: cacheKeys.mediaList, action: "update" });
  }
  return updated;
}

export async function replaceMedia(id: string, file: File) {
  const formData = new FormData();
  formData.set("file", file, file.name);
  const updated = await apiRequest<MediaRecord>(
    `/media/${encodeURIComponent(id)}/replace`,
    {
      method: "POST",
      body: formData,
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
    broadcastCacheEvent({ key: cacheKeys.mediaList, action: "update" });
  }
  return result;
}
