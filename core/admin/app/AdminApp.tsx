import { Suspense, useCallback, useEffect, useMemo, useState } from "react";

import { canAdmin, resolveAuthBootstrap, type AuthUser } from "@/services/authClient";
import { isApiClientError, subscribeAdminPermissionFailure } from "@/services/apiClient";
import {
  getCachedSettings,
  getSettingsCached,
  updateSettings,
  type GeneralSettingsPayload,
} from "@/services/settingsClient";
import { invalidateAssistantStatusCache } from "@/services/assistantStatusClient";
import {
  listAdminThemeProfilesCached,
  listAdminThemeTemplatesCached,
} from "@/services/adminThemeClient";
import { LoginPage } from "@/ui/auth/LoginPage";
import { TwoFactorPage } from "@/ui/auth/TwoFactorPage";
import { ResetPasswordPage } from "@/ui/auth/ResetPasswordPage";
import { SetPasswordPage } from "@/ui/auth/SetPasswordPage";
import {
  defaultSettingsValues,
  type AssistantSettingsValues,
  type GeneralSettingsValues,
  type SettingsValues,
} from "@/ui/settings/settingsValues";
import { PagePreview } from "@/ui/pages/PagePreview";
import { SetupWizard } from "@/ui/setup/SetupWizard";
import { Toaster } from "@/components/ui/sonner";
import {
  AccessLogsRoute,
  AnalyticsRoute,
  ApiKeysRoute,
  AssistantSettingsRoute,
  AuditRoute,
  BackupsRoute,
  BookingRoute,
  CollectionWorkspaceRoute,
  CommerceEditorRoute,
  CommerceListRoute,
  ContentTypeEditorRoute,
  ContentTypeListRoute,
  CustomScreenEditorRoute,
  CustomScreenEntriesRoute,
  CustomScreenEntryEditorRoute,
  CustomScreenListRoute,
  DashboardRoute,
  DetailTemplateEditorRoute,
  EmailSettingsRoute,
  EntryEditorRoute,
  EntryListRoute,
  FormActionLogsRoute,
  FormSubmissionsRoute,
  FormBuilderRoute,
  FormListRoute,
  GeneralSettingsRoute,
  ImportExportRoute,
  IntegrationsRoute,
  IpAllowlistRoute,
  ListingEditorRoute,
  ListingFiltersRoute,
  ListingListRoute,
  ListingSearchRoute,
  LoginAlertsRoute,
  MediaLibraryRoute,
  MenuEditorRoute,
  MenuListRoute,
  PageEditorRoute,
  PageListRoute,
  PermissionsMatrixRoute,
  PluginDetailsRoute,
  PluginStoreRoute,
  PopupEditorRoute,
  PopupsListRoute,
  PostEditorRoute,
  PostsListRoute,
  RedirectsRoute,
  ReviewsModerationRoute,
  SchemaBuilderRoute,
  SearchRoute,
  SecuritySettingsRoute,
  SeoRoute,
  SessionsRoute,
  SiteSettingsRoute,
  SolutionKitsRoute,
  StorageSettingsRoute,
  ThemesRoute,
  UsersRolesRoute,
  WebhooksRoute,
  WidgetLibraryRoute,
  PageTemplatesRoute,
  PageTemplateEditorRoute,
} from "@/app/adminRouteComponents";
import { AdminRouteErrorBoundary } from "@/app/AdminRouteErrorBoundary";
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
import { AdminAssistantConfigProvider } from "@/ui/contexts/AdminAssistantConfigContext";
import { AdminAuthProvider } from "@/ui/contexts/AdminAuthContext";
import { useOptionalAdminRouter } from "@/ui/contexts/AdminRouterContext";
import { clearAssistantRuntimeStateCache } from "@/ui/assistant/assistantRuntimeStateCache";

const publicRoutes = new Set(["/login", "/2fa", "/reset", "/reset/confirm", "/preview"]);

const ADMIN_THEME_TOKENS_STORAGE_KEY = "coderso.adminThemeTokens";
const LEGACY_ADMIN_THEME_TOKENS_STORAGE_KEY = "nextless.adminThemeTokens";
const ADMIN_THEME_TOKENS_STYLE_ID = "coderso-theme-tokens";

type RouteMatch = {
  params: Record<string, string>;
  permission?: string;
  anyPermissions?: string[];
  render: (ctx: RouteRenderContext) => React.ReactNode;
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

type SettingsState = {
  status: "idle" | "loading" | "ready" | "error";
  values: SettingsValues;
  error: string | null;
};

type RouteRenderContext = {
  authPermissions: string[];
  settingsState: SettingsState;
  settingsSaving: boolean;
  saveGeneralSettings: (values: GeneralSettingsValues) => Promise<void>;
  saveAssistantSettings: (values: AssistantSettingsValues) => Promise<void>;
};

type RouteDefinition = {
  pattern: string;
  permission?: string;
  anyPermissions?: string[];
  render: (ctx: RouteRenderContext) => React.ReactNode;
};

const resolveRoute = (path: string, routes: RouteDefinition[]): RouteMatch => {
  for (const route of routes) {
    const params = matchRoute(route.pattern, path);
    if (params) {
      return {
        params,
        permission: route.permission,
        anyPermissions: route.anyPermissions,
        render: route.render,
      };
    }
  }
  return { render: () => <NotFound />, params: {} };
};

const readStoredAdminThemeTokens = () => {
  if (typeof window === "undefined") return DEFAULT_ADMIN_THEME_TOKENS;
  const cached =
    window.localStorage.getItem(ADMIN_THEME_TOKENS_STORAGE_KEY) ??
    window.localStorage.getItem(LEGACY_ADMIN_THEME_TOKENS_STORAGE_KEY);
  if (!cached) return DEFAULT_ADMIN_THEME_TOKENS;
  try {
    const parsed = JSON.parse(cached) as unknown;
    assertAdminThemeTokens(parsed);
    if (!window.localStorage.getItem(ADMIN_THEME_TOKENS_STORAGE_KEY)) {
      window.localStorage.setItem(ADMIN_THEME_TOKENS_STORAGE_KEY, JSON.stringify(parsed));
    }
    return parsed;
  } catch {
    return DEFAULT_ADMIN_THEME_TOKENS;
  }
};

const AdminThemeTokensStyle = ({ css }: { css: string }) => (
  <style id={ADMIN_THEME_TOKENS_STYLE_ID}>{css}</style>
);

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

const AccessDenied = () => (
  <div className="flex min-h-screen items-center justify-center bg-background px-6 text-center">
    <div>
      <h1 className="text-base font-semibold text-foreground">Access denied</h1>
      <p className="mt-2 max-w-md text-sm text-muted-foreground">
        Your account does not have permission to open this admin area.
      </p>
    </div>
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

export const resolveThemeUpdatedRefreshScope = () => ({
  refreshSettings: false,
  refreshTheme: true,
});

const resolveSettingsPayload = (payload: Record<string, unknown>, fallback: SettingsState) => {
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
    value === "llm-rag"
      ? "llm-guide"
      : value === "docs-only" || value === "llm-guide"
        ? value
        : fallbackValue;
  const resolveProvider = (
    value: unknown,
    fallbackValue: SettingsValues["assistantLlmProvider"]
  ): SettingsValues["assistantLlmProvider"] =>
    value === "openai" || value === "openrouter" || value === "none" ? value : fallbackValue;
  const resolveOptionalString = (value: unknown, fallbackValue: string) => {
    if (value === null) return "";
    if (typeof value !== "string") return fallbackValue;
    const normalized = value.trim();
    return normalized.length > 0 ? normalized : "";
  };

  const siteName =
    typeof payload["site.name"] === "string" ? payload["site.name"] : fallback.values.siteName;
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
      setupCompleted: resolveBoolean(payload["setup.completed"], fallback.values.setupCompleted),
      assistantEnabled: resolveBoolean(
        payload["assistant.enabled"],
        fallback.values.assistantEnabled
      ),
      assistantLauncherAvatarEnabled: resolveBoolean(
        payload["assistant.launcher.avatarEnabled"],
        fallback.values.assistantLauncherAvatarEnabled
      ),
      assistantLauncherAvatarAsset: resolveOptionalString(
        payload["assistant.launcher.avatarAsset"],
        fallback.values.assistantLauncherAvatarAsset
      ),
      assistantDefaultMode: resolveMode(
        payload["assistant.defaultMode"],
        fallback.values.assistantDefaultMode
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
  "assistant.launcher.avatarEnabled": values.assistantLauncherAvatarEnabled,
  "assistant.launcher.avatarAsset":
    values.assistantLauncherAvatarAsset.trim().length > 0
      ? values.assistantLauncherAvatarAsset.trim()
      : null,
  "assistant.defaultMode": values.assistantDefaultMode,
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

  const [authState, setAuthState] = useState<"checking" | "authenticated" | "unauthenticated">(
    isProtected ? "checking" : "unauthenticated"
  );
  const [authUser, setAuthUser] = useState<AuthUser | null>(null);

  const [settingsState, setSettingsState] = useState<SettingsState>({
    status: "idle",
    values: defaultSettingsValues,
    error: null,
  });
  const [settingsSaving, setSettingsSaving] = useState(false);
  const [setupSaving, setSetupSaving] = useState(false);
  const [setupError, setSetupError] = useState<string | null>(null);
  const [adminThemeTokens, setAdminThemeTokens] = useState(readStoredAdminThemeTokens);
  const tokenCss = useMemo(() => toAdminThemeCssVariables(adminThemeTokens), [adminThemeTokens]);
  const assistantConfig = useMemo(
    () => ({
      enabled: settingsState.values.assistantEnabled,
      launcherAvatarEnabled: settingsState.values.assistantLauncherAvatarEnabled,
      launcherAvatarAsset:
        settingsState.values.assistantLauncherAvatarAsset.trim().length > 0
          ? settingsState.values.assistantLauncherAvatarAsset.trim()
          : null,
    }),
    [
      settingsState.values.assistantEnabled,
      settingsState.values.assistantLauncherAvatarAsset,
      settingsState.values.assistantLauncherAvatarEnabled,
    ]
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
      const message = isApiClientError(error) ? error.message : "Failed to save general settings.";
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
      invalidateAssistantStatusCache();
      clearAssistantRuntimeStateCache();
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
      const message = isApiClientError(error) ? error.message : "Failed to complete setup wizard.";
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

  const permissionSnapshot = authUser?.permissionSnapshot ?? null;
  const canReadSettings = canAdmin("settings:read", permissionSnapshot);
  const canReadThemes = canAdmin("themes:read", permissionSnapshot);
  const canAccessRoute = useCallback(
    (route: Pick<RouteMatch, "permission" | "anyPermissions">) => {
      if (route.permission && !canAdmin(route.permission, permissionSnapshot)) return false;
      if (route.anyPermissions?.length) {
        return route.anyPermissions.some((permission) => canAdmin(permission, permissionSnapshot));
      }
      return true;
    },
    [permissionSnapshot]
  );
  const refreshPermissions = useCallback(async () => {
    const result = await resolveAuthBootstrap({ force: true });
    setAuthState(result.state);
    setAuthUser(result.user);
    if (!canAdmin("settings:read", result.user?.permissionSnapshot ?? null)) {
      setSettingsState({
        status: "idle",
        values: defaultSettingsValues,
        error: null,
      });
    }
  }, []);
  const authPermissions = useMemo(
    () => permissionSnapshot?.permissions ?? [],
    [permissionSnapshot]
  );

  const match = useMemo(() => {
    const routes: RouteDefinition[] = [
      { pattern: "/", render: () => <DashboardRoute.Component />, permission: "content:read" },
      { pattern: "/login", render: () => <LoginPage /> },
      { pattern: "/2fa", render: () => <TwoFactorPage /> },
      { pattern: "/reset", render: () => <ResetPasswordPage /> },
      { pattern: "/reset/confirm", render: () => <SetPasswordPage /> },
      {
        pattern: "/analytics",
        render: () => <AnalyticsRoute.Component />,
        permission: "content:read",
      },
      { pattern: "/audit", render: () => <AuditRoute.Component />, permission: "audit:read" },
      {
        pattern: "/access-logs",
        render: () => <AccessLogsRoute.Component />,
        permission: "audit:read",
      },
      { pattern: "/backups", render: () => <BackupsRoute.Component />, permission: "backups:read" },
      { pattern: "/search", render: () => <SearchRoute.Component />, permission: "content:read" },
      { pattern: "/seo", render: () => <SeoRoute.Component />, permission: "content:read" },
      {
        pattern: "/redirects",
        render: () => <RedirectsRoute.Component />,
        permission: "settings:read",
      },
      {
        pattern: "/tools/import-export",
        render: () => <ImportExportRoute.Component />,
        permission: "settings:read",
      },
      {
        pattern: "/advanced/forms",
        render: () => <FormListRoute.Component />,
        permission: "forms:read",
      },
      {
        pattern: "/advanced/forms/:id/action-runs",
        render: () => <FormActionLogsRoute.Component />,
        permission: "forms:read",
      },
      {
        pattern: "/advanced/forms/:id/submissions",
        render: () => <FormSubmissionsRoute.Component />,
        permission: "forms:read",
      },
      {
        pattern: "/advanced/forms/:id",
        render: () => <FormBuilderRoute.Component />,
        permission: "forms:read",
      },
      {
        pattern: "/advanced/engine",
        render: () => <ContentTypeListRoute.Component />,
        permission: "content:read",
      },
      {
        pattern: "/advanced/engine/:id",
        render: () => <ContentTypeEditorRoute.Component />,
        permission: "content:read",
      },
      {
        pattern: "/advanced/engine/:id/collection",
        render: () => <CollectionWorkspaceRoute.Component />,
        permission: "content:read",
      },
      {
        pattern: "/advanced/engine/:id/collection/detail-template/:detailPageId",
        render: () => <DetailTemplateEditorRoute.Component />,
        permission: "content:read",
      },
      {
        pattern: "/advanced/engine/:id/schema",
        render: () => <SchemaBuilderRoute.Component />,
        permission: "content:read",
      },
      {
        pattern: "/advanced/entries",
        render: () => <EntryListRoute.Component />,
        permission: "content:read",
      },
      {
        pattern: "/advanced/entries/:type/:id",
        render: () => <EntryEditorRoute.Component />,
        permission: "content:read",
      },
      {
        pattern: "/advanced/custom-screens",
        render: () => <CustomScreenListRoute.Component />,
        permission: "content:read",
      },
      {
        pattern: "/advanced/custom-screens/:id/entries/:entryId",
        render: () => <CustomScreenEntryEditorRoute.Component />,
        permission: "content:read",
      },
      {
        pattern: "/advanced/custom-screens/:id/entries",
        render: () => <CustomScreenEntriesRoute.Component />,
        permission: "content:read",
      },
      {
        pattern: "/advanced/custom-screens/:id",
        render: () => <CustomScreenEditorRoute.Component />,
        permission: "content:read",
      },
      { pattern: "/posts", render: () => <PostsListRoute.Component />, permission: "content:read" },
      {
        pattern: "/posts/:id",
        render: () => <PostEditorRoute.Component />,
        permission: "content:read",
      },
      {
        pattern: "/advanced/listings",
        render: () => <ListingListRoute.Component />,
        permission: "content:read",
      },
      {
        pattern: "/advanced/listings/:id",
        render: () => <ListingEditorRoute.Component />,
        permission: "content:read",
      },
      {
        pattern: "/advanced/filters",
        render: () => <ListingFiltersRoute.Component />,
        permission: "content:read",
      },
      {
        pattern: "/advanced/search",
        render: () => <ListingSearchRoute.Component />,
        permission: "content:read",
      },
      {
        pattern: "/advanced/booking",
        render: () => <BookingRoute.Component />,
        permission: "booking:read",
      },
      {
        pattern: "/advanced/reviews",
        render: () => <ReviewsModerationRoute.Component />,
        permission: "reviews:read",
      },
      {
        pattern: "/advanced/commerce",
        render: () => <CommerceListRoute.Component />,
        permission: "commerce:read",
      },
      {
        pattern: "/advanced/commerce/:id",
        render: () => <CommerceEditorRoute.Component />,
        permission: "commerce:read",
      },
      {
        pattern: "/advanced/popups",
        render: () => <PopupsListRoute.Component />,
        permission: "popups:read",
      },
      {
        pattern: "/advanced/popups/:id",
        render: () => <PopupEditorRoute.Component />,
        permission: "popups:read",
      },
      {
        pattern: "/advanced/solution-kits",
        render: () => <SolutionKitsRoute.Component />,
        permission: "solution-kits:read",
      },
      { pattern: "/pages", render: () => <PageListRoute.Component />, permission: "content:read" },
      {
        pattern: "/pages/:id",
        render: () => <PageEditorRoute.Component />,
        permission: "content:read",
      },
      { pattern: "/preview", render: () => <PagePreview /> },
      {
        pattern: "/media",
        render: () => <MediaLibraryRoute.Component />,
        permission: "media:read",
      },
      { pattern: "/menus", render: () => <MenuListRoute.Component />, permission: "menus:read" },
      {
        pattern: "/menus/:id",
        render: () => <MenuEditorRoute.Component />,
        permission: "menus:read",
      },
      {
        pattern: "/users",
        render: ({ authPermissions: permissions }) => (
          <UsersRolesRoute.Component permissions={permissions} />
        ),
        anyPermissions: ["users:read", "roles:read"],
      },
      {
        pattern: "/roles",
        render: ({ authPermissions: permissions }) => (
          <PermissionsMatrixRoute.Component permissions={permissions} />
        ),
        permission: "roles:read",
      },
      { pattern: "/themes", render: () => <ThemesRoute.Component />, permission: "themes:read" },
      {
        pattern: "/advanced/widgets",
        render: () => <WidgetLibraryRoute.Component />,
        permission: "widgets:read",
      },
      {
        pattern: "/advanced/page-templates",
        render: () => <PageTemplatesRoute.Component />,
        permission: "content:read",
      },
      {
        pattern: "/advanced/page-templates/:id",
        render: () => <PageTemplateEditorRoute.Component />,
        permission: "content:read",
      },
      {
        pattern: "/settings",
        render: ({ settingsState, settingsSaving, saveGeneralSettings }) => (
          <GeneralSettingsRoute.Component
            values={settingsState.values}
            isLoading={settingsState.status === "loading"}
            isSaving={settingsSaving}
            error={settingsState.error}
            onSave={saveGeneralSettings}
          />
        ),
        permission: "settings:read",
      },
      {
        pattern: "/settings/general",
        render: ({ settingsState, settingsSaving, saveGeneralSettings }) => (
          <GeneralSettingsRoute.Component
            values={settingsState.values}
            isLoading={settingsState.status === "loading"}
            isSaving={settingsSaving}
            error={settingsState.error}
            onSave={saveGeneralSettings}
          />
        ),
        permission: "settings:read",
      },
      {
        pattern: "/settings/site",
        render: () => <SiteSettingsRoute.Component />,
        permission: "settings:read",
      },
      {
        pattern: "/settings/assistant",
        render: ({ settingsState, settingsSaving, saveAssistantSettings }) => (
          <AssistantSettingsRoute.Component
            values={settingsState.values}
            isLoading={settingsState.status === "loading"}
            isSaving={settingsSaving}
            error={settingsState.error}
            onSave={saveAssistantSettings}
          />
        ),
        permission: "settings:read",
      },
      {
        pattern: "/settings/security",
        render: () => <SecuritySettingsRoute.Component />,
        permission: "settings:read",
      },
      {
        pattern: "/settings/security/ip-allowlist",
        render: () => <IpAllowlistRoute.Component />,
        permission: "settings:read",
      },
      {
        pattern: "/settings/security/sessions",
        render: () => <SessionsRoute.Component />,
        permission: "settings:read",
      },
      {
        pattern: "/settings/security/login-alerts",
        render: () => <LoginAlertsRoute.Component />,
        permission: "settings:read",
      },
      {
        pattern: "/settings/api-keys",
        render: () => <ApiKeysRoute.Component />,
        permission: "settings:read",
      },
      {
        pattern: "/settings/webhooks",
        render: () => <WebhooksRoute.Component />,
        permission: "settings:read",
      },
      {
        pattern: "/settings/email",
        render: () => <EmailSettingsRoute.Component />,
        permission: "settings:read",
      },
      {
        pattern: "/settings/storage",
        render: () => <StorageSettingsRoute.Component />,
        permission: "settings:read",
      },
      {
        pattern: "/settings/integrations",
        render: () => <IntegrationsRoute.Component />,
        permission: "settings:read",
      },
      {
        pattern: "/store",
        render: () => <PluginStoreRoute.Component />,
        permission: "store:browse",
      },
      {
        pattern: "/store/plugins/:id",
        render: () => <PluginDetailsRoute.Component />,
        permission: "store:browse",
      },
    ];

    const route = resolveRoute(canonicalRelativePath, routes);
    if (isProtected && !canAccessRoute(route)) {
      return { ...route, render: () => <AccessDenied /> };
    }
    return route;
  }, [canAccessRoute, canonicalRelativePath, isProtected]);

  const refreshSettings = useCallback(
    (options?: { force?: boolean; background?: boolean }) => {
      if (!canReadSettings) {
        setSettingsState({
          status: "idle",
          values: defaultSettingsValues,
          error: null,
        });
        return;
      }
      const fallbackState: SettingsState = {
        status: "idle",
        values: defaultSettingsValues,
        error: null,
      };
      const cached = options?.force ? null : getCachedSettings();

      if (cached) {
        const resolved = resolveSettingsPayload(cached, fallbackState);
        setSettingsState((prev) => ({
          ...prev,
          status: "loading",
          error: null,
          ...resolved,
        }));
      } else if (!options?.background) {
        setSettingsState((prev) => ({
          ...prev,
          status: "loading",
          error: null,
        }));
      }

      getSettingsCached({ force: options?.force ?? Boolean(cached) })
        .then((payload) => {
          const resolved = resolveSettingsPayload(payload, fallbackState);
          setSettingsState((prev) => ({
            ...prev,
            status: "ready",
            ...resolved,
          }));
        })
        .catch((error) => {
          const message = isApiClientError(error) ? error.message : "Failed to load settings.";
          setSettingsState((prev) => ({
            ...prev,
            status: "error",
            error: message,
          }));
        });
    },
    [canReadSettings]
  );

  const refreshAdminTheme = useCallback((options?: { force?: boolean }) => {
    const fallback = DEFAULT_ADMIN_THEME_TOKENS;
    Promise.all([
      listAdminThemeTemplatesCached({ force: options?.force }),
      listAdminThemeProfilesCached({ force: options?.force }),
    ])
      .then(([templates, profiles]) => {
        const activeProfile = profiles.find((profile) => profile.isActive) ?? profiles[0] ?? null;
        const template = activeProfile
          ? (templates.find((item) => item.id === activeProfile.templateId) ?? null)
          : (templates[0] ?? null);
        const resolved = mergeAdminThemeTokens(fallback, template?.tokens ?? null);
        setAdminThemeTokens(resolved);
        if (typeof window !== "undefined") {
          window.localStorage.setItem(ADMIN_THEME_TOKENS_STORAGE_KEY, JSON.stringify(resolved));
        }
      })
      .catch(() => {
        setAdminThemeTokens(fallback);
      });
  }, []);

  useEffect(() => {
    if (!isAdminPath) return;
    let active = true;
    resolveAuthBootstrap()
      .then((result) => {
        if (!active) return;
        setAuthState(result.state);
        setAuthUser(result.user);
        if (!canAdmin("settings:read", result.user?.permissionSnapshot ?? null)) {
          setSettingsState({
            status: "idle",
            values: defaultSettingsValues,
            error: null,
          });
        }
      })
      .catch(() => {
        if (!active) return;
        setAuthState("unauthenticated");
        setAuthUser(null);
      });
    return () => {
      active = false;
    };
  }, [isAdminPath, isProtected]);

  useEffect(() => {
    if (authState !== "authenticated") return;
    if (!canReadSettings) return;
    let active = true;
    Promise.resolve().then(() => {
      if (active) refreshSettings();
    });
    return () => {
      active = false;
    };
  }, [authState, canReadSettings, refreshSettings]);

  useEffect(() => {
    if (authState !== "authenticated") return;
    if (!canReadThemes) return;
    refreshAdminTheme({ force: false });
  }, [authState, canReadThemes, refreshAdminTheme]);

  useEffect(() => {
    if (authState !== "authenticated") return undefined;
    return subscribeAdminPermissionFailure(() => {
      void refreshPermissions();
    });
  }, [authState, refreshPermissions]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (authState !== "authenticated") return;
    const handler = () => {
      const scope = resolveThemeUpdatedRefreshScope();
      if (scope.refreshSettings && canReadSettings) {
        refreshSettings();
      }
      if (scope.refreshTheme && canReadThemes) {
        refreshAdminTheme({ force: true });
      }
    };
    window.addEventListener("theme:updated", handler);
    return () => window.removeEventListener("theme:updated", handler);
  }, [authState, canReadSettings, canReadThemes, refreshAdminTheme, refreshSettings]);

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
  }, [adminBasePath, canonicalRelativePath, isAdminPath, relativePath, router]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (authState === "unauthenticated" && isProtected) {
      window.location.assign(withAdminBasePath(adminBasePath, "/login"));
    }
    if (authState === "authenticated" && isPublic && canonicalRelativePath !== "/preview") {
      window.location.assign(withAdminBasePath(adminBasePath, "/"));
    }
  }, [adminBasePath, authState, canonicalRelativePath, isProtected, isPublic]);

  const showSetupWizard = shouldShowSetupWizard({
    isProtected,
    authState,
    settingsStatus: settingsState.status,
    setupCompleted: settingsState.values.setupCompleted,
  });

  if (isProtected && authState !== "authenticated") {
    return (
      <>
        <AdminThemeTokensStyle css={tokenCss} />
        <Loading />
      </>
    );
  }

  if (showSetupWizard) {
    return (
      <AdminBasePathProvider value={adminBasePath}>
        <>
          <AdminThemeTokensStyle css={tokenCss} />
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

  const routeRenderContext: RouteRenderContext = {
    authPermissions,
    settingsState,
    settingsSaving,
    saveGeneralSettings,
    saveAssistantSettings,
  };
  const routeElement = match.render(routeRenderContext);

  return (
    <AdminBasePathProvider value={adminBasePath}>
      <AdminAuthProvider user={authUser} refreshPermissions={refreshPermissions}>
        <AdminAssistantConfigProvider value={assistantConfig}>
          <>
            <AdminThemeTokensStyle css={tokenCss} />
            <Toaster
              position="top-right"
              richColors
              closeButton
              duration={4000}
              // Round-3 friction B: spawn toasts below the 64px admin topbar.
              // A visible "Draft saved." toast at the default 24px offset sat
              // directly on top of the topbar actions (Publish) and, being an
              // interactive element, swallowed real clicks on them.
              offset={{ top: 76 }}
              mobileOffset={{ top: 76 }}
              containerAriaLabel="Admin notifications"
            />
            <AdminRouteErrorBoundary resetKey={canonicalRelativePath}>
              <Suspense fallback={<Loading />}>{routeElement}</Suspense>
            </AdminRouteErrorBoundary>
          </>
        </AdminAssistantConfigProvider>
      </AdminAuthProvider>
    </AdminBasePathProvider>
  );
}
