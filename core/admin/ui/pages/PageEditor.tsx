import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { Eye, History, Save, Settings2 } from "lucide-react";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetTitle,
} from "@/components/ui/sheet";
import { isApiClientError } from "@/services/apiClient";
import { cacheKeys } from "@/services/cachePolicy";
import {
  autosavePage,
  discardPageRevision,
  getCachedPageDetail,
  getPageCached,
  getPageTemplateOptions,
  listPageRevisions,
  publishPage,
  previewPage,
  restorePageRevision,
  updatePage,
  type PageDetail,
  type PreviewProbeResult,
  type PageRevision,
  type PageTemplateOptionsResponse,
} from "@/services/pagesClient";
import { EditorShell } from "@/ui/layouts/EditorShell";
import { createAdminActionToastAdapter } from "@/ui/shared/actionToasts";
import { subscribeCacheEvents } from "@/utils/cacheBus";
import { DeviceSwitcher } from "@/ui/pages/DeviceSwitcher";
import { RuntimePreviewDialog, type RuntimePreviewDeviceId } from "@/ui/preview/RuntimePreviewDialog";
import {
  clearActiveAssistantSurfaceContext,
  setActiveAssistantSurfaceContext,
} from "@/ui/assistant/activeSurfaceContext";

import { BlockList } from "./builder/BlockList";
import { BlockSettings } from "./builder/BlockSettings";
import { LibraryPanel } from "./builder/LibraryPanel";
import { PageRevisionDrawer } from "./PageRevisionDrawer";
import { PageSettingsDrawer, type PageSettingsValue } from "./PageSettingsDrawer";
import {
  applyWizardSelection,
  appendSlotBlock,
  createBlock,
  deleteBlockById,
  duplicateBlock,
  findBlockById,
  getFirstBlockId,
  moveBlockIntoSlot,
  reorderBlocksAtPath,
  shouldWarnOnNavigate,
  updateBlockById,
  type BlockPath,
} from "./builder/blockUtils";
import type { Block } from "./builder/types";
import { getWidgetRegistry } from "./builder/widgetRegistry";
import { normalizeWidgetBlock } from "../../../widgets/validator";
import {
  normalizePageLayoutSettings,
  type PageMaxWidthToken,
} from "../../../services/pages/layoutSettings";
import { normalizePageRevisionRetentionValue } from "../../../services/pages/revisionRetention";
import { type ContainerToken, type SpacingToken } from "../../../widgets/types";

const heroBlockDefaults = createBlock("hero");
const defaultBlocks: Block[] = [
  applyWizardSelection({
    ...heroBlockDefaults,
    data: {
      ...(heroBlockDefaults.data ?? {}),
      headline: "Build faster with Nextless",
    },
  }),
  createBlock("compare-timeline"),
];

const pageEditorActionToasts = createAdminActionToastAdapter({
  actions: {
    saveDraft: {
      success: "Draft saved.",
      errorFallback: "Failed to save draft.",
    },
    publish: {
      success: "Page published.",
      errorFallback: "Failed to publish page.",
    },
  },
});

const resolvePageId = (pathname: string) => {
  const parts = pathname.split("/").filter(Boolean);
  const pageIndex = parts.findIndex((segment) => segment === "pages");
  if (pageIndex === -1) return null;
  return parts[pageIndex + 1] ?? null;
};

const readBlockDataText = (block: Block, key: string) => {
  const data = block.data;
  if (!data || typeof data !== "object" || Array.isArray(data)) return null;
  const value = (data as Record<string, unknown>)[key];
  return typeof value === "string" && value.trim().length > 0 ? value.trim() : null;
};

const summarizePageBlocksForAssistant = (
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
        templateId: block.type === "template-section" ? readBlockDataText(block, "templateId") : null,
        templateName: block.type === "template-section" ? readBlockDataText(block, "templateName") : null,
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

const normalizeBlocks = (data?: Record<string, unknown> | null) => {
  if (!data || typeof data !== "object") return defaultBlocks;
  const blocks = (data as { blocks?: unknown }).blocks;
  if (!Array.isArray(blocks)) return defaultBlocks;

  try {
    const normalizeTree = (block: Block): Block => {
      const normalized = normalizeWidgetBlock(block as Block);
      const base = createBlock(normalized.type);
      const slots =
        normalized.slots &&
        Object.fromEntries(
          Object.entries(normalized.slots).map(([key, value]) => [
            key,
            Array.isArray(value)
              ? value.map((child) => normalizeTree(child as Block))
              : [],
          ])
        );
      const children =
        normalized.slots || !Array.isArray(normalized.children)
          ? undefined
          : normalized.children.map((child) => normalizeTree(child as Block));
      return {
        ...base,
        ...normalized,
        slots,
        children,
        layout: normalized.layout ?? base.layout,
        visibility: normalized.visibility ?? base.visibility,
        editor: normalized.editor ?? base.editor,
      };
    };

    return blocks.map((block) => normalizeTree(block as Block));
  } catch {
    return defaultBlocks;
  }
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

const isRecord = (value: unknown): value is Record<string, unknown> =>
  Boolean(value) && typeof value === "object" && !Array.isArray(value);

const resolvePageSettings = (
  data: Record<string, unknown>
): PageSettingsValue => {
  const settings = isRecord(data.settings) ? data.settings : {};
  return {
    template:
      typeof settings.template === "string" && settings.template.trim().length > 0
        ? settings.template
        : "landing",
    showInNav:
      typeof settings.showInNav === "boolean" ? settings.showInNav : true,
    layout: normalizePageLayoutSettings(settings.layout),
    revisionRetention: normalizePageRevisionRetentionValue(settings.revisionRetention),
  };
};

const applyPageSettings = (
  data: Record<string, unknown>,
  settingsValue: PageSettingsValue
): Record<string, unknown> => {
  const current = isRecord(data.settings) ? data.settings : {};
  return {
    ...data,
    settings: {
      ...current,
      template: settingsValue.template,
      showInNav: settingsValue.showInNav,
      layout: settingsValue.layout,
      revisionRetention: settingsValue.revisionRetention,
    },
  };
};

export type PageEditorProps = {
  pageId?: string;
  initialPage?: PageDetail | null;
};

type SlotInsertTarget = {
  parentId: string;
  slotId: string;
  slotLabel: string;
  allowedTypes?: string[];
};

export function PageEditor({ pageId: initialPageId, initialPage }: PageEditorProps) {
  const [pageId] = useState<string | null>(() => {
    if (initialPageId ?? initialPage?.id) return initialPageId ?? initialPage?.id ?? null;
    if (typeof window === "undefined") return null;
    return resolvePageId(window.location.pathname);
  });
  const initialCachedPage = useMemo(
    () => (!initialPage && pageId ? getCachedPageDetail(pageId) : null),
    [initialPage, pageId]
  );
  const initialPageDetail = initialPage ?? initialCachedPage;
  const [page, setPage] = useState<PageDetail | null>(initialPageDetail ?? null);
  const [pageData, setPageData] = useState<Record<string, unknown>>(
    initialPageDetail?.currentData ?? { blocks: defaultBlocks }
  );
  const [blocks, setBlocks] = useState<Block[]>(
    normalizeBlocks(initialPageDetail?.currentData)
  );
  const [selectedId, setSelectedId] = useState<string | null>(blocks[0]?.id ?? null);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const hasUnsavedChangesRef = useRef(false);
  const setUnsavedChanges = (value: boolean) => {
    hasUnsavedChangesRef.current = value;
    setHasUnsavedChanges(value);
  };
  const [remoteUpdatePending, setRemoteUpdatePending] = useState(false);
  const [isLoading, setIsLoading] = useState(
    !initialPageDetail && typeof window !== "undefined"
  );
  const [isSaving, setIsSaving] = useState(false);
  const [isPublishing, setIsPublishing] = useState(false);
  const [isUpdatingMeta, setIsUpdatingMeta] = useState(false);
  const [isAutosavingSettings, setIsAutosavingSettings] = useState(false);
  const [metaError, setMetaError] = useState<string | null>(null);
  const [templateOptions, setTemplateOptions] = useState<PageTemplateOptionsResponse | null>(null);
  const [templateOptionsError, setTemplateOptionsError] = useState<string | null>(null);
  const [templateOptionsLoading, setTemplateOptionsLoading] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [revisionsOpen, setRevisionsOpen] = useState(false);
  const [revisions, setRevisions] = useState<PageRevision[]>([]);
  const [revisionsLoading, setRevisionsLoading] = useState(false);
  const [revisionsError, setRevisionsError] = useState<string | null>(null);
  const [restoringRevisionId, setRestoringRevisionId] = useState<string | null>(null);
  const [discardingRevisionId, setDiscardingRevisionId] = useState<string | null>(null);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [previewProbe, setPreviewProbe] = useState<PreviewProbeResult | null>(null);
  const [previewError, setPreviewError] = useState<string | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [previewDevice, setPreviewDevice] = useState<RuntimePreviewDeviceId>("desktop");
  const [libraryTab, setLibraryTab] = useState<"widgets" | "templates" | "forms">("widgets");
  const [mobileLibraryOpen, setMobileLibraryOpen] = useState(false);
  const [mobileDetailsOpen, setMobileDetailsOpen] = useState(false);
  const [slotInsertTarget, setSlotInsertTarget] = useState<SlotInsertTarget | null>(null);
  const [highlightedBlockId, setHighlightedBlockId] = useState<string | null>(null);
  const [pendingScrollBlockId, setPendingScrollBlockId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const selectedBlock = findBlockById(blocks, selectedId);
  const selectedWidget = useMemo(() => {
    if (!selectedBlock) return undefined;
    return getWidgetRegistry().find((widget) => widget.type === selectedBlock.type);
  }, [selectedBlock]);
  const pageSettings = useMemo(() => resolvePageSettings(pageData), [pageData]);
  const pageLayout = pageSettings.layout;
  const wrapperPaddingClass = joinClasses(
    spacingTokenToPaddingTopClassMap[pageLayout.wrapper.padding.top],
    spacingTokenToPaddingBottomClassMap[pageLayout.wrapper.padding.bottom]
  );
  const wrapperContainerClass = joinClasses(
    pageContainerClassMap[pageLayout.wrapper.container],
    pageLayout.wrapper.container !== "full" && pageLayout.wrapper.maxWidth
      ? pageMaxWidthClassMap[pageLayout.wrapper.maxWidth]
      : undefined
  );
  const wrapperBackgroundMedia = pageLayout.wrapper.background.media;
  const wrapperBackgroundImage =
    wrapperBackgroundMedia.type === "image"
      ? wrapperBackgroundMedia.src ?? pageLayout.wrapper.background.image ?? null
      : null;
  const wrapperBackgroundVideo =
    wrapperBackgroundMedia.type === "video"
      ? wrapperBackgroundMedia.src
      : null;
  const wrapperBackgroundStyle = {
    backgroundColor: pageLayout.wrapper.background.color,
    backgroundImage: wrapperBackgroundImage
      ? `url(${wrapperBackgroundImage})`
      : undefined,
    backgroundSize: wrapperBackgroundImage ? "cover" : undefined,
    backgroundPosition: wrapperBackgroundImage ? "center" : undefined,
  };

  useEffect(() => {
    if (!page || !pageId) {
      clearActiveAssistantSurfaceContext();
      return undefined;
    }

    setActiveAssistantSurfaceContext({
      kind: "page",
      page: {
        id: page.id,
        title: page.title,
        slug: page.slug,
        status: page.status,
        template: pageSettings.template || null,
      },
      selectedBlockId: selectedId,
      blocks: summarizePageBlocksForAssistant(blocks),
      warnings: hasUnsavedChanges ? ["page_has_unsaved_changes"] : [],
    });

    return () => {
      clearActiveAssistantSurfaceContext();
    };
  }, [blocks, hasUnsavedChanges, page, pageId, pageSettings.template, selectedId]);

  const applyPage = useCallback(
    (result: PageDetail, options?: { preserveSelection?: boolean }) => {
      setPage(result);
      const nextData = result.currentData ?? { blocks: defaultBlocks };
      setPageData(nextData as Record<string, unknown>);
      const nextBlocks = normalizeBlocks(result.currentData as Record<string, unknown>);
      setBlocks(nextBlocks);
      setSelectedId((current) => {
        if (options?.preserveSelection && current) {
          return findBlockById(nextBlocks, current) ? current : nextBlocks[0]?.id ?? null;
        }
        return nextBlocks[0]?.id ?? null;
      });
      setUnsavedChanges(false);
      setRemoteUpdatePending(false);
      setHighlightedBlockId(null);
      setPendingScrollBlockId(null);
    },
    []
  );

  const focusInsertedBlock = useCallback((blockId: string) => {
    setSelectedId(blockId);
    setHighlightedBlockId(blockId);
    setPendingScrollBlockId(blockId);
  }, []);

  useEffect(() => {
    if (typeof window === "undefined" || !highlightedBlockId) return;
    const timerId = window.setTimeout(() => {
      setHighlightedBlockId((current) =>
        current === highlightedBlockId ? null : current
      );
    }, 2000);
    return () => {
      window.clearTimeout(timerId);
    };
  }, [highlightedBlockId]);

  useLayoutEffect(() => {
    if (
      typeof document === "undefined" ||
      typeof window === "undefined" ||
      !pendingScrollBlockId
    ) {
      return;
    }

    const escapedId = pendingScrollBlockId.replace(/["\\]/g, "\\$&");
    const target = document.querySelector(
      `[data-block-id="${escapedId}"]`
    ) as HTMLElement | null;
    if (!target) return;
    target.scrollIntoView({ behavior: "smooth", block: "start" });
    const focusTarget = target.querySelector<HTMLElement>("[data-block-select='true']");
    focusTarget?.focus({ preventScroll: true });
    const frameId = window.requestAnimationFrame(() => setPendingScrollBlockId(null));
    return () => window.cancelAnimationFrame(frameId);
  }, [blocks, pendingScrollBlockId]);

  const refreshPage = useCallback(
    async (options?: { allowUnsaved?: boolean; setLoading?: boolean }) => {
      if (!pageId) return;
      const shouldSetLoading = options?.setLoading !== false;
      if (shouldSetLoading) setIsLoading(true);
      setError(null);
      try {
        const result = await getPageCached(pageId, { force: true });
        if (!result) return;
        if (!options?.allowUnsaved && hasUnsavedChangesRef.current) {
          setRemoteUpdatePending(true);
          return;
        }
        applyPage(result, { preserveSelection: true });
      } catch (err) {
        if (isApiClientError(err)) {
          setError(err.message);
        } else {
          setError("Failed to load page.");
        }
      } finally {
        if (shouldSetLoading) setIsLoading(false);
      }
    },
    [applyPage, pageId]
  );

  useEffect(() => {
    if (!pageId) return;
    if (initialPage) return;
    let active = true;
    getPageCached(pageId, { force: true })
      .then((result) => {
        if (!active || !result) return;
        if (hasUnsavedChangesRef.current) {
          setRemoteUpdatePending(true);
          return;
        }
        applyPage(result, { preserveSelection: true });
      })
      .catch((err) => {
        if (!active) return;
        if (isApiClientError(err)) {
          setError(err.message);
        } else {
          setError("Failed to load page.");
        }
      })
      .finally(() => {
        if (active && !initialCachedPage) setIsLoading(false);
      });
    return () => {
      active = false;
    };
  }, [applyPage, initialCachedPage, initialPage, pageId]);

  useEffect(() => {
    if (!pageId) return;
    return subscribeCacheEvents((event) => {
      if (event.key !== cacheKeys.pageDetail(pageId)) return;
      refreshPage({ setLoading: false }).catch(() => undefined);
    });
  }, [pageId, refreshPage]);

  const loadTemplateOptions = useCallback(async () => {
    setTemplateOptionsLoading(true);
    setTemplateOptionsError(null);
    try {
      const payload = await getPageTemplateOptions();
      setTemplateOptions(payload);
    } catch (err) {
      if (isApiClientError(err)) {
        setTemplateOptionsError(err.message);
      } else {
        setTemplateOptionsError("Failed to load template options.");
      }
    } finally {
      setTemplateOptionsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!settingsOpen) return;
    if (templateOptions || templateOptionsError) return;
    let active = true;
    getPageTemplateOptions()
      .then((payload) => {
        if (active) setTemplateOptions(payload);
      })
      .catch((err) => {
        if (!active) return;
        if (isApiClientError(err)) {
          setTemplateOptionsError(err.message);
        } else {
          setTemplateOptionsError("Failed to load template options.");
        }
      })
      .finally(() => {
        if (active) setTemplateOptionsLoading(false);
      });
    return () => {
      active = false;
    };
  }, [
    settingsOpen,
    templateOptions,
    templateOptionsError,
  ]);

  const refreshRevisions = useCallback(
    async () => {
      if (!pageId) return;
      setRevisionsLoading(true);
      setRevisionsError(null);
      try {
        const items = await listPageRevisions(pageId);
        setRevisions(items);
      } catch (err) {
        if (isApiClientError(err)) {
          setRevisionsError(err.message);
        } else {
          setRevisionsError("Failed to load page history.");
        }
      } finally {
        setRevisionsLoading(false);
      }
    },
    [pageId]
  );

  const handleSettingsOpenChange = (nextOpen: boolean) => {
    if (
      nextOpen &&
      !templateOptions &&
      !templateOptionsLoading &&
      !templateOptionsError
    ) {
      setTemplateOptionsLoading(true);
      setTemplateOptionsError(null);
    }
    setSettingsOpen(nextOpen);
  };

  const handleRevisionsOpenChange = (nextOpen: boolean) => {
    if (nextOpen && pageId) {
      setRevisionsLoading(true);
      setRevisionsError(null);
    }
    setRevisionsOpen(nextOpen);
  };

  useEffect(() => {
    if (!revisionsOpen) return;
    if (!pageId) return;
    let active = true;
    listPageRevisions(pageId)
      .then((items) => {
        if (active) setRevisions(items);
      })
      .catch((err) => {
        if (!active) return;
        if (isApiClientError(err)) {
          setRevisionsError(err.message);
        } else {
          setRevisionsError("Failed to load page history.");
        }
      })
      .finally(() => {
        if (active) setRevisionsLoading(false);
      });
    return () => {
      active = false;
    };
  }, [pageId, revisionsOpen]);

  useEffect(() => {
    const handler = (event: BeforeUnloadEvent) => {
      if (!shouldWarnOnNavigate(hasUnsavedChanges)) return;
      event.preventDefault();
      event.returnValue = "";
    };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [hasUnsavedChanges]);

  const updateBlocks = (next: Block[]) => {
    setBlocks(next);
    setPageData((prev) => ({ ...prev, blocks: next }));
    setUnsavedChanges(true);
  };

  const buildNewBlock = (type: string) => {
    const nextBlock = createBlock(type);
    if (!pageLayout.applyDefaultsToNewBlocks) {
      return nextBlock;
    }
    const baseLayout = nextBlock.layout ?? {
      container: "default",
      padding: { top: "xl", bottom: "xl" },
      margin: { top: "none", bottom: "none" },
      background: { color: "transparent", image: null },
    };
    return {
      ...nextBlock,
      layout: {
        ...baseLayout,
        background: {
          color: baseLayout.background?.color ?? "transparent",
          image: baseLayout.background?.image ?? null,
        },
        container: pageLayout.sections.defaults.container,
        padding: {
          top: pageLayout.sections.defaults.padding.top,
          bottom: pageLayout.sections.defaults.padding.bottom,
        },
        margin: {
          top: pageLayout.sections.defaults.margin.top,
          bottom: pageLayout.sections.defaults.margin.bottom,
        },
      },
    };
  };

  const handleAddBlock = (type: string) => {
    if (slotInsertTarget) {
      handleInsertIntoSlot(slotInsertTarget.parentId, slotInsertTarget.slotId, type);
      setSlotInsertTarget(null);
      if (mobileLibraryOpen) setMobileLibraryOpen(false);
      return;
    }
    const nextBlock = buildNewBlock(type);
    updateBlocks([...blocks, nextBlock]);
    focusInsertedBlock(nextBlock.id);
    if (mobileLibraryOpen) setMobileLibraryOpen(false);
  };

  const handleAddTemplateSection = (template: { id: string; name: string }) => {
    const nextBlock = buildNewBlock("template-section");
    const nextData = {
      ...(nextBlock.data as Record<string, unknown>),
      templateId: template.id,
      templateName: template.name,
    };
    const finalized = { ...nextBlock, data: nextData };
    updateBlocks([...blocks, finalized]);
    focusInsertedBlock(finalized.id);
    if (mobileLibraryOpen) setMobileLibraryOpen(false);
  };

  const handleAddForm = (form: { id: string; name: string }) => {
    const nextBlock = buildNewBlock("form-embed");
    const nextData = {
      ...(nextBlock.data as Record<string, unknown>),
      formId: form.id,
      title: form.name,
    };
    const finalized = { ...nextBlock, data: nextData };
    updateBlocks([...blocks, finalized]);
    focusInsertedBlock(finalized.id);
    if (mobileLibraryOpen) setMobileLibraryOpen(false);
  };

  const handleInsertIntoSlot = (parentId: string, slotId: string, type: string) => {
    const nextBlock = buildNewBlock(type);
    updateBlocks(appendSlotBlock(blocks, parentId, slotId, nextBlock));
    focusInsertedBlock(nextBlock.id);
  };

  const handleOpenSlotInsert = (target: SlotInsertTarget) => {
    setLibraryTab("widgets");
    setSlotInsertTarget(target);
    if (
      typeof window !== "undefined" &&
      typeof window.matchMedia === "function" &&
      window.matchMedia("(max-width: 1023px)").matches
    ) {
      setMobileLibraryOpen(true);
    }
  };

  const handleMoveIntoSlot = (blockId: string, parentId: string, slotId: string) => {
    updateBlocks(moveBlockIntoSlot(blocks, blockId, parentId, slotId));
  };

  const handleMove = (path: BlockPath, from: number, to: number) => {
    if (to < 0) return;
    updateBlocks(reorderBlocksAtPath(blocks, path, from, to));
  };

  const handleDuplicate = (id: string) => {
    updateBlocks(duplicateBlock(blocks, id));
  };

  const handleDelete = (id: string) => {
    const result = deleteBlockById(blocks, id);
    if (!result.deleted) return;
    updateBlocks(result.blocks);
    if (selectedId && !findBlockById(result.blocks, selectedId)) {
      setSelectedId(getFirstBlockId(result.blocks));
    }
  };

  const handleChangeBlock = (next: Block) => {
    updateBlocks(updateBlockById(blocks, next.id, () => next));
  };

  const handleSaveDraft = async () => {
    if (!pageId) return;
    setIsSaving(true);
    setError(null);
    try {
      const updated = await updatePage(pageId, {
        data: pageData,
      });
      setPage(updated);
      setUnsavedChanges(false);
      setRemoteUpdatePending(false);
      pageEditorActionToasts.success("saveDraft");
    } catch (err) {
      const message = pageEditorActionToasts.error("saveDraft", err);
      setError(message);
    } finally {
      setIsSaving(false);
    }
  };

  const handlePublish = async () => {
    if (!pageId) return;
    setIsPublishing(true);
    setError(null);
    try {
      await publishPage(pageId, pageData);
      const updated = await getPageCached(pageId, { force: true });
      if (updated) {
        applyPage(updated, { preserveSelection: true });
      } else {
        setUnsavedChanges(false);
        setRemoteUpdatePending(false);
      }
      pageEditorActionToasts.success("publish");
    } catch (err) {
      const message = pageEditorActionToasts.error("publish", err);
      setError(message);
    } finally {
      setIsPublishing(false);
    }
  };

  const handlePreview = async () => {
    setPreviewOpen(true);
    if (!pageId) {
      setPreviewUrl(null);
      setPreviewProbe(null);
      setPreviewError(null);
      setPreviewLoading(false);
      return;
    }
    setPreviewLoading(true);
    setPreviewError(null);
    setPreviewProbe(null);
    try {
      const { previewUrl, probe } = await previewPage(pageId, { probe: true });
      setPreviewUrl(previewUrl);
      setPreviewProbe(probe ?? null);
    } catch (err) {
      if (isApiClientError(err)) {
        setPreviewError(err.message);
      } else {
        setPreviewError("Failed to generate preview.");
      }
      setPreviewUrl(null);
      setPreviewProbe(null);
    } finally {
      setPreviewLoading(false);
    }
  };

  const handleSaveSettings = async (payload: {
    title: string;
    slug: string;
    settings: PageSettingsValue;
  }): Promise<boolean> => {
    if (!pageId) return false;
    setMetaError(null);
    setIsUpdatingMeta(true);
    try {
      const persistedData = isRecord(page?.currentData)
        ? (page.currentData as Record<string, unknown>)
        : { blocks: defaultBlocks };
      const nextPersistedData = applyPageSettings(persistedData, payload.settings);
      const updated = await updatePage(pageId, {
        title: payload.title,
        slug: payload.slug,
        data: nextPersistedData,
      });
      if (updated) {
        setPage((prev) => (prev ? { ...prev, ...updated } : updated));
      }
      setPageData((prev) => applyPageSettings(prev, payload.settings));
      setRemoteUpdatePending(false);
      setSettingsOpen(false);
      await refreshRevisions();
      return true;
    } catch (err) {
      if (isApiClientError(err)) {
        setMetaError(err.message);
      } else {
        setMetaError("Failed to update page settings.");
      }
      return false;
    } finally {
      setIsUpdatingMeta(false);
    }
  };

  const handleAutosaveSettings = async (payload: {
    title: string;
    slug: string;
    settings: PageSettingsValue;
  }) => {
    if (!pageId) return;
    setMetaError(null);
    setIsAutosavingSettings(true);
    try {
      const persistedData = isRecord(page?.currentData)
        ? (page.currentData as Record<string, unknown>)
        : { blocks: defaultBlocks };
      const nextPersistedData = applyPageSettings(persistedData, payload.settings);
      await autosavePage(pageId, {
        title: payload.title,
        slug: payload.slug,
        data: nextPersistedData,
      });
      await refreshRevisions();
    } catch (err) {
      if (isApiClientError(err)) {
        setMetaError(err.message);
      } else {
        setMetaError("Failed to autosave page settings.");
      }
    } finally {
      setIsAutosavingSettings(false);
    }
  };

  const handleRestoreRevision = async (revisionId: string) => {
    if (!pageId) return;
    setRestoringRevisionId(revisionId);
    setRevisionsError(null);
    try {
      const result = await restorePageRevision(pageId, revisionId);
      if (result?.page) {
        applyPage(result.page, { preserveSelection: true });
      }
      await refreshRevisions();
    } catch (err) {
      if (isApiClientError(err)) {
        setRevisionsError(err.message);
      } else {
        setRevisionsError("Failed to restore revision.");
      }
    } finally {
      setRestoringRevisionId(null);
    }
  };

  const handleDiscardRevision = async (revisionId: string) => {
    if (!pageId) return;
    setDiscardingRevisionId(revisionId);
    setRevisionsError(null);
    try {
      await discardPageRevision(pageId, revisionId);
      await refreshRevisions();
    } catch (err) {
      if (isApiClientError(err)) {
        setRevisionsError(err.message);
      } else {
        setRevisionsError("Failed to discard autosave.");
      }
    } finally {
      setDiscardingRevisionId(null);
    }
  };

  const status = page?.status ?? "draft";
  const title = page?.title ?? "Homepage";
  const renderLibraryPanel = () => (
    <LibraryPanel
      onAddWidget={handleAddBlock}
      onAddTemplate={handleAddTemplateSection}
      onAddForm={handleAddForm}
      activeTab={libraryTab}
      onActiveTabChange={(nextTab) => {
        setLibraryTab(nextTab);
        if (nextTab !== "widgets" && slotInsertTarget) {
          setSlotInsertTarget(null);
        }
      }}
      widgetAllowedTypes={slotInsertTarget?.allowedTypes ?? null}
      widgetContextLabel={slotInsertTarget?.slotLabel ?? null}
      onClearWidgetContext={() => setSlotInsertTarget(null)}
    />
  );

  return (
    <EditorShell
      activeHref="/admin/pages"
      leftPanel={renderLibraryPanel()}
      rightPanel={
        <BlockSettings
          block={selectedBlock}
          widget={selectedWidget}
          onChange={handleChangeBlock}
        />
      }
      rightPanelClassName="p-6"
      breadcrumbs={
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <span>Pages</span>
          <span>/</span>
          <span className="text-foreground">{title}</span>
          <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-semibold uppercase text-amber-800">
            {status === "published" ? "Published" : "Draft"}
          </span>
          {hasUnsavedChanges ? (
            <span className="rounded-full bg-rose-100 px-2 py-0.5 text-[10px] font-semibold uppercase text-rose-700">
              Unsaved changes
            </span>
          ) : null}
        </div>
      }
    >
      <div className="sticky top-0 z-10 w-full border-b bg-background/80 px-4 py-3 backdrop-blur">
        <div className="mx-auto flex w-full max-w-3xl flex-col gap-2">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="space-y-1">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                Runtime preview device
              </p>
              <DeviceSwitcher value={previewDevice} onChange={setPreviewDevice} />
            </div>
            <Button
              variant="outline"
              size="sm"
              className="gap-2"
              onClick={handlePreview}
              disabled={isLoading}
            >
              <Eye className="h-4 w-4" />
              Runtime preview
            </Button>
          </div>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <Button
              variant="secondary"
              size="sm"
              className="gap-2"
              onClick={handleSaveDraft}
              disabled={isSaving || isLoading}
            >
              <Save className="h-4 w-4" />
              {isSaving ? "Saving..." : "Save draft"}
            </Button>
            <Button
              size="sm"
              className="gap-2"
              onClick={handlePublish}
              disabled={isPublishing || isLoading}
            >
              <Eye className="h-4 w-4" />
              {isPublishing ? "Publishing..." : "Publish"}
            </Button>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              className="gap-2"
              onClick={() => handleSettingsOpenChange(true)}
              disabled={!page}
            >
              <Settings2 className="h-4 w-4" />
              Page settings
            </Button>
            <div className="ml-auto flex flex-wrap items-center gap-2">
              <Button
                variant="ghost"
                size="sm"
                className="gap-2"
                onClick={() => handleRevisionsOpenChange(true)}
                disabled={!page}
              >
                <History className="h-4 w-4" />
                History
              </Button>
              <div className="flex flex-wrap items-center gap-2 lg:hidden">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setMobileLibraryOpen(true)}
                >
                  Components
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setMobileDetailsOpen(true)}
                  disabled={!selectedBlock || !selectedWidget}
                >
                  Details
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>
      <div className="mx-auto flex max-w-3xl flex-col gap-4 px-6 py-8">
        {error ? (
          <Alert variant="destructive">
            <AlertTitle>Page error</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        ) : null}
        {metaError ? (
          <Alert variant="destructive">
            <AlertTitle>Page settings error</AlertTitle>
            <AlertDescription>{metaError}</AlertDescription>
          </Alert>
        ) : null}
        {remoteUpdatePending ? (
          <Alert>
            <AlertTitle>Updated in another tab</AlertTitle>
            <AlertDescription className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <span>New changes are available. Refresh to load the latest version.</span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => refreshPage({ allowUnsaved: true })}
              >
                Refresh
              </Button>
            </AlertDescription>
          </Alert>
        ) : null}
        {isLoading ? (
          <div className="rounded-xl border bg-card/60 p-6 text-sm text-muted-foreground shadow-sm">
            Loading page...
          </div>
        ) : (
          <div
            className={joinClasses(
              "relative w-full overflow-hidden rounded-xl border border-border/50",
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
                className={spacingTokenToListSpaceClassMap[pageLayout.sections.gap]}
                pageDefaults={pageLayout.sections.defaults}
                selectedId={selectedId}
                highlightedId={highlightedBlockId}
                onSelect={setSelectedId}
                onMove={handleMove}
                onDuplicate={handleDuplicate}
                onDelete={handleDelete}
                onInsert={handleInsertIntoSlot}
                onMoveToSlot={handleMoveIntoSlot}
                onOpenSlotInsert={handleOpenSlotInsert}
              />
            </div>
          </div>
        )}
      </div>
      <PageSettingsDrawer
        key={`${page?.id ?? "page-settings"}-${settingsOpen ? "open" : "closed"}`}
        open={settingsOpen}
        onOpenChange={handleSettingsOpenChange}
        page={page}
        settings={pageSettings}
        templateOptions={templateOptions?.templates ?? null}
        templateOptionsLoading={templateOptionsLoading}
        templateOptionsError={templateOptionsError}
        onRetryTemplateOptions={() => {
          void loadTemplateOptions();
        }}
        onSave={handleSaveSettings}
        onAutosave={handleAutosaveSettings}
        isSubmitting={isUpdatingMeta}
        isAutosaving={isAutosavingSettings}
        error={null}
      />
      <PageRevisionDrawer
        open={revisionsOpen}
        onOpenChange={handleRevisionsOpenChange}
        revisions={revisions}
        isLoading={revisionsLoading}
        error={revisionsError}
        restoringId={restoringRevisionId}
        discardingId={discardingRevisionId}
        onRestore={(revisionId) => {
          handleRestoreRevision(revisionId).catch(() => undefined);
        }}
        onDiscard={(revisionId) => {
          handleDiscardRevision(revisionId).catch(() => undefined);
        }}
      />
      <RuntimePreviewDialog
        open={previewOpen}
        onOpenChange={setPreviewOpen}
        title="Page Preview"
        subtitle="Runtime preview (read-only, site theme)."
        canPreview={Boolean(pageId)}
        previewUrl={previewUrl}
        probeResult={previewProbe}
        isLoading={previewLoading}
        error={previewError}
        cannotPreviewMessage="Save this page first to generate a runtime preview."
        iframeTitle="Page runtime preview"
        device={previewDevice}
        onDeviceChange={setPreviewDevice}
        onFixPreviewTarget={() => {
          setPreviewOpen(false);
          setSettingsOpen(true);
        }}
        fixPreviewTargetLabel="Open page settings"
      />
      <Sheet open={mobileLibraryOpen} onOpenChange={setMobileLibraryOpen}>
        <SheetContent side="left" className="w-80 p-0">
          <SheetTitle className="sr-only">Components</SheetTitle>
          <SheetDescription className="sr-only">
            Browse available components and widgets.
          </SheetDescription>
          <div className="flex h-full min-h-0 flex-col overflow-hidden">
            {renderLibraryPanel()}
          </div>
        </SheetContent>
      </Sheet>
      <Sheet open={mobileDetailsOpen} onOpenChange={setMobileDetailsOpen}>
        <SheetContent side="right" className="w-80 p-0">
          <SheetTitle className="sr-only">Block details</SheetTitle>
          <SheetDescription className="sr-only">
            Edit settings for the selected block.
          </SheetDescription>
          <div className="flex h-full flex-col overflow-y-auto p-6">
            <BlockSettings
              block={selectedBlock}
              widget={selectedWidget}
              onChange={handleChangeBlock}
            />
          </div>
        </SheetContent>
      </Sheet>
    </EditorShell>
  );
}
