import { Plus } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { cacheKeys } from "@/services/cachePolicy";
import {
  getCachedContentTypes,
  listContentTypesCached,
  type ContentTypeSummary,
} from "@/services/contentTypesClient";
import {
  createCustomScreen,
  deleteCustomScreen,
  updateCustomScreen,
  type CustomScreenCreateInput,
  type CustomScreenStatus,
} from "@/services/customScreensClient";
import { getUserSettings, setUserSetting } from "@/services/userSettingsClient";
import { useAdminRouter } from "@/ui/contexts/AdminRouterContext";
import { AdminShell } from "@/ui/layouts/AdminShell";
import { ConfirmActionDialog } from "@/ui/shared/ConfirmActionDialog";
import { ListPaginationFooter } from "@/ui/shared/ListPaginationFooter";
import { PageHeader } from "@/ui/shared/PageHeader";
import { useListPagination } from "@/ui/shared/useListPagination";
import { subscribeCacheEvents } from "@/utils/cacheBus";
import {
  resolveCacheRefreshBackground,
  resolveListMountRefreshOptions,
} from "@/utils/cacheRefresh";

import {
  CustomScreenBulkActionsBar,
  type CustomScreenBulkActionValue,
} from "./CustomScreenBulkActionsBar";
import { CustomScreenCreateDrawer } from "./CustomScreenCreateDrawer";
import { CustomScreenFilters } from "./CustomScreenFilters";
import { CustomScreenTable } from "./CustomScreenTable";
import { customScreenListToasts } from "./customScreenListToasts";
import {
  buildCustomScreenContentTypeFilterOptions,
  buildCustomScreenListRows,
  filterCustomScreenRows,
  type CustomScreenFilterStatus,
} from "./customScreenListModel";
import { useCustomScreens } from "./hooks/useCustomScreens";

const toStatusAction = (status: CustomScreenStatus) =>
  status === "active" ? "activate" : "moveToDraft";

export function CustomScreenListPage() {
  const { navigate } = useAdminRouter();
  const { items, isLoading, error, refresh } = useCustomScreens();
  const initialContentTypes = useMemo(() => getCachedContentTypes(), []);
  const hasInitialContentTypes = initialContentTypes !== null;
  const [contentTypes, setContentTypes] = useState<ContentTypeSummary[]>(
    () => initialContentTypes ?? []
  );
  const [actionError, setActionError] = useState<string | null>(null);
  const [createError, setCreateError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<CustomScreenFilterStatus>("all");
  const [contentTypeFilter, setContentTypeFilter] = useState("all");
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [bulkAction, setBulkAction] = useState<CustomScreenBulkActionValue | "">("");
  const [isBulkWorking, setIsBulkWorking] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  const [drawerKey, setDrawerKey] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [openAfterCreate, setOpenAfterCreate] = useState(true);
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [workingStatusId, setWorkingStatusId] = useState<string | null>(null);
  const [pendingBulkDeleteIds, setPendingBulkDeleteIds] = useState<string[]>([]);
  const contentTypesHydratedRef = useRef(hasInitialContentTypes);

  const refreshScreens = useCallback(() => refresh({ force: true, background: true }), [refresh]);

  const refreshContentTypes = useCallback(
    async (options?: { force?: boolean; background?: boolean }) => {
      const force = options?.force ?? false;
      const background = resolveCacheRefreshBackground({
        explicitBackground: options?.background,
        hasHydrated: contentTypesHydratedRef.current,
      });
      try {
        const next = await listContentTypesCached({ force });
        setContentTypes(next);
        contentTypesHydratedRef.current = true;
      } catch {
        if (!background) {
          setActionError("Failed to load content type labels.");
        }
      }
    },
    []
  );

  useEffect(() => {
    const mountOptions = resolveListMountRefreshOptions(hasInitialContentTypes);
    let active = true;
    listContentTypesCached({ force: mountOptions.force })
      .then((next) => {
        if (!active) return;
        setContentTypes(next);
        contentTypesHydratedRef.current = true;
      })
      .catch(() => {
        if (active && !mountOptions.background) {
          setActionError("Failed to load content type labels.");
        }
      });
    return () => {
      active = false;
    };
  }, [hasInitialContentTypes]);

  useEffect(() => {
    return subscribeCacheEvents((event) => {
      if (event.key !== cacheKeys.contentTypesList) return;
      refreshContentTypes({ force: true, background: true }).catch(() => undefined);
    });
  }, [refreshContentTypes]);

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const prefs = await getUserSettings();
        if (!active) return;
        setOpenAfterCreate(prefs["customScreens.openAfterCreate"]);
      } catch {
        // The drawer defaults to opening the builder when preferences are unavailable.
      }
    })();
    return () => {
      active = false;
    };
  }, []);

  const rows = useMemo(() => buildCustomScreenListRows(items, contentTypes), [contentTypes, items]);
  const contentTypeOptions = useMemo(
    () => buildCustomScreenContentTypeFilterOptions(rows, contentTypes),
    [contentTypes, rows]
  );
  const filteredRows = useMemo(
    () => filterCustomScreenRows(rows, searchQuery, statusFilter, contentTypeFilter),
    [contentTypeFilter, rows, searchQuery, statusFilter]
  );
  const pagination = useListPagination(filteredRows, {
    resetKey: JSON.stringify({
      searchQuery,
      statusFilter,
      contentTypeFilter,
    }),
  });
  const visibleIds = useMemo(
    () => pagination.visibleRows.map((row) => row.screen.id),
    [pagination.visibleRows]
  );
  const visibleSelectedIds = selectedIds.filter((id) => visibleIds.includes(id));
  const selectedCount = visibleSelectedIds.length;
  const isAllSelected = visibleIds.length > 0 && visibleIds.every((id) => selectedIds.includes(id));
  const isIndeterminate = selectedCount > 0 && !isAllSelected;

  const handleDrawerOpenChange = (next: boolean) => {
    setCreateOpen(next);
    if (next) {
      setDrawerKey((prev) => prev + 1);
      setCreateError(null);
    }
  };

  const handleOpenAfterCreateChange = async (next: boolean) => {
    setOpenAfterCreate(next);
    try {
      await setUserSetting("customScreens.openAfterCreate", next);
    } catch {
      // Keep UI responsive even if preference persistence fails.
    }
  };

  const handleCreate = async (payload: {
    name: string;
    contentTypeId: string;
    status: CustomScreenStatus;
    showInSidebar: boolean;
    sidebarLabel: string | null;
    openAfterCreate: boolean;
  }) => {
    const createPayload: CustomScreenCreateInput = {
      name: payload.name,
      contentTypeId: payload.contentTypeId,
      status: payload.status,
      showInSidebar: payload.showInSidebar,
      sidebarLabel: payload.sidebarLabel,
      blocks: [],
      bindings: [],
    };
    setIsSubmitting(true);
    setCreateError(null);
    setActionError(null);
    try {
      const created = await createCustomScreen(createPayload);
      customScreenListToasts.success("create", { targetLabel: created.name });
      if (payload.openAfterCreate) {
        navigate(`/advanced/custom-screens/${encodeURIComponent(created.id)}`);
        return;
      }
      await refreshScreens();
      setCreateOpen(false);
    } catch (err) {
      setCreateError(customScreenListToasts.error("create", err));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSetStatus = async (id: string, status: CustomScreenStatus) => {
    const action = toStatusAction(status);
    setWorkingStatusId(id);
    setActionError(null);
    try {
      await updateCustomScreen(id, { status });
      await refreshScreens();
      customScreenListToasts.success(action);
    } catch (err) {
      setActionError(customScreenListToasts.error(action, err));
    } finally {
      setWorkingStatusId(null);
    }
  };

  const runDelete = async (id: string) => {
    setDeletingId(id);
    setActionError(null);
    try {
      await deleteCustomScreen(id);
      await refreshScreens();
      customScreenListToasts.success("delete");
      setSelectedIds((prev) => prev.filter((selectedId) => selectedId !== id));
      setPendingDeleteId(null);
    } catch (err) {
      setActionError(customScreenListToasts.error("delete", err));
    } finally {
      setDeletingId(null);
    }
  };

  const handleToggleScreen = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((screenId) => screenId !== id) : [...prev, id]
    );
  };

  const handleToggleAll = () => {
    setSelectedIds(isAllSelected ? [] : visibleIds);
  };

  const handleClearSelection = () => {
    setSelectedIds([]);
    setBulkAction("");
  };

  const runBulkAction = async (action: CustomScreenBulkActionValue, ids: string[]) => {
    if (ids.length === 0) return;
    setIsBulkWorking(true);
    setActionError(null);
    try {
      const results = await Promise.allSettled(
        ids.map((id) => {
          if (action === "delete") return deleteCustomScreen(id);
          return updateCustomScreen(id, {
            status: action === "activate" ? "active" : "draft",
          });
        })
      );
      await refreshScreens();
      const summary = customScreenListToasts.summarizeBulkAction(action, ids, results);
      customScreenListToasts.emitBulk(summary);
      if (!summary.ok) {
        setActionError(summary.inlineMessage);
      }
      handleClearSelection();
    } catch (err) {
      const fallbackMessage =
        action === "activate"
          ? "Failed to activate selected custom screens."
          : action === "moveToDraft"
            ? "Failed to move selected custom screens to draft."
            : "Failed to delete selected custom screens.";
      setActionError(
        customScreenListToasts.error(action, err, {
          fallbackMessage,
        })
      );
    } finally {
      setIsBulkWorking(false);
      setPendingBulkDeleteIds([]);
    }
  };

  const handleBulkApply = () => {
    if (!bulkAction || visibleSelectedIds.length === 0) return;
    if (bulkAction === "delete") {
      setPendingBulkDeleteIds(visibleSelectedIds);
      return;
    }
    void runBulkAction(bulkAction, visibleSelectedIds);
  };

  return (
    <AdminShell activeHref="/admin/advanced/custom-screens" breadcrumbs={["Coderso", "Screens"]}>
      <div className="mx-auto flex max-w-6xl flex-col gap-6">
        <PageHeader
          title="Custom Screens"
          description="Compose admin data screens from widgets tied to content types."
          actions={
            <>
              {selectedCount > 0 ? (
                <CustomScreenBulkActionsBar
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
            <AlertTitle>Unable to load custom screens</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        ) : null}
        {actionError ? (
          <Alert variant="destructive">
            <AlertTitle>Custom screen action failed</AlertTitle>
            <AlertDescription>{actionError}</AlertDescription>
          </Alert>
        ) : null}

        <CustomScreenFilters
          search={searchQuery}
          status={statusFilter}
          contentTypeId={contentTypeFilter}
          contentTypeOptions={contentTypeOptions}
          onSearchChange={setSearchQuery}
          onStatusChange={setStatusFilter}
          onContentTypeChange={setContentTypeFilter}
        />
        {isLoading ? (
          <div className="rounded-xl border bg-card/60 p-6 text-sm text-muted-foreground shadow-sm">
            Loading custom screens...
          </div>
        ) : (
          <CustomScreenTable
            items={pagination.visibleRows}
            emptyMessage={
              items.length > 0 ? "No custom screens match your current filters." : undefined
            }
            selectedIds={visibleSelectedIds}
            isAllSelected={isAllSelected}
            isIndeterminate={isIndeterminate}
            workingId={workingStatusId}
            onToggleAll={handleToggleAll}
            onToggleScreen={handleToggleScreen}
            onActivate={(id) => handleSetStatus(id, "active")}
            onMoveToDraft={(id) => handleSetStatus(id, "draft")}
            onDelete={setPendingDeleteId}
          />
        )}
        <ListPaginationFooter
          resourceLabel="custom screens"
          pagination={pagination}
          isLoading={isLoading}
        />
      </div>
      <CustomScreenCreateDrawer
        key={drawerKey}
        open={createOpen}
        onOpenChange={handleDrawerOpenChange}
        contentTypes={contentTypes}
        onCreate={handleCreate}
        openAfterCreate={openAfterCreate}
        onOpenAfterCreateChange={handleOpenAfterCreateChange}
        isSubmitting={isSubmitting}
        error={createError}
      />
      <ConfirmActionDialog
        open={Boolean(pendingDeleteId)}
        onOpenChange={(open) => {
          if (!open) setPendingDeleteId(null);
        }}
        title="Delete custom screen?"
        description="Delete this custom screen? This cannot be undone."
        confirmLabel="Delete custom screen"
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
        title="Delete selected custom screens?"
        description={`Delete ${pendingBulkDeleteIds.length} custom screen${pendingBulkDeleteIds.length === 1 ? "" : "s"}? This cannot be undone.`}
        confirmLabel="Delete selected"
        confirmingLabel="Deleting..."
        isConfirming={isBulkWorking}
        onConfirm={() => runBulkAction("delete", pendingBulkDeleteIds)}
      />
    </AdminShell>
  );
}
