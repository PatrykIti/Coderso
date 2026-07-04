import {
  Columns3,
  GripVertical,
  LayoutGrid,
  Pencil,
  Plus,
  Rows3,
  SlidersHorizontal,
  Table as TableIcon,
  type LucideIcon,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { cn } from "@/lib/utils";
import { isApiClientError } from "@/services/apiClient";
import { cacheKeys } from "@/services/cachePolicy";
import { getCachedContentTypes, listContentTypesCached } from "@/services/contentTypesClient";
import {
  getCachedCustomScreen,
  getCustomScreenCached,
  type CustomScreenRecord,
} from "@/services/customScreensClient";
import {
  deleteEntry,
  getCachedEntries,
  listEntriesCached,
  publishEntry,
  unpublishEntry,
  updateEntry,
  type EntrySummary,
} from "@/services/entriesClient";
import { useAdminRouter } from "@/ui/contexts/AdminRouterContext";
import {
  clearActiveAssistantSurfaceContext,
  setActiveAssistantSurfaceContext,
} from "@/ui/assistant/activeSurfaceContext";
import { AdminShell } from "@/ui/layouts/AdminShell";
import { AdminLink } from "@/ui/shared/AdminLink";
import { ConfirmActionDialog } from "@/ui/shared/ConfirmActionDialog";
import { ListPaginationFooter } from "@/ui/shared/ListPaginationFooter";
import { PageHeader } from "@/ui/shared/PageHeader";
import { createListActionToastAdapter } from "@/ui/shared/listActionToasts";
import { useListPagination } from "@/ui/shared/useListPagination";
import { subscribeCacheEvents } from "@/utils/cacheBus";
import { resolveCustomScreenCapabilities } from "../../../services/customScreens/capabilities";
import type { CustomScreenListColumn } from "../../../services/customScreens/customScreenSchemas";

import { buildCustomScreenAssistantSurface } from "./assistantSurface";
import {
  CustomScreenEntriesBulkActionsBar,
  type CustomScreenEntriesBulkActionValue,
} from "./CustomScreenEntriesBulkActionsBar";
import { CustomScreenEntriesFilters } from "./CustomScreenEntriesFilters";
import { CustomScreenEntriesTable } from "./CustomScreenEntriesTable";
import {
  buildCustomScreenEntriesFilterOptions,
  filterCustomScreenEntries,
  getVisibleListColumns,
  resolveCustomScreenSidebarShortcutState,
  sortCustomScreenEntries,
} from "./customScreenListModel";
import { buildCustomScreenWorkspacePath, resolveCustomScreenId } from "./routeParams";

const ENTRIES_VIEW_TYPES = ["Table", "Board", "Gallery", "Calendar"] as const;
type EntriesViewType = (typeof ENTRIES_VIEW_TYPES)[number];

const ENTRIES_VIEW_ICONS: Record<EntriesViewType, LucideIcon> = {
  Table: TableIcon,
  Board: Columns3,
  Gallery: LayoutGrid,
  Calendar: Rows3,
};

const listColumnTypeLabel = (formatter: string) => {
  if (formatter === "number") return "Number";
  if (formatter === "boolean") return "Boolean";
  if (formatter === "date") return "Date";
  if (formatter === "select") return "Select";
  if (formatter === "media") return "Media";
  if (formatter === "relation") return "Relation";
  return "Text";
};

const fallbackListView = {
  columns: [],
  filters: [],
  defaultSort: { field: "updatedAt", direction: "desc" as const },
  bulkActions: { delete: true, publish: true, unpublish: true },
};

const normalizeInlineRowValue = (value: string, column: CustomScreenListColumn) => {
  if (column.formatter === "number") {
    if (!value.trim()) return "";
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : value;
  }
  if (column.formatter === "boolean") {
    const normalized = value.trim().toLowerCase();
    if (["true", "yes", "1"].includes(normalized)) return true;
    if (["false", "no", "0"].includes(normalized)) return false;
  }
  return value;
};

const customScreenRecordToasts = createListActionToastAdapter<
  "publish" | "unpublish" | "delete" | "update"
>({
  labels: { singular: "record", plural: "records" },
  actions: {
    publish: { pastTense: "published", failureVerb: "publish" },
    update: { pastTense: "updated", failureVerb: "update" },
    unpublish: {
      pastTense: "moved to draft",
      failureVerb: "move to draft",
      errorFallback: "Failed to move record to draft.",
    },
    delete: { pastTense: "deleted", failureVerb: "delete" },
  },
});

type DeleteRequest = {
  ids: string[];
  title: string;
  description: string;
  confirmLabel: string;
};

export function CustomScreenEntriesPage() {
  const { path, navigate } = useAdminRouter();
  const screenId = useMemo(() => resolveCustomScreenId(path), [path]);
  const initialScreen = useMemo(
    () => (screenId ? (getCachedCustomScreen(screenId) ?? null) : null),
    [screenId]
  );
  const initialContentType = useMemo(
    () =>
      initialScreen
        ? (getCachedContentTypes()?.find((item) => item.id === initialScreen.contentTypeId) ?? null)
        : null,
    [initialScreen]
  );
  const initialEntries = useMemo(
    () => (initialContentType ? (getCachedEntries(initialContentType.slug) ?? []) : []),
    [initialContentType]
  );
  const hasInitialCache = Boolean(initialScreen && initialContentType);
  const [screen, setScreen] = useState<CustomScreenRecord | null>(initialScreen);
  const [entries, setEntries] = useState<EntrySummary[]>(initialEntries);
  const [contentType, setContentType] = useState(initialContentType);
  const [isLoading, setIsLoading] = useState(() => !(initialScreen && initialContentType));
  const [error, setError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterValues, setFilterValues] = useState<Record<string, string>>({});
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [bulkAction, setBulkAction] = useState<CustomScreenEntriesBulkActionValue | "">("");
  const [isBulkWorking, setIsBulkWorking] = useState(false);
  const [deleteRequest, setDeleteRequest] = useState<DeleteRequest | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  // TASK-479-14-L03: runtime "Customize view" is LOCAL/session view state only —
  // it never writes the screen definition (durable column config lives in the
  // editor's List-view designer). `null` means "use the definition defaults".
  const [showConfig, setShowConfig] = useState(false);
  const [activeView, setActiveView] = useState<EntriesViewType>("Table");
  const [visibleColumnIds, setVisibleColumnIds] = useState<string[] | null>(null);
  const screenCapabilities = useMemo(
    () =>
      screen?.capabilities ??
      resolveCustomScreenCapabilities({
        definition: screen?.definition,
        blocks: screen?.blocks,
        bindings: screen?.bindings,
      }),
    [screen]
  );
  const listView = screen?.definition?.listView ?? fallbackListView;
  const effectiveListView = useMemo(() => {
    if (!visibleColumnIds) return listView;
    const shown = new Set(visibleColumnIds);
    return {
      ...listView,
      columns: listView.columns.map((column) => ({
        ...column,
        visible: shown.has(column.id),
      })),
    };
  }, [listView, visibleColumnIds]);
  const isColumnShown = useCallback(
    (columnId: string) =>
      visibleColumnIds
        ? visibleColumnIds.includes(columnId)
        : listView.columns.find((column) => column.id === columnId)?.visible !== false,
    [listView.columns, visibleColumnIds]
  );
  const toggleColumnVisibility = useCallback(
    (columnId: string) => {
      setVisibleColumnIds((current) => {
        const base = current ?? getVisibleListColumns(listView).map((column) => column.id);
        return base.includes(columnId) ? base.filter((id) => id !== columnId) : [...base, columnId];
      });
    },
    [listView]
  );
  const sidebarShortcutState = useMemo(
    () => (screen ? resolveCustomScreenSidebarShortcutState(screen) : "hidden"),
    [screen]
  );
  const isSidebarPublished = sidebarShortcutState === "visible";
  const entryStats = useMemo(() => {
    const total = entries.length;
    const published = entries.filter((entry) => entry.status === "published").length;
    const drafts = entries.filter((entry) => entry.status === "draft").length;
    return [
      { label: "Total records", value: total },
      { label: "Published", value: published },
      { label: "Drafts", value: drafts },
    ];
  }, [entries]);
  const contentTypeSlug = contentType?.slug ?? null;
  const contentTypeName = contentType?.name ?? null;
  const hasBulkActions =
    listView.bulkActions.delete || listView.bulkActions.publish || listView.bulkActions.unpublish;
  const supportsWorkspaceEditor = screenCapabilities.supportsDedicatedEditor;
  const filterOptions = useMemo(
    () => buildCustomScreenEntriesFilterOptions({ entries, listView }),
    [entries, listView]
  );
  const activeFilterValues = useMemo(() => {
    const validIds = new Set(filterOptions.map((filter) => filter.id));
    return Object.fromEntries(
      Object.entries(filterValues).filter(([id, value]) => {
        if (!validIds.has(id)) return false;
        const options = filterOptions.find((filter) => filter.id === id)?.options ?? [];
        return value === "all" || options.some((option) => option.value === value);
      })
    );
  }, [filterOptions, filterValues]);
  const filteredEntries = useMemo(
    () =>
      filterCustomScreenEntries({
        entries,
        listView,
        query: searchQuery,
        filters: activeFilterValues,
      }),
    [activeFilterValues, entries, listView, searchQuery]
  );
  const sortedEntries = useMemo(
    () => sortCustomScreenEntries(filteredEntries, listView),
    [filteredEntries, listView]
  );
  const pagination = useListPagination(sortedEntries, {
    resetKey: JSON.stringify({
      searchQuery,
      filterValues: activeFilterValues,
      filterIds: filterOptions.map((filter) => filter.id),
      defaultSort: listView.defaultSort,
    }),
  });
  const visibleIds = useMemo(
    () => pagination.visibleRows.map((entry) => entry.id),
    [pagination.visibleRows]
  );
  const visibleSelectedIds = useMemo(
    () => selectedIds.filter((id) => visibleIds.includes(id)),
    [selectedIds, visibleIds]
  );
  const selectedCount = visibleSelectedIds.length;
  const isAllSelected =
    hasBulkActions && visibleIds.length > 0 && visibleIds.every((id) => selectedIds.includes(id));
  const isIndeterminate = selectedCount > 0 && !isAllSelected;

  useEffect(() => {
    if (!screen || !screenId) {
      clearActiveAssistantSurfaceContext();
      return undefined;
    }

    setActiveAssistantSurfaceContext(
      buildCustomScreenAssistantSurface({
        screen,
        capabilities: screenCapabilities,
      })
    );

    return () => {
      clearActiveAssistantSurfaceContext();
    };
  }, [screen, screenCapabilities, screenId]);

  const refresh = useCallback(
    async (force = false, options?: { background?: boolean }) => {
      if (!screenId) return;
      if (!options?.background) {
        setIsLoading(true);
      }
      try {
        const nextScreen = await getCustomScreenCached(screenId, { force });
        if (!nextScreen) {
          setError("Custom screen not found.");
          setEntries([]);
          return;
        }

        const contentTypes = await listContentTypesCached({ force });
        const contentType =
          contentTypes.find((item) => item.id === nextScreen.contentTypeId) ?? null;
        if (!contentType) {
          setScreen(nextScreen);
          setContentType(null);
          setEntries([]);
          setError("Content type not found.");
          return;
        }

        const nextEntries = await listEntriesCached(contentType.slug, { force });
        setScreen(nextScreen);
        setContentType(contentType);
        setEntries(nextEntries);
        setError(null);
      } catch (err) {
        if (isApiClientError(err)) {
          setError(err.message);
        } else {
          setError("Failed to load custom screen records.");
        }
      } finally {
        if (!options?.background) {
          setIsLoading(false);
        }
      }
    },
    [screenId]
  );

  useEffect(() => {
    if (!screenId) return;
    let active = true;
    getCustomScreenCached(screenId, { force: !hasInitialCache })
      .then(async (nextScreen) => {
        if (!active) return;
        if (!nextScreen) {
          setError("Custom screen not found.");
          setEntries([]);
          return;
        }
        const contentTypes = await listContentTypesCached({ force: !hasInitialCache });
        if (!active) return;
        const contentType =
          contentTypes.find((item) => item.id === nextScreen.contentTypeId) ?? null;
        if (!contentType) {
          setScreen(nextScreen);
          setContentType(null);
          setEntries([]);
          setError("Content type not found.");
          return;
        }
        const nextEntries = await listEntriesCached(contentType.slug, { force: !hasInitialCache });
        if (!active) return;
        setScreen(nextScreen);
        setContentType(contentType);
        setEntries(nextEntries);
        setError(null);
      })
      .catch((err) => {
        if (!active) return;
        if (isApiClientError(err)) {
          setError(err.message);
        } else {
          setError("Failed to load custom screen records.");
        }
      })
      .finally(() => {
        if (active && !hasInitialCache) setIsLoading(false);
      });
    return () => {
      active = false;
    };
  }, [hasInitialCache, screenId]);

  useEffect(() => {
    if (!screenId) return undefined;
    return subscribeCacheEvents((event) => {
      if (
        event.key === cacheKeys.customScreensList ||
        event.key === cacheKeys.customScreenDetail(screenId) ||
        (contentTypeSlug && event.key === cacheKeys.entriesList(contentTypeSlug))
      ) {
        refresh(true, { background: true }).catch(() => undefined);
      }
    });
  }, [contentTypeSlug, refresh, screenId]);

  const handleToggleEntry = (entryId: string) => {
    setSelectedIds((current) =>
      current.includes(entryId) ? current.filter((id) => id !== entryId) : [...current, entryId]
    );
  };

  const handleToggleAll = () => {
    setSelectedIds(isAllSelected ? [] : visibleIds);
  };

  const handleClearSelection = () => {
    setSelectedIds([]);
    setBulkAction("");
  };

  const handleFilterChange = (filterId: string, value: string) => {
    setFilterValues((current) => ({
      ...current,
      [filterId]: value,
    }));
  };

  const runDelete = async (ids: string[]) => {
    if (!contentTypeSlug) return;
    setIsDeleting(true);
    try {
      const results = await Promise.allSettled(
        ids.map((entryId) => deleteEntry(contentTypeSlug, entryId))
      );
      const summary = customScreenRecordToasts.summarizeBulkAction("delete", ids, results);
      customScreenRecordToasts.emitBulk(summary);
      await refresh(true, { background: true });
      if (!summary.ok) {
        setActionError(summary.inlineMessage);
      } else {
        setActionError(null);
      }
      setSelectedIds((current) => current.filter((id) => !ids.includes(id)));
      setDeleteRequest(null);
    } catch (err) {
      setActionError(customScreenRecordToasts.error("delete", err));
    } finally {
      setIsDeleting(false);
    }
  };

  const handleCreate = () => {
    if (!screenId || !screen) return;
    if (!supportsWorkspaceEditor) return;
    navigate(buildCustomScreenWorkspacePath({ screenId, entryId: "new" }));
  };

  const handlePublish = async (entryId: string) => {
    if (!contentTypeSlug) return;
    setActionError(null);
    try {
      await publishEntry(contentTypeSlug, entryId);
      await refresh(true, { background: true });
      customScreenRecordToasts.success("publish");
    } catch (err) {
      setActionError(isApiClientError(err) ? err.message : "Failed to update record.");
    }
  };

  const handleUnpublish = async (entryId: string) => {
    if (!contentTypeSlug) return;
    setActionError(null);
    try {
      await unpublishEntry(contentTypeSlug, entryId);
      await refresh(true, { background: true });
      customScreenRecordToasts.success("unpublish");
    } catch (err) {
      setActionError(customScreenRecordToasts.error("unpublish", err));
    }
  };

  const handleCommitRowField = async (
    entry: EntrySummary,
    column: CustomScreenListColumn,
    nextValue: string
  ) => {
    if (!contentTypeSlug) return;
    setActionError(null);
    try {
      const payload =
        column.source === "system"
          ? column.field === "title"
            ? { title: nextValue }
            : column.field === "slug"
              ? { slug: nextValue }
              : null
          : {
              data: {
                ...entry.data,
                [column.field]: normalizeInlineRowValue(nextValue, column),
              },
            };
      if (!payload) return;
      const saved = await updateEntry(contentTypeSlug, entry.id, payload);
      setEntries((current) =>
        current.map((item) =>
          item.id === saved.id
            ? {
                ...item,
                ...saved,
              }
            : item
        )
      );
    } catch (err) {
      setActionError(customScreenRecordToasts.error("update", err));
    }
  };

  const handleDeleteRequest = (entryId: string) => {
    setDeleteRequest({
      ids: [entryId],
      title: "Delete record?",
      description: "Delete this record? This cannot be undone.",
      confirmLabel: "Delete record",
    });
  };

  const runBulkAction = async (action: Exclude<CustomScreenEntriesBulkActionValue, "delete">) => {
    if (!contentTypeSlug || visibleSelectedIds.length === 0) return;
    setIsBulkWorking(true);
    setActionError(null);
    try {
      const results = await Promise.allSettled(
        visibleSelectedIds.map((entryId) =>
          action === "publish"
            ? publishEntry(contentTypeSlug, entryId)
            : unpublishEntry(contentTypeSlug, entryId)
        )
      );
      const summary = customScreenRecordToasts.summarizeBulkAction(
        action,
        visibleSelectedIds,
        results
      );
      customScreenRecordToasts.emitBulk(summary);
      await refresh(true, { background: true });
      if (!summary.ok) {
        setActionError(summary.inlineMessage);
      }
      handleClearSelection();
    } catch (err) {
      setActionError(customScreenRecordToasts.error(action, err));
    } finally {
      setIsBulkWorking(false);
    }
  };

  const handleBulkApply = () => {
    if (!bulkAction || visibleSelectedIds.length === 0) return;
    if (bulkAction === "delete") {
      setDeleteRequest({
        ids: visibleSelectedIds,
        title: `Delete ${visibleSelectedIds.length} record${
          visibleSelectedIds.length === 1 ? "" : "s"
        }?`,
        description: "Selected records will be removed permanently.",
        confirmLabel: visibleSelectedIds.length === 1 ? "Delete record" : "Delete records",
      });
      return;
    }
    void runBulkAction(bulkAction);
  };

  const screenRecordsHref = screenId
    ? `/advanced/custom-screens/${encodeURIComponent(screenId)}/entries`
    : "/advanced/custom-screens";

  return (
    <AdminShell
      activeHref={screenRecordsHref}
      breadcrumbs={
        screen?.name
          ? ["Coderso", "Screens", screen.name, "Records"]
          : ["Coderso", "Screens", "Records"]
      }
    >
      <div className="mx-auto flex max-w-6xl flex-col gap-6">
        <PageHeader
          icon={<LayoutGrid />}
          title={screen?.name ?? "Custom screen"}
          description={
            contentTypeName
              ? supportsWorkspaceEditor
                ? `Manage ${contentTypeName} entries through the dedicated screen workflow.`
                : `This screen is not yet ready for the dedicated editor workflow. Upgrade the editor view before using it as an active records workspace.`
              : "Load the bound content type to start working with records."
          }
          actions={
            <div className="flex flex-wrap items-center gap-2">
              {hasBulkActions && selectedCount > 0 ? (
                <CustomScreenEntriesBulkActionsBar
                  selectedCount={selectedCount}
                  action={bulkAction}
                  allowPublish={listView.bulkActions.publish}
                  allowUnpublish={listView.bulkActions.unpublish}
                  allowDelete={listView.bulkActions.delete}
                  onActionChange={setBulkAction}
                  onApply={handleBulkApply}
                  onClear={handleClearSelection}
                  isApplying={isBulkWorking}
                  variant="inline"
                />
              ) : null}
              {screenId ? (
                <AdminLink
                  href={`/advanced/custom-screens/${encodeURIComponent(screenId)}`}
                  prefetch
                >
                  <Button variant="ghost" size="sm" className="gap-1.5">
                    <Pencil className="size-4" /> Edit screen
                  </Button>
                </AdminLink>
              ) : null}
              <Button
                variant={showConfig ? "soft" : "outline"}
                size="sm"
                className="gap-1.5"
                aria-pressed={showConfig}
                onClick={() => setShowConfig((value) => !value)}
              >
                <SlidersHorizontal className="size-4" /> Customize view
              </Button>
              <Button
                className="gap-2"
                disabled={!contentTypeSlug || !supportsWorkspaceEditor}
                onClick={handleCreate}
              >
                <Plus className="h-4 w-4" />
                New
              </Button>
            </div>
          }
        />

        {screen ? (
          <div className="flex flex-wrap items-center gap-2">
            {isSidebarPublished ? (
              <Badge variant="success">
                <span className="size-1.5 rounded-full bg-success" /> Published
              </Badge>
            ) : (
              <Badge variant="secondary">
                <span className="size-1.5 rounded-full bg-muted-foreground" /> Not in sidebar
              </Badge>
            )}
            <span className="text-xs text-muted-foreground">
              {isSidebarPublished ? "In sidebar · " : ""}
              {contentTypeName ? `${contentTypeName} entries` : "Bound content type"}
            </span>
          </div>
        ) : null}

        {screen ? (
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-3">
            {entryStats.map((stat) => (
              <Card key={stat.label} className="gap-0 p-4 py-4">
                <div className="text-sm text-muted-foreground">{stat.label}</div>
                <div className="mt-1 font-display text-2xl font-semibold tabular-nums">
                  {stat.value}
                </div>
              </Card>
            ))}
          </div>
        ) : null}

        <div className="inline-flex w-fit items-center gap-1 rounded-xl border border-border bg-muted/60 p-1">
          {ENTRIES_VIEW_TYPES.map((view) => {
            const Icon = ENTRIES_VIEW_ICONS[view];
            const active = view === activeView;
            return (
              <button
                key={view}
                type="button"
                aria-pressed={active}
                onClick={() => setActiveView(view)}
                className={cn(
                  "flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium transition-all",
                  active
                    ? "bg-card text-foreground shadow-soft"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                <Icon className="size-4" /> {view}
              </button>
            );
          })}
        </div>

        {error ? (
          <Alert variant="destructive">
            <AlertTitle>Unable to load records</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        ) : null}
        {actionError ? (
          <Alert variant="destructive">
            <AlertTitle>Record action failed</AlertTitle>
            <AlertDescription>{actionError}</AlertDescription>
          </Alert>
        ) : null}
        {!supportsWorkspaceEditor ? (
          <Alert>
            <AlertTitle>Workspace upgrade required</AlertTitle>
            <AlertDescription>
              This screen is not yet ready for the screen-owned editor flow. Add writable screen
              widgets and bindings in the builder before using this records workspace as the active
              editing path.
            </AlertDescription>
          </Alert>
        ) : null}

        <div className={cn("grid gap-5", showConfig && "lg:grid-cols-[1fr_320px]")}>
          <div className="flex min-w-0 flex-col gap-5">
            <CustomScreenEntriesFilters
              query={searchQuery}
              filters={activeFilterValues}
              filterOptions={filterOptions}
              onQueryChange={setSearchQuery}
              onFilterChange={handleFilterChange}
            />
            {activeView === "Table" ? (
              <CustomScreenEntriesTable
                items={pagination.visibleRows}
                listView={effectiveListView}
                buildRowHref={(entry) => {
                  if (!screenId || !contentTypeSlug) return "/advanced/custom-screens";
                  return buildCustomScreenWorkspacePath({ screenId, entryId: entry.id });
                }}
                selectedIds={visibleSelectedIds}
                isAllSelected={isAllSelected}
                isIndeterminate={isIndeterminate}
                onToggleAll={hasBulkActions ? handleToggleAll : undefined}
                onToggleEntry={hasBulkActions ? handleToggleEntry : undefined}
                onPublish={handlePublish}
                onUnpublish={handleUnpublish}
                onDelete={handleDeleteRequest}
                onCommitRowField={supportsWorkspaceEditor ? handleCommitRowField : undefined}
                emptyMessage={
                  isLoading
                    ? "Loading records..."
                    : entries.length > 0
                      ? "No records match your current view."
                      : undefined
                }
              />
            ) : (
              <div className="flex flex-col items-center justify-center gap-1 rounded-2xl border border-dashed border-border bg-card/60 px-6 py-16 text-center">
                <p className="font-display text-sm font-semibold">{activeView} view</p>
                <p className="max-w-sm text-sm text-muted-foreground">
                  The {activeView.toLowerCase()} layout is on the roadmap. Switch back to Table to
                  manage records.
                </p>
              </div>
            )}
            <ListPaginationFooter
              resourceLabel="records"
              pagination={pagination}
              isLoading={isLoading}
            />
          </div>

          {showConfig ? (
            <Card
              className="h-fit gap-0 p-0 py-0 lg:sticky lg:top-2"
              data-custom-screen-view-config="true"
            >
              <div className="flex items-center justify-between border-b border-border px-4 py-3">
                <span className="font-display text-sm font-semibold">View settings</span>
                <Badge variant="outline">{activeView}</Badge>
              </div>
              <div className="p-4">
                <div className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Columns
                </div>
                <p className="mb-2.5 text-xs text-muted-foreground">
                  Toggle columns for your current view. Saved per-screen defaults are edited in the
                  builder.
                </p>
                <div className="flex flex-col gap-0.5 rounded-xl border border-border p-1.5">
                  {listView.columns.length === 0 ? (
                    <p className="px-1.5 py-2 text-xs text-muted-foreground">
                      This screen has no configured columns yet.
                    </p>
                  ) : (
                    listView.columns.map((column) => (
                      <div
                        key={column.id}
                        className="flex items-center gap-2 rounded-lg px-1.5 py-1.5 hover:bg-muted/60"
                      >
                        <GripVertical className="size-4 shrink-0 text-muted-foreground/60" />
                        <Checkbox
                          aria-label={`Show ${column.label} column`}
                          checked={isColumnShown(column.id)}
                          onCheckedChange={() => toggleColumnVisibility(column.id)}
                        />
                        <span className="flex-1 truncate text-sm">{column.label}</span>
                        <Badge variant="outline" className="px-1.5 py-0 text-[10px]">
                          {listColumnTypeLabel(column.formatter)}
                        </Badge>
                      </div>
                    ))
                  )}
                </div>
              </div>
              <div className="flex items-center justify-between gap-2 border-t border-border px-4 py-3">
                <span className="text-xs text-muted-foreground">Applied to this view</span>
                {screenId ? (
                  <AdminLink
                    href={`/advanced/custom-screens/${encodeURIComponent(screenId)}`}
                    prefetch
                  >
                    <Button variant="ghost" size="sm">
                      Edit in builder
                    </Button>
                  </AdminLink>
                ) : null}
              </div>
            </Card>
          ) : null}
        </div>
      </div>
      <ConfirmActionDialog
        open={Boolean(deleteRequest)}
        onOpenChange={(open) => {
          if (!open) setDeleteRequest(null);
        }}
        title={deleteRequest?.title ?? "Delete record?"}
        description={deleteRequest?.description ?? "Delete this record? This cannot be undone."}
        confirmLabel={deleteRequest?.confirmLabel ?? "Delete record"}
        confirmingLabel="Deleting..."
        isConfirming={isDeleting}
        onConfirm={() => {
          if (deleteRequest) return runDelete(deleteRequest.ids);
        }}
      />
    </AdminShell>
  );
}
