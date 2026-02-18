import { useCallback, useEffect, useMemo, useState } from "react";

import { me } from "@/services/authClient";
import { isApiClientError } from "@/services/apiClient";
import {
  getSettings,
  updateSettings,
  type GeneralSettingsPayload,
} from "@/services/settingsClient";
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
import { FormActionLogsPage } from "@/ui/forms/FormActionLogsPage";
import { FormListPage } from "@/ui/forms/FormListPage";
import { ImportExportPage } from "@/ui/import-export/ImportExportPage";
import { ListingEditorPage } from "@/ui/listings/ListingEditorPage";
import { ListingFiltersPage } from "@/ui/listings/ListingFiltersPage";
import { ListingListPage } from "@/ui/listings/ListingListPage";
import { ListingSearchPage } from "@/ui/listings/ListingSearchPage";
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
import { WidgetTemplateEditorPage } from "@/ui/widgets/WidgetTemplateEditorPage";
import { ApiKeysPage } from "@/ui/settings/ApiKeysPage";
import { AssistantSettingsPage } from "@/ui/settings/AssistantSettingsPage";
import { EmailSettingsPage } from "@/ui/settings/EmailSettingsPage";
import {
  ASSISTANT_SETTINGS_DEFAULT_VALUES,
  type AssistantSettingsValues,
} from "@/ui/settings/AssistantSettingsCard";
import {
  GeneralSettingsPage,
  type GeneralSettingsValues,
  GENERAL_SETTINGS_DEFAULT_VALUES,
} from "@/ui/settings/GeneralSettingsPage";
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
import { SiteSettingsPage } from "@/ui/site/SiteSettingsPage";
import { SetupWizard } from "@/ui/setup/SetupWizard";
import {
  toSetupWizardSettingsPayload,
  type SetupWizardValues,
} from "@/ui/setup/setupWizardValidation";
import { toAdminThemeCssVariables } from "../../ui/theme/tokenCss";
import { DEFAULT_ADMIN_THEME_TOKENS } from "../../services/adminThemes/tokenTypes";
import { mergeAdminThemeTokens } from "../../services/adminThemes/tokenUtils";
import { assertAdminThemeTokens } from "../../services/adminThemes/tokenValidation";
import {
  DEFAULT_ADMIN_PATH,
  resolveAdminRoutePath,
  resolveAdminBasePath,
  stripAdminBasePath,
  withAdminBasePath,
} from "@/utils/adminPaths";
import { AdminBasePathProvider } from "@/ui/contexts/AdminBasePathContext";
import { useOptionalAdminRouter } from "@/ui/contexts/AdminRouterContext";

const publicRoutes = new Set([
  "/login",
  "/2fa",
  "/reset",
  "/reset/confirm",
  "/preview",
]);

type RouteMatch = {
  element: React.ReactNode;
  params: Record<string, string>;
};

const normalizePath = (input: string) => {
  const withoutHash = input.split("#")[0] ?? input;
  const base = withoutHash.split("?")[0] ?? withoutHash;
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

type SettingsValues = GeneralSettingsValues & AssistantSettingsValues & {
  publicBaseUrl: string;
  authSessionTtlDays: number;
  authResetTtlMinutes: number;
  setupCompleted: boolean;
};

const defaultSettingsValues: SettingsValues = {
  ...GENERAL_SETTINGS_DEFAULT_VALUES,
  ...ASSISTANT_SETTINGS_DEFAULT_VALUES,
  publicBaseUrl: "",
  authSessionTtlDays: 14,
  authResetTtlMinutes: 60,
  setupCompleted: false,
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
  <div className="flex min-h-screen items-center justify-center bg-background text-sm text-muted-foreground">
    Loading...
  </div>
);

const CodersoPostsPlaceholder = () => (
  <div className="mx-auto flex max-w-3xl flex-col gap-3 rounded-xl border border-border bg-card p-8 text-card-foreground shadow-sm">
    <h1 className="text-xl font-semibold">Posts module is coming next</h1>
    <p className="text-sm text-muted-foreground">
      Use Pages and Entries for now. The dedicated Posts workflow lands in TASK-055.
    </p>
  </div>
);

export const shouldShowSetupWizard = (input: {
  isProtected: boolean;
  authState: "checking" | "authenticated" | "unauthenticated";
  settingsStatus: SettingsState["status"];
  setupCompleted: boolean;
}) =>
  input.isProtected &&
  input.authState === "authenticated" &&
  input.settingsStatus === "ready" &&
  !input.setupCompleted;

const resolveSettingsPayload = (
  payload: Record<string, unknown>,
  fallback: SettingsState
) => {
  const resolveBoolean = (value: unknown, fallbackValue: boolean) =>
    typeof value === "boolean" ? value : fallbackValue;
  const resolveString = (value: unknown, fallbackValue: string) =>
    typeof value === "string" ? value : fallbackValue;
  const resolvePositiveInteger = (value: unknown, fallbackValue: number) =>
    typeof value === "number" && Number.isFinite(value) && value > 0
      ? Math.floor(value)
      : fallbackValue;
  const resolveBoundedInteger = (
    value: unknown,
    fallbackValue: number,
    min: number,
    max: number
  ) => {
    if (typeof value !== "number" || !Number.isFinite(value)) return fallbackValue;
    const normalized = Math.floor(value);
    if (normalized < min || normalized > max) return fallbackValue;
    return normalized;
  };
  const resolveMode = (
    value: unknown,
    fallbackValue: SettingsValues["assistantDefaultMode"]
  ): SettingsValues["assistantDefaultMode"] =>
    value === "docs-only" || value === "llm-rag" ? value : fallbackValue;
  const resolveProvider = (
    value: unknown,
    fallbackValue: SettingsValues["assistantLlmProvider"]
  ): SettingsValues["assistantLlmProvider"] =>
    value === "openrouter" || value === "none" ? value : fallbackValue;
  const resolveDocsBackend = (
    value: unknown,
    fallbackValue: SettingsValues["assistantDocsBackend"]
  ): SettingsValues["assistantDocsBackend"] =>
    value === "filesystem" || value === "db" ? value : fallbackValue;
  const resolveDocsSourceRoot = (
    value: unknown,
    fallbackValue: SettingsValues["assistantDocsSourceRoot"]
  ) => {
    if (typeof value !== "string") return fallbackValue;
    const normalized = value.trim();
    return normalized.length > 0 ? normalized : fallbackValue;
  };
  const resolveDocsPaths = (
    value: unknown,
    fallbackValue: string[]
  ): string[] => {
    if (!Array.isArray(value)) return fallbackValue;
    return value
      .filter((entry): entry is string => typeof entry === "string")
      .map((entry) => entry.trim())
      .filter((entry) => entry.length > 0);
  };

  const siteName =
    typeof payload["site.name"] === "string"
      ? payload["site.name"]
      : fallback.values.siteName;
  const siteLocale =
    typeof payload["site.locale"] === "string"
      ? payload["site.locale"]
      : fallback.values.siteLocale;
  const publicBaseUrl =
    typeof payload["site.publicBaseUrl"] === "string"
      ? payload["site.publicBaseUrl"]
      : fallback.values.publicBaseUrl;
  return {
    values: {
      siteName,
      siteLocale,
      publicBaseUrl,
      authSessionTtlDays: resolveBoundedInteger(
        payload["auth.sessionTtlDays"],
        fallback.values.authSessionTtlDays,
        1,
        365
      ),
      authResetTtlMinutes: resolveBoundedInteger(
        payload["auth.resetTtlMinutes"],
        fallback.values.authResetTtlMinutes,
        5,
        1440
      ),
      setupCompleted: resolveBoolean(
        payload["setup.completed"],
        fallback.values.setupCompleted
      ),
      assistantEnabled: resolveBoolean(
        payload["assistant.enabled"],
        fallback.values.assistantEnabled
      ),
      assistantDefaultMode: resolveMode(
        payload["assistant.defaultMode"],
        fallback.values.assistantDefaultMode
      ),
      assistantDocsBackend: resolveDocsBackend(
        payload["assistant.docs.backend"],
        fallback.values.assistantDocsBackend
      ),
      assistantDocsSourceRoot: resolveDocsSourceRoot(
        payload["assistant.docs.sourceRoot"],
        fallback.values.assistantDocsSourceRoot
      ),
      assistantDocsPaths: resolveDocsPaths(
        payload["assistant.docs.paths"],
        fallback.values.assistantDocsPaths
      ),
      assistantDocsReindexOnBoot: resolveBoolean(
        payload["assistant.docs.reindexOnBoot"],
        fallback.values.assistantDocsReindexOnBoot
      ),
      assistantLlmEnabled: resolveBoolean(
        payload["assistant.llm.enabled"],
        fallback.values.assistantLlmEnabled
      ),
      assistantLlmProvider: resolveProvider(
        payload["assistant.llm.provider"],
        fallback.values.assistantLlmProvider
      ),
      assistantLlmModel: resolveString(
        payload["assistant.llm.model"],
        fallback.values.assistantLlmModel
      ),
      assistantLlmMaxInputTokens: resolvePositiveInteger(
        payload["assistant.llm.maxInputTokens"],
        fallback.values.assistantLlmMaxInputTokens
      ),
      assistantLlmMaxOutputTokens: resolvePositiveInteger(
        payload["assistant.llm.maxOutputTokens"],
        fallback.values.assistantLlmMaxOutputTokens
      ),
      assistantLlmTimeoutMs: resolvePositiveInteger(
        payload["assistant.llm.timeoutMs"],
        fallback.values.assistantLlmTimeoutMs
      ),
      assistantQuotaRequestsPerMinute: resolvePositiveInteger(
        payload["assistant.quotas.requestsPerMinute"],
        fallback.values.assistantQuotaRequestsPerMinute
      ),
      assistantQuotaRequestsPerDay: resolvePositiveInteger(
        payload["assistant.quotas.requestsPerDay"],
        fallback.values.assistantQuotaRequestsPerDay
      ),
    },
  };
};

const buildGeneralSettingsUpdate = (
  values: GeneralSettingsValues
): Partial<GeneralSettingsPayload> => ({
  "site.name": values.siteName,
  "site.locale": values.siteLocale,
});

const buildAssistantSettingsUpdate = (
  values: AssistantSettingsValues
): Partial<GeneralSettingsPayload> => ({
  "assistant.enabled": values.assistantEnabled,
  "assistant.defaultMode": values.assistantDefaultMode,
  "assistant.docs.backend": values.assistantDocsBackend,
  "assistant.docs.sourceRoot": values.assistantDocsSourceRoot.trim(),
  "assistant.docs.paths": values.assistantDocsPaths,
  "assistant.docs.reindexOnBoot": values.assistantDocsReindexOnBoot,
  "assistant.llm.enabled": values.assistantLlmEnabled,
  "assistant.llm.provider": values.assistantLlmProvider,
  "assistant.llm.model": values.assistantLlmModel,
  "assistant.llm.maxInputTokens": values.assistantLlmMaxInputTokens,
  "assistant.llm.maxOutputTokens": values.assistantLlmMaxOutputTokens,
  "assistant.llm.timeoutMs": values.assistantLlmTimeoutMs,
  "assistant.quotas.requestsPerMinute": values.assistantQuotaRequestsPerMinute,
  "assistant.quotas.requestsPerDay": values.assistantQuotaRequestsPerDay,
});

type AdminAppProps = {
  path?: string;
};

export function AdminApp({ path }: AdminAppProps) {
  const router = useOptionalAdminRouter();
  const resolvedPath =
    router?.path ??
    path ??
    (typeof window !== "undefined" ? window.location.pathname : DEFAULT_ADMIN_PATH);
  const normalizedPath = normalizePath(resolvedPath);
  const adminBasePath = resolveAdminBasePath(resolvedPath);
  const relativePath = stripAdminBasePath(normalizedPath, adminBasePath);
  const canonicalRelativePath = resolveAdminRoutePath(relativePath);
  const isAdminPath =
    normalizedPath === adminBasePath || normalizedPath.startsWith(`${adminBasePath}/`);
  const isPublic = publicRoutes.has(canonicalRelativePath);
  const isProtected = isAdminPath && !isPublic;

  const [authState, setAuthState] = useState<
    "checking" | "authenticated" | "unauthenticated"
  >(isProtected ? "checking" : "unauthenticated");

  const [settingsState, setSettingsState] = useState<SettingsState>({
    status: "idle",
    values: defaultSettingsValues,
    error: null,
  });
  const [settingsSaving, setSettingsSaving] = useState(false);
  const [setupSaving, setSetupSaving] = useState(false);
  const [setupError, setSetupError] = useState<string | null>(null);
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

  const saveGeneralSettings = useCallback(async (values: GeneralSettingsValues) => {
    setSettingsSaving(true);
    setSettingsState((prev) => ({ ...prev, error: null }));
    try {
      const updated = await updateSettings(buildGeneralSettingsUpdate(values));
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
  }, []);

  const saveAssistantSettings = useCallback(async (values: AssistantSettingsValues) => {
    setSettingsSaving(true);
    setSettingsState((prev) => ({ ...prev, error: null }));
    try {
      const updated = await updateSettings(buildAssistantSettingsUpdate(values));
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
        : "Failed to save assistant settings.";
      setSettingsState((prev) => ({
        ...prev,
        error: message,
        status: "error",
      }));
      throw error;
    } finally {
      setSettingsSaving(false);
    }
  }, []);

  const completeSetup = useCallback(async (values: SetupWizardValues) => {
    setSetupSaving(true);
    setSetupError(null);
    try {
      const updated = await updateSettings({
        ...toSetupWizardSettingsPayload(values),
        "setup.completed": true,
      });
      setSettingsState((prev) => {
        const resolved = resolveSettingsPayload(updated, prev);
        return {
          ...prev,
          status: "ready",
          error: null,
          ...resolved,
        };
      });
    } catch (error) {
      const message = isApiClientError(error)
        ? error.message
        : "Failed to complete setup wizard.";
      setSetupError(message);
      throw error;
    } finally {
      setSetupSaving(false);
    }
  }, []);

  const setupInitialValues = useMemo<SetupWizardValues>(
    () => ({
      siteName: settingsState.values.siteName,
      siteLocale: settingsState.values.siteLocale,
      publicBaseUrl: settingsState.values.publicBaseUrl,
      authSessionTtlDays: String(settingsState.values.authSessionTtlDays),
      authResetTtlMinutes: String(settingsState.values.authResetTtlMinutes),
    }),
    [settingsState.values]
  );

  const match = useMemo(() => {
    const routes: RouteDefinition[] = [
      { pattern: "/", element: <DashboardPage /> },
      { pattern: "/login", element: <LoginPage /> },
      { pattern: "/2fa", element: <TwoFactorPage /> },
      { pattern: "/reset", element: <ResetPasswordPage /> },
      { pattern: "/reset/confirm", element: <SetPasswordPage /> },
      { pattern: "/analytics", element: <AnalyticsPage /> },
      { pattern: "/audit", element: <AuditList /> },
      { pattern: "/access-logs", element: <AccessLogsPage /> },
      { pattern: "/backups", element: <BackupsPage /> },
      { pattern: "/search", element: <SearchPage /> },
      { pattern: "/seo", element: <SeoManagerPage /> },
      { pattern: "/redirects", element: <RedirectsPage /> },
      { pattern: "/tools/import-export", element: <ImportExportPage /> },
      { pattern: "/coderso/forms", element: <FormListPage /> },
      { pattern: "/coderso/forms/:id/action-runs", element: <FormActionLogsPage /> },
      { pattern: "/coderso/forms/:id", element: <FormBuilderPage /> },
      { pattern: "/coderso/engine", element: <ContentTypeList /> },
      { pattern: "/coderso/engine/:id", element: <ContentTypeEditor /> },
      { pattern: "/coderso/engine/:id/schema", element: <SchemaBuilderPage /> },
      { pattern: "/coderso/entries", element: <EntryList /> },
      { pattern: "/coderso/entries/:type/:id", element: <EntryEditor /> },
      { pattern: "/coderso/posts", element: <CodersoPostsPlaceholder /> },
      { pattern: "/coderso/listings", element: <ListingListPage /> },
      { pattern: "/coderso/listings/:id", element: <ListingEditorPage /> },
      { pattern: "/coderso/filters", element: <ListingFiltersPage /> },
      { pattern: "/coderso/search", element: <ListingSearchPage /> },
      { pattern: "/pages", element: <PageListPage /> },
      { pattern: "/pages/:id", element: <PageEditor /> },
      { pattern: "/preview", element: <PagePreview /> },
      { pattern: "/media", element: <MediaLibraryPage /> },
      { pattern: "/menus", element: <MenuEditorPage /> },
      { pattern: "/users", element: <UsersRolesPage /> },
      { pattern: "/roles", element: <PermissionsMatrixPage /> },
      { pattern: "/themes", element: <ThemesPage /> },
      { pattern: "/coderso/widgets", element: <WidgetLibraryPage /> },
      { pattern: "/coderso/widgets/templates/:id", element: <WidgetTemplateEditorPage /> },
      {
        pattern: "/settings",
        element: (
          <GeneralSettingsPage
            values={settingsState.values}
            isLoading={settingsState.status === "loading"}
            isSaving={settingsSaving}
            error={settingsState.error}
            onSave={saveGeneralSettings}
          />
        ),
      },
      {
        pattern: "/settings/general",
        element: (
          <GeneralSettingsPage
            values={settingsState.values}
            isLoading={settingsState.status === "loading"}
            isSaving={settingsSaving}
            error={settingsState.error}
            onSave={saveGeneralSettings}
          />
        ),
      },
      { pattern: "/settings/site", element: <SiteSettingsPage /> },
      {
        pattern: "/settings/assistant",
        element: (
          <AssistantSettingsPage
            values={settingsState.values}
            isLoading={settingsState.status === "loading"}
            isSaving={settingsSaving}
            error={settingsState.error}
            onSave={saveAssistantSettings}
          />
        ),
      },
      { pattern: "/settings/security", element: <SecuritySettingsPage /> },
      { pattern: "/settings/security/ip-allowlist", element: <IpAllowlistPage /> },
      { pattern: "/settings/security/sessions", element: <SessionsPage /> },
      { pattern: "/settings/security/login-alerts", element: <LoginAlertsPage /> },
      { pattern: "/settings/api-keys", element: <ApiKeysPage /> },
      { pattern: "/settings/webhooks", element: <WebhooksPage /> },
      { pattern: "/settings/email", element: <EmailSettingsPage /> },
      { pattern: "/settings/storage", element: <StorageSettingsPage /> },
      { pattern: "/settings/integrations", element: <IntegrationsPage /> },
      { pattern: "/store", element: <PluginStorePage /> },
      { pattern: "/store/plugins/:id", element: <PluginDetailsPage /> },
    ];

    return resolveRoute(canonicalRelativePath, routes);
  }, [
    canonicalRelativePath,
    saveAssistantSettings,
    saveGeneralSettings,
    settingsSaving,
    settingsState,
  ]);

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
  }, [canonicalRelativePath, isPublic, normalizedPath]);

  useEffect(() => {
    if (!isAdminPath) return;
    if (relativePath === canonicalRelativePath) return;
    const canonicalHref = withAdminBasePath(adminBasePath, canonicalRelativePath);
    if (router) {
      router.replace(canonicalHref);
      return;
    }
    if (typeof window === "undefined") return;
    window.history.replaceState({}, "", canonicalHref);
  }, [
    adminBasePath,
    canonicalRelativePath,
    isAdminPath,
    relativePath,
    router,
  ]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (authState === "unauthenticated" && isProtected) {
      window.location.assign(withAdminBasePath(adminBasePath, "/login"));
    }
    if (
      authState === "authenticated" &&
      isPublic &&
      canonicalRelativePath !== "/preview"
    ) {
      window.location.assign(withAdminBasePath(adminBasePath, "/"));
    }
  }, [
    adminBasePath,
    authState,
    canonicalRelativePath,
    isProtected,
    isPublic,
  ]);

  const showSetupWizard = shouldShowSetupWizard({
    isProtected,
    authState,
    settingsStatus: settingsState.status,
    setupCompleted: settingsState.values.setupCompleted,
  });

  if (isProtected && authState !== "authenticated") {
    return (
      <>
        <style id="nextless-theme-tokens">{tokenCss}</style>
        <Loading />
      </>
    );
  }

  if (showSetupWizard) {
    return (
      <AdminBasePathProvider value={adminBasePath}>
        <>
          <style id="nextless-theme-tokens">{tokenCss}</style>
          <SetupWizard
            initialValues={setupInitialValues}
            onSubmit={completeSetup}
            isSaving={setupSaving}
            error={setupError}
          />
        </>
      </AdminBasePathProvider>
    );
  }

  return (
    <AdminBasePathProvider value={adminBasePath}>
      <>
        <style id="nextless-theme-tokens">{tokenCss}</style>
        {match.element}
      </>
    </AdminBasePathProvider>
  );
}
