import type { AdminThemeTokens } from "../adminThemes/tokenTypes";
import type { DesignTokenOverrides } from "../theme/tokenTypes";

export type ExportBundle = {
  version: 1;
  exportedAt: string;
  scope?: ExportScope;
  settings: Record<string, unknown>;
  menus: ExportMenu[];
  themeProfiles: ExportThemeProfile[];
  adminThemes: ExportAdminThemes;
  redirects: ExportRedirect[];
};

export const exportTargets = ["full", "settings", "menus", "themes", "redirects"] as const;

export type ExportTarget = (typeof exportTargets)[number];

export const exportIncludeOptions = [
  "settings",
  "menus",
  "menu-items",
  "theme-profiles",
  "theme-routes",
  "admin-theme-templates",
  "admin-theme-profiles",
  "redirects",
] as const;

export type ExportIncludeOption = (typeof exportIncludeOptions)[number];

export type ExportRequest = {
  target?: ExportTarget;
  include?: ExportIncludeOption[];
};

export type ExportScope = {
  target: ExportTarget;
  include: ExportIncludeOption[];
};

export type ExportMenu = {
  id?: string;
  name: string;
  location: string | null;
  items: ExportMenuItem[];
};

export type ExportMenuItem = {
  id?: string;
  label: string;
  href?: string | null;
  pageId?: string | null;
  parentId?: string | null;
  orderIndex?: number;
};

export type ExportThemeProfile = {
  id?: string;
  name: string;
  description: string | null;
  themeName: string;
  tokens: DesignTokenOverrides;
  isActive: boolean;
  routes: ExportThemeRoute[];
};

export type ExportThemeRoute = {
  id?: string;
  path: string;
  pageId?: string | null;
};

export type ExportAdminThemes = {
  templates: ExportAdminThemeTemplate[];
  profiles: ExportAdminThemeProfile[];
};

export type ExportAdminThemeTemplate = {
  id?: string;
  name: string;
  description: string | null;
  tokens: AdminThemeTokens;
};

export type ExportAdminThemeProfile = {
  id?: string;
  name: string;
  description: string | null;
  templateId: string;
  isActive: boolean;
};

export type ExportRedirect = {
  id?: string;
  fromPath: string;
  toPath: string;
  statusCode: 301 | 302 | 307 | 308;
  enabled: boolean;
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
