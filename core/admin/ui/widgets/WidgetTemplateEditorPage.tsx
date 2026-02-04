import { useCallback, useEffect, useMemo, useState } from "react";
import { ChevronRight, History, Search, Settings2 } from "lucide-react";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { isApiClientError } from "@/services/apiClient";
import {
  previewWidgetTemplate,
  type WidgetTemplatePreviewResponse,
} from "@/services/widgetTemplatePreviewClient";
import {
  listWidgetTemplateRevisions,
  restoreWidgetTemplateRevision,
  type WidgetTemplateRevision,
} from "@/services/widgetTemplateRevisionsClient";
import {
  createWidgetTemplate,
  getWidgetTemplate,
  updateWidgetTemplate,
  type WidgetTemplateStatus,
} from "@/services/widgetTemplatesClient";
import {
  listWidgetTemplateCategories,
  type WidgetTemplateCategory,
} from "@/services/widgetTemplateCategoriesClient";
import { AdminShell } from "@/ui/layouts/AdminShell";
import { useAdminBasePath } from "@/ui/contexts/AdminBasePathContext";
import { listRegisteredWidgets } from "@/ui/widgets/registry";
import { BlockList } from "@/ui/pages/builder/BlockList";
import { BlockSettings } from "@/ui/pages/builder/BlockSettings";
import {
  appendSlotBlock,
  createBlock,
  deleteBlockById,
  duplicateBlock,
  findBlockById,
  getFirstBlockId,
  moveBlockIntoSlot,
  reorderBlocksAtPath,
  updateBlockById,
} from "@/ui/pages/builder/blockUtils";
import type { Block } from "@/ui/pages/builder/types";
import { getWidgetRegistry } from "@/ui/pages/builder/widgetRegistry";
import {
  resolveAdminBasePath,
  resolveAdminHref,
  stripAdminBasePath,
} from "@/utils/adminPaths";
import type { WidgetCategoryId } from "./types";
import { WidgetCard } from "./WidgetCard";
import { WidgetTemplatePreviewDialog } from "./WidgetTemplatePreviewDialog";
import { WidgetTemplateRevisionDrawer } from "./WidgetTemplateRevisionDrawer";

const widgetCategoryLabels: Record<WidgetCategoryId, string> = {
  layout: "Layout",
  content: "Content",
  forms: "Forms",
  navigation: "Navigation",
  media: "Media",
};

const NO_CATEGORIES_VALUE = "no-categories";

const resolveTemplateId = (pathname: string) => {
  const adminBasePath = resolveAdminBasePath(pathname);
  const relativePath = stripAdminBasePath(pathname, adminBasePath);
  const parts = relativePath.split("/").filter(Boolean);
  const index = parts.findIndex((segment) => segment === "widgets");
  if (index === -1) return null;
  if (parts[index + 1] !== "templates") return null;
  return parts[index + 2] ?? null;
};

export function WidgetTemplateEditorPage() {
  const adminBasePath = useAdminBasePath();
  const [templateId] = useState<string | null>(() => {
    if (typeof window === "undefined") return null;
    return resolveTemplateId(window.location.pathname);
  });
  const isNew = !templateId || templateId === "new";

  const widgets = useMemo(() => listRegisteredWidgets(), []);
  const [blocks, setBlocks] = useState<Block[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("");
  const [status, setStatus] = useState<WidgetTemplateStatus>("draft");
  const [query, setQuery] = useState("");
  const [activeCategory, setActiveCategory] = useState<
    WidgetCategoryId | "all"
  >("all");
  const [templateCategories, setTemplateCategories] = useState<
    WidgetTemplateCategory[]
  >([]);
  const [isLoading, setIsLoading] = useState(!isNew);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [categoriesError, setCategoriesError] = useState<string | null>(null);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewData, setPreviewData] =
    useState<WidgetTemplatePreviewResponse | null>(null);
  const [previewError, setPreviewError] = useState<string | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [revisionsOpen, setRevisionsOpen] = useState(false);
  const [revisions, setRevisions] = useState<WidgetTemplateRevision[]>([]);
  const [revisionsError, setRevisionsError] = useState<string | null>(null);
  const [revisionsLoading, setRevisionsLoading] = useState(false);
  const [restoringRevisionId, setRestoringRevisionId] = useState<string | null>(
    null
  );

  const displayError = error ?? categoriesError;

  const selectedBlock = findBlockById(blocks, selectedId);
  const selectedWidget = useMemo(() => {
    if (!selectedBlock) return undefined;
    return getWidgetRegistry().find((widget) => widget.type === selectedBlock.type);
  }, [selectedBlock]);

  const filteredWidgets = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    return widgets.filter((widget) => {
      const matchesQuery =
        normalized.length === 0 ||
        widget.title.toLowerCase().includes(normalized) ||
        widget.description?.toLowerCase().includes(normalized);
      const matchesCategory =
        activeCategory === "all" || widget.category === activeCategory;
      return matchesQuery && matchesCategory;
    });
  }, [widgets, query, activeCategory]);

  const handleAddBlock = (type: string) => {
    const next = createBlock(type);
    setBlocks((prev) => [...prev, next]);
    setSelectedId(next.id);
  };

  const handleInsertIntoSlot = (parentId: string, slotId: string, type: string) => {
    const next = createBlock(type);
    setBlocks((prev) => appendSlotBlock(prev, parentId, slotId, next));
    setSelectedId(next.id);
  };

  const handleMoveIntoSlot = (blockId: string, parentId: string, slotId: string) => {
    setBlocks((prev) => moveBlockIntoSlot(prev, blockId, parentId, slotId));
  };

  const loadTemplate = useCallback(async () => {
    if (!templateId || templateId === "new") {
      setIsLoading(false);
      return;
    }
    setIsLoading(true);
    setError(null);
    try {
      const template = await getWidgetTemplate(templateId);
      setName(template.name ?? "");
      setDescription(template.description ?? "");
      setCategory(template.category);
      setStatus(template.status);
      setBlocks((template.blocks as Block[]) ?? []);
    } catch (err) {
      const message = isApiClientError(err)
        ? err.message
        : "Failed to load template.";
      setError(message);
    } finally {
      setIsLoading(false);
    }
  }, [templateId]);

  useEffect(() => {
    void loadTemplate();
  }, [loadTemplate]);

  useEffect(() => {
    let active = true;
    listWidgetTemplateCategories()
      .then((result) => {
        if (!active) return;
        setTemplateCategories(result.items);
      })
      .catch(() => {
        if (!active) return;
        setCategoriesError("Failed to load categories.");
      });
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (category || templateCategories.length === 0) return;
    setCategory(templateCategories[0].name);
  }, [category, templateCategories]);

  const handleSave = async () => {
    if (!name.trim()) {
      setError("Template name is required.");
      return;
    }
    if (!category.trim()) {
      setError("Template category is required.");
      return;
    }
    setIsSaving(true);
    setError(null);
    try {
      if (isNew) {
        const created = await createWidgetTemplate({
          name: name.trim(),
          description: description.trim() ? description.trim() : null,
          category: category.trim(),
          status,
          blocks,
        });
        window.location.assign(
          resolveAdminHref(adminBasePath, `/admin/widgets/templates/${created.id}`)
        );
        return;
      }
      if (!templateId) return;
      await updateWidgetTemplate(templateId, {
        name: name.trim(),
        description: description.trim() ? description.trim() : null,
        category: category.trim(),
        status,
        blocks,
      });
    } catch (err) {
      const message = isApiClientError(err)
        ? err.message
        : "Failed to save template.";
      setError(message);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDiscard = () => {
    if (isNew) {
      window.location.assign(resolveAdminHref(adminBasePath, "/admin/widgets"));
      return;
    }
    void loadTemplate();
  };

  const canPreview = !isNew && Boolean(templateId);

  const handlePreviewOpen = async () => {
    setPreviewOpen(true);
    if (!canPreview || !templateId) {
      setPreviewData(null);
      setPreviewError(null);
      setPreviewLoading(false);
      return;
    }
    setPreviewLoading(true);
    setPreviewError(null);
    try {
      const result = await previewWidgetTemplate(templateId);
      setPreviewData(result);
    } catch {
      setPreviewError("Failed to load template preview.");
      setPreviewData(null);
    } finally {
      setPreviewLoading(false);
    }
  };

  const handleOpenRevisions = async () => {
    setRevisionsOpen(true);
    if (!templateId || isNew) {
      setRevisions([]);
      setRevisionsError(null);
      setRevisionsLoading(false);
      return;
    }
    setRevisionsLoading(true);
    setRevisionsError(null);
    try {
      const result = await listWidgetTemplateRevisions(templateId);
      setRevisions(result.items);
    } catch {
      setRevisionsError("Failed to load revisions.");
      setRevisions([]);
    } finally {
      setRevisionsLoading(false);
    }
  };

  const handleRestoreRevision = async (revisionId: string) => {
    if (!templateId) return;
    setRestoringRevisionId(revisionId);
    setRevisionsError(null);
    try {
      await restoreWidgetTemplateRevision(templateId, revisionId);
      await loadTemplate();
      const result = await listWidgetTemplateRevisions(templateId);
      setRevisions(result.items);
    } catch {
      setRevisionsError("Failed to restore revision.");
    } finally {
      setRestoringRevisionId(null);
    }
  };

  return (
    <>
      <AdminShell
        activeHref="/admin/widgets"
        showSearch={false}
        breadcrumbs={
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <span>Widgets</span>
            <ChevronRight className="h-4 w-4" />
            <span>Templates</span>
            <ChevronRight className="h-4 w-4" />
            <span className="text-foreground">
              {isNew ? "New Template" : name || "Template"}
            </span>
            <Badge variant="secondary" className="ml-2 text-[10px] uppercase">
              {status}
            </Badge>
          </div>
        }
        topbarActions={
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              disabled={isNew}
              onClick={() => void handlePreviewOpen()}
            >
              Preview
            </Button>
            <Button variant="ghost" size="sm" onClick={handleDiscard}>
              Discard
            </Button>
            <Button size="sm" onClick={handleSave} disabled={isSaving}>
              {isSaving ? "Saving..." : "Save Template"}
            </Button>
          </div>
        }
        contentClassName="p-0 overflow-hidden"
      >
        <div className="flex h-full min-h-[calc(100vh-4rem)] flex-col">
          <div className="border-b bg-card px-6 py-4">
            <div className="flex flex-wrap items-start gap-4">
              <div className="flex min-w-[220px] flex-1 flex-col gap-2">
                <Input
                  className="text-lg font-semibold"
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                  placeholder="Template name"
                />
                <Textarea
                  className="min-h-[0px] resize-none text-xs"
                  value={description}
                  onChange={(event) => setDescription(event.target.value)}
                  placeholder="Add description..."
                />
              </div>
              <div className="min-w-[200px] space-y-2">
                <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                  Category
                </p>
                <Select value={category} onValueChange={setCategory}>
                  <SelectTrigger>
                    <SelectValue placeholder="Category" />
                  </SelectTrigger>
                  <SelectContent>
                    {templateCategories.length === 0 ? (
                      <SelectItem value={NO_CATEGORIES_VALUE} disabled>
                        Add a category first
                      </SelectItem>
                    ) : (
                      templateCategories.map((item) => (
                        <SelectItem key={item.id} value={item.name}>
                          {item.name}
                        </SelectItem>
                      ))
                    )}
                  </SelectContent>
                </Select>
              </div>
            </div>
            {displayError ? (
              <div className="mt-4">
                <Alert variant="destructive">
                  <AlertTitle>Error</AlertTitle>
                  <AlertDescription>{displayError}</AlertDescription>
                </Alert>
              </div>
            ) : null}
          </div>
          <div className="flex flex-1 min-h-0">
            <aside className="hidden w-72 min-h-0 flex-col border-r bg-card lg:flex">
            <div className="border-b p-4">
              <div className="relative">
                <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  className="pl-9 text-xs"
                  placeholder="Search widgets..."
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                />
              </div>
            </div>
            <ScrollArea className="flex-1 min-h-0">
              <div className="p-4">
                <div className="space-y-2">
                  <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                    Category
                  </p>
                  <Select
                    value={activeCategory}
                    onValueChange={(value) =>
                      setActiveCategory(value as WidgetCategoryId | "all")
                    }
                  >
                    <SelectTrigger className="text-xs">
                      <SelectValue placeholder="All widgets" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All widgets</SelectItem>
                      {(Object.keys(widgetCategoryLabels) as WidgetCategoryId[]).map(
                        (cat) => (
                          <SelectItem key={cat} value={cat}>
                            {widgetCategoryLabels[cat]}
                          </SelectItem>
                        )
                      )}
                    </SelectContent>
                  </Select>
                </div>
                <div className="mt-6">
                  <p className="mb-3 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                    Draggable items
                  </p>
                  <div className="space-y-2">
                    {filteredWidgets.map((widget) => (
                      <WidgetCard
                        key={widget.type}
                        name={widget.title}
                        categoryLabel={widgetCategoryLabels[widget.category]}
                        variant="compact"
                        draggable
                        onDragStart={(event) => {
                          event.dataTransfer.setData("widget-type", widget.type);
                          event.dataTransfer.effectAllowed = "copy";
                        }}
                        onSelect={() => handleAddBlock(widget.type)}
                      />
                    ))}
                  </div>
                </div>
              </div>
            </ScrollArea>
            </aside>

            <main
            className={
              "flex-1 overflow-auto p-10 bg-[radial-gradient(circle,var(--admin-base-border)_1px,transparent_1px)] bg-[size:24px_24px]"
            }
            onDragOver={(event) => {
              event.preventDefault();
            }}
            onDrop={(event) => {
              event.preventDefault();
              const type = event.dataTransfer.getData("widget-type");
              if (type) handleAddBlock(type);
            }}
          >
            {isLoading ? (
              <div className="mx-auto flex w-full max-w-3xl flex-col items-center justify-center rounded-3xl border-2 border-dashed border-border/60 bg-background/40 px-10 py-16 text-center">
                <div className="mb-6 flex h-20 w-20 items-center justify-center rounded-2xl border border-primary/30 bg-primary/5 text-primary">
                  <Settings2 className="h-10 w-10" />
                </div>
                <h2 className="text-2xl font-semibold text-foreground">
                  Loading template
                </h2>
              </div>
            ) : blocks.length === 0 ? (
              <div className="mx-auto flex w-full max-w-3xl flex-col items-center justify-center rounded-3xl border-2 border-dashed border-border/60 bg-background/40 px-10 py-16 text-center">
                <div className="mb-6 flex h-20 w-20 items-center justify-center rounded-2xl border border-primary/30 bg-primary/5 text-primary">
                  <Settings2 className="h-10 w-10" />
                </div>
                <h2 className="text-2xl font-semibold text-foreground">
                  Build your template
                </h2>
                <p className="mt-3 max-w-xs text-sm text-muted-foreground">
                  Drag widgets from the library to build a reusable template layout.
                </p>
                <div className="mt-8 flex flex-wrap items-center justify-center gap-3 text-[10px] uppercase tracking-wider text-muted-foreground">
                  <span className="rounded-full border border-border/60 px-3 py-1">
                    Section 1
                  </span>
                  <span className="rounded-full border border-primary/30 px-3 py-1 text-primary">
                    Drop target
                  </span>
                </div>
              </div>
            ) : (
              <div className="w-full">
                <BlockList
                  blocks={blocks}
                  selectedId={selectedId}
                  onSelect={setSelectedId}
                  onMove={(path, from, to) =>
                    setBlocks((prev) => reorderBlocksAtPath(prev, path, from, to))
                  }
                  onDuplicate={(id) =>
                    setBlocks((prev) => duplicateBlock(prev, id))
                  }
                  onDelete={(id) =>
                    setBlocks((prev) => {
                      const result = deleteBlockById(prev, id);
                      if (selectedId && !findBlockById(result.blocks, selectedId)) {
                        setSelectedId(getFirstBlockId(result.blocks));
                      }
                      return result.blocks;
                    })
                  }
                  onInsert={handleInsertIntoSlot}
                  onMoveToSlot={handleMoveIntoSlot}
                />
              </div>
            )}
            </main>

            <aside className="hidden w-80 min-h-0 flex-col border-l bg-card lg:flex">
            <div className="border-b px-4 py-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Details
            </div>
            <ScrollArea className="flex-1 min-h-0">
              <div className="p-6">
                <BlockSettings
                  block={selectedBlock}
                  widget={selectedWidget}
                  onChange={(next) =>
                    setBlocks((prev) => updateBlockById(prev, next.id, () => next))
                  }
                />
              </div>
            </ScrollArea>
            <div className="border-t bg-muted/20 p-4">
              <Button
                variant="secondary"
                className="w-full gap-2"
                onClick={() => void handleOpenRevisions()}
                disabled={isNew}
              >
                <History className="h-4 w-4" />
                Revision History
              </Button>
            </div>
            </aside>
          </div>
        </div>
      </AdminShell>
      <WidgetTemplatePreviewDialog
        open={previewOpen}
        onOpenChange={setPreviewOpen}
        templateName={name || undefined}
        canPreview={canPreview}
        preview={previewData}
        isLoading={previewLoading}
        error={previewError}
      />
      <WidgetTemplateRevisionDrawer
        open={revisionsOpen}
        onOpenChange={setRevisionsOpen}
        revisions={revisions}
        isLoading={revisionsLoading}
        error={revisionsError}
        restoringId={restoringRevisionId}
        onRestore={handleRestoreRevision}
      />
    </>
  );
}
