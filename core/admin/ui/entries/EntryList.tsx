import { Plus } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { isApiClientError } from "@/services/apiClient";
import { cacheKeys } from "@/services/cachePolicy";
import {
  getCachedContentTypes,
  listContentTypesCached,
  type ContentTypeSummary,
} from "@/services/contentTypesClient";
import {
  deleteEntry,
  duplicateEntry,
  getCachedAllEntries,
  listAllEntriesCached,
  updateEntryMetadata,
  type EntryListItem,
  type EntryStatus,
} from "@/services/entriesClient";
import { AdminShell } from "@/ui/layouts/AdminShell";
import { ConfirmActionDialog } from "@/ui/shared/ConfirmActionDialog";
import { ListPaginationFooter } from "@/ui/shared/ListPaginationFooter";
import { createListActionToastAdapter } from "@/ui/shared/listActionToasts";
import { PageHeader } from "@/ui/shared/PageHeader";
import { StatusTabs } from "@/ui/shared/StatusTabs";
import { useListPagination } from "@/ui/shared/useListPagination";
import { useAdminRouter } from "@/ui/contexts/AdminRouterContext";
import { subscribeCacheEvents } from "@/utils/cacheBus";
import { resolveCacheRefreshBackground } from "@/utils/cacheRefresh";

import { EntryCreateDrawer } from "./EntryCreateDrawer";
import { EntryBulkActionsBar, type BulkActionValue } from "./EntryBulkActionsBar";
import { EntryFilters } from "./EntryFilters";
import { EntryGrid } from "./EntryGrid";
import { EntryTable } from "./EntryTable";

export type SelectedEntryRef = {
  id: string;
  typeSlug: string;
};

const entryListToasts = createListActionToastAdapter({
  labels: { singular: "entry", plural: "entries" },
  actions: {
    create: { pastTense: "created", failureVerb: "create" },
    publish: { pastTense: "published", failureVerb: "publish" },
    draft: {
      pastTense: "moved to draft",
      failureVerb: "move",
      errorFallback: "Failed to move entry to draft.",
      bulkPartialMessage: ({ succeededCount, failedCount, labels }) =>
        `Moved ${succeededCount} ${
          succeededCount === 1 ? labels.singular : labels.plural
        } to draft; failed ${failedCount}.`,
      bulkFailureMessage: ({ failedCount, labels }) =>
        `Failed to move ${failedCount} ${
          failedCount === 1 ? labels.singular : labels.plural
        } to draft.`,
    },
    archive: { pastTense: "archived", failureVerb: "archive" },
    delete: { pastTense: "deleted", failureVerb: "delete" },
  },
});

type DeleteRequest = {
  refs: SelectedEntryRef[];
  title: string;
  description: string;
  confirmLabel: string;
  mode: "single" | "bulk";
};

export type EntryListFilters = {
  query: string;
  status: string;
  typeSlug: string;
  author: string;
  updatedFrom: string;
  updatedTo: string;
};

export const resolveEntrySelectionKey = (ref: SelectedEntryRef) => `${ref.typeSlug}:${ref.id}`;

const toEntryRef = (entry: EntryListItem): SelectedEntryRef => ({
  id: entry.id,
  typeSlug: entry.contentType.slug,
});

const parseDateBoundary = (value: string, endOfDay: boolean) => {
  if (!value) return null;
  const suffix = endOfDay ? "T23:59:59.999" : "T00:00:00.000";
  const timestamp = new Date(`${value}${suffix}`).getTime();
  return Number.isNaN(timestamp) ? null : timestamp;
};

export function filterEntries(entries: EntryListItem[], filters: EntryListFilters) {
  const normalized = filters.query.trim().toLowerCase();
  const updatedFrom = parseDateBoundary(filters.updatedFrom, false);
  const updatedTo = parseDateBoundary(filters.updatedTo, true);

  return entries.filter((entry) => {
    const updatedAt = new Date(entry.updatedAt).getTime();
    const matchesQuery =
      !normalized ||
      entry.title.toLowerCase().includes(normalized) ||
      entry.slug.toLowerCase().includes(normalized);
    const matchesStatus = filters.status === "all" || entry.status === filters.status;
    const matchesType = filters.typeSlug === "all" || entry.contentType.slug === filters.typeSlug;
    const matchesAuthor = filters.author === "any" || entry.author?.id === filters.author;
    const matchesUpdatedFrom =
      updatedFrom === null || (!Number.isNaN(updatedAt) && updatedAt >= updatedFrom);
    const matchesUpdatedTo =
      updatedTo === null || (!Number.isNaN(updatedAt) && updatedAt <= updatedTo);

    return (
      matchesQuery &&
      matchesStatus &&
      matchesType &&
      matchesAuthor &&
      matchesUpdatedFrom &&
      matchesUpdatedTo
    );
  });
}

export function EntryList() {
  const { navigate } = useAdminRouter();
  const initialEntries = useMemo(() => getCachedAllEntries(), []);
  const initialTypes = useMemo(() => getCachedContentTypes(), []);
  const hasInitialEntries = initialEntries !== null;
  const hasInitialTypes = initialTypes !== null;
  const [createOpen, setCreateOpen] = useState(false);
  const [entries, setEntries] = useState<EntryListItem[]>(() => initialEntries ?? []);
  const [types, setTypes] = useState<ContentTypeSummary[]>(() => initialTypes ?? []);
  const [entriesLoading, setEntriesLoading] = useState(() => !hasInitialEntries);
  const [typesLoading, setTypesLoading] = useState(() => !hasInitialTypes);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [typeFilter, setTypeFilter] = useState("all");
  const [authorFilter, setAuthorFilter] = useState("any");
  const [updatedFromFilter, setUpdatedFromFilter] = useState("");
  const [updatedToFilter, setUpdatedToFilter] = useState("");
  const [advancedFiltersOpen, setAdvancedFiltersOpen] = useState(false);
  const [view, setView] = useState<"list" | "grid">(() =>
    typeof window !== "undefined" && window.localStorage.getItem("entries.view") === "grid"
      ? "grid"
      : "list"
  );
  const changeView = useCallback((next: "list" | "grid") => {
    setView(next);
    if (typeof window !== "undefined") {
      window.localStorage.setItem("entries.view", next);
    }
  }, []);
  const [selectedRefs, setSelectedRefs] = useState<SelectedEntryRef[]>([]);
  const [bulkAction, setBulkAction] = useState<BulkActionValue | "">("");
  const [isBulkWorking, setIsBulkWorking] = useState(false);
  const [deleteRequest, setDeleteRequest] = useState<DeleteRequest | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const hasHydratedEntriesRef = useRef(hasInitialEntries);
  const hasHydratedTypesRef = useRef(hasInitialTypes);

  const refreshEntries = useCallback(
    async (options?: { force?: boolean; background?: boolean }) => {
      const background = resolveCacheRefreshBackground({
        explicitBackground: options?.background,
        hasHydrated: hasHydratedEntriesRef.current,
      });
      if (!background) setEntriesLoading(true);
      setError(null);
      try {
        const next = await listAllEntriesCached({ force: options?.force ?? false });
        setEntries(next);
        hasHydratedEntriesRef.current = true;
      } catch (err) {
        if (isApiClientError(err)) {
          setError(err.message);
        } else {
          setError("Failed to load entries.");
        }
      } finally {
        if (!background) setEntriesLoading(false);
      }
    },
    []
  );

  const refreshTypes = useCallback(async (options?: { force?: boolean; background?: boolean }) => {
    const background = resolveCacheRefreshBackground({
      explicitBackground: options?.background,
      hasHydrated: hasHydratedTypesRef.current,
    });
    if (!background) setTypesLoading(true);
    try {
      const next = await listContentTypesCached({ force: options?.force ?? false });
      setTypes(next);
      hasHydratedTypesRef.current = true;
    } catch (err) {
      if (isApiClientError(err)) {
        setError(err.message);
      } else {
        setError("Failed to load content types.");
      }
    } finally {
      if (!background) setTypesLoading(false);
    }
  }, []);

  useEffect(() => {
    let active = true;
    listAllEntriesCached({ force: !hasInitialEntries })
      .then((next) => {
        if (!active) return;
        setEntries(next);
        hasHydratedEntriesRef.current = true;
      })
      .catch((err) => {
        if (!active) return;
        if (isApiClientError(err)) {
          setError(err.message);
        } else {
          setError("Failed to load entries.");
        }
      })
      .finally(() => {
        if (active && !hasInitialEntries) setEntriesLoading(false);
      });
    return () => {
      active = false;
    };
  }, [hasInitialEntries]);

  useEffect(() => {
    let active = true;
    listContentTypesCached({ force: !hasInitialTypes })
      .then((next) => {
        if (!active) return;
        setTypes(next);
        hasHydratedTypesRef.current = true;
      })
      .catch((err) => {
        if (!active) return;
        if (isApiClientError(err)) {
          setError(err.message);
        } else {
          setError("Failed to load content types.");
        }
      })
      .finally(() => {
        if (active && !hasInitialTypes) setTypesLoading(false);
      });
    return () => {
      active = false;
    };
  }, [hasInitialTypes]);

  useEffect(() => {
    return subscribeCacheEvents((event) => {
      if (event.key === cacheKeys.entriesAllList) {
        refreshEntries({ force: true, background: true }).catch(() => undefined);
      }
      if (event.key === cacheKeys.contentTypesList) {
        refreshTypes({ force: true, background: true }).catch(() => undefined);
      }
    });
  }, [refreshEntries, refreshTypes]);

  const typeOptions = useMemo(() => {
    const counts = new Map<string, number>();
    const labels = new Map<string, { id: string; name: string; slug: string }>();
    for (const entry of entries) {
      counts.set(entry.contentType.slug, (counts.get(entry.contentType.slug) ?? 0) + 1);
      labels.set(entry.contentType.slug, {
        id: entry.contentType.id,
        name: entry.contentType.name,
        slug: entry.contentType.slug,
      });
    }
    for (const type of types) {
      labels.set(type.slug, { id: type.id, name: type.name, slug: type.slug });
      if (!counts.has(type.slug)) counts.set(type.slug, type.entryCount ?? 0);
    }
    return [
      { value: "all", label: `Content type: All (${entries.length})` },
      ...Array.from(labels.values())
        .sort((a, b) => a.name.localeCompare(b.name))
        .map((type) => ({
          value: type.slug,
          label: `${type.name} (${counts.get(type.slug) ?? 0})`,
        })),
    ];
  }, [entries, types]);

  const authorOptions = useMemo(() => {
    const map = new Map<string, string>();
    entries.forEach((entry) => {
      if (!entry.author) return;
      map.set(entry.author.id, entry.author.name ?? entry.author.email);
    });
    return Array.from(map.entries())
      .map(([value, label]) => ({ value, label }))
      .sort((a, b) => a.label.localeCompare(b.label));
  }, [entries]);

  // Status tabs are derived at render from the already-loaded entries (no extra
  // fetch, no sync setState in an effect); a tab click only flips the existing
  // statusFilter. Tabs use the real EntryStatus enum + "all" — there is no
  // "review" status, so the prototype's invented tab is dropped.
  const statusTabs = useMemo(() => {
    const by = (value: EntryStatus) => entries.filter((entry) => entry.status === value).length;
    return [
      { value: "all", label: "All", count: entries.length },
      { value: "published", label: "Published", count: by("published") },
      { value: "draft", label: "Drafts", count: by("draft") },
      { value: "scheduled", label: "Scheduled", count: by("scheduled") },
      { value: "archived", label: "Archived", count: by("archived") },
    ];
  }, [entries]);

  const filters = useMemo<EntryListFilters>(
    () => ({
      query: searchQuery,
      status: statusFilter,
      typeSlug: typeFilter,
      author: authorFilter,
      updatedFrom: updatedFromFilter,
      updatedTo: updatedToFilter,
    }),
    [authorFilter, searchQuery, statusFilter, typeFilter, updatedFromFilter, updatedToFilter]
  );

  const filteredEntries = useMemo(() => filterEntries(entries, filters), [entries, filters]);
  const pagination = useListPagination(filteredEntries, {
    resetKey: JSON.stringify(filters),
  });
  const visibleKeys = useMemo(
    () => pagination.visibleRows.map((entry) => resolveEntrySelectionKey(toEntryRef(entry))),
    [pagination.visibleRows]
  );
  const visibleKeySet = useMemo(() => new Set(visibleKeys), [visibleKeys]);
  const visibleSelectedRefs = selectedRefs.filter((ref) =>
    visibleKeySet.has(resolveEntrySelectionKey(ref))
  );
  const selectedKeys = useMemo(
    () => visibleSelectedRefs.map(resolveEntrySelectionKey),
    [visibleSelectedRefs]
  );
  const selectedCount = visibleSelectedRefs.length;
  const isAllSelected =
    visibleKeys.length > 0 && visibleKeys.every((key) => selectedKeys.includes(key));
  const isIndeterminate = selectedCount > 0 && !isAllSelected;
  const isLoading = entriesLoading || typesLoading;
  const defaultCreateTypeSlug =
    typeFilter !== "all" ? typeFilter : (types[0]?.slug ?? entries[0]?.contentType.slug ?? null);

  const findEntry = (id: string) => entries.find((entry) => entry.id === id) ?? null;

  const handleEditEntry = (id: string) => {
    const entry = findEntry(id);
    if (!entry) return;
    navigate(`/entries/${encodeURIComponent(entry.contentType.slug)}/${encodeURIComponent(id)}`);
  };

  const handleDeleteEntry = (id: string) => {
    const entry = findEntry(id);
    if (!entry) return;
    setDeleteRequest({
      refs: [toEntryRef(entry)],
      title: "Delete entry?",
      description: `Delete ${entry.title}? This cannot be undone.`,
      confirmLabel: "Delete entry",
      mode: "single",
    });
  };

  const handleDuplicateEntry = async (id: string) => {
    const entry = findEntry(id);
    if (!entry) return;
    setError(null);
    try {
      const duplicated = await duplicateEntry(entry.contentType.slug, id);
      await refreshEntries({ force: true, background: true });
      toast.success("Entry duplicated.");
      navigate(
        `/entries/${encodeURIComponent(entry.contentType.slug)}/${encodeURIComponent(
          duplicated.id
        )}`
      );
    } catch (err) {
      if (isApiClientError(err)) {
        setError(err.message);
        toast.error(err.message);
      } else {
        setError("Failed to duplicate entry.");
        toast.error("Failed to duplicate entry.");
      }
    }
  };

  const handleEntryCreated = (
    entry: { id: string },
    typeSlug: string,
    openAfterCreate: boolean
  ) => {
    entryListToasts.success("create");
    void refreshEntries({ force: true, background: true });
    void refreshTypes({ force: true, background: true });
    if (openAfterCreate) {
      navigate(`/entries/${encodeURIComponent(typeSlug)}/${encodeURIComponent(entry.id)}`);
    }
  };

  const handleClearFilters = () => {
    setSearchQuery("");
    setStatusFilter("all");
    setTypeFilter("all");
    setAuthorFilter("any");
    setUpdatedFromFilter("");
    setUpdatedToFilter("");
  };

  const handleToggleEntry = (id: string) => {
    const entry = findEntry(id);
    if (!entry) return;
    const ref = toEntryRef(entry);
    const key = resolveEntrySelectionKey(ref);
    setSelectedRefs((prev) =>
      prev.some((item) => resolveEntrySelectionKey(item) === key)
        ? prev.filter((item) => resolveEntrySelectionKey(item) !== key)
        : [...prev, ref]
    );
  };

  const handleToggleAll = () => {
    setSelectedRefs((_prev) => (isAllSelected ? [] : pagination.visibleRows.map(toEntryRef)));
  };

  const handleClearSelection = () => {
    setSelectedRefs([]);
    setBulkAction("");
  };

  const runBulkAction = async (action: Exclude<BulkActionValue, "delete">) => {
    const status = action === "publish" ? "published" : action === "draft" ? "draft" : "archived";
    const results = await Promise.allSettled(
      visibleSelectedRefs.map((ref) => updateEntryMetadata(ref.typeSlug, ref.id, { status }))
    );
    const summary = entryListToasts.summarizeBulkAction(action, visibleSelectedRefs, results);
    entryListToasts.emitBulk(summary);
    return summary.ok ? null : summary.inlineMessage;
  };

  const handleBulkApply = async () => {
    if (!bulkAction || visibleSelectedRefs.length === 0) return;
    if (bulkAction === "delete") {
      setDeleteRequest({
        refs: visibleSelectedRefs,
        title: `Delete ${selectedCount} entr${selectedCount === 1 ? "y" : "ies"}?`,
        description: "Selected entries will be removed permanently.",
        confirmLabel: selectedCount === 1 ? "Delete entry" : "Delete entries",
        mode: "bulk",
      });
      return;
    }
    setIsBulkWorking(true);
    setError(null);
    try {
      const feedback = await runBulkAction(bulkAction);
      await refreshEntries({ force: true, background: true });
      if (feedback) setError(feedback);
      handleClearSelection();
    } catch (err) {
      setError(
        entryListToasts.error("publish", err, {
          fallbackMessage: "Bulk action failed.",
        })
      );
    } finally {
      setIsBulkWorking(false);
    }
  };

  const confirmDeleteRequest = async () => {
    if (!deleteRequest) return;
    setIsDeleting(true);
    setError(null);
    try {
      const results = await Promise.allSettled(
        deleteRequest.refs.map((ref) => deleteEntry(ref.typeSlug, ref.id))
      );
      const summary = entryListToasts.summarizeBulkAction("delete", deleteRequest.refs, results);
      if (deleteRequest.mode === "single" && summary.ok) {
        entryListToasts.success("delete");
      } else {
        entryListToasts.emitBulk(summary);
      }
      await refreshEntries({ force: true, background: true });
      if (!summary.ok) setError(summary.inlineMessage);
      if (deleteRequest.mode === "bulk") handleClearSelection();
      setDeleteRequest(null);
    } catch (err) {
      setError(entryListToasts.error("delete", err));
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <AdminShell activeHref="/admin/entries" breadcrumbs={["Content", "Entries"]}>
      <div className="mx-auto flex max-w-6xl flex-col gap-6">
        <PageHeader
          title="Entries"
          description="Every piece of structured content across your content types."
          actions={
            <>
              {selectedCount > 0 ? (
                <EntryBulkActionsBar
                  selectedCount={selectedCount}
                  action={bulkAction}
                  onActionChange={setBulkAction}
                  onApply={handleBulkApply}
                  onClear={handleClearSelection}
                  isApplying={isBulkWorking}
                  variant="inline"
                />
              ) : null}
              <Button
                className="gap-2"
                onClick={() => setCreateOpen(true)}
                disabled={types.length === 0}
              >
                <Plus className="h-4 w-4" />
                New
              </Button>
            </>
          }
        />
        {error ? (
          <Alert variant="destructive">
            <AlertTitle>Entries API error</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        ) : null}
        <StatusTabs tabs={statusTabs} value={statusFilter} onValueChange={setStatusFilter} />
        <EntryFilters
          search={searchQuery}
          typeValue={typeFilter}
          typeOptions={typeOptions}
          author={authorFilter}
          authorOptions={authorOptions}
          updatedFrom={updatedFromFilter}
          updatedTo={updatedToFilter}
          advancedOpen={advancedFiltersOpen}
          view={view}
          onViewChange={changeView}
          onSearchChange={setSearchQuery}
          onTypeChange={setTypeFilter}
          onAuthorChange={setAuthorFilter}
          onUpdatedFromChange={setUpdatedFromFilter}
          onUpdatedToChange={setUpdatedToFilter}
          onAdvancedOpenChange={setAdvancedFiltersOpen}
          onClear={handleClearFilters}
        />
        {isLoading ? (
          <div className="rounded-2xl border border-border bg-card p-6 text-sm text-muted-foreground shadow-card">
            Loading entries...
          </div>
        ) : view === "grid" ? (
          <EntryGrid
            entries={pagination.visibleRows}
            onEdit={handleEditEntry}
            emptyMessage={entries.length > 0 ? "No entries match your current filters." : undefined}
          />
        ) : (
          <EntryTable
            entries={pagination.visibleRows}
            selectedKeys={selectedKeys}
            isAllSelected={isAllSelected}
            isIndeterminate={isIndeterminate}
            onToggleAll={handleToggleAll}
            onToggleEntry={handleToggleEntry}
            onEdit={handleEditEntry}
            onDelete={handleDeleteEntry}
            onDuplicate={handleDuplicateEntry}
            emptyMessage={entries.length > 0 ? "No entries match your current filters." : undefined}
          />
        )}
        <ListPaginationFooter
          resourceLabel="entries"
          pagination={pagination}
          isLoading={isLoading}
        />
      </div>
      <EntryCreateDrawer
        open={createOpen}
        onOpenChange={setCreateOpen}
        types={types}
        defaultTypeSlug={defaultCreateTypeSlug}
        onCreated={handleEntryCreated}
        onCreateError={(err) => {
          entryListToasts.error("create", err);
        }}
      />
      <ConfirmActionDialog
        open={Boolean(deleteRequest)}
        onOpenChange={(open) => {
          if (!open && !isDeleting) setDeleteRequest(null);
        }}
        title={deleteRequest?.title ?? "Delete entry?"}
        description={deleteRequest?.description ?? "This entry will be removed permanently."}
        confirmLabel={deleteRequest?.confirmLabel ?? "Delete entry"}
        confirmingLabel="Deleting..."
        isConfirming={isDeleting}
        onConfirm={() => void confirmDeleteRequest()}
      />
    </AdminShell>
  );
}
