import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Eye, History, RefreshCcw, RotateCcw, Save, Trash2 } from "lucide-react";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { Sheet, SheetContent, SheetDescription, SheetTitle } from "@/components/ui/sheet";
import { isApiClientError } from "@/services/apiClient";
import { cacheKeys } from "@/services/cachePolicy";
import {
  autosaveDetailPage,
  discardDetailPageRevision,
  getCachedDetailPage,
  getDetailPageCached,
  listDetailPageRevisions,
  previewDetailPage,
  publishDetailPage,
  restoreDetailPageRevision,
  unpublishDetailPage,
  updateDetailPage,
  type DetailPageRecord,
  type DetailPageRevisionSummary,
} from "@/services/detailPagesClient";
import { getCachedEntries, listEntriesCached, type EntrySummary } from "@/services/entriesClient";
import { useAdminRouter } from "@/ui/contexts/AdminRouterContext";
import { EditorShell } from "@/ui/layouts/EditorShell";
import { BlockList } from "@/ui/pages/builder/BlockList";
import { BlockSettings } from "@/ui/pages/builder/BlockSettings";
import { LibraryPanel } from "@/ui/pages/builder/LibraryPanel";
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
  type BlockPath,
} from "@/ui/pages/builder/blockUtils";
import type { Block } from "@/ui/pages/builder/types";
import { getWidgetRegistry } from "@/ui/pages/builder/widgetRegistry";
import { RuntimePreviewDialog } from "@/ui/preview/RuntimePreviewDialog";
import { createAdminActionToastAdapter } from "@/ui/shared/actionToasts";
import { subscribeCacheEvents } from "@/utils/cacheBus";
import type { DetailPageDocument } from "../../../services/content/detailPageTypes";
import type { PageMaxWidthToken } from "../../../services/pages/layoutSettings";
import type { ContainerToken, SpacingToken } from "../../../widgets/types";

import {
  buildDetailTemplateDocumentUpdate,
  normalizeDetailTemplateDocument,
  resolveDetailTemplateEditorRoute,
} from "./detailTemplateEditorModel";

type SlotInsertTarget = {
  parentId: string;
  slotId: string;
  slotLabel: string;
  allowedTypes?: string[];
};

const editorToasts = createAdminActionToastAdapter({
  actions: {
    saveDraft: {
      success: "Detail template saved.",
      errorFallback: "Failed to save detail template.",
    },
    autosave: {
      success: "Detail template autosaved.",
      errorFallback: "Failed to autosave detail template.",
    },
    publish: {
      success: "Detail template published.",
      errorFallback: "Failed to publish detail template.",
    },
    unpublish: {
      success: "Detail template unpublished.",
      errorFallback: "Failed to unpublish detail template.",
    },
    restore: {
      success: "Detail template revision restored.",
      errorFallback: "Failed to restore detail template revision.",
    },
    discard: {
      success: "Detail template autosave discarded.",
      errorFallback: "Failed to discard detail template autosave.",
    },
  },
});

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

const formatStatusBadgeClassName = (status: string) =>
  status === "published"
    ? "rounded-full border border-emerald-500/20 bg-emerald-500/10 px-2 py-0.5 text-[10px] font-semibold uppercase text-emerald-600"
    : "rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-semibold uppercase text-amber-800";

const formatTimestamp = (value: string) => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
};

const getErrorMessage = (error: unknown, fallback: string) =>
  isApiClientError(error) ? error.message : fallback;

const toEditorState = (record: DetailPageRecord) => {
  const document = normalizeDetailTemplateDocument(record);
  return {
    record,
    document,
    blocks: document.blocks as Block[],
    name: document.name,
    titlePattern: document.titlePattern,
  };
};

export function DetailTemplateEditorPage() {
  const { path } = useAdminRouter();
  const route = useMemo(() => resolveDetailTemplateEditorRoute(path), [path]);
  const detailPageId = route?.detailPageId ?? null;
  const initialRecord = useMemo(
    () => (detailPageId ? getCachedDetailPage(detailPageId) : null),
    [detailPageId]
  );
  const initialState = initialRecord ? toEditorState(initialRecord) : null;

  const [record, setRecord] = useState<DetailPageRecord | null>(initialState?.record ?? null);
  const [document, setDocument] = useState<DetailPageDocument | null>(
    initialState?.document ?? null
  );
  const [blocks, setBlocks] = useState<Block[]>(initialState?.blocks ?? []);
  const [name, setName] = useState(initialState?.name ?? "");
  const [titlePattern, setTitlePattern] = useState(initialState?.titlePattern ?? "{title}");
  const [selectedId, setSelectedId] = useState<string | null>(initialState?.blocks[0]?.id ?? null);
  const [sampleEntries, setSampleEntries] = useState<EntrySummary[]>(() =>
    initialState?.document.contentTypeSlug
      ? (getCachedEntries(initialState.document.contentTypeSlug) ?? [])
      : []
  );
  const [selectedSampleEntryId, setSelectedSampleEntryId] = useState(
    () => sampleEntries[0]?.id ?? ""
  );
  const [sampleEntriesLoading, setSampleEntriesLoading] = useState(false);
  const [sampleEntriesError, setSampleEntriesError] = useState<string | null>(null);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const hasUnsavedChangesRef = useRef(false);
  const [remoteUpdatePending, setRemoteUpdatePending] = useState(false);
  const [isLoading, setIsLoading] = useState(Boolean(detailPageId && !initialRecord));
  const [isSaving, setIsSaving] = useState(false);
  const [isAutosaving, setIsAutosaving] = useState(false);
  const [isPublishing, setIsPublishing] = useState(false);
  const mutationInFlightRef = useRef(false);
  const [error, setError] = useState<string | null>(null);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [revisions, setRevisions] = useState<DetailPageRevisionSummary[]>([]);
  const [revisionsLoading, setRevisionsLoading] = useState(false);
  const [revisionsError, setRevisionsError] = useState<string | null>(null);
  const [restoringRevisionId, setRestoringRevisionId] = useState<string | null>(null);
  const [discardingRevisionId, setDiscardingRevisionId] = useState<string | null>(null);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [previewError, setPreviewError] = useState<string | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [libraryTab, setLibraryTab] = useState<"widgets" | "templates" | "forms">("widgets");
  const [mobileLibraryOpen, setMobileLibraryOpen] = useState(false);
  const [mobileDetailsOpen, setMobileDetailsOpen] = useState(false);
  const [slotInsertTarget, setSlotInsertTarget] = useState<SlotInsertTarget | null>(null);

  const selectedBlock = findBlockById(blocks, selectedId);
  const selectedWidget = useMemo(() => {
    if (!selectedBlock) return undefined;
    return getWidgetRegistry().find((widget) => widget.type === selectedBlock.type);
  }, [selectedBlock]);

  const layout = document?.settings.layout;
  const wrapperPaddingClass = layout
    ? joinClasses(
        spacingTokenToPaddingTopClassMap[layout.wrapper.padding.top],
        spacingTokenToPaddingBottomClassMap[layout.wrapper.padding.bottom]
      )
    : "";
  const wrapperContainerClass = layout
    ? joinClasses(
        pageContainerClassMap[layout.wrapper.container],
        layout.wrapper.container !== "full" && layout.wrapper.maxWidth
          ? pageMaxWidthClassMap[layout.wrapper.maxWidth]
          : undefined
      )
    : "mx-auto w-full max-w-6xl";
  const wrapperBackgroundMedia = layout?.wrapper.background.media;
  const wrapperBackgroundImage =
    wrapperBackgroundMedia?.type === "image"
      ? (wrapperBackgroundMedia.src ?? layout?.wrapper.background.image ?? null)
      : null;
  const wrapperBackgroundVideo =
    wrapperBackgroundMedia?.type === "video" ? wrapperBackgroundMedia.src : null;
  const wrapperBackgroundStyle = {
    backgroundColor: layout?.wrapper.background.color ?? "transparent",
    backgroundImage: wrapperBackgroundImage ? `url(${wrapperBackgroundImage})` : undefined,
    backgroundSize: wrapperBackgroundImage ? "cover" : undefined,
    backgroundPosition: wrapperBackgroundImage ? "center" : undefined,
  };

  const setUnsavedChanges = useCallback((value: boolean) => {
    hasUnsavedChangesRef.current = value;
    setHasUnsavedChanges(value);
  }, []);

  const applyRecord = useCallback(
    (nextRecord: DetailPageRecord) => {
      const next = toEditorState(nextRecord);
      setRecord(next.record);
      setDocument(next.document);
      setBlocks(next.blocks);
      setName(next.name);
      setTitlePattern(next.titlePattern);
      setSelectedId((current) =>
        current && findBlockById(next.blocks, current) ? current : (next.blocks[0]?.id ?? null)
      );
      setUnsavedChanges(false);
      setRemoteUpdatePending(false);
    },
    [setUnsavedChanges]
  );

  const refreshDetailTemplate = useCallback(
    async (options?: { allowUnsaved?: boolean; setLoading?: boolean }) => {
      if (!detailPageId) {
        setError("Missing detail template id.");
        setIsLoading(false);
        return;
      }

      if (options?.setLoading !== false) setIsLoading(true);
      setError(null);
      try {
        const result = await getDetailPageCached(detailPageId, { force: true });
        if (!options?.allowUnsaved && hasUnsavedChangesRef.current) {
          setRemoteUpdatePending(true);
          return;
        }
        applyRecord(result);
      } catch (err) {
        setError(getErrorMessage(err, "Failed to load detail template."));
      } finally {
        if (options?.setLoading !== false) setIsLoading(false);
      }
    },
    [applyRecord, detailPageId]
  );

  useEffect(() => {
    if (!detailPageId) {
      return undefined;
    }

    let active = true;
    getDetailPageCached(detailPageId, { force: true })
      .then((result) => {
        if (!active) return;
        if (hasUnsavedChangesRef.current) {
          setRemoteUpdatePending(true);
          return;
        }
        applyRecord(result);
      })
      .catch((err) => {
        if (!active) return;
        setError(getErrorMessage(err, "Failed to load detail template."));
      })
      .finally(() => {
        if (active) setIsLoading(false);
      });

    return () => {
      active = false;
    };
  }, [applyRecord, detailPageId]);

  useEffect(() => {
    if (!detailPageId) return undefined;
    return subscribeCacheEvents((event) => {
      if (event.key !== cacheKeys.detailPageDetail(detailPageId)) return;
      if (mutationInFlightRef.current) return;
      if (hasUnsavedChangesRef.current) {
        setRemoteUpdatePending(true);
        return;
      }
      void refreshDetailTemplate({ setLoading: false });
    });
  }, [detailPageId, refreshDetailTemplate]);

  useEffect(() => {
    const contentTypeSlug = document?.contentTypeSlug;
    if (!contentTypeSlug) return undefined;

    let active = true;
    void Promise.resolve().then(async () => {
      if (!active) return;
      setSampleEntriesLoading(true);
      setSampleEntriesError(null);
      try {
        const items = await listEntriesCached(contentTypeSlug);
        if (!active) return;
        setSampleEntries(items);
        setSelectedSampleEntryId((current) => {
          if (current && items.some((item) => item.id === current)) return current;
          return items.find((item) => item.status === "published")?.id ?? items[0]?.id ?? "";
        });
      } catch (err) {
        if (!active) return;
        setSampleEntriesError(getErrorMessage(err, "Failed to load sample entries."));
        setSampleEntries([]);
        setSelectedSampleEntryId("");
      } finally {
        if (active) setSampleEntriesLoading(false);
      }
    });

    return () => {
      active = false;
    };
  }, [document?.contentTypeSlug]);

  useEffect(() => {
    const handler = (event: BeforeUnloadEvent) => {
      if (!hasUnsavedChanges) return;
      event.preventDefault();
      event.returnValue = "";
    };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [hasUnsavedChanges]);

  const markDraftChanged = () => {
    setUnsavedChanges(true);
    setRemoteUpdatePending(false);
  };

  const updateBlocks = (next: Block[]) => {
    setBlocks(next);
    setDocument((current) => (current ? { ...current, blocks: next } : current));
    markDraftChanged();
  };

  const handleAddBlock = (type: string) => {
    if (slotInsertTarget) {
      handleInsertIntoSlot(slotInsertTarget.parentId, slotInsertTarget.slotId, type);
      setSlotInsertTarget(null);
      if (mobileLibraryOpen) setMobileLibraryOpen(false);
      return;
    }
    const nextBlock = createBlock(type);
    updateBlocks([...blocks, nextBlock]);
    setSelectedId(nextBlock.id);
    if (mobileLibraryOpen) setMobileLibraryOpen(false);
  };

  const handleAddTemplateSection = (template: { id: string; name: string }) => {
    const nextBlock = createBlock("template-section");
    const finalized = {
      ...nextBlock,
      data: {
        ...(nextBlock.data as Record<string, unknown>),
        templateId: template.id,
        templateName: template.name,
      },
    };
    updateBlocks([...blocks, finalized]);
    setSelectedId(finalized.id);
    if (mobileLibraryOpen) setMobileLibraryOpen(false);
  };

  const handleAddForm = (form: { id: string; name: string }) => {
    const nextBlock = createBlock("form-embed");
    const finalized = {
      ...nextBlock,
      data: {
        ...(nextBlock.data as Record<string, unknown>),
        formId: form.id,
        title: form.name,
      },
    };
    updateBlocks([...blocks, finalized]);
    setSelectedId(finalized.id);
    if (mobileLibraryOpen) setMobileLibraryOpen(false);
  };

  const handleInsertIntoSlot = (parentId: string, slotId: string, type: string) => {
    const nextBlock = createBlock(type);
    updateBlocks(appendSlotBlock(blocks, parentId, slotId, nextBlock));
    setSelectedId(nextBlock.id);
  };

  const handleMoveIntoSlot = (blockId: string, parentId: string, slotId: string) => {
    updateBlocks(moveBlockIntoSlot(blocks, blockId, parentId, slotId));
  };

  const handleMove = (pathValue: BlockPath, from: number, to: number) => {
    if (to < 0) return;
    updateBlocks(reorderBlocksAtPath(blocks, pathValue, from, to));
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

  const handleNameChange = (next: string) => {
    setName(next);
    setDocument((current) => (current ? { ...current, name: next } : current));
    markDraftChanged();
  };

  const handleTitlePatternChange = (next: string) => {
    setTitlePattern(next);
    setDocument((current) => (current ? { ...current, titlePattern: next } : current));
    markDraftChanged();
  };

  const buildCurrentDocument = () => {
    if (!record) return null;
    return buildDetailTemplateDocumentUpdate(record, {
      name,
      titlePattern,
      blocks,
    });
  };

  const saveDraft = async () => {
    if (!detailPageId || !record) return null;
    const nextDocument = buildCurrentDocument();
    if (!nextDocument) return null;
    const updated = await updateDetailPage(detailPageId, nextDocument);
    applyRecord(updated);
    return updated;
  };

  const refreshRevisions = useCallback(async () => {
    if (!detailPageId) return;
    setRevisionsLoading(true);
    setRevisionsError(null);
    try {
      const items = await listDetailPageRevisions(detailPageId);
      setRevisions(items);
    } catch (err) {
      setRevisionsError(getErrorMessage(err, "Failed to load detail template history."));
    } finally {
      setRevisionsLoading(false);
    }
  }, [detailPageId]);

  const handleSaveDraft = async () => {
    if (mutationInFlightRef.current) return;
    mutationInFlightRef.current = true;
    setIsSaving(true);
    setError(null);
    try {
      await saveDraft();
      editorToasts.success("saveDraft");
      await refreshRevisions();
    } catch (err) {
      setError(editorToasts.error("saveDraft", err));
    } finally {
      mutationInFlightRef.current = false;
      setIsSaving(false);
    }
  };

  const handleAutosave = async () => {
    if (!detailPageId || mutationInFlightRef.current) return;
    const nextDocument = buildCurrentDocument();
    if (!nextDocument) return;
    mutationInFlightRef.current = true;
    setIsAutosaving(true);
    setError(null);
    try {
      await autosaveDetailPage(detailPageId, nextDocument);
      editorToasts.success("autosave");
      await refreshRevisions();
    } catch (err) {
      setError(editorToasts.error("autosave", err));
    } finally {
      mutationInFlightRef.current = false;
      setIsAutosaving(false);
    }
  };

  const reloadAfterLifecycle = async () => {
    if (!detailPageId) return;
    const updated = await getDetailPageCached(detailPageId, { force: true });
    applyRecord(updated);
    await refreshRevisions();
  };

  const handlePublish = async () => {
    if (!detailPageId || mutationInFlightRef.current) return;
    mutationInFlightRef.current = true;
    setIsPublishing(true);
    setError(null);
    try {
      if (hasUnsavedChangesRef.current) {
        await saveDraft();
      }
      await publishDetailPage(detailPageId, record?.contentTypeId);
      await reloadAfterLifecycle();
      editorToasts.success("publish");
    } catch (err) {
      setError(editorToasts.error("publish", err));
    } finally {
      mutationInFlightRef.current = false;
      setIsPublishing(false);
    }
  };

  const handleUnpublish = async () => {
    if (!detailPageId || mutationInFlightRef.current) return;
    mutationInFlightRef.current = true;
    setIsPublishing(true);
    setError(null);
    try {
      await unpublishDetailPage(detailPageId, record?.contentTypeId);
      await reloadAfterLifecycle();
      editorToasts.success("unpublish");
    } catch (err) {
      setError(editorToasts.error("unpublish", err));
    } finally {
      mutationInFlightRef.current = false;
      setIsPublishing(false);
    }
  };

  const handlePreview = async () => {
    setPreviewOpen(true);
    setPreviewError(null);
    setPreviewUrl(null);
    if (!detailPageId || !selectedSampleEntryId) {
      setPreviewError("Select a sample entry before previewing this detail template.");
      return;
    }
    if (mutationInFlightRef.current) return;

    mutationInFlightRef.current = true;
    setPreviewLoading(true);
    try {
      if (hasUnsavedChangesRef.current) {
        await saveDraft();
      }
      const result = await previewDetailPage(detailPageId, {
        sampleEntryId: selectedSampleEntryId,
        ttlMinutes: 30,
      });
      setPreviewUrl(result.previewUrl);
    } catch (err) {
      setPreviewError(getErrorMessage(err, "Failed to generate detail template preview."));
    } finally {
      mutationInFlightRef.current = false;
      setPreviewLoading(false);
    }
  };

  const handleHistoryOpenChange = (open: boolean) => {
    setHistoryOpen(open);
    if (open) void refreshRevisions();
  };

  const handleRestoreRevision = async (revisionId: string) => {
    if (!detailPageId) return;
    setRestoringRevisionId(revisionId);
    setRevisionsError(null);
    try {
      await restoreDetailPageRevision(detailPageId, revisionId, record?.contentTypeId);
      await reloadAfterLifecycle();
      editorToasts.success("restore");
    } catch (err) {
      setRevisionsError(editorToasts.error("restore", err));
    } finally {
      setRestoringRevisionId(null);
    }
  };

  const handleDiscardRevision = async (revisionId: string) => {
    if (!detailPageId) return;
    setDiscardingRevisionId(revisionId);
    setRevisionsError(null);
    try {
      await discardDetailPageRevision(detailPageId, revisionId);
      await refreshRevisions();
      editorToasts.success("discard");
    } catch (err) {
      setRevisionsError(editorToasts.error("discard", err));
    } finally {
      setDiscardingRevisionId(null);
    }
  };

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

  const renderDetailsPanel = () => (
    <div className="flex flex-col gap-6 p-6">
      <section className="space-y-3">
        <div>
          <h2 className="text-sm font-semibold">Template</h2>
          <p className="text-xs text-muted-foreground">
            {document?.contentTypeSlug ? `/${document.contentTypeSlug}` : "Collection"}
          </p>
        </div>
        <label className="grid gap-1 text-xs font-medium text-muted-foreground">
          Name
          <Input value={name} onChange={(event) => handleNameChange(event.target.value)} />
        </label>
        <label className="grid gap-1 text-xs font-medium text-muted-foreground">
          Title pattern
          <Input
            value={titlePattern}
            onChange={(event) => handleTitlePatternChange(event.target.value)}
          />
        </label>
        <label className="grid gap-1 text-xs font-medium text-muted-foreground">
          Sample entry
          <select
            value={selectedSampleEntryId}
            onChange={(event) => setSelectedSampleEntryId(event.target.value)}
            className="h-9 w-full rounded-md border border-[var(--admin-input-border)] bg-[var(--admin-input-bg)] px-3 text-sm text-[var(--admin-input-text)] shadow-xs outline-none focus-visible:ring-[3px] focus-visible:ring-[var(--admin-input-ring)]/50"
          >
            {sampleEntries.length === 0 ? (
              <option value="">No entries</option>
            ) : (
              sampleEntries.map((entry) => (
                <option key={entry.id} value={entry.id}>
                  {entry.title || entry.slug}
                </option>
              ))
            )}
          </select>
        </label>
        {sampleEntriesLoading ? (
          <p className="text-xs text-muted-foreground">Loading entries...</p>
        ) : null}
        {sampleEntriesError ? (
          <p className="text-xs text-destructive">{sampleEntriesError}</p>
        ) : null}
      </section>

      <Separator />

      <section className="space-y-3">
        <h2 className="text-sm font-semibold">Block</h2>
        <BlockSettings block={selectedBlock} widget={selectedWidget} onChange={handleChangeBlock} />
      </section>
    </div>
  );

  const isPublished = record?.status === "published";
  const isMutating = isSaving || isAutosaving || isPublishing || previewLoading;
  const title = name.trim() || record?.name || "Detail template";
  const visibleError = error ?? (!detailPageId ? "Missing detail template id." : null);

  return (
    <EditorShell
      activeHref="/admin/advanced/engine"
      leftPanel={renderLibraryPanel()}
      rightPanel={renderDetailsPanel()}
      rightPanelClassName="p-0"
      breadcrumbs={
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <span>Advanced</span>
          <span>/</span>
          <span>Engine</span>
          <span>/</span>
          <span>Collection</span>
          <span>/</span>
          <span className="text-foreground">{title}</span>
          <span className={formatStatusBadgeClassName(record?.status ?? "draft")}>
            {record?.status === "published" ? "Published" : "Draft"}
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
        <div className="mx-auto flex w-full max-w-4xl flex-col gap-2">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex flex-wrap items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                className="gap-2"
                onClick={handlePreview}
                disabled={isMutating || isLoading || sampleEntries.length === 0}
              >
                <Eye className="h-4 w-4" />
                Preview
              </Button>
              <Button
                variant="secondary"
                size="sm"
                className="gap-2"
                onClick={handleSaveDraft}
                disabled={isMutating || isLoading || !record}
              >
                <Save className="h-4 w-4" />
                {isSaving ? "Saving..." : "Save draft"}
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="gap-2"
                onClick={handleAutosave}
                disabled={isMutating || isLoading || !record}
              >
                <RefreshCcw className="h-4 w-4" />
                {isAutosaving ? "Autosaving..." : "Autosave"}
              </Button>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              {isPublished ? (
                <Button
                  size="sm"
                  variant="outline"
                  className="gap-2"
                  onClick={handleUnpublish}
                  disabled={isMutating || isLoading}
                >
                  <Eye className="h-4 w-4" />
                  {isPublishing ? "Unpublishing..." : "Unpublish"}
                </Button>
              ) : null}
              <Button
                size="sm"
                className="gap-2"
                onClick={handlePublish}
                disabled={isMutating || isLoading || !record}
              >
                <Eye className="h-4 w-4" />
                {isPublishing ? "Publishing..." : "Publish"}
              </Button>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              className="gap-2"
              onClick={() => handleHistoryOpenChange(true)}
              disabled={!record}
            >
              <History className="h-4 w-4" />
              History
            </Button>
            <div className="ml-auto flex flex-wrap items-center gap-2 lg:hidden">
              <Button variant="outline" size="sm" onClick={() => setMobileLibraryOpen(true)}>
                Components
              </Button>
              <Button variant="outline" size="sm" onClick={() => setMobileDetailsOpen(true)}>
                Details
              </Button>
            </div>
          </div>
        </div>
      </div>

      <div className="mx-auto flex w-full max-w-4xl flex-col gap-4 px-6 py-8">
        {visibleError ? (
          <Alert variant="destructive">
            <AlertTitle>Detail template error</AlertTitle>
            <AlertDescription>{visibleError}</AlertDescription>
          </Alert>
        ) : null}

        {remoteUpdatePending ? (
          <Alert>
            <AlertTitle>Template changed</AlertTitle>
            <AlertDescription className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <span>New changes are available.</span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => void refreshDetailTemplate({ allowUnsaved: true })}
              >
                Refresh
              </Button>
            </AlertDescription>
          </Alert>
        ) : null}

        {isLoading ? (
          <div className="rounded-xl border bg-card/60 p-6 text-sm text-muted-foreground shadow-sm">
            Loading detail template...
          </div>
        ) : null}

        {!isLoading && record ? (
          <div
            className={joinClasses(
              "relative w-full overflow-hidden rounded-xl border border-border/50 bg-background",
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
              {blocks.length === 0 ? (
                <div className="rounded-lg border border-dashed bg-muted/20 p-8 text-sm text-muted-foreground">
                  Empty detail template.
                </div>
              ) : (
                <BlockList
                  blocks={blocks}
                  className={
                    layout ? spacingTokenToListSpaceClassMap[layout.sections.gap] : undefined
                  }
                  pageDefaults={layout?.sections.defaults}
                  selectedId={selectedId}
                  onSelect={setSelectedId}
                  onMove={handleMove}
                  onDuplicate={handleDuplicate}
                  onDelete={handleDelete}
                  onInsert={handleInsertIntoSlot}
                  onMoveToSlot={handleMoveIntoSlot}
                  onOpenSlotInsert={(target) => {
                    setLibraryTab("widgets");
                    setSlotInsertTarget(target);
                    if (
                      typeof window !== "undefined" &&
                      typeof window.matchMedia === "function" &&
                      window.matchMedia("(max-width: 1023px)").matches
                    ) {
                      setMobileLibraryOpen(true);
                    }
                  }}
                />
              )}
            </div>
          </div>
        ) : null}
      </div>

      <RuntimePreviewDialog
        open={previewOpen}
        onOpenChange={setPreviewOpen}
        title="Detail Template Preview"
        subtitle="Runtime preview (read-only, sample entry)."
        canPreview={Boolean(detailPageId && selectedSampleEntryId)}
        previewUrl={previewUrl}
        isLoading={previewLoading}
        error={previewError}
        cannotPreviewMessage="Select a sample entry to generate a runtime preview."
        iframeTitle="Detail template runtime preview"
      />

      <Sheet open={historyOpen} onOpenChange={handleHistoryOpenChange}>
        <SheetContent side="right" className="flex h-full min-h-0 w-full flex-col p-0 sm:max-w-md">
          <div className="border-b px-6 py-4">
            <SheetTitle>Detail template history</SheetTitle>
            <SheetDescription className="text-xs text-muted-foreground">
              Published revisions and autosaves.
            </SheetDescription>
          </div>
          <div className="min-h-0 flex-1 overflow-y-auto px-6 py-6">
            {revisionsLoading ? (
              <div className="rounded-xl border bg-muted/30 p-6 text-center text-sm text-muted-foreground">
                Loading revisions...
              </div>
            ) : revisionsError ? (
              <div className="rounded-xl border border-destructive/40 bg-background p-6 text-center text-sm text-destructive">
                {revisionsError}
              </div>
            ) : revisions.length === 0 ? (
              <div className="rounded-xl border bg-muted/30 p-6 text-center text-sm text-muted-foreground">
                No revisions yet.
              </div>
            ) : (
              <div className="space-y-4">
                {revisions.map((revision) => (
                  <div key={revision.id} className="space-y-3 rounded-xl border bg-background p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-semibold">
                            {revision.kind === "autosave"
                              ? "Draft version"
                              : `Version ${revision.version}`}
                          </p>
                          <Badge variant={revision.kind === "autosave" ? "secondary" : "outline"}>
                            {revision.kind === "autosave" ? "Draft" : "Published"}
                          </Badge>
                        </div>
                        <p className="text-xs text-muted-foreground">
                          {formatTimestamp(revision.createdAt)}
                        </p>
                      </div>
                      <History className="mt-0.5 h-4 w-4 text-muted-foreground" />
                    </div>
                    <Separator />
                    <div className="flex justify-end gap-2">
                      {revision.kind === "autosave" ? (
                        <Button
                          size="sm"
                          variant="ghost"
                          disabled={discardingRevisionId === revision.id}
                          onClick={() => void handleDiscardRevision(revision.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                          {discardingRevisionId === revision.id ? "Discarding..." : "Discard"}
                        </Button>
                      ) : null}
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={restoringRevisionId === revision.id}
                        onClick={() => void handleRestoreRevision(revision.id)}
                      >
                        <RotateCcw className="h-4 w-4" />
                        {restoringRevisionId === revision.id ? "Restoring..." : "Restore"}
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </SheetContent>
      </Sheet>

      <Sheet open={mobileLibraryOpen} onOpenChange={setMobileLibraryOpen}>
        <SheetContent side="left" className="w-80 p-0">
          <SheetTitle className="sr-only">Components</SheetTitle>
          <SheetDescription className="sr-only">
            Browse available components and widgets.
          </SheetDescription>
          <div className="flex h-full min-h-0 flex-col overflow-hidden">{renderLibraryPanel()}</div>
        </SheetContent>
      </Sheet>
      <Sheet open={mobileDetailsOpen} onOpenChange={setMobileDetailsOpen}>
        <SheetContent side="right" className="w-80 p-0">
          <SheetTitle className="sr-only">Details</SheetTitle>
          <SheetDescription className="sr-only">
            Edit detail template settings and block configuration.
          </SheetDescription>
          <div className="flex h-full min-h-0 flex-col overflow-y-auto">{renderDetailsPanel()}</div>
        </SheetContent>
      </Sheet>
    </EditorShell>
  );
}
