import { apiRequest } from "./apiClient";
import { broadcastCacheEvent } from "@/utils/cacheBus";
import { cacheKeys, cacheTtlMs } from "@/services/cachePolicy";
import { clearLocalCache, readLocalCache, writeLocalCache } from "@/utils/storageCache";

export type MenuSummary = {
  id: string;
  name: string;
  location: string | null;
  createdAt: string;
};

export type MenuItemRecord = {
  id: string;
  label: string;
  href: string | null;
  pageId: string | null;
  parentId: string | null;
  orderIndex: number;
  settings?: Record<string, unknown>;
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
  settings?: Record<string, unknown>;
};

let cachedMenus: MenuSummary[] | null = null;
let cachedMenusPromise: Promise<MenuSummary[]> | null = null;

const isMenuList = (value: unknown): value is MenuSummary[] => Array.isArray(value);

const isMenuDetail = (value: unknown): value is MenuWithItems =>
  Boolean(value && typeof value === "object" && "menu" in value && "items" in value);

const readMenusCache = () =>
  readLocalCache(cacheKeys.menusList, cacheTtlMs.list, isMenuList);

const readMenuDetailCache = (id: string) =>
  readLocalCache(cacheKeys.menuDetail(id), cacheTtlMs.detail, isMenuDetail);

const writeMenuDetailCache = (payload: MenuWithItems) => {
  writeLocalCache(cacheKeys.menuDetail(payload.menu.id), payload);
};

const primeMenusCacheInternal = (items: MenuSummary[]) => {
  cachedMenus = items;
  cachedMenusPromise = null;
  writeLocalCache(cacheKeys.menusList, items);
};

const upsertCachedMenuSummary = (menu: MenuSummary) => {
  const current = cachedMenus ?? readMenusCache() ?? [];
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
  const current = cachedMenus ?? readMenusCache();
  if (!current) return;
  primeMenusCacheInternal(current.filter((item) => item.id !== id));
  clearLocalCache(cacheKeys.menuDetail(id));
};

export const getCachedMenus = () => {
  if (cachedMenus) return cachedMenus;
  const cached = readMenusCache();
  if (cached) cachedMenus = cached;
  return cachedMenus;
};

export const getCachedMenuDetail = (id: string) => readMenuDetailCache(id);

export const clearMenusCache = () => {
  cachedMenus = null;
  cachedMenusPromise = null;
  clearLocalCache(cacheKeys.menusList);
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

export async function createMenu(input: { name: string; location?: string | null }) {
  const created = await apiRequest<MenuSummary>(
    "/menus",
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: input.name,
        location: input.location ?? null,
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
  input: { name?: string; location?: string | null }
) {
  const updated = await apiRequest<MenuSummary>(`/menus/${menuId}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  }, { withCsrf: true });
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

export async function replaceMenuItems(menuId: string, items: MenuItemInput[]) {
  const result = await apiRequest<{ ok: boolean }>(`/menus/${menuId}/items`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ items }),
  }, { withCsrf: true });
  if (result?.ok) {
    clearLocalCache(cacheKeys.menuDetail(menuId));
    broadcastCacheEvent({ key: cacheKeys.menuDetail(menuId), action: "update" });
  }
  return result;
}

export async function deleteMenu(menuId: string) {
  const result = await apiRequest<{ ok: boolean }>(`/menus/${menuId}`, {
    method: "DELETE",
  }, { withCsrf: true });
  if (result?.ok) {
    removeCachedMenu(menuId);
    broadcastCacheEvent({ key: cacheKeys.menusList, action: "invalidate" });
    broadcastCacheEvent({ key: cacheKeys.menuDetail(menuId), action: "invalidate" });
  }
  return result;
}
