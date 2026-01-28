import { useEffect, useMemo, useState } from "react";

import { me } from "@/services/authClient";
import { DashboardPage } from "@/ui/dashboard/DashboardPage";
import { AnalyticsPage } from "@/ui/analytics/AnalyticsPage";
import { AuditList } from "@/ui/audit/AuditList";
import { LoginPage } from "@/ui/auth/LoginPage";
import { TwoFactorPage } from "@/ui/auth/TwoFactorPage";
import { ResetPasswordPage } from "@/ui/auth/ResetPasswordPage";
import { SetPasswordPage } from "@/ui/auth/SetPasswordPage";
import { BackupsPage } from "@/ui/backups/BackupsPage";
import { ContentTypeEditor } from "@/ui/content-types/ContentTypeEditor";
import { ContentTypeList } from "@/ui/content-types/ContentTypeList";
import { SchemaBuilderPage } from "@/ui/content-types/SchemaBuilderPage";
import { EntryEditor } from "@/ui/entries/EntryEditor";
import { EntryList } from "@/ui/entries/EntryList";
import { FormBuilderPage } from "@/ui/forms/FormBuilderPage";
import { ImportExportPage } from "@/ui/import-export/ImportExportPage";
import { PageListPage } from "@/ui/pages/PageListPage";
import { PageEditor } from "@/ui/pages/PageEditor";
import { MediaLibraryPage } from "@/ui/media/MediaLibraryPage";
import { MenuEditorPage } from "@/ui/menus/MenuEditorPage";
import { PermissionsMatrixPage } from "@/ui/roles/PermissionsMatrixPage";
import { RedirectsPage } from "@/ui/redirects/RedirectsPage";
import { SearchPage } from "@/ui/search/SearchPage";
import { AccessLogsPage } from "@/ui/security/AccessLogsPage";
import { SeoManagerPage } from "@/ui/seo/SeoManagerPage";
import { UsersRolesPage } from "@/ui/users/UsersRolesPage";
import { ThemesPage } from "@/ui/themes/ThemesPage";
import { ThemeEditorPage } from "@/ui/themes/ThemeEditorPage";
import { WidgetLibraryPage } from "@/ui/widgets/WidgetLibraryPage";
import { ApiKeysPage } from "@/ui/settings/ApiKeysPage";
import { EmailSettingsPage } from "@/ui/settings/EmailSettingsPage";
import { GeneralSettingsPage } from "@/ui/settings/GeneralSettingsPage";
import { IntegrationsPage } from "@/ui/settings/IntegrationsPage";
import { IpAllowlistPage } from "@/ui/settings/IpAllowlistPage";
import { LoginAlertsPage } from "@/ui/settings/LoginAlertsPage";
import { SecuritySettingsPage } from "@/ui/settings/SecuritySettingsPage";
import { SessionsPage } from "@/ui/settings/SessionsPage";
import { SettingsPage } from "@/ui/settings/SettingsPage";
import type { TokenOverrides } from "@/ui/settings/DesignTokensEditor";
import { StorageSettingsPage } from "@/ui/settings/StorageSettingsPage";
import { WebhooksPage } from "@/ui/settings/WebhooksPage";
import { PluginDetailsPage } from "@/ui/store/PluginDetailsPage";
import { PluginStorePage } from "@/ui/store/PluginStorePage";
import { PagePreview } from "@/ui/pages/PagePreview";

const publicRoutes = new Set([
  "/admin/login",
  "/admin/2fa",
  "/admin/reset",
  "/admin/reset/confirm",
  "/admin/preview",
]);

type RouteMatch = {
  element: React.ReactNode;
  params: Record<string, string>;
};

const normalizePath = (input: string) => {
  const base = input.split("?")[0] ?? input;
  if (base.length > 1 && base.endsWith("/")) return base.slice(0, -1);
  return base;
};

const matchRoute = (pattern: string, path: string) => {
  const patternParts = normalizePath(pattern).split("/").filter(Boolean);
  const pathParts = normalizePath(path).split("/").filter(Boolean);
  if (patternParts.length !== pathParts.length) return null;
  const params: Record<string, string> = {};
  for (let index = 0; index < patternParts.length; index += 1) {
    const part = patternParts[index];
    const value = pathParts[index];
    if (part?.startsWith(":")) {
      params[part.slice(1)] = decodeURIComponent(value ?? "");
      continue;
    }
    if (part !== value) return null;
  }
  return params;
};

const defaultSettingsValues = { siteName: "Nextless", siteLocale: "pl-PL" };
const defaultTokenOverrides: TokenOverrides = {};

const routes = [
  { pattern: "/admin", element: <DashboardPage /> },
  { pattern: "/admin/login", element: <LoginPage /> },
  { pattern: "/admin/2fa", element: <TwoFactorPage /> },
  { pattern: "/admin/reset", element: <ResetPasswordPage /> },
  { pattern: "/admin/reset/confirm", element: <SetPasswordPage /> },
  { pattern: "/admin/analytics", element: <AnalyticsPage /> },
  { pattern: "/admin/audit", element: <AuditList /> },
  { pattern: "/admin/access-logs", element: <AccessLogsPage /> },
  { pattern: "/admin/backups", element: <BackupsPage /> },
  { pattern: "/admin/search", element: <SearchPage /> },
  { pattern: "/admin/seo", element: <SeoManagerPage /> },
  { pattern: "/admin/redirects", element: <RedirectsPage /> },
  { pattern: "/admin/tools/import-export", element: <ImportExportPage /> },
  { pattern: "/admin/forms", element: <FormBuilderPage /> },
  { pattern: "/admin/content-types", element: <ContentTypeList /> },
  { pattern: "/admin/content-types/:id", element: <ContentTypeEditor /> },
  { pattern: "/admin/content-types/:id/schema", element: <SchemaBuilderPage /> },
  { pattern: "/admin/entries", element: <EntryList /> },
  { pattern: "/admin/entries/:id", element: <EntryEditor /> },
  { pattern: "/admin/pages", element: <PageListPage /> },
  { pattern: "/admin/pages/:id", element: <PageEditor /> },
  { pattern: "/admin/preview", element: <PagePreview /> },
  { pattern: "/admin/media", element: <MediaLibraryPage /> },
  { pattern: "/admin/menus", element: <MenuEditorPage /> },
  { pattern: "/admin/users", element: <UsersRolesPage /> },
  { pattern: "/admin/roles", element: <PermissionsMatrixPage /> },
  { pattern: "/admin/themes", element: <ThemesPage /> },
  { pattern: "/admin/themes/:id", element: <ThemeEditorPage /> },
  { pattern: "/admin/widgets", element: <WidgetLibraryPage /> },
  {
    pattern: "/admin/settings",
    element: (
      <SettingsPage
        values={defaultSettingsValues}
        tokens={defaultTokenOverrides}
        onSave={() => undefined}
        onResetTokens={() => undefined}
      />
    ),
  },
  { pattern: "/admin/settings/general", element: <GeneralSettingsPage /> },
  { pattern: "/admin/settings/security", element: <SecuritySettingsPage /> },
  { pattern: "/admin/settings/security/ip-allowlist", element: <IpAllowlistPage /> },
  { pattern: "/admin/settings/security/sessions", element: <SessionsPage /> },
  { pattern: "/admin/settings/security/login-alerts", element: <LoginAlertsPage /> },
  { pattern: "/admin/settings/api-keys", element: <ApiKeysPage /> },
  { pattern: "/admin/settings/webhooks", element: <WebhooksPage /> },
  { pattern: "/admin/settings/email", element: <EmailSettingsPage /> },
  { pattern: "/admin/settings/storage", element: <StorageSettingsPage /> },
  { pattern: "/admin/settings/integrations", element: <IntegrationsPage /> },
  { pattern: "/admin/store", element: <PluginStorePage /> },
  { pattern: "/admin/store/plugins/:id", element: <PluginDetailsPage /> },
];

const resolveRoute = (path: string): RouteMatch => {
  for (const route of routes) {
    const params = matchRoute(route.pattern, path);
    if (params) return { element: route.element, params };
  }
  return { element: <NotFound />, params: {} };
};

const NotFound = () => (
  <div className="flex min-h-screen items-center justify-center text-sm text-muted-foreground">
    Page not found
  </div>
);

const Loading = () => (
  <div className="flex min-h-screen items-center justify-center text-sm text-muted-foreground">
    Loading...
  </div>
);

type AdminAppProps = {
  path: string;
};

export function AdminApp({ path }: AdminAppProps) {
  const normalizedPath = normalizePath(path);
  const isPublic = publicRoutes.has(normalizedPath);
  const isProtected = normalizedPath.startsWith("/admin") && !isPublic;

  const [authState, setAuthState] = useState<
    "checking" | "authenticated" | "unauthenticated"
  >(isProtected ? "checking" : "unauthenticated");

  const match = useMemo(() => resolveRoute(normalizedPath), [normalizedPath]);

  useEffect(() => {
    if (!isProtected) return;
    let active = true;
    me()
      .then(() => {
        if (active) setAuthState("authenticated");
      })
      .catch(() => {
        if (active) setAuthState("unauthenticated");
      });
    return () => {
      active = false;
    };
  }, [isProtected, normalizedPath]);

  useEffect(() => {
    if (!isPublic) return;
    let active = true;
    me()
      .then(() => {
        if (active) setAuthState("authenticated");
      })
      .catch(() => {
        if (active) setAuthState("unauthenticated");
      });
    return () => {
      active = false;
    };
  }, [isPublic, normalizedPath]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (authState === "unauthenticated" && isProtected) {
      window.location.assign("/admin/login");
    }
    if (authState === "authenticated" && isPublic && normalizedPath !== "/admin/preview") {
      window.location.assign("/admin/");
    }
  }, [authState, isProtected, isPublic]);

  if (isProtected && authState !== "authenticated") {
    return <Loading />;
  }

  return <>{match.element}</>;
}
