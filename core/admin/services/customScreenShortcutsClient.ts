import { apiRequest } from "./apiClient";
import { cacheKeys, cacheTtlMs } from "@/services/cachePolicy";
import { createMemoryBackedLocalCache } from "@/utils/storageCache";

export type CustomScreenShortcutStatus = "draft" | "active";

export type CustomScreenShortcutCapabilities = {
  supportsDedicatedEditor: boolean;
  [key: string]: unknown;
};

export type CustomScreenShortcutBinding = {
  id?: string;
  widgetId?: string;
  propPath?: string;
  field?: string;
  mode?: string;
};

export type CustomScreenShortcutRecord = {
  id: string;
  name: string;
  contentTypeId?: string;
  status: CustomScreenShortcutStatus;
  collectionRole?: string | null;
  compositionKey?: string | null;
  showInSidebar: boolean;
  sidebarLabel: string | null;
  schemaVersion?: number;
  definition?: unknown;
  capabilities?: CustomScreenShortcutCapabilities | null;
  blocks?: unknown[];
  bindings?: CustomScreenShortcutBinding[];
  createdAt?: string;
  updatedAt?: string;
};

type RawCustomScreenShortcutRecord = Omit<
  CustomScreenShortcutRecord,
  "showInSidebar" | "sidebarLabel"
> & {
  showInSidebar?: boolean;
  sidebarLabel?: string | null;
};

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const isCustomScreenShortcutStatus = (value: unknown): value is CustomScreenShortcutStatus =>
  value === "draft" || value === "active";

const isCustomScreenShortcutCapabilities = (
  value: unknown
): value is CustomScreenShortcutCapabilities =>
  isRecord(value) && typeof value.supportsDedicatedEditor === "boolean";

const isCustomScreenShortcutBinding = (value: unknown): value is CustomScreenShortcutBinding =>
  isRecord(value) && (value.mode === undefined || typeof value.mode === "string");

const isCustomScreenShortcutRecord = (value: unknown): value is RawCustomScreenShortcutRecord =>
  isRecord(value) &&
  typeof value.id === "string" &&
  typeof value.name === "string" &&
  isCustomScreenShortcutStatus(value.status) &&
  (value.showInSidebar === undefined || typeof value.showInSidebar === "boolean") &&
  (value.sidebarLabel === undefined ||
    value.sidebarLabel === null ||
    typeof value.sidebarLabel === "string") &&
  (value.capabilities === undefined ||
    value.capabilities === null ||
    isCustomScreenShortcutCapabilities(value.capabilities)) &&
  (value.blocks === undefined || Array.isArray(value.blocks)) &&
  (value.bindings === undefined ||
    (Array.isArray(value.bindings) && value.bindings.every(isCustomScreenShortcutBinding)));

const isCustomScreenShortcutList = (value: unknown): value is RawCustomScreenShortcutRecord[] =>
  Array.isArray(value) && value.every(isCustomScreenShortcutRecord);

const normalizeCustomScreenShortcutRecord = (
  item: RawCustomScreenShortcutRecord
): CustomScreenShortcutRecord => ({
  ...item,
  showInSidebar: item.showInSidebar ?? false,
  sidebarLabel: item.sidebarLabel ?? null,
});

let cachedShortcutsPromise: Promise<CustomScreenShortcutRecord[]> | null = null;

const customScreenShortcutsCache = createMemoryBackedLocalCache({
  key: cacheKeys.customScreensList,
  ttlMs: cacheTtlMs.list,
  validate: isCustomScreenShortcutList,
});

const readShortcutsCache = () =>
  customScreenShortcutsCache.read()?.map(normalizeCustomScreenShortcutRecord) ?? null;

const primeShortcutsCache = (items: RawCustomScreenShortcutRecord[]) => {
  cachedShortcutsPromise = null;
  customScreenShortcutsCache.write(items.map(normalizeCustomScreenShortcutRecord));
};

export const getCachedCustomScreenShortcuts = () => {
  return readShortcutsCache();
};

export const clearCustomScreenShortcutsCache = () => {
  cachedShortcutsPromise = null;
  customScreenShortcutsCache.clear();
};

export async function listCustomScreenShortcuts() {
  const payload = await apiRequest<{ items: RawCustomScreenShortcutRecord[] }>("/custom-screens", {
    method: "GET",
  });
  const items = payload.items ?? [];
  if (!isCustomScreenShortcutList(items)) return [];
  return items.map(normalizeCustomScreenShortcutRecord);
}

export async function listCustomScreenShortcutsCached(options?: { force?: boolean }) {
  if (!options?.force) {
    const cached = getCachedCustomScreenShortcuts();
    if (cached) return cached;
    if (cachedShortcutsPromise) return cachedShortcutsPromise;
  }
  const request = listCustomScreenShortcuts();
  cachedShortcutsPromise = request;
  const items = await request;
  primeShortcutsCache(items);
  return items;
}
