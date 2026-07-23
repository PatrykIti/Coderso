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

export const MEDIA_FOLDERS_RESPONSE_INVALID = "media_folders_response_invalid";

export class MediaFoldersResponseError extends Error {
  readonly code = MEDIA_FOLDERS_RESPONSE_INVALID;

  constructor() {
    super("Invalid media folders response");
    this.name = "MediaFoldersResponseError";
  }
}

const MEDIA_FOLDER_KEYS = Object.freeze([
  "id",
  "name",
  "slug",
  "parentId",
  "orderIndex",
  "createdAt",
] as const);

type OwnDataValue = Readonly<{ value: unknown }>;

const readOwnDataValue = (candidate: unknown, key: PropertyKey): OwnDataValue | null => {
  if (typeof candidate !== "object" || candidate === null) return null;
  try {
    const descriptor = Object.getOwnPropertyDescriptor(candidate, key);
    if (!descriptor || !("value" in descriptor)) return null;
    return { value: descriptor.value };
  } catch {
    return null;
  }
};

const hasPlainObjectPrototype = (candidate: object): boolean => {
  try {
    const prototype = Object.getPrototypeOf(candidate);
    return prototype === Object.prototype || prototype === null;
  } catch {
    return false;
  }
};

const projectMediaFolder = (value: unknown): MediaFolder | null => {
  if (typeof value !== "object" || value === null || !hasPlainObjectPrototype(value)) return null;

  const id = readOwnDataValue(value, "id");
  const name = readOwnDataValue(value, "name");
  const slug = readOwnDataValue(value, "slug");
  const parentId = readOwnDataValue(value, "parentId");
  const orderIndex = readOwnDataValue(value, "orderIndex");
  const createdAt = readOwnDataValue(value, "createdAt");

  if (
    typeof id?.value !== "string" ||
    typeof name?.value !== "string" ||
    typeof slug?.value !== "string" ||
    (parentId?.value !== null && typeof parentId?.value !== "string") ||
    typeof orderIndex?.value !== "number" ||
    !Number.isFinite(orderIndex.value) ||
    !Number.isInteger(orderIndex.value) ||
    orderIndex.value < 0 ||
    typeof createdAt?.value !== "string"
  ) {
    return null;
  }

  return {
    id: id.value,
    name: name.value,
    slug: slug.value,
    parentId: parentId.value,
    orderIndex: orderIndex.value,
    createdAt: createdAt.value,
  };
};

const hasExactMediaFolderKeys = (value: object): boolean => {
  let keys: (string | symbol)[];
  try {
    keys = Reflect.ownKeys(value);
  } catch {
    return false;
  }
  return (
    keys.length === MEDIA_FOLDER_KEYS.length && MEDIA_FOLDER_KEYS.every((key) => keys.includes(key))
  );
};

const isCanonicalMediaFolder = (value: unknown): value is MediaFolder =>
  projectMediaFolder(value) !== null &&
  typeof value === "object" &&
  value !== null &&
  hasExactMediaFolderKeys(value);

const readDenseArray = (value: unknown): unknown[] | null => {
  try {
    if (!Array.isArray(value)) return null;
  } catch {
    return null;
  }

  const length = readOwnDataValue(value, "length");
  if (
    typeof length?.value !== "number" ||
    !Number.isFinite(length.value) ||
    !Number.isInteger(length.value) ||
    length.value < 0
  ) {
    return null;
  }

  const items: unknown[] = [];
  for (let index = 0; index < length.value; index += 1) {
    const item = readOwnDataValue(value, String(index));
    if (!item) return null;
    items.push(item.value);
  }
  return items;
};

const isCanonicalMediaFolderList = (value: unknown): value is MediaFolder[] => {
  const items = readDenseArray(value);
  return items !== null && items.every(isCanonicalMediaFolder);
};

const normalizeMediaFolderList = (value: unknown): MediaFolder[] => {
  const items = readDenseArray(value);
  if (!items) throw new MediaFoldersResponseError();

  const projected: MediaFolder[] = [];
  for (const item of items) {
    const folder = projectMediaFolder(item);
    if (!folder) throw new MediaFoldersResponseError();
    projected.push(folder);
  }
  return projected;
};

let cachedFoldersPromise: Promise<MediaFolder[]> | null = null;
let foldersRequestGeneration = 0;

const foldersCache = createMemoryBackedLocalCache({
  key: cacheKeys.mediaFolders,
  ttlMs: cacheTtlMs.list,
  validate: isCanonicalMediaFolderList,
});

export const getCachedMediaFolders = () => foldersCache.read();

export const getCachedMediaFoldersForEvent = () => foldersCache.readStorageFirst();

export const clearMediaFoldersCache = () => {
  foldersRequestGeneration += 1;
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

  const generation = ++foldersRequestGeneration;
  const rawRequest = listMediaFolders();
  let request: Promise<MediaFolder[]>;
  request = rawRequest
    .then((value) => {
      const items = normalizeMediaFolderList(value);
      if (foldersRequestGeneration === generation && cachedFoldersPromise === request) {
        foldersCache.write(items);
      }
      return items;
    })
    .finally(() => {
      if (cachedFoldersPromise === request) {
        cachedFoldersPromise = null;
      }
    });
  cachedFoldersPromise = request;
  return request;
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
