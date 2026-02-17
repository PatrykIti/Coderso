import { LayoutGrid, List, Plus } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
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
  getCachedEntries,
  listEntriesCached,
  updateEntryMetadata,
} from "@/services/entriesClient";
import { SplitShell } from "@/ui/layouts/SplitShell";
import { useAdminRouter } from "@/ui/contexts/AdminRouterContext";
import { subscribeCacheEvents } from "@/utils/cacheBus";

import { ContentTypeCreateDrawer } from "../content-types/ContentTypeCreateDrawer";
import { EntryCreateDrawer } from "./EntryCreateDrawer";
import {
  EntryBulkActionsBar,
  type BulkActionValue,
} from "./EntryBulkActionsBar";
import { getContentTypeLabels } from "./contentTypeLabels";
import { EntryFilters } from "./EntryFilters";
import { EntryGrid } from "./EntryGrid";
import { EntryTable } from "./EntryTable";
import { EntryTypeSidebar } from "./EntryTypeSidebar";

type EntryView = "list" | "grid";

export function filterEntries(
  entries: Awaited<ReturnType<typeof listEntriesCached>>,
  query: string,
  status: string,
  author: string
) {
  const normalized = query.trim().toLowerCase();
  return entries.filter((entry) => {
    const matchesQuery =
      !normalized ||
      entry.title.toLowerCase().includes(normalized) ||
      entry.slug.toLowerCase().includes(normalized);
    const matchesStatus = status === "all" || entry.status === status;
    const matchesAuthor =
      author === "any" || entry.author?.id === author;
    return matchesQuery && matchesStatus && matchesAuthor;
  });
}

export function EntryList() {
  const { navigate } = useAdminRouter();
  const [createOpen, setCreateOpen] = useState(false);
  const [collectionOpen, setCollectionOpen] = useState(false);
  const [types, setTypes] = useState<ContentTypeSummary[]>([]);
  const [activeSlug, setActiveSlug] = useState<string | null>(null);
  const [entries, setEntries] = useState([] as Awaited<ReturnType<typeof listEntriesCached>>);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [view, setView] = useState<EntryView>("list");
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [authorFilter, setAuthorFilter] = useState("any");
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [bulkAction, setBulkAction] = useState<BulkActionValue | "">("");
  const [isBulkWorking, setIsBulkWorking] = useState(false);

  useEffect(() => {
    let active = true;
    const cached = getCachedContentTypes();
    if (cached) {
      setTypes(cached);
      setActiveSlug((prev) => prev ?? cached[0]?.slug ?? null);
      setIsLoading(false);
    }
    listContentTypesCached({ force: true })
      .then((result) => {
        if (!active) return;
        setTypes(result);
        setActiveSlug((prev) => prev ?? result[0]?.slug ?? null);
        setError(null);
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
        if (active) setIsLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    return subscribeCacheEvents((event) => {
      if (event.key !== cacheKeys.contentTypesList) return;
      listContentTypesCached({ force: true })
        .then((result) => setTypes(result))
        .catch(() => undefined);
    });
  }, []);

  useEffect(() => {
    if (!activeSlug) return;
    let active = true;
    const cached = getCachedEntries(activeSlug);
    if (cached) {
      setEntries(cached);
      setTypes((prev) =>
        prev.map((type) =>
          type.slug === activeSlug
            ? { ...type, entryCount: cached.length }
            : type
        )
      );
      setIsLoading(false);
    }
    listEntriesCached(activeSlug, { force: true })
      .then((result) => {
        if (!active) return;
        setEntries(result);
        setTypes((prev) =>
          prev.map((type) =>
            type.slug === activeSlug
              ? { ...type, entryCount: result.length }
              : type
          )
        );
        setError(null);
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
        if (active) setIsLoading(false);
      });
    return () => {
      active = false;
    };
  }, [activeSlug]);

  useEffect(() => {
    if (!activeSlug) return;
    return subscribeCacheEvents((event) => {
      if (event.key !== cacheKeys.entriesList(activeSlug)) return;
      listEntriesCached(activeSlug, { force: true })
        .then((result) => {
          setEntries(result);
          setTypes((prev) =>
            prev.map((type) =>
              type.slug === activeSlug
                ? { ...type, entryCount: result.length }
                : type
            )
          );
        })
        .catch(() => undefined);
    });
  }, [activeSlug]);

  const activeType = useMemo(
    () => types.find((type) => type.slug === activeSlug) ?? null,
    [types, activeSlug]
  );

  const typeOptions = useMemo(() => {
    return types.map((type) => ({
      value: type.slug,
      label: `${type.name} (${type.entryCount ?? 0})`,
    }));
  }, [types]);

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

  const filteredEntries = useMemo(
    () => filterEntries(entries, searchQuery, statusFilter, authorFilter),
    [entries, searchQuery, statusFilter, authorFilter]
  );
  const visibleIds = useMemo(
    () => filteredEntries.map((entry) => entry.id),
    [filteredEntries]
  );
  const selectedCount = selectedIds.length;
  const isAllSelected =
    visibleIds.length > 0 && visibleIds.every((id) => selectedIds.includes(id));
  const isIndeterminate = selectedCount > 0 && !isAllSelected;

  const refreshEntries = async () => {
    if (!activeSlug) return;
    const updated = await listEntriesCached(activeSlug, { force: true });
    setEntries(updated);
    setTypes((prev) =>
      prev.map((type) =>
        type.slug === activeSlug
          ? { ...type, entryCount: updated.length }
          : type
      )
    );
  };

  const handleEditEntry = (id: string) => {
    if (!activeSlug) return;
    navigate(`/entries/${encodeURIComponent(activeSlug)}/${encodeURIComponent(id)}`);
  };

  const handleDeleteEntry = async (id: string) => {
    if (!activeSlug) return;
    if (typeof window !== "undefined") {
      const confirmed = window.confirm("Delete this entry? This cannot be undone.");
      if (!confirmed) return;
    }
    setError(null);
    try {
      await deleteEntry(activeSlug, id);
      await refreshEntries();
    } catch (err) {
      if (isApiClientError(err)) {
        setError(err.message);
      } else {
        setError("Failed to delete entry.");
      }
    }
  };

  const handleSelectType = (slug: string) => {
    setIsLoading(true);
    setError(null);
    setActiveSlug(slug);
  };

  const handleEntryCreated = (
    entry: { id: string },
    typeSlug: string,
    openAfterCreate: boolean
  ) => {
    setTypes((prev) =>
      prev.map((type) =>
        type.slug === typeSlug
          ? { ...type, entryCount: (type.entryCount ?? 0) + 1 }
          : type
      )
    );
    if (typeSlug === activeSlug) {
      listEntriesCached(typeSlug, { force: true }).then((result) => {
        setEntries(result);
        setTypes((prev) =>
          prev.map((type) =>
            type.slug === typeSlug
              ? { ...type, entryCount: result.length }
              : type
          )
        );
      });
    }
    if (openAfterCreate) {
      navigate(`/entries/${encodeURIComponent(typeSlug)}/${encodeURIComponent(entry.id)}`);
    }
  };

  const handleTypeCreated = (type: ContentTypeSummary) => {
    setTypes((prev) => [type, ...prev]);
    setActiveSlug(type.slug);
  };

  const handleClearFilters = () => {
    setSearchQuery("");
    setStatusFilter("all");
    setAuthorFilter("any");
  };

  const handleToggleEntry = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((entryId) => entryId !== id) : [...prev, id]
    );
  };

  const handleToggleAll = () => {
    setSelectedIds((_prev) => (isAllSelected ? [] : visibleIds));
  };

  const handleClearSelection = () => {
    setSelectedIds([]);
    setBulkAction("");
  };

  const handleBulkApply = async () => {
    if (!activeSlug || !bulkAction || selectedIds.length === 0) return;
    if (bulkAction === "delete" && typeof window !== "undefined") {
      const confirmed = window.confirm(
        `Delete ${selectedIds.length} entr${selectedIds.length === 1 ? "y" : "ies"}? This cannot be undone.`
      );
      if (!confirmed) return;
    }
    setIsBulkWorking(true);
    setError(null);
    try {
      const results = await Promise.allSettled(
        selectedIds.map((id) => {
          if (bulkAction === "delete") {
            return deleteEntry(activeSlug, id);
          }
          const status =
            bulkAction === "publish"
              ? "published"
              : bulkAction === "draft"
                ? "draft"
                : "archived";
          return updateEntryMetadata(activeSlug, id, { status });
        })
      );
      const failed = results.filter((result) => result.status === "rejected");
      if (failed.length > 0) {
        setError(
          `Failed to update ${failed.length} entr${failed.length === 1 ? "y" : "ies"}.`
        );
      }
      await refreshEntries();
      handleClearSelection();
    } catch (err) {
      if (isApiClientError(err)) {
        setError(err.message);
      } else {
        setError("Bulk action failed.");
      }
    } finally {
      setIsBulkWorking(false);
    }
  };

  useEffect(() => {
    setSelectedIds((prev) =>
      prev.filter((entryId) => entries.some((entry) => entry.id === entryId))
    );
  }, [entries]);

  useEffect(() => {
    if (view === "grid") {
      handleClearSelection();
    }
  }, [view]);

  const typeLabelSource = activeType?.name ?? activeSlug ?? "";
  const { singular: typeSingular, plural: typePlural } =
    getContentTypeLabels(typeLabelSource);

  return (
    <SplitShell
      activeHref="/admin/entries"
      breadcrumbs={
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <span>Content</span>
          <span>/</span>
          <span className="text-foreground">{typePlural}</span>
        </div>
      }
    >
      <div className="flex flex-col gap-6">
        {error ? (
          <Alert variant="destructive">
            <AlertTitle>Unable to load entries</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        ) : null}
        <div className="rounded-xl border bg-background lg:hidden">
          <EntryTypeSidebar
            className="h-[360px]"
            types={types.map((type) => ({
              id: type.id,
              slug: type.slug,
              name: type.name,
              count: type.entryCount ?? 0,
            }))}
            activeSlug={activeSlug}
            onSelect={handleSelectType}
            onCreateCollection={() => setCollectionOpen(true)}
          />
        </div>
        <div className="flex flex-col gap-6 lg:flex-row">
          <aside className="hidden w-72 shrink-0 overflow-hidden rounded-xl border bg-background lg:block">
            <EntryTypeSidebar
              types={types.map((type) => ({
                id: type.id,
                slug: type.slug,
                name: type.name,
                count: type.entryCount ?? 0,
              }))}
              activeSlug={activeSlug}
              onSelect={handleSelectType}
              onCreateCollection={() => setCollectionOpen(true)}
            />
          </aside>
          <div className="flex min-w-0 flex-1 flex-col gap-6">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex flex-wrap items-center gap-3">
                <h1 className="text-3xl font-semibold tracking-tight">
                  {typePlural}
                </h1>
                <Badge
                  variant="secondary"
                  className="rounded-md px-2 py-0.5 text-[10px] font-semibold uppercase tracking-widest"
                >
                  {typePlural}
                </Badge>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <div className="hidden items-center rounded-lg border bg-background p-1 shadow-xs sm:flex">
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    className={
                      view === "list"
                        ? "bg-primary/10 text-primary hover:bg-primary/15"
                        : "text-muted-foreground hover:text-foreground"
                    }
                    aria-pressed={view === "list"}
                    onClick={() => setView("list")}
                  >
                    <List className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    className={
                      view === "grid"
                        ? "bg-primary/10 text-primary hover:bg-primary/15"
                        : "text-muted-foreground hover:text-foreground"
                    }
                    aria-pressed={view === "grid"}
                    onClick={() => setView("grid")}
                  >
                    <LayoutGrid className="h-4 w-4" />
                  </Button>
                </div>
                <Button className="gap-2" onClick={() => setCreateOpen(true)}>
                  <Plus className="h-4 w-4" />
                  {`Create New ${typeSingular}`}
                </Button>
              </div>
            </div>
            <EntryFilters
              search={searchQuery}
              status={statusFilter}
              typeValue={activeSlug ?? (typeOptions[0]?.value ?? "")}
              typeOptions={typeOptions}
              author={authorFilter}
              authorOptions={authorOptions}
              onSearchChange={setSearchQuery}
              onStatusChange={setStatusFilter}
              onTypeChange={handleSelectType}
              onAuthorChange={setAuthorFilter}
              onClear={handleClearFilters}
            />
            {view === "list" && selectedCount > 0 ? (
              <EntryBulkActionsBar
                selectedCount={selectedCount}
                action={bulkAction}
                onActionChange={setBulkAction}
                onApply={handleBulkApply}
                onClear={handleClearSelection}
                isApplying={isBulkWorking}
              />
            ) : null}
            {isLoading ? (
              <div className="rounded-xl border border-dashed p-6 text-sm text-muted-foreground">
                Loading entries...
              </div>
            ) : view === "grid" ? (
              <EntryGrid
                entries={filteredEntries}
                onEdit={handleEditEntry}
                entryTypeSlug={activeSlug}
                emptyMessage={
                  entries.length > 0
                    ? "No entries match your current filters."
                    : undefined
                }
              />
            ) : (
              <EntryTable
                entries={filteredEntries}
                onEdit={handleEditEntry}
                entryTypeSlug={activeSlug}
                onDelete={handleDeleteEntry}
                selectedIds={selectedIds}
                isAllSelected={isAllSelected}
                isIndeterminate={isIndeterminate}
                onToggleAll={handleToggleAll}
                onToggleEntry={handleToggleEntry}
                emptyMessage={
                  entries.length > 0
                    ? "No entries match your current filters."
                    : undefined
                }
              />
            )}
          </div>
        </div>
      </div>
      <EntryCreateDrawer
        open={createOpen}
        onOpenChange={setCreateOpen}
        types={types}
        defaultTypeSlug={activeSlug}
        onCreated={handleEntryCreated}
      />
      <ContentTypeCreateDrawer
        open={collectionOpen}
        onOpenChange={setCollectionOpen}
        onCreated={handleTypeCreated}
      />
    </SplitShell>
  );
}
