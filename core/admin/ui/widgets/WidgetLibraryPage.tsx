import { useEffect, useMemo, useState } from "react";
import type { LucideIcon } from "lucide-react";
import {
  Columns,
  FileText,
  GalleryVerticalEnd,
  Grid2X2,
  Image as ImageIcon,
  LayoutGrid,
  List,
  Play,
  Plus,
  Search,
  Star,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";
import { getPage, listPages, updatePage, type PageSummary } from "@/services/pagesClient";
import {
  createWidgetTemplate,
  listWidgetTemplates,
  type WidgetTemplate,
} from "@/services/widgetTemplatesClient";
import { AdminShell } from "@/ui/layouts/AdminShell";
import { useAdminBasePath } from "@/ui/contexts/AdminBasePathContext";
import { PageHeader } from "@/ui/shared/PageHeader";
import { listRegisteredWidgets } from "@/ui/widgets/registry";
import { resolveAdminHref } from "@/utils/adminPaths";
import { createBlock } from "@/ui/pages/builder/blockUtils";
import type { Block } from "@/ui/pages/builder/types";

import { WidgetCard } from "./WidgetCard";
import { WidgetCreateDialog } from "./WidgetCreateDialog";
import { WidgetDetailsDrawer } from "./WidgetDetailsDrawer";
import { WidgetInsertDialog } from "./WidgetInsertDialog";
import type { WidgetCategoryId, WidgetItem, WidgetSource } from "./types";

type WidgetCategoryFilter = "all" | "favorites" | "templates" | WidgetCategoryId;
type WidgetView = "grid" | "list";
type WidgetPreview =
  | "hero"
  | "grid"
  | "form"
  | "media"
  | "video"
  | "text"
  | "pricing"
  | "banner";

type CategoryItem = {
  id: WidgetCategoryFilter;
  label: string;
  icon: LucideIcon;
};
type WidgetWithPreview = WidgetItem & { preview: WidgetPreview; source: WidgetSource };

const primaryCategories: CategoryItem[] = [
  { id: "all", label: "All Widgets", icon: LayoutGrid },
  { id: "favorites", label: "Favorites", icon: Star },
  { id: "templates", label: "Templates", icon: LayoutGrid },
];

const categoryMeta: Record<
  WidgetCategoryId,
  { label: string; icon: LucideIcon; preview: WidgetPreview }
> = {
  layout: { label: "Layout", icon: GalleryVerticalEnd, preview: "hero" },
  content: { label: "Content", icon: Columns, preview: "grid" },
  forms: { label: "Forms", icon: FileText, preview: "form" },
  navigation: { label: "Navigation", icon: List, preview: "banner" },
  media: { label: "Media", icon: ImageIcon, preview: "media" },
};

const secondaryCategories: CategoryItem[] = (
  Object.entries(categoryMeta) as [
    WidgetCategoryId,
    (typeof categoryMeta)[WidgetCategoryId],
  ][]
).map(([id, meta]) => ({
  id,
  label: meta.label,
  icon: meta.icon,
}));

function PreviewFrame({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "h-full w-full rounded-lg border bg-background/80 p-3 shadow-sm",
        className
      )}
    >
      {children}
    </div>
  );
}

function renderPreview(kind: WidgetPreview) {
  switch (kind) {
    case "grid":
      return (
        <PreviewFrame className="p-2">
          <div className="grid h-full grid-cols-3 gap-2">
            {Array.from({ length: 3 }).map((_, index) => (
              <div
                key={`grid-${index}`}
                className="flex flex-col gap-2 rounded-md border bg-background p-2"
              >
                <div className="h-3 w-3 rounded-full bg-muted" />
                <div className="h-1 w-full rounded bg-muted/60" />
              </div>
            ))}
          </div>
        </PreviewFrame>
      );
    case "form":
      return (
        <PreviewFrame>
          <div className="flex h-full flex-col gap-2">
            <div className="h-2 w-1/3 rounded bg-muted" />
            <div className="h-6 w-full rounded border bg-muted/30" />
            <div className="mt-auto h-4 w-full rounded bg-primary/70" />
          </div>
        </PreviewFrame>
      );
    case "media":
      return (
        <PreviewFrame className="p-2">
          <div className="flex h-full gap-2">
            {Array.from({ length: 2 }).map((_, index) => (
              <div
                key={`media-${index}`}
                className="flex flex-1 flex-col gap-2 rounded-md border bg-background p-2"
              >
                <div className="flex-1 rounded bg-muted/60" />
                <div className="h-1 w-full rounded bg-muted/50" />
              </div>
            ))}
          </div>
        </PreviewFrame>
      );
    case "video":
      return (
        <PreviewFrame className="flex items-center justify-center">
          <div className="flex flex-col items-center gap-2">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-muted">
              <Play className="h-4 w-4 text-muted-foreground" />
            </div>
            <div className="h-1 w-16 rounded bg-muted/60" />
          </div>
        </PreviewFrame>
      );
    case "text":
      return (
        <PreviewFrame>
          <div className="flex h-full flex-col gap-2">
            <div className="h-2 w-full rounded bg-muted/60" />
            <div className="h-2 w-full rounded bg-muted/60" />
            <div className="h-2 w-3/4 rounded bg-muted/60" />
          </div>
        </PreviewFrame>
      );
    case "pricing":
      return (
        <PreviewFrame>
          <div className="flex h-full flex-col gap-2">
            <div className="flex items-center justify-between gap-3">
              <div className="h-2 w-1/4 rounded bg-muted" />
              <div className="h-2 w-1/4 rounded bg-muted" />
            </div>
            <div className="mt-auto h-2 w-full rounded bg-muted/60" />
          </div>
        </PreviewFrame>
      );
    case "banner":
      return (
        <PreviewFrame className="flex items-center justify-center border-primary/20 bg-primary/5">
          <span className="text-[10px] font-semibold uppercase tracking-[0.3em] text-primary/50">
            Banner
          </span>
        </PreviewFrame>
      );
    case "hero":
    default:
      return (
        <PreviewFrame>
          <div className="flex h-full flex-col gap-2">
            <div className="h-2 w-1/2 rounded bg-muted" />
            <div className="h-1 w-full rounded bg-muted/60" />
            <div className="h-1 w-2/3 rounded bg-muted/60" />
            <div className="mt-auto h-4 w-16 rounded bg-primary/30" />
          </div>
        </PreviewFrame>
      );
  }
}

export function WidgetLibraryPage() {
  const [query, setQuery] = useState("");
  const [view, setView] = useState<WidgetView>("grid");
  const [activeCategory, setActiveCategory] =
    useState<WidgetCategoryFilter>("all");
  const [templates, setTemplates] = useState<WidgetTemplate[]>([]);
  const [favoriteIds, setFavoriteIds] = useState<Set<string>>(new Set());
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  const [insertOpen, setInsertOpen] = useState(false);
  const [selectedWidget, setSelectedWidget] = useState<WidgetWithPreview | null>(
    null
  );
  const [insertWidget, setInsertWidget] = useState<WidgetWithPreview | null>(
    null
  );
  const [pages, setPages] = useState<PageSummary[]>([]);
  const [pagesError, setPagesError] = useState<string | null>(null);
  const [templatesError, setTemplatesError] = useState<string | null>(null);
  const [insertError, setInsertError] = useState<string | null>(null);
  const adminBasePath = useAdminBasePath();
  const templateCreateHref = resolveAdminHref(adminBasePath, "/admin/widgets/templates/new");
  const templateEditHref = (id: string) =>
    resolveAdminHref(adminBasePath, `/admin/widgets/templates/${id}`);

  const coreWidgets = useMemo(() => {
    const definitions = listRegisteredWidgets();
    return definitions.map((definition) => {
      const meta = categoryMeta[definition.category];
      return {
        id: definition.type,
        name: definition.title,
        category: definition.category,
        categoryLabel: meta.label,
        preview: meta.preview,
        source: "core" as const,
        description: definition.description,
      };
    });
  }, []);

  const widgets = useMemo<WidgetWithPreview[]>(() => {
    const templateItems = templates.map((template) => {
      const meta = categoryMeta[template.category];
      return {
        id: template.id,
        name: template.name,
        category: template.category,
        categoryLabel: meta?.label ?? "Template",
        preview: meta?.preview ?? "hero",
        badge: "Template",
        source: "template" as const,
        description: template.description,
        status: template.status,
      };
    });
    const combined = [...coreWidgets, ...templateItems];
    return combined.map((item) => ({
      ...item,
      isFavorite: favoriteIds.has(item.id),
    }));
  }, [coreWidgets, templates, favoriteIds]);

  useEffect(() => {
    let active = true;
    listPages()
      .then((result) => {
        if (!active) return;
        setPages(result);
      })
      .catch(() => {
        if (!active) return;
        setPagesError("Failed to load pages.");
      });
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    let active = true;
    listWidgetTemplates()
      .then((result) => {
        if (!active) return;
        setTemplates(result.items);
      })
      .catch(() => {
        if (!active) return;
        setTemplatesError("Failed to load templates.");
      });
    return () => {
      active = false;
    };
  }, []);

  const categoryCounts = useMemo(() => {
    const counts: Record<WidgetCategoryFilter, number> = {
      all: widgets.length,
      templates: widgets.filter((widget) => widget.source === "template").length,
      favorites: widgets.filter((widget) => widget.isFavorite).length,
      layout: widgets.filter((widget) => widget.category === "layout").length,
      content: widgets.filter((widget) => widget.category === "content").length,
      forms: widgets.filter((widget) => widget.category === "forms").length,
      navigation: widgets.filter((widget) => widget.category === "navigation").length,
      media: widgets.filter((widget) => widget.category === "media").length,
    };
    return counts;
  }, [widgets]);

  const filteredWidgets = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    return widgets.filter((widget) => {
      const matchesQuery =
        normalized.length === 0 ||
        widget.name.toLowerCase().includes(normalized) ||
        widget.categoryLabel.toLowerCase().includes(normalized);

      const matchesCategory =
        activeCategory === "all" ||
        (activeCategory === "favorites"
          ? widget.isFavorite
          : activeCategory === "templates"
            ? widget.source === "template"
            : widget.category === activeCategory);

      return matchesQuery && matchesCategory;
    });
  }, [widgets, query, activeCategory]);

  const handleFavoriteToggle = (id: string) => {
    setFavoriteIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleSelectWidget = (widget: WidgetWithPreview) => {
    setSelectedWidget(widget);
    setDetailsOpen(true);
  };

  const handleInsertWidget = (widget: WidgetWithPreview | null) => {
    if (!widget) return;
    setInsertWidget(widget);
    setInsertOpen(true);
  };

  const handleInsert = async (payload: { pageId: string | null }) => {
    if (!insertWidget || insertWidget.source !== "core" || !payload.pageId) return;
    setInsertError(null);
    try {
      const page = await getPage(payload.pageId);
      const currentData = (page.currentData ?? {}) as Record<string, unknown>;
      const blocks = Array.isArray(currentData.blocks)
        ? (currentData.blocks as Block[])
        : [];
      const nextBlocks = [...blocks, createBlock(insertWidget.id)];
      await updatePage(payload.pageId, {
        data: { ...currentData, blocks: nextBlocks },
      });
    } catch {
      setInsertError("Failed to insert widget into page.");
    }
  };

  const handleCreateTemplate = async (payload: {
    name: string;
    description?: string | null;
    category: WidgetCategoryId;
    blocks: Array<Record<string, unknown>>;
  }) => {
    const created = await createWidgetTemplate({
      name: payload.name,
      description: payload.description ?? null,
      category: payload.category,
      blocks: payload.blocks,
    });
    window.location.assign(templateEditHref(created.id));
  };

  const handleEditTemplate = (widget: WidgetWithPreview | null) => {
    if (!widget || widget.source !== "template") return;
    window.location.assign(templateEditHref(widget.id));
  };

  const favoriteWidgets = useMemo(
    () => widgets.filter((widget) => widget.isFavorite).slice(0, 3),
    [widgets]
  );

  return (
    <AdminShell
      activeHref="/admin/widgets"
      breadcrumbs={
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <span>Widgets</span>
          <span>/</span>
          <span className="text-foreground">Library</span>
        </div>
      }
      search={
        <div className="relative w-full max-w-md">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search widgets..."
            className="pl-9"
          />
        </div>
      }
      topbarActions={
        <div className="flex items-center gap-2">
          <Button size="sm" variant="outline" className="gap-2" asChild>
            <a href={templateCreateHref}>
              <Plus className="h-4 w-4" />
              New Template
            </a>
          </Button>
          <Button size="sm" className="gap-2" onClick={() => setCreateOpen(true)}>
            <Plus className="h-4 w-4" />
            Create Widget
          </Button>
        </div>
      }
    >
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-6 lg:flex-row">
        <aside className="w-full lg:w-72">
          <div className="rounded-2xl border border-border/60 bg-card px-4 py-5 shadow-sm">
            <div className="flex items-center justify-between">
              <p className="text-xs font-semibold uppercase tracking-[0.25em] text-muted-foreground">
                Library
              </p>
              <Badge variant="outline" className="text-[10px]">
                {categoryCounts.all}
              </Badge>
            </div>
            <Separator className="my-4" />
            <ScrollArea className="max-h-[360px] pr-2">
              <div className="space-y-2">
                {[...primaryCategories, ...secondaryCategories].map(
                  (category, index) => {
                    const isActive = activeCategory === category.id;
                    const count = categoryCounts[category.id] ?? 0;
                    const isDivider =
                      index === primaryCategories.length - 1 &&
                      secondaryCategories.length > 0;

                    return (
                      <div key={category.id}>
                        <button
                          type="button"
                          onClick={() => setActiveCategory(category.id)}
                          className={cn(
                            "flex w-full items-center gap-3 rounded-xl border px-3 py-2 text-sm font-medium transition",
                            isActive
                              ? "border-primary/40 bg-primary/10 text-primary"
                              : "border-border/60 bg-muted/30 text-muted-foreground hover:border-primary/30 hover:text-primary"
                          )}
                        >
                          <category.icon className="h-4 w-4" />
                          <span>{category.label}</span>
                          <Badge variant="outline" className="ml-auto text-[10px]">
                            {count}
                          </Badge>
                        </button>
                        {isDivider ? <Separator className="my-3" /> : null}
                      </div>
                    );
                  }
                )}
              </div>
            </ScrollArea>
            <Separator className="my-4" />
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.25em] text-muted-foreground">
                Favorites
              </p>
              <div className="mt-4 space-y-3">
                {favoriteWidgets.length === 0 ? (
                  <p className="text-xs text-muted-foreground">
                    No favorites yet.
                  </p>
                ) : (
                  favoriteWidgets.map((widget) => (
                    <button
                      key={widget.id}
                      type="button"
                      onClick={() => handleSelectWidget(widget)}
                      className="flex w-full items-center gap-3 rounded-lg px-2 py-1 text-left text-sm text-muted-foreground transition hover:text-foreground"
                    >
                      <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-muted/40 text-primary">
                        <Star className="h-4 w-4" />
                      </div>
                      <span className="truncate">{widget.name}</span>
                    </button>
                  ))
                )}
              </div>
            </div>
          </div>
        </aside>

        <section className="flex-1 space-y-6">
          <PageHeader
            title="Widget Library"
            description="Manage and reuse your custom interface components across all pages."
            actions={
              <div className="flex items-center gap-3">
                <Badge variant="secondary">{filteredWidgets.length} widgets</Badge>
                <div className="flex items-center rounded-lg border bg-background p-1 shadow-sm">
                  <Button
                    variant={view === "grid" ? "secondary" : "ghost"}
                    size="icon-sm"
                    onClick={() => setView("grid")}
                  >
                    <Grid2X2 className="h-4 w-4" />
                  </Button>
                  <Button
                    variant={view === "list" ? "secondary" : "ghost"}
                    size="icon-sm"
                    onClick={() => setView("list")}
                  >
                    <List className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            }
          />

          <div
            className={cn(
              "grid gap-6",
              view === "grid"
                ? "grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4"
                : "grid-cols-1"
            )}
          >
            {filteredWidgets.length === 0 ? (
              <div className="col-span-full rounded-xl border border-dashed bg-card p-10 text-center text-sm text-muted-foreground">
                No widgets match your search.
              </div>
            ) : (
              filteredWidgets.map((widget) => (
                <WidgetCard
                  key={widget.id}
                  name={widget.name}
                  categoryLabel={widget.categoryLabel}
                  preview={renderPreview(widget.preview)}
                  badge={widget.badge}
                  isFavorite={widget.isFavorite}
                  onFavoriteToggle={() => handleFavoriteToggle(widget.id)}
                  onInsert={widget.source === "core" ? () => handleInsertWidget(widget) : undefined}
                  onAction={
                    widget.source === "template"
                      ? () => handleEditTemplate(widget)
                      : undefined
                  }
                  actionLabel={widget.source === "template" ? "Edit" : "Insert"}
                  onSelect={() => handleSelectWidget(widget)}
                />
              ))
            )}
          </div>
        </section>
      </div>
      <WidgetDetailsDrawer
        widget={selectedWidget}
        preview={selectedWidget ? renderPreview(selectedWidget.preview) : undefined}
        open={detailsOpen}
        onOpenChange={setDetailsOpen}
        onInsert={
          selectedWidget?.source === "core"
            ? () => handleInsertWidget(selectedWidget)
            : undefined
        }
        onPrimaryAction={
          selectedWidget?.source === "template"
            ? () => handleEditTemplate(selectedWidget)
            : undefined
        }
        primaryActionLabel={
          selectedWidget?.source === "template" ? "Edit Template" : undefined
        }
      />
      <WidgetCreateDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        onCreate={handleCreateTemplate}
      />
      <WidgetInsertDialog
        open={insertOpen}
        onOpenChange={setInsertOpen}
        widget={insertWidget}
        preview={insertWidget ? renderPreview(insertWidget.preview) : undefined}
        pages={pages.map((page) => ({ id: page.id, title: page.title }))}
        onInsert={({ pageId }) => handleInsert({ pageId })}
      />
      {pagesError ? (
        <span className="sr-only" role="status">
          {pagesError}
        </span>
      ) : null}
      {templatesError ? (
        <span className="sr-only" role="status">
          {templatesError}
        </span>
      ) : null}
      {insertError ? (
        <span className="sr-only" role="status">
          {insertError}
        </span>
      ) : null}
    </AdminShell>
  );
}
