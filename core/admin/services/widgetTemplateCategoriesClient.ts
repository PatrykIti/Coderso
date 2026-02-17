import { apiRequest } from "./apiClient";
import { broadcastCacheEvent } from "@/utils/cacheBus";
import { cacheKeys, cacheTtlMs } from "@/services/cachePolicy";
import { clearLocalCache, readLocalCache, writeLocalCache } from "@/utils/storageCache";
import { clearWidgetCatalogCache } from "@/services/widgetsClient";

export type WidgetTemplateCategory = {
  id: string;
  name: string;
};

let cachedWidgetTemplateCategories: WidgetTemplateCategory[] | null = null;
let cachedWidgetTemplateCategoriesPromise: Promise<WidgetTemplateCategory[]> | null = null;

const isWidgetTemplateCategoryList = (
  value: unknown
): value is WidgetTemplateCategory[] => Array.isArray(value);

const readWidgetTemplateCategoriesCache = () =>
  readLocalCache(
    cacheKeys.widgetTemplateCategoriesList,
    cacheTtlMs.list,
    isWidgetTemplateCategoryList
  );

const primeWidgetTemplateCategoriesCacheInternal = (
  items: WidgetTemplateCategory[]
) => {
  cachedWidgetTemplateCategories = items;
  cachedWidgetTemplateCategoriesPromise = null;
  writeLocalCache(cacheKeys.widgetTemplateCategoriesList, items);
};

const upsertCachedWidgetTemplateCategory = (item: WidgetTemplateCategory) => {
  const current =
    cachedWidgetTemplateCategories ?? readWidgetTemplateCategoriesCache() ?? [];
  const index = current.findIndex((category) => category.id === item.id);
  const next = [...current];
  if (index === -1) {
    next.unshift(item);
  } else {
    next[index] = item;
  }
  primeWidgetTemplateCategoriesCacheInternal(next);
};

const removeCachedWidgetTemplateCategory = (id: string) => {
  const current = cachedWidgetTemplateCategories ?? readWidgetTemplateCategoriesCache();
  if (!current) return;
  primeWidgetTemplateCategoriesCacheInternal(
    current.filter((category) => category.id !== id)
  );
};

export const getCachedWidgetTemplateCategories = () => {
  if (cachedWidgetTemplateCategories) return cachedWidgetTemplateCategories;
  const cached = readWidgetTemplateCategoriesCache();
  if (cached) cachedWidgetTemplateCategories = cached;
  return cachedWidgetTemplateCategories;
};

export const clearWidgetTemplateCategoriesCache = () => {
  cachedWidgetTemplateCategories = null;
  cachedWidgetTemplateCategoriesPromise = null;
  clearLocalCache(cacheKeys.widgetTemplateCategoriesList);
};

const notifyWidgetCatalogUpdate = (action: "update" | "invalidate") => {
  clearWidgetCatalogCache();
  broadcastCacheEvent({ key: cacheKeys.widgetCatalogList, action });
};

export async function listWidgetTemplateCategories() {
  return apiRequest<{ items: WidgetTemplateCategory[] }>(
    "/widget-template-categories",
    { method: "GET" }
  );
}

export async function listWidgetTemplateCategoriesCached(options?: { force?: boolean }) {
  if (!options?.force) {
    const cached = getCachedWidgetTemplateCategories();
    if (cached) return cached;
    if (cachedWidgetTemplateCategoriesPromise) return cachedWidgetTemplateCategoriesPromise;
  }
  const request = listWidgetTemplateCategories().then((payload) => payload.items ?? []);
  cachedWidgetTemplateCategoriesPromise = request;
  const items = await request;
  primeWidgetTemplateCategoriesCacheInternal(items);
  return items;
}

export async function createWidgetTemplateCategory(payload: { name: string }) {
  const created = await apiRequest<WidgetTemplateCategory>(
    "/widget-template-categories",
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    },
    { withCsrf: true }
  );
  if (created) {
    upsertCachedWidgetTemplateCategory(created);
    broadcastCacheEvent({
      key: cacheKeys.widgetTemplateCategoriesList,
      action: "update",
    });
    notifyWidgetCatalogUpdate("update");
  }
  return created;
}

export async function updateWidgetTemplateCategory(
  id: string,
  payload: { name: string }
) {
  const updated = await apiRequest<WidgetTemplateCategory>(
    `/widget-template-categories/${encodeURIComponent(id)}`,
    {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    },
    { withCsrf: true }
  );
  if (updated) {
    upsertCachedWidgetTemplateCategory(updated);
    broadcastCacheEvent({
      key: cacheKeys.widgetTemplateCategoriesList,
      action: "update",
    });
    notifyWidgetCatalogUpdate("update");
  }
  return updated;
}

export async function deleteWidgetTemplateCategory(id: string) {
  const result = await apiRequest<{ ok: boolean }>(
    `/widget-template-categories/${encodeURIComponent(id)}`,
    { method: "DELETE" },
    { withCsrf: true }
  );
  if (result?.ok) {
    removeCachedWidgetTemplateCategory(id);
    broadcastCacheEvent({
      key: cacheKeys.widgetTemplateCategoriesList,
      action: "invalidate",
    });
    notifyWidgetCatalogUpdate("invalidate");
  }
  return result;
}
