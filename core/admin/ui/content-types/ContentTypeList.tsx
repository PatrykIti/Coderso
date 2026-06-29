import {
  Copy,
  Database,
  LayoutGrid,
  Layers,
  MoreHorizontal,
  Pencil,
  Plus,
  Search,
  Table as TableIcon,
  Trash2,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";
import { isApiClientError } from "@/services/apiClient";
import { cacheKeys } from "@/services/cachePolicy";
import {
  deleteContentType,
  duplicateContentType,
  getCachedContentTypes,
  listContentTypesCached,
  updateContentType,
  type ContentTypeSummary,
} from "@/services/contentTypesClient";
import { useAdminRouter } from "@/ui/contexts/AdminRouterContext";
import { subscribeCacheEvents } from "@/utils/cacheBus";
import { AdminShell } from "@/ui/layouts/AdminShell";
import { AdminLink } from "@/ui/shared/AdminLink";
import { ConfirmActionDialog } from "@/ui/shared/ConfirmActionDialog";
import { EmptyState } from "@/ui/shared/EmptyState";
import { ListPaginationFooter } from "@/ui/shared/ListPaginationFooter";
import { ListSkeleton } from "@/ui/shared/ListSkeleton";
import { createListActionToastAdapter } from "@/ui/shared/listActionToasts";
import { PageHeader } from "@/ui/shared/PageHeader";
import { StatCard } from "@/ui/shared/StatCard";
import { StatusBadge } from "@/ui/shared/StatusBadge";
import { useListPagination } from "@/ui/shared/useListPagination";
import { resolveAdminBasePath, resolveAdminRoutePath } from "@/utils/adminPaths";

import { ContentTypeCreateDrawer } from "./ContentTypeCreateDrawer";
import { ContentTypeTable, type ContentTypeRow } from "./ContentTypeTable";
import { countSchemaFields } from "./schemaMapping";

type ContentTypeBulkActionValue = "publish" | "draft" | "delete";

const contentTypeListToasts = createListActionToastAdapter({
  labels: { singular: "content type", plural: "content types" },
  actions: {
    create: {
      pastTense: "created",
      failureVerb: "create",
      singleSuccessMessage: ({ targetLabel }) =>
        targetLabel ? `Collection "${targetLabel}" created.` : "Collection created.",
    },
    publish: { pastTense: "published", failureVerb: "publish" },
    draft: {
      pastTense: "moved to draft",
      failureVerb: "move",
      errorFallback: "Failed to move content type to draft.",
      bulkPartialMessage: ({ succeededCount, failedCount, labels }) =>
        `Moved ${succeededCount} ${
          succeededCount === 1 ? labels.singular : labels.plural
        } to draft; failed ${failedCount}.`,
      bulkFailureMessage: ({ failedCount, labels }) =>
        `Failed to move ${failedCount} ${
          failedCount === 1 ? labels.singular : labels.plural
        } to draft.`,
    },
    delete: { pastTense: "deleted", failureVerb: "delete" },
  },
});

function ContentTypeBulkActionsBar({
  selectedCount,
  action,
  onActionChange,
  onApply,
  onClear,
  isApplying,
}: {
  selectedCount: number;
  action: ContentTypeBulkActionValue | "";
  onActionChange: (value: ContentTypeBulkActionValue | "") => void;
  onApply: () => void;
  onClear: () => void;
  isApplying: boolean;
}) {
  return (
    <div
      data-content-type-bulk-actions="inline"
      className="flex min-w-0 flex-wrap items-center justify-end gap-2"
    >
      <div className="flex shrink-0 items-center gap-2">
        <Badge variant="secondary" className="text-[10px] uppercase tracking-widest">
          Selected {selectedCount}
        </Badge>
        <span className="sr-only">Apply a bulk action to the selected content types.</span>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <Select
          value={action}
          onValueChange={(value) => onActionChange(value as ContentTypeBulkActionValue)}
        >
          <SelectTrigger className="h-8 w-[160px]">
            <SelectValue placeholder="Bulk actions" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="publish">Publish</SelectItem>
            <SelectItem value="draft">Move to Draft</SelectItem>
            <SelectItem value="delete" className="text-destructive">
              Delete
            </SelectItem>
          </SelectContent>
        </Select>
        <Button size="sm" onClick={onApply} disabled={!action || isApplying}>
          {isApplying ? "Applying..." : "Apply"}
        </Button>
        <Button variant="ghost" size="sm" onClick={onClear} aria-label="Clear selection">
          Clear
        </Button>
      </div>
    </div>
  );
}

export function ContentTypeList() {
  const { navigate } = useAdminRouter();
  const basePath = resolveAdminBasePath();
  const [view, setView] = useState<"grid" | "table">("grid");
  const initialCached = getCachedContentTypes();
  const [types, setTypes] = useState<ContentTypeSummary[]>(() => initialCached ?? []);
  const [isLoading, setIsLoading] = useState(() => !initialCached);
  const [error, setError] = useState<string | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "draft" | "published">("all");
  const [sortKey, setSortKey] = useState<"name" | "slug" | "fieldCount" | "status">("name");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("asc");
  const [pendingDelete, setPendingDelete] = useState<ContentTypeRow | null>(null);
  const [pendingBulkDeleteIds, setPendingBulkDeleteIds] = useState<string[]>([]);
  const [isDeleting, setIsDeleting] = useState(false);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [bulkAction, setBulkAction] = useState<ContentTypeBulkActionValue | "">("");
  const [isBulkWorking, setIsBulkWorking] = useState(false);
  const [bulkFeedback, setBulkFeedback] = useState<{
    title: string;
    message: string;
  } | null>(null);

  const duplicateNameCounts = useMemo(() => {
    const counts = new Map<string, number>();
    types.forEach((type) => {
      const key = type.name.trim().toLowerCase();
      counts.set(key, (counts.get(key) ?? 0) + 1);
    });
    return counts;
  }, [types]);

  const rows = useMemo<ContentTypeRow[]>(() => {
    const normalizedQuery = query.trim().toLowerCase();
    const mapped = types
      .map((type) => ({
        ...type,
        fieldCount: countSchemaFields(type.schema),
        status: type.status ?? "draft",
        duplicateNameCount: duplicateNameCounts.get(type.name.trim().toLowerCase()) ?? 1,
      }))
      .filter((type) => {
        if (statusFilter !== "all" && type.status !== statusFilter) return false;
        if (!normalizedQuery) return true;
        return (
          type.name.toLowerCase().includes(normalizedQuery) ||
          type.slug.toLowerCase().includes(normalizedQuery)
        );
      });
    mapped.sort((left, right) => {
      const leftValue = left[sortKey];
      const rightValue = right[sortKey];
      const compared =
        typeof leftValue === "number" && typeof rightValue === "number"
          ? leftValue - rightValue
          : String(leftValue).localeCompare(String(rightValue));
      return sortDirection === "asc" ? compared : -compared;
    });
    return mapped;
  }, [duplicateNameCounts, query, sortDirection, sortKey, statusFilter, types]);
  const summary = useMemo(() => {
    const totalEntries = types.reduce((total, type) => total + (type.entryCount ?? 0), 0);
    const totalFields = rows.reduce((total, row) => total + row.fieldCount, 0);
    return { typeCount: types.length, totalEntries, totalFields };
  }, [rows, types]);
  const pagination = useListPagination(rows, {
    resetKey: JSON.stringify({
      query,
      statusFilter,
      sortKey,
      sortDirection,
    }),
  });
  const visibleIds = useMemo(
    () => pagination.visibleRows.map((row) => row.id),
    [pagination.visibleRows]
  );
  const visibleSelectedIds = selectedIds.filter((id) => visibleIds.includes(id));
  const selectedCount = visibleSelectedIds.length;
  const isAllSelected = visibleIds.length > 0 && visibleIds.every((id) => selectedIds.includes(id));
  const isIndeterminate = selectedCount > 0 && !isAllSelected;

  useEffect(() => {
    let active = true;
    listContentTypesCached({ force: true })
      .then((result) => {
        if (!active) return;
        setTypes(result);
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

  const handleCreated = (created: ContentTypeSummary) => {
    setTypes((prev) => [created, ...prev]);
    contentTypeListToasts.success("create", { targetLabel: created.name });
    navigate(`/content-types/${encodeURIComponent(created.id)}`);
  };

  const handleSortChange = (key: typeof sortKey) => {
    if (sortKey === key) {
      setSortDirection((prev) => (prev === "asc" ? "desc" : "asc"));
      return;
    }
    setSortKey(key);
    setSortDirection("asc");
  };

  const handleDuplicate = async (type: ContentTypeRow) => {
    try {
      const duplicated = await duplicateContentType(type.id);
      setTypes((prev) => [duplicated, ...prev]);
      toast.success(`Duplicated "${duplicated.name}".`);
      navigate(`/content-types/${encodeURIComponent(duplicated.id)}`);
    } catch (err) {
      const message = isApiClientError(err) ? err.message : "Failed to duplicate content type.";
      setError(message);
      toast.error(message);
    }
  };

  const handleDelete = async () => {
    if (!pendingDelete) return;
    setIsDeleting(true);
    setError(null);
    try {
      await deleteContentType(pendingDelete.id);
      setTypes((prev) => prev.filter((type) => type.id !== pendingDelete.id));
      contentTypeListToasts.success("delete", {
        targetLabel: pendingDelete.name,
      });
      setPendingDelete(null);
    } catch (err) {
      const message = contentTypeListToasts.error("delete", err);
      setError(message);
    } finally {
      setIsDeleting(false);
    }
  };

  const handleToggleRow = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((typeId) => typeId !== id) : [...prev, id]
    );
  };

  const handleToggleAll = () => {
    setSelectedIds(isAllSelected ? [] : visibleIds);
  };

  const handleClearSelection = () => {
    setSelectedIds([]);
    setBulkAction("");
  };

  const runBulkAction = async (action: ContentTypeBulkActionValue, ids: string[]) => {
    if (ids.length === 0) return;
    setIsBulkWorking(true);
    setError(null);
    setBulkFeedback(null);
    try {
      const results = await Promise.allSettled(
        ids.map((id) => {
          if (action === "publish") return updateContentType(id, { status: "published" });
          if (action === "draft") return updateContentType(id, { status: "draft" });
          return deleteContentType(id);
        })
      );
      const failedIds = ids.filter((_, index) => results[index]?.status === "rejected");
      const summary = contentTypeListToasts.summarizeBulkAction(action, ids, results);
      const nextTypes = await listContentTypesCached({ force: true });
      setTypes(nextTypes);
      contentTypeListToasts.emitBulk(summary);

      if (failedIds.length > 0) {
        setSelectedIds(summary.failedTargets);
        setError(summary.inlineMessage);
        return;
      }

      handleClearSelection();
      setBulkFeedback({
        title: "Bulk action completed",
        message: summary.inlineMessage,
      });
    } catch (err) {
      const message = contentTypeListToasts.error("publish", err, {
        fallbackMessage: "Bulk action failed.",
      });
      setError(message);
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
    <AdminShell activeHref="/admin/content-types" breadcrumbs={["Content", "Content Types"]}>
      <div className="mx-auto flex max-w-6xl flex-col gap-6">
        <PageHeader
          title="Content Types"
          description="Create reusable schemas for structured content entries."
          actions={
            <>
              {selectedCount > 0 ? (
                <ContentTypeBulkActionsBar
                  selectedCount={selectedCount}
                  action={bulkAction}
                  onActionChange={setBulkAction}
                  onApply={handleBulkApply}
                  onClear={handleClearSelection}
                  isApplying={isBulkWorking}
                />
              ) : null}
              <Button className="gap-2" onClick={() => setCreateOpen(true)}>
                <Plus className="h-4 w-4" />
                New type
              </Button>
            </>
          }
        />
        {error ? (
          <Alert variant="destructive">
            <AlertTitle>Unable to load content types</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        ) : null}
        {bulkFeedback ? (
          <Alert>
            <AlertTitle>{bulkFeedback.title}</AlertTitle>
            <AlertDescription>{bulkFeedback.message}</AlertDescription>
          </Alert>
        ) : null}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <StatCard label="Types" value={summary.typeCount} icon={<Database />} />
          <StatCard label="Entries" value={summary.totalEntries} icon={<Layers />} />
          <StatCard label="Fields" value={summary.totalFields} icon={<Layers />} />
        </div>
        <div className="flex flex-col gap-3 rounded-2xl border bg-card p-3 shadow-soft sm:flex-row sm:items-center">
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search by name or slug..."
              className="pl-9"
            />
          </div>
          <Select
            value={statusFilter}
            onValueChange={(value) => setStatusFilter(value as "all" | "draft" | "published")}
          >
            <SelectTrigger className="sm:w-44">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All statuses</SelectItem>
              <SelectItem value="draft">Draft</SelectItem>
              <SelectItem value="published">Published</SelectItem>
            </SelectContent>
          </Select>
          <div className="inline-flex shrink-0 items-center gap-1 rounded-xl border bg-background p-1">
            <Button
              type="button"
              variant={view === "grid" ? "soft" : "ghost"}
              size="icon-sm"
              aria-label="Grid view"
              aria-pressed={view === "grid"}
              onClick={() => setView("grid")}
            >
              <LayoutGrid className="size-4" />
            </Button>
            <Button
              type="button"
              variant={view === "table" ? "soft" : "ghost"}
              size="icon-sm"
              aria-label="Table view"
              aria-pressed={view === "table"}
              onClick={() => setView("table")}
            >
              <TableIcon className="size-4" />
            </Button>
          </div>
        </div>
        {isLoading ? (
          <ListSkeleton rows={6} />
        ) : rows.length === 0 ? (
          <EmptyState
            icon={<Database />}
            title={
              query || statusFilter !== "all" ? "No matching content types" : "No content types yet"
            }
            description={
              query || statusFilter !== "all"
                ? "No content types match the current filters. Adjust your search or status filter."
                : "Create your first content type to start modeling structured content."
            }
            action={
              <Button className="gap-2" onClick={() => setCreateOpen(true)}>
                <Plus className="h-4 w-4" />
                New type
              </Button>
            }
          />
        ) : view === "table" ? (
          <ContentTypeTable
            rows={pagination.visibleRows}
            basePath={basePath}
            isLoading={isLoading}
            sortKey={sortKey}
            sortDirection={sortDirection}
            selectedIds={visibleSelectedIds}
            isAllSelected={isAllSelected}
            isIndeterminate={isIndeterminate}
            onToggleAll={handleToggleAll}
            onToggleRow={handleToggleRow}
            onSort={handleSortChange}
            onDuplicate={handleDuplicate}
            onDelete={(row) => setPendingDelete(row)}
          />
        ) : (
          <div className="flex flex-col gap-4">
            <div className="flex items-center justify-between gap-3 px-1">
              <label className="flex items-center gap-2 text-sm text-muted-foreground">
                <Checkbox
                  aria-label="Select all content types"
                  checked={isIndeterminate ? "indeterminate" : isAllSelected}
                  onCheckedChange={() => handleToggleAll()}
                />
                Select all
              </label>
              <span className="text-xs text-muted-foreground">
                {rows.length} {rows.length === 1 ? "type" : "types"}
              </span>
            </div>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {pagination.visibleRows.map((row) => {
                const editHref = resolveAdminRoutePath(
                  `/content-types/${encodeURIComponent(row.id)}`
                );
                const schemaHref = resolveAdminRoutePath(
                  `/content-types/${encodeURIComponent(row.id)}/schema`
                );
                const entriesHref = resolveAdminRoutePath(
                  `/advanced/engine/${encodeURIComponent(row.id)}/collection`
                );
                const isSelected = selectedIds.includes(row.id);
                return (
                  <Card
                    key={row.id}
                    className={cn(
                      "flex h-full flex-col p-5 transition-all hover:-translate-y-0.5 hover:shadow-card",
                      isSelected && "ring-2 ring-primary/40"
                    )}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <span className="flex size-12 items-center justify-center rounded-xl bg-primary-soft text-primary-soft-foreground">
                        <Database className="size-6" />
                      </span>
                      <div className="flex items-center gap-1">
                        <Checkbox
                          checked={isSelected}
                          onCheckedChange={() => handleToggleRow(row.id)}
                          aria-label={`Select ${row.name}`}
                        />
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button
                              variant="ghost"
                              size="icon-sm"
                              aria-label={`Open actions for ${row.name}`}
                            >
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="w-44">
                            <DropdownMenuItem asChild>
                              <AdminLink href={editHref} prefetch>
                                <Pencil className="h-4 w-4" />
                                Edit
                              </AdminLink>
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleDuplicate(row)}>
                              <Copy className="h-4 w-4" />
                              Duplicate
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              variant="destructive"
                              onClick={() => setPendingDelete(row)}
                            >
                              <Trash2 className="h-4 w-4" />
                              Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </div>
                    <AdminLink
                      href={editHref}
                      prefetch
                      className="mt-4 font-display text-[15px] font-semibold text-foreground transition hover:text-primary"
                      aria-label={`Edit content type: ${row.name}`}
                    >
                      {row.name}
                    </AdminLink>
                    <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                      <span>{row.fieldCount} fields</span>
                      <span className="size-1 rounded-full bg-border" />
                      <span>{row.entryCount ?? 0} entries</span>
                      <StatusBadge status={row.status} />
                    </div>
                    {row.duplicateNameCount && row.duplicateNameCount > 1 ? (
                      <Badge variant="secondary" className="mt-2 w-fit text-[10px] uppercase">
                        Duplicate name
                      </Badge>
                    ) : null}
                    <Separator className="my-4" />
                    <div className="mt-auto flex items-center gap-2">
                      <AdminLink href={schemaHref} prefetch className="flex-1">
                        <Button variant="soft" size="sm" className="w-full">
                          Edit schema
                        </Button>
                      </AdminLink>
                      <AdminLink href={entriesHref} prefetch className="flex-1">
                        <Button variant="outline" size="sm" className="w-full">
                          Entries
                        </Button>
                      </AdminLink>
                    </div>
                  </Card>
                );
              })}
            </div>
          </div>
        )}
        <ListPaginationFooter
          resourceLabel="content types"
          pagination={pagination}
          isLoading={isLoading}
        />
      </div>
      <ContentTypeCreateDrawer
        open={createOpen}
        onOpenChange={setCreateOpen}
        existingTypes={types}
        onCreated={handleCreated}
        onCreateError={(err) => {
          contentTypeListToasts.error("create", err);
        }}
      />
      <ConfirmActionDialog
        open={Boolean(pendingDelete)}
        onOpenChange={(open) => {
          if (!open) setPendingDelete(null);
        }}
        title="Delete content type?"
        description={
          <>
            <span className="font-medium text-foreground">{pendingDelete?.name}</span> (
            {pendingDelete?.slug}) will be deleted only if no entries or dependent owners reference
            it.
          </>
        }
        confirmLabel="Delete type"
        confirmingLabel="Deleting..."
        isConfirming={isDeleting}
        onConfirm={handleDelete}
      >
        The server blocks deletion for entries, custom screens, taxonomies, content routes, and
        listings.
      </ConfirmActionDialog>
      <ConfirmActionDialog
        open={pendingBulkDeleteIds.length > 0}
        onOpenChange={(open) => {
          if (!open) setPendingBulkDeleteIds([]);
        }}
        title="Delete selected content types?"
        description={`Delete ${pendingBulkDeleteIds.length} content type${pendingBulkDeleteIds.length === 1 ? "" : "s"}? This cannot be undone after the server accepts the request.`}
        confirmLabel="Delete selected"
        confirmingLabel="Deleting..."
        isConfirming={isBulkWorking}
        onConfirm={() => runBulkAction("delete", pendingBulkDeleteIds)}
      >
        The server blocks deletion for entries, custom screens, taxonomies, content routes, and
        listings.
      </ConfirmActionDialog>
    </AdminShell>
  );
}
