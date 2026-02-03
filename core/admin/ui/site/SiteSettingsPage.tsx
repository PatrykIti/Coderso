import { useEffect, useMemo, useState } from "react";
import {
  CheckCircle2,
  Eye,
  Globe,
  Home,
  LayoutList,
  Settings2,
} from "lucide-react";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";
import { isApiClientError } from "@/services/apiClient";
import { listContentTypes, type ContentTypeSummary } from "@/services/contentTypesClient";
import { listPages, previewPage, type PageSummary } from "@/services/pagesClient";
import {
  getSiteSettings,
  updateSiteSettings,
  type SiteSettingsResponse,
} from "@/services/siteSettingsClient";
import { SettingsShell } from "@/ui/layouts/SettingsShell";
import { useAdminBasePath } from "@/ui/contexts/AdminBasePathContext";
import { resolveAdminHref } from "@/utils/adminPaths";
import { SettingsSidebar } from "@/ui/settings/SettingsSidebar";

import { SiteRouteEditor } from "./SiteRouteEditor";
import {
  buildDefaultRoute,
  mergeContentRoutes,
  normalizeRouteInput,
  validateContentRoutes,
  type SiteContentRouteForm,
} from "./siteSettingsValidation";

type SiteSettingsForm = {
  publicBaseUrl: string;
  homepageId: string | null;
  notFoundPageId: string | null;
  previewEnabled: boolean;
  cacheTtlSeconds: string;
  contentRoutes: SiteContentRouteForm[];
};

type SiteStep = "base" | "pages" | "routes";

type StepConfig = {
  id: SiteStep;
  title: string;
  description: string;
};

const steps: StepConfig[] = [
  {
    id: "base",
    title: "Base URL",
    description: "Define where the public site lives.",
  },
  {
    id: "pages",
    title: "Homepage & 404",
    description: "Pick default pages and preview behavior.",
  },
  {
    id: "routes",
    title: "Content routes",
    description: "Configure list and detail URLs for entries.",
  },
];

const defaultForm: SiteSettingsForm = {
  publicBaseUrl: "",
  homepageId: null,
  notFoundPageId: null,
  previewEnabled: true,
  cacheTtlSeconds: "30",
  contentRoutes: [],
};

const toFormValues = (settings: SiteSettingsResponse): SiteSettingsForm => ({
  publicBaseUrl: settings.publicBaseUrl ?? "",
  homepageId: settings.homepageId ?? null,
  notFoundPageId: settings.notFoundPageId ?? null,
  previewEnabled: settings.previewEnabled ?? true,
  cacheTtlSeconds: `${settings.cacheTtlSeconds ?? 30}`,
  contentRoutes: settings.contentRoutes ?? [],
});

const validateBaseUrl = (value: string) => {
  const trimmed = value.trim();
  if (!trimmed) return null;
  try {
    const parsed = new URL(trimmed);
    const host = parsed.hostname.toLowerCase();
    if (parsed.protocol !== "https:") {
      if (host !== "localhost" && host !== "127.0.0.1") {
        return "HTTPS is required for non-localhost URLs.";
      }
    }
    return null;
  } catch {
    return "Enter a valid URL (e.g. https://example.com).";
  }
};

const resolvePublicBaseUrl = (value: string) => {
  const trimmed = value.trim();
  if (trimmed) return trimmed.replace(/\/$/, "");
  if (typeof window === "undefined") return "";
  return window.location.origin;
};

export function SiteSettingsPage() {
  const adminBasePath = useAdminBasePath();
  const [form, setForm] = useState<SiteSettingsForm>(defaultForm);
  const [pages, setPages] = useState<PageSummary[]>([]);
  const [contentTypes, setContentTypes] = useState<ContentTypeSummary[]>([]);
  const [status, setStatus] = useState<"idle" | "loading" | "ready" | "error">(
    "idle"
  );
  const [error, setError] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saveSuccess, setSaveSuccess] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [activeStep, setActiveStep] = useState<SiteStep>("base");

  useEffect(() => {
    let active = true;
    setStatus("loading");
    setError(null);

    Promise.all([getSiteSettings(), listPages(), listContentTypes()])
      .then(([settings, pagesResult, typesResult]) => {
        if (!active) return;
        setForm((prev) => ({
          ...prev,
          ...toFormValues(settings),
        }));
        setPages(pagesResult);
        setContentTypes(typesResult);
        setStatus("ready");
      })
      .catch((err) => {
        if (!active) return;
        const message = isApiClientError(err)
          ? err.message
          : "Failed to load site settings.";
        setError(message);
        setStatus("error");
      });

    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (!contentTypes.length) return;
    setForm((prev) => ({
      ...prev,
      contentRoutes: mergeContentRoutes(prev.contentRoutes, contentTypes),
    }));
  }, [contentTypes]);

  const routeValidation = useMemo(
    () => validateContentRoutes(form.contentRoutes),
    [form.contentRoutes]
  );

  const publicBaseUrlError = validateBaseUrl(form.publicBaseUrl);
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
    publicBaseUrlError || homepageError || cacheTtlError || routeValidation.hasErrors
  );

  const busy = saving || status === "loading";

  const handleSave = async () => {
    if (hasValidationErrors) return;
    setSaveError(null);
    setSaveSuccess(null);
    setActionError(null);
    setSaving(true);
    try {
      const normalizedRoutes = form.contentRoutes.map((route) => ({
        ...route,
        listPath: normalizeRouteInput(route.listPath, true) ?? route.listPath,
        detailPath: normalizeRouteInput(route.detailPath, false) ?? route.detailPath,
      }));
      const updated = await updateSiteSettings({
        publicBaseUrl: form.publicBaseUrl.trim() || null,
        homepageId: form.homepageId,
        notFoundPageId: form.notFoundPageId,
        previewEnabled: form.previewEnabled,
        cacheTtlSeconds: Math.max(0, Math.floor(cacheTtlValue || 0)),
        contentRoutes: normalizedRoutes,
      });
      setForm((prev) => ({ ...prev, ...toFormValues(updated) }));
      setSaveSuccess("Site settings updated.");
    } catch (err) {
      const message = isApiClientError(err)
        ? err.message
        : "Failed to save site settings.";
      setSaveError(message);
    } finally {
      setSaving(false);
    }
  };

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
      const message = isApiClientError(err)
        ? err.message
        : "Failed to generate preview URL.";
      setActionError(message);
    }
  };

  const stepIndex = steps.findIndex((step) => step.id === activeStep);

  return (
    <SettingsShell
      activeHref="/admin/settings/site"
      showSearch={false}
      sidebar={<SettingsSidebar activeId="site" />}
      breadcrumbs={
        <div className="flex flex-col gap-1">
          <span className="text-base font-semibold text-foreground">
            Site Settings
          </span>
          <span className="text-xs text-muted-foreground">
            Configure homepage, preview, and content routing for the public site
          </span>
        </div>
      }
      topbarActions={
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleViewHomepage}
            disabled={busy}
          >
            View homepage
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={handleTestPreview}
            disabled={busy}
          >
            Test preview URL
          </Button>
        </div>
      }
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

            <div className="grid gap-6 lg:grid-cols-[240px_1fr]">
              <div className="space-y-4">
                <Card className="border-border/60">
                  <CardHeader className="border-b">
                    <CardTitle className="text-sm uppercase tracking-wider text-muted-foreground">
                      Setup steps
                    </CardTitle>
                    <CardDescription>
                      Follow the wizard to configure the public site.
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-3 pt-6">
                    {steps.map((step, index) => {
                      const isActive = step.id === activeStep;
                      const isComplete = index < stepIndex;
                      return (
                        <button
                          key={step.id}
                          type="button"
                          className={cn(
                            "flex w-full items-start gap-3 rounded-lg border px-3 py-3 text-left transition",
                            isActive
                              ? "border-primary/60 bg-primary/5"
                              : "border-transparent hover:border-border"
                          )}
                          onClick={() => setActiveStep(step.id)}
                        >
                          <div
                            className={cn(
                              "flex h-9 w-9 items-center justify-center rounded-full text-sm font-semibold",
                              isActive
                                ? "bg-primary text-primary-foreground"
                                : isComplete
                                  ? "bg-primary/10 text-primary"
                                  : "bg-muted text-muted-foreground"
                            )}
                          >
                            {index + 1}
                          </div>
                          <div>
                            <p className="text-sm font-semibold text-foreground">
                              {step.title}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {step.description}
                            </p>
                          </div>
                        </button>
                      );
                    })}
                  </CardContent>
                </Card>
              </div>
              <div className="space-y-6">
                {activeStep === "base" ? (
                  <>
                    <Card className="border-border/60">
                      <CardHeader className="border-b">
                        <div className="flex items-center gap-3">
                          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
                            <Globe className="h-5 w-5" />
                          </div>
                          <div>
                            <CardTitle>Public base URL</CardTitle>
                            <CardDescription>
                              Used for preview links and public routing.
                            </CardDescription>
                          </div>
                        </div>
                      </CardHeader>
                      <CardContent className="space-y-4 pt-6">
                        <div className="space-y-2">
                          <label
                            htmlFor="site-public-base-url"
                            className="text-xs font-semibold uppercase tracking-wider text-muted-foreground"
                          >
                            Public site URL
                          </label>
                          <Input
                            id="site-public-base-url"
                            value={form.publicBaseUrl}
                            placeholder="https://www.example.com"
                            onChange={(event) =>
                              setForm((prev) => ({
                                ...prev,
                                publicBaseUrl: event.target.value,
                              }))
                            }
                            disabled={busy}
                            aria-invalid={publicBaseUrlError ? true : undefined}
                          />
                          <p className="text-xs text-muted-foreground">
                            Preview URLs use this host. Leave blank to use the
                            current domain.
                          </p>
                          {publicBaseUrlError ? (
                            <p className="text-xs text-destructive">
                              {publicBaseUrlError}
                            </p>
                          ) : null}
                        </div>
                        <div className="rounded-lg border border-dashed border-border/60 bg-muted/40 px-4 py-3 text-xs text-muted-foreground">
                          Admin base URL is managed in
                          <a
                            className="ml-1 text-primary underline-offset-4 hover:underline"
                            href={resolveAdminHref(
                              adminBasePath,
                              "/admin/settings/general"
                            )}
                          >
                            General Settings
                          </a>
                          .
                        </div>
                      </CardContent>
                    </Card>
                  </>
                ) : null}

                {activeStep === "pages" ? (
                  <>
                    <Card className="border-border/60">
                      <CardHeader className="border-b">
                        <div className="flex items-center gap-3">
                          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
                            <Home className="h-5 w-5" />
                          </div>
                          <div>
                            <CardTitle>Homepage & 404</CardTitle>
                            <CardDescription>
                              Choose the pages that represent your public entry
                              points.
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
                                  notFoundPageId:
                                    value === "none" ? null : value,
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
                            <a
                              className="ml-1 text-primary underline-offset-4 hover:underline"
                              href={resolveAdminHref(adminBasePath, "/admin/pages")}
                            >
                              Pages section
                            </a>
                            .
                          </div>
                        ) : null}
                      </CardContent>
                    </Card>

                    <Card className="border-border/60">
                      <CardHeader className="border-b">
                        <div className="flex items-center gap-3">
                          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
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
                      <CardContent className="flex items-center justify-between gap-4 pt-6">
                        <div>
                          <p className="text-sm font-medium">Preview enabled</p>
                          <p className="text-xs text-muted-foreground">
                            Disable to block all preview URLs.
                          </p>
                        </div>
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
                      </CardContent>
                    </Card>
                  </>
                ) : null}

                {activeStep === "routes" ? (
                  <>
                    <Card className="border-border/60">
                      <CardHeader className="border-b">
                        <div className="flex items-center gap-3">
                          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
                            <LayoutList className="h-5 w-5" />
                          </div>
                          <div>
                            <CardTitle>Content routes</CardTitle>
                            <CardDescription>
                              Configure how each content type is published on the
                              public site.
                            </CardDescription>
                          </div>
                        </div>
                      </CardHeader>
                      <CardContent className="space-y-5 pt-6">
                        {contentTypes.length === 0 ? (
                          <div className="rounded-lg border border-dashed border-border/60 bg-muted/40 px-4 py-3 text-xs text-muted-foreground">
                            No content types yet. Create one in
                            <a
                              className="ml-1 text-primary underline-offset-4 hover:underline"
                              href={resolveAdminHref(
                                adminBasePath,
                                "/admin/content-types"
                              )}
                            >
                              Content Types
                            </a>
                            .
                          </div>
                        ) : null}
                        {routeValidation.hasErrors ? (
                          <Alert variant="destructive">
                            <AlertTitle>Resolve route conflicts</AlertTitle>
                            <AlertDescription>
                              Fix highlighted paths before saving. Routes must be
                              unique across content types.
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

                    <Card className="border-border/60">
                      <CardHeader className="border-b">
                        <div className="flex items-center gap-3">
                          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
                            <Settings2 className="h-5 w-5" />
                          </div>
                          <div>
                            <CardTitle>Cache & performance</CardTitle>
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
                          <p className="text-xs text-destructive">
                            {cacheTtlError}
                          </p>
                        ) : null}
                      </CardContent>
                    </Card>
                  </>
                ) : null}
              </div>
            </div>
          </div>
        </div>

        <div className="sticky bottom-0 z-10 border-t bg-background/90 px-6 py-4 backdrop-blur">
          <div className="mx-auto flex w-full max-w-5xl flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Badge variant="secondary">Step {stepIndex + 1} of {steps.length}</Badge>
              <span>{steps[stepIndex]?.title}</span>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <Button
                variant="ghost"
                size="sm"
                onClick={() =>
                  setActiveStep(steps[Math.max(stepIndex - 1, 0)].id)
                }
                disabled={busy || stepIndex === 0}
              >
                Back
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() =>
                  setActiveStep(steps[Math.min(stepIndex + 1, steps.length - 1)].id)
                }
                disabled={busy || stepIndex === steps.length - 1}
              >
                Next
              </Button>
              <Button
                size="sm"
                className="gap-2"
                onClick={handleSave}
                disabled={busy || hasValidationErrors}
              >
                <CheckCircle2 className="h-4 w-4" />
                {busy ? "Saving..." : "Save changes"}
              </Button>
            </div>
          </div>
        </div>
      </div>
    </SettingsShell>
  );
}
