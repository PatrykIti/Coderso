import { Plus } from "lucide-react";
import { useMemo, useState } from "react";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { isApiClientError } from "@/services/apiClient";
import {
  deleteCommerceProduct,
  type CommerceProductRecord,
} from "@/services/commerceClient";
import { useAdminRouter } from "@/ui/contexts/AdminRouterContext";
import { AdminShell } from "@/ui/layouts/AdminShell";
import { PageHeader } from "@/ui/shared/PageHeader";

import { CommerceTable } from "./CommerceTable";
import { useCommerceCatalog } from "./hooks/useCommerceCatalog";

type ProductStatusFilter = "all" | CommerceProductRecord["status"];

export function CommerceListPage() {
  const { navigate } = useAdminRouter();
  const {
    products,
    isLoadingProducts,
    error,
    refreshProducts,
  } = useCommerceCatalog();

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<ProductStatusFilter>("all");
  const [actionError, setActionError] = useState<string | null>(null);

  const filtered = useMemo(() => {
    const needle = search.trim().toLowerCase();
    return products.filter((product) => {
      if (statusFilter !== "all" && product.status !== statusFilter) return false;
      if (!needle) return true;
      return (
        product.title.toLowerCase().includes(needle) ||
        product.slug.toLowerCase().includes(needle)
      );
    });
  }, [products, search, statusFilter]);

  const counts = useMemo(
    () => ({
      all: products.length,
      published: products.filter((item) => item.status === "published").length,
      draft: products.filter((item) => item.status === "draft").length,
      archived: products.filter((item) => item.status === "archived").length,
    }),
    [products]
  );

  const handleDelete = async (id: string) => {
    try {
      await deleteCommerceProduct(id);
      await refreshProducts(true);
      setActionError(null);
    } catch (error) {
      if (isApiClientError(error)) {
        setActionError(error.message);
      } else {
        setActionError("Failed to delete product.");
      }
    }
  };

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
      <div className="mx-auto flex max-w-7xl flex-col gap-6">
        <PageHeader
          title="Commerce"
          description="Manage products and keep your catalog ready for runtime widgets."
          actions={
            <Button
              className="gap-2"
              onClick={() => navigate("/coderso/commerce/new")}
            >
              <Plus className="h-4 w-4" />
              New product
            </Button>
          }
        />

        {error ? (
          <Alert variant="destructive">
            <AlertTitle>Unable to load products</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        ) : null}
        {actionError ? (
          <Alert variant="destructive">
            <AlertTitle>Commerce action failed</AlertTitle>
            <AlertDescription>{actionError}</AlertDescription>
          </Alert>
        ) : null}

        <div className="rounded-xl border bg-card p-4 shadow-sm">
          <div className="grid gap-3 md:grid-cols-[1fr_auto]">
            <Input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search products by title or slug..."
              aria-label="Search products"
            />
            <Tabs
              value={statusFilter}
              onValueChange={(value) => setStatusFilter(value as ProductStatusFilter)}
            >
              <TabsList className="grid w-full grid-cols-4 md:w-[30rem]">
                <TabsTrigger value="all">All ({counts.all})</TabsTrigger>
                <TabsTrigger value="published">
                  Published ({counts.published})
                </TabsTrigger>
                <TabsTrigger value="draft">Draft ({counts.draft})</TabsTrigger>
                <TabsTrigger value="archived">
                  Archived ({counts.archived})
                </TabsTrigger>
              </TabsList>
            </Tabs>
          </div>
        </div>

        <CommerceTable
          items={filtered}
          onDelete={handleDelete}
          emptyMessage={isLoadingProducts ? "Loading products..." : undefined}
        />
      </div>
    </AdminShell>
  );
}
