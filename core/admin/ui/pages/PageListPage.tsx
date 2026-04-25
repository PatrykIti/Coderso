import { Plus } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { isApiClientError } from "@/services/apiClient";
import { cacheKeys } from "@/services/cachePolicy";
import {
  createPage,
  deletePage,
  duplicatePage,
  getCachedPages,
  listPagesCached,
  previewPage,
  publishPage,
  type PageSummary,
  unpublishPage,
} from "@/services/pagesClient";
import {
  getUserSettings,
  setUserSetting,
} from "@/services/userSettingsClient";
import { AdminShell } from "@/ui/layouts/AdminShell";
import { ConfirmActionDialog } from "@/ui/shared/ConfirmActionDialog";
import { ListPaginationFooter } from "@/ui/shared/ListPaginationFooter";
import { createListActionToastAdapter } from "@/ui/shared/listActionToasts";
import { PageHeader } from "@/ui/shared/PageHeader";
import { useListPagination } from "@/ui/shared/useListPagination";
import { useAdminRouter } from "@/ui/contexts/AdminRouterContext";
import { subscribeCacheEvents } from "@/utils/cacheBus";
import { resolveCacheRefreshBackground } from "@/utils/cacheRefresh";

import { PageFilters } from "./PageFilters";
import { PageBulkActionsBar, type PageBulkActionValue } from "./PageBulkActionsBar";
import { PageTable } from "./PageTable";
import { PageCreateDrawer } from "./PageCreateDrawer";

const pageListToasts = createListActionToastAdapter({
  labels: { singular: "page", plural: "pages" },
  actions: {
    create: { pastTense: "created", failureVerb: "create" },
    publish: { pastTense: "published", failureVerb: "publish" },
    unpublish: { pastTense: "unpublished", failureVerb: "unpublish" },
    delete: { pastTense: "deleted", failureVerb: "delete" },
  },
});

export function filterPages(
  pages: PageSummary[],
  query: string,
  status: string,
  author: string
) {
  const normalized = query.trim().toLowerCase();
  return pages.filter((page) => {
    const matchesQuery =
      !normalized ||
      page.title.toLowerCase().includes(normalized) ||
      page.slug.toLowerCase().includes(normalized);
    const matchesStatus = status === "all" || page.status === status;
    const matchesAuthor = author === "any" || page.author?.id === author;
    return matchesQuery && matchesStatus && matchesAuthor;
  });
}

export function resolvePageListMountRefreshOptions(hasInitialCache: boolean) {
  return {
    force: !hasInitialCache,
    background: hasInitialCache,
  };
}

export function PageListPage() {
  const { navigate } = useAdminRouter();
  const initialCached = useMemo(() => getCachedPages(), []);
  const hasInitialCache = initialCached !== null;
  const [items, setItems] = useState<PageSummary[]>(() => initialCached ?? []);
  const [createOpen, setCreateOpen] = useState(false);
  const [drawerKey, setDrawerKey] = useState(0);
  const [isLoading, setIsLoading] = useState(() => !hasInitialCache);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [authorFilter, setAuthorFilter] = useState("any");
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [bulkAction, setBulkAction] = useState<PageBulkActionValue | "">("");
  const [isBulkWorking, setIsBulkWorking] = useState(false);
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [pendingBulkDeleteIds, setPendingBulkDeleteIds] = useState<string[]>([]);
  const [openAfterCreate, setOpenAfterCreate] = useState(true);
  const hasHydratedRef = useRef(hasInitialCache);

  const refresh = useCallback(
    async (options?: { force?: boolean; background?: boolean }) => {
      const force = options?.force ?? false;
      const background = resolveCacheRefreshBackground({
        explicitBackground: options?.background,
        hasHydrated: hasHydratedRef.current,
      });
      if (!background) {
        setIsLoading(true);
      }
      setError(null);
      try {
        const next = await listPagesCached({ force });
        setItems(next);
        hasHydratedRef.current = true;
      } catch (err) {
        if (isApiClientError(err)) {
          setError(err.message);
        } else {
          setError("Failed to load pages.");
        }
      } finally {
        if (!background) {
          setIsLoading(false);
        }
      }
    },
    []
  );

  useEffect(() => {
    const mountOptions = resolvePageListMountRefreshOptions(hasInitialCache);
    refresh(mountOptions).catch(() => undefined);
  }, [hasInitialCache, refresh]);

  useEffect(() => {
    return subscribeCacheEvents((event) => {
      if (event.key !== cacheKeys.pagesList) return;
      refresh({ force: true, background: true }).catch(() => undefined);
    });
  }, [refresh]);

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const prefs = await getUserSettings();
        if (!active) return;
        setOpenAfterCreate(prefs["pages.openAfterCreate"]);
      } catch {
        // Ignore preference load failures; defaults will be used.
      }
    })();
    return () => {
      active = false;
    };
  }, []);

  const authorOptions = useMemo(() => {
    const map = new Map<string, string>();
    items.forEach((item) => {
      if (!item.author) return;
      map.set(item.author.id, item.author.name ?? item.author.email);
    });
    return Array.from(map.entries())
      .map(([value, label]) => ({ value, label }))
      .sort((a, b) => a.label.localeCompare(b.label));
  }, [items]);

  const filteredItems = useMemo(
    () => filterPages(items, searchQuery, statusFilter, authorFilter),
    [items, searchQuery, statusFilter, authorFilter]
  );
  const pagination = useListPagination(filteredItems, {
    resetKey: JSON.stringify({
      searchQuery,
      statusFilter,
      authorFilter,
    }),
  });
  const visibleIds = useMemo(
    () => pagination.visibleRows.map((page) => page.id),
    [pagination.visibleRows]
  );
  const selectedCount = selectedIds.length;
  const isAllSelected =
    visibleIds.length > 0 && visibleIds.every((id) => selectedIds.includes(id));
  const isIndeterminate = selectedCount > 0 && !isAllSelected;

  useEffect(() => {
    setSelectedIds((prev) => {
      const next = prev.filter((id) => visibleIds.includes(id));
      return next.length === prev.length ? prev : next;
    });
  }, [visibleIds]);

  const handleCreate = async (payload: {
    title: string;
    slug: string;
    template?: string;
    openAfterCreate: boolean;
  }) => {
    setIsSubmitting(true);
    setError(null);
    try {
      const page = await createPage({
        title: payload.title,
        slug: payload.slug,
        template: payload.template,
        data: { blocks: [], settings: { template: payload.template } },
      });
      pageListToasts.success("create", { targetLabel: page.title });
      if (payload.openAfterCreate) {
        navigate(`/pages/${encodeURIComponent(page.id)}`);
        return;
      }
      await refresh({ force: true, background: true });
      setCreateOpen(false);
    } catch (err) {
      setError(pageListToasts.error("create", err));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEdit = (id: string) => {
    navigate(`/pages/${encodeURIComponent(id)}`);
  };

  const handlePreview = async (id: string) => {
    setError(null);
    try {
      const { previewUrl } = await previewPage(id);
      if (typeof window !== "undefined") {
        window.open(previewUrl, "_blank", "noopener");
      }
    } catch (err) {
      if (isApiClientError(err)) {
        setError(err.message);
      } else {
        setError("Failed to generate preview.");
      }
    }
  };

  const handlePublish = async (id: string) => {
    setError(null);
    try {
      await publishPage(id);
      await refresh({ force: true, background: true });
      pageListToasts.success("publish");
    } catch (err) {
      setError(pageListToasts.error("publish", err));
    }
  };

  const handleUnpublish = async (id: string) => {
    setError(null);
    try {
      await unpublishPage(id);
      await refresh({ force: true, background: true });
      pageListToasts.success("unpublish");
    } catch (err) {
      setError(pageListToasts.error("unpublish", err));
    }
  };

  const handleDuplicate = async (id: string) => {
    setError(null);
    try {
      const clone = await duplicatePage(id);
      navigate(`/pages/${encodeURIComponent(clone.id)}`);
    } catch (err) {
      if (isApiClientError(err)) {
        setError(err.message);
      } else {
        setError("Failed to duplicate page.");
      }
    }
  };

  const runDelete = async (id: string) => {
    setDeletingId(id);
    setError(null);
    try {
      await deletePage(id);
      await refresh({ force: true, background: true });
      pageListToasts.success("delete");
      setPendingDeleteId(null);
    } catch (err) {
      setError(pageListToasts.error("delete", err));
    } finally {
      setDeletingId(null);
    }
  };

  const handleDelete = (id: string) => {
    setPendingDeleteId(id);
  };

  const handleTogglePage = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((pageId) => pageId !== id) : [...prev, id]
    );
  };

  const handleToggleAll = () => {
    setSelectedIds(isAllSelected ? [] : visibleIds);
  };

  const handleClearSelection = () => {
    setSelectedIds([]);
    setBulkAction("");
  };

  const runBulkAction = async (
    action: PageBulkActionValue,
    ids: string[]
  ) => {
    if (ids.length === 0) return;
    setIsBulkWorking(true);
    setError(null);
    try {
      const results = await Promise.allSettled(
        ids.map((id) => {
          if (action === "publish") return publishPage(id);
          if (action === "unpublish") return unpublishPage(id);
          return deletePage(id);
        })
      );
      await refresh({ force: true, background: true });
      const summary = pageListToasts.summarizeBulkAction(action, ids, results);
      pageListToasts.emitBulk(summary);
      if (!summary.ok) {
        setError(summary.inlineMessage);
      }
      handleClearSelection();
    } catch (err) {
      setError(
        pageListToasts.error("publish", err, {
          fallbackMessage: "Bulk action failed.",
        })
      );
    } finally {
      setIsBulkWorking(false);
      setPendingBulkDeleteIds([]);
    }
  };

  const handleBulkApply = () => {
    if (!bulkAction || selectedIds.length === 0) return;
    if (bulkAction === "delete") {
      setPendingBulkDeleteIds(selectedIds);
      return;
    }
    void runBulkAction(bulkAction, selectedIds);
  };

  const handleDrawerOpenChange = (next: boolean) => {
    setCreateOpen(next);
    if (next) {
      setDrawerKey((prev) => prev + 1);
    }
  };

  const handleOpenAfterCreateChange = async (next: boolean) => {
    setOpenAfterCreate(next);
    try {
      await setUserSetting("pages.openAfterCreate", next);
    } catch {
      // Keep UI responsive even if preference persistence fails.
    }
  };

  return (
    <AdminShell
      activeHref="/admin/pages"
      breadcrumbs={
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <span>Content</span>
          <span>/</span>
          <span className="text-foreground">Pages</span>
        </div>
      }
    >
      <div className="mx-auto flex max-w-6xl flex-col gap-6">
        <PageHeader
          title="Pages"
          description="Manage your content and page structures."
          actions={
            <>
              {selectedCount > 0 ? (
                <PageBulkActionsBar
                  selectedCount={selectedCount}
                  action={bulkAction}
                  onActionChange={setBulkAction}
                  onApply={handleBulkApply}
                  onClear={handleClearSelection}
                  isApplying={isBulkWorking}
                  variant="inline"
                />
              ) : null}
              <Button className="gap-2" onClick={() => setCreateOpen(true)}>
                <Plus className="h-4 w-4" />
                New
              </Button>
            </>
          }
        />
        {error ? (
          <Alert variant="destructive">
            <AlertTitle>Pages API error</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        ) : null}
        <PageFilters
          search={searchQuery}
          status={statusFilter}
          author={authorFilter}
          authorOptions={authorOptions}
          onSearchChange={setSearchQuery}
          onStatusChange={setStatusFilter}
          onAuthorChange={setAuthorFilter}
        />
        {isLoading ? (
          <div className="rounded-xl border bg-card/60 p-6 text-sm text-muted-foreground shadow-sm">
            Loading pages...
          </div>
        ) : (
          <PageTable
            items={pagination.visibleRows}
            emptyMessage={
              items.length > 0
                ? "No pages match your current filters."
                : undefined
            }
            selectedIds={selectedIds}
            isAllSelected={isAllSelected}
            isIndeterminate={isIndeterminate}
            onToggleAll={handleToggleAll}
            onTogglePage={handleTogglePage}
            onEdit={handleEdit}
            onPreview={handlePreview}
            onPublish={handlePublish}
            onUnpublish={handleUnpublish}
            onDuplicate={handleDuplicate}
            onDelete={handleDelete}
          />
        )}
        <ListPaginationFooter
          resourceLabel="pages"
          pagination={pagination}
          isLoading={isLoading}
        />
      </div>
      <PageCreateDrawer
        key={drawerKey}
        open={createOpen}
        onOpenChange={handleDrawerOpenChange}
        onCreate={handleCreate}
        openAfterCreate={openAfterCreate}
        onOpenAfterCreateChange={handleOpenAfterCreateChange}
        isSubmitting={isSubmitting}
        error={error}
      />
      <ConfirmActionDialog
        open={Boolean(pendingDeleteId)}
        onOpenChange={(open) => {
          if (!open) setPendingDeleteId(null);
        }}
        title="Delete page?"
        description="Delete this page? This cannot be undone."
        confirmLabel="Delete page"
        confirmingLabel="Deleting..."
        isConfirming={deletingId === pendingDeleteId}
        onConfirm={() => {
          if (pendingDeleteId) return runDelete(pendingDeleteId);
        }}
      />
      <ConfirmActionDialog
        open={pendingBulkDeleteIds.length > 0}
        onOpenChange={(open) => {
          if (!open) setPendingBulkDeleteIds([]);
        }}
        title="Delete selected pages?"
        description={`Delete ${pendingBulkDeleteIds.length} page${pendingBulkDeleteIds.length === 1 ? "" : "s"}? This cannot be undone.`}
        confirmLabel="Delete selected"
        confirmingLabel="Deleting..."
        isConfirming={isBulkWorking}
        onConfirm={() => runBulkAction("delete", pendingBulkDeleteIds)}
      />
    </AdminShell>
  );
}
