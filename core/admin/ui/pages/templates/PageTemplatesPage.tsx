import { Copy, LayoutTemplate, Pencil, Plus, RefreshCw, Trash2 } from "lucide-react";
import { useMemo, useState } from "react";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
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
import { EmptyState } from "@/ui/shared/EmptyState";
import { ListSkeleton } from "@/ui/shared/ListSkeleton";
import { PageHeader } from "@/ui/shared/PageHeader";

import { createDefaultPageDocumentV2 } from "../../../../services/pages/pageDocumentV2";
import { usePageTemplates } from "./usePageTemplates";

type PageTemplateStatusFilter = "all" | "draft" | "published";

const resolveActionError = (error: unknown, fallback: string) => {
  if (isApiClientError(error)) return error.message;
  if (error instanceof Error && error.message) return error.message;
  return fallback;
};

/**
 * Pure-presentation thumbnail ported from the redesign prototype
 * (`_docs/_PROTOTYPE/.../PageTemplatesPage.tsx`): a soft skeleton standing in
 * for the template's section stack. No data binding.
 */
function PageThumb() {
  return (
    <div className="mb-4 flex h-32 flex-col gap-2 rounded-xl bg-muted p-3" aria-hidden>
      <div className="flex items-center gap-1.5">
        <div className="size-3 rounded-full bg-muted-foreground/30" />
        <div className="ml-auto flex gap-1">
          {[0, 1, 2].map((i) => (
            <div key={i} className="h-1.5 w-5 rounded bg-muted-foreground/20" />
          ))}
        </div>
      </div>
      <div className="h-9 rounded-md bg-muted-foreground/20" />
      <div className="grid grid-cols-3 gap-2">
        {[0, 1, 2].map((i) => (
          <div key={i} className="h-6 rounded bg-muted-foreground/15" />
        ))}
      </div>
      <div className="mt-auto h-2 w-1/2 rounded bg-muted-foreground/15" />
    </div>
  );
}

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
      activeHref="/admin/pages"
      breadcrumbs={[
        { label: "Content" },
        { label: "Pages", href: "/pages" },
        { label: "Templates" },
      ]}
    >
      <div className="mx-auto flex max-w-7xl flex-col gap-6">
        <PageHeader
          title="Page Templates"
          description="Reusable Page v2 section stacks authored with the Page Editor and inserted into pages."
          actions={
            <Button className="gap-2" onClick={() => setCreateOpen(true)}>
              <Plus className="size-4" />
              New template
            </Button>
          }
        />

        {/* Propagation note — ported from the prototype's violet soft card. Static and
            informational (no data binding). Kept page-scoped: a Page Template can be the
            site footer (site.footerTemplateId), but the header/main menu is a published
            Menu (site.navigationMenuId, owned by TASK-479-10), not a template. */}
        <Card className="flex flex-row items-center gap-3 bg-primary-soft/50 p-4">
          <RefreshCw className="size-5 shrink-0 text-primary" />
          <p className="text-sm text-muted-foreground">
            Change a <span className="font-medium text-foreground">site-wide</span> template once
            and every page using it updates automatically.
          </p>
        </Card>

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

        <Card className="gap-0 p-4">
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
        </Card>

        {isLoading ? (
          <ListSkeleton rows={4} />
        ) : filtered.length === 0 ? (
          <EmptyState
            icon={<LayoutTemplate />}
            title={items.length === 0 ? "No page templates yet" : "No matching templates"}
            description={
              items.length === 0
                ? "Create one to reuse section stacks across pages."
                : "No page templates match your search."
            }
            action={
              items.length === 0 ? (
                <Button className="gap-2" onClick={() => setCreateOpen(true)}>
                  <Plus className="size-4" />
                  New template
                </Button>
              ) : null
            }
          />
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {filtered.map((item) => (
              <Card
                key={item.id}
                data-page-template-row={item.id}
                className="flex h-full flex-col gap-0 p-4"
              >
                <PageThumb />
                <div className="flex items-start justify-between gap-2">
                  <button
                    type="button"
                    className="min-w-0 truncate text-left font-display text-[15px] font-semibold hover:underline"
                    onClick={() => navigate(`/advanced/page-templates/${item.id}`)}
                  >
                    {item.name}
                  </button>
                  {/* Honesty guard: real signal only — category (or status) tone, never a
                      fabricated "Site-wide" scope. Success tone marks published templates. */}
                  <Badge variant={item.status === "published" ? "success" : "outline"}>
                    {item.category ?? item.status}
                  </Badge>
                </div>
                <div className="mt-1 text-xs text-muted-foreground">
                  {item.slug} · {item.sectionsCount}{" "}
                  {item.sectionsCount === 1 ? "section" : "sections"} · Updated{" "}
                  {new Date(item.updatedAt).toLocaleDateString()}
                </div>
                <div className="mt-4 flex gap-2">
                  <Button
                    type="button"
                    variant="soft"
                    size="sm"
                    className="flex-1 gap-1.5"
                    aria-label={`Edit ${item.name}`}
                    onClick={() => navigate(`/advanced/page-templates/${item.id}`)}
                  >
                    <Pencil className="size-4" /> Edit
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-sm"
                    aria-label={`Duplicate ${item.name}`}
                    disabled={duplicatingId === item.id}
                    onClick={() => handleDuplicate(item.id)}
                  >
                    <Copy className="size-4" />
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-sm"
                    aria-label={`Delete ${item.name}`}
                    onClick={() => setDeleteTarget(item)}
                  >
                    <Trash2 className="size-4" />
                  </Button>
                </div>
              </Card>
            ))}
          </div>
        )}
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
            <label className="grid gap-1.5 text-xs font-medium text-muted-foreground">
              Name
              <Input
                value={createName}
                onChange={(event) => setCreateName(event.target.value)}
                placeholder="Landing hero stack"
                aria-label="Template name"
              />
            </label>
            <label className="grid gap-1.5 text-xs font-medium text-muted-foreground">
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
