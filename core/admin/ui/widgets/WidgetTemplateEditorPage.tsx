import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ChevronRight, History, Settings2 } from "lucide-react";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { isApiClientError } from "@/services/apiClient";
import { cacheKeys } from "@/services/cachePolicy";
import { listMediaCached } from "@/services/mediaClient";
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
  getCachedWidgetTemplate,
  getWidgetTemplateCached,
  updateWidgetTemplate,
  type WidgetTemplate,
  type WidgetTemplateStatus,
} from "@/services/widgetTemplatesClient";
import {
  getCachedWidgetTemplateCategories,
  listWidgetTemplateCategoriesCached,
  type WidgetTemplateCategory,
} from "@/services/widgetTemplateCategoriesClient";
import { AdminShell } from "@/ui/layouts/AdminShell";
import { useAdminRouter } from "@/ui/contexts/AdminRouterContext";
import { subscribeCacheEvents } from "@/utils/cacheBus";
import { resolveCacheRefreshBackground } from "@/utils/cacheRefresh";
import { useAdminBasePath } from "@/ui/contexts/AdminBasePathContext";
import { listRegisteredPageWidgets } from "@/ui/widgets/registry";
import { BlockList } from "@/ui/pages/builder/BlockList";
import { BlockSettings } from "@/ui/pages/builder/BlockSettings";
import { MediaPicker } from "@/ui/media/MediaPicker";
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
import { WidgetPicker } from "@/ui/pages/builder/WidgetPicker";
import {
  resolveAdminBasePath,
  resolveAdminHref,
  stripAdminBasePath,
} from "@/utils/adminPaths";
import {
  pageLayoutTokens,
  type PageBackgroundMediaSource,
  type PageBackgroundMediaType,
  type PageMaxWidthToken,
} from "../../../services/pages/layoutSettings";
import {
  normalizeWidgetTemplateSettings,
  type WidgetTemplateSettings,
} from "../../../services/widgets/widgetTemplateSettings";
import { containerTokens, spacingTokens, type ContainerToken, type SpacingToken } from "../../../widgets/types";
import type { WidgetCategoryId } from "./types";
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
const MAX_WIDTH_DEFAULT_VALUE = "max-width-default";
const PAGE_BACKGROUND_NONE_VALUE = "none";

const backgroundMediaTypeLabelMap: Record<PageBackgroundMediaType, string> = {
  none: "No background media",
  image: "Image",
  video: "Video",
};

const backgroundMediaSourceLabelMap: Record<PageBackgroundMediaSource, string> = {
  library: "Media library",
  external: "External URL",
};

const spacingTokenToListSpaceClassMap: Record<SpacingToken, string> = {
  none: "space-y-0",
  xs: "space-y-2",
  sm: "space-y-4",
  md: "space-y-6",
  lg: "space-y-8",
  xl: "space-y-12",
  "2xl": "space-y-16",
};

const spacingTokenToPaddingTopClassMap: Record<SpacingToken, string> = {
  none: "pt-0",
  xs: "pt-2",
  sm: "pt-4",
  md: "pt-6",
  lg: "pt-8",
  xl: "pt-12",
  "2xl": "pt-16",
};

const spacingTokenToPaddingBottomClassMap: Record<SpacingToken, string> = {
  none: "pb-0",
  xs: "pb-2",
  sm: "pb-4",
  md: "pb-6",
  lg: "pb-8",
  xl: "pb-12",
  "2xl": "pb-16",
};

const pageContainerClassMap: Record<ContainerToken, string> = {
  default: "mx-auto w-full max-w-6xl",
  narrow: "mx-auto w-full max-w-4xl",
  full: "w-full",
};

const pageMaxWidthClassMap: Record<PageMaxWidthToken, string> = {
  "4xl": "max-w-4xl",
  "5xl": "max-w-5xl",
  "6xl": "max-w-6xl",
  "7xl": "max-w-7xl",
};

const joinClasses = (...classes: Array<string | undefined | false>) =>
  classes.filter(Boolean).join(" ");

const isHexColor = (value: string) =>
  /^#(?:[0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/.test(value.trim());

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
  const { navigate } = useAdminRouter();
  const [templateId] = useState<string | null>(() => {
    if (typeof window === "undefined") return null;
    return resolveTemplateId(window.location.pathname);
  });
  const isNew = !templateId || templateId === "new";

  const widgets = useMemo(() => listRegisteredPageWidgets(), []);
  const initialCategories = useMemo(
    () => getCachedWidgetTemplateCategories(),
    []
  );
  const [blocks, setBlocks] = useState<Block[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("");
  const [status, setStatus] = useState<WidgetTemplateStatus>("draft");
  const [templateSettings, setTemplateSettings] = useState<WidgetTemplateSettings>(
    () => normalizeWidgetTemplateSettings(undefined)
  );
  const [activeCategory, setActiveCategory] = useState<
    WidgetCategoryId | "all"
  >("all");
  const [templateCategories, setTemplateCategories] = useState<
    WidgetTemplateCategory[]
  >(() => initialCategories ?? []);
  const hasHydratedCategoriesRef = useRef(Boolean(initialCategories));
  const [isLoading, setIsLoading] = useState(!isNew);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [remoteUpdatePending, setRemoteUpdatePending] = useState(false);
  const [categoriesError, setCategoriesError] = useState<string | null>(null);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewData, setPreviewData] =
    useState<WidgetTemplatePreviewResponse | null>(null);
  const [previewError, setPreviewError] = useState<string | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [backgroundLookupError, setBackgroundLookupError] = useState<string | null>(
    null
  );
  const backgroundLookupRequestIdRef = useRef(0);
  const [revisionsOpen, setRevisionsOpen] = useState(false);
  const [revisions, setRevisions] = useState<WidgetTemplateRevision[]>([]);
  const [revisionsError, setRevisionsError] = useState<string | null>(null);
  const [revisionsLoading, setRevisionsLoading] = useState(false);
  const [restoringRevisionId, setRestoringRevisionId] = useState<string | null>(
    null
  );

  const displayError = error ?? categoriesError;

  const selectedBlock = findBlockById(blocks, selectedId);
  const templateLayout = templateSettings.layout;
  const wrapperPaddingClass = joinClasses(
    spacingTokenToPaddingTopClassMap[templateLayout.wrapper.padding.top],
    spacingTokenToPaddingBottomClassMap[templateLayout.wrapper.padding.bottom]
  );
  const wrapperContainerClass = joinClasses(
    pageContainerClassMap[templateLayout.wrapper.container],
    templateLayout.wrapper.container !== "full" && templateLayout.wrapper.maxWidth
      ? pageMaxWidthClassMap[templateLayout.wrapper.maxWidth]
      : undefined
  );
  const wrapperBackgroundMedia = templateLayout.wrapper.background.media;
  const wrapperBackgroundImage =
    wrapperBackgroundMedia.type === "image"
      ? wrapperBackgroundMedia.src ??
        templateLayout.wrapper.background.image ??
        null
      : null;
  const wrapperBackgroundVideo =
    wrapperBackgroundMedia.type === "video"
      ? wrapperBackgroundMedia.src
      : null;
  const backgroundMediaAccept =
    wrapperBackgroundMedia.type === "image"
      ? ["image/*"]
      : wrapperBackgroundMedia.type === "video"
        ? ["video/*"]
        : undefined;
  const wrapperBackgroundStyle = {
    backgroundColor: templateLayout.wrapper.background.color,
    backgroundImage: wrapperBackgroundImage
      ? `url(${wrapperBackgroundImage})`
      : undefined,
    backgroundSize: wrapperBackgroundImage ? "cover" : undefined,
    backgroundPosition: wrapperBackgroundImage ? "center" : undefined,
  };
  const selectedWidget = useMemo(() => {
    if (!selectedBlock) return undefined;
    return getWidgetRegistry().find((widget) => widget.type === selectedBlock.type);
  }, [selectedBlock]);

  const filteredWidgets = useMemo(() => {
    return widgets.filter((widget) => {
      const matchesCategory =
        activeCategory === "all" || widget.category === activeCategory;
      return matchesCategory;
    });
  }, [widgets, activeCategory]);

  const setTemplateWrapperBackground = useCallback(
    (
      updater: (
        background: WidgetTemplateSettings["layout"]["wrapper"]["background"]
      ) => WidgetTemplateSettings["layout"]["wrapper"]["background"]
    ) => {
      setTemplateSettings((prev) => ({
        ...prev,
        layout: {
          ...prev.layout,
          wrapper: {
            ...prev.layout.wrapper,
            background: updater(prev.layout.wrapper.background),
          },
        },
      }));
    },
    []
  );

  const handleBackgroundMediaTypeChange = useCallback(
    (next: string) => {
      const nextType = next as PageBackgroundMediaType;
      backgroundLookupRequestIdRef.current += 1;
      setBackgroundLookupError(null);
      setTemplateWrapperBackground((background) => {
        if (nextType === PAGE_BACKGROUND_NONE_VALUE) {
          return {
            ...background,
            image: null,
            media: {
              type: nextType,
              source: "external",
              src: null,
            },
          };
        }
        return {
          ...background,
          image: null,
          media: {
            type: nextType,
            source: background.media.source,
            src: null,
          },
        };
      });
    },
    [setTemplateWrapperBackground]
  );

  const handleBackgroundMediaSourceChange = useCallback(
    (next: string) => {
      const nextSource = next as PageBackgroundMediaSource;
      backgroundLookupRequestIdRef.current += 1;
      setBackgroundLookupError(null);
      setTemplateWrapperBackground((background) => ({
        ...background,
        image: background.media.type === "image" ? null : background.image,
        media: {
          type: background.media.type,
          source: nextSource,
          src: null,
        },
      }));
    },
    [setTemplateWrapperBackground]
  );

  const handleBackgroundMediaUrlChange = useCallback(
    (nextValue: string) => {
      const normalized = nextValue.trim().length > 0 ? nextValue : null;
      setBackgroundLookupError(null);
      setTemplateWrapperBackground((background) => ({
        ...background,
        image: background.media.type === "image" ? normalized : null,
        media: {
          type: background.media.type,
          source: "external",
          src: normalized,
        },
      }));
    },
    [setTemplateWrapperBackground]
  );

  const handleBackgroundMediaAssetChange = useCallback(
    async (value: unknown) => {
      const assetId = typeof value === "string" ? value : null;
      backgroundLookupRequestIdRef.current += 1;
      const requestId = backgroundLookupRequestIdRef.current;
      setBackgroundLookupError(null);
      if (!assetId) {
        setTemplateWrapperBackground((background) => ({
          ...background,
          image: background.media.type === "image" ? null : background.image,
          media: {
            type: background.media.type,
            source: "library",
            src: null,
          },
        }));
        return;
      }

      setTemplateWrapperBackground((background) => ({
        ...background,
        media: {
          type: background.media.type,
          source: "library",
          assetId,
          src: background.media.src,
        },
      }));

      try {
        const items = await listMediaCached({ force: true });
        if (requestId !== backgroundLookupRequestIdRef.current) return;
        const match = items.find((item) => item.id === assetId);
        if (!match) {
          setBackgroundLookupError("Selected media could not be resolved.");
          return;
        }
        setTemplateWrapperBackground((background) => ({
          ...background,
          image: background.media.type === "image" ? match.url : null,
          media: {
            type: background.media.type,
            source: "library",
            assetId,
            src: match.url,
          },
        }));
      } catch (err) {
        if (requestId !== backgroundLookupRequestIdRef.current) return;
        if (isApiClientError(err)) {
          setBackgroundLookupError(err.message);
        } else {
          setBackgroundLookupError("Failed to resolve selected media.");
        }
      }
    },
    [setTemplateWrapperBackground]
  );

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

  const applyTemplate = useCallback((template: WidgetTemplate) => {
    setName(template.name ?? "");
    setDescription(template.description ?? "");
    setCategory(template.category);
    setStatus(template.status);
    setBlocks((template.blocks as Block[]) ?? []);
    setTemplateSettings(normalizeWidgetTemplateSettings(template.settings));
    setRemoteUpdatePending(false);
  }, []);

  const loadTemplate = useCallback(async () => {
    if (!templateId || templateId === "new") {
      setIsLoading(false);
      return;
    }
    const cached = getCachedWidgetTemplate(templateId);
    if (cached) {
      applyTemplate(cached);
      setIsLoading(false);
    }
    const shouldSetLoading = !cached;
    if (shouldSetLoading) setIsLoading(true);
    setError(null);
    try {
      const template = await getWidgetTemplateCached(templateId, { force: true });
      if (!template) return;
      applyTemplate(template);
    } catch (err) {
      const message = isApiClientError(err)
        ? err.message
        : "Failed to load template.";
      setError(message);
    } finally {
      if (shouldSetLoading) setIsLoading(false);
    }
  }, [applyTemplate, templateId]);

  useEffect(() => {
    void loadTemplate();
  }, [loadTemplate]);

  useEffect(() => {
    if (!templateId || templateId === "new") return;
    return subscribeCacheEvents((event) => {
      if (event.key !== cacheKeys.widgetTemplateDetail(templateId)) return;
      setRemoteUpdatePending(true);
    });
  }, [templateId]);

  const refreshCategories = useCallback(
    async (options?: { force?: boolean; background?: boolean }) => {
      const force = options?.force ?? false;
      const background = resolveCacheRefreshBackground({
        explicitBackground: options?.background,
        hasHydrated: hasHydratedCategoriesRef.current,
      });
      if (!background) {
        setCategoriesError(null);
      }
      try {
        const result = await listWidgetTemplateCategoriesCached({ force });
        setTemplateCategories(result);
        setCategoriesError(null);
        hasHydratedCategoriesRef.current = true;
      } catch {
        if (!background) {
          setCategoriesError("Failed to load categories.");
        }
      }
    },
    []
  );

  useEffect(() => {
    refreshCategories({ force: true, background: true }).catch(() => undefined);
  }, [refreshCategories]);

  useEffect(() => {
    return subscribeCacheEvents((event) => {
      if (event.key !== cacheKeys.widgetTemplateCategoriesList) return;
      refreshCategories({ force: true, background: true }).catch(() => undefined);
    });
  }, [refreshCategories]);

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
          settings: templateSettings,
        });
        navigate(resolveAdminHref(adminBasePath, `/admin/widgets/templates/${created.id}`));
        return;
      }
      if (!templateId) return;
      await updateWidgetTemplate(templateId, {
        name: name.trim(),
        description: description.trim() ? description.trim() : null,
        category: category.trim(),
        status,
        blocks,
        settings: templateSettings,
      });
      setRemoteUpdatePending(false);
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
      navigate(resolveAdminHref(adminBasePath, "/admin/widgets"));
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
              Runtime Preview
            </Button>
            <Button variant="ghost" size="sm" onClick={() => setDetailsOpen(true)}>
              Template Details
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
          <div data-slot="card" className="border-b border-border bg-card px-6 py-4">
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
            {remoteUpdatePending ? (
              <div className="mt-4">
                <Alert>
                  <AlertTitle>Updated in another tab</AlertTitle>
                  <AlertDescription className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <span>New changes are available. Refresh to load the latest version.</span>
                    <Button variant="outline" size="sm" onClick={() => loadTemplate()}>
                      Refresh
                    </Button>
                  </AlertDescription>
                </Alert>
              </div>
            ) : null}
          </div>
          <div className="flex flex-1 min-h-0">
            <aside
              data-slot="card"
              className="hidden w-72 min-h-0 flex-col overflow-hidden border-r border-border bg-card lg:flex"
            >
              <div className="border-b border-border p-4">
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
              </div>
              <div className="flex-1 min-h-0 overflow-hidden">
                <WidgetPicker
                  widgets={filteredWidgets}
                  onAdd={handleAddBlock}
                  draggable
                  onDragStart={(event, type) => {
                    event.dataTransfer.setData("widget-type", type);
                    event.dataTransfer.effectAllowed = "copy";
                  }}
                />
              </div>
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
              <div
                className={joinClasses(
                  "relative w-full overflow-hidden rounded-xl border border-border/40",
                  wrapperPaddingClass
                )}
                style={wrapperBackgroundStyle}
              >
                {wrapperBackgroundVideo ? (
                  <video
                    className="pointer-events-none absolute inset-0 h-full w-full object-cover"
                    src={wrapperBackgroundVideo}
                    autoPlay
                    loop
                    muted
                    playsInline
                    aria-hidden="true"
                  />
                ) : null}
                <div
                  className={joinClasses(
                    wrapperContainerClass,
                    wrapperBackgroundVideo ? "relative z-[1]" : undefined
                  )}
                >
                  <BlockList
                    blocks={blocks}
                    className={
                      spacingTokenToListSpaceClassMap[templateLayout.sections.gap]
                    }
                    pageDefaults={templateLayout.sections.defaults}
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
              </div>
            )}
            </main>

            <aside
              data-slot="card"
              className="hidden w-80 min-h-0 flex-col border-l border-border bg-card lg:flex"
            >
              <div className="border-b border-border px-4 py-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
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
              <div className="border-t border-border bg-muted/20 p-4">
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
      <Dialog open={detailsOpen} onOpenChange={setDetailsOpen}>
        <DialogContent className="max-h-[90vh] overflow-hidden p-0 sm:max-w-3xl">
          <DialogHeader className="border-b px-6 py-4">
            <DialogTitle>Template layout and appearance</DialogTitle>
            <DialogDescription>
              Configure wrapper background, spacing, and container behavior for runtime
              preview and published output.
            </DialogDescription>
          </DialogHeader>
          <ScrollArea className="max-h-[70vh]">
            <div className="space-y-4 px-6 py-5">
              <div className="flex items-center justify-between gap-3">
                <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                  Layout controls
                </p>
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  onClick={() => {
                    backgroundLookupRequestIdRef.current += 1;
                    setBackgroundLookupError(null);
                    setTemplateSettings(normalizeWidgetTemplateSettings(undefined));
                  }}
                >
                  Reset defaults
                </Button>
              </div>
              <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                <div className="space-y-2">
                  <label className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                    Container
                  </label>
                  <Select
                    value={templateLayout.wrapper.container}
                    onValueChange={(next) =>
                      setTemplateSettings((prev) => ({
                        ...prev,
                        layout: {
                          ...prev.layout,
                          wrapper: {
                            ...prev.layout.wrapper,
                            container: next as ContainerToken,
                          },
                        },
                      }))
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Container" />
                    </SelectTrigger>
                    <SelectContent>
                      {containerTokens.map((token) => (
                        <SelectItem key={token} value={token}>
                          {token}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <label className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                    Max width
                  </label>
                  <Select
                    value={templateLayout.wrapper.maxWidth ?? MAX_WIDTH_DEFAULT_VALUE}
                    onValueChange={(next) =>
                      setTemplateSettings((prev) => ({
                        ...prev,
                        layout: {
                          ...prev.layout,
                          wrapper: {
                            ...prev.layout.wrapper,
                            maxWidth:
                              next === MAX_WIDTH_DEFAULT_VALUE
                                ? undefined
                                : (next as PageMaxWidthToken),
                          },
                        },
                      }))
                    }
                    disabled={templateLayout.wrapper.container === "full"}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Max width" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value={MAX_WIDTH_DEFAULT_VALUE}>
                        theme default
                      </SelectItem>
                      {pageLayoutTokens.maxWidth.map((token) => (
                        <SelectItem key={token} value={token}>
                          {token}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <label className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                    Section gap
                  </label>
                  <Select
                    value={templateLayout.sections.gap}
                    onValueChange={(next) =>
                      setTemplateSettings((prev) => ({
                        ...prev,
                        layout: {
                          ...prev.layout,
                          sections: {
                            ...prev.layout.sections,
                            gap: next as SpacingToken,
                          },
                        },
                      }))
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Section gap" />
                    </SelectTrigger>
                    <SelectContent>
                      {spacingTokens.map((token) => (
                        <SelectItem key={token} value={token}>
                          {token}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <label className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                    Wrapper padding top
                  </label>
                  <Select
                    value={templateLayout.wrapper.padding.top}
                    onValueChange={(next) =>
                      setTemplateSettings((prev) => ({
                        ...prev,
                        layout: {
                          ...prev.layout,
                          wrapper: {
                            ...prev.layout.wrapper,
                            padding: {
                              ...prev.layout.wrapper.padding,
                              top: next as SpacingToken,
                            },
                          },
                        },
                      }))
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Padding top" />
                    </SelectTrigger>
                    <SelectContent>
                      {spacingTokens.map((token) => (
                        <SelectItem key={token} value={token}>
                          {token}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <label className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                    Wrapper padding bottom
                  </label>
                  <Select
                    value={templateLayout.wrapper.padding.bottom}
                    onValueChange={(next) =>
                      setTemplateSettings((prev) => ({
                        ...prev,
                        layout: {
                          ...prev.layout,
                          wrapper: {
                            ...prev.layout.wrapper,
                            padding: {
                              ...prev.layout.wrapper.padding,
                              bottom: next as SpacingToken,
                            },
                          },
                        },
                      }))
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Padding bottom" />
                    </SelectTrigger>
                    <SelectContent>
                      {spacingTokens.map((token) => (
                        <SelectItem key={token} value={token}>
                          {token}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <label className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                    Background color
                  </label>
                  <div className="flex items-center gap-2">
                    <Input
                      type="color"
                      className="h-10 w-14 p-1"
                      value={
                        isHexColor(templateLayout.wrapper.background.color)
                          ? templateLayout.wrapper.background.color
                          : "#ffffff"
                      }
                      onChange={(event) =>
                        setTemplateSettings((prev) => ({
                          ...prev,
                          layout: {
                            ...prev.layout,
                            wrapper: {
                              ...prev.layout.wrapper,
                              background: {
                                ...prev.layout.wrapper.background,
                                color: event.target.value,
                              },
                            },
                          },
                        }))
                      }
                    />
                    <Input
                      value={templateLayout.wrapper.background.color}
                      onChange={(event) =>
                        setTemplateSettings((prev) => ({
                          ...prev,
                          layout: {
                            ...prev.layout,
                            wrapper: {
                              ...prev.layout.wrapper,
                              background: {
                                ...prev.layout.wrapper.background,
                                color: event.target.value,
                              },
                            },
                          },
                        }))
                      }
                      placeholder="#ffffff or transparent"
                    />
                  </div>
                </div>
              </div>
              <div className="grid gap-3 md:grid-cols-2">
                <div className="space-y-2">
                  <label className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                    Background media type
                  </label>
                  <Select
                    value={wrapperBackgroundMedia.type}
                    onValueChange={handleBackgroundMediaTypeChange}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select media type" />
                    </SelectTrigger>
                    <SelectContent>
                      {pageLayoutTokens.backgroundMediaTypes.map((token) => (
                        <SelectItem key={token} value={token}>
                          {backgroundMediaTypeLabelMap[token]}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                {wrapperBackgroundMedia.type !== PAGE_BACKGROUND_NONE_VALUE ? (
                  <div className="space-y-2">
                    <label className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                      Background media source
                    </label>
                    <Select
                      value={wrapperBackgroundMedia.source}
                      onValueChange={handleBackgroundMediaSourceChange}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select source" />
                      </SelectTrigger>
                      <SelectContent>
                        {pageLayoutTokens.backgroundMediaSources.map((token) => (
                          <SelectItem key={token} value={token}>
                            {backgroundMediaSourceLabelMap[token]}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                ) : null}
              </div>
              {wrapperBackgroundMedia.type !== PAGE_BACKGROUND_NONE_VALUE ? (
                <div className="space-y-2">
                  {wrapperBackgroundMedia.source === "library" ? (
                    <>
                      <label className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                        Background media library
                      </label>
                      <MediaPicker
                        value={wrapperBackgroundMedia.assetId ?? null}
                        onChange={(value) => void handleBackgroundMediaAssetChange(value)}
                        multiple={false}
                        accept={backgroundMediaAccept}
                      />
                    </>
                  ) : (
                    <>
                      <label className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                        Background media URL
                      </label>
                      <Input
                        value={wrapperBackgroundMedia.src ?? ""}
                        onChange={(event) =>
                          handleBackgroundMediaUrlChange(event.target.value)
                        }
                        placeholder={
                          wrapperBackgroundMedia.type === "video"
                            ? "https://cdn.example.com/background.mp4"
                            : "https://cdn.example.com/background.jpg"
                        }
                      />
                    </>
                  )}
                  {backgroundLookupError ? (
                    <p className="text-xs text-destructive">{backgroundLookupError}</p>
                  ) : null}
                </div>
              ) : null}
            </div>
          </ScrollArea>
        </DialogContent>
      </Dialog>
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
