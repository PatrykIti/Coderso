import { apiRequest } from "./apiClient";
import { broadcastCacheEvent } from "@/utils/cacheBus";
import { cacheKeys, cacheTtlMs } from "@/services/cachePolicy";
import { createMemoryBackedLocalCache } from "@/utils/storageCache";
import {
  clearAdminThemeProfilesCache,
  clearAdminThemeTemplatesCache,
} from "@/services/adminThemeClient";
import { clearMenusCache } from "@/services/menusClient";
import { clearRedirectsCache } from "@/services/redirectsClient";

export type ExportBundle = {
  version: number;
  exportedAt: string;
  scope?: ExportScope;
  settings: Record<string, unknown>;
  menus: Array<{
    id?: string;
    name: string;
    location: string | null;
    items: Array<{
      id?: string;
      label: string;
      href?: string | null;
      pageId?: string | null;
      parentId?: string | null;
      orderIndex?: number;
    }>;
  }>;
  themeProfiles: Array<{
    id?: string;
    name: string;
    description: string | null;
    themeName: string;
    tokens: Record<string, unknown>;
    isActive: boolean;
    routes: Array<{
      id?: string;
      path: string;
      pageId?: string | null;
    }>;
  }>;
  adminThemes: {
    templates: Array<{
      id?: string;
      name: string;
      description: string | null;
      tokens: Record<string, unknown>;
    }>;
    profiles: Array<{
      id?: string;
      name: string;
      description: string | null;
      templateId: string;
      isActive: boolean;
    }>;
  };
  redirects: Array<{
    id?: string;
    fromPath: string;
    toPath: string;
    statusCode: 301 | 302 | 307 | 308;
    enabled: boolean;
  }>;
};

export type ExportTarget = "full" | "settings" | "menus" | "themes" | "redirects";

export type ExportIncludeOption =
  | "settings"
  | "menus"
  | "menu-items"
  | "theme-profiles"
  | "theme-routes"
  | "admin-theme-templates"
  | "admin-theme-profiles"
  | "redirects";

export type ExportScope = {
  target: ExportTarget;
  include: ExportIncludeOption[];
};

export type ExportRequest = {
  target?: ExportTarget;
  include?: ExportIncludeOption[];
};

export type ImportSummary = {
  settings: number;
  menus: number;
  menuItems: number;
  themeProfiles: number;
  themeRoutes: number;
  adminThemeTemplates: number;
  adminThemeProfiles: number;
  redirects: number;
  warnings: string[];
};

export type ImportResult = {
  summary: ImportSummary;
};

export type ImportHistoryStatus =
  | "validating"
  | "preview-ready"
  | "applying"
  | "applied"
  | "failed";

export type ImportHistoryItem = {
  id: string;
  fileName: string;
  type: string;
  sizeBytes: number;
  status: ImportHistoryStatus;
  progress: number;
  createdAt: string;
  completedAt?: string | null;
  failureReason?: string | null;
  summary?: ImportSummary | null;
};

const importHistoryLimit = 20;

const isImportHistory = (value: unknown): value is ImportHistoryItem[] => Array.isArray(value);

const importHistoryCache = createMemoryBackedLocalCache({
  key: cacheKeys.importHistory,
  ttlMs: cacheTtlMs.list,
  validate: isImportHistory,
});

const primeImportHistoryCache = (items: ImportHistoryItem[]) => {
  importHistoryCache.write(items.slice(0, importHistoryLimit));
};

export const getCachedImportHistory = () => importHistoryCache.read();

export const listImportHistoryCached = () => getCachedImportHistory() ?? [];

export const writeImportHistoryCache = (items: ImportHistoryItem[]) => {
  primeImportHistoryCache(items);
  broadcastCacheEvent({ key: cacheKeys.importHistory, action: "update" });
};

export const upsertImportHistoryItem = (item: ImportHistoryItem) => {
  const current = getCachedImportHistory() ?? [];
  const index = current.findIndex((historyItem) => historyItem.id === item.id);
  const next = [...current];
  if (index === -1) next.unshift(item);
  else next[index] = item;
  writeImportHistoryCache(next);
};

export const patchImportHistoryItem = (
  id: string,
  patch: Partial<Omit<ImportHistoryItem, "id">>
) => {
  const current = getCachedImportHistory();
  if (!current) return null;
  const index = current.findIndex((item) => item.id === id);
  if (index === -1) return null;
  const next = [...current];
  const updated = { ...next[index], ...patch };
  next[index] = updated;
  writeImportHistoryCache(next);
  return updated;
};

export const clearImportHistoryCache = () => {
  importHistoryCache.clear();
  broadcastCacheEvent({ key: cacheKeys.importHistory, action: "invalidate" });
};

const targetIncludeOptions: Record<ExportTarget, ExportIncludeOption[]> = {
  full: [
    "settings",
    "menus",
    "menu-items",
    "theme-profiles",
    "theme-routes",
    "admin-theme-templates",
    "admin-theme-profiles",
    "redirects",
  ],
  settings: ["settings"],
  menus: ["menus", "menu-items"],
  themes: ["theme-profiles", "theme-routes", "admin-theme-templates", "admin-theme-profiles"],
  redirects: ["redirects"],
};

const resolveImportedIncludes = (bundle: ExportBundle) =>
  new Set(bundle.scope?.include ?? targetIncludeOptions[bundle.scope?.target ?? "full"]);

const invalidateImportedResourceCaches = (bundle: ExportBundle) => {
  const include = resolveImportedIncludes(bundle);
  if (include.has("menus") || include.has("menu-items")) {
    clearMenusCache();
    broadcastCacheEvent({ key: cacheKeys.menusList, action: "invalidate" });
  }
  if (include.has("admin-theme-templates")) {
    clearAdminThemeTemplatesCache();
    broadcastCacheEvent({ key: cacheKeys.adminThemeTemplatesList, action: "invalidate" });
  }
  if (include.has("admin-theme-profiles")) {
    clearAdminThemeProfilesCache();
    broadcastCacheEvent({ key: cacheKeys.adminThemeProfilesList, action: "invalidate" });
  }
  if (include.has("redirects")) {
    clearRedirectsCache();
    broadcastCacheEvent({ key: cacheKeys.redirectsList, action: "invalidate" });
  }
};

export async function exportConfig(request: ExportRequest = {}) {
  const params = new URLSearchParams();
  if (request.target) params.set("target", request.target);
  if (request.include && request.include.length > 0) {
    params.set("include", request.include.join(","));
  }
  const query = params.toString();
  return apiRequest<ExportBundle>(`/tools/export${query ? `?${query}` : ""}`, {
    method: "GET",
  });
}

export async function previewImport(bundle: ExportBundle) {
  return apiRequest<ImportResult>(
    "/tools/import/preview",
    {
      method: "POST",
      body: JSON.stringify(bundle),
      headers: { "Content-Type": "application/json" },
    },
    { withCsrf: true }
  );
}

export async function importConfig(bundle: ExportBundle) {
  const result = await apiRequest<ImportResult>(
    "/tools/import",
    {
      method: "POST",
      body: JSON.stringify(bundle),
      headers: { "Content-Type": "application/json" },
    },
    { withCsrf: true }
  );
  invalidateImportedResourceCaches(bundle);
  return result;
}
