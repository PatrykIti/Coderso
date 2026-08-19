// TASK-481-02-L02 facade split (Part A): page editor controller hook.
// Extracted verbatim from the former PageEditor.tsx body (host state, derived
// selectors, history, selection, and the document-command bridge).
// Single writer: TASK-481-02-L02. No behavior change.

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { CSSProperties, KeyboardEvent as ReactKeyboardEvent } from "react";
import { Palette } from "lucide-react";
import { getFormDetailCached } from "@/services/formsClient";
import { cacheKeys } from "@/services/cachePolicy";
import {
  autosavePage,
  discardPageRevision,
  getCachedPageDetail,
  getPageCached,
  listPageRevisions,
  previewPage,
  publishPage,
  restorePageRevision,
  updatePage,
  type PageDetail,
  type PageRevision,
  type PreviewProbeResult,
} from "@/services/pagesClient";
import { getPageTemplateCached, listPageTemplatesCached } from "@/services/pageTemplatesClient";
import {
  instantiatePageTemplateSections,
  normalizeStoredPageTemplateDocument,
} from "../../../../services/pages/pageTemplateLibrarySchema";
import {
  toPageCanvasBrandColorCssVariableMap,
  toPageCanvasColorCssVariableMap,
} from "../../../../ui/theme/tokenCss";
import { useCanvasSiteTokens } from "../../shared/useCanvasSiteTokens";
import {
  getPageBlockAtPath,
  getPageBlockBesideInsertStatus,
  getPageBlockContainerLayout,
  type PageBlockInsertTarget,
  type PageBlockPath,
} from "../../../../services/pages/pageBlockPaths";
import {
  buildPageEditorCollectionPreviewBindings,
  collectPageEditorCollectionPreviewContentTypeIds,
  type PageEditorCollectionPreviewSource,
} from "../../../../services/pages/pageEditorCollectionPreview";
import {
  buildPageEditorFormPreviewBindings,
  collectPageEditorFormPreviewFormIds,
  type PageEditorFormPreviewDetail,
} from "../../../../services/pages/pageEditorFormPreview";
import { getPageEditorColorPalette } from "../../../../services/pages/pageEditorControlUiModel";
import {
  isPageTypographyCapableBlockType,
  resolvePageSectionForBreakpoint,
  type PageBreakpoint,
  type PageDocumentV2,
} from "../../../../services/pages/pageDocumentV2";
import type { PageRuntimeDataByBlockId } from "../../../../services/pages/pageRuntimeBindingContract";
import { normalizePageRevisionRetentionValue } from "../../../../services/pages/revisionRetention";
import type {
  PageEditorHost,
  PageEditorResourceDetail,
  PageEditorRevision,
} from "./pageEditorHostContract";
import type { PageEditorInlineEditTarget, PageEditorMarkToolbarDock } from "./PageAuthoringCanvas";
import {
  blockOptions,
  resolveToolbarTargetLabel,
  sectionOptions,
  toolbarPanelOptions,
  type ToolbarPanel,
  type ToolbarPanelOption,
} from "./pageEditorOptions";
import { loadCollectionPreviewSource } from "./PageEditorRegistryFields";
import {
  cloneBlockPath,
  cloneDocument,
  documentsEqual,
  normalizePageData,
  PAGE_EDITOR_HISTORY_LIMIT,
  resolveInlineError,
  type PageEditorHistorySnapshot,
  type ToolbarDeleteTarget,
  usePageEditorDocumentCommands,
} from "./pageEditorDocumentCommands";

const resolvePageId = (pathname: string) => {
  const parts = pathname.split("/").filter(Boolean);
  const pageIndex = parts.findIndex((segment) => segment === "pages");
  if (pageIndex === -1) return null;
  return parts[pageIndex + 1] ?? null;
};
export const isEditableShortcutTarget = (target: EventTarget | null) => {
  if (typeof HTMLElement === "undefined" || !(target instanceof HTMLElement)) return false;
  const tagName = target.tagName.toLowerCase();
  return (
    target.isContentEditable ||
    Boolean(target.closest("[contenteditable='true']")) ||
    tagName === "input" ||
    tagName === "textarea" ||
    tagName === "select"
  );
};
export const isInteractiveActivationTarget = (target: EventTarget | null) => {
  if (typeof HTMLElement === "undefined" || !(target instanceof HTMLElement)) return false;
  return Boolean(target.closest("button, a, [role='button'], [role='menuitem'], [role='option']"));
};
const defaultPagesEditorHost: PageEditorHost = {
  mode: "page",
  resourceLabel: "Pages",
  settingsLabel: "Page settings",
  previewTitle: "Page preview",
  loadFailedMessage: "Failed to load page.",
  assistantSurface: true,
  detailCacheKey: (id) => cacheKeys.pageDetail(id),
  getCachedDetail: (id) => getCachedPageDetail(id),
  loadDetail: (id, options) => getPageCached(id, { force: options?.force }),
  saveDocument: (id, document) => updatePage(id, { data: document }),
  autosaveDocument: (id, document) => autosavePage(id, { data: document }),
  publish: (id, document) => publishPage(id, document),
  preview: (id) => previewPage(id, { ttlMinutes: 15, probe: true }),
  revisions: {
    list: (id) => listPageRevisions(id),
    restore: (id, revisionId) => restorePageRevision(id, revisionId),
    discard: (id, revisionId) => discardPageRevision(id, revisionId),
  },
  templateLibrary: {
    listPublished: async () => {
      const items = await listPageTemplatesCached();
      return items
        .filter((item) => item.status === "published")
        .map((item) => ({ id: item.id, name: item.name, description: item.description }));
    },
    instantiateSections: async (id) => {
      const detail = await getPageTemplateCached(id);
      if (!detail) throw new Error("Page template not found.");
      // Fail closed: an unreadable stored template never partially applies.
      const document = normalizeStoredPageTemplateDocument(detail.document);
      return instantiatePageTemplateSections(document);
    },
  },
};

export type PageEditorProps = {
  pageId?: string;
  initialPage?: PageDetail | null;
  host?: PageEditorHost;
};

export type PageEditorController = ReturnType<typeof usePageEditorController>;

export const usePageEditorController = ({
  pageId: initialPageId,
  initialPage,
  host,
}: PageEditorProps) => {
  const editorHost = host ?? defaultPagesEditorHost;
  const [pageId] = useState<string | null>(() => {
    if (initialPageId ?? initialPage?.id) return initialPageId ?? initialPage?.id ?? null;
    if (typeof window === "undefined") return null;
    return resolvePageId(window.location.pathname);
  });
  const initialCachedPage = useMemo(
    () => (!initialPage && pageId ? editorHost.getCachedDetail(pageId) : null),
    [editorHost, initialPage, pageId]
  );
  const initialPageDetail = initialPage ?? initialCachedPage;
  const initialDocument = useMemo(
    () => normalizePageData(initialPageDetail?.currentData),
    [initialPageDetail]
  );
  const [page, setPage] = useState<PageDetail | null>(initialPageDetail ?? null);
  const [pageDocument, setPageDocument] = useState<PageDocumentV2>(() =>
    cloneDocument(initialDocument)
  );
  const [selectedSectionId, setSelectedSectionId] = useState<string | null>(
    () => pageDocument.sections[0]?.id ?? null
  );
  const [selectedBlockPath, setSelectedBlockPath] = useState<PageBlockPath | null>(null);
  const [inlineEditTarget, setInlineEditTarget] = useState<PageEditorInlineEditTarget | null>(null);
  const [device, setDevice] = useState<PageBreakpoint>("desktop");
  // TASK-479-08-L02: the floating control panel is the sole control surface; a
  // single lazy-init open flag drives the chrome show/hide toggle. Toggled only
  // by the user (never derived from props in an effect), so a page-data
  // re-render never re-homes the controls or clears dirty state.
  const [panelOpen, setPanelOpen] = useState(true);
  // Session UI pref (not the page document): which side the inline mark toolbar
  // docks to so the color picker stops covering the edited text (TASK-478-03).
  // Persists across subsequent block edits in the session, mirroring `device`.
  const [markToolbarDock, setMarkToolbarDock] = useState<PageEditorMarkToolbarDock>("top");
  const siteTokens = useCanvasSiteTokens();
  const canvasSiteTokenVariables = useMemo(
    () => toPageCanvasColorCssVariableMap(siteTokens) as CSSProperties,
    [siteTokens]
  );
  const canvasBrandTokenVariables = useMemo(
    () => toPageCanvasBrandColorCssVariableMap(siteTokens) as CSSProperties,
    [siteTokens]
  );
  const sitePalette = useMemo(() => getPageEditorColorPalette(siteTokens), [siteTokens]);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [isLoading, setIsLoading] = useState(!initialPageDetail && Boolean(pageId));
  const [isSaving, setIsSaving] = useState(false);
  const [isPublishing, setIsPublishing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [revalidationError, setRevalidationError] = useState<string | null>(null);
  const [autosaveError, setAutosaveError] = useState<string | null>(null);
  const [recoverableAutosave, setRecoverableAutosave] = useState<PageEditorRevision | null>(null);
  const [dismissedRecoverableAutosaveId, setDismissedRecoverableAutosaveId] = useState<
    string | null
  >(null);
  const [recoveryCheckError, setRecoveryCheckError] = useState<string | null>(null);
  const [recoveryActionError, setRecoveryActionError] = useState<string | null>(null);
  const [revalidatedResourceKey, setRevalidatedResourceKey] = useState<string | null>(null);
  const [commandOpen, setCommandOpen] = useState(false);
  const [commandQuery, setCommandQuery] = useState("");
  const [commandActiveIndex, setCommandActiveIndex] = useState(0);
  // Pre-targeted block insert (ghost tiles, Layers "Add"): the chosen palette
  // block is inserted at `target`; an optional `column` stamps the section
  // column assignment onto the new block (owner finding #5, round 3).
  const [pendingBlockInsert, setPendingBlockInsert] = useState<{
    target: PageBlockInsertTarget;
    column?: number;
  } | null>(null);
  // Gap index pre-targeted by the inline per-gap "+" zones: a chosen section
  // is spliced at this index instead of being appended.
  const [pendingSectionInsertIndex, setPendingSectionInsertIndex] = useState<number | null>(null);
  // "Add block beside" pre-target (owner finding #7): the chosen block is
  // inserted beside this path via `insertPageBlockBeside` (append in an
  // existing row group, otherwise wrap into a new row group). Deferred to
  // pick-time so cancelling the palette never mutates the document.
  const [pendingBesideBlockPath, setPendingBesideBlockPath] = useState<PageBlockPath | null>(null);
  const [layersOpen, setLayersOpen] = useState(false);
  // Hosts with an appearance panel open on it (it is their primary control
  // surface); page hosts keep the content panel default.
  const [activePanel, setActivePanel] = useState<ToolbarPanel | null>(() =>
    editorHost.appearancePanel ? "host-appearance" : "content"
  );
  const [toolbarCollapsed, setToolbarCollapsed] = useState(false);
  const toolbarElementRef = useRef<HTMLDivElement | null>(null);
  const [deleteSelectionTarget, setDeleteSelectionTarget] = useState<ToolbarDeleteTarget | null>(
    null
  );
  const [settingsOpen, setSettingsOpen] = useState(false);
  // TASK-521-05-L01: compact page-settings panel in the side-inspector rail
  // (relocated from the full-height `SettingsSheet` drawer, which the owner
  // found poor). Toggled by the reused `Settings2` trigger next to the
  // section-panel toggle; used only on the DEFAULT host (hosts with their own
  // `renderSettings` keep their Sheet, gated by `settingsOpen`).
  const [pageSettingsPanelOpen, setPageSettingsPanelOpen] = useState(false);
  const [settingsTitle, setSettingsTitle] = useState(initialPageDetail?.title ?? "Homepage");
  const [settingsSlug, setSettingsSlug] = useState(initialPageDetail?.slug ?? "/");
  const [showInNav, setShowInNav] = useState(pageDocument.settings.showInNav);
  const [revisionRetention, setRevisionRetention] = useState(
    normalizePageRevisionRetentionValue(pageDocument.settings.revisionRetention)
  );
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
  const [templateOptions, setTemplateOptions] = useState<
    { id: string; name: string; description: string | null }[] | null
  >(null);
  // Canvas form preview data (TASK-456): cached form details keyed by formId
  // (`null` = the referenced form no longer exists -> fail-closed binding).
  const [canvasFormDetails, setCanvasFormDetails] = useState<
    Record<string, PageEditorFormPreviewDetail | null>
  >({});
  const hasUnsavedChangesRef = useRef(hasUnsavedChanges);
  const savedDocumentRef = useRef<PageDocumentV2>(cloneDocument(initialDocument));
  const historyRef = useRef<{
    past: PageEditorHistorySnapshot[];
    future: PageEditorHistorySnapshot[];
  }>({
    past: [],
    future: [],
  });
  const [historyAvailability, setHistoryAvailability] = useState({
    canUndo: false,
    canRedo: false,
  });
  const latestLoadedPageRef = useRef<PageEditorResourceDetail | null>(initialPageDetail ?? null);
  const revalidatedResourceRef = useRef<string | null>(null);
  // FormIds already requested in this editor session; transient load failures
  // are removed again so a later document change can retry the fetch.
  const requestedFormIdsRef = useRef<Set<string>>(new Set());

  // Stable identity for "the set of forms this document references" so the
  // fetch effect only re-runs when a NEW form id appears, not on every edit.
  const canvasFormIdsKey = useMemo(
    () => collectPageEditorFormPreviewFormIds(pageDocument).sort().join(" "),
    [pageDocument]
  );

  useEffect(() => {
    const formIds = canvasFormIdsKey.length > 0 ? canvasFormIdsKey.split(" ") : [];
    for (const formId of formIds) {
      if (requestedFormIdsRef.current.has(formId)) continue;
      requestedFormIdsRef.current.add(formId);
      // Cache-first through the shared cached client; the async boundary owns
      // the state write (no synchronous setState in the effect body).
      getFormDetailCached(formId)
        .then((detail) => {
          setCanvasFormDetails((current) => ({ ...current, [formId]: detail ?? null }));
        })
        .catch(() => {
          requestedFormIdsRef.current.delete(formId);
        });
    }
  }, [canvasFormIdsKey]);

  // Canvas-only runtime bindings for form blocks at the active breakpoint.
  // Publish/runtime paths never receive this map — the public runtime keeps
  // resolving its own bindings server-side (TASK-418-06-L04).
  const canvasFormPreviewBindings = useMemo<PageRuntimeDataByBlockId>(
    () => buildPageEditorFormPreviewBindings(pageDocument, device, canvasFormDetails),
    [pageDocument, device, canvasFormDetails]
  );

  // Canvas collection preview data (TASK-457): preview sources keyed by
  // contentTypeId (`null` = the referenced content type no longer exists ->
  // fail-closed binding).
  const [canvasCollectionSources, setCanvasCollectionSources] = useState<
    Record<string, PageEditorCollectionPreviewSource>
  >({});
  // ContentTypeIds already requested in this editor session; transient load
  // failures are removed again so a later document change can retry.
  const requestedCollectionTypeIdsRef = useRef<Set<string>>(new Set());

  // Stable identity for "the set of content types this document references"
  // so the fetch effect only re-runs when a NEW type id appears.
  const canvasCollectionTypeIdsKey = useMemo(
    () => collectPageEditorCollectionPreviewContentTypeIds(pageDocument).sort().join(" "),
    [pageDocument]
  );

  useEffect(() => {
    const typeIds =
      canvasCollectionTypeIdsKey.length > 0 ? canvasCollectionTypeIdsKey.split(" ") : [];
    for (const typeId of typeIds) {
      if (requestedCollectionTypeIdsRef.current.has(typeId)) continue;
      requestedCollectionTypeIdsRef.current.add(typeId);
      // Cache-first through the shared cached clients; the async boundary
      // owns the state write (no synchronous setState in the effect body).
      loadCollectionPreviewSource(typeId)
        .then((source) => {
          setCanvasCollectionSources((current) => ({ ...current, [typeId]: source }));
        })
        .catch(() => {
          requestedCollectionTypeIdsRef.current.delete(typeId);
        });
    }
  }, [canvasCollectionTypeIdsKey]);

  // Canvas-only runtime bindings for collection blocks at the active
  // breakpoint; merged with the form previews below. The public runtime keeps
  // resolving the real content-list binding server-side (TASK-418-06-L04).
  const canvasCollectionPreviewBindings = useMemo<PageRuntimeDataByBlockId>(
    () => buildPageEditorCollectionPreviewBindings(pageDocument, device, canvasCollectionSources),
    [pageDocument, device, canvasCollectionSources]
  );

  const canvasDataByBlockId = useMemo<PageRuntimeDataByBlockId>(
    () => ({ ...canvasFormPreviewBindings, ...canvasCollectionPreviewBindings }),
    [canvasFormPreviewBindings, canvasCollectionPreviewBindings]
  );

  const selectedSection =
    pageDocument.sections.find((section) => section.id === selectedSectionId) ?? null;
  const resolvedSelectedSection = selectedSection
    ? resolvePageSectionForBreakpoint(selectedSection, device)
    : null;
  // A section/block selection exists, so the floating control panel has content
  // to host; the chrome panel toggle (panelOpen) decides whether it is shown.
  const hasFloatingPanelSelection = Boolean(selectedSection && resolvedSelectedSection);
  // TASK-499-03: the menu design host no longer routes through PageEditor, so the
  // legacy dark bottom-center draggable chrome is retired. Pages + page-templates
  // are the only hosts and always use the builder chrome (PageHeader + sub-toolbar
  // + light right-pinned panel through the shared CanvasEditor shell). The panel
  // tone is always light; these are the light control-chrome tokens.
  const panelTokens = {
    headerBorder: "border-border",
    label: "text-muted-foreground",
    chip: "bg-muted text-muted-foreground",
    scopePill: "bg-primary-soft text-primary-soft-foreground",
    subPanelBg: "bg-muted/40 text-foreground",
    subHeaderBorder: "border-border",
    subTitle: "text-foreground",
    subDesc: "text-muted-foreground",
  };
  const selectedBlock =
    selectedBlockPath && selectedSection
      ? getPageBlockAtPath(selectedSection, selectedBlockPath)
      : null;
  const selectedBlockId = selectedBlock?.id ?? null;
  const resolvedSelectedBlock =
    selectedBlockPath && resolvedSelectedSection
      ? (getPageBlockAtPath(resolvedSelectedSection, selectedBlockPath) ?? selectedBlock)
      : null;
  const toolbarBlockTarget = selectedBlockPath
    ? resolvedSelectedBlock
    : (resolvedSelectedSection?.blocks[0] ?? null);
  const toolbarTargetLabel = resolveToolbarTargetLabel(
    resolvedSelectedBlock
      ? { kind: "block", type: resolvedSelectedBlock.type }
      : selectedSection
        ? { kind: "section", type: selectedSection.type }
        : null,
    { fallbackToTypeName: true }
  );
  const toolbarSelectionMeta = resolvedSelectedBlock
    ? resolvedSelectedBlock.type
    : (selectedSection?.variant ?? "section");
  // Owner finding #6: how the selected block's container lays out its
  // children, resolved against the active breakpoint so responsive
  // stackVertical/columns overrides steer the visible move axes.
  const selectedBlockContainerLayout =
    selectedBlock && selectedBlockPath && resolvedSelectedSection
      ? getPageBlockContainerLayout(resolvedSelectedSection, selectedBlockPath)
      : null;
  // Left/Right exist only where the block renders beside siblings (section
  // grid with 2+ columns — auto-flow or per-column composition — a
  // row-direction group, or a columns-block slot row); single-column contexts
  // hide them entirely.
  const horizontalBlockMoveAvailable = Boolean(
    selectedBlockContainerLayout && selectedBlockContainerLayout.kind !== "stack"
  );
  // Up/Down move by one visual row: ±columns inside a multi-column auto-flow
  // grid, plain ±1 in single-column stacks, columns-block slots, and section
  // column stacks (owner finding #5 round 3 — each column is a vertical
  // stack). A row-direction group has no vertical axis, so Up/Down hide there.
  const verticalBlockMoveAvailable = selectedBlockContainerLayout?.kind !== "row";
  const verticalBlockMoveStep =
    selectedBlockContainerLayout?.kind === "grid" ? selectedBlockContainerLayout.columns : 1;
  // Per-column composition steers both axes onto column-stack semantics.
  const sectionColumnMoveActive = selectedBlockContainerLayout?.kind === "section-column";
  // Root-level Left/Right in a multi-column section write a column assignment
  // (both before and after composition activates).
  const horizontalMoveSetsColumn =
    selectedBlockContainerLayout?.kind === "grid" || sectionColumnMoveActive;
  // Owner finding #7: availability of the "Add block beside" action (depth
  // and slot-capacity guarded; palette blocks always start at tree height 1).
  const canAddBlockBeside = Boolean(
    selectedSection &&
    selectedBlockPath &&
    getPageBlockBesideInsertStatus(selectedSection, selectedBlockPath) === "ok"
  );
  // Typography is a block-only panel: it surfaces only for selected
  // typography-capable blocks, never for section selections (the owner
  // contract has no consolidated all-section-texts surface).
  const typographyPanelAvailable = Boolean(
    selectedBlockId &&
    resolvedSelectedBlock &&
    isPageTypographyCapableBlockType(resolvedSelectedBlock.type)
  );
  // Host appearance panel (TASK-458-03): offered as the leading panel tab
  // whenever the host provides one (it edits document-level state, so it is
  // selection-independent).
  const hostAppearancePanel = editorHost.appearancePanel;
  const visibleToolbarPanelOptions = useMemo<ToolbarPanelOption[]>(() => {
    const registryOptions = typographyPanelAvailable
      ? toolbarPanelOptions
      : toolbarPanelOptions.filter((option) => option.panel !== "typography");
    if (!hostAppearancePanel) return registryOptions;
    return [
      {
        panel: "host-appearance",
        label: hostAppearancePanel.label,
        description: hostAppearancePanel.description,
        Icon: Palette,
      },
      ...registryOptions,
    ];
  }, [hostAppearancePanel, typographyPanelAvailable]);
  const activeToolbarPanel =
    (activePanel === "typography" && !typographyPanelAvailable) ||
    (activePanel === "host-appearance" && !hostAppearancePanel)
      ? null
      : activePanel;
  const canUndoEditorChange = historyAvailability.canUndo;
  const canRedoEditorChange = historyAvailability.canRedo;

  // Host palette scoping (TASK-458-03): intersect the global insertable
  // options with the host palette BEFORE query filtering, so every insert
  // entry point (command palette, ghost tiles, add-beside) only ever offers
  // host-allowed types. Absent palette keeps today's full catalog.
  const hostPalette = editorHost.palette;
  const availableSectionOptions = useMemo(() => {
    if (!hostPalette?.sections) return sectionOptions;
    const allowed = new Set(hostPalette.sections);
    return sectionOptions.filter((option) => allowed.has(option.type));
  }, [hostPalette]);
  const availableBlockOptions = useMemo(() => {
    if (!hostPalette?.blocks) return blockOptions;
    const allowed = new Set(hostPalette.blocks);
    return blockOptions.filter((option) => allowed.has(option.type));
  }, [hostPalette]);
  // Hosts with zero insertable sections get no section-insert affordances
  // (gap zones, "Add section" buttons, palette section group).
  const canInsertSections = availableSectionOptions.length > 0;
  const canCreateContentSectionFromUntargetedBlock = availableSectionOptions.some(
    (option) => option.type === "content"
  );

  const filteredSections = useMemo(() => {
    const query = commandQuery.trim().toLowerCase();
    return query
      ? availableSectionOptions.filter((option) =>
          `${option.label} ${option.description}`.toLowerCase().includes(query)
        )
      : availableSectionOptions;
  }, [availableSectionOptions, commandQuery]);
  const filteredBlocks = useMemo(() => {
    const query = commandQuery.trim().toLowerCase();
    return query
      ? availableBlockOptions.filter((option) =>
          `${option.label} ${option.description}`.toLowerCase().includes(query)
        )
      : availableBlockOptions;
  }, [availableBlockOptions, commandQuery]);
  const filteredTemplates = useMemo(() => {
    if (!templateOptions) return [];
    const query = commandQuery.trim().toLowerCase();
    return query
      ? templateOptions.filter((option) =>
          `${option.name} ${option.description ?? ""}`.toLowerCase().includes(query)
        )
      : templateOptions;
  }, [commandQuery, templateOptions]);
  const commandResultCount =
    filteredSections.length + filteredBlocks.length + filteredTemplates.length;

  const openCommandPalette = useCallback(() => {
    setPendingBlockInsert(null);
    setPendingSectionInsertIndex(null);
    setPendingBesideBlockPath(null);
    setCommandOpen(true);
    setCommandQuery("");
    setCommandActiveIndex(0);
  }, []);

  const openCommandPaletteForTarget = useCallback(
    (target: PageBlockInsertTarget, options?: { column?: number }) => {
      setPendingBlockInsert({
        target,
        ...(options?.column !== undefined ? { column: options.column } : {}),
      });
      setPendingSectionInsertIndex(null);
      setPendingBesideBlockPath(null);
      setCommandOpen(true);
      setCommandQuery("");
      setCommandActiveIndex(0);
    },
    []
  );

  // Opens the existing command palette pre-targeted at a canvas gap so the
  // chosen section lands at that gap instead of being appended.
  const openCommandPaletteAtGap = useCallback((gapIndex: number) => {
    setPendingBlockInsert(null);
    setPendingSectionInsertIndex(gapIndex);
    setPendingBesideBlockPath(null);
    setCommandOpen(true);
    setCommandQuery("");
    setCommandActiveIndex(0);
  }, []);

  // Opens the palette pre-targeted beside the currently selected block
  // (owner finding #7); the actual wrap/append happens when a block is picked.
  const openCommandPaletteBesideSelected = useCallback(() => {
    if (!selectedBlockPath) return;
    setPendingBlockInsert(null);
    setPendingSectionInsertIndex(null);
    setPendingBesideBlockPath(selectedBlockPath);
    setCommandOpen(true);
    setCommandQuery("");
    setCommandActiveIndex(0);
  }, [selectedBlockPath]);

  const syncEditorHistoryAvailability = useCallback(
    (history: { past: PageEditorHistorySnapshot[]; future: PageEditorHistorySnapshot[] }) => {
      setHistoryAvailability({
        canUndo: history.past.length > 0,
        canRedo: history.future.length > 0,
      });
    },
    []
  );

  const resetEditorHistory = useCallback(() => {
    const history = { past: [], future: [] };
    historyRef.current = history;
    syncEditorHistoryAvailability(history);
  }, [syncEditorHistoryAvailability]);

  const snapshotCurrentEditorState = useCallback(
    (document: PageDocumentV2): PageEditorHistorySnapshot => ({
      document: cloneDocument(document),
      selectedSectionId,
      selectedBlockPath: cloneBlockPath(selectedBlockPath),
    }),
    [selectedBlockPath, selectedSectionId]
  );

  const restoreHistorySnapshot = useCallback((snapshot: PageEditorHistorySnapshot) => {
    setPageDocument(cloneDocument(snapshot.document));
    setSelectedSectionId(snapshot.selectedSectionId);
    setSelectedBlockPath(cloneBlockPath(snapshot.selectedBlockPath));
    setInlineEditTarget(null);
    setHasUnsavedChanges(!documentsEqual(snapshot.document, savedDocumentRef.current));
  }, []);

  const setDocumentDraft = useCallback(
    (updater: (current: PageDocumentV2) => PageDocumentV2) => {
      setPageDocument((current) => {
        const next = updater(cloneDocument(current));
        if (documentsEqual(current, next)) return current;
        const history = {
          past: [...historyRef.current.past, snapshotCurrentEditorState(current)].slice(
            -PAGE_EDITOR_HISTORY_LIMIT
          ),
          future: [],
        };
        historyRef.current = history;
        syncEditorHistoryAvailability(history);
        return next;
      });
      setHasUnsavedChanges(true);
    },
    [snapshotCurrentEditorState, syncEditorHistoryAvailability]
  );

  const undoEditorChange = useCallback(() => {
    const previous = historyRef.current.past.at(-1);
    if (!previous) return;
    const history = {
      past: historyRef.current.past.slice(0, -1),
      future: [snapshotCurrentEditorState(pageDocument), ...historyRef.current.future].slice(
        0,
        PAGE_EDITOR_HISTORY_LIMIT
      ),
    };
    historyRef.current = history;
    syncEditorHistoryAvailability(history);
    restoreHistorySnapshot(previous);
  }, [
    pageDocument,
    restoreHistorySnapshot,
    snapshotCurrentEditorState,
    syncEditorHistoryAvailability,
  ]);

  const redoEditorChange = useCallback(() => {
    const next = historyRef.current.future[0];
    if (!next) return;
    const history = {
      past: [...historyRef.current.past, snapshotCurrentEditorState(pageDocument)].slice(
        -PAGE_EDITOR_HISTORY_LIMIT
      ),
      future: historyRef.current.future.slice(1),
    };
    historyRef.current = history;
    syncEditorHistoryAvailability(history);
    restoreHistorySnapshot(next);
  }, [
    pageDocument,
    restoreHistorySnapshot,
    snapshotCurrentEditorState,
    syncEditorHistoryAvailability,
  ]);

  const selectSection = useCallback((sectionId: string | null) => {
    setSelectedSectionId(sectionId);
    setSelectedBlockPath(null);
  }, []);

  const hydrateFromDetail = useCallback(
    (
      detail: PageEditorResourceDetail | null,
      options: { selectFirst?: boolean; resetDirty?: boolean } = {}
    ) => {
      setPage(detail);
      const document = normalizePageData(detail?.currentData);
      setPageDocument(document);
      savedDocumentRef.current = cloneDocument(document);
      resetEditorHistory();
      if (options.selectFirst ?? true) {
        selectSection(document.sections[0]?.id ?? null);
      }
      setSettingsTitle(detail?.title ?? "Homepage");
      setSettingsSlug(detail?.slug ?? "/");
      setShowInNav(document.settings.showInNav);
      setRevisionRetention(
        normalizePageRevisionRetentionValue(document.settings.revisionRetention)
      );
      if (options.resetDirty) setHasUnsavedChanges(false);
    },
    [resetEditorHistory, selectSection]
  );

  const selectBlock = useCallback((sectionId: string, blockPath: PageBlockPath) => {
    setSelectedSectionId(sectionId);
    setSelectedBlockPath(blockPath);
  }, []);

  const revisionsHost = editorHost.revisions;
  const commands = usePageEditorDocumentCommands({
    pageDocument,
    selectedSectionId,
    selectedSection,
    selectedBlock,
    selectedBlockPath,
    resolvedSelectedSection,
    device,
    pendingBlockInsert,
    pendingSectionInsertIndex,
    pendingBesideBlockPath,
    deleteSelectionTarget,
    canCreateContentSectionFromUntargetedBlock,
    setDocumentDraft,
    selectSection,
    selectBlock,
    setCommandOpen,
    setCommandQuery,
    setCommandActiveIndex,
    setPendingBlockInsert,
    setPendingSectionInsertIndex,
    setPendingBesideBlockPath,
    setDeleteSelectionTarget,
    setInlineEditTarget,
  });

  const { addSection, addBlock } = commands;

  // Published Page Templates offered by the insert/apply picker. Applying a
  // template is an editor-side document edit: sections are instantiated with
  // fresh ids and persist through the existing save paths.
  useEffect(() => {
    const templateLibrary = editorHost.templateLibrary;
    if (!commandOpen || !templateLibrary || templateOptions !== null) return undefined;
    let cancelled = false;
    void templateLibrary
      .listPublished()
      .then((items) => {
        if (!cancelled) setTemplateOptions(items);
      })
      .catch(() => {
        if (!cancelled) setTemplateOptions([]);
      });
    return () => {
      cancelled = true;
    };
  }, [commandOpen, editorHost, templateOptions]);

  const insertTemplate = useCallback(
    async (templateId: string) => {
      const templateLibrary = editorHost.templateLibrary;
      if (!templateLibrary) return;
      setCommandOpen(false);
      setCommandQuery("");
      setCommandActiveIndex(0);
      setPendingBlockInsert(null);
      setPendingSectionInsertIndex(null);
      setPendingBesideBlockPath(null);
      try {
        const sections = await templateLibrary.instantiateSections(templateId);
        if (sections.length === 0) return;
        setDocumentDraft((current) => ({
          ...current,
          sections: [...current.sections, ...sections],
        }));
        const firstSectionId = sections[0]?.id ?? null;
        selectSection(firstSectionId);
      } catch (templateError) {
        setError(resolveInlineError(templateError, "Failed to insert template."));
      }
    },
    [editorHost, selectSection, setDocumentDraft]
  );

  const runCommandResult = useCallback(
    (index: number) => {
      if (index < filteredSections.length) {
        const sectionOption = filteredSections[index];
        if (sectionOption) addSection(sectionOption.type);
        return;
      }
      const blockIndex = index - filteredSections.length;
      if (blockIndex < filteredBlocks.length) {
        const blockOption = filteredBlocks[blockIndex];
        if (blockOption) addBlock(blockOption.type);
        return;
      }
      const templateOption = filteredTemplates[blockIndex - filteredBlocks.length];
      if (templateOption) void insertTemplate(templateOption.id);
    },
    [addBlock, addSection, filteredBlocks, filteredSections, filteredTemplates, insertTemplate]
  );

  const handleCommandQueryChange = useCallback((value: string) => {
    setCommandQuery(value);
    setCommandActiveIndex(0);
  }, []);

  const handleCommandKeyDown = useCallback(
    (event: ReactKeyboardEvent<HTMLInputElement>) => {
      if (event.key === "ArrowDown") {
        event.preventDefault();
        setCommandActiveIndex((index) =>
          commandResultCount > 0 ? (index + 1) % commandResultCount : 0
        );
        return;
      }
      if (event.key === "ArrowUp") {
        event.preventDefault();
        setCommandActiveIndex((index) =>
          commandResultCount > 0 ? (index - 1 + commandResultCount) % commandResultCount : 0
        );
        return;
      }
      if (event.key === "Enter") {
        event.preventDefault();
        runCommandResult(commandActiveIndex);
      }
    },
    [commandActiveIndex, commandResultCount, runCommandResult]
  );
  return {
    editorHost,
    pageId,
    page,
    pageDocument,
    selectedSectionId,
    selectedBlockPath,
    inlineEditTarget,
    device,
    panelOpen,
    markToolbarDock,
    siteTokens,
    canvasSiteTokenVariables,
    canvasBrandTokenVariables,
    sitePalette,
    hasUnsavedChanges,
    isLoading,
    isSaving,
    isPublishing,
    error,
    revalidationError,
    autosaveError,
    recoverableAutosave,
    dismissedRecoverableAutosaveId,
    recoveryCheckError,
    recoveryActionError,
    revalidatedResourceKey,
    commandOpen,
    commandQuery,
    commandActiveIndex,
    pendingBlockInsert,
    pendingSectionInsertIndex,
    pendingBesideBlockPath,
    layersOpen,
    activePanel,
    toolbarCollapsed,
    deleteSelectionTarget,
    settingsOpen,
    pageSettingsPanelOpen,
    settingsTitle,
    settingsSlug,
    showInNav,
    revisionRetention,
    revisionsOpen,
    revisions,
    revisionsLoading,
    revisionsError,
    restoringRevisionId,
    discardingRevisionId,
    previewOpen,
    previewUrl,
    previewLoading,
    previewProbe,
    previewError,
    templateOptions,
    historyAvailability,
    toolbarElementRef,
    revisionsHost,
    savedDocumentRef,
    latestLoadedPageRef,
    revalidatedResourceRef,
    hasUnsavedChangesRef,
    canvasFormPreviewBindings,
    canvasCollectionPreviewBindings,
    canvasDataByBlockId,
    selectedSection,
    resolvedSelectedSection,
    hasFloatingPanelSelection,
    panelTokens,
    selectedBlock,
    selectedBlockId,
    resolvedSelectedBlock,
    toolbarBlockTarget,
    toolbarTargetLabel,
    toolbarSelectionMeta,
    selectedBlockContainerLayout,
    horizontalBlockMoveAvailable,
    verticalBlockMoveAvailable,
    verticalBlockMoveStep,
    sectionColumnMoveActive,
    horizontalMoveSetsColumn,
    canAddBlockBeside,
    typographyPanelAvailable,
    hostAppearancePanel,
    visibleToolbarPanelOptions,
    activeToolbarPanel,
    canUndoEditorChange,
    canRedoEditorChange,
    hostPalette,
    availableSectionOptions,
    availableBlockOptions,
    canInsertSections,
    canCreateContentSectionFromUntargetedBlock,
    filteredSections,
    filteredBlocks,
    filteredTemplates,
    commandResultCount,
    setPage,
    setPageDocument,
    setInlineEditTarget,
    setDevice,
    setPanelOpen,
    setMarkToolbarDock,
    setHasUnsavedChanges,
    setIsLoading,
    setIsSaving,
    setIsPublishing,
    setError,
    setRevalidationError,
    setAutosaveError,
    setRecoverableAutosave,
    setDismissedRecoverableAutosaveId,
    setRecoveryCheckError,
    setRecoveryActionError,
    setRevalidatedResourceKey,
    setCommandOpen,
    setCommandQuery,
    setCommandActiveIndex,
    setPendingBlockInsert,
    setPendingSectionInsertIndex,
    setPendingBesideBlockPath,
    setLayersOpen,
    setActivePanel,
    setToolbarCollapsed,
    setDeleteSelectionTarget,
    setSettingsOpen,
    setPageSettingsPanelOpen,
    setSettingsTitle,
    setSettingsSlug,
    setShowInNav,
    setRevisionRetention,
    setRevisionsOpen,
    setRevisions,
    setRevisionsLoading,
    setRevisionsError,
    setRestoringRevisionId,
    setDiscardingRevisionId,
    setPreviewOpen,
    setPreviewUrl,
    setPreviewProbe,
    setPreviewError,
    setPreviewLoading,
    setTemplateOptions,
    selectSection,
    selectBlock,
    setDocumentDraft,
    undoEditorChange,
    redoEditorChange,
    resetEditorHistory,
    hydrateFromDetail,
    openCommandPalette,
    openCommandPaletteForTarget,
    openCommandPaletteAtGap,
    openCommandPaletteBesideSelected,
    insertTemplate,
    runCommandResult,
    handleCommandQueryChange,
    handleCommandKeyDown,
    ...commands,
  };
};
