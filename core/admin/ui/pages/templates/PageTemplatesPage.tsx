import { Copy, Pencil, Plus, Trash2 } from "lucide-react";
import { useMemo, useState } from "react";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { isApiClientError } from "@/services/apiClient";
import {
  createPageTemplate,
  deletePageTemplate,
  duplicatePageTemplate,
  type PageTemplateSummary,
} from "@/services/pageTemplatesClient";
import { useAdminRouter } from "@/ui/contexts/AdminRouterContext";
import { AdminShell } from "@/ui/layouts/AdminShell";
import { ConfirmActionDialog } from "@/ui/shared/ConfirmActionDialog";
import { PageHeader } from "@/ui/shared/PageHeader";

import { createDefaultPageDocumentV2 } from "../../../../services/pages/pageDocumentV2";
import { usePageTemplates } from "./usePageTemplates";

type PageTemplateStatusFilter = "all" | "draft" | "published";

const resolveActionError = (error: unknown, fallback: string) => {
  if (isApiClientError(error)) return error.message;
  if (error instanceof Error && error.message) return error.message;
  return fallback;
};

export function PageTemplatesPage() {
  const { navigate } = useAdminRouter();
  const { items, isLoading, error, refresh } = usePageTemplates();

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<PageTemplateStatusFilter>("all");
  const [actionError, setActionError] = useState<string | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [createName, setCreateName] = useState("");
  const [createCategory, setCreateCategory] = useState("");
  const [isCreating, setIsCreating] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<PageTemplateSummary | null>(null);
  const [duplicatingId, setDuplicatingId] = useState<string | null>(null);

  const filtered = useMemo(() => {
    const needle = search.trim().toLowerCase();
    return items.filter((item) => {
      if (statusFilter !== "all" && item.status !== statusFilter) return false;
      if (!needle) return true;
      return (
        item.name.toLowerCase().includes(needle) ||
        item.slug.toLowerCase().includes(needle) ||
        (item.category ?? "").toLowerCase().includes(needle)
      );
    });
  }, [items, search, statusFilter]);

  const counts = useMemo(
    () => ({
      all: items.length,
      published: items.filter((item) => item.status === "published").length,
      draft: items.filter((item) => item.status === "draft").length,
    }),
    [items]
  );

  const handleCreate = async () => {
    const name = createName.trim();
    if (!name) return;
    setIsCreating(true);
    setActionError(null);
    try {
      const created = await createPageTemplate({
        name,
        category: createCategory.trim() ? createCategory.trim() : null,
        document: createDefaultPageDocumentV2() as unknown as Record<string, unknown>,
      });
      setCreateOpen(false);
      setCreateName("");
      setCreateCategory("");
      if (created) navigate(`/advanced/page-templates/${created.id}`);
    } catch (createError) {
      setActionError(resolveActionError(createError, "Failed to create page template."));
    } finally {
      setIsCreating(false);
    }
  };

  const handleDuplicate = async (id: string) => {
    setDuplicatingId(id);
    setActionError(null);
    try {
      await duplicatePageTemplate(id);
      await refresh(true);
    } catch (duplicateError) {
      setActionError(resolveActionError(duplicateError, "Failed to duplicate page template."));
    } finally {
      setDuplicatingId(null);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setActionError(null);
    try {
      await deletePageTemplate(deleteTarget.id);
      await refresh(true);
    } catch (deleteError) {
      setActionError(resolveActionError(deleteError, "Failed to delete page template."));
    } finally {
      setDeleteTarget(null);
    }
  };

  return (
    <AdminShell
      activeHref="/admin/advanced/page-templates"
      breadcrumbs={["Coderso", "Page Templates"]}
    >
      <div className="mx-auto flex max-w-7xl flex-col gap-6">
        <PageHeader
          title="Page Templates"
          description="Reusable Page v2 section stacks authored with the Page Editor and inserted into pages."
          actions={
            <Button className="gap-2" onClick={() => setCreateOpen(true)}>
              <Plus className="h-4 w-4" />
              New template
            </Button>
          }
        />

        {error ? (
          <Alert variant="destructive">
            <AlertTitle>Unable to load page templates</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        ) : null}
        {actionError ? (
          <Alert variant="destructive">
            <AlertTitle>Page template action failed</AlertTitle>
            <AlertDescription>{actionError}</AlertDescription>
          </Alert>
        ) : null}

        <div className="rounded-xl border bg-card p-4 shadow-sm">
          <div className="grid gap-3 md:grid-cols-[1fr_auto]">
            <Input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search templates by name, slug, or category..."
              aria-label="Search page templates"
            />
            <Tabs
              value={statusFilter}
              onValueChange={(value) => setStatusFilter(value as PageTemplateStatusFilter)}
            >
              <TabsList className="grid w-full grid-cols-3 md:w-[24rem]">
                <TabsTrigger value="all">All ({counts.all})</TabsTrigger>
                <TabsTrigger value="published">Published ({counts.published})</TabsTrigger>
                <TabsTrigger value="draft">Draft ({counts.draft})</TabsTrigger>
              </TabsList>
            </Tabs>
          </div>

          <div className="mt-4">
            {isLoading ? (
              <p className="p-8 text-center text-sm text-muted-foreground">
                Loading page templates...
              </p>
            ) : filtered.length === 0 ? (
              <p className="p-8 text-center text-sm text-muted-foreground">
                {items.length === 0
                  ? "No page templates yet. Create one to reuse section stacks across pages."
                  : "No page templates match your search."}
              </p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Sections</TableHead>
                    <TableHead>Updated</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map((item) => (
                    <TableRow key={item.id} data-page-template-row={item.id}>
                      <TableCell>
                        <button
                          type="button"
                          className="text-left font-medium hover:underline"
                          onClick={() => navigate(`/advanced/page-templates/${item.id}`)}
                        >
                          {item.name}
                        </button>
                        <p className="text-xs text-muted-foreground">{item.slug}</p>
                      </TableCell>
                      <TableCell>{item.category ?? "—"}</TableCell>
                      <TableCell>
                        <Badge variant={item.status === "published" ? "default" : "secondary"}>
                          {item.status}
                        </Badge>
                      </TableCell>
                      <TableCell>{item.sectionsCount}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {new Date(item.updatedAt).toLocaleString()}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1">
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon-sm"
                            aria-label={`Edit ${item.name}`}
                            onClick={() => navigate(`/advanced/page-templates/${item.id}`)}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon-sm"
                            aria-label={`Duplicate ${item.name}`}
                            disabled={duplicatingId === item.id}
                            onClick={() => handleDuplicate(item.id)}
                          >
                            <Copy className="h-4 w-4" />
                          </Button>
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon-sm"
                            aria-label={`Delete ${item.name}`}
                            onClick={() => setDeleteTarget(item)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </div>
        </div>
      </div>

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>New page template</DialogTitle>
            <DialogDescription>
              Templates start as drafts with an empty Page v2 document. Publish a template to offer
              it in the page editor insert picker.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <label className="grid gap-1 text-xs font-semibold uppercase text-muted-foreground">
              Name
              <Input
                value={createName}
                onChange={(event) => setCreateName(event.target.value)}
                placeholder="Landing hero stack"
                aria-label="Template name"
              />
            </label>
            <label className="grid gap-1 text-xs font-semibold uppercase text-muted-foreground">
              Category (optional)
              <Input
                value={createCategory}
                onChange={(event) => setCreateCategory(event.target.value)}
                placeholder="marketing"
                aria-label="Template category"
              />
            </label>
          </div>
          <DialogFooter>
            <Button type="button" variant="ghost" onClick={() => setCreateOpen(false)}>
              Cancel
            </Button>
            <Button
              type="button"
              disabled={isCreating || !createName.trim()}
              onClick={handleCreate}
            >
              {isCreating ? "Creating..." : "Create template"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ConfirmActionDialog
        open={Boolean(deleteTarget)}
        onOpenChange={(open) => {
          if (!open) setDeleteTarget(null);
        }}
        title="Delete page template"
        description="This permanently removes the template. Pages it was applied to keep their sections."
        targetLabel={deleteTarget?.name}
        confirmLabel="Delete template"
        tone="destructive"
        onConfirm={handleDelete}
      />
    </AdminShell>
  );
}
