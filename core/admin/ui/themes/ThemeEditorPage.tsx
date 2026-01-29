import { Download, RefreshCcw, Save } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { isApiClientError } from "@/services/apiClient";
import {
  getThemeProfile,
  listThemes,
  updateThemeProfile,
  updateThemeRoutes,
  type ThemeMeta,
  type ThemeProfile,
} from "@/services/themeClient";
import { listPages, type PageSummary } from "@/services/pagesClient";
import { AdminShell } from "@/ui/layouts/AdminShell";

import { ThemePreviewPanel } from "./ThemePreviewPanel";
import { ThemeTokensEditor } from "./ThemeTokensEditor";
import { ThemeExportDialog } from "./ThemeExportDialog";
import type { ThemeRouteDraft } from "./ThemeRoutesEditor";
import type { DesignTokenOverrides } from "../../../services/theme/tokenTypes";
import { DEFAULT_TOKENS } from "../../../services/theme/tokenTypes";
import { mergeTokens } from "../../../services/theme/tokenUtils";

const resolveProfileId = (pathname: string) => {
  const parts = pathname.split("/").filter(Boolean);
  const themeIndex = parts.findIndex((segment) => segment === "themes");
  if (themeIndex === -1) return null;
  return parts[themeIndex + 1] ?? null;
};

const normalizeRoutePath = (value: string) => {
  const trimmed = value.trim();
  if (!trimmed) return "";
  if (trimmed === "/") return "/";
  const normalized = trimmed.startsWith("/") ? trimmed : `/${trimmed}`;
  return normalized.endsWith("/") ? normalized.slice(0, -1) : normalized;
};

const mapRoutesToDraft = (routes: ThemeProfile["routes"]): ThemeRouteDraft[] =>
  routes.map((route) => ({
    id: route.id,
    path: route.path,
    pageId: route.pageId,
  }));

type ThemeEditorPageProps = {
  profileId?: string;
  initialProfile?: ThemeProfile | null;
};

export function ThemeEditorPage({
  profileId: initialProfileId,
  initialProfile,
}: ThemeEditorPageProps) {
  const [profileId, setProfileId] = useState<string | null>(
    initialProfileId ?? initialProfile?.id ?? null
  );
  const [profile, setProfile] = useState<ThemeProfile | null>(
    initialProfile ?? null
  );
  const [themes, setThemes] = useState<ThemeMeta[]>([]);
  const [pages, setPages] = useState<PageSummary[]>([]);
  const [tokens, setTokens] = useState<DesignTokenOverrides>(
    (initialProfile?.tokens as DesignTokenOverrides) ?? {}
  );
  const [routes, setRoutes] = useState<ThemeRouteDraft[]>(
    initialProfile?.routes ? mapRoutesToDraft(initialProfile.routes) : []
  );
  const [tokensValid, setTokensValid] = useState(true);
  const [baselineTokens, setBaselineTokens] = useState<DesignTokenOverrides>(
    (initialProfile?.tokens as DesignTokenOverrides) ?? {}
  );
  const [baselineRoutes, setBaselineRoutes] = useState<ThemeRouteDraft[]>(
    initialProfile?.routes ? mapRoutesToDraft(initialProfile.routes) : []
  );
  const [isLoading, setIsLoading] = useState(!initialProfile);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [exportOpen, setExportOpen] = useState(false);

  useEffect(() => {
    if (profileId || typeof window === "undefined") return;
    setProfileId(resolveProfileId(window.location.pathname));
  }, [profileId]);

  const loadProfile = async (id: string) => {
    setIsLoading(true);
    setError(null);
    try {
      const [profileResult, themesResult, pagesResult] = await Promise.all([
        getThemeProfile(id),
        listThemes(),
        listPages(),
      ]);
      setProfile(profileResult);
      setThemes(themesResult.items);
      setPages(pagesResult);
      const nextTokens = (profileResult.tokens ?? {}) as DesignTokenOverrides;
      const nextRoutes = mapRoutesToDraft(profileResult.routes ?? []);
      setTokens(nextTokens);
      setRoutes(nextRoutes);
      setBaselineTokens(nextTokens);
      setBaselineRoutes(nextRoutes);
    } catch (err) {
      if (isApiClientError(err)) {
        setError(err.message);
      } else {
        setError("Failed to load theme profile.");
      }
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (!profileId) return;
    if (initialProfile) return;
    void loadProfile(profileId);
  }, [profileId, initialProfile]);

  const themeMeta = useMemo(
    () => themes.find((theme) => theme.name === profile?.themeName) ?? null,
    [themes, profile]
  );

  const resolvedTokens = useMemo(() => {
    const withThemeDefaults = mergeTokens(
      DEFAULT_TOKENS,
      (themeMeta?.tokens ?? {}) as DesignTokenOverrides
    );
    return mergeTokens(withThemeDefaults, tokens);
  }, [themeMeta, tokens]);

  const routesError = useMemo(() => {
    const seen = new Set<string>();
    for (const route of routes) {
      const normalized = normalizeRoutePath(route.path);
      if (!normalized) {
        return "Each route needs a valid path.";
      }
      if (seen.has(normalized)) {
        return "Duplicate route paths are not allowed.";
      }
      seen.add(normalized);
    }
    return null;
  }, [routes]);

  const isDirty =
    JSON.stringify(tokens) !== JSON.stringify(baselineTokens) ||
    JSON.stringify(routes) !== JSON.stringify(baselineRoutes);

  const dispatchThemeUpdated = () => {
    if (typeof window === "undefined") return;
    window.dispatchEvent(new CustomEvent("theme:updated"));
  };

  const handleSave = async () => {
    if (!profileId) return;
    if (!tokensValid || routesError) return;
    setIsSaving(true);
    setError(null);
    try {
      const updates: Promise<unknown>[] = [];
      if (JSON.stringify(tokens) !== JSON.stringify(baselineTokens)) {
        updates.push(updateThemeProfile(profileId, { tokens }));
      }
      if (JSON.stringify(routes) !== JSON.stringify(baselineRoutes)) {
        const payload = routes.map((route) => ({
          path: normalizeRoutePath(route.path),
          pageId: route.pageId,
        }));
        updates.push(updateThemeRoutes(profileId, payload));
      }
      if (updates.length > 0) {
        await Promise.all(updates);
        await loadProfile(profileId);
        dispatchThemeUpdated();
      }
    } catch (err) {
      if (isApiClientError(err)) {
        setError(err.message);
      } else {
        setError("Failed to save theme profile.");
      }
    } finally {
      setIsSaving(false);
    }
  };

  const handleReset = () => {
    setTokens(baselineTokens);
    setRoutes(baselineRoutes);
    setTokensValid(true);
  };

  const lastSavedLabel = profile?.updatedAt
    ? new Date(profile.updatedAt).toLocaleString()
    : "Not saved yet";

  return (
    <AdminShell
      activeHref="/admin/themes"
      contentClassName="p-0"
      showSearch={false}
      breadcrumbs={
        <div className="flex items-center gap-3 text-sm text-muted-foreground">
          <span>Settings</span>
          <span>/</span>
          <span className="text-foreground">
            {profile?.name ?? "Theme Editor"}
          </span>
          <Separator orientation="vertical" className="h-4" />
          <Badge className="bg-emerald-100 text-[10px] uppercase tracking-wide text-emerald-700">
            {profile?.isActive ? "Live" : "Draft"}
          </Badge>
          <span className="text-xs italic text-muted-foreground/80">
            Last saved {lastSavedLabel}
          </span>
        </div>
      }
      topbarActions={
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            className="gap-2"
            onClick={handleReset}
            disabled={!isDirty || isSaving}
          >
            <RefreshCcw className="h-4 w-4" />
            Reset
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="gap-2"
            onClick={() => setExportOpen(true)}
          >
            <Download className="h-4 w-4" />
            Export
          </Button>
          <Button
            size="sm"
            className="gap-2 shadow-sm"
            onClick={handleSave}
            disabled={!isDirty || isSaving || !tokensValid || Boolean(routesError)}
          >
            <Save className="h-4 w-4" />
            {isSaving ? "Saving..." : "Save Changes"}
          </Button>
        </div>
      }
    >
      {error ? (
        <div className="border-b bg-rose-50 px-6 py-3 text-sm text-rose-600">
          {error}
        </div>
      ) : null}
      {isLoading ? (
        <div className="p-6 text-sm text-muted-foreground">Loading theme profile...</div>
      ) : null}
      {!isLoading && !profile ? (
        <div className="p-6 text-sm text-muted-foreground">Theme profile not found.</div>
      ) : null}
      {!isLoading && profile ? (
        <div className="flex min-h-[calc(100vh-4rem)] flex-col bg-muted/30 xl:flex-row">
          <section className="flex-1 border-b bg-muted/20 xl:border-b-0">
            <ThemePreviewPanel />
          </section>
          <aside className="w-full border-t bg-background xl:w-[480px] xl:border-l xl:border-t-0">
            <ThemeTokensEditor
              value={tokens}
              resolvedTokens={resolvedTokens}
              routes={routes}
              pages={pages.map((page) => ({ id: page.id, title: page.title }))}
              routesError={routesError}
              onChange={setTokens}
              onRoutesChange={setRoutes}
              onValidityChange={setTokensValid}
            />
          </aside>
        </div>
      ) : null}
      <ThemeExportDialog open={exportOpen} onOpenChange={setExportOpen} />
    </AdminShell>
  );
}
