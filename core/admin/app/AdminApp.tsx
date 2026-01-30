import { useCallback, useEffect, useMemo, useState } from "react";

import { me } from "@/services/authClient";
import { isApiClientError } from "@/services/apiClient";
import { getSettings, updateSettings } from "@/services/settingsClient";
import {
  listAdminThemeProfiles,
  listAdminThemeTemplates,
} from "@/services/adminThemeClient";
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
import { WidgetLibraryPage } from "@/ui/widgets/WidgetLibraryPage";
import { ApiKeysPage } from "@/ui/settings/ApiKeysPage";
import { EmailSettingsPage } from "@/ui/settings/EmailSettingsPage";
import { GeneralSettingsPage } from "@/ui/settings/GeneralSettingsPage";
import { IntegrationsPage } from "@/ui/settings/IntegrationsPage";
import { IpAllowlistPage } from "@/ui/settings/IpAllowlistPage";
import { LoginAlertsPage } from "@/ui/settings/LoginAlertsPage";
import { SecuritySettingsPage } from "@/ui/settings/SecuritySettingsPage";
import { SessionsPage } from "@/ui/settings/SessionsPage";
import { StorageSettingsPage } from "@/ui/settings/StorageSettingsPage";
import { WebhooksPage } from "@/ui/settings/WebhooksPage";
import { PluginDetailsPage } from "@/ui/store/PluginDetailsPage";
import { PluginStorePage } from "@/ui/store/PluginStorePage";
import { PagePreview } from "@/ui/pages/PagePreview";
import { toAdminThemeCssVariables } from "../../ui/theme/tokenCss";
import { DEFAULT_ADMIN_THEME_TOKENS } from "../../services/adminThemes/tokenTypes";
import { mergeAdminThemeTokens } from "../../services/adminThemes/tokenUtils";
import { assertAdminThemeTokens } from "../../services/adminThemes/tokenValidation";

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

type SettingsValues = {
  siteName: string;
  siteLocale: string;
};

const defaultSettingsValues: SettingsValues = {
  siteName: "Nextless",
  siteLocale: "en",
};

type SettingsState = {
  status: "idle" | "loading" | "ready" | "error";
  values: SettingsValues;
  error: string | null;
};

type RouteDefinition = {
  pattern: string;
  element: React.ReactNode;
};

const resolveRoute = (path: string, routes: RouteDefinition[]): RouteMatch => {
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

const resolveSettingsPayload = (
  payload: Record<string, unknown>,
  fallback: SettingsState
) => {
  const siteName =
    typeof payload["site.name"] === "string"
      ? payload["site.name"]
      : fallback.values.siteName;
  const siteLocale =
    typeof payload["site.locale"] === "string"
      ? payload["site.locale"]
      : fallback.values.siteLocale;
  return {
    values: { siteName, siteLocale },
  };
};

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

  const [settingsState, setSettingsState] = useState<SettingsState>({
    status: "idle",
    values: defaultSettingsValues,
    error: null,
  });
  const [settingsSaving, setSettingsSaving] = useState(false);
  const [adminThemeTokens, setAdminThemeTokens] = useState(() => {
    if (typeof window === "undefined") return DEFAULT_ADMIN_THEME_TOKENS;
    const cached = window.localStorage.getItem("nextless.adminThemeTokens");
    if (!cached) return DEFAULT_ADMIN_THEME_TOKENS;
    try {
      const parsed = JSON.parse(cached) as unknown;
      assertAdminThemeTokens(parsed);
      return parsed;
    } catch {
      return DEFAULT_ADMIN_THEME_TOKENS;
    }
  });
  const tokenCss = useMemo(
    () => toAdminThemeCssVariables(adminThemeTokens),
    [adminThemeTokens]
  );

  const match = useMemo(() => {
    const routes: RouteDefinition[] = [
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
      { pattern: "/admin/entries/:type/:id", element: <EntryEditor /> },
      { pattern: "/admin/pages", element: <PageListPage /> },
      { pattern: "/admin/pages/:id", element: <PageEditor /> },
      { pattern: "/admin/preview", element: <PagePreview /> },
      { pattern: "/admin/media", element: <MediaLibraryPage /> },
      { pattern: "/admin/menus", element: <MenuEditorPage /> },
      { pattern: "/admin/users", element: <UsersRolesPage /> },
      { pattern: "/admin/roles", element: <PermissionsMatrixPage /> },
      { pattern: "/admin/themes", element: <ThemesPage /> },
      { pattern: "/admin/widgets", element: <WidgetLibraryPage /> },
      {
        pattern: "/admin/settings",
        element: (
          <GeneralSettingsPage
            values={settingsState.values}
            isLoading={settingsState.status === "loading"}
            isSaving={settingsSaving}
            error={settingsState.error}
            onSave={async (values) => {
              setSettingsSaving(true);
              setSettingsState((prev) => ({ ...prev, error: null }));
              try {
                const updated = await updateSettings({
                  "site.name": values.siteName,
                  "site.locale": values.siteLocale,
                });
                setSettingsState((prev) => {
                  const resolved = resolveSettingsPayload(updated, prev);
                  return {
                    ...prev,
                    status: "ready",
                    ...resolved,
                  };
                });
              } catch (error) {
                const message = isApiClientError(error)
                  ? error.message
                  : "Failed to save general settings.";
                setSettingsState((prev) => ({
                  ...prev,
                  error: message,
                  status: "error",
                }));
                throw error;
              } finally {
                setSettingsSaving(false);
              }
            }}
          />
        ),
      },
      {
        pattern: "/admin/settings/general",
        element: (
          <GeneralSettingsPage
            values={settingsState.values}
            isLoading={settingsState.status === "loading"}
            isSaving={settingsSaving}
            error={settingsState.error}
            onSave={async (values) => {
              setSettingsSaving(true);
              setSettingsState((prev) => ({ ...prev, error: null }));
              try {
                const updated = await updateSettings({
                  "site.name": values.siteName,
                  "site.locale": values.siteLocale,
                });
                setSettingsState((prev) => {
                  const resolved = resolveSettingsPayload(updated, prev);
                  return {
                    ...prev,
                    status: "ready",
                    ...resolved,
                  };
                });
              } catch (error) {
                const message = isApiClientError(error)
                  ? error.message
                  : "Failed to save general settings.";
                setSettingsState((prev) => ({
                  ...prev,
                  error: message,
                  status: "error",
                }));
                throw error;
              } finally {
                setSettingsSaving(false);
              }
            }}
          />
        ),
      },
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

    return resolveRoute(normalizedPath, routes);
  }, [normalizedPath, settingsSaving, settingsState]);

  const refreshSettings = useCallback(() => {
    setSettingsState((prev) => ({
      ...prev,
      status: "loading",
      error: null,
    }));

    const fallbackState: SettingsState = {
      status: "idle",
      values: defaultSettingsValues,
      error: null,
    };

    getSettings()
      .then((payload) => {
        const resolved = resolveSettingsPayload(payload, fallbackState);
        setSettingsState((prev) => ({
          ...prev,
          status: "ready",
          ...resolved,
        }));
      })
      .catch((error) => {
        const message = isApiClientError(error)
          ? error.message
          : "Failed to load settings.";
        setSettingsState((prev) => ({
          ...prev,
          status: "error",
          error: message,
        }));
      });
  }, []);

  const refreshAdminTheme = useCallback(() => {
    const fallback = DEFAULT_ADMIN_THEME_TOKENS;
    Promise.all([listAdminThemeTemplates(), listAdminThemeProfiles()])
      .then(([templatesResult, profilesResult]) => {
        const templates = templatesResult.items;
        const profiles = profilesResult.items;
        const activeProfile =
          profiles.find((profile) => profile.isActive) ?? profiles[0] ?? null;
        const template = activeProfile
          ? templates.find((item) => item.id === activeProfile.templateId) ?? null
          : templates[0] ?? null;
        const resolved = mergeAdminThemeTokens(fallback, template?.tokens ?? null);
        setAdminThemeTokens(resolved);
        if (typeof window !== "undefined") {
          window.localStorage.setItem(
            "nextless.adminThemeTokens",
            JSON.stringify(resolved)
          );
        }
      })
      .catch(() => {
        setAdminThemeTokens(fallback);
      });
  }, []);

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
    if (authState !== "authenticated") return;
    refreshSettings();
  }, [authState, refreshSettings]);

  useEffect(() => {
    if (authState !== "authenticated") return;
    refreshAdminTheme();
  }, [authState, refreshAdminTheme]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (authState !== "authenticated") return;
    const handler = () => {
      refreshSettings();
      refreshAdminTheme();
    };
    window.addEventListener("theme:updated", handler);
    return () => window.removeEventListener("theme:updated", handler);
  }, [authState, refreshAdminTheme, refreshSettings]);

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
  }, [authState, isProtected, isPublic, normalizedPath]);

  if (isProtected && authState !== "authenticated") {
    return <Loading />;
  }

  return (
    <>
      <style id="nextless-theme-tokens">{tokenCss}</style>
      {match.element}
    </>
  );
}
