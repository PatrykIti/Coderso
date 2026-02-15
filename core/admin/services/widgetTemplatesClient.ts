import { apiRequest } from "./apiClient";
import { broadcastCacheEvent } from "@/utils/cacheBus";
import { cacheKeys, cacheTtlMs } from "@/services/cachePolicy";
import { clearLocalCache, readLocalCache, writeLocalCache } from "@/utils/storageCache";
import type { WidgetTemplateSettings } from "../../services/widgets/widgetTemplateSettings";

export type WidgetTemplateStatus = "draft" | "published";
export type WidgetTemplateCategory = string;

export type WidgetTemplate = {
  id: string;
  name: string;
  description: string | null;
  category: WidgetTemplateCategory;
  status: WidgetTemplateStatus;
  blocks: Array<Record<string, unknown>>;
  settings: WidgetTemplateSettings;
  createdAt: string;
  updatedAt: string;
};

export type WidgetTemplateCreate = {
  name: string;
  description?: string | null;
  category: WidgetTemplateCategory;
  status?: WidgetTemplateStatus;
  blocks?: Array<Record<string, unknown>>;
  settings?: WidgetTemplateSettings;
};

export type WidgetTemplateUpdate = {
  name?: string;
  description?: string | null;
  category?: WidgetTemplateCategory;
  status?: WidgetTemplateStatus;
  blocks?: Array<Record<string, unknown>>;
  settings?: WidgetTemplateSettings;
};

let cachedWidgetTemplates: WidgetTemplate[] | null = null;
let cachedWidgetTemplatesPromise: Promise<WidgetTemplate[]> | null = null;
const cachedWidgetTemplateDetails = new Map<string, WidgetTemplate>();

const isWidgetTemplateList = (value: unknown): value is WidgetTemplate[] =>
  Array.isArray(value);

const isWidgetTemplate = (value: unknown): value is WidgetTemplate =>
  Boolean(value && typeof value === "object");

const readWidgetTemplatesCache = () =>
  readLocalCache(cacheKeys.widgetTemplatesList, cacheTtlMs.list, isWidgetTemplateList);

const readWidgetTemplateDetailCache = (id: string) =>
  readLocalCache(cacheKeys.widgetTemplateDetail(id), cacheTtlMs.detail, isWidgetTemplate);

const writeWidgetTemplateDetailCache = (item: WidgetTemplate) => {
  writeLocalCache(cacheKeys.widgetTemplateDetail(item.id), item);
};

const primeWidgetTemplatesCacheInternal = (items: WidgetTemplate[]) => {
  cachedWidgetTemplates = items;
  cachedWidgetTemplatesPromise = null;
  writeLocalCache(cacheKeys.widgetTemplatesList, items);
};

const upsertCachedWidgetTemplate = (item: WidgetTemplate) => {
  const current = cachedWidgetTemplates ?? readWidgetTemplatesCache() ?? [];
  const index = current.findIndex((template) => template.id === item.id);
  const next = [...current];
  if (index === -1) {
    next.unshift(item);
  } else {
    next[index] = item;
  }
  primeWidgetTemplatesCacheInternal(next);
  cachedWidgetTemplateDetails.set(item.id, item);
  writeWidgetTemplateDetailCache(item);
};

const removeCachedWidgetTemplate = (id: string) => {
  const current = cachedWidgetTemplates ?? readWidgetTemplatesCache();
  if (current) {
    primeWidgetTemplatesCacheInternal(
      current.filter((template) => template.id !== id)
    );
  }
  cachedWidgetTemplateDetails.delete(id);
  clearLocalCache(cacheKeys.widgetTemplateDetail(id));
};

export const getCachedWidgetTemplates = () => {
  if (cachedWidgetTemplates) return cachedWidgetTemplates;
  const cached = readWidgetTemplatesCache();
  if (cached) cachedWidgetTemplates = cached;
  return cachedWidgetTemplates;
};

export const getCachedWidgetTemplate = (id: string) => {
  const cached = cachedWidgetTemplateDetails.get(id);
  if (cached) return cached;
  const stored = readWidgetTemplateDetailCache(id);
  if (stored) {
    cachedWidgetTemplateDetails.set(id, stored);
    return stored;
  }
  return null;
};

export const clearWidgetTemplatesCache = () => {
  cachedWidgetTemplates = null;
  cachedWidgetTemplatesPromise = null;
  cachedWidgetTemplateDetails.clear();
  clearLocalCache(cacheKeys.widgetTemplatesList);
};

export async function listWidgetTemplates() {
  return apiRequest<{ items: WidgetTemplate[] }>("/widget-templates", {
    method: "GET",
  });
}

export async function listWidgetTemplatesCached(options?: { force?: boolean }) {
  if (!options?.force) {
    const cached = getCachedWidgetTemplates();
    if (cached) return cached;
    if (cachedWidgetTemplatesPromise) return cachedWidgetTemplatesPromise;
  }
  const request = listWidgetTemplates().then((payload) => payload.items ?? []);
  cachedWidgetTemplatesPromise = request;
  const items = await request;
  primeWidgetTemplatesCacheInternal(items);
  return items;
}

export async function getWidgetTemplate(id: string) {
  return apiRequest<WidgetTemplate>(
    `/widget-templates/${encodeURIComponent(id)}`,
    { method: "GET" }
  );
}

export async function getWidgetTemplateCached(
  id: string,
  options?: { force?: boolean }
) {
  if (!options?.force) {
    const cachedDetail = getCachedWidgetTemplate(id);
    if (cachedDetail) return cachedDetail;
  }
  const result = await getWidgetTemplate(id);
  if (result) upsertCachedWidgetTemplate(result);
  return result;
}

export async function createWidgetTemplate(payload: WidgetTemplateCreate) {
  const created = await apiRequest<WidgetTemplate>(
    "/widget-templates",
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    },
    { withCsrf: true }
  );
  if (created) {
    upsertCachedWidgetTemplate(created);
    broadcastCacheEvent({ key: cacheKeys.widgetTemplatesList, action: "update" });
    broadcastCacheEvent({
      key: cacheKeys.widgetTemplateDetail(created.id),
      action: "update",
    });
  }
  return created;
}

export async function updateWidgetTemplate(
  id: string,
  payload: WidgetTemplateUpdate
) {
  const updated = await apiRequest<WidgetTemplate>(
    `/widget-templates/${encodeURIComponent(id)}`,
    {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    },
    { withCsrf: true }
  );
  if (updated) {
    upsertCachedWidgetTemplate(updated);
    broadcastCacheEvent({ key: cacheKeys.widgetTemplatesList, action: "update" });
    broadcastCacheEvent({
      key: cacheKeys.widgetTemplateDetail(updated.id),
      action: "update",
    });
  }
  return updated;
}

export async function deleteWidgetTemplate(id: string) {
  const result = await apiRequest<{ ok: boolean }>(
    `/widget-templates/${encodeURIComponent(id)}`,
    { method: "DELETE" },
    { withCsrf: true }
  );
  if (result?.ok) {
    removeCachedWidgetTemplate(id);
    broadcastCacheEvent({ key: cacheKeys.widgetTemplatesList, action: "invalidate" });
    broadcastCacheEvent({
      key: cacheKeys.widgetTemplateDetail(id),
      action: "invalidate",
    });
  }
  return result;
}
