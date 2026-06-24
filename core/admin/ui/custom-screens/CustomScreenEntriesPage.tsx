import { Plus } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
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
  sortCustomScreenEntries,
} from "./customScreenListModel";
import { buildCustomScreenWorkspacePath, resolveCustomScreenId } from "./routeParams";

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
          title={screen?.name ? `${screen.name} Records` : "Custom Screen Records"}
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

        <CustomScreenEntriesFilters
          query={searchQuery}
          filters={activeFilterValues}
          filterOptions={filterOptions}
          onQueryChange={setSearchQuery}
          onFilterChange={handleFilterChange}
        />
        <CustomScreenEntriesTable
          items={pagination.visibleRows}
          listView={listView}
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
        <ListPaginationFooter
          resourceLabel="records"
          pagination={pagination}
          isLoading={isLoading}
        />
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
