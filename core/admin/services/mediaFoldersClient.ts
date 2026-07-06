import { apiRequest } from "./apiClient";
import { broadcastCacheEvent } from "@/utils/cacheBus";
import { cacheKeys, cacheTtlMs } from "@/services/cachePolicy";
import { createMemoryBackedLocalCache } from "@/utils/storageCache";

export type MediaFolder = {
  id: string;
  name: string;
  slug: string;
  parentId: string | null;
  orderIndex: number;
  createdAt: string;
};

/**
 * Client-side reorder item type — declared INDEPENDENTLY here (the server
 * `MediaFolderOrder` from 512-02 cannot be imported across the transport boundary).
 * It must match the server shape (512-02 / 512-03 route) EXACTLY so the route's
 * reject-unknown validator accepts it. Carries optional `parentId` for drag
 * re-parenting.
 */
export type MediaFolderOrder = {
  id: string;
  orderIndex: number;
  parentId?: string | null;
};

export type MediaFolderCreate = {
  name: string;
  slug?: string;
  parentId?: string | null;
  orderIndex?: number;
};

export type MediaFolderPatch = Partial<MediaFolderCreate>;

let cachedFoldersPromise: Promise<MediaFolder[]> | null = null;

const isFolderList = (value: unknown): value is MediaFolder[] => Array.isArray(value);

const foldersCache = createMemoryBackedLocalCache({
  key: cacheKeys.mediaFolders,
  ttlMs: cacheTtlMs.list,
  validate: isFolderList,
});

const primeFoldersCache = (items: MediaFolder[]) => {
  cachedFoldersPromise = null;
  foldersCache.write(items);
};

export const getCachedMediaFolders = () => foldersCache.read();

export const getCachedMediaFoldersForEvent = () => foldersCache.readStorageFirst();

export const clearMediaFoldersCache = () => {
  cachedFoldersPromise = null;
  foldersCache.clear();
};

export async function listMediaFolders() {
  return apiRequest<MediaFolder[]>("/media/folders", { method: "GET" });
}

export async function listMediaFoldersCached(options?: { force?: boolean }) {
  if (!options?.force) {
    const cached = getCachedMediaFolders();
    if (cached) return cached;
    if (cachedFoldersPromise) return cachedFoldersPromise;
  }
  const request = listMediaFolders();
  cachedFoldersPromise = request;
  const items = await request;
  primeFoldersCache(items);
  return items;
}

export async function createMediaFolder(input: MediaFolderCreate) {
  const created = await apiRequest<MediaFolder>(
    "/media/folders",
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input),
    },
    { withCsrf: true }
  );
  clearMediaFoldersCache();
  broadcastCacheEvent({ key: cacheKeys.mediaFolders, action: "update" });
  return created;
}

export async function updateMediaFolder(id: string, patch: MediaFolderPatch) {
  const updated = await apiRequest<MediaFolder>(
    `/media/folders/${encodeURIComponent(id)}`,
    {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(patch),
    },
    { withCsrf: true }
  );
  clearMediaFoldersCache();
  broadcastCacheEvent({ key: cacheKeys.mediaFolders, action: "update" });
  return updated;
}

export async function reorderMediaFolders(orders: MediaFolderOrder[]): Promise<void> {
  // The 512-03 route reads `(ctx.body as { orders: MediaFolderOrder[] }).orders`, so the
  // body MUST be the `{ orders }` wrapper — a bare array is rejected 4xx.
  await apiRequest<{ ok: boolean }>(
    "/media/folders/reorder",
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ orders }),
    },
    { withCsrf: true }
  );
  clearMediaFoldersCache();
  broadcastCacheEvent({ key: cacheKeys.mediaFolders, action: "update" });
}

export async function deleteMediaFolder(id: string) {
  const result = await apiRequest<{ ok: boolean }>(
    `/media/folders/${encodeURIComponent(id)}`,
    { method: "DELETE" },
    { withCsrf: true }
  );
  clearMediaFoldersCache();
  // Deleting a folder un-files its media (media.folderId -> null, onDelete:"set null"),
  // so open media views must reconcile too.
  broadcastCacheEvent({ key: cacheKeys.mediaFolders, action: "update" });
  broadcastCacheEvent({ key: cacheKeys.mediaList, action: "update" });
  return result;
}
