import { apiRequest } from "./apiClient";
import { broadcastCacheEvent } from "@/utils/cacheBus";
import { cacheKeys, cacheTtlMs } from "@/services/cachePolicy";
import {
  clearLocalCache,
  createMemoryBackedLocalCache,
  readLocalCache,
  writeLocalCache,
} from "@/utils/storageCache";
import type { MenuItemSettings } from "../../services/menus/menuItemSettings";
import type { MenuAppearance } from "../../services/menus/normalizeMenuAppearance";
import type { PageBlockV2 } from "../../services/pages/pageDocumentV2";

export type MenuSummary = {
  id: string;
  name: string;
  location: string | null;
  status: "draft" | "published";
  publishedAt: string | null;
  createdAt: string;
  /**
   * Stored `menus.settings` envelope (appearance + nav extras,
   * TASK-458-02/03). Read through the fail-closed `resolveStored*` helpers,
   * never directly.
   */
  settings?: unknown;
};

export type MenuItemRecord = {
  id: string;
  label: string;
  href: string | null;
  pageId: string | null;
  parentId: string | null;
  orderIndex: number;
  settings?: MenuItemSettings;
};

export type MenuItemNode = MenuItemRecord & { children: MenuItemNode[] };

export type MenuWithItems = {
  menu: MenuSummary;
  items: MenuItemNode[];
};

export type MenuItemInput = {
  id?: string;
  label: string;
  href?: string | null;
  pageId?: string | null;
  parentId?: string | null;
  orderIndex?: number;
  settings?: MenuItemSettings;
};

let cachedMenusPromise: Promise<MenuSummary[]> | null = null;
const knownMenuDetailIds = new Set<string>();

const isRecord = (value: unknown): value is Record<string, unknown> =>
  Boolean(value) && typeof value === "object" && !Array.isArray(value);

const isMenuStatus = (value: unknown): value is MenuSummary["status"] =>
  value === "draft" || value === "published";

const isNullableString = (value: unknown): value is string | null =>
  typeof value === "string" || value === null;

const isMenuSummary = (value: unknown): value is MenuSummary => {
  if (!isRecord(value)) return false;
  return (
    typeof value.id === "string" &&
    typeof value.name === "string" &&
    isNullableString(value.location) &&
    isMenuStatus(value.status) &&
    isNullableString(value.publishedAt) &&
    typeof value.createdAt === "string"
  );
};

const isMenuList = (value: unknown): value is MenuSummary[] =>
  Array.isArray(value) && value.every(isMenuSummary);

const menusListCache = createMemoryBackedLocalCache({
  key: cacheKeys.menusList,
  ttlMs: cacheTtlMs.list,
  validate: isMenuList,
});

const isMenuDetail = (value: unknown): value is MenuWithItems =>
  isRecord(value) && isMenuSummary(value.menu) && Array.isArray(value.items);

const readMenusCache = () => menusListCache.read();

const readMenuDetailCache = (id: string) => {
  const cached = readLocalCache(cacheKeys.menuDetail(id), cacheTtlMs.detail, isMenuDetail);
  if (cached) knownMenuDetailIds.add(id);
  return cached;
};

const writeMenuDetailCache = (payload: MenuWithItems) => {
  knownMenuDetailIds.add(payload.menu.id);
  writeLocalCache(cacheKeys.menuDetail(payload.menu.id), payload);
};

const primeMenusCacheInternal = (items: MenuSummary[]) => {
  cachedMenusPromise = null;
  menusListCache.write(items);
};

const upsertCachedMenuSummary = (menu: MenuSummary) => {
  const current = readMenusCache() ?? [];
  const index = current.findIndex((item) => item.id === menu.id);
  const next = [...current];
  if (index === -1) {
    next.unshift(menu);
  } else {
    next[index] = { ...next[index], ...menu };
  }
  primeMenusCacheInternal(next);
};

const upsertCachedMenuDetail = (payload: MenuWithItems) => {
  upsertCachedMenuSummary(payload.menu);
  writeMenuDetailCache(payload);
};

const removeCachedMenu = (id: string) => {
  const current = readMenusCache();
  if (!current) return;
  primeMenusCacheInternal(current.filter((item) => item.id !== id));
  clearLocalCache(cacheKeys.menuDetail(id));
};

export const getCachedMenus = () => readMenusCache();

export const getCachedMenuDetail = (id: string) => readMenuDetailCache(id);

export const clearMenusCache = () => {
  cachedMenusPromise = null;
  menusListCache.clear();
  for (const id of knownMenuDetailIds) {
    clearLocalCache(cacheKeys.menuDetail(id));
  }
  knownMenuDetailIds.clear();
};

export async function listMenus() {
  return apiRequest<MenuSummary[]>("/menus", { method: "GET" });
}

export async function listMenusCached(options?: { force?: boolean }) {
  if (!options?.force) {
    const cached = getCachedMenus();
    if (cached) return cached;
    if (cachedMenusPromise) return cachedMenusPromise;
  }
  const request = listMenus();
  cachedMenusPromise = request;
  const items = await request;
  primeMenusCacheInternal(items);
  return items;
}

export async function getMenuWithItems(menuId: string) {
  return apiRequest<MenuWithItems>(`/menus/${menuId}`, { method: "GET" });
}

export async function getMenuWithItemsCached(menuId: string, options?: { force?: boolean }) {
  if (!options?.force) {
    const cached = readMenuDetailCache(menuId);
    if (cached) return cached;
  }
  const result = await getMenuWithItems(menuId);
  if (result) upsertCachedMenuDetail(result);
  return result;
}

export async function createMenu(input: {
  name: string;
  location?: string | null;
  status?: MenuSummary["status"];
}) {
  const created = await apiRequest<MenuSummary>(
    "/menus",
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: input.name,
        location: input.location ?? null,
        status: input.status,
      }),
    },
    { withCsrf: true }
  );
  if (created) {
    upsertCachedMenuSummary(created);
    broadcastCacheEvent({ key: cacheKeys.menusList, action: "update" });
    broadcastCacheEvent({ key: cacheKeys.menuDetail(created.id), action: "update" });
  }
  return created;
}

export async function updateMenu(
  menuId: string,
  input: {
    name?: string;
    location?: string | null;
    status?: MenuSummary["status"];
    /** Menu appearance draft; `null` clears back to the legacy look. */
    appearance?: MenuAppearance | null;
    /** Nav extras blocks; `null`/empty clears the slot. */
    extras?: PageBlockV2[] | null;
  }
) {
  const updated = await apiRequest<MenuSummary>(
    `/menus/${menuId}`,
    {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input),
    },
    { withCsrf: true }
  );
  if (updated) {
    upsertCachedMenuSummary(updated);
    const detail = readMenuDetailCache(menuId);
    if (detail) {
      writeMenuDetailCache({ ...detail, menu: { ...detail.menu, ...updated } });
    }
    broadcastCacheEvent({ key: cacheKeys.menusList, action: "update" });
    broadcastCacheEvent({ key: cacheKeys.menuDetail(updated.id), action: "update" });
  }
  return updated;
}

export const publishMenu = (menuId: string) => updateMenu(menuId, { status: "published" });

export const moveMenuToDraft = (menuId: string) => updateMenu(menuId, { status: "draft" });

export async function replaceMenuItems(menuId: string, items: MenuItemInput[]) {
  const result = await apiRequest<{ ok: boolean }>(
    `/menus/${menuId}/items`,
    {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ items }),
    },
    { withCsrf: true }
  );
  if (result?.ok) {
    clearLocalCache(cacheKeys.menuDetail(menuId));
    broadcastCacheEvent({ key: cacheKeys.menuDetail(menuId), action: "update" });
  }
  return result;
}

export async function deleteMenu(menuId: string) {
  const result = await apiRequest<{ ok: boolean }>(
    `/menus/${menuId}`,
    {
      method: "DELETE",
    },
    { withCsrf: true }
  );
  if (result?.ok) {
    removeCachedMenu(menuId);
    broadcastCacheEvent({ key: cacheKeys.menusList, action: "invalidate" });
    broadcastCacheEvent({ key: cacheKeys.menuDetail(menuId), action: "invalidate" });
  }
  return result;
}
