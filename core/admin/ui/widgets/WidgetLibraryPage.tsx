import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Grid2X2,
  Play,
  Plus,
  Search,
  Star,
  Table2,
  Trash2,
  X,
} from "lucide-react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
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
import { ListPaginationFooter } from "@/ui/shared/ListPaginationFooter";
import { PageHeader } from "@/ui/shared/PageHeader";
import { AdminLink } from "@/ui/shared/AdminLink";
import { resolveAdminActionErrorMessage } from "@/ui/shared/actionToasts";
import { useListPagination } from "@/ui/shared/useListPagination";
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
import { WidgetLibraryRowActions } from "./WidgetLibraryRowActions";
import { WidgetLibraryTable } from "./WidgetLibraryTable";
import { WidgetTemplateCategoryDrawer } from "./WidgetTemplateCategoryDrawer";
import { WidgetDetailsDrawer } from "./WidgetDetailsDrawer";
import { WidgetInsertDialog } from "./WidgetInsertDialog";
import {
  buildWidgetModuleOptions,
  countWidgetLibrarySections,
  filterWidgetLibraryItems,
  filterWidgetLibraryItemsBySection,
  normalizeCategoryValue,
  normalizeWidgetLibrarySection,
  trimWidgetLibrarySelection,
  type WidgetLibrarySection,
} from "./widgetLibraryUtils";
import { widgetCategoryLabels, widgetCategoryOrder } from "./widgetCategoryMeta";
import type {
  WidgetCategoryId,
  WidgetComplexity,
  WidgetItem,
  WidgetLibraryTab,
  WidgetSource,
} from "./types";

type WidgetCategoryFilter = "all" | WidgetCategoryId;
type WidgetComplexityFilter = "all" | WidgetComplexity;
type TemplateCategoryFilter = "all" | string;
type WidgetView = "grid" | "table";
type WidgetPreview =
  | "hero"
  | "grid"
  | "form"
  | "media"
  | "video"
  | "text"
  | "pricing"
  | "banner";

type WidgetWithPreview = WidgetItem & { preview: WidgetPreview; source: WidgetSource };

const formatModuleBadgeLabel = (value: string) =>
  value
    .split("-")
    .filter(Boolean)
    .map((segment) => segment.charAt(0).toUpperCase() + segment.slice(1))
    .join(" ");

const categoryMeta: Record<
  WidgetCategoryId,
  { label: string; preview: WidgetPreview }
> = {
  layout: { label: widgetCategoryLabels.layout, preview: "hero" },
  content: { label: widgetCategoryLabels.content, preview: "grid" },
  forms: { label: widgetCategoryLabels.forms, preview: "form" },
  navigation: { label: widgetCategoryLabels.navigation, preview: "banner" },
  media: { label: widgetCategoryLabels.media, preview: "media" },
};

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
  const [view, setView] = useState<WidgetView>("table");
  const [section, setSection] = useState<WidgetLibrarySection>("all-items");
  const [widgetTab, setWidgetTab] = useState<WidgetLibraryTab>("all");
  const [advancedMode, setAdvancedMode] = useState(false);
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
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [templateDeleteTarget, setTemplateDeleteTarget] = useState<{
    ids: string[];
    label: string;
  } | null>(null);
  const [templateActionError, setTemplateActionError] = useState<string | null>(null);
  const [isTemplateActionWorking, setIsTemplateActionWorking] = useState(false);
  const [previewNotice, setPreviewNotice] = useState<string | null>(null);
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
  const activeWidgetCategory: WidgetCategoryFilter =
    section === "widgets-all"
      ? "all"
      : widgetCategoryOrder.includes(section as WidgetCategoryId)
        ? (section as WidgetCategoryId)
        : "all";

  const normalizedTemplateCategory =
    templateCategory === "all" ? "all" : normalizeCategoryValue(templateCategory);

  const sectionCounts = useMemo(
    () =>
      countWidgetLibrarySections(widgets, {
        query,
        templateCategory: normalizedTemplateCategory,
        widgetTab,
        widgetModule,
        widgetComplexity,
      }),
    [
      normalizedTemplateCategory,
      query,
      widgetComplexity,
      widgetModule,
      widgets,
      widgetTab,
    ]
  );

  const widgetTabCounts = useMemo(() => {
    return {
      recommended: filterWidgetLibraryItems(widgets, {
        query,
        activeScope: "widgets",
        templateCategory: "all",
        widgetCategory: activeWidgetCategory,
        widgetTab: "recommended",
        widgetModule,
        widgetComplexity,
      }).length,
      all: filterWidgetLibraryItems(widgets, {
        query,
        activeScope: "widgets",
        templateCategory: "all",
        widgetCategory: activeWidgetCategory,
        widgetTab: "all",
        widgetModule,
        widgetComplexity,
      }).length,
    };
  }, [widgets, query, activeWidgetCategory, widgetComplexity, widgetModule]);

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
      filterWidgetLibraryItemsBySection(widgets, {
        query,
        section,
        templateCategory: normalizedTemplateCategory,
        widgetTab,
        widgetModule,
        widgetComplexity,
      }),
    [
      widgets,
      query,
      section,
      normalizedTemplateCategory,
      widgetTab,
      widgetModule,
      widgetComplexity,
    ]
  );

  const pagination = useListPagination(filteredWidgets, {
    resetKey: JSON.stringify({
      query,
      section,
      normalizedTemplateCategory,
      widgetTab,
      widgetModule,
      widgetComplexity,
    }),
  });

  const visibleIds = useMemo(
    () => pagination.visibleRows.map((widget) => widget.id),
    [pagination.visibleRows]
  );

  const selectedIdList = useMemo(() => Array.from(selectedIds), [selectedIds]);
  const selectedVisibleRows = useMemo(
    () => pagination.visibleRows.filter((widget) => selectedIds.has(widget.id)),
    [pagination.visibleRows, selectedIds]
  );
  const selectedVisibleTemplateRows = useMemo(
    () => selectedVisibleRows.filter((widget) => widget.source === "template"),
    [selectedVisibleRows]
  );
  const isAllVisibleSelected =
    visibleIds.length > 0 && visibleIds.every((id) => selectedIds.has(id));
  const isSelectionIndeterminate =
    selectedVisibleRows.length > 0 && !isAllVisibleSelected;

  useEffect(() => {
    setSelectedIds((previous) => {
      const next = new Set(trimWidgetLibrarySelection(previous, visibleIds));
      if (
        next.size === previous.size &&
        [...next].every((id) => previous.has(id))
      ) {
        return previous;
      }
      return next;
    });
  }, [visibleIds]);

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

  const sectionOptions = useMemo(
    () => [
      { value: "all-items" as const, label: "All Items" },
      { value: "favorites" as const, label: "Favorites" },
      { value: "templates" as const, label: "Templates" },
      { value: "widgets-all" as const, label: "All Widgets" },
      ...widgetCategoryOrder.map((id) => ({
        value: id,
        label: categoryMeta[id].label,
      })),
    ],
    []
  );

  const activeSectionLabel =
    sectionOptions.find((option) => option.value === section)?.label ?? "All Items";

  const resourceLabel =
    section === "templates"
      ? "templates"
      : section === "widgets-all" || widgetCategoryOrder.includes(section as WidgetCategoryId)
        ? "widgets"
        : "items";

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

  const handleSectionChange = (value: string) => {
    setSection(normalizeWidgetLibrarySection(value));
    setPreviewNotice(null);
    setSelectedIds(new Set());
  };

  const handleWidgetTabChange = (value: WidgetLibraryTab) => {
    setWidgetTab(value);
  };

  const handleAdvancedModeChange = (enabled: boolean) => {
    setAdvancedMode(enabled);
    if (!enabled && widgetComplexity === "atomic") {
      setWidgetComplexity("all");
    }
  };

  const handleSelectWidget = (widget: WidgetWithPreview) => {
    if (widget.source !== "core") return;
    setSelectedWidget(widget);
    setDetailsOpen(true);
  };

  const handleOpenPrimary = (widget: WidgetWithPreview) => {
    if (widget.source === "template") {
      handleEditTemplate(widget);
      return;
    }
    handleSelectWidget(widget);
  };

  const handlePreview = (widget: WidgetWithPreview) => {
    const message = `${widget.name} preview is not available yet.`;
    setPreviewNotice(message);
    toast.info(message);
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

  const toggleSelection = (id: string, checked?: boolean) => {
    setSelectedIds((previous) => {
      const next = new Set(previous);
      const shouldSelect = checked ?? !next.has(id);
      if (shouldSelect) {
        next.add(id);
      } else {
        next.delete(id);
      }
      return next;
    });
  };

  const toggleAllVisible = () => {
    setSelectedIds(isAllVisibleSelected ? new Set() : new Set(visibleIds));
  };

  const clearSelection = () => {
    setSelectedIds(new Set());
  };

  const handleBulkFavoriteChange = async (shouldFavorite: boolean) => {
    if (selectedVisibleRows.length === 0) return;
    setFavoritesError(null);
    const previous = new Set(favoriteIds);
    const next = new Set(previous);

    if (shouldFavorite) {
      const newIds = selectedVisibleRows
        .map((widget) => widget.id)
        .filter((id) => !next.has(id));
      if (next.size + newIds.length > 50) {
        setFavoritesError("Favorites limit reached.");
        toast.error("Favorites limit reached.");
        return;
      }
      for (const id of newIds) next.add(id);
    } else {
      for (const widget of selectedVisibleRows) next.delete(widget.id);
    }

    setFavoriteIds(next);
    try {
      await setUserSetting("widgets.favorites", Array.from(next));
      toast.success(
        shouldFavorite
          ? `${selectedVisibleRows.length} items added to favorites.`
          : `${selectedVisibleRows.length} items removed from favorites.`
      );
      clearSelection();
    } catch {
      setFavoriteIds(previous);
      setFavoritesError("Failed to save favorites.");
      toast.error("Failed to save favorites.");
    }
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
    const results = await Promise.allSettled(
      templateDeleteTarget.ids.map((id) => deleteWidgetTemplate(id))
    );
    const failed = templateDeleteTarget.ids.filter(
      (_, index) => results[index]?.status === "rejected"
    );
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
    setSelectedIds(new Set(failed));
    setTemplateDeleteTarget(null);
    try {
      await reloadCatalog();
    } finally {
      setIsTemplateActionWorking(false);
    }
  };

  const renderWidgetActions = (widget: WidgetWithPreview) => (
    <WidgetLibraryRowActions
      source={widget.source}
      section={section}
      isFavorite={Boolean(widget.isFavorite)}
      onPreview={() => handlePreview(widget)}
      onConfigure={
        widget.source === "core" ? () => handleSelectWidget(widget) : undefined
      }
      onInsert={
        widget.source === "core" ? () => handleInsertWidget(widget) : undefined
      }
      onEditTemplate={
        widget.source === "template" ? () => handleEditTemplate(widget) : undefined
      }
      onDuplicateTemplate={
        widget.source === "template"
          ? () => void handleDuplicateTemplate(widget)
          : undefined
      }
      onDeleteTemplate={
        widget.source === "template"
          ? () =>
              setTemplateDeleteTarget({
                ids: [widget.id],
                label: widget.name,
              })
          : undefined
      }
      onFavoriteToggle={() => handleFavoriteToggle(widget.id)}
      disabled={isTemplateActionWorking && widget.source === "template"}
    />
  );

  const templateList = useMemo(
    () =>
      catalogItems
        .filter((item) => item.source === "template")
        .map((item) => ({ id: item.id, name: item.name })),
    [catalogItems]
  );

  return (
    <AdminShell
      activeHref="/admin/coderso/widgets"
      breadcrumbs={
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <span>Widgets</span>
          <span>/</span>
          <span className="text-foreground">Library</span>
        </div>
      }
    >
      <div className="mx-auto flex max-w-7xl flex-col gap-6">
        <PageHeader
          title="Widget Library"
          description="Manage and reuse your custom interface components across all pages."
          actions={
            <>
              {selectedVisibleRows.length > 0 ? (
                <div className="flex flex-wrap items-center gap-2">
                  <Badge variant="secondary">
                    {selectedVisibleRows.length} selected
                  </Badge>
                  {section === "favorites" ? (
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      className="gap-2"
                      onClick={() => void handleBulkFavoriteChange(false)}
                    >
                      <Star className="h-4 w-4" />
                      Remove favorites
                    </Button>
                  ) : (
                    <>
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        className="gap-2"
                        onClick={() => void handleBulkFavoriteChange(true)}
                      >
                        <Star className="h-4 w-4" />
                        Add favorites
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        className="gap-2"
                        onClick={() => void handleBulkFavoriteChange(false)}
                      >
                        <X className="h-4 w-4" />
                        Remove favorites
                      </Button>
                    </>
                  )}
                  {section === "templates" && selectedVisibleTemplateRows.length > 0 ? (
                    <Button
                      type="button"
                      size="sm"
                      variant="destructive"
                      className="gap-2"
                      onClick={() =>
                        setTemplateDeleteTarget({
                          ids: selectedVisibleTemplateRows.map((widget) => widget.id),
                          label: `${selectedVisibleTemplateRows.length} selected templates`,
                        })
                      }
                      disabled={isTemplateActionWorking}
                    >
                      <Trash2 className="h-4 w-4" />
                      Delete selected
                    </Button>
                  ) : null}
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    onClick={clearSelection}
                  >
                    Clear
                  </Button>
                </div>
              ) : null}
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={() => setCategoriesOpen(true)}
              >
                Categories
              </Button>
              {section === "templates" ? (
                <Button size="sm" className="gap-2" asChild>
                  <AdminLink href={templateCreateHref}>
                    <Plus className="h-4 w-4" />
                    New Template
                  </AdminLink>
                </Button>
              ) : null}
            </>
          }
        />
        <div className="rounded-xl border bg-card p-4 shadow-sm">
          <span className="sr-only">
            Available widget library sections:{" "}
            {sectionOptions.map((option) => option.label).join(", ")}
          </span>
          <div className="flex flex-wrap items-center gap-3">
            <div className="relative min-w-[16rem] flex-1">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search widgets and templates..."
                className="pl-9"
                aria-label="Search widgets and templates"
              />
            </div>
            <Select value={section} onValueChange={handleSectionChange}>
              <SelectTrigger className="h-9 w-[220px] text-sm">
                <SelectValue placeholder="All Items" />
              </SelectTrigger>
              <SelectContent>
                {sectionOptions.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label} ({sectionCounts[option.value]})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Badge variant="secondary">
              {pagination.totalItems} {resourceLabel}
            </Badge>
            <div className="flex items-center rounded-lg border bg-background p-1 shadow-sm">
              <Button
                type="button"
                variant={view === "table" ? "secondary" : "ghost"}
                size="icon-sm"
                onClick={() => setView("table")}
                aria-label="Show widgets as table"
                aria-pressed={view === "table"}
                title="Table view"
              >
                <Table2 className="h-4 w-4" />
              </Button>
              <Button
                type="button"
                variant={view === "grid" ? "secondary" : "ghost"}
                size="icon-sm"
                onClick={() => setView("grid")}
                aria-label="Show widgets as grid"
                aria-pressed={view === "grid"}
                title="Grid view"
              >
                <Grid2X2 className="h-4 w-4" />
              </Button>
            </div>
            {(section === "widgets-all" ||
              widgetCategoryOrder.includes(section as WidgetCategoryId)) ? (
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
            {section === "templates" ? (
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
          </div>
          <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
            <span>Section: {activeSectionLabel}</span>
            <span className="text-muted-foreground/60">/</span>
            <span>Default view: table</span>
            {favoritesError ? (
              <>
                <span className="text-muted-foreground/60">/</span>
                <span className="text-destructive">{favoritesError}</span>
              </>
            ) : null}
          </div>
        </div>
        {previewNotice ? (
          <div className="rounded-lg border border-muted bg-muted/30 px-3 py-2 text-sm text-muted-foreground">
            {previewNotice}
          </div>
        ) : null}
        {templateActionError ? (
          <div className="rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
            {templateActionError}
          </div>
        ) : null}
        <div className="flex flex-col gap-4">
          {view === "table" ? (
            <WidgetLibraryTable
              rows={pagination.visibleRows}
              selectedIds={selectedIdList}
              isAllSelected={isAllVisibleSelected}
              isIndeterminate={isSelectionIndeterminate}
              emptyMessage={
                section === "templates"
                  ? "No templates match your search."
                  : "No items match your search."
              }
              onToggleAll={toggleAllVisible}
              onToggleRow={(id) => toggleSelection(id)}
              onOpenPrimary={(widget) => handleOpenPrimary(widget as WidgetWithPreview)}
              renderActions={(widget) => renderWidgetActions(widget as WidgetWithPreview)}
            />
          ) : (
            <div
              className={cn(
                "grid gap-6",
                "grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4"
              )}
            >
              {pagination.visibleRows.length === 0 ? (
                <div className="col-span-full rounded-xl border border-dashed bg-card p-10 text-center text-sm text-muted-foreground">
                  {section === "templates"
                    ? "No templates match your search."
                    : "No items match your search."}
                </div>
              ) : (
                pagination.visibleRows.map((widget) => (
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
                    selected={selectedIds.has(widget.id)}
                    onSelectionChange={(checked) =>
                      toggleSelection(widget.id, checked)
                    }
                    actions={renderWidgetActions(widget)}
                    onSelect={() => handleOpenPrimary(widget)}
                  />
                ))
              )}
            </div>
          )}
          <ListPaginationFooter
            resourceLabel={resourceLabel}
            pagination={pagination}
          />
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
