import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { CheckCircle2, Eye, Gauge, Home, LayoutList, Link2, Timer } from "lucide-react";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { isApiClientError } from "@/services/apiClient";
import {
  getCachedContentTypes,
  listContentTypesCached,
  type ContentTypeSummary,
} from "@/services/contentTypesClient";
import {
  getCachedPages,
  listPagesCached,
  previewPage,
  type PageSummary,
} from "@/services/pagesClient";
import {
  getCachedSiteSettings,
  getSiteSettingsCached,
  updateSiteSettings,
  type SiteSettingsResponse,
} from "@/services/siteSettingsClient";
import { cacheKeys } from "@/services/cachePolicy";
import { SettingsShell } from "@/ui/layouts/SettingsShell";
import { InfoTip } from "@/ui/shared/InfoTip";
import { AdminLink } from "@/ui/shared/AdminLink";
import { ConfirmActionDialog } from "@/ui/shared/ConfirmActionDialog";
import { SettingsSidebar } from "@/ui/settings/SettingsSidebar";
import { AdminAccessCard } from "@/ui/settings/AdminAccessCard";
import { BaseUrlCard } from "@/ui/settings/BaseUrlCard";
import { useRegisterSettingsDirty } from "@/ui/settings/SettingsDirtyNavigation";
import { useAutoSaveEffect, useSettingsAutoSave } from "@/ui/settings/useSettingsAutoSave";
import { resolveListMountRefreshOptions } from "@/utils/cacheRefresh";
import { subscribeCacheEvents } from "@/utils/cacheBus";
import { cn } from "@/lib/utils";

import { SiteRouteEditor } from "./SiteRouteEditor";
import {
  buildDefaultRoute,
  normalizeDetailPageIdInput,
  mergeContentRoutes,
  normalizeRouteInput,
  validateBaseUrl,
  validateContentRoutes,
  type SiteContentRouteForm,
} from "./siteSettingsValidation";

type SiteSettingsForm = {
  adminBaseUrl: string;
  publicBaseUrl: string;
  adminPath: string;
  adminRedirectEnabled: boolean;
  homepageId: string | null;
  notFoundPageId: string | null;
  previewEnabled: boolean;
  cacheTtlSeconds: string;
  contentRoutes: SiteContentRouteForm[];
};

// The "Site shell" section moved to the Menus surface (`SiteShellDialog`,
// TASK-458-01); `site.navigationMenuId` / `site.footerTemplateId` are no
// longer read or written by this page.
type SiteSectionId = "base" | "pages" | "preview" | "routes" | "cache" | "performance";

const SITE_SECTIONS: Array<{
  id: SiteSectionId;
  title: string;
  description: string;
  icon: typeof Link2;
}> = [
  {
    id: "base",
    title: "Base URLs",
    description: "Admin domain, public site URL, and access path.",
    icon: Link2,
  },
  {
    id: "pages",
    title: "Homepage & 404",
    description: "Pick the default public entry points.",
    icon: Home,
  },
  {
    id: "preview",
    title: "Preview access",
    description: "Enable and test preview links.",
    icon: Eye,
  },
  {
    id: "routes",
    title: "Content routes",
    description: "Define list and detail paths per type.",
    icon: LayoutList,
  },
  {
    id: "cache",
    title: "Cache settings",
    description: "Control HTML cache lifetime.",
    icon: Timer,
  },
  {
    id: "performance",
    title: "Performance",
    description: "Future runtime optimization toggles.",
    icon: Gauge,
  },
];

const defaultForm: SiteSettingsForm = {
  adminBaseUrl: "",
  publicBaseUrl: "",
  adminPath: "/admin",
  adminRedirectEnabled: false,
  homepageId: null,
  notFoundPageId: null,
  previewEnabled: true,
  cacheTtlSeconds: "30",
  contentRoutes: [],
};

const toFormValues = (settings: SiteSettingsResponse): SiteSettingsForm => ({
  adminBaseUrl: settings.adminBaseUrl ?? "",
  publicBaseUrl: settings.publicBaseUrl ?? "",
  adminPath: settings.adminPath ?? "/admin",
  adminRedirectEnabled: settings.adminRedirectEnabled ?? false,
  homepageId: settings.homepageId ?? null,
  notFoundPageId: settings.notFoundPageId ?? null,
  previewEnabled: settings.previewEnabled ?? true,
  cacheTtlSeconds: `${settings.cacheTtlSeconds ?? 30}`,
  contentRoutes: settings.contentRoutes ?? [],
});

const toLoadedForm = (
  settings: SiteSettingsResponse,
  contentTypes: ContentTypeSummary[]
): SiteSettingsForm => ({
  ...toFormValues(settings),
  contentRoutes: mergeContentRoutes(toFormValues(settings).contentRoutes, contentTypes),
});

const resolveInitialSiteSettingsState = () => {
  const settings = getCachedSiteSettings();
  const pages = getCachedPages();
  const contentTypes = getCachedContentTypes();
  const resolvedContentTypes = contentTypes ?? [];
  const form = settings ? toLoadedForm(settings, resolvedContentTypes) : defaultForm;
  return {
    form,
    savedForm: form,
    pages: pages ?? [],
    contentTypes: resolvedContentTypes,
    status: settings ? ("ready" as const) : ("loading" as const),
    hasSettingsCache: Boolean(settings),
    hasPagesCache: Boolean(pages),
    hasContentTypesCache: Boolean(contentTypes),
  };
};

const validateAdminPath = (value: string) => {
  const trimmed = value.trim();
  if (!trimmed) return "Admin path is required.";
  const normalized = trimmed.startsWith("/") ? trimmed : `/${trimmed}`;
  if (normalized.length <= 1) return "Admin path must be longer than '/'.";
  if (!/^\/[a-zA-Z0-9_-]+$/.test(normalized)) {
    return "Use only letters, numbers, dashes, and underscores (single segment).";
  }
  return null;
};

const resolvePublicBaseUrl = (value: string) => {
  const trimmed = value.trim();
  if (trimmed) return trimmed.replace(/\/$/, "");
  if (typeof window === "undefined") return "";
  return window.location.origin;
};

const normalizeComparableUrl = (value: string) => value.trim().replace(/\/$/, "");

const classifySiteSettingsRisk = (before: SiteSettingsForm, after: SiteSettingsForm) => {
  const risks: string[] = [];
  if (normalizeComparableUrl(before.adminBaseUrl) !== normalizeComparableUrl(after.adminBaseUrl)) {
    risks.push("Admin base URL");
  }
  if (
    normalizeComparableUrl(before.publicBaseUrl) !== normalizeComparableUrl(after.publicBaseUrl)
  ) {
    risks.push("Public site URL");
  }
  if (before.adminPath.trim() !== after.adminPath.trim()) {
    risks.push("Admin access path");
  }
  if (before.adminRedirectEnabled !== after.adminRedirectEnabled) {
    risks.push("Admin host redirect");
  }
  if (before.homepageId !== after.homepageId) {
    risks.push("Homepage route");
  }
  if (before.notFoundPageId !== after.notFoundPageId) {
    risks.push("404 route");
  }
  if (before.previewEnabled !== after.previewEnabled) {
    risks.push("Preview access");
  }
  if (JSON.stringify(before.contentRoutes) !== JSON.stringify(after.contentRoutes)) {
    risks.push("Content route map");
  }
  return risks;
};

export function SiteSettingsPage() {
  const [initialState] = useState(resolveInitialSiteSettingsState);
  const [form, setForm] = useState<SiteSettingsForm>(initialState.form);
  const [savedForm, setSavedForm] = useState<SiteSettingsForm>(initialState.savedForm);
  const [pages, setPages] = useState<PageSummary[]>(initialState.pages);
  const [contentTypes, setContentTypes] = useState<ContentTypeSummary[]>(initialState.contentTypes);
  const [status, setStatus] = useState<"idle" | "loading" | "ready" | "error">(initialState.status);
  const [error, setError] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saveSuccess, setSaveSuccess] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [activeSection, setActiveSection] = useState<SiteSectionId>("base");
  const [pendingRiskReview, setPendingRiskReview] = useState<string[] | null>(null);
  const { enabled: autoSaveEnabled, setEnabled: setAutoSaveEnabled } = useSettingsAutoSave();
  const hasSettingsCacheRef = useRef(initialState.hasSettingsCache);
  const hasPagesCacheRef = useRef(initialState.hasPagesCache);
  const hasContentTypesCacheRef = useRef(initialState.hasContentTypesCache);
  const isDirtyRef = useRef(false);
  const formRef = useRef(initialState.form);
  const contentTypesRef = useRef(initialState.contentTypes);

  useEffect(() => {
    let active = true;
    const settingsHadCache = hasSettingsCacheRef.current;
    const pagesMountOptions = resolveListMountRefreshOptions(hasPagesCacheRef.current);
    const contentTypesMountOptions = resolveListMountRefreshOptions(
      hasContentTypesCacheRef.current
    );

    if (!settingsHadCache) {
      setStatus("loading");
    }

    Promise.all([
      getSiteSettingsCached({ force: settingsHadCache }),
      listPagesCached({ force: pagesMountOptions.force }),
      listContentTypesCached({ force: contentTypesMountOptions.force }),
    ])
      .then(([settings, pagesResult, typesResult]) => {
        if (!active) return;
        const loadedForm = toLoadedForm(settings, typesResult);
        if (!isDirtyRef.current) {
          setForm(loadedForm);
          setSavedForm(loadedForm);
        }
        setPages(pagesResult);
        setContentTypes(typesResult);
        hasSettingsCacheRef.current = true;
        hasPagesCacheRef.current = true;
        hasContentTypesCacheRef.current = true;
        setStatus("ready");
      })
      .catch((err) => {
        if (!active) return;
        const message = isApiClientError(err) ? err.message : "Failed to load site settings.";
        setError(message);
        setStatus("error");
      });

    return () => {
      active = false;
    };
  }, []);

  const routeValidation = useMemo(
    () => validateContentRoutes(form.contentRoutes),
    [form.contentRoutes]
  );
  const isDirty = JSON.stringify(form) !== JSON.stringify(savedForm);
  useRegisterSettingsDirty(status === "ready" && isDirty);

  useEffect(() => {
    isDirtyRef.current = isDirty;
  }, [isDirty]);

  useEffect(() => {
    formRef.current = form;
  }, [form]);

  useEffect(() => {
    contentTypesRef.current = contentTypes;
  }, [contentTypes]);

  useEffect(() => {
    return subscribeCacheEvents((event) => {
      if (event.key === cacheKeys.settingsRedacted) {
        getSiteSettingsCached({
          force: event.action === "invalidate",
          storageFirst: event.action === "update",
        })
          .then((settings) => {
            if (isDirtyRef.current) return;
            const loadedForm = toLoadedForm(settings, contentTypesRef.current);
            setForm(loadedForm);
            setSavedForm(loadedForm);
            setStatus("ready");
          })
          .catch(() => undefined);
        return;
      }

      if (event.key === cacheKeys.pagesList) {
        listPagesCached({ force: true })
          .then((items) => {
            setPages(items);
            hasPagesCacheRef.current = true;
          })
          .catch(() => undefined);
        return;
      }

      if (event.key === cacheKeys.contentTypesList) {
        listContentTypesCached({ force: true })
          .then((items) => {
            setContentTypes(items);
            hasContentTypesCacheRef.current = true;
            if (isDirtyRef.current) return;
            const next = {
              ...formRef.current,
              contentRoutes: mergeContentRoutes(formRef.current.contentRoutes, items),
            };
            setForm(next);
            setSavedForm(next);
          })
          .catch(() => undefined);
      }
    });
  }, []);

  const publicBaseUrlError = validateBaseUrl(form.publicBaseUrl);
  const adminBaseUrlError = validateBaseUrl(form.adminBaseUrl);
  const adminPathError = validateAdminPath(form.adminPath);
  const homepageError =
    form.homepageId && form.homepageId === form.notFoundPageId
      ? "Homepage and 404 page should be different."
      : null;
  const cacheTtlValue = Number(form.cacheTtlSeconds);
  const cacheTtlError =
    Number.isFinite(cacheTtlValue) && cacheTtlValue >= 0
      ? null
      : "Cache TTL must be a number greater than or equal to 0.";

  const hasValidationErrors = Boolean(
    publicBaseUrlError ||
    adminBaseUrlError ||
    adminPathError ||
    homepageError ||
    cacheTtlError ||
    routeValidation.hasErrors
  );

  const busy = saving || status === "loading";
  const siteRiskChanges = useMemo(
    () => classifySiteSettingsRisk(savedForm, form),
    [form, savedForm]
  );
  const hasRiskyChanges = siteRiskChanges.length > 0;

  const performSave = useCallback(async () => {
    if (hasValidationErrors) return false;
    setSaveError(null);
    setSaveSuccess(null);
    setActionError(null);
    setSaving(true);
    try {
      const normalizedRoutes = form.contentRoutes.map((route) => ({
        ...route,
        listPath: normalizeRouteInput(route.listPath, true) ?? route.listPath,
        detailPath: normalizeRouteInput(route.detailPath, false) ?? route.detailPath,
        detailPageId: normalizeDetailPageIdInput(route.detailPageId),
      }));
      const updated = await updateSiteSettings({
        adminBaseUrl: form.adminBaseUrl.trim() || null,
        publicBaseUrl: form.publicBaseUrl.trim() || null,
        adminPath: form.adminPath,
        adminRedirectEnabled: form.adminRedirectEnabled,
        homepageId: form.homepageId,
        notFoundPageId: form.notFoundPageId,
        previewEnabled: form.previewEnabled,
        cacheTtlSeconds: Math.max(0, Math.floor(cacheTtlValue || 0)),
        contentRoutes: normalizedRoutes,
      });
      const updatedForm = {
        ...toFormValues(updated),
        contentRoutes: mergeContentRoutes(toFormValues(updated).contentRoutes, contentTypes),
      };
      setForm(updatedForm);
      setSavedForm(updatedForm);
      setSaveSuccess("Site settings updated.");
      return true;
    } catch (err) {
      const message = isApiClientError(err) ? err.message : "Failed to save site settings.";
      setSaveError(message);
      return false;
    } finally {
      setSaving(false);
    }
  }, [cacheTtlValue, contentTypes, form, hasValidationErrors]);

  const handleSave = useCallback(async () => {
    if (hasRiskyChanges) {
      setPendingRiskReview(siteRiskChanges);
      return false;
    }
    return performSave();
  }, [hasRiskyChanges, performSave, siteRiskChanges]);

  const handleViewHomepage = () => {
    setActionError(null);
    const baseUrl = resolvePublicBaseUrl(form.publicBaseUrl);
    if (!baseUrl) {
      setActionError("Add a public base URL to open the homepage preview.");
      return;
    }
    if (typeof window === "undefined") return;
    window.open(baseUrl, "_blank", "noopener");
  };

  const handleTestPreview = async () => {
    setActionError(null);
    if (!form.previewEnabled) {
      setActionError("Preview is disabled. Enable it to generate preview links.");
      return;
    }
    if (!form.homepageId) {
      setActionError("Select a homepage to generate a preview URL.");
      return;
    }
    try {
      const result = await previewPage(form.homepageId);
      if (typeof window !== "undefined") {
        window.open(result.previewUrl, "_blank", "noopener");
      }
    } catch (err) {
      const message = isApiClientError(err) ? err.message : "Failed to generate preview URL.";
      setActionError(message);
    }
  };

  useAutoSaveEffect({
    enabled: autoSaveEnabled,
    isReady: status === "ready",
    hasErrors: hasValidationErrors || hasRiskyChanges,
    value: form,
    savedValue: savedForm,
    onSave: handleSave,
    syncSnapshotWhenBlocked: true,
  });

  return (
    <SettingsShell
      activeHref="/admin/settings/site"
      showSearch={false}
      sidebar={<SettingsSidebar activeId="site" />}
      breadcrumbs={["Settings", "Site"]}
      topbarActions={null}
    >
      <div className="flex min-h-full flex-col">
        <div className="flex-1">
          <div className="mx-auto flex w-full max-w-5xl flex-col gap-6 px-6 py-10 pb-28">
            {error ? (
              <Alert variant="destructive">
                <AlertTitle>Settings error</AlertTitle>
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            ) : null}
            {saveError ? (
              <Alert variant="destructive">
                <AlertTitle>Save failed</AlertTitle>
                <AlertDescription>{saveError}</AlertDescription>
              </Alert>
            ) : null}
            {saveSuccess ? (
              <Alert>
                <AlertTitle>Saved</AlertTitle>
                <AlertDescription>{saveSuccess}</AlertDescription>
              </Alert>
            ) : null}
            {actionError ? (
              <Alert variant="destructive">
                <AlertTitle>Action blocked</AlertTitle>
                <AlertDescription>{actionError}</AlertDescription>
              </Alert>
            ) : null}

            <div className="grid gap-6 lg:grid-cols-[220px_minmax(0,1fr)]">
              <div className="space-y-2">
                {SITE_SECTIONS.map((section) => {
                  const isActive = section.id === activeSection;
                  const Icon = section.icon;
                  return (
                    <button
                      key={section.id}
                      type="button"
                      onClick={() => setActiveSection(section.id)}
                      className={cn(
                        "flex w-full items-start gap-3 rounded-xl border px-3 py-3 text-left transition",
                        isActive
                          ? "border-transparent bg-sidebar-accent text-sidebar-accent-foreground"
                          : "border-transparent text-muted-foreground hover:bg-accent hover:text-foreground"
                      )}
                    >
                      <div
                        className={cn(
                          "mt-0.5 flex h-8 w-8 items-center justify-center rounded-xl",
                          isActive
                            ? "bg-primary-soft text-primary"
                            : "bg-muted text-muted-foreground"
                        )}
                      >
                        <Icon className="h-4 w-4" />
                      </div>
                      <div className="space-y-1">
                        <p className="text-sm font-semibold">{section.title}</p>
                        <p className="text-xs text-muted-foreground">{section.description}</p>
                      </div>
                    </button>
                  );
                })}
              </div>

              <div className="space-y-6">
                {activeSection === "base" ? (
                  <div className="space-y-4">
                    <BaseUrlCard
                      adminBaseUrl={form.adminBaseUrl}
                      publicBaseUrl={form.publicBaseUrl}
                      errors={{
                        adminBaseUrl: adminBaseUrlError,
                        publicBaseUrl: publicBaseUrlError,
                      }}
                      onChange={(next) =>
                        setForm((prev) => ({
                          ...prev,
                          adminBaseUrl: next.adminBaseUrl,
                          publicBaseUrl: next.publicBaseUrl,
                        }))
                      }
                      disabled={busy}
                    />
                    <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-dashed border-border/60 bg-muted/40 px-4 py-3 text-xs text-muted-foreground">
                      <span>Test how the public base URL resolves in a new tab.</span>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={handleViewHomepage}
                        disabled={busy}
                      >
                        View homepage
                      </Button>
                    </div>
                    <AdminAccessCard
                      adminPath={form.adminPath}
                      redirectEnabled={form.adminRedirectEnabled}
                      error={adminPathError}
                      onChange={(next) =>
                        setForm((prev) => ({
                          ...prev,
                          adminPath: next.adminPath,
                          adminRedirectEnabled: next.redirectEnabled,
                        }))
                      }
                      disabled={busy}
                    />
                  </div>
                ) : null}

                {activeSection === "pages" ? (
                  <Card className="border-border/60">
                    <CardHeader className="border-b">
                      <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary-soft text-primary">
                          <Home className="h-5 w-5" />
                        </div>
                        <div>
                          <CardTitle>Homepage & 404</CardTitle>
                          <CardDescription>
                            Choose the pages that represent your public entry points.
                          </CardDescription>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-6 pt-6">
                      <div className="grid gap-6 md:grid-cols-2">
                        <div className="space-y-2">
                          <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                            Homepage
                          </label>
                          <Select
                            value={form.homepageId ?? "none"}
                            onValueChange={(value) =>
                              setForm((prev) => ({
                                ...prev,
                                homepageId: value === "none" ? null : value,
                              }))
                            }
                            disabled={busy}
                          >
                            <SelectTrigger className="w-full">
                              <SelectValue placeholder="Select homepage" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="none">Not set</SelectItem>
                              {pages.map((page) => (
                                <SelectItem key={page.id} value={page.id}>
                                  {page.title || "Untitled page"} ({page.status})
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-2">
                          <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                            404 page
                          </label>
                          <Select
                            value={form.notFoundPageId ?? "none"}
                            onValueChange={(value) =>
                              setForm((prev) => ({
                                ...prev,
                                notFoundPageId: value === "none" ? null : value,
                              }))
                            }
                            disabled={busy}
                          >
                            <SelectTrigger className="w-full">
                              <SelectValue placeholder="Select 404 page" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="none">Not set</SelectItem>
                              {pages.map((page) => (
                                <SelectItem key={page.id} value={page.id}>
                                  {page.title || "Untitled page"} ({page.status})
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                      {homepageError ? (
                        <p className="text-xs text-destructive">{homepageError}</p>
                      ) : null}
                      {pages.length === 0 ? (
                        <div className="rounded-lg border border-dashed border-border/60 bg-muted/40 px-4 py-3 text-xs text-muted-foreground">
                          No pages yet. Create one in the
                          <AdminLink
                            className="ml-1 text-primary underline-offset-4 hover:underline"
                            href="/admin/pages"
                          >
                            Pages section
                          </AdminLink>
                          .
                        </div>
                      ) : null}
                    </CardContent>
                  </Card>
                ) : null}

                {activeSection === "preview" ? (
                  <Card className="border-border/60">
                    <CardHeader className="border-b">
                      <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary-soft text-primary">
                          <Eye className="h-5 w-5" />
                        </div>
                        <div>
                          <CardTitle>Preview access</CardTitle>
                          <CardDescription>
                            Allow editors to generate preview links.
                          </CardDescription>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="flex flex-col gap-4 pt-6 md:flex-row md:items-center md:justify-between">
                      <div>
                        <p className="text-sm font-medium">Preview enabled</p>
                        <p className="text-xs text-muted-foreground">
                          Disable to block all preview URLs.
                        </p>
                      </div>
                      <div className="flex flex-wrap items-center gap-3">
                        <Switch
                          checked={form.previewEnabled}
                          onCheckedChange={(checked) =>
                            setForm((prev) => ({
                              ...prev,
                              previewEnabled: checked,
                            }))
                          }
                          disabled={busy}
                        />
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={handleTestPreview}
                          disabled={busy}
                        >
                          Test preview URL
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ) : null}

                {activeSection === "routes" ? (
                  <Card className="border-border/60">
                    <CardHeader className="border-b">
                      <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary-soft text-primary">
                          <LayoutList className="h-5 w-5" />
                        </div>
                        <div>
                          <CardTitle>Content routes</CardTitle>
                          <CardDescription>
                            Configure how each content type is published on the public site.
                          </CardDescription>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-5 pt-6">
                      {contentTypes.length === 0 ? (
                        <div className="rounded-lg border border-dashed border-border/60 bg-muted/40 px-4 py-3 text-xs text-muted-foreground">
                          No content types yet. Create one in
                          <AdminLink
                            className="ml-1 text-primary underline-offset-4 hover:underline"
                            href="/admin/content-types"
                          >
                            Content Types
                          </AdminLink>
                          .
                        </div>
                      ) : null}
                      {routeValidation.hasErrors ? (
                        <Alert variant="destructive">
                          <AlertTitle>Resolve route conflicts</AlertTitle>
                          <AlertDescription>
                            Fix highlighted paths before saving. Routes must be unique across
                            content types.
                          </AlertDescription>
                        </Alert>
                      ) : null}
                      <div className="space-y-6">
                        {form.contentRoutes.map((route) => {
                          const contentType = contentTypes.find(
                            (entry) => entry.slug === route.type
                          );
                          const displayName = contentType?.name ?? route.type;
                          const suggested = buildDefaultRoute(route.type);
                          return (
                            <SiteRouteEditor
                              key={route.type}
                              name={displayName}
                              slug={route.type}
                              route={route}
                              suggested={suggested}
                              errors={routeValidation.errorsByType[route.type]}
                              missing={!contentType}
                              disabled={busy}
                              onChange={(next) =>
                                setForm((prev) => ({
                                  ...prev,
                                  contentRoutes: prev.contentRoutes.map((item) =>
                                    item.type === route.type ? next : item
                                  ),
                                }))
                              }
                              onUseSuggested={() =>
                                setForm((prev) => ({
                                  ...prev,
                                  contentRoutes: prev.contentRoutes.map((item) =>
                                    item.type === route.type
                                      ? {
                                          ...item,
                                          listPath: suggested.listPath,
                                          detailPath: suggested.detailPath,
                                        }
                                      : item
                                  ),
                                }))
                              }
                            />
                          );
                        })}
                      </div>
                    </CardContent>
                  </Card>
                ) : null}

                {activeSection === "cache" ? (
                  <Card className="border-border/60">
                    <CardHeader className="border-b">
                      <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary-soft text-primary">
                          <Timer className="h-5 w-5" />
                        </div>
                        <div>
                          <CardTitle className="flex items-center gap-2">
                            Cache settings
                            <InfoTip content="Controls server-side HTML cache for public pages. Higher values improve speed but delay content updates until the TTL expires. Set 0 to disable caching." />
                          </CardTitle>
                          <CardDescription>
                            Control the HTML cache lifespan for public pages.
                          </CardDescription>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-2 pt-6">
                      <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                        Cache TTL (seconds)
                      </label>
                      <Input
                        type="number"
                        min={0}
                        value={form.cacheTtlSeconds}
                        onChange={(event) =>
                          setForm((prev) => ({
                            ...prev,
                            cacheTtlSeconds: event.target.value,
                          }))
                        }
                        disabled={busy}
                        aria-invalid={cacheTtlError ? true : undefined}
                      />
                      <p className="text-xs text-muted-foreground">
                        Set to 0 to disable caching. Default is 30 seconds.
                      </p>
                      {cacheTtlError ? (
                        <p className="text-xs text-destructive">{cacheTtlError}</p>
                      ) : null}
                    </CardContent>
                  </Card>
                ) : null}

                {activeSection === "performance" ? (
                  <Card className="border-border/60">
                    <CardHeader className="border-b">
                      <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary-soft text-primary">
                          <Gauge className="h-5 w-5" />
                        </div>
                        <div>
                          <CardTitle>Performance</CardTitle>
                          <CardDescription>
                            Additional performance controls will appear here.
                          </CardDescription>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="pt-6">
                      <div className="rounded-lg border border-dashed border-border/60 bg-muted/40 px-4 py-3 text-xs text-muted-foreground">
                        No performance settings yet. We will add options like prefetch, critical
                        CSS, and image strategy controls here.
                      </div>
                    </CardContent>
                  </Card>
                ) : null}
              </div>
            </div>
          </div>
        </div>

        <div className="sticky bottom-0 z-10 border-t border-border bg-card/90 px-6 py-4 backdrop-blur">
          <div className="mx-auto flex w-full max-w-5xl flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Checkbox
                checked={autoSaveEnabled}
                onCheckedChange={(checked) => setAutoSaveEnabled(Boolean(checked))}
                disabled={busy}
              />
              <span>Auto-save settings across all screens</span>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <Button
                size="sm"
                className="gap-2"
                onClick={handleSave}
                disabled={busy || hasValidationErrors}
              >
                <CheckCircle2 className="h-4 w-4" />
                {saving ? "Saving..." : "Save changes"}
              </Button>
            </div>
          </div>
        </div>
      </div>
      <ConfirmActionDialog
        open={Boolean(pendingRiskReview)}
        onOpenChange={(open) => {
          if (!open) setPendingRiskReview(null);
        }}
        title="Review site routing changes"
        description="These settings can affect admin access or public routing. Confirm before applying them."
        targetLabel={(pendingRiskReview ?? []).join(", ")}
        confirmLabel="Apply site changes"
        confirmingLabel="Applying..."
        tone="warning"
        closeOnSuccess
        onConfirm={async () => {
          await performSave();
        }}
      >
        Keep a rollback path ready before changing admin URLs, default pages, preview access, or
        content route patterns.
      </ConfirmActionDialog>
    </SettingsShell>
  );
}
