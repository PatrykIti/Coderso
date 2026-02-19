import { apiRequest } from "./apiClient";
import { broadcastCacheEvent } from "@/utils/cacheBus";
import { cacheKeys, cacheTtlMs } from "@/services/cachePolicy";
import { clearLocalCache, readLocalCache, writeLocalCache } from "@/utils/storageCache";

export type PopupStatus = "draft" | "published" | "archived";

export type PopupTrigger =
  | { type: "time_delay"; delaySeconds: number }
  | { type: "scroll_depth"; percent: number }
  | { type: "exit_intent" }
  | { type: "cta_click"; selector: string };

export type PopupTargeting = {
  includePaths: string[];
  excludePaths: string[];
  audience: "all" | "logged_in" | "logged_out";
};

export type PopupFrequency = {
  strategy: "always" | "session_once" | "daily_once";
  cooldownMinutes: number | null;
};

export type PopupContent = {
  title: string | null;
  body: string | null;
  templateId: string | null;
  ctaLabel: string | null;
  ctaHref: string | null;
};

export type PopupSettings = {
  placement: "center" | "bottom_right" | "top_banner";
  dismissible: boolean;
  showOverlay: boolean;
};

export type PopupRecord = {
  id: string;
  name: string;
  slug: string;
  status: PopupStatus;
  trigger: PopupTrigger;
  targeting: PopupTargeting;
  frequency: PopupFrequency;
  content: PopupContent;
  settings: PopupSettings;
  createdAt: string;
  updatedAt: string;
  publishedAt: string | null;
};

export type PopupCreateInput = {
  name: string;
  slug?: string | null;
  status?: PopupStatus;
  trigger: PopupTrigger;
  targeting: PopupTargeting;
  frequency: PopupFrequency;
  content: PopupContent;
  settings: PopupSettings;
};

export type PopupUpdateInput = Partial<PopupCreateInput>;

export type PopupListParams = {
  status?: PopupStatus;
  search?: string;
  limit?: number;
  offset?: number;
};

const popupStatuses: PopupStatus[] = ["draft", "published", "archived"];

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const isPopupStatus = (value: unknown): value is PopupStatus =>
  typeof value === "string" && popupStatuses.includes(value as PopupStatus);

const isPopupRecord = (value: unknown): value is PopupRecord =>
  isRecord(value) &&
  typeof value.id === "string" &&
  typeof value.name === "string" &&
  typeof value.slug === "string" &&
  isPopupStatus(value.status) &&
  typeof value.createdAt === "string" &&
  typeof value.updatedAt === "string";

const isPopupList = (value: unknown): value is PopupRecord[] =>
  Array.isArray(value) && value.every(isPopupRecord);

let cachedPopups: PopupRecord[] | null = null;
let cachedPopupsPromise: Promise<PopupRecord[]> | null = null;

const readPopupsCache = () =>
  readLocalCache(cacheKeys.popupsList, cacheTtlMs.list, isPopupList);

const readPopupDetailCache = (id: string) =>
  readLocalCache(cacheKeys.popupDetail(id), cacheTtlMs.detail, isPopupRecord);

const primePopupsCacheInternal = (items: PopupRecord[]) => {
  cachedPopups = items;
  cachedPopupsPromise = null;
  writeLocalCache(cacheKeys.popupsList, items);
};

const writePopupDetailCache = (item: PopupRecord) => {
  writeLocalCache(cacheKeys.popupDetail(item.id), item);
};

const upsertCachedPopup = (item: PopupRecord) => {
  const current = cachedPopups ?? readPopupsCache() ?? [];
  const index = current.findIndex((entry) => entry.id === item.id);
  const next = [...current];
  if (index === -1) {
    next.unshift(item);
  } else {
    next[index] = { ...next[index], ...item };
  }
  next.sort((left, right) => right.updatedAt.localeCompare(left.updatedAt));
  primePopupsCacheInternal(next);
  writePopupDetailCache(item);
};

const removeCachedPopup = (id: string) => {
  const current = cachedPopups ?? readPopupsCache();
  if (current) primePopupsCacheInternal(current.filter((entry) => entry.id !== id));
  clearLocalCache(cacheKeys.popupDetail(id));
};

const toQueryString = (params?: PopupListParams) => {
  if (!params) return "";
  const query = new URLSearchParams();
  if (params.status) query.set("status", params.status);
  if (typeof params.search === "string" && params.search.trim().length > 0) {
    query.set("search", params.search.trim());
  }
  if (typeof params.limit === "number" && Number.isFinite(params.limit) && params.limit > 0) {
    query.set("limit", String(Math.floor(params.limit)));
  }
  if (typeof params.offset === "number" && Number.isFinite(params.offset) && params.offset >= 0) {
    query.set("offset", String(Math.floor(params.offset)));
  }
  const serialized = query.toString();
  return serialized ? `?${serialized}` : "";
};

export const getCachedPopups = () => {
  if (cachedPopups) return cachedPopups;
  const cached = readPopupsCache();
  if (cached) cachedPopups = cached;
  return cachedPopups;
};

export const getCachedPopup = (id: string) => {
  const fromMemory = cachedPopups?.find((entry) => entry.id === id);
  if (fromMemory) return fromMemory;
  return readPopupDetailCache(id);
};

export const clearPopupsCache = () => {
  cachedPopups = null;
  cachedPopupsPromise = null;
  clearLocalCache(cacheKeys.popupsList);
};

export async function listPopups(params?: PopupListParams) {
  const route = `/popups${toQueryString(params)}`;
  const payload = await apiRequest<{ items: PopupRecord[] }>(route, {
    method: "GET",
  });
  return payload.items ?? [];
}

export async function listPopupsCached(options?: { force?: boolean }) {
  if (!options?.force) {
    const cached = getCachedPopups();
    if (cached) return cached;
    if (cachedPopupsPromise) return cachedPopupsPromise;
  }
  const request = listPopups();
  cachedPopupsPromise = request;
  const items = await request;
  primePopupsCacheInternal(items);
  items.forEach(writePopupDetailCache);
  return items;
}

export async function getPopup(id: string) {
  return apiRequest<PopupRecord>(`/popups/${id}`, { method: "GET" });
}

export async function getPopupCached(id: string, options?: { force?: boolean }) {
  if (!options?.force) {
    const cached = getCachedPopup(id);
    if (cached) return cached;
  }
  try {
    const item = await getPopup(id);
    if (item) upsertCachedPopup(item);
    return item;
  } catch {
    const list = await listPopupsCached({ force: true });
    const item = list.find((entry) => entry.id === id) ?? null;
    if (item) writePopupDetailCache(item);
    return item;
  }
}

export async function createPopup(input: PopupCreateInput) {
  const created = await apiRequest<PopupRecord>(
    "/popups",
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input),
    },
    { withCsrf: true }
  );
  upsertCachedPopup(created);
  broadcastCacheEvent({ key: cacheKeys.popupsList, action: "update" });
  broadcastCacheEvent({ key: cacheKeys.popupDetail(created.id), action: "update" });
  return created;
}

export async function updatePopup(id: string, input: PopupUpdateInput) {
  const updated = await apiRequest<PopupRecord>(
    `/popups/${id}`,
    {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input),
    },
    { withCsrf: true }
  );
  upsertCachedPopup(updated);
  broadcastCacheEvent({ key: cacheKeys.popupsList, action: "update" });
  broadcastCacheEvent({ key: cacheKeys.popupDetail(updated.id), action: "update" });
  return updated;
}

export async function updatePopupStatus(id: string, status: PopupStatus) {
  const updated = await apiRequest<PopupRecord>(
    `/popups/${id}/status`,
    {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    },
    { withCsrf: true }
  );
  upsertCachedPopup(updated);
  broadcastCacheEvent({ key: cacheKeys.popupsList, action: "update" });
  broadcastCacheEvent({ key: cacheKeys.popupDetail(updated.id), action: "update" });
  return updated;
}

export async function deletePopup(id: string) {
  const result = await apiRequest<{ ok: boolean }>(
    `/popups/${id}`,
    { method: "DELETE" },
    { withCsrf: true }
  );
  if (result?.ok) {
    removeCachedPopup(id);
    broadcastCacheEvent({ key: cacheKeys.popupsList, action: "invalidate" });
    broadcastCacheEvent({ key: cacheKeys.popupDetail(id), action: "invalidate" });
  }
  return result;
}
