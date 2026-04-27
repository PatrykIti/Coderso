import { Plus } from "lucide-react";
import { useMemo, useState } from "react";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  deleteCommerceProduct,
  updateCommerceProduct,
  type CommerceCollectionRecord,
  type CommerceProductRecord,
  type CommerceProductStatus,
  type CommerceStockState,
} from "@/services/commerceClient";
import { useAdminRouter } from "@/ui/contexts/AdminRouterContext";
import { AdminShell } from "@/ui/layouts/AdminShell";
import { ConfirmActionDialog } from "@/ui/shared/ConfirmActionDialog";
import { ListPaginationFooter } from "@/ui/shared/ListPaginationFooter";
import { PageHeader } from "@/ui/shared/PageHeader";
import { useListPagination } from "@/ui/shared/useListPagination";

import {
  CommerceBulkActionsBar,
  type CommerceBulkActionValue,
} from "./CommerceBulkActionsBar";
import { CommerceFilters } from "./CommerceFilters";
import { CommerceTable } from "./CommerceTable";
import {
  commerceListToasts,
  type CommerceListAction,
} from "./commerceActionToasts";
import { useCommerceCatalog } from "./hooks/useCommerceCatalog";

export type CommerceStatusFilter = "all" | CommerceProductStatus;
export type CommerceCollectionFilter = "all" | string;
export type CommerceStockFilter = "all" | CommerceStockState;

export type CommerceProductListRow = CommerceProductRecord & {
  collectionLabels: string[];
};

export function enrichCommerceProducts(
  products: CommerceProductRecord[],
  collections: CommerceCollectionRecord[]
): CommerceProductListRow[] {
  const collectionNames = new Map(
    collections.map((collection) => [collection.id, collection.name])
  );
  return products.map((product) => ({
    ...product,
    collectionLabels: product.collectionIds.map(
      (id) => collectionNames.get(id) ?? "Missing collection"
    ),
  }));
}

export function filterCommerceProducts(
  products: CommerceProductListRow[],
  search: string,
  status: CommerceStatusFilter,
  collection: CommerceCollectionFilter,
  stock: CommerceStockFilter
) {
  const normalized = search.trim().toLowerCase();
  return products.filter((product) => {
    const matchesSearch =
      !normalized ||
      product.title.toLowerCase().includes(normalized) ||
      product.slug.toLowerCase().includes(normalized) ||
      (product.excerpt ?? "").toLowerCase().includes(normalized);
    const matchesStatus = status === "all" || product.status === status;
    const matchesCollection =
      collection === "all" || product.collectionIds.includes(collection);
    const matchesStock = stock === "all" || product.stock.state === stock;
    return matchesSearch && matchesStatus && matchesCollection && matchesStock;
  });
}

const statusForBulkAction = (
  action: Exclude<CommerceBulkActionValue, "delete">
): CommerceProductStatus => {
  if (action === "publish") return "published";
  if (action === "draft") return "draft";
  return "archived";
};

export function CommerceListPage() {
  const { navigate } = useAdminRouter();
  const {
    products,
    collections,
    isLoadingProducts,
    isLoadingCollections,
    error,
    refreshProducts,
  } = useCommerceCatalog();

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<CommerceStatusFilter>("all");
  const [collectionFilter, setCollectionFilter] =
    useState<CommerceCollectionFilter>("all");
  const [stockFilter, setStockFilter] = useState<CommerceStockFilter>("all");
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [bulkAction, setBulkAction] = useState<CommerceBulkActionValue | "">("");
  const [isBulkWorking, setIsBulkWorking] = useState(false);
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [pendingBulkDeleteIds, setPendingBulkDeleteIds] = useState<string[]>([]);
  const [actionError, setActionError] = useState<string | null>(null);

  const collectionOptions = useMemo(
    () =>
      collections
        .map((collection) => ({
          value: collection.id,
          label: collection.name,
        }))
        .sort((left, right) => left.label.localeCompare(right.label)),
    [collections]
  );

  const enrichedProducts = useMemo(
    () => enrichCommerceProducts(products, collections),
    [collections, products]
  );
  const filteredProducts = useMemo(
    () =>
      filterCommerceProducts(
        enrichedProducts,
        search,
        statusFilter,
        collectionFilter,
        stockFilter
      ),
    [collectionFilter, enrichedProducts, search, statusFilter, stockFilter]
  );
  const pagination = useListPagination(filteredProducts, {
    resetKey: JSON.stringify({
      search,
      statusFilter,
      collectionFilter,
      stockFilter,
    }),
  });
  const visibleIds = useMemo(
    () => pagination.visibleRows.map((product) => product.id),
    [pagination.visibleRows]
  );
  const visibleSelectedIds = selectedIds.filter((id) => visibleIds.includes(id));
  const selectedCount = visibleSelectedIds.length;
  const isAllSelected =
    visibleIds.length > 0 && visibleIds.every((id) => selectedIds.includes(id));
  const isIndeterminate = selectedCount > 0 && !isAllSelected;

  const refreshProductList = () =>
    refreshProducts({ force: true, background: true });

  const handleSetStatus = async (
    id: string,
    status: CommerceProductStatus,
    action: Exclude<CommerceListAction, "create" | "delete">
  ) => {
    setActionError(null);
    try {
      await updateCommerceProduct(id, { status });
      await refreshProductList();
      commerceListToasts.success(action);
    } catch (err) {
      setActionError(commerceListToasts.error(action, err));
    }
  };

  const runDelete = async (id: string) => {
    setDeletingId(id);
    setActionError(null);
    try {
      await deleteCommerceProduct(id);
      await refreshProductList();
      commerceListToasts.success("delete");
      setSelectedIds((prev) => prev.filter((selectedId) => selectedId !== id));
      setPendingDeleteId(null);
    } catch (err) {
      setActionError(commerceListToasts.error("delete", err));
    } finally {
      setDeletingId(null);
    }
  };

  const handleToggleProduct = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id)
        ? prev.filter((productId) => productId !== id)
        : [...prev, id]
    );
  };

  const handleToggleAll = () => {
    setSelectedIds(isAllSelected ? [] : visibleIds);
  };

  const handleClearSelection = () => {
    setSelectedIds([]);
    setBulkAction("");
  };

  const runBulkAction = async (action: CommerceBulkActionValue, ids: string[]) => {
    if (ids.length === 0) return;
    setIsBulkWorking(true);
    setActionError(null);
    try {
      const results = await Promise.allSettled(
        ids.map((id) => {
          if (action === "delete") return deleteCommerceProduct(id);
          return updateCommerceProduct(id, {
            status: statusForBulkAction(action),
          });
        })
      );
      await refreshProductList();
      const summary = commerceListToasts.summarizeBulkAction(action, ids, results);
      commerceListToasts.emitBulk(summary);
      if (summary.ok) {
        handleClearSelection();
      } else {
        setSelectedIds(summary.failedTargets);
        setActionError(summary.inlineMessage);
      }
    } catch (err) {
      setActionError(
        commerceListToasts.error(action, err, {
          fallbackMessage: "Bulk action failed.",
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

  const isLoading = isLoadingProducts || isLoadingCollections;

  return (
    <AdminShell
      activeHref="/admin/coderso/commerce"
      breadcrumbs={
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <span>Coderso</span>
          <span>/</span>
          <span className="text-foreground">Commerce</span>
        </div>
      }
    >
      <div className="mx-auto flex max-w-6xl flex-col gap-6">
        <PageHeader
          title="Commerce"
          description="Manage products and keep your catalog ready for runtime widgets."
          actions={
            <>
              {selectedCount > 0 ? (
                <CommerceBulkActionsBar
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
                onClick={() => navigate("/coderso/commerce/new")}
              >
                <Plus className="h-4 w-4" />
                New
              </Button>
            </>
          }
        />

        {error ? (
          <Alert variant="destructive">
            <AlertTitle>Unable to load commerce catalog</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        ) : null}
        {actionError ? (
          <Alert variant="destructive">
            <AlertTitle>Commerce action failed</AlertTitle>
            <AlertDescription>{actionError}</AlertDescription>
          </Alert>
        ) : null}

        <CommerceFilters
          search={search}
          status={statusFilter}
          collection={collectionFilter}
          stock={stockFilter}
          collectionOptions={collectionOptions}
          onSearchChange={setSearch}
          onStatusChange={setStatusFilter}
          onCollectionChange={setCollectionFilter}
          onStockChange={setStockFilter}
        />

        {isLoading ? (
          <div className="rounded-xl border bg-card/60 p-6 text-sm text-muted-foreground shadow-sm">
            Loading products...
          </div>
        ) : (
          <CommerceTable
            items={pagination.visibleRows}
            emptyMessage={
              products.length > 0
                ? "No products match your current filters."
                : undefined
            }
            selectedIds={selectedIds}
            isAllSelected={isAllSelected}
            isIndeterminate={isIndeterminate}
            onToggleAll={handleToggleAll}
            onToggleProduct={handleToggleProduct}
            onEdit={(id) => navigate(`/coderso/commerce/${encodeURIComponent(id)}`)}
            onPublish={(id) => handleSetStatus(id, "published", "publish")}
            onMoveToDraft={(id) => handleSetStatus(id, "draft", "draft")}
            onArchive={(id) => handleSetStatus(id, "archived", "archive")}
            onDelete={setPendingDeleteId}
          />
        )}
        <ListPaginationFooter
          resourceLabel="products"
          pagination={pagination}
          isLoading={isLoading}
        />
      </div>
      <ConfirmActionDialog
        open={Boolean(pendingDeleteId)}
        onOpenChange={(open) => {
          if (!open) setPendingDeleteId(null);
        }}
        title="Delete product?"
        description="Delete this product from the catalog? Runtime widgets that reference it will stop rendering it. This cannot be undone."
        confirmLabel="Delete product"
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
        title="Delete selected products?"
        description={`Delete ${pendingBulkDeleteIds.length} product${
          pendingBulkDeleteIds.length === 1 ? "" : "s"
        } from the catalog? Runtime widgets that reference them will stop rendering them. This cannot be undone.`}
        confirmLabel="Delete selected"
        confirmingLabel="Deleting..."
        isConfirming={isBulkWorking}
        onConfirm={() => runBulkAction("delete", pendingBulkDeleteIds)}
      />
    </AdminShell>
  );
}
