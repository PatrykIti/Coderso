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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";
import { getPage, listPages, updatePage, type PageSummary } from "@/services/pagesClient";
import { getUserSettings, setUserSetting } from "@/services/userSettingsClient";
import { listWidgetCatalog, type WidgetCatalogItem } from "@/services/widgetsClient";
import {
  createWidgetTemplate,
  getWidgetTemplate,
  updateWidgetTemplate,
} from "@/services/widgetTemplatesClient";
import {
  createWidgetTemplateCategory,
  deleteWidgetTemplateCategory,
  listWidgetTemplateCategories,
  updateWidgetTemplateCategory,
  type WidgetTemplateCategory,
} from "@/services/widgetTemplateCategoriesClient";
import { AdminShell } from "@/ui/layouts/AdminShell";
import { useAdminBasePath } from "@/ui/contexts/AdminBasePathContext";
import { PageHeader } from "@/ui/shared/PageHeader";
import { listRegisteredWidgets } from "@/ui/widgets/registry";
import { resolveAdminHref } from "@/utils/adminPaths";
import {
  getWidgetSlotKind,
  isSlotIdMatchingDefinition,
} from "../../../widgets/slots";
import {
  appendSlotBlock,
  createBlock,
  findBlockById,
  insertBlockAfterId,
} from "@/ui/pages/builder/blockUtils";
import type { Block } from "@/ui/pages/builder/types";

import { WidgetCard } from "./WidgetCard";
import { WidgetTemplateCategoryDrawer } from "./WidgetTemplateCategoryDrawer";
import { WidgetCreateDialog } from "./WidgetCreateDialog";
import { WidgetDetailsDrawer } from "./WidgetDetailsDrawer";
import { WidgetInsertDialog } from "./WidgetInsertDialog";
import { matchesTemplateCategory, normalizeCategoryValue } from "./widgetLibraryUtils";
import type { WidgetCategoryId, WidgetItem, WidgetSource } from "./types";

type LibraryScope = "all-items" | "favorites" | "templates" | "widgets";
type WidgetCategoryFilter = "all" | WidgetCategoryId;
type TemplateCategoryFilter = "all" | string;
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
  id: string;
  label: string;
  icon: LucideIcon;
};
type WidgetWithPreview = WidgetItem & { preview: WidgetPreview; source: WidgetSource };
const primaryCategories: CategoryItem[] = [
  { id: "all-items", label: "All Items", icon: LayoutGrid },
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

const widgetCategories: CategoryItem[] = [
  { id: "widgets-all", label: "All Widgets", icon: LayoutGrid },
  ...(
    Object.entries(categoryMeta) as [
      WidgetCategoryId,
      (typeof categoryMeta)[WidgetCategoryId],
    ][]
  ).map(([id, meta]) => ({
    id,
    label: meta.label,
    icon: meta.icon,
  })),
];

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
  const [activeScope, setActiveScope] = useState<LibraryScope>("all-items");
  const [widgetCategory, setWidgetCategory] =
    useState<WidgetCategoryFilter>("all");
  const [templateCategory, setTemplateCategory] =
    useState<TemplateCategoryFilter>("all");
  const [catalogItems, setCatalogItems] = useState<WidgetCatalogItem[]>([]);
  const [templateCategories, setTemplateCategories] = useState<
    WidgetTemplateCategory[]
  >([]);
  const [favoriteIds, setFavoriteIds] = useState<Set<string>>(new Set());
  const [favoritesError, setFavoritesError] = useState<string | null>(null);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  const [insertOpen, setInsertOpen] = useState(false);
  const [categoriesOpen, setCategoriesOpen] = useState(false);
  const [selectedWidget, setSelectedWidget] = useState<WidgetWithPreview | null>(
    null
  );
  const [insertWidget, setInsertWidget] = useState<WidgetWithPreview | null>(
    null
  );
  const [pages, setPages] = useState<PageSummary[]>([]);
  const [pagesError, setPagesError] = useState<string | null>(null);
  const [catalogError, setCatalogError] = useState<string | null>(null);
  const [categoriesError, setCategoriesError] = useState<string | null>(null);
  const [insertError, setInsertError] = useState<string | null>(null);
  const adminBasePath = useAdminBasePath();
  const templateCreateHref = resolveAdminHref(adminBasePath, "/admin/widgets/templates/new");
  const templateEditHref = (id: string) =>
    resolveAdminHref(adminBasePath, `/admin/widgets/templates/${id}`);

  const widgetDefinitions = useMemo(() => listRegisteredWidgets(), []);
  const widgetDefinitionMap = useMemo(
    () => new Map(widgetDefinitions.map((definition) => [definition.type, definition])),
    [widgetDefinitions]
  );

  const widgets = useMemo<WidgetWithPreview[]>(() => {
    return catalogItems.map((item) => {
      const categoryValue = item.category?.trim() ?? "";
      const categoryKey = categoryValue.toLowerCase() as WidgetCategoryId;
      const meta = categoryMeta[categoryKey];
      const categoryLabel =
        item.source === "core"
          ? meta?.label ?? categoryValue
          : categoryValue;
      return {
        id: item.id,
        name: item.name,
        category: categoryValue,
        categoryLabel,
        preview: meta?.preview ?? "hero",
        badge: item.source === "template" ? "Template" : undefined,
        source: item.source,
        description: item.description,
        status: item.status,
        isFavorite: favoriteIds.has(item.id),
      };
    }).map((item) => ({
      ...item,
    }));
  }, [catalogItems, favoriteIds]);

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
    getUserSettings()
      .then((settings) => {
        if (!active) return;
        const favorites = Array.isArray(settings["widgets.favorites"])
          ? settings["widgets.favorites"]
          : [];
        setFavoriteIds(new Set(favorites));
        setFavoritesError(null);
      })
      .catch(() => {
        if (!active) return;
        setFavoritesError("Failed to load favorites.");
      });
    return () => {
      active = false;
    };
  }, []);

  const reloadCatalog = async () => {
    try {
      const result = await listWidgetCatalog();
      setCatalogItems(result.items);
      setCatalogError(null);
    } catch {
      setCatalogError("Failed to load widget catalog.");
    }
  };

  const reloadCategories = async () => {
    try {
      const result = await listWidgetTemplateCategories();
      setTemplateCategories(result.items);
      setCategoriesError(null);
    } catch {
      setCategoriesError("Failed to load categories.");
    }
  };

  useEffect(() => {
    let active = true;
    listWidgetCatalog()
      .then((result) => {
        if (!active) return;
        setCatalogItems(result.items);
        setCatalogError(null);
      })
      .catch(() => {
        if (!active) return;
        setCatalogError("Failed to load widget catalog.");
      });
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    let active = true;
    listWidgetTemplateCategories()
      .then((result) => {
        if (!active) return;
        setTemplateCategories(result.items);
        setCategoriesError(null);
      })
      .catch(() => {
        if (!active) return;
        setCategoriesError("Failed to load categories.");
      });
    return () => {
      active = false;
    };
  }, []);

  const widgetCategoryCounts = useMemo(() => {
    const counts: Record<WidgetCategoryId, number> = {
      layout: 0,
      content: 0,
      forms: 0,
      navigation: 0,
      media: 0,
    };
    for (const widget of widgets) {
      if (widget.source !== "core") continue;
      if (widget.category in counts) {
        counts[widget.category as WidgetCategoryId] += 1;
      }
    }
    return counts;
  }, [widgets]);

  const scopeCounts = useMemo(
    () => ({
      allItems: widgets.length,
      favorites: widgets.filter((widget) => widget.isFavorite).length,
      templates: widgets.filter((widget) => widget.source === "template").length,
      widgets: widgets.filter((widget) => widget.source === "core").length,
    }),
    [widgets]
  );


  const filteredWidgets = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    const normalizedTemplateCategory =
      templateCategory === "all"
        ? "all"
        : normalizeCategoryValue(templateCategory);
    return widgets.filter((widget) => {
      const matchesQuery =
        normalized.length === 0 ||
        widget.name.toLowerCase().includes(normalized) ||
        widget.categoryLabel.toLowerCase().includes(normalized);

      const matchesCategory = (() => {
        if (activeScope === "all-items") return true;
        if (activeScope === "favorites") return widget.isFavorite;
        if (activeScope === "templates") {
          if (widget.source !== "template") return false;
          if (normalizedTemplateCategory === "all") return true;
          if (typeof widget.category !== "string") return false;
          return matchesTemplateCategory(widget.category, normalizedTemplateCategory);
        }
        if (activeScope === "widgets") {
          if (widget.source !== "core") return false;
          return widgetCategory === "all" || widget.category === widgetCategory;
        }
        return true;
      })();

      return matchesQuery && matchesCategory;
    });
  }, [widgets, query, activeScope, templateCategory, widgetCategory]);

  const templateCategoryOptions = useMemo(
    () => [
      { id: "all", value: "all", label: "All categories" },
      ...templateCategories.map((category) => {
        const name = category.name.trim();
        return {
          id: category.id,
          value: name,
          label: name,
        };
      }),
    ],
    [templateCategories]
  );

  const handleFavoriteToggle = async (id: string) => {
    setFavoritesError(null);
    const previous = new Set(favoriteIds);
    const next = new Set(previous);

    if (next.has(id)) {
      next.delete(id);
    } else {
      if (next.size >= 50) {
        setFavoritesError("Favorites limit reached.");
        return;
      }
      next.add(id);
    }

    setFavoriteIds(next);
    try {
      await setUserSetting("widgets.favorites", Array.from(next));
    } catch {
      setFavoriteIds(previous);
      setFavoritesError("Failed to save favorites.");
    }
  };

  const handleSelectScope = (scope: LibraryScope) => {
    setActiveScope(scope);
  };

  const handleSelectWidgetCategory = (category: WidgetCategoryFilter) => {
    setActiveScope("widgets");
    setWidgetCategory(category);
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

  const handleInsert = async (payload: {
    placement: "new" | "inside";
    targetType?: "page" | "template";
    targetId?: string | null;
    blockId?: string | null;
    slotId?: string | null;
  }) => {
    if (!insertWidget || insertWidget.source !== "core") return;
    const targetType = payload.targetType ?? "page";
    if (!payload.targetId) return;
    setInsertError(null);

    const getSlotBlocks = (block: Block, slot: string) => {
      const slots = block.slots;
      if (slots && typeof slots === "object" && !Array.isArray(slots)) {
        const value = slots[slot];
        return Array.isArray(value) ? (value as Block[]) : [];
      }
      if (slot === "default" && Array.isArray(block.children)) {
        return block.children as Block[];
      }
      return [];
    };

    const resolveNestSlot = (
      blocks: Block[],
      targetId?: string | null,
      slotId?: string | null
    ) => {
      if (!targetId) return null;
      const target = findBlockById(blocks, targetId);
      if (!target) return null;
      const definition = widgetDefinitionMap.get(target.type);
      if (!definition) return null;
      const slotDefinitions = definition.slots ?? [];
      if (slotDefinitions.length > 0) {
        const resolvedSlotId = slotId?.trim();
        if (!resolvedSlotId) return null;
        const slot = slotDefinitions.find((item) =>
          isSlotIdMatchingDefinition(item, resolvedSlotId)
        );
        if (!slot) return null;
        if (
          Array.isArray(slot.allowedTypes) &&
          slot.allowedTypes.length > 0 &&
          !slot.allowedTypes.includes(insertWidget.id)
        ) {
          return null;
        }
        if (getWidgetSlotKind(slot) === "fixed") {
          const count = getSlotBlocks(target, resolvedSlotId).length;
          if (typeof slot.maxItems === "number" && count >= slot.maxItems) {
            return null;
          }
        }
        return resolvedSlotId;
      }
      return definition.canHaveChildren ? "default" : null;
    };

    const insertBlock = (
      blocks: Block[],
      targetId?: string | null,
      slotId?: string | null
    ) => {
      const next = createBlock(insertWidget.id);
      if (!targetId) return [...blocks, next];
      const nestSlot = resolveNestSlot(blocks, targetId, slotId);
      if (nestSlot) {
        return appendSlotBlock(blocks, targetId, nestSlot, next);
      }
      return insertBlockAfterId(blocks, targetId, next);
    };

    try {
      if (payload.placement === "new") {
        const page = await getPage(payload.targetId);
        const currentData = (page.currentData ?? {}) as Record<string, unknown>;
        const blocks = Array.isArray(currentData.blocks)
          ? (currentData.blocks as Block[])
          : [];
        const nextBlocks = insertBlock(blocks);
        await updatePage(payload.targetId, {
          data: { ...currentData, blocks: nextBlocks },
        });
        return;
      }

      if (targetType === "template") {
        const template = await getWidgetTemplate(payload.targetId);
        const blocks = Array.isArray(template.blocks)
          ? (template.blocks as Block[])
          : [];
        const nextBlocks = insertBlock(blocks, payload.blockId, payload.slotId);
        await updateWidgetTemplate(payload.targetId, { blocks: nextBlocks });
        return;
      }

      const page = await getPage(payload.targetId);
      const currentData = (page.currentData ?? {}) as Record<string, unknown>;
      const blocks = Array.isArray(currentData.blocks)
        ? (currentData.blocks as Block[])
        : [];
      const nextBlocks = insertBlock(blocks, payload.blockId, payload.slotId);
      await updatePage(payload.targetId, {
        data: { ...currentData, blocks: nextBlocks },
      });
    } catch {
      setInsertError("Failed to insert widget.");
    }
  };

  const handleCreateCategory = async (name: string) => {
    await createWidgetTemplateCategory({ name });
    await reloadCategories();
    await reloadCatalog();
  };

  const handleUpdateCategory = async (id: string, name: string) => {
    const existing = templateCategories.find((category) => category.id === id);
    await updateWidgetTemplateCategory(id, { name });
    await reloadCategories();
    await reloadCatalog();
    if (existing && templateCategory === existing.name) {
      setTemplateCategory(name);
    }
  };

  const handleDeleteCategory = async (id: string) => {
    const existing = templateCategories.find((category) => category.id === id);
    await deleteWidgetTemplateCategory(id);
    await reloadCategories();
    await reloadCatalog();
    if (existing && templateCategory === existing.name) {
      setTemplateCategory("all");
    }
  };

  const handleCreateTemplate = async (payload: {
    name: string;
    description?: string | null;
    category: string;
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

  const templateList = useMemo(
    () =>
      catalogItems
        .filter((item) => item.source === "template")
        .map((item) => ({ id: item.id, name: item.name })),
    [catalogItems]
  );

  const showTemplateAction = activeScope === "templates";
  const showWidgetAction = activeScope === "widgets";
  return (
    <AdminShell
      activeHref="/admin/widgets"
      contentClassName="px-6 py-8 overflow-hidden"
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
            placeholder="Search items..."
            className="pl-9"
          />
        </div>
      }
    >
      <div className="mx-auto flex h-full min-h-0 w-full max-w-7xl flex-col">
        <PageHeader
          title="Widget Library"
          description="Manage and reuse your custom interface components across all pages."
        />
        <Separator className="my-6" />
        <div className="flex min-h-0 flex-1 flex-col gap-6 lg:flex-row">
          <aside className="flex w-full min-h-0 flex-col lg:w-72">
            <div className="flex min-h-0 flex-1 flex-col rounded-2xl border border-border/60 bg-card px-4 py-5 shadow-sm">
              <div className="flex items-center justify-between">
                <p className="text-xs font-semibold uppercase tracking-[0.25em] text-muted-foreground">
                  Library
                </p>
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="text-[10px]">
                    {scopeCounts.allItems}
                  </Badge>
                  <Button
                    size="xs"
                    variant="ghost"
                    onClick={() => setCategoriesOpen(true)}
                  >
                    Categories
                  </Button>
                </div>
              </div>
              <Separator className="my-4" />
              <ScrollArea className="flex-1 min-h-0 pr-2">
                <div className="space-y-4">
                  <div className="space-y-2">
                    <p className="text-xs font-semibold uppercase tracking-[0.25em] text-muted-foreground">
                      Items
                    </p>
                    {primaryCategories.map((category) => {
                      const isActive = activeScope === category.id;
                      const count =
                        category.id === "all-items"
                          ? scopeCounts.allItems
                          : category.id === "favorites"
                            ? scopeCounts.favorites
                            : scopeCounts.templates;

                      return (
                        <button
                          key={category.id}
                          type="button"
                          onClick={() => handleSelectScope(category.id as LibraryScope)}
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
                      );
                    })}
                  </div>
                  <Separator />
                  <div className="space-y-2">
                    <p className="text-xs font-semibold uppercase tracking-[0.25em] text-muted-foreground">
                      Widgets
                    </p>
                    {widgetCategories.map((category) => {
                      const isAllWidgets = category.id === "widgets-all";
                      const isActive = isAllWidgets
                        ? activeScope === "widgets" && widgetCategory === "all"
                        : activeScope === "widgets" &&
                          widgetCategory === category.id;
                      const count = isAllWidgets
                        ? scopeCounts.widgets
                        : widgetCategoryCounts[category.id as WidgetCategoryId] ??
                          0;

                      return (
                        <button
                          key={category.id}
                          type="button"
                          onClick={() =>
                            handleSelectWidgetCategory(
                              isAllWidgets
                                ? "all"
                                : (category.id as WidgetCategoryId)
                            )
                          }
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
                      );
                    })}
                  </div>
                  <Separator />
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
                      {favoritesError ? (
                        <p className="text-xs text-destructive">
                          {favoritesError}
                        </p>
                      ) : null}
                    </div>
                  </div>
                </div>
              </ScrollArea>
            </div>
          </aside>

          <section className="flex min-h-0 flex-1 flex-col gap-4 overflow-hidden">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div className="flex flex-wrap items-center gap-3">
                <Badge variant="secondary">
                  {filteredWidgets.length}{" "}
                  {activeScope === "widgets"
                    ? "widgets"
                    : activeScope === "templates"
                      ? "templates"
                      : "items"}
                </Badge>
                {activeScope === "templates" ? (
                  <Select
                    value={templateCategory}
                    onValueChange={setTemplateCategory}
                  >
                    <SelectTrigger className="h-9 w-[180px] text-xs">
                      <SelectValue placeholder="All categories" />
                    </SelectTrigger>
                    <SelectContent>
                      {templateCategoryOptions.map((category) => (
                        <SelectItem key={category.id} value={category.value}>
                          {category.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                ) : null}
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
              <div className="flex items-center gap-2">
                {showTemplateAction ? (
                  <Button size="sm" variant="outline" className="gap-2" asChild>
                    <a href={templateCreateHref}>
                      <Plus className="h-4 w-4" />
                      New Template
                    </a>
                  </Button>
                ) : null}
                {showWidgetAction ? (
                  <Button
                    size="sm"
                    className="gap-2"
                    onClick={() => setCreateOpen(true)}
                  >
                    <Plus className="h-4 w-4" />
                    Create Widget
                  </Button>
                ) : null}
              </div>
            </div>
            <ScrollArea className="flex-1 min-h-0 pr-2">
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
                    No items match your search.
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
                      onInsert={
                        widget.source === "core"
                          ? () => handleInsertWidget(widget)
                          : undefined
                      }
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
            </ScrollArea>
          </section>
        </div>
      </div>
      <WidgetDetailsDrawer
        widget={selectedWidget}
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
        categories={templateCategories}
        onCreate={handleCreateTemplate}
      />
      <WidgetTemplateCategoryDrawer
        open={categoriesOpen}
        onOpenChange={setCategoriesOpen}
        categories={templateCategories}
        onCreate={handleCreateCategory}
        onUpdate={handleUpdateCategory}
        onDelete={handleDeleteCategory}
        error={categoriesError}
      />
      <WidgetInsertDialog
        open={insertOpen}
        onOpenChange={setInsertOpen}
        widget={insertWidget}
        preview={insertWidget ? renderPreview(insertWidget.preview) : undefined}
        pages={pages.map((page) => ({ id: page.id, title: page.title }))}
        templates={templateList}
        onInsert={(payload) => handleInsert(payload)}
      />
      {pagesError ? (
        <span className="sr-only" role="status">
          {pagesError}
        </span>
      ) : null}
      {catalogError ? (
        <span className="sr-only" role="status">
          {catalogError}
        </span>
      ) : null}
      {categoriesError ? (
        <span className="sr-only" role="status">
          {categoriesError}
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
