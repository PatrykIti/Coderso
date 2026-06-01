import { useCallback, useEffect, useMemo, useState } from "react";
import { Filter, Search, SearchCheck } from "lucide-react";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { isApiClientError } from "@/services/apiClient";
import { cacheKeys } from "@/services/cachePolicy";
import {
  listSeo,
  runSeoAudit,
  updateSeo,
  type SeoAuditCheckId,
  type SeoDocumentItem,
} from "@/services/seoClient";
import { AdminShell } from "@/ui/layouts/AdminShell";
import { subscribeCacheEvents } from "@/utils/cacheBus";

import { SeoAuditDialog } from "./SeoAuditDialog";
import { SeoDrawer } from "./SeoDrawer";
import { SeoTable, type SeoItem } from "./SeoTable";

type SeoFilter = "all" | "optimized" | "needs-work" | "critical";

const filterOptions: Array<{ value: SeoFilter; label: string }> = [
  { value: "all", label: "All pages" },
  { value: "optimized", label: "Optimized" },
  { value: "needs-work", label: "Needs work" },
  { value: "critical", label: "Critical" },
];

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
  const metaTitle = item.title ?? item.targetTitle;
  const metaDescription = item.description ?? "";
  const { path, previewUrl, previewPath } = resolvePreviewInfo(item.slug);
  return {
    id: item.id,
    title: item.targetTitle,
    path,
    score: item.score ?? 0,
    lastAuditAt: item.lastAuditAt,
    metaStatus: resolveMetaStatus(metaDescription),
    socialStatus: "missing",
    metaTitle,
    metaDescription,
    keywords: [],
    previewUrl,
    previewPath,
    analysisStatus: resolveAnalysisStatus(item.status),
    analysisNotes: item.issues.length
      ? item.issues.map((issue) => issue.message)
      : ["No issues found in the last audit."],
  };
};

export function SeoManagerPage() {
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<SeoFilter>("all");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [auditDialogOpen, setAuditDialogOpen] = useState(false);
  const [items, setItems] = useState<SeoItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isAuditing, setIsAuditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const result = await listSeo();
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
    listSeo()
      .then((result) => {
        if (active) setItems(result.map(mapSeoItem));
      })
      .catch((err) => {
        if (!active) return;
        if (isApiClientError(err)) {
          setError(err.message);
        } else {
          setError("Failed to load SEO data.");
        }
      })
      .finally(() => {
        if (active) setIsLoading(false);
      });
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
        void refresh();
      }
    });
  }, [activeSelectedId, refresh]);

  const filteredItems = useMemo(() => {
    return items.filter((item) => {
      const matchesQuery =
        !query ||
        item.title.toLowerCase().includes(query.toLowerCase()) ||
        item.path.toLowerCase().includes(query.toLowerCase());
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
      await refresh();
    } catch (err) {
      if (isApiClientError(err)) {
        setError(err.message);
      } else {
        setError("Failed to run SEO audit.");
      }
    } finally {
      setIsAuditing(false);
    }
  };

  const handleSave = async (id: string, payload: { title: string; description: string }) => {
    setIsSaving(true);
    setError(null);
    try {
      await updateSeo(id, {
        title: payload.title,
        description: payload.description,
      });
      await refresh();
    } catch (err) {
      if (isApiClientError(err)) {
        setError(err.message);
      } else {
        setError("Failed to update SEO data.");
      }
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <AdminShell activeHref="/admin/seo" showSearch={false} breadcrumbs={["Admin", "SEO Manager"]}>
      <div className="mx-auto flex max-w-6xl flex-col gap-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-3">
              <h1 className="text-3xl font-semibold tracking-tight">SEO Manager</h1>
              <Badge
                variant="secondary"
                className="text-[10px] font-semibold uppercase tracking-wide"
              >
                {scanLabel}
              </Badge>
            </div>
            <p className="text-sm text-muted-foreground">
              Monitor page metadata, SEO scores, and quick fixes in one place.
            </p>
          </div>
          <div className="flex w-full flex-col gap-3 sm:flex-row sm:items-center sm:justify-end">
            <div className="relative w-full sm:max-w-xs">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search pages..."
                className="pl-9"
              />
            </div>
            <Button
              className="gap-2"
              onClick={() => setAuditDialogOpen(true)}
              disabled={isAuditing}
            >
              <SearchCheck className="h-4 w-4" />
              Run Full Audit
            </Button>
          </div>
        </div>

        <div className="flex flex-col gap-3 rounded-xl border bg-card/60 p-3 shadow-sm lg:flex-row lg:items-center lg:justify-between">
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
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Badge variant="outline" className="text-xs">
              {filteredItems.length} pages
            </Badge>
            <span>Last scan: {lastScanLabel}</span>
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
