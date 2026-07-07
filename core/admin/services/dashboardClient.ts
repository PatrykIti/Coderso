import { apiRequest } from "./apiClient";
import { cacheKeys, cacheTtlMs } from "@/services/cachePolicy";
import { broadcastCacheEvent, subscribeCacheEvents, type CacheEvent } from "@/utils/cacheBus";
import { createMemoryBackedLocalCache } from "@/utils/storageCache";
import type {
  DashboardLayout,
  DashboardPayload,
  DashboardWidget,
} from "../../services/dashboard/dashboardTypes";
import type {
  DashboardWidgetDataRequest,
  DashboardWidgetDataResponse,
} from "../../services/dashboard/dashboardWidgetData";

export async function getDashboardData() {
  return apiRequest<DashboardPayload>("/dashboard", {
    method: "GET",
  });
}

export type DashboardLayoutResponse = {
  layout: DashboardLayout;
  updatedAt: string | null;
};

const isRecord = (value: unknown): value is Record<string, unknown> =>
  Boolean(value && typeof value === "object" && !Array.isArray(value));

const isDashboardLayout = (value: unknown): value is DashboardLayout =>
  isRecord(value) &&
  value.version === 1 &&
  Array.isArray(value.widgets) &&
  value.widgets.every(
    (widget) =>
      isRecord(widget) &&
      typeof widget.id === "string" &&
      typeof widget.type === "string" &&
      isRecord(widget.config) &&
      isRecord(widget.position)
  );

const isDashboardLayoutResponse = (value: unknown): value is DashboardLayoutResponse =>
  isRecord(value) &&
  isDashboardLayout(value.layout) &&
  (value.updatedAt === null || typeof value.updatedAt === "string");

const isWidgetDataResponse = (value: unknown): value is DashboardWidgetDataResponse =>
  isRecord(value) &&
  typeof value.generatedAt === "string" &&
  Array.isArray(value.widgets) &&
  value.widgets.every(
    (entry) =>
      isRecord(entry) &&
      typeof entry.id === "string" &&
      typeof entry.type === "string" &&
      isRecord(entry.data)
  );

const layoutCache = createMemoryBackedLocalCache<DashboardLayoutResponse>({
  key: cacheKeys.dashboardLayout,
  ttlMs: cacheTtlMs.detail,
  validate: isDashboardLayoutResponse,
});

const widgetDataCache = createMemoryBackedLocalCache<DashboardWidgetDataResponse>({
  key: cacheKeys.dashboardWidgetData,
  ttlMs: cacheTtlMs.detail,
  validate: isWidgetDataResponse,
});

let layoutPromise: Promise<DashboardLayoutResponse> | null = null;
let widgetDataPromise: Promise<DashboardWidgetDataResponse> | null = null;

export const getCachedDashboardLayout = () => layoutCache.read();

export const getCachedDashboardWidgetData = () => widgetDataCache.read();

export async function getDashboardLayout() {
  return apiRequest<DashboardLayoutResponse>("/dashboard/layout", {
    method: "GET",
  });
}

export async function getDashboardLayoutCached(options?: { force?: boolean }) {
  if (!options?.force) {
    const cached = layoutCache.read();
    if (cached) return cached;
    if (layoutPromise) return layoutPromise;
  }
  const request = getDashboardLayout();
  layoutPromise = request;
  try {
    const response = await request;
    layoutCache.write(response);
    return response;
  } finally {
    if (layoutPromise === request) layoutPromise = null;
  }
}

export async function saveDashboardLayout(layout: DashboardLayout) {
  const response = await apiRequest<DashboardLayoutResponse>(
    "/dashboard/layout",
    {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(layout),
    },
    { withCsrf: true }
  );
  layoutCache.write(response);
  widgetDataCache.clear();
  broadcastCacheEvent({ key: cacheKeys.dashboardLayout, action: "update" });
  broadcastCacheEvent({ key: cacheKeys.dashboardWidgetData, action: "invalidate" });
  return response;
}

export async function resetDashboardLayout() {
  const response = await apiRequest<DashboardLayoutResponse>(
    "/dashboard/layout/reset",
    {
      method: "POST",
    },
    { withCsrf: true }
  );
  layoutCache.write(response);
  widgetDataCache.clear();
  broadcastCacheEvent({ key: cacheKeys.dashboardLayout, action: "update" });
  broadcastCacheEvent({ key: cacheKeys.dashboardWidgetData, action: "invalidate" });
  return response;
}

export async function getDashboardWidgetData() {
  return apiRequest<DashboardWidgetDataResponse>("/dashboard/widget-data", {
    method: "GET",
  });
}

export async function getDashboardWidgetDataCached(options?: { force?: boolean }) {
  if (!options?.force) {
    const cached = widgetDataCache.read();
    if (cached) return cached;
    if (widgetDataPromise) return widgetDataPromise;
  }
  const request = getDashboardWidgetData();
  widgetDataPromise = request;
  try {
    const response = await request;
    widgetDataCache.write(response);
    return response;
  } finally {
    if (widgetDataPromise === request) widgetDataPromise = null;
  }
}

export async function resolveDashboardWidgetData(widgets: DashboardWidgetDataRequest["widgets"]) {
  return apiRequest<DashboardWidgetDataResponse>(
    "/dashboard/widget-data",
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ widgets }),
    },
    { withCsrf: true }
  );
}

export const previewDashboardWidgetData = (widgets: DashboardWidget[]) =>
  resolveDashboardWidgetData(
    widgets.map((widget) => ({
      id: widget.id,
      type: widget.type,
      title: widget.title,
      config: widget.config,
    }))
  );

export const clearDashboardCaches = () => {
  layoutCache.clear();
  widgetDataCache.clear();
};

export const subscribeDashboardCache = (handler: (event: CacheEvent) => void) =>
  subscribeCacheEvents((event) => {
    if (event.key === cacheKeys.dashboardLayout || event.key === cacheKeys.dashboardWidgetData) {
      handler(event);
    }
  });
