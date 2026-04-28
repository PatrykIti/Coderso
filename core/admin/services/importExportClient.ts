import { apiRequest } from "./apiClient";

export type ExportBundle = {
  version: number;
  exportedAt: string;
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
    from: string;
    to: string;
    status: number;
  }>;
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

export async function exportConfig() {
  return apiRequest<ExportBundle>("/tools/export", { method: "GET" });
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
