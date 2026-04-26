import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { LucideIcon } from "lucide-react";
import {
  Columns,
  Copy,
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
  Trash2,
} from "lucide-react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";
import { cacheKeys } from "@/services/cachePolicy";
import { getCachedPages, getPageCached, listPagesCached, updatePage, type PageSummary } from "@/services/pagesClient";
import { getUserSettings, setUserSetting } from "@/services/userSettingsClient";
import { getCachedWidgetCatalog, listWidgetCatalogCached, type WidgetCatalogItem } from "@/services/widgetsClient";
import {
  deleteWidgetTemplate,
  duplicateWidgetTemplate,
  getWidgetTemplateCached,
  updateWidgetTemplate,
} from "@/services/widgetTemplatesClient";
import {
  createWidgetTemplateCategory,
  deleteWidgetTemplateCategory,
  getCachedWidgetTemplateCategories,
  listWidgetTemplateCategoriesCached,
  updateWidgetTemplateCategory,
  type WidgetTemplateCategory,
} from "@/services/widgetTemplateCategoriesClient";
import { AdminShell } from "@/ui/layouts/AdminShell";
import { useAdminRouter } from "@/ui/contexts/AdminRouterContext";
import { useAdminBasePath } from "@/ui/contexts/AdminBasePathContext";
import { ConfirmActionDialog } from "@/ui/shared/ConfirmActionDialog";
import { PageHeader } from "@/ui/shared/PageHeader";
import { AdminLink } from "@/ui/shared/AdminLink";
import { resolveAdminActionErrorMessage } from "@/ui/shared/actionToasts";
import { listRegisteredWidgetLibraryWidgets } from "@/ui/widgets/registry";
import { resolveAdminHref } from "@/utils/adminPaths";
import { subscribeCacheEvents } from "@/utils/cacheBus";
import {
  getWidgetSlotKind,
  isSlotIdMatchingDefinition,
} from "../../../widgets/slots";
import { listModulePackStatus } from "../../../widgets/registry";
import {
  appendSlotBlock,
  createBlock,
  findBlockById,
  insertBlockAfterId,
} from "@/ui/pages/builder/blockUtils";
import type { Block } from "@/ui/pages/builder/types";

import { WidgetCard } from "./WidgetCard";
import { WidgetCatalogFilters } from "./WidgetCatalogFilters";
import { WidgetTemplateCategoryDrawer } from "./WidgetTemplateCategoryDrawer";
import { WidgetDetailsDrawer } from "./WidgetDetailsDrawer";
import { WidgetInsertDialog } from "./WidgetInsertDialog";
import {
  buildWidgetModuleOptions,
  countWidgetLibraryWidgets,
  countWidgetLibraryWidgetsByCategory,
  filterWidgetLibraryItems,
  normalizeCategoryValue,
} from "./widgetLibraryUtils";
import { widgetCategoryLabels, widgetCategoryOrder } from "./widgetCategoryMeta";
import type {
  WidgetCategoryId,
  WidgetComplexity,
  WidgetItem,
  WidgetLibraryTab,
  WidgetSource,
} from "./types";

type LibraryScope = "all-items" | "favorites" | "templates" | "widgets";
type WidgetCategoryFilter = "all" | WidgetCategoryId;
type WidgetComplexityFilter = "all" | WidgetComplexity;
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

const formatModuleBadgeLabel = (value: string) =>
  value
    .split("-")
    .filter(Boolean)
    .map((segment) => segment.charAt(0).toUpperCase() + segment.slice(1))
    .join(" ");

const primaryCategories: CategoryItem[] = [
  { id: "all-items", label: "All Items", icon: LayoutGrid },
  { id: "favorites", label: "Favorites", icon: Star },
  { id: "templates", label: "Templates", icon: LayoutGrid },
];

const categoryMeta: Record<
  WidgetCategoryId,
  { label: string; icon: LucideIcon; preview: WidgetPreview }
> = {
  layout: { label: widgetCategoryLabels.layout, icon: GalleryVerticalEnd, preview: "hero" },
  content: { label: widgetCategoryLabels.content, icon: Columns, preview: "grid" },
  forms: { label: widgetCategoryLabels.forms, icon: FileText, preview: "form" },
  navigation: { label: widgetCategoryLabels.navigation, icon: List, preview: "banner" },
  media: { label: widgetCategoryLabels.media, icon: ImageIcon, preview: "media" },
};

const widgetCategories: CategoryItem[] = [
  { id: "widgets-all", label: "All Widgets", icon: LayoutGrid },
  ...widgetCategoryOrder.map((id) => ({
    id,
    label: categoryMeta[id].label,
    icon: categoryMeta[id].icon,
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
  const initialCatalog = getCachedWidgetCatalog();
  const initialCategories = getCachedWidgetTemplateCategories();
  const initialPages = getCachedPages();
  const hasHydratedRef = useRef({
    catalog: Boolean(initialCatalog),
    categories: Boolean(initialCategories),
    pages: Boolean(initialPages),
  });
  const [query, setQuery] = useState("");
  const [view, setView] = useState<WidgetView>("grid");
  const [activeScope, setActiveScope] = useState<LibraryScope>("widgets");
  const [widgetTab, setWidgetTab] = useState<WidgetLibraryTab>("all");
  const [advancedMode, setAdvancedMode] = useState(false);
  const [widgetCategory, setWidgetCategory] =
    useState<WidgetCategoryFilter>("all");
  const [widgetComplexity, setWidgetComplexity] =
    useState<WidgetComplexityFilter>("all");
  const [widgetModule, setWidgetModule] = useState("all");
  const [templateCategory, setTemplateCategory] =
    useState<TemplateCategoryFilter>("all");
  const [catalogItems, setCatalogItems] = useState<WidgetCatalogItem[]>(() => initialCatalog ?? []);
  const [templateCategories, setTemplateCategories] = useState<
    WidgetTemplateCategory[]
  >(() => initialCategories ?? []);
  const [favoriteIds, setFavoriteIds] = useState<Set<string>>(new Set());
  const [favoritesError, setFavoritesError] = useState<string | null>(null);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [insertOpen, setInsertOpen] = useState(false);
  const [categoriesOpen, setCategoriesOpen] = useState(false);
  const [selectedWidget, setSelectedWidget] = useState<WidgetWithPreview | null>(
    null
  );
  const [insertWidget, setInsertWidget] = useState<WidgetWithPreview | null>(
    null
  );
  const [pages, setPages] = useState<PageSummary[]>(() => initialPages ?? []);
  const [pagesError, setPagesError] = useState<string | null>(null);
  const [catalogError, setCatalogError] = useState<string | null>(null);
  const [categoriesError, setCategoriesError] = useState<string | null>(null);
  const [insertError, setInsertError] = useState<string | null>(null);
  const [selectedTemplateIds, setSelectedTemplateIds] = useState<Set<string>>(
    new Set()
  );
  const [templateDeleteTarget, setTemplateDeleteTarget] = useState<{
    ids: string[];
    label: string;
  } | null>(null);
  const [templateActionError, setTemplateActionError] = useState<string | null>(null);
  const [isTemplateActionWorking, setIsTemplateActionWorking] = useState(false);
  const adminBasePath = useAdminBasePath();
  const { navigate } = useAdminRouter();
  const templateCreateHref = resolveAdminHref(adminBasePath, "/admin/widgets/templates/new");
  const templateEditHref = (id: string) =>
    resolveAdminHref(adminBasePath, `/admin/widgets/templates/${id}`);

  const widgetDefinitions = useMemo(() => listRegisteredWidgetLibraryWidgets(), []);
  const widgetDefinitionMap = useMemo(
    () => new Map(widgetDefinitions.map((definition) => [definition.type, definition])),
    [widgetDefinitions]
  );
  const modulePackStatuses = useMemo(
    () => listModulePackStatus(widgetDefinitions),
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
        complexity: item.complexity,
        audience: item.audience,
        module: item.module,
        presets: item.presets,
        requires: item.requires,
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

  const refreshPages = useCallback(
    async (options?: { force?: boolean; background?: boolean }) => {
      const force = options?.force ?? false;
      const background = options?.background ?? hasHydratedRef.current.pages;
      if (!background) {
        setPagesError(null);
      }
      try {
        const result = await listPagesCached({ force });
        setPages(result);
        setPagesError(null);
        hasHydratedRef.current.pages = true;
      } catch {
        if (!background) {
          setPagesError("Failed to load pages.");
        }
      }
    },
    []
  );

  useEffect(() => {
    let active = true;
    Promise.resolve().then(() => {
      if (!active) return;
      refreshPages({ force: true, background: true }).catch(() => undefined);
    });
    return () => {
      active = false;
    };
  }, [refreshPages]);

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

  const refreshCatalog = useCallback(
    async (options?: { force?: boolean; background?: boolean }) => {
      const force = options?.force ?? false;
      const background = options?.background ?? hasHydratedRef.current.catalog;
      if (!background) {
        setCatalogError(null);
      }
      try {
        const result = await listWidgetCatalogCached({ force });
        setCatalogItems(result);
        setCatalogError(null);
        hasHydratedRef.current.catalog = true;
      } catch {
        if (!background) {
          setCatalogError("Failed to load widget catalog.");
        }
      }
    },
    []
  );

  const refreshCategories = useCallback(
    async (options?: { force?: boolean; background?: boolean }) => {
      const force = options?.force ?? false;
      const background = options?.background ?? hasHydratedRef.current.categories;
      if (!background) {
        setCategoriesError(null);
      }
      try {
        const result = await listWidgetTemplateCategoriesCached({ force });
        setTemplateCategories(result);
        setCategoriesError(null);
        hasHydratedRef.current.categories = true;
      } catch {
        if (!background) {
          setCategoriesError("Failed to load categories.");
        }
      }
    },
    []
  );

  const reloadCatalog = async () => {
    await refreshCatalog({ force: true, background: false });
  };

  const reloadCategories = async () => {
    await refreshCategories({ force: true, background: false });
  };

  useEffect(() => {
    let active = true;
    Promise.resolve().then(() => {
      if (!active) return;
      refreshCatalog({ force: true, background: true }).catch(() => undefined);
    });
    return () => {
      active = false;
    };
  }, [refreshCatalog]);

  useEffect(() => {
    let active = true;
    Promise.resolve().then(() => {
      if (!active) return;
      refreshCategories({ force: true, background: true }).catch(() => undefined);
    });
    return () => {
      active = false;
    };
  }, [refreshCategories]);

  useEffect(() => {
    return subscribeCacheEvents((event) => {
      if (event.key === cacheKeys.widgetCatalogList) {
        refreshCatalog({ force: true, background: true }).catch(() => undefined);
      }
      if (event.key === cacheKeys.widgetTemplateCategoriesList) {
        refreshCategories({ force: true, background: true }).catch(() => undefined);
      }
      if (event.key === cacheKeys.pagesList) {
        refreshPages({ force: true, background: true }).catch(() => undefined);
      }
    });
  }, [refreshCatalog, refreshCategories, refreshPages]);
  const widgetScopeCount = useMemo(
    () =>
      countWidgetLibraryWidgets(widgets, {
        query,
        widgetTab,
        widgetModule,
        widgetComplexity,
      }),
    [widgets, query, widgetTab, widgetModule, widgetComplexity]
  );
  const widgetCategoryCounts = useMemo(
    () =>
      countWidgetLibraryWidgetsByCategory(widgets, {
        query,
        widgetTab,
        widgetModule,
        widgetComplexity,
      }),
    [widgets, query, widgetTab, widgetModule, widgetComplexity]
  );

  const scopeCounts = useMemo(
    () => ({
      allItems: widgets.length,
      favorites: widgets.filter((widget) => widget.isFavorite).length,
      templates: widgets.filter((widget) => widget.source === "template").length,
      widgets: widgets.filter((widget) => widget.source === "core").length,
    }),
    [widgets]
  );

  const widgetTabCounts = useMemo(() => {
    return {
      recommended: filterWidgetLibraryItems(widgets, {
        query,
        activeScope: "widgets",
        templateCategory: "all",
        widgetCategory,
        widgetTab: "recommended",
        widgetModule,
        widgetComplexity,
      }).length,
      all: filterWidgetLibraryItems(widgets, {
        query,
        activeScope: "widgets",
        templateCategory: "all",
        widgetCategory,
        widgetTab: "all",
        widgetModule,
        widgetComplexity,
      }).length,
    };
  }, [widgets, query, widgetCategory, widgetComplexity, widgetModule]);

  const widgetModuleOptions = useMemo(() => {
    const modules = new Set<string>();
    for (const widget of widgets) {
      if (widget.source !== "core") continue;
      modules.add(widget.module);
    }
    return buildWidgetModuleOptions(modules, modulePackStatuses);
  }, [modulePackStatuses, widgets]);


  const filteredWidgets = useMemo(
    () =>
      filterWidgetLibraryItems(widgets, {
        query,
        activeScope,
        templateCategory:
          templateCategory === "all"
            ? "all"
            : normalizeCategoryValue(templateCategory),
        widgetCategory,
        widgetTab,
        widgetModule,
        widgetComplexity,
      }),
    [
    widgets,
    query,
    activeScope,
    templateCategory,
    widgetCategory,
    widgetTab,
    widgetModule,
    widgetComplexity,
    ]
  );

  const visibleTemplateWidgets = useMemo(
    () => filteredWidgets.filter((widget) => widget.source === "template"),
    [filteredWidgets]
  );
  const visibleTemplateIds = useMemo(
    () => visibleTemplateWidgets.map((widget) => widget.id),
    [visibleTemplateWidgets]
  );
  const allVisibleTemplatesSelected =
    visibleTemplateIds.length > 0 &&
    visibleTemplateIds.every((id) => selectedTemplateIds.has(id));

  useEffect(() => {
    setSelectedTemplateIds((previous) => {
      const visible = new Set(visibleTemplateIds);
      const next = new Set([...previous].filter((id) => visible.has(id)));
      const same =
        next.size === previous.size &&
        [...next].every((id) => previous.has(id));
      return same ? previous : next;
    });
  }, [visibleTemplateIds]);

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
        toast.error("Favorites limit reached.");
        return;
      }
      next.add(id);
    }

    setFavoriteIds(next);
    try {
      await setUserSetting("widgets.favorites", Array.from(next));
      toast.success(next.has(id) ? "Added to favorites." : "Removed from favorites.");
    } catch {
      setFavoriteIds(previous);
      setFavoritesError("Failed to save favorites.");
      toast.error("Failed to save favorites.");
    }
  };

  const handleSelectScope = (scope: LibraryScope) => {
    setActiveScope(scope);
  };

  const handleSelectWidgetCategory = (category: WidgetCategoryFilter) => {
    setActiveScope("widgets");
    setWidgetCategory(category);
  };

  const handleWidgetTabChange = (value: WidgetLibraryTab) => {
    setWidgetTab(value);
    setActiveScope("widgets");
  };

  const handleAdvancedModeChange = (enabled: boolean) => {
    setAdvancedMode(enabled);
    if (!enabled && widgetComplexity === "atomic") {
      setWidgetComplexity("all");
    }
  };

  const handleSelectWidget = (widget: WidgetWithPreview) => {
    setSelectedWidget(widget);
    setDetailsOpen(true);
  };

  const handleInsertWidget = (widget: WidgetWithPreview | null) => {
    if (!widget) return;
    setInsertError(null);
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
    if (!insertWidget || insertWidget.source !== "core") {
      throw new Error("Select a widget before inserting.");
    }
    const targetType = payload.targetType ?? "page";
    if (!payload.targetId) {
      throw new Error("Select a target before inserting.");
    }
    setInsertError(null);

    const notifyInserted = (targetLabel: string, href: string) => {
      toast.success(`${insertWidget.name} inserted into ${targetLabel}.`, {
        action: {
          label: "Open editor",
          onClick: () => navigate(href),
        },
      });
    };

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
        const page = await getPageCached(payload.targetId, { force: true });
        const currentData = (page.currentData ?? {}) as Record<string, unknown>;
        const blocks = Array.isArray(currentData.blocks)
          ? (currentData.blocks as Block[])
          : [];
        const nextBlocks = insertBlock(blocks);
        await updatePage(payload.targetId, {
          data: { ...currentData, blocks: nextBlocks },
        });
        notifyInserted(page.title, `/pages/${encodeURIComponent(payload.targetId)}`);
        return;
      }

      if (targetType === "template") {
        const template = await getWidgetTemplateCached(payload.targetId, { force: true });
        const blocks = Array.isArray(template.blocks)
          ? (template.blocks as Block[])
          : [];
        const nextBlocks = insertBlock(blocks, payload.blockId, payload.slotId);
        await updateWidgetTemplate(payload.targetId, { blocks: nextBlocks });
        notifyInserted(
          template.name,
          `/widgets/templates/${encodeURIComponent(payload.targetId)}`
        );
        return;
      }

      const page = await getPageCached(payload.targetId, { force: true });
      const currentData = (page.currentData ?? {}) as Record<string, unknown>;
      const blocks = Array.isArray(currentData.blocks)
        ? (currentData.blocks as Block[])
        : [];
      const nextBlocks = insertBlock(blocks, payload.blockId, payload.slotId);
      await updatePage(payload.targetId, {
        data: { ...currentData, blocks: nextBlocks },
      });
      notifyInserted(page.title, `/pages/${encodeURIComponent(payload.targetId)}`);
    } catch (err) {
      const message = resolveAdminActionErrorMessage(
        err,
        "Failed to insert widget."
      );
      setInsertError(message);
      toast.error(message);
      throw new Error(message);
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

  const handleEditTemplate = (widget: WidgetWithPreview | null) => {
    if (!widget || widget.source !== "template") return;
    navigate(templateEditHref(widget.id));
  };

  const toggleTemplateSelection = (id: string, checked: boolean) => {
    setSelectedTemplateIds((previous) => {
      const next = new Set(previous);
      if (checked) {
        next.add(id);
      } else {
        next.delete(id);
      }
      return next;
    });
  };

  const toggleAllVisibleTemplates = (checked: boolean) => {
    setSelectedTemplateIds(
      checked ? new Set(visibleTemplateIds) : new Set()
    );
  };

  const handleDuplicateTemplate = async (widget: WidgetWithPreview) => {
    if (widget.source !== "template") return;
    setTemplateActionError(null);
    setIsTemplateActionWorking(true);
    try {
      const duplicated = await duplicateWidgetTemplate(widget.id);
      toast.success(`Template ${duplicated.name} duplicated.`);
      await reloadCatalog();
    } catch (err) {
      const message = resolveAdminActionErrorMessage(
        err,
        "Failed to duplicate template."
      );
      setTemplateActionError(message);
      toast.error(message);
    } finally {
      setIsTemplateActionWorking(false);
    }
  };

  const handleConfirmDeleteTemplates = async () => {
    if (!templateDeleteTarget) return;
    setTemplateActionError(null);
    setIsTemplateActionWorking(true);
    const failed: string[] = [];
    for (const id of templateDeleteTarget.ids) {
      try {
        await deleteWidgetTemplate(id);
      } catch {
        failed.push(id);
      }
    }
    const deletedCount = templateDeleteTarget.ids.length - failed.length;
    if (deletedCount > 0) {
      toast.success(
        deletedCount === 1
          ? "Template deleted."
          : `${deletedCount} templates deleted.`
      );
    }
    if (failed.length > 0) {
      const message =
        failed.length === 1
          ? "Failed to delete 1 template."
          : `Failed to delete ${failed.length} templates.`;
      setTemplateActionError(message);
      toast.error(message);
    }
    setSelectedTemplateIds((previous) => {
      const deletedIds = new Set(templateDeleteTarget.ids.filter((id) => !failed.includes(id)));
      return new Set([...previous].filter((id) => !deletedIds.has(id)));
    });
    setTemplateDeleteTarget(null);
    try {
      await reloadCatalog();
    } finally {
      setIsTemplateActionWorking(false);
    }
  };

  const templateList = useMemo(
    () =>
      catalogItems
        .filter((item) => item.source === "template")
        .map((item) => ({ id: item.id, name: item.name })),
    [catalogItems]
  );

  const showTemplateAction = activeScope === "templates";
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
                        ? widgetScopeCount
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
                    {favoritesError ? (
                      <p className="text-xs text-destructive">{favoritesError}</p>
                    ) : null}
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
                {activeScope === "widgets" ? (
                  <WidgetCatalogFilters
                    tab={widgetTab}
                    onTabChange={handleWidgetTabChange}
                    recommendedCount={widgetTabCounts.recommended}
                    allCount={widgetTabCounts.all}
                    advancedMode={advancedMode}
                    onAdvancedModeChange={handleAdvancedModeChange}
                    moduleFilter={widgetModule}
                    onModuleFilterChange={setWidgetModule}
                    moduleOptions={widgetModuleOptions}
                    complexityFilter={widgetComplexity}
                    onComplexityFilterChange={setWidgetComplexity}
                  />
                ) : null}
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
                    aria-label="Show widgets as grid"
                    aria-pressed={view === "grid"}
                    title="Grid view"
                  >
                    <Grid2X2 className="h-4 w-4" />
                  </Button>
                  <Button
                    variant={view === "list" ? "secondary" : "ghost"}
                    size="icon-sm"
                    onClick={() => setView("list")}
                    aria-label="Show widgets as list"
                    aria-pressed={view === "list"}
                    title="List view"
                  >
                    <List className="h-4 w-4" />
                  </Button>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {showTemplateAction ? (
                  selectedTemplateIds.size > 0 ? (
                    <Button
                      size="sm"
                      variant="destructive"
                      className="gap-2"
                      onClick={() =>
                        setTemplateDeleteTarget({
                          ids: Array.from(selectedTemplateIds),
                          label: `${selectedTemplateIds.size} selected templates`,
                        })
                      }
                      disabled={isTemplateActionWorking}
                    >
                      <Trash2 className="h-4 w-4" />
                      Delete selected
                    </Button>
                  ) : null
                ) : null}
                {showTemplateAction ? (
                  <Button size="sm" className="gap-2" asChild>
                    <AdminLink href={templateCreateHref}>
                      <Plus className="h-4 w-4" />
                      New Template
                    </AdminLink>
                  </Button>
                ) : null}
              </div>
            </div>
            <ScrollArea className="flex-1 min-h-0 pr-2">
              {activeScope === "templates" ? (
                <div className="space-y-3">
                  {templateActionError ? (
                    <div className="rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
                      {templateActionError}
                    </div>
                  ) : null}
                  {visibleTemplateWidgets.length === 0 ? (
                    <div className="rounded-xl border border-dashed bg-card p-10 text-center text-sm text-muted-foreground">
                      No templates match your search.
                    </div>
                  ) : (
                    <div className="overflow-x-auto rounded-xl border bg-card shadow-sm">
                      <div className="min-w-[760px]">
                        <div className="grid grid-cols-[2.5rem_1.4fr_1fr_0.7fr_16rem] items-center gap-3 border-b bg-muted/30 px-4 py-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                          <label className="flex items-center justify-center">
                            <input
                              type="checkbox"
                              aria-label="Select all visible templates"
                              checked={allVisibleTemplatesSelected}
                              onChange={(event) =>
                                toggleAllVisibleTemplates(event.target.checked)
                              }
                            />
                          </label>
                          <span>Name</span>
                          <span>Category</span>
                          <span>Status</span>
                          <span className="text-right">Actions</span>
                        </div>
                        {visibleTemplateWidgets.map((widget) => (
                          <div
                            key={widget.id}
                            className="grid grid-cols-[2.5rem_1.4fr_1fr_0.7fr_16rem] items-center gap-3 border-b px-4 py-3 last:border-b-0"
                          >
                            <label className="flex items-center justify-center">
                              <input
                                type="checkbox"
                                aria-label={`Select ${widget.name}`}
                                checked={selectedTemplateIds.has(widget.id)}
                                onChange={(event) =>
                                  toggleTemplateSelection(
                                    widget.id,
                                    event.target.checked
                                  )
                                }
                              />
                            </label>
                            <div className="min-w-0">
                              <button
                                type="button"
                                className="truncate text-left text-sm font-semibold text-foreground hover:text-primary"
                                onClick={() => handleEditTemplate(widget)}
                              >
                                {widget.name}
                              </button>
                              {widget.description ? (
                                <p className="truncate text-xs text-muted-foreground">
                                  {widget.description}
                                </p>
                              ) : null}
                            </div>
                            <span className="truncate text-sm text-muted-foreground">
                              {widget.categoryLabel}
                            </span>
                            <Badge
                              variant={
                                widget.status === "published" ? "default" : "outline"
                              }
                            >
                              {widget.status ?? "draft"}
                            </Badge>
                            <div className="flex justify-end gap-2">
                              <Button
                                type="button"
                                variant="outline"
                                size="xs"
                                onClick={() => handleEditTemplate(widget)}
                              >
                                Edit
                              </Button>
                              <Button
                                type="button"
                                variant="outline"
                                size="xs"
                                className="gap-1"
                                onClick={() => void handleDuplicateTemplate(widget)}
                                disabled={isTemplateActionWorking}
                              >
                                <Copy className="h-3.5 w-3.5" />
                                Duplicate
                              </Button>
                              <Button
                                type="button"
                                variant="destructive"
                                size="xs"
                                className="gap-1"
                                onClick={() =>
                                  setTemplateDeleteTarget({
                                    ids: [widget.id],
                                    label: widget.name,
                                  })
                                }
                                disabled={isTemplateActionWorking}
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                                Delete
                              </Button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ) : (
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
                        metaBadges={
                          widget.source === "core"
                            ? [widget.complexity, formatModuleBadgeLabel(widget.module)]
                            : undefined
                        }
                        isFavorite={widget.isFavorite}
                        onFavoriteToggle={() => handleFavoriteToggle(widget.id)}
                        onAction={
                          widget.source === "template"
                            ? () => handleEditTemplate(widget)
                            : () => handleSelectWidget(widget)
                        }
                        actionLabel={widget.source === "template" ? "Edit" : "Configure"}
                        onSelect={() => handleSelectWidget(widget)}
                      />
                    ))
                  )}
                </div>
              )}
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
        error={insertError}
        onInsert={(payload) => handleInsert(payload)}
      />
      <ConfirmActionDialog
        open={Boolean(templateDeleteTarget)}
        onOpenChange={(open) => {
          if (!open) setTemplateDeleteTarget(null);
        }}
        title="Delete template"
        description={
          templateDeleteTarget
            ? `Delete ${templateDeleteTarget.label}? This cannot be undone.`
            : "Delete template?"
        }
        confirmLabel="Delete"
        confirmingLabel="Deleting..."
        isConfirming={isTemplateActionWorking}
        onConfirm={handleConfirmDeleteTemplates}
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
