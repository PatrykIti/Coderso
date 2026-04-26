import { Plus } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  deleteListingQuery,
  deleteListingTemplate,
  type ListingQueryRecord,
  type ListingTemplateRecord,
} from "@/services/listingsClient";
import { useAdminRouter } from "@/ui/contexts/AdminRouterContext";
import { AdminShell } from "@/ui/layouts/AdminShell";
import { ConfirmActionDialog } from "@/ui/shared/ConfirmActionDialog";
import { ListPaginationFooter } from "@/ui/shared/ListPaginationFooter";
import { PageHeader } from "@/ui/shared/PageHeader";
import { useListPagination } from "@/ui/shared/useListPagination";

import {
  ListingBulkActionsBar,
  type ListingBulkActionValue,
} from "./ListingBulkActionsBar";
import { ListingQueryFilters, type ListingQuerySourceFilter } from "./ListingQueryFilters";
import { ListingQueryTable } from "./ListingQueryTable";
import { ListingTemplateFilters, type ListingTemplateLayoutFilter } from "./ListingTemplateFilters";
import { ListingTemplateManager } from "./ListingTemplateManager";
import { ListingTemplateTable } from "./ListingTemplateTable";
import { useListingQueries } from "./hooks/useListingQueries";
import { useListingTemplates } from "./hooks/useListingTemplates";
import { listingQueryToasts, listingTemplateToasts } from "./listingActionToasts";

type ListingsTab = "queries" | "templates";

export function filterListingQueries(
  items: ListingQueryRecord[],
  search: string,
  source: ListingQuerySourceFilter
) {
  const normalized = search.trim().toLowerCase();
  return items.filter((item) => {
    const matchesSearch =
      !normalized ||
      item.name.toLowerCase().includes(normalized) ||
      item.description?.toLowerCase().includes(normalized);
    const matchesSource = source === "all" || item.query.source === source;
    return matchesSearch && matchesSource;
  });
}

export function filterListingTemplates(
  items: ListingTemplateRecord[],
  search: string,
  layout: ListingTemplateLayoutFilter
) {
  const normalized = search.trim().toLowerCase();
  return items.filter((item) => {
    const matchesSearch =
      !normalized ||
      item.name.toLowerCase().includes(normalized) ||
      item.slug.toLowerCase().includes(normalized) ||
      item.description?.toLowerCase().includes(normalized);
    const matchesLayout = layout === "all" || item.layout === layout;
    return matchesSearch && matchesLayout;
  });
}

const sortByUpdatedDesc = <T extends { updatedAt: string }>(items: T[]) =>
  [...items].sort((left, right) => right.updatedAt.localeCompare(left.updatedAt));

export function ListingListPage() {
  const { navigate } = useAdminRouter();
  const {
    items: queryItems,
    isLoading: isQueryLoading,
    error: queryError,
    refresh: refreshQueries,
  } = useListingQueries();
  const {
    items: templateItems,
    isLoading: isTemplateLoading,
    error: templateError,
    refresh: refreshTemplates,
  } = useListingTemplates();

  const [activeTab, setActiveTab] = useState<ListingsTab>("queries");
  const [actionError, setActionError] = useState<string | null>(null);
  const [querySearch, setQuerySearch] = useState("");
  const [querySource, setQuerySource] =
    useState<ListingQuerySourceFilter>("all");
  const [templateSearch, setTemplateSearch] = useState("");
  const [templateLayout, setTemplateLayout] =
    useState<ListingTemplateLayoutFilter>("all");
  const [selectedQueryIds, setSelectedQueryIds] = useState<string[]>([]);
  const [selectedTemplateIds, setSelectedTemplateIds] = useState<string[]>([]);
  const [queryBulkAction, setQueryBulkAction] =
    useState<ListingBulkActionValue | "">("");
  const [templateBulkAction, setTemplateBulkAction] =
    useState<ListingBulkActionValue | "">("");
  const [isBulkWorking, setIsBulkWorking] = useState(false);
  const [pendingQueryDeleteId, setPendingQueryDeleteId] = useState<string | null>(
    null
  );
  const [pendingTemplateDeleteId, setPendingTemplateDeleteId] = useState<
    string | null
  >(null);
  const [deletingQueryId, setDeletingQueryId] = useState<string | null>(null);
  const [deletingTemplateId, setDeletingTemplateId] = useState<string | null>(
    null
  );
  const [pendingBulkQueryDeleteIds, setPendingBulkQueryDeleteIds] = useState<
    string[]
  >([]);
  const [pendingBulkTemplateDeleteIds, setPendingBulkTemplateDeleteIds] =
    useState<string[]>([]);
  const [templateCreateOpen, setTemplateCreateOpen] = useState(false);
  const [editingTemplateId, setEditingTemplateId] = useState<string | null>(null);

  const sortedQueries = useMemo(() => sortByUpdatedDesc(queryItems), [queryItems]);
  const sortedTemplates = useMemo(
    () => sortByUpdatedDesc(templateItems),
    [templateItems]
  );

  const filteredQueries = useMemo(
    () => filterListingQueries(sortedQueries, querySearch, querySource),
    [querySearch, querySource, sortedQueries]
  );
  const filteredTemplates = useMemo(
    () => filterListingTemplates(sortedTemplates, templateSearch, templateLayout),
    [sortedTemplates, templateLayout, templateSearch]
  );

  const queryPagination = useListPagination(filteredQueries, {
    resetKey: JSON.stringify({ querySearch, querySource }),
  });
  const templatePagination = useListPagination(filteredTemplates, {
    resetKey: JSON.stringify({ templateLayout, templateSearch }),
  });

  const visibleQueryIds = useMemo(
    () => queryPagination.visibleRows.map((item) => item.id),
    [queryPagination.visibleRows]
  );
  const visibleTemplateIds = useMemo(
    () => templatePagination.visibleRows.map((item) => item.id),
    [templatePagination.visibleRows]
  );

  useEffect(() => {
    setSelectedQueryIds((prev) => {
      const next = prev.filter((id) => visibleQueryIds.includes(id));
      return next.length === prev.length ? prev : next;
    });
  }, [visibleQueryIds]);

  useEffect(() => {
    setSelectedTemplateIds((prev) => {
      const next = prev.filter((id) => visibleTemplateIds.includes(id));
      return next.length === prev.length ? prev : next;
    });
  }, [visibleTemplateIds]);

  const visibleSelectedQueryIds = selectedQueryIds.filter((id) =>
    visibleQueryIds.includes(id)
  );
  const visibleSelectedTemplateIds = selectedTemplateIds.filter((id) =>
    visibleTemplateIds.includes(id)
  );
  const isAllQueriesSelected =
    visibleQueryIds.length > 0 &&
    visibleQueryIds.every((id) => selectedQueryIds.includes(id));
  const isAllTemplatesSelected =
    visibleTemplateIds.length > 0 &&
    visibleTemplateIds.every((id) => selectedTemplateIds.includes(id));
  const isQuerySelectionIndeterminate =
    visibleSelectedQueryIds.length > 0 && !isAllQueriesSelected;
  const isTemplateSelectionIndeterminate =
    visibleSelectedTemplateIds.length > 0 && !isAllTemplatesSelected;

  const clearQuerySelection = () => {
    setSelectedQueryIds([]);
    setQueryBulkAction("");
  };

  const clearTemplateSelection = () => {
    setSelectedTemplateIds([]);
    setTemplateBulkAction("");
  };

  const toggleQuery = (id: string) => {
    setSelectedQueryIds((prev) =>
      prev.includes(id)
        ? prev.filter((selectedId) => selectedId !== id)
        : [...prev, id]
    );
  };

  const toggleTemplate = (id: string) => {
    setSelectedTemplateIds((prev) =>
      prev.includes(id)
        ? prev.filter((selectedId) => selectedId !== id)
        : [...prev, id]
    );
  };

  const toggleAllQueries = () => {
    setSelectedQueryIds(isAllQueriesSelected ? [] : visibleQueryIds);
  };

  const toggleAllTemplates = () => {
    setSelectedTemplateIds(isAllTemplatesSelected ? [] : visibleTemplateIds);
  };

  const runQueryDelete = async (id: string) => {
    setDeletingQueryId(id);
    setActionError(null);
    try {
      await deleteListingQuery(id);
      await refreshQueries({ force: true, background: true });
      listingQueryToasts.success("delete");
      setSelectedQueryIds((prev) => prev.filter((selectedId) => selectedId !== id));
      setPendingQueryDeleteId(null);
    } catch (err) {
      setActionError(listingQueryToasts.error("delete", err));
    } finally {
      setDeletingQueryId(null);
    }
  };

  const runTemplateDelete = async (id: string) => {
    setDeletingTemplateId(id);
    setActionError(null);
    try {
      await deleteListingTemplate(id);
      await refreshTemplates({ force: true, background: true });
      listingTemplateToasts.success("delete");
      setSelectedTemplateIds((prev) =>
        prev.filter((selectedId) => selectedId !== id)
      );
      setPendingTemplateDeleteId(null);
    } catch (err) {
      setActionError(listingTemplateToasts.error("delete", err));
    } finally {
      setDeletingTemplateId(null);
    }
  };

  const runQueryBulkDelete = async (ids: string[]) => {
    if (ids.length === 0) return;
    setIsBulkWorking(true);
    setActionError(null);
    try {
      const results = await Promise.allSettled(
        ids.map((id) => deleteListingQuery(id))
      );
      await refreshQueries({ force: true, background: true });
      const summary = listingQueryToasts.summarizeBulkAction(
        "delete",
        ids,
        results
      );
      listingQueryToasts.emitBulk(summary);
      if (summary.ok) {
        clearQuerySelection();
      } else {
        setSelectedQueryIds(summary.failedTargets);
        setActionError(summary.inlineMessage);
      }
    } catch (err) {
      setActionError(
        listingQueryToasts.error("delete", err, {
          fallbackMessage: "Bulk query delete failed.",
        })
      );
    } finally {
      setIsBulkWorking(false);
      setPendingBulkQueryDeleteIds([]);
    }
  };

  const runTemplateBulkDelete = async (ids: string[]) => {
    if (ids.length === 0) return;
    setIsBulkWorking(true);
    setActionError(null);
    try {
      const results = await Promise.allSettled(
        ids.map((id) => deleteListingTemplate(id))
      );
      await refreshTemplates({ force: true, background: true });
      const summary = listingTemplateToasts.summarizeBulkAction(
        "delete",
        ids,
        results
      );
      listingTemplateToasts.emitBulk(summary);
      if (summary.ok) {
        clearTemplateSelection();
      } else {
        setSelectedTemplateIds(summary.failedTargets);
        setActionError(summary.inlineMessage);
      }
    } catch (err) {
      setActionError(
        listingTemplateToasts.error("delete", err, {
          fallbackMessage: "Bulk template delete failed.",
        })
      );
    } finally {
      setIsBulkWorking(false);
      setPendingBulkTemplateDeleteIds([]);
    }
  };

  const applyQueryBulkAction = () => {
    if (!queryBulkAction || visibleSelectedQueryIds.length === 0) return;
    setPendingBulkQueryDeleteIds(visibleSelectedQueryIds);
  };

  const applyTemplateBulkAction = () => {
    if (!templateBulkAction || visibleSelectedTemplateIds.length === 0) return;
    setPendingBulkTemplateDeleteIds(visibleSelectedTemplateIds);
  };

  const handleTemplateSaved = async () => {
    await refreshTemplates({ force: true, background: true });
    setTemplateCreateOpen(false);
    setEditingTemplateId(null);
    setActionError(null);
  };

  const activeSelectedCount =
    activeTab === "queries"
      ? visibleSelectedQueryIds.length
      : visibleSelectedTemplateIds.length;
  const activeBulkBar =
    activeTab === "queries" ? (
      <ListingBulkActionsBar
        selectedCount={visibleSelectedQueryIds.length}
        action={queryBulkAction}
        resourceLabel="listing queries"
        onActionChange={setQueryBulkAction}
        onApply={applyQueryBulkAction}
        onClear={clearQuerySelection}
        isApplying={isBulkWorking}
      />
    ) : (
      <ListingBulkActionsBar
        selectedCount={visibleSelectedTemplateIds.length}
        action={templateBulkAction}
        resourceLabel="listing templates"
        onActionChange={setTemplateBulkAction}
        onApply={applyTemplateBulkAction}
        onClear={clearTemplateSelection}
        isApplying={isBulkWorking}
      />
    );
  const handleNew = () => {
    if (activeTab === "queries") {
      navigate("/coderso/listings/new");
      return;
    }
    setTemplateCreateOpen(true);
  };

  return (
    <AdminShell
      activeHref="/admin/coderso/listings"
      breadcrumbs={
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <span>Coderso</span>
          <span>/</span>
          <span className="text-foreground">Listings</span>
        </div>
      }
    >
      <div className="mx-auto flex max-w-6xl flex-col gap-6">
        <PageHeader
          title="Listings"
          description="Create dynamic query presets and reusable list templates."
          actions={
            <>
              {activeSelectedCount > 0 ? activeBulkBar : null}
              <Button className="gap-2" onClick={handleNew}>
                <Plus className="h-4 w-4" />
                New
              </Button>
            </>
          }
        />

        {queryError ? (
          <Alert variant="destructive">
            <AlertTitle>Unable to load listing queries</AlertTitle>
            <AlertDescription>{queryError}</AlertDescription>
          </Alert>
        ) : null}
        {templateError ? (
          <Alert variant="destructive">
            <AlertTitle>Unable to load listing templates</AlertTitle>
            <AlertDescription>{templateError}</AlertDescription>
          </Alert>
        ) : null}
        {actionError ? (
          <Alert variant="destructive">
            <AlertTitle>Listing action failed</AlertTitle>
            <AlertDescription>{actionError}</AlertDescription>
          </Alert>
        ) : null}

        <Tabs
          value={activeTab}
          onValueChange={(value) => setActiveTab(value as ListingsTab)}
          className="space-y-4"
        >
          <TabsList>
            <TabsTrigger value="queries">Queries</TabsTrigger>
            <TabsTrigger value="templates">Templates</TabsTrigger>
          </TabsList>

          <TabsContent value="queries" className="space-y-4">
            <ListingQueryFilters
              search={querySearch}
              source={querySource}
              onSearchChange={setQuerySearch}
              onSourceChange={setQuerySource}
            />
            <ListingQueryTable
              items={queryPagination.visibleRows}
              selectedIds={selectedQueryIds}
              isAllSelected={isAllQueriesSelected}
              isIndeterminate={isQuerySelectionIndeterminate}
              onToggleAll={toggleAllQueries}
              onToggleItem={toggleQuery}
              onDelete={setPendingQueryDeleteId}
              emptyMessage={
                isQueryLoading
                  ? "Loading listing queries..."
                  : queryItems.length > 0
                    ? "No listing queries match your current filters."
                    : undefined
              }
            />
            <ListPaginationFooter
              resourceLabel="listing queries"
              pagination={queryPagination}
              isLoading={isQueryLoading}
            />
          </TabsContent>

          <TabsContent value="templates" className="space-y-4">
            <ListingTemplateFilters
              search={templateSearch}
              layout={templateLayout}
              onSearchChange={setTemplateSearch}
              onLayoutChange={setTemplateLayout}
            />
            <ListingTemplateTable
              items={templatePagination.visibleRows}
              selectedIds={selectedTemplateIds}
              isAllSelected={isAllTemplatesSelected}
              isIndeterminate={isTemplateSelectionIndeterminate}
              onToggleAll={toggleAllTemplates}
              onToggleItem={toggleTemplate}
              onEdit={setEditingTemplateId}
              onDelete={setPendingTemplateDeleteId}
              emptyMessage={
                isTemplateLoading
                  ? "Loading listing templates..."
                  : templateItems.length > 0
                    ? "No listing templates match your current filters."
                    : undefined
              }
            />
            <ListPaginationFooter
              resourceLabel="listing templates"
              pagination={templatePagination}
              isLoading={isTemplateLoading}
            />
          </TabsContent>
        </Tabs>
      </div>

      <ListingTemplateManager
        items={templateItems}
        createOpen={templateCreateOpen}
        editingTemplateId={editingTemplateId}
        onCreateOpenChange={setTemplateCreateOpen}
        onEditingTemplateIdChange={setEditingTemplateId}
        onSaved={handleTemplateSaved}
      />

      <ConfirmActionDialog
        open={Boolean(pendingQueryDeleteId)}
        onOpenChange={(open) => {
          if (!open) setPendingQueryDeleteId(null);
        }}
        title="Delete listing query?"
        description="Delete this listing query? This cannot be undone."
        confirmLabel="Delete query"
        confirmingLabel="Deleting..."
        isConfirming={deletingQueryId === pendingQueryDeleteId}
        onConfirm={() => {
          if (pendingQueryDeleteId) return runQueryDelete(pendingQueryDeleteId);
        }}
      />
      <ConfirmActionDialog
        open={pendingBulkQueryDeleteIds.length > 0}
        onOpenChange={(open) => {
          if (!open) setPendingBulkQueryDeleteIds([]);
        }}
        title="Delete selected listing queries?"
        description={`Delete ${pendingBulkQueryDeleteIds.length} listing quer${
          pendingBulkQueryDeleteIds.length === 1 ? "y" : "ies"
        }? This cannot be undone.`}
        confirmLabel="Delete selected"
        confirmingLabel="Deleting..."
        isConfirming={isBulkWorking}
        onConfirm={() => runQueryBulkDelete(pendingBulkQueryDeleteIds)}
      />
      <ConfirmActionDialog
        open={Boolean(pendingTemplateDeleteId)}
        onOpenChange={(open) => {
          if (!open) setPendingTemplateDeleteId(null);
        }}
        title="Delete listing template?"
        description="Delete this listing template? This cannot be undone."
        confirmLabel="Delete template"
        confirmingLabel="Deleting..."
        isConfirming={deletingTemplateId === pendingTemplateDeleteId}
        onConfirm={() => {
          if (pendingTemplateDeleteId) {
            return runTemplateDelete(pendingTemplateDeleteId);
          }
        }}
      />
      <ConfirmActionDialog
        open={pendingBulkTemplateDeleteIds.length > 0}
        onOpenChange={(open) => {
          if (!open) setPendingBulkTemplateDeleteIds([]);
        }}
        title="Delete selected listing templates?"
        description={`Delete ${pendingBulkTemplateDeleteIds.length} listing template${
          pendingBulkTemplateDeleteIds.length === 1 ? "" : "s"
        }? This cannot be undone.`}
        confirmLabel="Delete selected"
        confirmingLabel="Deleting..."
        isConfirming={isBulkWorking}
        onConfirm={() => runTemplateBulkDelete(pendingBulkTemplateDeleteIds)}
      />
    </AdminShell>
  );
}
