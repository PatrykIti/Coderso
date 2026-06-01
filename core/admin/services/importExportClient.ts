import { apiRequest } from "./apiClient";

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
  return apiRequest<ImportResult>(
    "/tools/import",
    {
      method: "POST",
      body: JSON.stringify(bundle),
      headers: { "Content-Type": "application/json" },
    },
    { withCsrf: true }
  );
}
