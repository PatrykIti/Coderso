import { Suspense, useCallback, useEffect, useMemo, useState } from "react";

import { canAdmin, resolveAuthBootstrap, type AuthUser } from "@/services/authClient";
import { getInstallStatus } from "@/services/installClient";
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
import {
  defaultSettingsValues,
  type AssistantSettingsValues,
  type GeneralSettingsValues,
  type SettingsValues,
} from "@/ui/settings/settingsValues";
import { SetupWizard } from "@/ui/setup/SetupWizard";
import { InstallerWizard } from "@/ui/setup/InstallerWizard";
import { Toaster } from "@/components/ui/sonner";
import {
  normalizePath,
  resolveAdminRoute,
  type RouteMatch,
  type RouteRenderContext,
  type SettingsState,
} from "@/app/adminRoutes";
import { AdminRouteErrorBoundary } from "@/app/AdminRouteErrorBoundary";
import { toBasicSettingsPayload, type SetupWizardValues } from "@/ui/setup/setupWizardValidation";
import type { WizardValues } from "@/ui/setup/wizardSteps";
import { toAdminThemeCssVariables } from "../../ui/theme/tokenCss";
import {
  DEFAULT_ADMIN_THEME_TOKENS,
  DEFAULT_ADMIN_THEME_TOKENS_DARK,
} from "../../services/adminThemes/tokenTypes";
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

const Loading = () => (
  <div className="flex min-h-screen items-center justify-center bg-background text-sm text-muted-foreground">
    Loading...
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

// The pre-login installer is a pre-auth surface: it renders ONLY when the DB has
// zero users (`installState === "available"`) and the visitor is not already
// authenticated. Fail-closed by construction — any non-`"available"` state
// (including the fail-safe `"disabled"` on a status-fetch error) hides the form
// and lets the normal login flow take over. Exported for unit testing so it can
// be asserted to gate ahead of the redirect/loading branches.
export const shouldShowInstaller = (input: {
  isAdminPath: boolean;
  installState: "checking" | "available" | "disabled";
  authState: "checking" | "authenticated" | "unauthenticated";
}) =>
  input.isAdminPath && input.installState === "available" && input.authState !== "authenticated";

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
  // Pre-auth installer gate (TASK-482-03-L02). Populated from the PUBLIC
  // `GET /auth/install/status`; runs for both authenticated and unauthenticated
  // visitors on admin paths. Starts `"checking"` so a fresh install is never
  // bounced to `/login` before the status resolves.
  const [installState, setInstallState] = useState<"checking" | "available" | "disabled">(
    "checking"
  );

  const [settingsState, setSettingsState] = useState<SettingsState>({
    status: "idle",
    values: defaultSettingsValues,
    error: null,
  });
  const [settingsSaving, setSettingsSaving] = useState(false);
  const [setupSaving, setSetupSaving] = useState(false);
  const [setupError, setSetupError] = useState<string | null>(null);
  const [adminThemeTokens, setAdminThemeTokens] = useState(readStoredAdminThemeTokens);
  // Emit BOTH the active profile's light `:root{--admin-*}` block AND the shared
  // default dark `:root.dark{--admin-*}` block from the same injected style. The
  // dark block is the dark mechanism (not a static globals `.dark`): the chrome
  // reads `--admin-*` directly and the injected style wins source order, so
  // toggling `<html class="dark">` (AdminColorModeToggle) recolors the whole
  // shell. The profile (AdminThemeSwitcher) axis only re-emits the light block.
  // See TASK-479-05-L01 / L06.
  const tokenCss = useMemo(
    () =>
      toAdminThemeCssVariables(adminThemeTokens) +
      toAdminThemeCssVariables(DEFAULT_ADMIN_THEME_TOKENS_DARK, ":root.dark"),
    [adminThemeTokens]
  );
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

  const completeSetup = useCallback(async (values: WizardValues) => {
    setSetupSaving(true);
    setSetupError(null);
    try {
      const updated = await updateSettings({
        // Owned/exported by 05-L02: the single wizard-values → settings-keys map.
        ...toBasicSettingsPayload(values),
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

  const match = useMemo(
    () => resolveAdminRoute(canonicalRelativePath, { isProtected, canAccessRoute }),
    [canAccessRoute, canonicalRelativePath, isProtected]
  );

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

  // Public install-status bootstrap. Runs for BOTH auth states (unlike the
  // settings/theme effects gated on `authenticated`) because the status endpoint
  // is unauthenticated. Fail-closed: a failed/uncertain fetch resolves to
  // `"disabled"` so a transient error can never expose the installer on a
  // populated DB (it only delays a real login by one status roundtrip).
  useEffect(() => {
    if (!isAdminPath) return;
    let active = true;
    getInstallStatus()
      .then((status) => {
        if (!active) return;
        setInstallState(status.available ? "available" : "disabled");
      })
      .catch(() => {
        if (!active) return;
        setInstallState("disabled");
      });
    return () => {
      active = false;
    };
  }, [isAdminPath]);

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
      // Suppress the /login bounce while the installer gate is unresolved
      // ("checking") or open ("available"). Guarding only on "available" would
      // let this effect fire a full-page redirect on a fresh install when auth
      // resolves "unauthenticated" before the status fetch settles.
      if (installState !== "disabled") return;
      window.location.assign(withAdminBasePath(adminBasePath, "/login"));
    }
    if (authState === "authenticated" && isPublic && canonicalRelativePath !== "/preview") {
      window.location.assign(withAdminBasePath(adminBasePath, "/"));
    }
  }, [adminBasePath, authState, canonicalRelativePath, installState, isProtected, isPublic]);

  const showSetupWizard = shouldShowSetupWizard({
    isProtected,
    authState,
    settingsStatus: settingsState.status,
    setupCompleted: settingsState.values.setupCompleted,
  });

  const showInstaller = shouldShowInstaller({ isAdminPath, installState, authState });

  // Render-side install gate. Runs BEFORE the loading branch and ahead of the
  // /login redirect effect above (which is separately guarded). This is
  // render-only — it does NOT stop the redirect effect; the effect guard is what
  // prevents the bounce during "checking".
  if (isAdminPath && installState === "checking") {
    return (
      <>
        <AdminThemeTokensStyle css={tokenCss} />
        <Loading />
      </>
    );
  }

  if (showInstaller) {
    return (
      <AdminBasePathProvider value={adminBasePath}>
        <>
          <AdminThemeTokensStyle css={tokenCss} />
          <InstallerWizard
            onInstalled={() => {
              // The installer self-disables server-side; reflect it client-side
              // so the form cannot re-open, then hand off to /login. If 02-L02
              // later issues a session it can instead re-run resolveAuthBootstrap
              // and fall through to Phase 2 — the default handoff is /login.
              setInstallState("disabled");
              if (typeof window !== "undefined") {
                window.location.assign(withAdminBasePath(adminBasePath, "/login"));
              }
            }}
          />
        </>
      </AdminBasePathProvider>
    );
  }

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
