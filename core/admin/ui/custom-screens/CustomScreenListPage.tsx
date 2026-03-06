import { MoreHorizontal, Pencil, Plus, SquarePen, Trash2 } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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
  deleteCustomScreen,
  type CustomScreenRecord,
} from "@/services/customScreensClient";
import {
  getCachedContentTypes,
  listContentTypesCached,
  type ContentTypeSummary,
} from "@/services/contentTypesClient";
import { useAdminRouter } from "@/ui/contexts/AdminRouterContext";
import { AdminShell } from "@/ui/layouts/AdminShell";
import { AdminLink } from "@/ui/shared/AdminLink";
import { PageHeader } from "@/ui/shared/PageHeader";

import { useCustomScreens } from "./hooks/useCustomScreens";

const formatDate = (value: string) => {
  try {
    return new Date(value).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  } catch {
    return value;
  }
};

type CustomScreenTableProps = {
  items: CustomScreenRecord[];
  contentTypes: ContentTypeSummary[];
  emptyMessage?: string;
  onDelete: (id: string) => void;
};

function CustomScreenTable({
  items,
  contentTypes,
  emptyMessage,
  onDelete,
}: CustomScreenTableProps) {
  const contentTypeMap = useMemo(
    () => new Map(contentTypes.map((type) => [type.id, type.name])),
    [contentTypes]
  );

  return (
    <div className="overflow-hidden rounded-xl border bg-card shadow-sm">
      <Table>
        <TableHeader className="bg-muted/40">
          <TableRow>
            <TableHead className="min-w-[16rem] pl-6 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Screen
            </TableHead>
            <TableHead className="hidden px-4 text-xs font-semibold uppercase tracking-wider text-muted-foreground md:table-cell">
              Content type
            </TableHead>
            <TableHead className="hidden px-4 text-xs font-semibold uppercase tracking-wider text-muted-foreground md:table-cell">
              Status
            </TableHead>
            <TableHead className="hidden px-4 text-xs font-semibold uppercase tracking-wider text-muted-foreground lg:table-cell">
              Updated
            </TableHead>
            <TableHead className="w-12 pr-6 text-right text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Actions
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {items.length === 0 ? (
            <TableRow>
              <TableCell
                colSpan={5}
                className="px-6 py-12 text-center text-sm text-muted-foreground"
              >
                {emptyMessage ?? "No custom screens yet."}
              </TableCell>
            </TableRow>
          ) : null}
          {items.map((item) => {
            const contentTypeLabel = contentTypeMap.get(item.contentTypeId);
            return (
              <TableRow key={item.id}>
                <TableCell className="py-6 pl-6">
                  <div className="flex flex-col gap-1">
                    <AdminLink
                      href={`/coderso/custom-screens/${encodeURIComponent(item.id)}`}
                      prefetch
                      className="break-words text-left font-semibold text-foreground underline-offset-4 transition hover:underline focus-visible:underline"
                      aria-label={`Edit custom screen: ${item.name}`}
                    >
                      {item.name}
                    </AdminLink>
                    <span className="text-xs text-muted-foreground">
                      {contentTypeLabel ? `Content type: ${contentTypeLabel}` : "Content type pending"}
                    </span>
                    <div className="mt-2 flex flex-wrap items-center gap-2 text-xs md:hidden">
                      <Badge
                        variant={item.status === "active" ? "default" : "outline"}
                        className="capitalize"
                      >
                        {item.status}
                      </Badge>
                      <span className="text-muted-foreground/60">•</span>
                      <span className="text-muted-foreground">
                        {formatDate(item.updatedAt)}
                      </span>
                    </div>
                  </div>
                </TableCell>
                <TableCell className="hidden px-4 py-6 md:table-cell">
                  <span className="text-sm text-muted-foreground">
                    {contentTypeLabel ?? item.contentTypeId}
                  </span>
                </TableCell>
                <TableCell className="hidden px-4 py-6 md:table-cell">
                  <Badge
                    variant={item.status === "active" ? "default" : "outline"}
                    className="capitalize"
                  >
                    {item.status}
                  </Badge>
                </TableCell>
                <TableCell className="hidden px-4 py-6 text-sm text-muted-foreground lg:table-cell">
                  {formatDate(item.updatedAt)}
                </TableCell>
                <TableCell className="w-12 py-6 pr-6 text-right">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon-sm">
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-36">
                      <DropdownMenuItem asChild>
                        <AdminLink
                          href={`/coderso/custom-screens/${encodeURIComponent(item.id)}/entries`}
                          className="w-full"
                          prefetch
                        >
                          <SquarePen className="h-4 w-4" />
                          Records
                        </AdminLink>
                      </DropdownMenuItem>
                      <DropdownMenuItem asChild>
                        <AdminLink
                          href={`/coderso/custom-screens/${encodeURIComponent(item.id)}`}
                          className="w-full"
                          prefetch
                        >
                          <Pencil className="h-4 w-4" />
                          Edit
                        </AdminLink>
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        variant="destructive"
                        onClick={() => onDelete(item.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                        Delete
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}

export function CustomScreenListPage() {
  const { navigate } = useAdminRouter();
  const { items, isLoading, error, refresh } = useCustomScreens();
  const [actionError, setActionError] = useState<string | null>(null);
  const [contentTypes, setContentTypes] = useState<ContentTypeSummary[]>(
    () => getCachedContentTypes() ?? []
  );

  useEffect(() => {
    listContentTypesCached({ force: true })
      .then((items) => setContentTypes(items))
      .catch(() => undefined);
  }, []);

  const handleDelete = async (id: string) => {
    try {
      await deleteCustomScreen(id);
      await refresh(true);
      setActionError(null);
    } catch (err) {
      if (isApiClientError(err)) {
        setActionError(err.message);
      } else {
        setActionError("Failed to delete custom screen.");
      }
    }
  };

  return (
    <AdminShell
      activeHref="/admin/coderso/custom-screens"
      breadcrumbs={
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <span>Coderso</span>
          <span>/</span>
          <span className="text-foreground">Screens</span>
        </div>
      }
    >
      <div className="mx-auto flex max-w-6xl flex-col gap-6">
        <PageHeader
          title="Custom Screens"
          description="Compose admin data screens from widgets tied to content types."
          actions={
            <Button
              className="gap-2"
              onClick={() => navigate("/coderso/custom-screens/new")}
            >
              <Plus className="h-4 w-4" />
              New screen
            </Button>
          }
        />

        {error ? (
          <Alert variant="destructive">
            <AlertTitle>Unable to load custom screens</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        ) : null}
        {actionError ? (
          <Alert variant="destructive">
            <AlertTitle>Custom screen action failed</AlertTitle>
            <AlertDescription>{actionError}</AlertDescription>
          </Alert>
        ) : null}

        <CustomScreenTable
          items={items}
          contentTypes={contentTypes}
          onDelete={handleDelete}
          emptyMessage={isLoading ? "Loading custom screens..." : undefined}
        />
      </div>
    </AdminShell>
  );
}
