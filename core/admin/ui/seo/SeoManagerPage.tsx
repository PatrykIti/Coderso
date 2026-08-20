import { useCallback, useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  CheckCircle2,
  Filter,
  Gauge,
  RefreshCw,
  Search,
  SearchCheck,
  Send,
} from "lucide-react";
import { toast } from "sonner";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { isApiClientError } from "@/services/apiClient";
import { cacheKeys } from "@/services/cachePolicy";
import {
  getCachedSeo,
  getCachedSeoOverview,
  getSeoOverview,
  listSeoCached,
  runSeoAudit,
  submitSitemap,
  syncSearchPerformance,
  updateSeo,
  type SeoAuditCheckId,
  type SeoDocumentItem,
} from "@/services/seoClient";
import { AdminShell } from "@/ui/layouts/AdminShell";
import { PageHeader } from "@/ui/shared/PageHeader";
import { StatCard } from "@/ui/shared/StatCard";
import { subscribeCacheEvents } from "@/utils/cacheBus";
import type { SeoOverview } from "../../../services/seo/seoTypes";

import { SeoAuditDialog } from "./SeoAuditDialog";
import { SeoDrawer } from "./SeoDrawer";
import { SeoPerformancePanel } from "./SeoPerformancePanel";
import { SeoTable, type SeoItem } from "./SeoTable";

type SeoFilter = "all" | "optimized" | "needs-work" | "critical";

const filterOptions: Array<{ value: SeoFilter; label: string }> = [
  { value: "all", label: "All pages" },
  { value: "optimized", label: "Optimized" },
  { value: "needs-work", label: "Needs work" },
  { value: "critical", label: "Critical" },
];

// Silent failure boundary for the optional mount-time overview fetch: the list
// still renders when the overview request fails (matches the page's existing
// error-isolation behaviour for background reads).
const noop = () => undefined;

function getHealth(item: SeoItem): Exclude<SeoFilter, "all"> {
  if (item.score >= 80) return "optimized";
  if (item.score >= 50) return "needs-work";
  return "critical";
}

const resolveMetaStatus = (description: string) => {
  if (!description.trim()) return "missing";
  if (description.trim().length < 70) return "short";
  return "optimized";
};

const resolveAnalysisStatus = (status: SeoDocumentItem["status"]) =>
  status === "ok" ? "passed" : "attention";

const resolvePreviewInfo = (slug: string | null) => {
  const path = slug ? (slug.startsWith("/") ? slug : `/${slug}`) : "/";
  const previewPath = path.replace(/^\//, "");
  const baseUrl = typeof window !== "undefined" ? window.location.origin : "https://coderso.local";
  return { path, previewUrl: baseUrl, previewPath };
};

const mapSeoItem = (item: SeoDocumentItem): SeoItem => {
  const targetTitle = item.targetTitle ?? item.title ?? item.slug ?? item.targetId;
  const metaTitle = item.title ?? targetTitle;
  const metaDescription = item.description ?? "";
  const { path, previewUrl, previewPath } = resolvePreviewInfo(item.slug);
  return {
    id: item.id,
    title: targetTitle,
    path,
    score: item.score ?? 0,
    lastAuditAt: item.lastAuditAt,
    metaStatus: resolveMetaStatus(metaDescription),
    socialStatus: "missing",
    metaTitle,
    metaDescription,
    canonicalUrl: item.canonicalUrl ?? "",
    robots: item.robots ?? "",
    keywords: [],
    previewUrl,
    previewPath,
    analysisStatus: resolveAnalysisStatus(item.status),
    analysisNotes: item.issues.length
      ? item.issues.map((issue) => issue.message)
      : ["No issues found in the last audit."],
  };
};

const createInitialSeoState = () => {
  const cached = getCachedSeo();
  return {
    items: cached ? cached.map(mapSeoItem) : [],
    hasCache: Boolean(cached),
  };
};

export function SeoManagerPage() {
  const [initialState] = useState(createInitialSeoState);
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<SeoFilter>("all");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [auditDialogOpen, setAuditDialogOpen] = useState(false);
  const [items, setItems] = useState<SeoItem[]>(initialState.items);
  const [isLoading, setIsLoading] = useState(!initialState.hasCache);
  const [isAuditing, setIsAuditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // TASK-493-05-L01: real overview data (read-through cache) + write actions.
  const [overview, setOverview] = useState<SeoOverview | null>(getCachedSeoOverview);
  const [isSeoActionRunning, setIsSeoActionRunning] = useState(false);
  const [seoWriteDisabled, setSeoWriteDisabled] = useState(false);
  const [gscHint, setGscHint] = useState<string | null>(null);
  const [performanceRefreshKey, setPerformanceRefreshKey] = useState(0);

  const refresh = useCallback(async (options?: { force?: boolean; background?: boolean }) => {
    if (!options?.background) setIsLoading(true);
    setError(null);
    try {
      const result = await listSeoCached({ force: options?.force });
      setItems(result.map(mapSeoItem));
    } catch (err) {
      if (isApiClientError(err)) {
        setError(err.message);
      } else {
        setError("Failed to load SEO data.");
      }
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    let active = true;
    void Promise.resolve().then(() => {
      if (active)
        void refresh({ force: !initialState.hasCache, background: initialState.hasCache });
    });
    return () => {
      active = false;
    };
  }, [initialState.hasCache, refresh]);

  useEffect(() => {
    let active = true;
    void getSeoOverview()
      .then((value) => {
        if (active) setOverview(value);
      })
      .catch(noop);
    return () => {
      active = false;
    };
  }, []);

  const activeSelectedId =
    selectedId && items.some((item) => item.id === selectedId) ? selectedId : null;

  useEffect(() => {
    return subscribeCacheEvents((event) => {
      if (
        event.key === cacheKeys.seoList ||
        (activeSelectedId && event.key === cacheKeys.seoDetail(activeSelectedId))
      ) {
        void refresh({ force: event.action === "invalidate", background: true });
      }
    });
  }, [activeSelectedId, refresh]);

  const filteredItems = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    return items.filter((item) => {
      const matchesQuery =
        !normalizedQuery ||
        (item.title ?? "").toLowerCase().includes(normalizedQuery) ||
        (item.path ?? "").toLowerCase().includes(normalizedQuery);
      const matchesStatus = statusFilter === "all" || getHealth(item) === statusFilter;
      return matchesQuery && matchesStatus;
    });
  }, [items, query, statusFilter]);

  const selectedItem = items.find((item) => item.id === activeSelectedId) ?? null;

  const averageScore = useMemo(() => {
    const auditedItems = items.filter((item) => item.lastAuditAt);
    if (!auditedItems.length) return 0;
    const total = auditedItems.reduce((sum, item) => sum + item.score, 0);
    return Math.round(total / auditedItems.length);
  }, [items]);

  // TASK-479-26-L02: stat row derived from the loaded SeoItem[] (real fields only —
  // no fabricated deltas, no "Indexed pages" which has no backing DTO field).
  const seoStats = useMemo(() => {
    const scores = items.map((item) => item.score);
    const avg = scores.length
      ? Math.round(scores.reduce((sum, score) => sum + score, 0) / scores.length)
      : 0;
    return {
      avg,
      issues: items.reduce(
        (count, item) =>
          count + (item.analysisStatus === "attention" ? item.analysisNotes.length : 0),
        0
      ),
      optimized: items.filter((item) => item.metaStatus === "optimized").length,
      warnings: items.filter((item) => item.metaStatus === "short" || item.metaStatus === "missing")
        .length,
    };
  }, [items]);

  const hasAuditRun = items.some((item) => item.lastAuditAt);
  const scanLabel = isAuditing
    ? "Global Scan: Running"
    : hasAuditRun
      ? `Global Scan: ${averageScore}%`
      : "Audit not run";
  const lastScanLabel = isAuditing
    ? "Running now"
    : hasAuditRun
      ? "Latest audit available"
      : "Not run yet";

  const emptyState = useMemo(() => {
    if (items.length === 0) {
      return {
        title: "No SEO pages found",
        description: "Run a full audit to scan available pages and entries.",
        actionLabel: "Run Full Audit",
      };
    }
    if (query.trim() || statusFilter !== "all") {
      return {
        title: "No pages match these filters",
        description: "Adjust the search term or status filter to widen the table.",
      };
    }
    return {
      title: "No SEO pages found",
      description: "Run a full audit to scan available pages and entries.",
      actionLabel: "Run Full Audit",
    };
  }, [items.length, query, statusFilter]);

  const handleAudit = async (checks: SeoAuditCheckId[]) => {
    setIsAuditing(true);
    setError(null);
    try {
      await runSeoAudit({ checks });
      await refresh({ force: true });
      toast.success("SEO audit completed.");
    } catch (err) {
      if (isApiClientError(err)) {
        setError(err.message);
        toast.error(err.message);
      } else {
        const message = "Failed to run SEO audit.";
        setError(message);
        toast.error(message);
      }
    } finally {
      setIsAuditing(false);
    }
  };

  const handleSave = async (
    id: string,
    payload: { title: string; description: string; canonicalUrl: string; robots: string }
  ) => {
    setIsSaving(true);
    setError(null);
    try {
      await updateSeo(id, {
        title: payload.title,
        description: payload.description,
        canonicalUrl: payload.canonicalUrl,
        robots: payload.robots,
      });
      await refresh({ force: true });
      toast.success("SEO updated.");
    } catch (err) {
      if (isApiClientError(err)) {
        setError(err.message);
        toast.error(err.message);
      } else {
        const message = "Failed to update SEO data.";
        setError(message);
        toast.error(message);
      }
    } finally {
      setIsSaving(false);
    }
  };

  // TASK-493-05-L01: shared handler for the SEO write actions (sync + sitemap
  // submit). Both POSTs require settings:write server-side, so a 403 disables
  // the pair and a 409 gsc_not_configured surfaces the connect hint; other
  // failures reuse the page's existing error/toast pattern.
  const runSeoWriteAction = useCallback(
    async (action: () => Promise<unknown>, successMessage: string, failureMessage: string) => {
      setIsSeoActionRunning(true);
      setError(null);
      setGscHint(null);
      try {
        await action();
        await refresh({ force: true });
        setOverview(await getSeoOverview({ force: true }));
        setPerformanceRefreshKey((key) => key + 1);
        toast.success(successMessage);
      } catch (err) {
        if (isApiClientError(err)) {
          if (err.status === 403) {
            setSeoWriteDisabled(true);
            toast.error("You don't have permission to sync or submit SEO data.");
          } else if (err.status === 409 && err.code === "gsc_not_configured") {
            setGscHint("Connect Google Search Console in Settings → Integrations.");
            toast.error(err.message);
          } else {
            setError(err.message);
            toast.error(err.message);
          }
        } else {
          setError(failureMessage);
          toast.error(failureMessage);
        }
      } finally {
        setIsSeoActionRunning(false);
      }
    },
    [refresh]
  );

  const onSync = useCallback(
    () =>
      runSeoWriteAction(
        syncSearchPerformance,
        "Search performance synced.",
        "Failed to sync search performance."
      ),
    [runSeoWriteAction]
  );

  const onSubmitSitemap = useCallback(
    () => runSeoWriteAction(submitSitemap, "Sitemap submitted.", "Failed to submit the sitemap."),
    [runSeoWriteAction]
  );

  return (
    <AdminShell activeHref="/admin/seo" showSearch={false} breadcrumbs={["Admin", "SEO Manager"]}>
      <div className="mx-auto flex max-w-6xl flex-col gap-6">
        <PageHeader
          title="SEO Manager"
          description="Monitor page metadata, SEO scores, and quick fixes in one place."
          icon={<Gauge />}
          actions={
            <>
              <Badge variant="soft" className="text-[10px] font-semibold uppercase tracking-wide">
                {scanLabel}
              </Badge>
              <Button
                className="gap-1.5"
                variant="outline"
                onClick={onSync}
                disabled={isSeoActionRunning || seoWriteDisabled}
                title={
                  seoWriteDisabled ? "You don't have permission to modify SEO settings." : undefined
                }
              >
                <RefreshCw className="size-4" />
                Sync performance
              </Button>
              <Button
                className="gap-1.5"
                variant="outline"
                onClick={onSubmitSitemap}
                disabled={isSeoActionRunning || seoWriteDisabled}
                title={
                  seoWriteDisabled ? "You don't have permission to modify SEO settings." : undefined
                }
              >
                <Send className="size-4" />
                Submit sitemap
              </Button>
              <Button
                className="gap-1.5"
                onClick={() => setAuditDialogOpen(true)}
                disabled={isAuditing}
              >
                <SearchCheck className="size-4" />
                Run Full Audit
              </Button>
            </>
          }
        />

        {/* Stat row — the 479-26-L02 4-up (Avg score / Issues / Optimized pages /
            Warnings) stays as-is; 05-L01 adds a fifth card from real overview data. */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-5">
          <StatCard label="Avg. score" value={`${seoStats.avg}/100`} icon={<Gauge />} />
          <StatCard label="Issues" value={seoStats.issues} icon={<AlertTriangle />} />
          <StatCard label="Optimized pages" value={seoStats.optimized} icon={<CheckCircle2 />} />
          <StatCard label="Warnings" value={seoStats.warnings} icon={<AlertTriangle />} />
          <StatCard
            label="Indexed pages"
            value={overview?.indexedPages ?? 0}
            icon={<SearchCheck />}
          />
        </div>

        {gscHint ? (
          <Alert>
            <AlertTitle>Google Search Console not connected</AlertTitle>
            <AlertDescription>{gscHint}</AlertDescription>
          </Alert>
        ) : null}

        <SeoPerformancePanel refreshKey={performanceRefreshKey} />

        <div className="flex flex-col gap-3 rounded-2xl border border-border bg-card p-3 shadow-soft lg:flex-row lg:items-center lg:justify-between">
          <div className="flex flex-wrap items-center gap-2">
            {filterOptions.map((option) => (
              <Button
                key={option.value}
                variant={statusFilter === option.value ? "secondary" : "ghost"}
                size="sm"
                onClick={() => setStatusFilter(option.value)}
              >
                {option.label}
              </Button>
            ))}
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              disabled
              aria-label="Advanced SEO filters unavailable"
              title="Advanced SEO filters unavailable"
            >
              <Filter className="h-4 w-4" />
            </Button>
          </div>
          <div className="flex flex-1 items-center justify-end gap-3">
            <div className="relative w-full sm:max-w-xs">
              <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search pages…"
                className="pl-9"
              />
            </div>
            <span className="hidden whitespace-nowrap text-xs text-muted-foreground sm:inline">
              {filteredItems.length} pages · {lastScanLabel}
            </span>
          </div>
        </div>

        {error ? (
          <Alert variant="destructive">
            <AlertTitle>SEO data unavailable</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        ) : null}

        {isLoading ? (
          <div className="rounded-xl border border-dashed bg-muted/30 p-8 text-center text-sm text-muted-foreground">
            Loading SEO data...
          </div>
        ) : (
          <SeoTable
            items={filteredItems}
            activeId={activeSelectedId}
            onEdit={setSelectedId}
            emptyState={emptyState}
            onEmptyAction={() => setAuditDialogOpen(true)}
            emptyActionDisabled={isAuditing}
          />
        )}
      </div>

      <SeoDrawer
        key={activeSelectedId ?? "empty"}
        item={selectedItem}
        open={Boolean(selectedItem)}
        onOpenChange={(nextOpen) => {
          if (!nextOpen) setSelectedId(null);
        }}
        onSave={handleSave}
        isSaving={isSaving}
        error={error}
      />
      <SeoAuditDialog
        open={auditDialogOpen}
        onOpenChange={setAuditDialogOpen}
        onRun={handleAudit}
        isRunning={isAuditing}
      />
    </AdminShell>
  );
}
