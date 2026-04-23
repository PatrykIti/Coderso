import { Plus, Search } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { isApiClientError } from "@/services/apiClient";
import { cacheKeys } from "@/services/cachePolicy";
import {
  deleteContentType,
  duplicateContentType,
  getCachedContentTypes,
  listContentTypesCached,
  type ContentTypeSummary,
} from "@/services/contentTypesClient";
import { useAdminRouter } from "@/ui/contexts/AdminRouterContext";
import { subscribeCacheEvents } from "@/utils/cacheBus";
import { AdminShell } from "@/ui/layouts/AdminShell";
import { PageHeader } from "@/ui/shared/PageHeader";
import { resolveAdminBasePath } from "@/utils/adminPaths";

import { ContentTypeCreateDrawer } from "./ContentTypeCreateDrawer";
import { ContentTypeTable, type ContentTypeRow } from "./ContentTypeTable";
import { countSchemaFields } from "./schemaMapping";

export function ContentTypeList() {
  const { navigate } = useAdminRouter();
  const basePath = resolveAdminBasePath();
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
  const [isDeleting, setIsDeleting] = useState(false);

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
    toast.success(`Collection "${created.name}" created.`);
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
      const message = isApiClientError(err)
        ? err.message
        : "Failed to duplicate content type.";
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
      toast.success(`Deleted "${pendingDelete.name}".`);
      setPendingDelete(null);
    } catch (err) {
      const message = isApiClientError(err)
        ? err.message
        : "Failed to delete content type.";
      setError(message);
      toast.error(message);
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <AdminShell
      activeHref="/admin/content-types"
      breadcrumbs={
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <span>Content</span>
          <span>/</span>
          <span className="text-foreground">Content Types</span>
        </div>
      }
    >
      <div className="mx-auto flex max-w-5xl flex-col gap-6">
        <PageHeader
          title="Content Types"
          description="Create reusable schemas for structured content entries."
          actions={
            <Button className="gap-2" onClick={() => setCreateOpen(true)}>
              <Plus className="h-4 w-4" />
              New type
            </Button>
          }
        />
        {error ? (
          <Alert variant="destructive">
            <AlertTitle>Unable to load content types</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        ) : null}
        <div className="grid gap-3 rounded-lg border bg-card p-3 sm:grid-cols-[minmax(0,1fr)_180px]">
          <div className="relative">
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
            onValueChange={(value) =>
              setStatusFilter(value as "all" | "draft" | "published")
            }
          >
            <SelectTrigger>
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All statuses</SelectItem>
              <SelectItem value="draft">Draft</SelectItem>
              <SelectItem value="published">Published</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <ContentTypeTable
          rows={rows}
          basePath={basePath}
          isLoading={isLoading}
          emptyMessage={
            query || statusFilter !== "all"
              ? "No content types match the current filters."
              : undefined
          }
          sortKey={sortKey}
          sortDirection={sortDirection}
          onSort={handleSortChange}
          onDuplicate={handleDuplicate}
          onDelete={(row) => setPendingDelete(row)}
        />
      </div>
      <ContentTypeCreateDrawer
        open={createOpen}
        onOpenChange={setCreateOpen}
        existingTypes={types}
        onCreated={handleCreated}
      />
      <Dialog
        open={Boolean(pendingDelete)}
        onOpenChange={(open) => {
          if (!open) setPendingDelete(null);
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Delete content type?</DialogTitle>
            <DialogDescription>
              <span className="font-medium text-foreground">
                {pendingDelete?.name}
              </span>{" "}
              ({pendingDelete?.slug}) will be deleted only if no entries or
              dependent owners reference it.
            </DialogDescription>
          </DialogHeader>
          <div className="rounded-lg border border-rose-200 bg-rose-50/70 px-4 py-3 text-sm text-rose-900">
            The server blocks deletion for entries, custom screens, taxonomies,
            content routes, and listings.
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setPendingDelete(null)}
              disabled={isDeleting}
            >
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDelete} disabled={isDeleting}>
              {isDeleting ? "Deleting..." : "Delete type"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AdminShell>
  );
}
