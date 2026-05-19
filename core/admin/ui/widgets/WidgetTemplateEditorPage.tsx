import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Eye, History, Save, Settings2, X } from "lucide-react";
import { toast } from "sonner";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Sheet, SheetClose, SheetContent, SheetTitle } from "@/components/ui/sheet";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
import { resolveAdminActionErrorMessage } from "@/ui/shared/actionToasts";
import {
  clearActiveAssistantSurfaceContext,
  setActiveAssistantSurfaceContext,
} from "@/ui/assistant/activeSurfaceContext";
import { useAdminRouter } from "@/ui/contexts/AdminRouterContext";
import { subscribeCacheEvents } from "@/utils/cacheBus";
import { resolveCacheRefreshBackground } from "@/utils/cacheRefresh";
import { useAdminBasePath } from "@/ui/contexts/AdminBasePathContext";
import { listRegisteredPageWidgets } from "@/ui/widgets/registry";
import {
  buildActiveWidgetPreviewStates,
  widgetSupportsPreviewState,
} from "@/ui/widgets/previewStateSupport";
import { BlockList } from "@/ui/pages/builder/BlockList";
import { BlockSettings } from "@/ui/pages/builder/BlockSettings";
import { MediaPicker } from "@/ui/media/MediaPicker";
import { collectBookingFlowSummaries } from "@/ui/pages/builder/bookingFlowContext";
import {
  applyWidgetBlockPatch,
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
import { resolveAdminBasePath, resolveAdminHref, stripAdminBasePath } from "@/utils/adminPaths";
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
import {
  containerTokens,
  spacingTokens,
  type ContainerToken,
  type SpacingToken,
  type WidgetEditorContext,
  type WidgetPreviewState,
} from "../../../widgets/types";
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

const supportsTransientWidgetPreview = (type: string | undefined) =>
  type === "entry-teaser" || type === "product-compare";

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

const isHexColor = (value: string) => /^#(?:[0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/.test(value.trim());

const resolveTemplateId = (pathname: string) => {
  const adminBasePath = resolveAdminBasePath(pathname);
  const relativePath = stripAdminBasePath(pathname, adminBasePath);
  const parts = relativePath.split("/").filter(Boolean);
  const index = parts.findIndex((segment) => segment === "widgets");
  if (index === -1) return null;
  if (parts[index + 1] !== "templates") return null;
  return parts[index + 2] ?? null;
};

const readBlockDataText = (block: Block, key: string) => {
  const data = block.data;
  if (!data || typeof data !== "object" || Array.isArray(data)) return null;
  const value = (data as Record<string, unknown>)[key];
  return typeof value === "string" && value.trim().length > 0 ? value.trim() : null;
};

const summarizeTemplateBlocksForAssistant = (
  blocks: Block[],
  options: { maxBlocks?: number } = {}
) => {
  const maxBlocks = options.maxBlocks ?? 80;
  const result: Array<{
    id: string;
    type: string;
    label: string | null;
    path: string;
    childCount: number;
    slotKeys: string[];
    templateId: string | null;
    templateName: string | null;
  }> = [];

  const visit = (items: Block[], pathPrefix: string) => {
    items.forEach((block, index) => {
      if (result.length >= maxBlocks) return;
      const path = pathPrefix ? `${pathPrefix}.${index}` : String(index);
      const slotEntries =
        block.slots && typeof block.slots === "object" && !Array.isArray(block.slots)
          ? Object.entries(block.slots)
          : [];
      const childBlocks = Array.isArray(block.children) ? block.children : [];
      const slotChildCount = slotEntries.reduce(
        (count, [, value]) => count + (Array.isArray(value) ? value.length : 0),
        0
      );
      result.push({
        id: block.id,
        type: block.type,
        label: readBlockDataText(block, "title") ?? readBlockDataText(block, "headline"),
        path,
        childCount: childBlocks.length + slotChildCount,
        slotKeys: slotEntries.map(([key]) => key).sort((left, right) => left.localeCompare(right)),
        templateId:
          block.type === "template-section" ? readBlockDataText(block, "templateId") : null,
        templateName:
          block.type === "template-section" ? readBlockDataText(block, "templateName") : null,
      });

      if (result.length >= maxBlocks) return;
      if (childBlocks.length > 0) {
        visit(childBlocks, `${path}.children`);
      }
      for (const [slotId, value] of slotEntries) {
        if (result.length >= maxBlocks) break;
        if (Array.isArray(value)) {
          visit(value as Block[], `${path}.slots.${slotId}`);
        }
      }
    });
  };

  visit(blocks, "");
  return result;
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
  const initialCategories = useMemo(() => getCachedWidgetTemplateCategories(), []);
  const initialTemplate = useMemo(
    () => (!isNew && templateId ? (getCachedWidgetTemplate(templateId) ?? null) : null),
    [isNew, templateId]
  );
  const [blocks, setBlocks] = useState<Block[]>(() => (initialTemplate?.blocks as Block[]) ?? []);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [name, setName] = useState(() => initialTemplate?.name ?? "");
  const [description, setDescription] = useState(() => initialTemplate?.description ?? "");
  const [category, setCategory] = useState(() => initialTemplate?.category ?? "");
  const [status, setStatus] = useState<WidgetTemplateStatus>(
    () => initialTemplate?.status ?? "draft"
  );
  const [templateSettings, setTemplateSettings] = useState<WidgetTemplateSettings>(() =>
    normalizeWidgetTemplateSettings(initialTemplate?.settings)
  );
  const [activeCategory, setActiveCategory] = useState<WidgetCategoryId | "all">("all");
  const [templateCategories, setTemplateCategories] = useState<WidgetTemplateCategory[]>(
    () => initialCategories ?? []
  );
  const resolvedCategory = category || templateCategories[0]?.name || "";
  const hasHydratedCategoriesRef = useRef(Boolean(initialCategories));
  const [isLoading, setIsLoading] = useState(!isNew && !initialTemplate);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [remoteUpdatePending, setRemoteUpdatePending] = useState(false);
  const [categoriesError, setCategoriesError] = useState<string | null>(null);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewData, setPreviewData] = useState<WidgetTemplatePreviewResponse | null>(null);
  const [previewError, setPreviewError] = useState<string | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [sidebarTab, setSidebarTab] = useState<"settings" | "details">("settings");
  const [backgroundLookupError, setBackgroundLookupError] = useState<string | null>(null);
  const backgroundLookupRequestIdRef = useRef(0);
  const [revisionsOpen, setRevisionsOpen] = useState(false);
  const [revisions, setRevisions] = useState<WidgetTemplateRevision[]>([]);
  const [revisionsError, setRevisionsError] = useState<string | null>(null);
  const [revisionsLoading, setRevisionsLoading] = useState(false);
  const [restoringRevisionId, setRestoringRevisionId] = useState<string | null>(null);
  const [widgetPreviewStates, setWidgetPreviewStates] = useState<
    Record<string, WidgetPreviewState | undefined>
  >({});

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
      ? (wrapperBackgroundMedia.src ?? templateLayout.wrapper.background.image ?? null)
      : null;
  const wrapperBackgroundVideo =
    wrapperBackgroundMedia.type === "video" ? wrapperBackgroundMedia.src : null;
  const backgroundMediaAccept =
    wrapperBackgroundMedia.type === "image"
      ? ["image/*"]
      : wrapperBackgroundMedia.type === "video"
        ? ["video/*"]
        : undefined;
  const wrapperBackgroundStyle = {
    backgroundColor: templateLayout.wrapper.background.color,
    backgroundImage: wrapperBackgroundImage ? `url(${wrapperBackgroundImage})` : undefined,
    backgroundSize: wrapperBackgroundImage ? "cover" : undefined,
    backgroundPosition: wrapperBackgroundImage ? "center" : undefined,
  };
  const selectedWidget = useMemo(() => {
    if (!selectedBlock) return undefined;
    return getWidgetRegistry().find((widget) => widget.type === selectedBlock.type);
  }, [selectedBlock]);
  const selectedWidgetSupportsPreviewState = useMemo(
    () => widgetSupportsPreviewState(selectedWidget),
    [selectedWidget]
  );
  const activeWidgetPreviewStates = useMemo(() => {
    const previewEnabled =
      Boolean(selectedBlock) &&
      (supportsTransientWidgetPreview(selectedBlock?.type) || selectedWidgetSupportsPreviewState);
    if (!selectedBlock || !previewEnabled) {
      return {} as Record<string, WidgetPreviewState | undefined>;
    }
    if (selectedWidgetSupportsPreviewState) {
      return buildActiveWidgetPreviewStates(selectedBlock.id, selectedWidget, widgetPreviewStates);
    }
    const previewState = widgetPreviewStates[selectedBlock.id];
    return previewState
      ? { [selectedBlock.id]: previewState }
      : ({} as Record<string, WidgetPreviewState | undefined>);
  }, [selectedBlock, selectedWidget, selectedWidgetSupportsPreviewState, widgetPreviewStates]);
  const selectedBlockPreviewState = selectedBlock
    ? (activeWidgetPreviewStates[selectedBlock.id] ?? null)
    : null;
  const bookingFlows = useMemo(() => collectBookingFlowSummaries(blocks), [blocks]);
  const previewEnabled = useMemo(
    () =>
      Boolean(selectedBlock) &&
      (supportsTransientWidgetPreview(selectedBlock?.type) || selectedWidgetSupportsPreviewState),
    [selectedBlock, selectedWidgetSupportsPreviewState]
  );
  const widgetTemplateEditorContext = useMemo<WidgetEditorContext | undefined>(() => {
    if (!selectedBlock) return undefined;
    return {
      surface: "page-builder",
      blockId: selectedBlock.id,
      editorMode: selectedBlock.editor?.mode ?? "wizard",
      bookingFlows,
      previewState: previewEnabled ? selectedBlockPreviewState : null,
      setPreviewState: previewEnabled
        ? (state) =>
            setWidgetPreviewStates((current) => ({
              ...current,
              [selectedBlock.id]: state ?? undefined,
            }))
        : undefined,
    };
  }, [bookingFlows, previewEnabled, selectedBlock, selectedBlockPreviewState]);

  useEffect(() => {
    if (isNew || !templateId) {
      clearActiveAssistantSurfaceContext();
      return undefined;
    }

    setActiveAssistantSurfaceContext({
      kind: "widget-template",
      template: {
        id: templateId,
        name: name.trim() || "Untitled template",
        status,
        category: resolvedCategory.trim() || "uncategorized",
      },
      selectedBlockId: selectedId,
      blocks: summarizeTemplateBlocksForAssistant(blocks),
      settings: {
        wrapperContainer: templateLayout.wrapper.container,
        sectionGap: templateLayout.sections.gap,
        hasBackgroundMedia: templateLayout.wrapper.background.media.type !== "none",
      },
      warnings: remoteUpdatePending ? ["template_remote_update_pending"] : [],
    });

    return () => {
      clearActiveAssistantSurfaceContext();
    };
  }, [
    blocks,
    isNew,
    name,
    remoteUpdatePending,
    resolvedCategory,
    selectedId,
    status,
    templateId,
    templateLayout.sections.gap,
    templateLayout.wrapper.background.media.type,
    templateLayout.wrapper.container,
  ]);

  const filteredWidgets = useMemo(() => {
    return widgets.filter((widget) => {
      const matchesCategory = activeCategory === "all" || widget.category === activeCategory;
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
    setSidebarTab("details");
  };

  const handleInsertIntoSlot = (parentId: string, slotId: string, type: string) => {
    const next = createBlock(type);
    setBlocks((prev) => appendSlotBlock(prev, parentId, slotId, next));
    setSelectedId(next.id);
    setSidebarTab("details");
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
    setSelectedId(null);
    setSidebarTab("settings");
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
      const message = isApiClientError(err) ? err.message : "Failed to load template.";
      setError(message);
    } finally {
      if (shouldSetLoading) setIsLoading(false);
    }
  }, [applyTemplate, templateId]);

  useEffect(() => {
    if (!templateId || templateId === "new") return;
    let active = true;
    getWidgetTemplateCached(templateId, { force: true })
      .then((template) => {
        if (!active || !template) return;
        applyTemplate(template);
      })
      .catch((err) => {
        if (!active) return;
        const message = isApiClientError(err) ? err.message : "Failed to load template.";
        setError(message);
      })
      .finally(() => {
        if (active) setIsLoading(false);
      });
    return () => {
      active = false;
    };
  }, [applyTemplate, templateId]);

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
    let active = true;
    listWidgetTemplateCategoriesCached({ force: true })
      .then((result) => {
        if (!active) return;
        setTemplateCategories(result);
        setCategoriesError(null);
        hasHydratedCategoriesRef.current = true;
      })
      .catch(() => {
        if (active && !hasHydratedCategoriesRef.current) {
          setCategoriesError("Failed to load categories.");
        }
      });
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    return subscribeCacheEvents((event) => {
      if (event.key !== cacheKeys.widgetTemplateCategoriesList) return;
      refreshCategories({ force: true, background: true }).catch(() => undefined);
    });
  }, [refreshCategories]);

  const handleSave = async () => {
    if (!name.trim()) {
      setError("Template name is required.");
      return;
    }
    if (!resolvedCategory.trim()) {
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
          category: resolvedCategory.trim(),
          status,
          blocks,
          settings: templateSettings,
        });
        toast.success(`Template ${created.name} created.`);
        navigate(resolveAdminHref(adminBasePath, `/admin/widgets/templates/${created.id}`));
        return;
      }
      if (!templateId) return;
      await updateWidgetTemplate(templateId, {
        name: name.trim(),
        description: description.trim() ? description.trim() : null,
        category: resolvedCategory.trim(),
        status,
        blocks,
        settings: templateSettings,
      });
      setRemoteUpdatePending(false);
      toast.success("Template saved.");
    } catch (err) {
      const message = resolveAdminActionErrorMessage(err, "Failed to save template.");
      setError(message);
      toast.error(message);
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

  const openSettingsPanel = () => {
    setSidebarTab("settings");
    setDetailsOpen(true);
  };

  const openDetailsPanel = () => {
    setSidebarTab("details");
    setDetailsOpen(true);
  };

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

  const templateDetailsPanel = (
    <div className="p-6">
      <BlockSettings
        block={selectedBlock}
        widget={selectedWidget}
        onChange={(next) => setBlocks((prev) => updateBlockById(prev, next.id, () => next))}
        onBlockPatch={
          selectedBlock
            ? (patch) =>
                setBlocks((prev) =>
                  updateBlockById(prev, selectedBlock.id, (current) =>
                    applyWidgetBlockPatch(current, patch)
                  )
                )
            : undefined
        }
        editorContext={widgetTemplateEditorContext}
      />
    </div>
  );

  const templateSettingsPanel = (
    <div className="space-y-4 p-6">
      <div className="space-y-1">
        <p className="text-sm font-medium">Template settings</p>
        <p className="text-xs text-muted-foreground">
          Manage template metadata, category, publish status, and layout defaults.
        </p>
      </div>
      <div className="space-y-4 rounded-xl border p-4">
        <div className="space-y-2">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
            Template name
          </p>
          <Input
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder="Template name"
          />
        </div>
        <div className="space-y-2">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
            Description
          </p>
          <Textarea
            className="min-h-[96px] resize-none text-sm"
            value={description}
            onChange={(event) => setDescription(event.target.value)}
            placeholder="Add description..."
          />
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
              Category
            </p>
            <Select value={resolvedCategory} onValueChange={setCategory}>
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
          <div className="space-y-2">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
              Status
            </p>
            <Select
              value={status}
              onValueChange={(value) => setStatus(value as WidgetTemplateStatus)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="draft">Draft</SelectItem>
                <SelectItem value="published">Published</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>
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
      <div className="grid grid-cols-2 gap-3">
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
                      next === MAX_WIDTH_DEFAULT_VALUE ? undefined : (next as PageMaxWidthToken),
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
              <SelectItem value={MAX_WIDTH_DEFAULT_VALUE}>theme default</SelectItem>
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
      <div className="space-y-4 rounded-xl border p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-sm font-medium">Background media</p>
            <p className="text-xs text-muted-foreground">
              Optional image or video behind the template wrapper.
            </p>
          </div>
        </div>
        <div className="grid gap-3 md:grid-cols-2">
          <div className="space-y-2">
            <label className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
              Media type
            </label>
            <Select
              value={wrapperBackgroundMedia.type}
              onValueChange={handleBackgroundMediaTypeChange}
            >
              <SelectTrigger>
                <SelectValue placeholder="Media type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={PAGE_BACKGROUND_NONE_VALUE}>
                  {backgroundMediaTypeLabelMap.none}
                </SelectItem>
                <SelectItem value="image">{backgroundMediaTypeLabelMap.image}</SelectItem>
                <SelectItem value="video">{backgroundMediaTypeLabelMap.video}</SelectItem>
              </SelectContent>
            </Select>
          </div>
          {wrapperBackgroundMedia.type !== "none" ? (
            <div className="space-y-2">
              <label className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                Source
              </label>
              <Select
                value={wrapperBackgroundMedia.source}
                onValueChange={handleBackgroundMediaSourceChange}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Source" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="library">{backgroundMediaSourceLabelMap.library}</SelectItem>
                  <SelectItem value="external">{backgroundMediaSourceLabelMap.external}</SelectItem>
                </SelectContent>
              </Select>
            </div>
          ) : null}
        </div>
        {wrapperBackgroundMedia.type !== "none" && wrapperBackgroundMedia.source === "external" ? (
          <div className="space-y-2">
            <label className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
              Media URL
            </label>
            <Input
              value={wrapperBackgroundMedia.src ?? ""}
              onChange={(event) => handleBackgroundMediaUrlChange(event.target.value)}
              placeholder={
                wrapperBackgroundMedia.type === "video"
                  ? "https://example.com/background.mp4"
                  : "https://example.com/background.jpg"
              }
            />
          </div>
        ) : null}
        {wrapperBackgroundMedia.type !== "none" && wrapperBackgroundMedia.source === "library" ? (
          <div className="space-y-2">
            <label className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
              Media library
            </label>
            <MediaPicker
              accept={backgroundMediaAccept}
              value={wrapperBackgroundMedia.assetId ?? null}
              onChange={(value) => void handleBackgroundMediaAssetChange(value)}
            />
          </div>
        ) : null}
        {backgroundLookupError ? (
          <p className="text-xs text-destructive">{backgroundLookupError}</p>
        ) : null}
      </div>
    </div>
  );

  return (
    <>
      <AdminShell
        activeHref="/admin/widgets"
        showSearch={false}
        breadcrumbs={["Widgets", "Templates", isNew ? "New Template" : name || "Template"]}
        topbarActions={
          <div className="flex items-center gap-2">
            <Badge variant="secondary" className="ml-2 text-[10px] uppercase">
              {status}
            </Badge>
          </div>
        }
        contentClassName="p-0 overflow-hidden"
      >
        <div className="flex h-full min-h-[calc(100vh-4rem)] flex-col">
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
                    onValueChange={(value) => setActiveCategory(value as WidgetCategoryId | "all")}
                  >
                    <SelectTrigger className="text-xs">
                      <SelectValue placeholder="All widgets" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All widgets</SelectItem>
                      {(Object.keys(widgetCategoryLabels) as WidgetCategoryId[]).map((cat) => (
                        <SelectItem key={cat} value={cat}>
                          {widgetCategoryLabels[cat]}
                        </SelectItem>
                      ))}
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
                "flex-1 overflow-auto bg-[radial-gradient(circle,var(--admin-base-border)_1px,transparent_1px)] bg-[size:24px_24px]"
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
              <div className="sticky top-0 z-10 w-full border-b bg-background/80 px-4 py-2 backdrop-blur">
                <div className="mx-auto flex w-full max-w-3xl items-center gap-1.5">
                  <span className="hidden text-[11px] font-semibold uppercase tracking-wider text-muted-foreground sm:block">
                    Template canvas
                  </span>
                  <div className="flex-1" />
                  <div className="flex items-center gap-1.5 lg:hidden">
                    <Button variant="outline" size="sm" onClick={openSettingsPanel}>
                      Settings
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={openDetailsPanel}
                      disabled={!selectedBlock || !selectedWidget}
                    >
                      Details
                    </Button>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 shrink-0"
                    onClick={() => void handleOpenRevisions()}
                    disabled={isNew}
                    title="History"
                  >
                    <History className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="hidden sm:inline-flex"
                    disabled={isNew}
                    onClick={() => void handlePreviewOpen()}
                  >
                    <Eye className="h-4 w-4" />
                    Preview
                  </Button>
                  <Button
                    variant="outline"
                    size="icon"
                    className="h-8 w-8 shrink-0 sm:hidden"
                    disabled={isNew}
                    onClick={() => void handlePreviewOpen()}
                    title="Preview"
                  >
                    <Eye className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="secondary"
                    size="sm"
                    className="hidden sm:inline-flex"
                    onClick={handleDiscard}
                  >
                    Discard
                  </Button>
                  <Button size="sm" onClick={handleSave} disabled={isSaving}>
                    <Save className="h-4 w-4" />
                    <span className="hidden sm:inline">
                      {isSaving ? "Saving..." : "Save Template"}
                    </span>
                    <span className="sm:hidden">{isSaving ? "..." : "Save"}</span>
                  </Button>
                </div>
              </div>
              <div className="mx-auto flex max-w-3xl flex-col gap-4 px-6 py-8">
                {displayError ? (
                  <Alert variant="destructive">
                    <AlertTitle>Error</AlertTitle>
                    <AlertDescription>{displayError}</AlertDescription>
                  </Alert>
                ) : null}
                {remoteUpdatePending ? (
                  <Alert>
                    <AlertTitle>Updated in another tab</AlertTitle>
                    <AlertDescription className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                      <span>New changes are available. Refresh to load the latest version.</span>
                      <Button variant="outline" size="sm" onClick={() => loadTemplate()}>
                        Refresh
                      </Button>
                    </AlertDescription>
                  </Alert>
                ) : null}
                {isLoading ? (
                  <div className="mx-auto flex w-full max-w-3xl flex-col items-center justify-center rounded-3xl border-2 border-dashed border-border/60 bg-background/40 px-10 py-16 text-center">
                    <div className="mb-6 flex h-20 w-20 items-center justify-center rounded-2xl border border-primary/30 bg-primary/5 text-primary">
                      <Settings2 className="h-10 w-10" />
                    </div>
                    <h2 className="text-2xl font-semibold text-foreground">Loading template</h2>
                  </div>
                ) : blocks.length === 0 ? (
                  <div className="mx-auto flex w-full max-w-3xl flex-col items-center justify-center rounded-3xl border-2 border-dashed border-border/60 bg-background/40 px-10 py-16 text-center">
                    <div className="mb-6 flex h-20 w-20 items-center justify-center rounded-2xl border border-primary/30 bg-primary/5 text-primary">
                      <Settings2 className="h-10 w-10" />
                    </div>
                    <h2 className="text-2xl font-semibold text-foreground">Build your template</h2>
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
                        className={spacingTokenToListSpaceClassMap[templateLayout.sections.gap]}
                        pageDefaults={templateLayout.sections.defaults}
                        selectedId={selectedId}
                        onSelect={(id) => {
                          setSelectedId(id);
                          setSidebarTab("details");
                        }}
                        onMove={(path, from, to) =>
                          setBlocks((prev) => reorderBlocksAtPath(prev, path, from, to))
                        }
                        onDuplicate={(id) => setBlocks((prev) => duplicateBlock(prev, id))}
                        onDelete={(id) =>
                          setBlocks((prev) => {
                            const result = deleteBlockById(prev, id);
                            if (selectedId && !findBlockById(result.blocks, selectedId)) {
                              const nextSelected = getFirstBlockId(result.blocks);
                              setSelectedId(nextSelected);
                              if (!nextSelected) setSidebarTab("settings");
                            }
                            return result.blocks;
                          })
                        }
                        onInsert={handleInsertIntoSlot}
                        onMoveToSlot={handleMoveIntoSlot}
                        previewStatesByBlockId={activeWidgetPreviewStates}
                      />
                    </div>
                  </div>
                )}
              </div>
            </main>

            <aside
              data-slot="card"
              className="hidden w-80 min-h-0 flex-col border-l border-border bg-card lg:flex"
            >
              <Tabs
                value={sidebarTab}
                onValueChange={(value) => setSidebarTab(value as "settings" | "details")}
                className="flex h-full min-h-0 flex-col"
              >
                <TabsList variant="line" className="px-4 pt-3">
                  <TabsTrigger value="settings">Settings</TabsTrigger>
                  <TabsTrigger value="details">Details</TabsTrigger>
                </TabsList>
                <TabsContent value="settings" className="mt-0 min-h-0 flex-1">
                  <ScrollArea className="h-full min-h-0 flex-1">{templateSettingsPanel}</ScrollArea>
                </TabsContent>
                <TabsContent value="details" className="mt-0 min-h-0 flex-1">
                  <ScrollArea className="h-full min-h-0 flex-1">{templateDetailsPanel}</ScrollArea>
                </TabsContent>
              </Tabs>
            </aside>
          </div>
        </div>
      </AdminShell>
      <Sheet open={detailsOpen} onOpenChange={setDetailsOpen}>
        <SheetContent
          side="right"
          className="flex h-full min-h-0 w-full flex-col overflow-hidden p-0 sm:max-w-md"
          showCloseButton={false}
        >
          <div className="flex items-center justify-between border-b px-6 py-4">
            <SheetTitle>Template panel</SheetTitle>
            <SheetClose asChild>
              <Button variant="ghost" size="icon" aria-label="Close">
                <X className="h-4 w-4" />
              </Button>
            </SheetClose>
          </div>
          <Tabs
            value={sidebarTab}
            onValueChange={(value) => setSidebarTab(value as "settings" | "details")}
            className="flex min-h-0 flex-1 flex-col"
          >
            <TabsList variant="line" className="px-6 pt-3">
              <TabsTrigger value="settings">Settings</TabsTrigger>
              <TabsTrigger value="details">Details</TabsTrigger>
            </TabsList>
            <TabsContent value="settings" className="mt-0 min-h-0 flex-1">
              <ScrollArea className="h-full">{templateSettingsPanel}</ScrollArea>
            </TabsContent>
            <TabsContent value="details" className="mt-0 min-h-0 flex-1">
              <ScrollArea className="h-full">{templateDetailsPanel}</ScrollArea>
            </TabsContent>
          </Tabs>
        </SheetContent>
      </Sheet>
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
