import { Plus, Search } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { isApiClientError } from "@/services/apiClient";
import {
  createRedirect,
  deleteRedirect,
  getCachedRedirects,
  listRedirectsCached,
  updateRedirect,
  type RedirectCreateInput,
  type RedirectItem,
} from "@/services/redirectsClient";
import { cacheKeys } from "@/services/cachePolicy";
import { AdminShell } from "@/ui/layouts/AdminShell";
import { ConfirmActionDialog } from "@/ui/shared/ConfirmActionDialog";
import { PageHeader } from "@/ui/shared/PageHeader";
import { subscribeCacheEvents } from "@/utils/cacheBus";

import { RedirectDrawer } from "./RedirectDrawer";
import { RedirectsTable, type RedirectRow } from "./RedirectsTable";

const redirectsPageSize = 10;

const mapRow = (item: RedirectItem): RedirectRow => ({
  id: item.id,
  from: item.fromPath,
  to: item.toPath,
  type: String(item.statusCode) as RedirectRow["type"],
  status: item.enabled ? "active" : "inactive",
  lastHit: "-",
});

const createInitialRedirectsState = () => {
  const cached = getCachedRedirects();
  return {
    items: cached ? cached.map(mapRow) : [],
    hasCache: Boolean(cached),
  };
};

export function RedirectsPage() {
  const [initialState] = useState(createInitialRedirectsState);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editingRedirect, setEditingRedirect] = useState<RedirectRow | null>(null);
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(1);
  const [items, setItems] = useState<RedirectRow[]>(initialState.items);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [bulkAction, setBulkAction] = useState<"" | "enable" | "disable" | "delete">("");
  const [pendingBulkDeleteIds, setPendingBulkDeleteIds] = useState<string[]>([]);
  const [pendingDeleteRedirect, setPendingDeleteRedirect] = useState<RedirectRow | null>(null);
  const [isLoading, setIsLoading] = useState(!initialState.hasCache);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async (options?: { force?: boolean; background?: boolean }) => {
    if (!options?.background) setIsLoading(true);
    try {
      const data = await listRedirectsCached({ force: options?.force });
      setError(null);
      setItems(data.map(mapRow));
    } catch (err) {
      if (isApiClientError(err)) {
        setError(err.message);
      } else {
        setError("Failed to load redirects.");
      }
    } finally {
      if (!options?.background) setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    let active = true;
    void Promise.resolve().then(() => {
      if (active)
        void refresh({ force: !initialState.hasCache, background: initialState.hasCache });
    });
    return () => {
      active = false;
    };
  }, [initialState.hasCache, refresh]);

  useEffect(() => {
    return subscribeCacheEvents((event) => {
      if (event.key === cacheKeys.redirectsList) {
        void refresh({ force: event.action === "invalidate", background: true });
      }
    });
  }, [refresh]);

  const openCreate = () => {
    setEditingRedirect(null);
    setDrawerOpen(true);
  };

  const openEdit = (redirect: RedirectRow) => {
    setEditingRedirect(redirect);
    setDrawerOpen(true);
  };

  const handleSave = async (payload: RedirectCreateInput) => {
    setIsSaving(true);
    setError(null);
    try {
      if (editingRedirect) {
        await updateRedirect(editingRedirect.id, payload);
        toast.success("Redirect updated.");
      } else {
        await createRedirect(payload);
        toast.success("Redirect created.");
      }
      await refresh({ background: true });
      return true;
    } catch (err) {
      if (isApiClientError(err)) {
        setError(err.message);
        toast.error(err.message);
      } else {
        const message = "Failed to save redirect.";
        setError(message);
        toast.error(message);
      }
      return false;
    } finally {
      setIsSaving(false);
    }
  };

  const handleToggle = async (redirect: RedirectRow) => {
    setIsSaving(true);
    setError(null);
    try {
      await updateRedirect(redirect.id, {
        enabled: redirect.status !== "active",
      });
      await refresh({ background: true });
      toast.success(redirect.status === "active" ? "Redirect disabled." : "Redirect enabled.");
    } catch (err) {
      if (isApiClientError(err)) {
        setError(err.message);
        toast.error(err.message);
      } else {
        const message = "Failed to update redirect.";
        setError(message);
        toast.error(message);
      }
    } finally {
      setIsSaving(false);
    }
  };

  const runDelete = async (redirect: RedirectRow) => {
    setIsSaving(true);
    setError(null);
    try {
      await deleteRedirect(redirect.id);
      await refresh({ background: true });
      setSelectedIds((current) => current.filter((id) => id !== redirect.id));
      toast.success("Redirect deleted.");
    } catch (err) {
      if (isApiClientError(err)) {
        setError(err.message);
        toast.error(err.message);
      } else {
        const message = "Failed to delete redirect.";
        setError(message);
        toast.error(message);
      }
    } finally {
      setIsSaving(false);
      setPendingDeleteRedirect(null);
    }
  };

  const handleQueryChange = (value: string) => {
    setQuery(value);
    setPage(1);
  };

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (!needle) return items;
    return items.filter(
      (item) => item.from.toLowerCase().includes(needle) || item.to.toLowerCase().includes(needle)
    );
  }, [items, query]);

  const activeCount = useMemo(
    () => items.filter((item) => item.status === "active").length,
    [items]
  );

  const totalPages = Math.max(1, Math.ceil(filtered.length / redirectsPageSize));
  const currentPage = Math.min(page, totalPages);
  const paginated = filtered.slice(
    (currentPage - 1) * redirectsPageSize,
    currentPage * redirectsPageSize
  );
  const isFiltering = query.trim().length > 0;
  const visibleIds = useMemo(() => paginated.map((item) => item.id), [paginated]);
  const visibleSelectedIds = selectedIds.filter((id) => visibleIds.includes(id));
  const selectedCount = visibleSelectedIds.length;
  const isAllSelected = visibleIds.length > 0 && visibleIds.every((id) => selectedIds.includes(id));
  const isIndeterminate = selectedCount > 0 && !isAllSelected;

  const clearSelection = () => {
    setSelectedIds([]);
    setBulkAction("");
  };

  const handleToggleRedirect = (id: string) => {
    setSelectedIds((current) =>
      current.includes(id) ? current.filter((item) => item !== id) : [...current, id]
    );
  };

  const handleToggleAll = () => {
    setSelectedIds((current) =>
      isAllSelected
        ? current.filter((id) => !visibleIds.includes(id))
        : Array.from(new Set([...current, ...visibleIds]))
    );
  };

  const runBulkAction = async (action: "enable" | "disable" | "delete", ids: string[]) => {
    if (ids.length === 0) return;
    setIsSaving(true);
    setError(null);
    try {
      const selectedRows = items.filter((item) => ids.includes(item.id));
      const results = await Promise.allSettled(
        selectedRows.map((item) => {
          if (action === "delete") return deleteRedirect(item.id);
          return updateRedirect(item.id, { enabled: action === "enable" });
        })
      );
      await refresh({ background: true });
      const failed = results.filter((result) => result.status === "rejected").length;
      const succeeded = results.length - failed;
      if (failed > 0) {
        const message =
          succeeded > 0
            ? `Updated ${succeeded} redirect${succeeded === 1 ? "" : "s"}; failed ${failed}.`
            : `Failed to update ${failed} redirect${failed === 1 ? "" : "s"}.`;
        setError(message);
        toast.error(message);
      } else {
        const verb = action === "delete" ? "deleted" : action === "enable" ? "enabled" : "disabled";
        toast.success(`${succeeded} redirect${succeeded === 1 ? "" : "s"} ${verb}.`);
      }
      clearSelection();
    } catch (err) {
      if (isApiClientError(err)) {
        setError(err.message);
        toast.error(err.message);
      } else {
        setError("Bulk redirect action failed.");
        toast.error("Bulk redirect action failed.");
      }
    } finally {
      setIsSaving(false);
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

  const pendingDeleteDescription = pendingDeleteRedirect
    ? `Delete redirect from ${pendingDeleteRedirect.from} to ${pendingDeleteRedirect.to}? This cannot be undone.`
    : "Delete this redirect? This cannot be undone.";

  return (
    <AdminShell
      activeHref="/admin/redirects"
      showSearch={false}
      breadcrumbs={["Site Management", "Redirects"]}
    >
      <div className="mx-auto flex max-w-6xl flex-col gap-6">
        <PageHeader
          title="Redirects"
          description={`Site management - ${activeCount} active routes.`}
          actions={
            <>
              {selectedCount > 0 ? (
                <div className="flex min-w-0 flex-wrap items-center justify-end gap-2">
                  <span className="shrink-0 text-sm font-semibold text-foreground">
                    {selectedCount} selected
                  </span>
                  <Select
                    value={bulkAction}
                    onValueChange={(value) =>
                      setBulkAction(value as "" | "enable" | "disable" | "delete")
                    }
                  >
                    <SelectTrigger className="h-8 w-[150px]">
                      <SelectValue placeholder="Bulk actions" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="enable">Enable</SelectItem>
                      <SelectItem value="disable">Disable</SelectItem>
                      <SelectItem value="delete">Delete</SelectItem>
                    </SelectContent>
                  </Select>
                  <Button size="sm" onClick={handleBulkApply} disabled={!bulkAction || isSaving}>
                    {isSaving ? "Applying..." : "Apply"}
                  </Button>
                  <Button variant="ghost" size="sm" onClick={clearSelection}>
                    Clear
                  </Button>
                </div>
              ) : null}
              <Button className="gap-2" onClick={openCreate} disabled={isSaving}>
                <Plus className="h-4 w-4" />
                Create
              </Button>
            </>
          }
        />
        {error ? (
          <Alert variant="destructive">
            <AlertTitle>Redirects unavailable</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        ) : null}
        <div className="flex flex-col gap-3 rounded-xl border bg-card/60 p-3 shadow-sm lg:flex-row lg:items-center lg:justify-between">
          <div className="relative w-full lg:max-w-md">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search redirects..."
              className="pl-9"
              value={query}
              onChange={(event) => handleQueryChange(event.target.value)}
            />
          </div>
        </div>
        <RedirectsTable
          items={paginated}
          isLoading={isLoading}
          isSaving={isSaving}
          selectedIds={visibleSelectedIds}
          isAllSelected={isAllSelected}
          isIndeterminate={isIndeterminate}
          total={filtered.length}
          page={currentPage}
          limit={redirectsPageSize}
          isFiltering={isFiltering}
          onToggleAll={handleToggleAll}
          onToggleRedirect={handleToggleRedirect}
          onEdit={openEdit}
          onToggle={handleToggle}
          onDelete={setPendingDeleteRedirect}
          onPageChange={setPage}
        />
      </div>
      <RedirectDrawer
        key={editingRedirect?.id ?? "new-redirect"}
        open={drawerOpen}
        onOpenChange={setDrawerOpen}
        mode={editingRedirect ? "edit" : "create"}
        redirect={
          editingRedirect
            ? {
                from: editingRedirect.from,
                to: editingRedirect.to,
                type: editingRedirect.type,
                active: editingRedirect.status === "active",
              }
            : null
        }
        isSaving={isSaving}
        onSave={handleSave}
      />
      <ConfirmActionDialog
        open={Boolean(pendingDeleteRedirect)}
        onOpenChange={(open) => {
          if (!open) setPendingDeleteRedirect(null);
        }}
        title="Delete redirect?"
        description={pendingDeleteDescription}
        confirmLabel="Delete"
        confirmingLabel="Deleting..."
        isConfirming={isSaving}
        onConfirm={() => {
          if (!pendingDeleteRedirect) return undefined;
          return runDelete(pendingDeleteRedirect);
        }}
      />
      <ConfirmActionDialog
        open={pendingBulkDeleteIds.length > 0}
        onOpenChange={(open) => {
          if (!open) setPendingBulkDeleteIds([]);
        }}
        title="Delete selected redirects?"
        description={`Delete ${pendingBulkDeleteIds.length} redirect${pendingBulkDeleteIds.length === 1 ? "" : "s"}? This cannot be undone.`}
        confirmLabel="Delete selected"
        confirmingLabel="Deleting..."
        isConfirming={isSaving}
        onConfirm={() => runBulkAction("delete", pendingBulkDeleteIds)}
      />
    </AdminShell>
  );
}
