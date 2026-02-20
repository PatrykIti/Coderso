import { apiRequest } from "./apiClient";
import { cacheKeys, cacheTtlMs } from "@/services/cachePolicy";
import { clearLocalCache, readLocalCache, writeLocalCache } from "@/utils/storageCache";

export type WidgetCatalogItem = {
  id: string;
  source: "core" | "template";
  name: string;
  description: string | null;
  category: string;
  variants: string[];
  complexity: "composite" | "atomic";
  audience: "beginner" | "intermediate" | "advanced";
  module: string;
  presets: Array<{ id: string; label: string; description?: string }>;
  requires: string[];
  status: "draft" | "published";
};

let cachedWidgetCatalog: WidgetCatalogItem[] | null = null;
let cachedWidgetCatalogPromise: Promise<WidgetCatalogItem[]> | null = null;

const isWidgetCatalogList = (value: unknown): value is WidgetCatalogItem[] =>
  Array.isArray(value);

const readWidgetCatalogCache = () =>
  readLocalCache(cacheKeys.widgetCatalogList, cacheTtlMs.list, isWidgetCatalogList);

const primeWidgetCatalogCacheInternal = (items: WidgetCatalogItem[]) => {
  cachedWidgetCatalog = items;
  cachedWidgetCatalogPromise = null;
  writeLocalCache(cacheKeys.widgetCatalogList, items);
};

export const getCachedWidgetCatalog = () => {
  if (cachedWidgetCatalog) return cachedWidgetCatalog;
  const cached = readWidgetCatalogCache();
  if (cached) cachedWidgetCatalog = cached;
  return cachedWidgetCatalog;
};

export const clearWidgetCatalogCache = () => {
  cachedWidgetCatalog = null;
  cachedWidgetCatalogPromise = null;
  clearLocalCache(cacheKeys.widgetCatalogList);
};

export async function listWidgetCatalog() {
  return apiRequest<{ items: WidgetCatalogItem[] }>("/widgets", {
    method: "GET",
  });
}

export async function listWidgetCatalogCached(options?: { force?: boolean }) {
  if (!options?.force) {
    const cached = getCachedWidgetCatalog();
    if (cached) return cached;
    if (cachedWidgetCatalogPromise) return cachedWidgetCatalogPromise;
  }
  const request = listWidgetCatalog().then((payload) => payload.items ?? []);
  cachedWidgetCatalogPromise = request;
  const items = await request;
  primeWidgetCatalogCacheInternal(items);
  return items;
}
