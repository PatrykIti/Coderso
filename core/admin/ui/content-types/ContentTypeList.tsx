import { Plus } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { isApiClientError } from "@/services/apiClient";
import {
  listContentTypes,
  type ContentTypeSummary,
} from "@/services/contentTypesClient";
import { AdminShell } from "@/ui/layouts/AdminShell";
import { PageHeader } from "@/ui/shared/PageHeader";
import { resolveAdminBasePath } from "@/utils/adminPaths";

import { ContentTypeCreateDrawer } from "./ContentTypeCreateDrawer";
import { ContentTypeTable, type ContentTypeRow } from "./ContentTypeTable";
import { countSchemaFields } from "./schemaMapping";

export function ContentTypeList() {
  const basePath = resolveAdminBasePath();
  const [types, setTypes] = useState<ContentTypeSummary[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [createOpen, setCreateOpen] = useState(false);

  const rows = useMemo<ContentTypeRow[]>(
    () =>
      types.map((type) => ({
        ...type,
        fieldCount: countSchemaFields(type.schema),
        status: "published",
      })),
    [types]
  );

  useEffect(() => {
    let active = true;
    listContentTypes()
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

  const handleCreated = (created: ContentTypeSummary) => {
    setTypes((prev) => [created, ...prev]);
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
        <ContentTypeTable
          rows={rows}
          basePath={basePath}
          isLoading={isLoading}
        />
      </div>
      <ContentTypeCreateDrawer
        open={createOpen}
        onOpenChange={setCreateOpen}
        onCreated={handleCreated}
      />
    </AdminShell>
  );
}
