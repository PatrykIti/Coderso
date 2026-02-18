import { Plus } from "lucide-react";
import { useState } from "react";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { isApiClientError } from "@/services/apiClient";
import { deleteListingQuery } from "@/services/listingsClient";
import { useAdminRouter } from "@/ui/contexts/AdminRouterContext";
import { AdminShell } from "@/ui/layouts/AdminShell";
import { PageHeader } from "@/ui/shared/PageHeader";

import { ListingQueryTable } from "./ListingQueryTable";
import { ListingTemplateManager } from "./ListingTemplateManager";
import { useListingQueries } from "./hooks/useListingQueries";

export function ListingListPage() {
  const { navigate } = useAdminRouter();
  const { items, isLoading, error, refresh } = useListingQueries();
  const [actionError, setActionError] = useState<string | null>(null);

  const handleDelete = async (id: string) => {
    try {
      await deleteListingQuery(id);
      await refresh(true);
      setActionError(null);
    } catch (err) {
      if (isApiClientError(err)) {
        setActionError(err.message);
      } else {
        setActionError("Failed to delete listing query.");
      }
    }
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
            <Button
              className="gap-2"
              onClick={() => navigate("/coderso/listings/new")}
            >
              <Plus className="h-4 w-4" />
              New query
            </Button>
          }
        />

        {error ? (
          <Alert variant="destructive">
            <AlertTitle>Unable to load listing queries</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        ) : null}
        {actionError ? (
          <Alert variant="destructive">
            <AlertTitle>Listing action failed</AlertTitle>
            <AlertDescription>{actionError}</AlertDescription>
          </Alert>
        ) : null}

        <Tabs defaultValue="queries" className="space-y-4">
          <TabsList>
            <TabsTrigger value="queries">Queries</TabsTrigger>
            <TabsTrigger value="templates">Templates</TabsTrigger>
          </TabsList>

          <TabsContent value="queries" className="space-y-4">
            <ListingQueryTable
              items={items}
              onDelete={handleDelete}
              emptyMessage={isLoading ? "Loading listing queries..." : undefined}
            />
          </TabsContent>

          <TabsContent value="templates" className="space-y-4">
            <ListingTemplateManager />
          </TabsContent>
        </Tabs>
      </div>
    </AdminShell>
  );
}
