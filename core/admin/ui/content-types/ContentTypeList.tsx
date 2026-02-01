import { Plus } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { isApiClientError } from "@/services/apiClient";
import {
  listContentTypes,
  type ContentTypeSummary,
} from "@/services/contentTypesClient";
import { AdminShell } from "@/ui/layouts/AdminShell";
import { PageHeader } from "@/ui/shared/PageHeader";
import { resolveAdminBasePath, withAdminBasePath } from "@/utils/adminPaths";

import { ContentTypeCreateDrawer } from "./ContentTypeCreateDrawer";
import { countSchemaFields } from "./schemaMapping";

const statusStyles = {
  published: "bg-emerald-500/10 text-emerald-600 border-emerald-500/20",
  draft: "bg-slate-500/10 text-slate-600 border-slate-500/20",
};

type ContentTypeRow = ContentTypeSummary & {
  fieldCount: number;
  status: "published" | "draft";
};

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
        <div className="overflow-hidden rounded-xl border bg-card shadow-sm">
          <Table>
            <TableHeader className="bg-muted/40">
              <TableRow>
                <TableHead className="pl-4 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Name
                </TableHead>
                <TableHead className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Slug
                </TableHead>
                <TableHead className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Fields
                </TableHead>
                <TableHead className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Status
                </TableHead>
                <TableHead className="pr-4 text-right text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Actions
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={5} className="px-4 py-6 text-sm text-muted-foreground">
                    Loading content types...
                  </TableCell>
                </TableRow>
              ) : rows.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="px-4 py-6 text-sm text-muted-foreground">
                    No content types yet. Create the first one to get started.
                  </TableCell>
                </TableRow>
              ) : (
                rows.map((type) => (
                  <TableRow key={type.id}>
                    <TableCell className="pl-4 py-4">
                      <div className="space-y-1">
                        <p className="text-sm font-semibold">{type.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {type.fieldCount} fields
                        </p>
                      </div>
                    </TableCell>
                    <TableCell className="py-4 text-sm text-muted-foreground">
                      {type.slug}
                    </TableCell>
                    <TableCell className="py-4">
                      <Badge variant="outline">{type.fieldCount}</Badge>
                    </TableCell>
                    <TableCell className="py-4">
                      <Badge
                        variant="outline"
                        className={statusStyles[type.status]}
                      >
                        {type.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="py-4 pr-4 text-right">
                      <Button variant="ghost" size="sm" asChild>
                        <a
                          href={withAdminBasePath(
                            basePath,
                            `/content-types/${type.id}`
                          )}
                        >
                          Edit
                        </a>
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </div>
      <ContentTypeCreateDrawer
        open={createOpen}
        onOpenChange={setCreateOpen}
        onCreated={handleCreated}
      />
    </AdminShell>
  );
}
