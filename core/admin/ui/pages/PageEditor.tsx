import {
  Fragment,
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import type {
  CSSProperties,
  KeyboardEvent as ReactKeyboardEvent,
  PointerEvent as ReactPointerEvent,
  ReactNode,
} from "react";
import {
  ArrowDown,
  ArrowLeft,
  ArrowRight,
  ArrowUp,
  Columns2,
  Copy,
  Clipboard,
  ClipboardPaste,
  Eye,
  GripVertical,
  History,
  Layers,
  Maximize2,
  Minimize2,
  Palette,
  PanelRight,
  PanelTop,
  Plus,
  RotateCcw,
  Redo2,
  Save,
  Settings2,
  SlidersHorizontal,
  Trash2,
  Undo2,
  X,
} from "lucide-react";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetDescription, SheetTitle } from "@/components/ui/sheet";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { isApiClientError, isSessionExpiredApiError } from "@/services/apiClient";
import { cacheKeys } from "@/services/cachePolicy";
import { getCachedContentTypes, listContentTypesCached } from "@/services/contentTypesClient";
import { listEntriesCached } from "@/services/entriesClient";
import { getCachedForms, getFormDetailCached, listFormsCached } from "@/services/formsClient";
import {
  getCachedListingQueries,
  getCachedListingTemplates,
  listListingQueriesCached,
  listListingTemplatesCached,
  type ListingQueryRecord,
} from "@/services/listingsClient";
import { getCachedMedia, listMediaCached, type MediaRecord } from "@/services/mediaClient";
import {
  discardPageRevision,
  getCachedPageDetail,
  getPageCached,
  listPageRevisions,
  previewPage,
  publishPage,
  restorePageRevision,
  autosavePage,
  updatePage,
  type PageDetail,
  type PageRevision,
  type PreviewProbeResult,
} from "@/services/pagesClient";
import { getPageTemplateCached, listPageTemplatesCached } from "@/services/pageTemplatesClient";
import { getCachedSettings, getSettingsCached } from "@/services/settingsClient";
import { RuntimePreviewDialog } from "@/ui/preview/RuntimePreviewDialog";
import { EditorShell } from "@/ui/layouts/EditorShell";
import { createAdminActionToastAdapter } from "@/ui/shared/actionToasts";
import { useAdminDirtyNavigationGuard } from "@/ui/shared/AdminDirtyNavigationGuard";
import { ConfirmActionDialog } from "@/ui/shared/ConfirmActionDialog";
import { StatusBadge } from "@/ui/shared/StatusBadge";
import {
  clearActiveAssistantSurfaceContext,
  setActiveAssistantSurfaceContext,
} from "@/ui/assistant/activeSurfaceContext";
import { subscribeCacheEvents } from "@/utils/cacheBus";
import {
  clearBlockResponsiveOverride,
  clearResponsiveOverride,
  createPageBlockV2,
  createPageDocumentId,
  applyBlockTextMark,
  removeBlockTextMark,
  createPageSectionV2,
  isPageTypographyCapableBlockType,
  normalizeBlockTextMarks,
  normalizeStoredPageDocumentV2ForRead,
  resolvePageSectionForBreakpoint,
  type PageBlockType,
  type PageBlockV2,
  type PageBreakpoint,
  type PageDocumentV2,
  type PageSectionVariant,
  type PageSectionType,
  type PageSectionV2,
} from "../../../services/pages/pageDocumentV2";
import {
  getPageResponsiveEffectiveVisible,
  getPageSectionVariantControl,
  isPageSectionVariantOption,
  getPageEditorControlsForTarget,
  pageResponsiveHideToggles,
  pageSectionStackVerticalControl,
  pageUniversalSectionControls,
  projectPageResponsiveOverrideEntries,
  type PageEditorControlDefinition,
  type PageEditorControlOptionsSource,
} from "../../../services/pages/pageEditorControlRegistry";
import {
  getPageEditorColorPalette,
  resolvePageEditorControlUiModel,
  type PageEditorColorSwatch,
  type PageEditorControlUiModel,
} from "../../../services/pages/pageEditorControlUiModel";
import { getPageBlockRenderDefault } from "../../../services/pages/pageBlockRenderDefaults";
import {
  DEFAULT_TOKENS,
  type DesignTokenOverrides,
  type DesignTokens,
} from "../../../services/theme/tokenTypes";
import { mergeTokens } from "../../../services/theme/tokenUtils";
import { assertTokenOverrides } from "../../../services/theme/tokenValidation";
import { toPageCanvasColorCssVariableMap } from "../../../ui/theme/tokenCss";
import {
  ColorSwatchControl,
  ComboboxControl,
  FacetListControl,
  ListItemsControl,
  MediaPickerControl,
  SegmentedControl,
  SliderControl,
  SliderStepperControl,
  ToggleSwitch,
  type ComboboxControlOption,
} from "./editorControls";
import {
  editorCanvasCtaButtonClass,
  editorControlFocusClass,
  editorControlLabelClass,
  editorDarkButtonClass,
  editorDarkGhostButtonClass,
} from "./editorControls/controlChrome";
import {
  deletePageBlockAtPath,
  duplicatePageBlockAtPath,
  duplicatePageBlockTreeWithNewIds,
  getDefaultPageBlockInsertTarget,
  getPageBlockAfterInsertTarget,
  getPageBlockAdjacentColumnMoveTarget,
  getPageBlockAtPath,
  getPageBlockBesideInsertStatus,
  getPageBlockContainerLayout,
  getPageBlockEditorSlotKeys,
  getPageBlockListAtPath,
  getPageBlockSiblingMoveTarget,
  insertPageBlockAtTarget,
  insertPageBlockBeside,
  movePageBlockToTarget,
  movePageSectionBlockToAdjacentColumn,
  movePageSectionBlockWithinColumn,
  updatePageBlockAtPath,
  type PageBlockInsertTarget,
  type PageBlockPath,
} from "../../../services/pages/pageBlockPaths";
import {
  insertSectionAfter,
  parsePageEditorClipboardFragment,
  serializePageEditorClipboardPayload,
} from "../../../services/pages/pageEditorClipboard";
import {
  composeAuthoringGradientCss,
  type AuthoringGradientModel,
} from "../../../services/pages/pageAuthoringSanitizers";
import { pinUnassignedPageSectionBlocksToColumn } from "../../../services/pages/pageSectionColumns";
import {
  commitInlineText,
  inlineEditableTargets,
  resolveInlineEditTarget,
} from "../../../services/pages/pageInlineEditContract";
import {
  instantiatePageTemplateSections,
  normalizeStoredPageTemplateDocument,
} from "../../../services/pages/pageTemplateLibrarySchema";
import {
  getPageSectionEffectiveColumns,
  getPageSectionFallbackVariant,
} from "../../../services/pages/pageSectionTemplates";
import {
  patchBlockControlForDevice,
  patchBlockPropsForDevice,
  patchSectionControlForDevice,
  sanitizePageSectionStylePatch,
  setBlockVisibleForBreakpoint,
  setSectionVisibleForBreakpoint,
} from "../../../services/pages/pageEditorMutationActions";
import {
  clampToolbarOffset,
  hasAnyResponsiveOverride,
  hasPathValue,
  hasResponsiveOverride,
  readBlockBreakpointOverride,
  readSectionBreakpointOverride,
} from "../../../services/pages/pageEditorState";
import {
  buildPageEditorCollectionPreviewBindings,
  collectPageEditorCollectionPreviewContentTypeIds,
  type PageEditorCollectionPreviewSource,
} from "../../../services/pages/pageEditorCollectionPreview";
import {
  buildPageEditorFormPreviewBindings,
  collectPageEditorFormPreviewFormIds,
  type PageEditorFormPreviewDetail,
} from "../../../services/pages/pageEditorFormPreview";
import {
  blockOptions,
  canvasDeviceFrameClassMap,
  deviceScopeReadout,
  resolveToolbarTargetLabel,
  sectionOptions,
  toolbarActionTooltips,
  toolbarPanelOptions,
  type ToolbarPanel,
  type ToolbarPanelOption,
} from "./editor/pageEditorOptions";
import { getBlockDisplayLabel } from "./editor/pageEditorLabels";
import {
  SectionCanvas,
  SectionGapInsertZone,
  type PageEditorInlineEditCommit,
  type PageEditorInlineEditTarget,
  type PageEditorMarkToolbarDock,
  type PageEditorTextMarkCommit,
} from "./editor/PageAuthoringCanvas";
import { LayerBlockRows } from "./editor/PageEditorLayers";
import { PageEditorCommandPalette } from "./editor/PageEditorCommandPalette";
import { ToolbarIconButton } from "./editor/FloatingEditorToolbar";
import {
  isNewerPageDetailTimestamp,
  shouldApplyFreshPageEditorDetail,
  type PageEditorHost,
  type PageEditorRevision,
  type PageEditorResourceDetail,
} from "./editor/pageEditorHostContract";
import type { PageRuntimeDataByBlockId } from "../../../services/pages/pageRuntimeBindingContract";
import { normalizePageRevisionRetentionValue } from "../../../services/pages/revisionRetention";
import {
  resolveAssistantPageSelection,
  summarizePageSectionsForAssistant,
} from "../../../services/assistant/pageActiveSurfaceSummary";
import { DeviceSwitcher } from "./DeviceSwitcher";

export type {
  PageEditorHost,
  PageEditorHostAppearancePanelProps,
  PageEditorHostCanvasChromeProps,
  PageEditorHostFreshnessMode,
  PageEditorHostLoadOptions,
  PageEditorHostPalette,
  PageEditorHostPreviewResponse,
  PageEditorHostPublishResult,
  PageEditorHostRevisions,
  PageEditorHostSettingsRenderProps,
} from "./editor/pageEditorHostContract";
export { resolveToolbarTargetLabel } from "./editor/pageEditorOptions";

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

type ToolbarDeleteTarget =
  | {
      kind: "section";
      sectionId: string;
      label: string;
    }
  | {
      kind: "block";
      sectionId: string;
      blockPath: PageBlockPath;
      label: string;
    };

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

/**
 * Site token overrides stored under `design.tokens` in the admin settings
 * payload (the route returns the server-resolved token set). Anything that is
 * not a valid token-override record fails closed to `null` so the canvas
 * anchors on `DEFAULT_TOKENS` — never on a guessed shape.
 */
const readSiteDesignTokenOverrides = (
  settings: Record<string, unknown> | null
): DesignTokenOverrides | null => {
  const value = settings?.["design.tokens"];
  if (!isPlainRecord(value)) return null;
  try {
    assertTokenOverrides(value);
    return value;
  } catch {
    return null;
  }
};

/**
 * WYSIWYG anchor for the canvas (phase2 smoke anomaly #2): the admin shell
 * paints its OWN `--text-*`/`--font-*` admin-theme variables on `:root`, so a
 * canvas heading using `var(--text-sm, <fallback>)` would resolve the ADMIN
 * typography scale instead of the site's — drifting from the published front.
 * The canvas frame therefore re-paints the site typography token variables
 * (the exact map `toCssVariables` emits on the front `:root`) inline: cached
 * settings hydrate first, one background fetch revalidates, and settings
 * cache-bus updates keep the frame in sync. With nothing cached the frame
 * carries the `DEFAULT_TOKENS` values — the documented `var()` fallbacks.
 */
const useCanvasSiteTokens = (): DesignTokens => {
  const [settings, setSettings] = useState<Record<string, unknown> | null>(() =>
    getCachedSettings()
  );

  useEffect(() => {
    let active = true;
    void getSettingsCached()
      .then((payload) => {
        if (active) setSettings(payload);
      })
      .catch(() => {
        // Offline/unauthorized: the canvas keeps the DEFAULT_TOKENS anchor.
      });
    return () => {
      active = false;
    };
  }, []);

  useEffect(
    () =>
      subscribeCacheEvents((event) => {
        if (event.key !== cacheKeys.settingsRedacted) return;
        const cached = getCachedSettings();
        if (cached) setSettings(cached);
      }),
    []
  );

  return useMemo(
    () => mergeTokens(DEFAULT_TOKENS, readSiteDesignTokenOverrides(settings)),
    [settings]
  );
};

/**
 * Live design-token swatch palette (used by the block/section color controls)
 * threaded to the floating toolbar via context, so the swatch previews reflect
 * the resolved SITE theme instead of `DEFAULT_TOKENS`. The default keeps the
 * DEFAULT-token palette for any consumer rendered without a provider (and for
 * the host-appearance/menu color controls, which are intentionally excluded).
 */
const PageEditorColorPaletteContext = createContext<readonly PageEditorColorSwatch[]>(
  getPageEditorColorPalette()
);
const usePageEditorColorPalette = (): readonly PageEditorColorSwatch[] =>
  useContext(PageEditorColorPaletteContext);

const resolvePageId = (pathname: string) => {
  const parts = pathname.split("/").filter(Boolean);
  const pageIndex = parts.findIndex((segment) => segment === "pages");
  if (pageIndex === -1) return null;
  return parts[pageIndex + 1] ?? null;
};

const cloneDocument = (document: PageDocumentV2): PageDocumentV2 =>
  JSON.parse(JSON.stringify(document)) as PageDocumentV2;

const cloneBlockPath = (path: PageBlockPath | null): PageBlockPath | null => {
  if (!path) return null;
  const [first, ...rest] = path.map((segment) => ({ ...segment }));
  if (!first) return null;
  return [first, ...rest];
};

const documentsEqual = (left: PageDocumentV2, right: PageDocumentV2): boolean =>
  JSON.stringify(left) === JSON.stringify(right);

type PageEditorHistorySnapshot = {
  document: PageDocumentV2;
  selectedSectionId: string | null;
  selectedBlockPath: PageBlockPath | null;
};

const PAGE_EDITOR_HISTORY_LIMIT = 50;
const PAGE_EDITOR_CLIPBOARD_SESSION_KEY = "coderso.pageEditor.clipboard";

const isPlainRecord = (value: unknown): value is Record<string, unknown> =>
  Boolean(value) && typeof value === "object" && !Array.isArray(value);

const readPathValue = (source: unknown, path: readonly string[]): unknown =>
  path.reduce<unknown>((current, key) => {
    if (!isPlainRecord(current)) return undefined;
    return current[key];
  }, source);

type PageOverrideBreakpoint = Exclude<PageBreakpoint, "desktop">;

/**
 * EFFECTIVE display value of a control (TASK-449 owner bug #9, round 3): the
 * stored value when present, otherwise the effective RENDER default from
 * `pageBlockRenderDefaults` (what the renderer actually paints for the unset
 * field — baked text classes, grid-stretch frame width), otherwise the
 * registry `fallback` (the schema default an unset field renders as). Only
 * fields with no single effective rendered value resolve to "" — segmented
 * strips then mark NO option active, and sliders rest at their minimum. This
 * must never show a zero-value lie (e.g. Opacity 0 for an unset value that
 * renders as 1). Display-only: writes stay explicit through `onCommit`.
 */
const fieldValueFromControlValue = (
  control: PageEditorControlDefinition,
  value: unknown,
  renderDefault?: string | number
): string => {
  if (control.input === "switch") {
    if (typeof value === "boolean") return value ? "yes" : "no";
    return control.fallback === true ? "yes" : "no";
  }
  if (control.input === "number") {
    if (typeof value === "number") return String(value);
    if (typeof renderDefault === "number") return String(renderDefault);
    return typeof control.fallback === "number" ? String(control.fallback) : "";
  }
  if (control.input === "select" || control.input === "segmented") {
    if (typeof value === "string") return value;
    if (typeof renderDefault === "string") return renderDefault;
    return typeof control.fallback === "string" ? control.fallback : "";
  }
  if (typeof value === "string") return value;
  if (typeof value === "number" || typeof value === "boolean") return String(value);
  return "";
};

const coerceControlFieldValue = (control: PageEditorControlDefinition, value: string): unknown => {
  if (control.input === "switch") return value === "yes";
  if (control.input === "number") {
    const parsed = Number(value);
    const fallback = control.clamp?.min ?? 0;
    const next = Number.isFinite(parsed) ? parsed : fallback;
    if (!control.clamp) return next;
    return Math.min(control.clamp.max, Math.max(control.clamp.min, next));
  }
  return value;
};

// Round-3 friction A: the floating toolbar anchors `bottom-6` (24px) over the
// canvas, so its measured height plus the anchor offset plus breathing room is
// reserved as scroll clearance below the canvas content. Without it, targets
// under the expanded panel (ghost "Add block" tiles, blocks at the bottom of
// short pages) could never be scrolled clear and clicks landed on the panel
// until the selection was cleared with Escape.
const TOOLBAR_CANVAS_CLEARANCE_GAP = 24 + 16;

const isEditableShortcutTarget = (target: EventTarget | null) => {
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

// Enter-to-inline-edit must never hijack keyboard activation of a focused
// interactive control (toolbar buttons, layer rows, links).
const isInteractiveActivationTarget = (target: EventTarget | null) => {
  if (typeof HTMLElement === "undefined" || !(target instanceof HTMLElement)) return false;
  return Boolean(target.closest("button, a, [role='button'], [role='menuitem'], [role='option']"));
};

/** First contract target rendered for a block: drives Enter-to-edit on the selected block. */
const getFirstInlineEditablePropPath = (block: PageBlockV2): string | null => {
  for (const target of inlineEditableTargets) {
    if (target.blockType !== block.type) continue;
    const propPath = target.propPath.endsWith(".*")
      ? `${target.propPath.slice(0, -1)}0`
      : target.propPath;
    if (resolveInlineEditTarget(block, propPath)) return propPath;
  }
  return null;
};

/** Locates a block path by id so inline commits survive path shifts and abort after deletion. */
const findSectionBlockPathById = (
  blocks: readonly PageBlockV2[],
  blockId: string,
  ownerPath?: PageBlockPath,
  slotKey?: PageBlockPath[number]["slotKey"]
): PageBlockPath | null => {
  for (let index = 0; index < blocks.length; index += 1) {
    const block = blocks[index]!;
    const blockPath = (
      ownerPath ? [...ownerPath, { slotKey, index }] : [{ index }]
    ) as PageBlockPath;
    if (block.id === blockId) return blockPath;
    for (const childSlotKey of getPageBlockEditorSlotKeys(block)) {
      const found = findSectionBlockPathById(
        block.slots?.[childSlotKey] ?? [],
        blockId,
        blockPath,
        childSlotKey
      );
      if (found) return found;
    }
  }
  return null;
};

const readInlineTextPropValue = (block: PageBlockV2, propPath: string): string | null => {
  const [rootKey, indexSegment] = propPath.split(".");
  if (!rootKey) return null;
  const value = block.props[rootKey];
  if (indexSegment === undefined) return typeof value === "string" ? value : null;
  if (!Array.isArray(value)) return null;
  const item = value[Number(indexSegment)];
  return typeof item === "string" ? item : null;
};

// Same device-scoped write path the floating-panel fields drive
// (patchBlockPropsForDevice); list items patch the resolved array as a whole,
// mirroring how the panel "items" field writes.
const patchInlineTextPropForDevice = (
  block: PageBlockV2,
  device: PageBreakpoint,
  resolvedBlock: PageBlockV2,
  propPath: string,
  nextText: string
): PageBlockV2 => {
  const [rootKey, indexSegment] = propPath.split(".");
  if (!rootKey) return block;
  if (indexSegment === undefined) {
    return patchBlockPropsForDevice(block, device, { [rootKey]: nextText });
  }
  const items = resolvedBlock.props[rootKey];
  if (!Array.isArray(items)) return block;
  const index = Number(indexSegment);
  if (!Number.isInteger(index) || index < 0 || index >= items.length) return block;
  const nextItems = items.slice();
  nextItems[index] = nextText;
  return patchBlockPropsForDevice(block, device, { [rootKey]: nextItems });
};

const resolvePageEditorMutationError = (action: "saveDraft" | "publish", error: unknown) => {
  if (isSessionExpiredApiError(error)) {
    const message =
      action === "publish"
        ? "Your admin session expired. Sign in again before publishing."
        : "Your admin session expired. Sign in again before saving.";
    pageEditorActionToasts.error(action, {
      ...(typeof error === "object" && error !== null ? error : {}),
      name: "ApiClientError",
      code: "session_expired",
      status: 401,
      message,
    });
    return message;
  }
  return pageEditorActionToasts.error(action, error);
};

const resolveInlineError = (error: unknown, fallback: string) => {
  if (isSessionExpiredApiError(error)) return "Your admin session expired. Sign in again.";
  if (isApiClientError(error)) return error.message;
  return fallback;
};

const normalizePageData = (data?: Record<string, unknown> | null): PageDocumentV2 =>
  normalizeStoredPageDocumentV2ForRead(data);

const writeEditorClipboardText = async (text: string): Promise<void> => {
  if (typeof window !== "undefined") {
    window.sessionStorage.setItem(PAGE_EDITOR_CLIPBOARD_SESSION_KEY, text);
  }
  try {
    await navigator.clipboard?.writeText(text);
  } catch {
    // The sessionStorage fallback above remains available for paste.
  }
};

const readEditorClipboardText = async (): Promise<string | null> => {
  try {
    const text = await navigator.clipboard?.readText();
    if (text) return text;
  } catch {
    // Fall through to the in-session fallback.
  }
  if (typeof window === "undefined") return null;
  return window.sessionStorage.getItem(PAGE_EDITOR_CLIPBOARD_SESSION_KEY);
};

export function findRecoverableAutosaveRevision(
  revisions: PageEditorRevision[],
  page: Pick<PageEditorResourceDetail, "updatedAt">
): PageEditorRevision | null {
  const candidates = revisions
    .filter((revision) => revision.kind === "autosave")
    .filter((revision) => isNewerPageDetailTimestamp(revision.createdAt, page.updatedAt))
    .sort((left, right) => Date.parse(right.createdAt) - Date.parse(left.createdAt));
  return candidates[0] ?? null;
}

const createStarterSection = (type: PageSectionType) => {
  const blocks =
    type === "hero"
      ? [
          createPageBlockV2("heading", {
            props: { text: "Build with Coderso", level: "h1", align: "center" },
          }),
          createPageBlockV2("text", {
            props: {
              text: "Compose sections and atomic blocks directly on the canvas.",
              format: "plain",
              align: "center",
            },
          }),
          createPageBlockV2("button", {
            props: {
              label: "Primary action",
              href: "/",
              target: "self",
              variant: "primary",
              size: "md",
            },
          }),
        ]
      : [
          createPageBlockV2("heading", {
            props: { text: `${type.replace(/-/g, " ")} section`, level: "h2", align: "left" },
          }),
          createPageBlockV2("text", {
            props: { text: "Add focused content blocks here.", format: "plain", align: "left" },
          }),
        ];
  return createPageSectionV2(type, {
    variant: getPageSectionFallbackVariant(type),
    blocks,
  });
};

const duplicateSectionWithIds = (section: PageSectionV2): PageSectionV2 => ({
  ...cloneDocument({
    schemaVersion: 2,
    breakpoints: ["desktop", "tablet", "mobile"],
    seo: {},
    settings: { template: "page-v2", showInNav: true },
    sections: [section],
  }).sections[0]!,
  id: createPageDocumentId("sec"),
  name: `${section.name} copy`,
  blocks: section.blocks.map(duplicatePageBlockTreeWithNewIds),
});

export function PageEditor({ pageId: initialPageId, initialPage, host }: PageEditorProps) {
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
  const [toolbarDragging, setToolbarDragging] = useState(false);
  const [toolbarOffset, setToolbarOffset] = useState({ x: 0, y: 0 });
  const toolbarDragRef = useRef({ startX: 0, startY: 0, baseX: 0, baseY: 0 });
  const toolbarElementRef = useRef<HTMLDivElement | null>(null);
  // Measured floating-toolbar footprint (height + anchor + gap) reserved as
  // canvas scroll clearance while the toolbar is visible (round-3 friction A).
  const [toolbarCanvasClearance, setToolbarCanvasClearance] = useState(0);
  const [deleteSelectionTarget, setDeleteSelectionTarget] = useState<ToolbarDeleteTarget | null>(
    null
  );
  const [settingsOpen, setSettingsOpen] = useState(false);
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
  // Mirrors the floating toolbar render condition; drives the canvas scroll
  // clearance that keeps canvas targets reachable under the toolbar.
  const floatingToolbarVisible = hasFloatingPanelSelection && panelOpen;
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

  const updateSelectedSection = useCallback(
    (updater: (section: PageSectionV2) => PageSectionV2) => {
      if (!selectedSectionId) return;
      setDocumentDraft((current) => ({
        ...current,
        sections: current.sections.map((section) =>
          section.id === selectedSectionId ? updater(section) : section
        ),
      }));
    },
    [selectedSectionId, setDocumentDraft]
  );

  const updateSectionGroup = useCallback(
    <Key extends "layout" | "style" | "spacing" | "visibility">(
      key: Key,
      patch: Partial<PageSectionV2[Key]>
    ) => {
      const safePatch =
        key === "style"
          ? (sanitizePageSectionStylePatch(patch as Partial<PageSectionV2["style"]>) as Partial<
              PageSectionV2[Key]
            >)
          : patch;
      updateSelectedSection((section) => {
        if (device === "desktop") {
          return { ...section, [key]: { ...section[key], ...safePatch } };
        }
        return {
          ...section,
          responsive: {
            ...section.responsive,
            [device]: {
              ...(section.responsive[device] ?? {}),
              [key]: {
                ...((section.responsive[device]?.[key] as Record<string, unknown> | undefined) ??
                  {}),
                ...safePatch,
              },
            },
          },
        };
      });
    },
    [device, updateSelectedSection]
  );

  const updateSelectedBlockControl = useCallback(
    (control: PageEditorControlDefinition, value: unknown) => {
      updateSelectedSection((section) => {
        if (selectedBlockPath) {
          return updatePageBlockAtPath(section, selectedBlockPath, (block) =>
            patchBlockControlForDevice(block, device, control, value)
          ).section;
        }
        return {
          ...section,
          blocks: section.blocks.map((block, index) =>
            index === 0 ? patchBlockControlForDevice(block, device, control, value) : block
          ),
        };
      });
    },
    [device, selectedBlockPath, updateSelectedSection]
  );

  const updateSelectedSectionControl = useCallback(
    (control: PageEditorControlDefinition, value: unknown) => {
      updateSelectedSection((section) => {
        const next = patchSectionControlForDevice(section, device, control, value);
        // Column-switch bridge (owner finding #5, round 3): when the COLUMNS
        // control takes the desktop base from one effective column to N >= 2,
        // every still-unassigned root block is pinned to column 1 in the same
        // deliberate (and undoable) write, so existing content stays visually
        // stacked together instead of scattering through auto-flow — the new
        // columns start empty with their own add tiles. The bridge is scoped
        // to the columns control on the desktop base: variant switches keep
        // their template-designed auto-flow, stackVertical only collapses and
        // restores the existing grid, and tablet/mobile column overrides stay
        // editor-resolved auto-flow (stackVertical is the supported collapse).
        if (
          control.id === "section.layout.columns" &&
          device === "desktop" &&
          next.blocks.length > 0 &&
          getPageSectionEffectiveColumns(section) < 2 &&
          getPageSectionEffectiveColumns(next) >= 2
        ) {
          return { ...next, blocks: pinUnassignedPageSectionBlocksToColumn(next.blocks, 1) };
        }
        return next;
      });
    },
    [device, updateSelectedSection]
  );

  const startInlineEdit = useCallback((target: PageEditorInlineEditTarget) => {
    setInlineEditTarget(target);
  }, []);

  const commitInlineEdit = useCallback(
    (commit: PageEditorInlineEditCommit) => {
      setInlineEditTarget(null);
      // Unchanged canvas text is a strict no-op: no document write, no
      // dirty-state churn, and renderer fallback text (e.g. "Heading" for an
      // empty prop) is never promoted into stored props.
      if (commit.text === commit.renderedText) return;
      for (const section of pageDocument.sections) {
        const blockPath = findSectionBlockPathById(section.blocks, commit.blockId);
        if (!blockPath) continue;
        const resolvedBlock =
          getPageBlockAtPath(resolvePageSectionForBreakpoint(section, device), blockPath) ??
          getPageBlockAtPath(section, blockPath);
        if (!resolvedBlock) return;
        const target = resolveInlineEditTarget(resolvedBlock, commit.propPath);
        if (!target) return;
        const previous = readInlineTextPropValue(resolvedBlock, commit.propPath);
        if (previous === null) return;
        const next = commitInlineText(target, previous, commit.text);
        if (next === previous) return;
        setDocumentDraft((current) => ({
          ...current,
          sections: current.sections.map((entry) =>
            entry.id === section.id
              ? updatePageBlockAtPath(entry, blockPath, (block) =>
                  patchInlineTextPropForDevice(block, device, resolvedBlock, commit.propPath, next)
                ).section
              : entry
          ),
        }));
        return;
      }
      // The edited block no longer exists (deleted while editing): never write.
    },
    [device, pageDocument, setDocumentDraft]
  );

  const applyInlineTextMark = useCallback(
    (commit: PageEditorTextMarkCommit) => {
      if (device !== "desktop" || commit.propPath !== "text") return;
      for (const section of pageDocument.sections) {
        const blockPath = findSectionBlockPathById(section.blocks, commit.blockId);
        if (!blockPath) continue;
        const block = getPageBlockAtPath(section, blockPath);
        if (!block) return;
        const previous = readInlineTextPropValue(block, commit.propPath);
        if (previous === null) return;
        const currentMarks = normalizeBlockTextMarks(previous, block.props.marks);
        // `action: "remove"` is an explicit unlink/strip over the range (audit M7 /
        // TASK-478-02); everything else is the value-aware apply/replace/toggle.
        const nextMarks =
          commit.action === "remove"
            ? removeBlockTextMark(previous, currentMarks, commit)
            : applyBlockTextMark(previous, currentMarks, commit);
        if (JSON.stringify(currentMarks) === JSON.stringify(nextMarks)) return;
        setDocumentDraft((current) => ({
          ...current,
          sections: current.sections.map((entry) =>
            entry.id === section.id
              ? updatePageBlockAtPath(entry, blockPath, (currentBlock) =>
                  patchBlockPropsForDevice(currentBlock, "desktop", { marks: nextMarks })
                ).section
              : entry
          ),
        }));
        return;
      }
    },
    [device, pageDocument, setDocumentDraft]
  );

  const updateSelectedSectionVariant = useCallback(
    (variant: PageSectionVariant) => {
      updateSelectedSection((section) =>
        isPageSectionVariantOption(section.type, variant) ? { ...section, variant } : section
      );
    },
    [updateSelectedSection]
  );

  const clearSelectedBlockOverride = useCallback(
    (path: readonly string[]) => {
      if (device === "desktop") return;
      updateSelectedSection((section) => {
        if (selectedBlockPath) {
          return updatePageBlockAtPath(section, selectedBlockPath, (block) =>
            clearBlockResponsiveOverride(block, device, path)
          ).section;
        }
        return {
          ...section,
          blocks: section.blocks.map((block, index) =>
            index === 0 ? clearBlockResponsiveOverride(block, device, path) : block
          ),
        };
      });
    },
    [device, selectedBlockPath, updateSelectedSection]
  );

  // Responsive-panel target = the selected block when one is selected,
  // otherwise the selected section (never a first-block fallback).
  const setResponsiveTargetVisible = useCallback(
    (breakpoint: PageBreakpoint, visible: boolean) => {
      updateSelectedSection((section) => {
        if (selectedBlockPath) {
          return updatePageBlockAtPath(section, selectedBlockPath, (block) =>
            setBlockVisibleForBreakpoint(block, breakpoint, visible)
          ).section;
        }
        return setSectionVisibleForBreakpoint(section, breakpoint, visible);
      });
    },
    [selectedBlockPath, updateSelectedSection]
  );

  const clearResponsiveTargetOverride = useCallback(
    (breakpoint: PageOverrideBreakpoint, path: readonly string[]) => {
      updateSelectedSection((section) => {
        if (selectedBlockPath) {
          return updatePageBlockAtPath(section, selectedBlockPath, (block) =>
            clearBlockResponsiveOverride(block, breakpoint, path)
          ).section;
        }
        return clearResponsiveOverride(section, breakpoint, path);
      });
    },
    [selectedBlockPath, updateSelectedSection]
  );

  const addSection = useCallback(
    (type: PageSectionType) => {
      const section = createStarterSection(type);
      setDocumentDraft((current) => {
        const sections = [...current.sections];
        const insertIndex =
          pendingSectionInsertIndex === null
            ? sections.length
            : Math.max(0, Math.min(pendingSectionInsertIndex, sections.length));
        sections.splice(insertIndex, 0, section);
        return { ...current, sections };
      });
      selectSection(section.id);
      setCommandOpen(false);
      setCommandQuery("");
      setCommandActiveIndex(0);
      setPendingBlockInsert(null);
      setPendingSectionInsertIndex(null);
      setPendingBesideBlockPath(null);
    },
    [pendingSectionInsertIndex, selectSection, setDocumentDraft]
  );

  const addBlock = useCallback(
    (type: PageBlockType) => {
      // Column-targeted ghost tiles (owner finding #5, round 3) stamp the
      // section column assignment onto the new block at creation time, so the
      // insert itself stays the plain append the target describes.
      const block = createPageBlockV2(
        type,
        pendingBlockInsert?.column !== undefined
          ? { style: { column: pendingBlockInsert.column } }
          : undefined
      );
      if (!selectedSectionId) {
        if (!canCreateContentSectionFromUntargetedBlock) {
          const fallbackSection = pageDocument.sections[0];
          if (!fallbackSection) return;
          const result = insertPageBlockAtTarget(
            fallbackSection,
            getDefaultPageBlockInsertTarget(fallbackSection, null),
            block
          );
          if (result.status !== "ok" || !result.path) return;
          setDocumentDraft((current) => ({
            ...current,
            sections: current.sections.map((section) =>
              section.id === fallbackSection.id ? result.section : section
            ),
          }));
          selectBlock(fallbackSection.id, result.path);
          setCommandOpen(false);
          setCommandQuery("");
          setCommandActiveIndex(0);
          setPendingBlockInsert(null);
          setPendingSectionInsertIndex(null);
          setPendingBesideBlockPath(null);
          return;
        }
        const section = createPageSectionV2("content", { blocks: [block] });
        setDocumentDraft((current) => ({ ...current, sections: [...current.sections, section] }));
        selectBlock(section.id, [{ index: 0 }]);
        setCommandOpen(false);
        setCommandQuery("");
        setCommandActiveIndex(0);
        setPendingBlockInsert(null);
        setPendingSectionInsertIndex(null);
        setPendingBesideBlockPath(null);
        return;
      }
      if (!selectedSection) return;
      // "Add block beside" defers the row-group wrap/append to pick-time so a
      // cancelled palette never mutates the document (owner finding #7).
      const result = pendingBesideBlockPath
        ? insertPageBlockBeside(selectedSection, pendingBesideBlockPath, block)
        : insertPageBlockAtTarget(
            selectedSection,
            pendingBlockInsert?.target ??
              getDefaultPageBlockInsertTarget(selectedSection, selectedBlockPath),
            block
          );
      if (result.status !== "ok" || !result.path) return;
      setDocumentDraft((current) => {
        const sections = current.sections.map((section) =>
          section.id === selectedSectionId ? result.section : section
        );
        return { ...current, sections };
      });
      selectBlock(selectedSectionId, result.path);
      setCommandOpen(false);
      setCommandQuery("");
      setCommandActiveIndex(0);
      setPendingBlockInsert(null);
      setPendingSectionInsertIndex(null);
      setPendingBesideBlockPath(null);
    },
    [
      canCreateContentSectionFromUntargetedBlock,
      pageDocument.sections,
      pendingBesideBlockPath,
      pendingBlockInsert,
      selectBlock,
      selectedBlockPath,
      selectedSection,
      selectedSectionId,
      setDocumentDraft,
    ]
  );

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

  const moveSelectedSection = useCallback(
    (direction: -1 | 1) => {
      if (!selectedSectionId) return;
      setDocumentDraft((current) => {
        const index = current.sections.findIndex((section) => section.id === selectedSectionId);
        const target = index + direction;
        if (index < 0 || target < 0 || target >= current.sections.length) return current;
        const sections = [...current.sections];
        const [section] = sections.splice(index, 1);
        if (!section) return current;
        sections.splice(target, 0, section);
        return { ...current, sections };
      });
    },
    [selectedSectionId, setDocumentDraft]
  );

  // Sibling move by an arbitrary signed offset (owner finding #6): ±1 for
  // left/right (and single-column up/down), ±effectiveColumns for vertical
  // moves inside a multi-column section grid. Out-of-range targets are strict
  // no-ops — clamping would teleport the block into a different grid column.
  const moveSelectedBlockBy = useCallback(
    (offset: number) => {
      if (!selectedSectionId || !selectedSection || !selectedBlockPath) return;
      const target = getPageBlockSiblingMoveTarget(selectedBlockPath, offset);
      if (!target) return;
      const listResult = getPageBlockListAtPath(selectedSection, target.listPath);
      if (listResult.status !== "ok") return;
      const targetIndex = target.index ?? 0;
      if (targetIndex < 0 || targetIndex > listResult.blocks.length - 1) return;
      const result = movePageBlockToTarget(selectedSection, selectedBlockPath, target);
      if (result.status !== "ok" || !result.path) return;
      setDocumentDraft((current) => ({
        ...current,
        sections: current.sections.map((section) =>
          section.id === selectedSectionId ? result.section : section
        ),
      }));
      selectBlock(selectedSectionId, result.path);
    },
    [selectBlock, selectedBlockPath, selectedSection, selectedSectionId, setDocumentDraft]
  );

  const moveSelectedBlockToTarget = useCallback(
    (target: PageBlockInsertTarget) => {
      if (!selectedSectionId || !selectedSection || !selectedBlockPath) return;
      const result = movePageBlockToTarget(selectedSection, selectedBlockPath, target);
      if (result.status !== "ok" || !result.path) return;
      setDocumentDraft((current) => ({
        ...current,
        sections: current.sections.map((section) =>
          section.id === selectedSectionId ? result.section : section
        ),
      }));
      selectBlock(selectedSectionId, result.path);
    },
    [selectBlock, selectedBlockPath, selectedSection, selectedSectionId, setDocumentDraft]
  );

  // Horizontal Left/Right move (owner finding #6): ±1 sibling move inside a
  // row group, adjacent-slot move inside a columns block (the geometry the
  // user actually sees). At the section root of a multi-column section
  // (owner finding #5, round 3) Left/Right SET the column assignment instead
  // of swapping indices: the block moves into the adjacent column stack and
  // every other block keeps its cell. Out-of-range moves are strict no-ops.
  const moveSelectedBlockHorizontally = useCallback(
    (direction: -1 | 1) => {
      if (!selectedSection || !selectedBlockPath || !resolvedSelectedSection || !selectedSectionId)
        return;
      const layout = getPageBlockContainerLayout(resolvedSelectedSection, selectedBlockPath);
      if (layout.kind === "columns-slot") {
        const target = getPageBlockAdjacentColumnMoveTarget(
          resolvedSelectedSection,
          selectedBlockPath,
          direction
        );
        if (!target) return;
        moveSelectedBlockToTarget(target);
        return;
      }
      if (layout.kind === "grid" || layout.kind === "section-column") {
        // The assignment write lands on the BASE section (column composition
        // is structural and breakpoint-invariant on the public front); the
        // block keeps its path, so the selection stays put.
        const result = movePageSectionBlockToAdjacentColumn(
          selectedSection,
          selectedBlockPath,
          direction
        );
        if (!result) return;
        setDocumentDraft((current) => ({
          ...current,
          sections: current.sections.map((section) =>
            section.id === selectedSectionId ? result : section
          ),
        }));
        return;
      }
      if (layout.kind === "stack") return;
      moveSelectedBlockBy(direction);
    },
    [
      moveSelectedBlockBy,
      moveSelectedBlockToTarget,
      resolvedSelectedSection,
      selectedBlockPath,
      selectedSection,
      selectedSectionId,
      setDocumentDraft,
    ]
  );

  // Vertical Up/Down while per-column composition is active (owner finding
  // #5, round 3): reorder the selected block within its column stack.
  const moveSelectedBlockWithinColumnStack = useCallback(
    (direction: -1 | 1) => {
      if (!selectedSectionId || !selectedSection || !selectedBlockPath) return;
      const result = movePageSectionBlockWithinColumn(
        selectedSection,
        selectedBlockPath,
        direction
      );
      if (!result) return;
      setDocumentDraft((current) => ({
        ...current,
        sections: current.sections.map((section) =>
          section.id === selectedSectionId ? result.section : section
        ),
      }));
      selectBlock(selectedSectionId, result.path);
    },
    [selectBlock, selectedBlockPath, selectedSection, selectedSectionId, setDocumentDraft]
  );

  const duplicateSelectedSection = useCallback(() => {
    if (!selectedSection) return;
    const duplicate = duplicateSectionWithIds(selectedSection);
    setDocumentDraft((current) => {
      const index = current.sections.findIndex((section) => section.id === selectedSection.id);
      const sections = [...current.sections];
      sections.splice(index + 1, 0, duplicate);
      return { ...current, sections };
    });
    selectSection(duplicate.id);
  }, [selectSection, selectedSection, setDocumentDraft]);

  const duplicateSelectedBlock = useCallback(() => {
    if (!selectedSectionId || !selectedSection || !selectedBlockPath) return;
    const result = duplicatePageBlockAtPath(selectedSection, selectedBlockPath);
    if (result.status !== "ok" || !result.path) return;
    setDocumentDraft((current) => ({
      ...current,
      sections: current.sections.map((section) =>
        section.id === selectedSectionId ? result.section : section
      ),
    }));
    selectBlock(selectedSectionId, result.path);
  }, [selectBlock, selectedBlockPath, selectedSection, selectedSectionId, setDocumentDraft]);

  const deleteSectionById = useCallback(
    (sectionId: string) => {
      setDocumentDraft((current) => {
        const sections = current.sections.filter((section) => section.id !== sectionId);
        return { ...current, sections };
      });
      selectSection(null);
    },
    [selectSection, setDocumentDraft]
  );

  const deleteBlockByPath = useCallback(
    (sectionId: string, blockPath: PageBlockPath) => {
      const section = pageDocument.sections.find((entry) => entry.id === sectionId);
      if (!section) return;
      const result = deletePageBlockAtPath(section, blockPath);
      if (result.status !== "ok") return;
      setDocumentDraft((current) => ({
        ...current,
        sections: current.sections.map((entry) =>
          entry.id === sectionId ? result.section : entry
        ),
      }));
      if (result.fallbackPath) {
        selectBlock(sectionId, result.fallbackPath);
      } else {
        selectSection(sectionId);
      }
    },
    [pageDocument.sections, selectBlock, selectSection, setDocumentDraft]
  );

  const requestDeleteSelection = useCallback(() => {
    if (selectedSectionId && selectedBlockPath && selectedBlock) {
      setDeleteSelectionTarget({
        kind: "block",
        sectionId: selectedSectionId,
        blockPath: selectedBlockPath,
        label: getBlockDisplayLabel(selectedBlock),
      });
      return;
    }
    if (!selectedSectionId || !selectedSection) return;
    setDeleteSelectionTarget({
      kind: "section",
      sectionId: selectedSectionId,
      label: selectedSection.name,
    });
  }, [selectedBlock, selectedBlockPath, selectedSection, selectedSectionId]);

  const confirmDeleteSelection = useCallback(() => {
    if (!deleteSelectionTarget) return;
    if (deleteSelectionTarget.kind === "block") {
      deleteBlockByPath(deleteSelectionTarget.sectionId, deleteSelectionTarget.blockPath);
    } else {
      deleteSectionById(deleteSelectionTarget.sectionId);
    }
    setDeleteSelectionTarget(null);
  }, [deleteBlockByPath, deleteSectionById, deleteSelectionTarget]);

  const copySelectedFragment = useCallback(async () => {
    if (!selectedSection) return;
    if (selectedBlock) {
      await writeEditorClipboardText(serializePageEditorClipboardPayload("block", selectedBlock));
      return;
    }
    await writeEditorClipboardText(serializePageEditorClipboardPayload("section", selectedSection));
  }, [selectedBlock, selectedSection]);

  const pasteClipboardFragment = useCallback(async () => {
    const text = await readEditorClipboardText();
    if (!text) return;
    const fragment = parsePageEditorClipboardFragment(text);
    if (!fragment) return;

    if (fragment.kind === "section") {
      setDocumentDraft((current) =>
        insertSectionAfter(current, selectedSectionId, fragment.section)
      );
      selectSection(fragment.section.id);
      return;
    }

    const targetSection = selectedSection ?? pageDocument.sections[0] ?? null;
    if (!targetSection) return;
    const target =
      selectedBlockPath && selectedSection
        ? getPageBlockAfterInsertTarget(selectedBlockPath)
        : { listPath: {}, index: targetSection.blocks.length };
    if (!target) return;
    const result = insertPageBlockAtTarget(targetSection, target, fragment.block);
    if (result.status !== "ok" || !result.path) return;
    setDocumentDraft((current) => ({
      ...current,
      sections: current.sections.map((section) =>
        section.id === targetSection.id ? result.section : section
      ),
    }));
    selectBlock(targetSection.id, result.path);
  }, [
    pageDocument.sections,
    selectBlock,
    selectSection,
    selectedBlockPath,
    selectedSection,
    selectedSectionId,
    setDocumentDraft,
  ]);

  const startToolbarDrag = useCallback(
    (event: ReactPointerEvent<HTMLButtonElement>) => {
      event.preventDefault();
      toolbarDragRef.current = {
        startX: event.clientX,
        startY: event.clientY,
        baseX: toolbarOffset.x,
        baseY: toolbarOffset.y,
      };
      setToolbarDragging(true);
    },
    [toolbarOffset]
  );

  useEffect(() => {
    if (!toolbarDragging || typeof window === "undefined") return undefined;
    const handlePointerMove = (event: PointerEvent) => {
      const drag = toolbarDragRef.current;
      setToolbarOffset({
        x: clampToolbarOffset(drag.baseX + event.clientX - drag.startX, -360, 360),
        y: clampToolbarOffset(drag.baseY + event.clientY - drag.startY, -260, 260),
      });
    };
    const handlePointerUp = () => setToolbarDragging(false);
    window.addEventListener("pointermove", handlePointerMove);
    window.addEventListener("pointerup", handlePointerUp);
    return () => {
      window.removeEventListener("pointermove", handlePointerMove);
      window.removeEventListener("pointerup", handlePointerUp);
    };
  }, [toolbarDragging]);

  // Round-3 friction A: while the floating toolbar is visible, reserve its
  // measured footprint as bottom scroll clearance on the canvas scroller.
  // Targets that sit under the expanded panel (ghost "Add block" tiles,
  // blocks near the bottom of short pages) stay reachable by scrolling — a
  // single click then acts without first deselecting via Escape. The
  // ResizeObserver fires on observe and on every expand/collapse/panel-switch
  // resize, so the clearance always tracks the live toolbar height.
  useEffect(() => {
    if (!floatingToolbarVisible || typeof ResizeObserver === "undefined") return undefined;
    const element = toolbarElementRef.current;
    if (!element) return undefined;
    const observer = new ResizeObserver(() => {
      setToolbarCanvasClearance(
        Math.ceil(element.getBoundingClientRect().height) + TOOLBAR_CANVAS_CLEARANCE_GAP
      );
    });
    observer.observe(element);
    return () => observer.disconnect();
  }, [floatingToolbarVisible]);

  useEffect(() => {
    if (typeof document === "undefined") return undefined;
    const handleKeyDown = (event: KeyboardEvent) => {
      const editableTarget = isEditableShortcutTarget(event.target);
      if (event.key === "Escape") {
        if (editableTarget && !commandOpen) return;
        if (deleteSelectionTarget) {
          event.preventDefault();
          setDeleteSelectionTarget(null);
          return;
        }
        if (commandOpen) {
          event.preventDefault();
          setCommandOpen(false);
          setPendingBlockInsert(null);
          setPendingSectionInsertIndex(null);
          setPendingBesideBlockPath(null);
          return;
        }
        if (layersOpen) {
          event.preventDefault();
          setLayersOpen(false);
          return;
        }
        if (settingsOpen) {
          event.preventDefault();
          setSettingsOpen(false);
          return;
        }
        if (revisionsOpen) {
          event.preventDefault();
          setRevisionsOpen(false);
          return;
        }
        if (previewOpen) {
          event.preventDefault();
          setPreviewOpen(false);
          return;
        }
        if (selectedSectionId) {
          event.preventDefault();
          selectSection(null);
        }
        return;
      }
      if (editableTarget) return;
      const key = event.key.toLowerCase();
      const hasModifier = event.metaKey || event.ctrlKey;
      if (hasModifier && key === "k") {
        event.preventDefault();
        openCommandPalette();
        return;
      }
      const hasBlockingOverlay =
        commandOpen ||
        settingsOpen ||
        revisionsOpen ||
        previewOpen ||
        Boolean(deleteSelectionTarget);
      if (hasBlockingOverlay) return;
      if (hasModifier && key === "z") {
        event.preventDefault();
        if (event.shiftKey) {
          redoEditorChange();
        } else {
          undoEditorChange();
        }
        return;
      }
      if (hasModifier && key === "y") {
        event.preventDefault();
        redoEditorChange();
        return;
      }
      if (hasModifier && key === "c" && selectedSection) {
        event.preventDefault();
        void copySelectedFragment();
        return;
      }
      if (hasModifier && key === "v") {
        event.preventDefault();
        void pasteClipboardFragment();
        return;
      }
      if (hasModifier && key === "d" && selectedSection) {
        event.preventDefault();
        if (selectedBlock) {
          duplicateSelectedBlock();
        } else {
          duplicateSelectedSection();
        }
        return;
      }
      if (
        event.key === "Enter" &&
        !hasModifier &&
        selectedSection &&
        selectedBlockPath &&
        selectedBlock &&
        !isInteractiveActivationTarget(event.target)
      ) {
        const resolvedBlock =
          getPageBlockAtPath(
            resolvePageSectionForBreakpoint(selectedSection, device),
            selectedBlockPath
          ) ?? selectedBlock;
        const firstPropPath = getFirstInlineEditablePropPath(resolvedBlock);
        if (firstPropPath) {
          event.preventDefault();
          setInlineEditTarget({ blockId: selectedBlock.id, propPath: firstPropPath });
        }
        return;
      }
      if ((event.key === "Delete" || event.key === "Backspace") && selectedSection) {
        event.preventDefault();
        requestDeleteSelection();
      }
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [
    commandOpen,
    copySelectedFragment,
    deleteSelectionTarget,
    device,
    duplicateSelectedBlock,
    duplicateSelectedSection,
    layersOpen,
    openCommandPalette,
    pasteClipboardFragment,
    previewOpen,
    requestDeleteSelection,
    redoEditorChange,
    revisionsOpen,
    selectSection,
    selectedBlock,
    selectedBlockPath,
    selectedSection,
    selectedSectionId,
    settingsOpen,
    undoEditorChange,
  ]);

  useEffect(() => {
    hasUnsavedChangesRef.current = hasUnsavedChanges;
  }, [hasUnsavedChanges]);

  useEffect(() => {
    latestLoadedPageRef.current = page;
  }, [page]);

  useEffect(() => {
    if (!pageId) return undefined;
    const resourceKey = `${editorHost.mode}:${pageId}`;
    if (revalidatedResourceRef.current === resourceKey) return undefined;
    revalidatedResourceRef.current = resourceKey;
    let cancelled = false;
    const load = async () => {
      const loadedAtStart = latestLoadedPageRef.current;
      if (!loadedAtStart) setIsLoading(true);
      try {
        const fresh = await editorHost.loadDetail(pageId, { force: true });
        if (cancelled) return;
        const currentLoaded = latestLoadedPageRef.current ?? loadedAtStart;
        if (
          fresh &&
          shouldApplyFreshPageEditorDetail({
            current: currentLoaded,
            fresh,
            isDirty: hasUnsavedChangesRef.current,
            mode: editorHost.freshnessMode ?? "updatedAt",
          })
        ) {
          hydrateFromDetail(fresh);
          setError(null);
          setRevalidationError(null);
        } else if (!currentLoaded && !fresh) {
          hydrateFromDetail(null);
        }
        setRevalidatedResourceKey(resourceKey);
      } catch (loadError) {
        if (cancelled) return;
        const message = resolveInlineError(loadError, editorHost.loadFailedMessage);
        if (loadedAtStart || latestLoadedPageRef.current) {
          setRevalidationError(message);
        } else {
          setError(message);
        }
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    };
    void load();
    return () => {
      cancelled = true;
    };
  }, [editorHost, hydrateFromDetail, pageId]);

  useEffect(() => {
    // Hosts without an assistant contract (Page Templates v1) advertise no
    // active surface instead of pretending to own one.
    if (!page || !editorHost.assistantSurface) return;
    const sections = summarizePageSectionsForAssistant(pageDocument.sections);
    const selection = resolveAssistantPageSelection(sections, {
      selectedSectionId,
      selectedBlockId: selectedBlock ? selectedBlock.id : null,
    });
    setActiveAssistantSurfaceContext({
      kind: "page",
      schemaVersion: 2,
      page: {
        id: page.id,
        title: page.title,
        slug: page.slug,
        status: page.status,
        template: pageDocument.settings.template,
      },
      selectedSectionId: selection.selectedSectionId,
      selectedBlockId: selection.selectedBlockId,
      selectedBlockPath: selection.selectedBlockPath,
      sections,
      warnings: hasUnsavedChanges ? ["page_has_unsaved_changes"] : [],
    });
    return () => clearActiveAssistantSurfaceContext();
  }, [editorHost, hasUnsavedChanges, page, pageDocument, selectedBlock, selectedSectionId]);

  useEffect(() => {
    if (!pageId) return undefined;
    return subscribeCacheEvents((event) => {
      if (event.key !== editorHost.detailCacheKey(pageId)) return;
      // Dirty-state protection: background revalidation never overwrites
      // unsaved edits.
      if (hasUnsavedChanges) return;
      const cached = editorHost.getCachedDetail(pageId);
      if (!cached) return;
      if (
        !shouldApplyFreshPageEditorDetail({
          current: page,
          fresh: cached,
          isDirty: hasUnsavedChanges,
          mode: "updatedAt",
        })
      ) {
        return;
      }
      hydrateFromDetail(cached);
    });
  }, [editorHost, hasUnsavedChanges, hydrateFromDetail, page, pageId]);

  useEffect(() => {
    const autosaveDocument = editorHost.autosaveDocument;
    if (!page || !hasUnsavedChanges || !autosaveDocument) return undefined;
    const timeoutId = window.setTimeout(() => {
      void autosaveDocument(page.id, pageDocument)
        .then(() => setAutosaveError(null))
        .catch((autosaveErrorValue: unknown) => {
          setAutosaveError(
            resolveInlineError(autosaveErrorValue, "Autosave failed. Try saving manually.")
          );
        });
    }, 1500);
    return () => window.clearTimeout(timeoutId);
  }, [editorHost, hasUnsavedChanges, page, pageDocument]);

  const saveCurrentDraft = useCallback(async () => {
    if (!page) return null;
    const updated = await editorHost.saveDocument(page.id, pageDocument);
    const document = normalizePageData(updated.currentData);
    setPage(updated);
    setPageDocument(document);
    savedDocumentRef.current = cloneDocument(document);
    resetEditorHistory();
    setHasUnsavedChanges(false);
    setAutosaveError(null);
    return updated;
  }, [editorHost, page, pageDocument, resetEditorHistory]);

  const handleSaveDraft = async () => {
    if (!page) return;
    setIsSaving(true);
    setError(null);
    try {
      await saveCurrentDraft();
      pageEditorActionToasts.success("saveDraft");
    } catch (saveError) {
      setError(resolvePageEditorMutationError("saveDraft", saveError));
    } finally {
      setIsSaving(false);
    }
  };

  const handlePublish = async () => {
    if (!page || !editorHost.publish) return;
    setIsPublishing(true);
    setError(null);
    // Draft/published coherence: publishing unsaved edits must persist them
    // through the same draft-save path as Save/Preview first, otherwise a
    // reload would resurrect the stale draft while the public site renders
    // the published document.
    let publishTarget = page;
    let publishDocument = pageDocument;
    if (hasUnsavedChanges) {
      try {
        const saved = await saveCurrentDraft();
        if (!saved) {
          setIsPublishing(false);
          return;
        }
        publishTarget = saved;
        publishDocument = normalizePageData(saved.currentData);
      } catch (saveError) {
        // Failure ordering: a failed draft save aborts the publish so the
        // published site never gets ahead of a draft we could not persist.
        setError(resolvePageEditorMutationError("saveDraft", saveError));
        setIsPublishing(false);
        return;
      }
    }
    try {
      const result = await editorHost.publish(publishTarget.id, publishDocument);
      // Prefer the authoritative post-publish detail over a hand-built page
      // object; keep the fallback for hosts that do not return the detail.
      // The dirty flag is owned by saveCurrentDraft above, so edits made
      // while the publish request was in flight keep their unsaved state.
      const publishedPage = result?.page ?? { ...publishTarget, status: "published" };
      setPage(publishedPage);
      savedDocumentRef.current = cloneDocument(publishDocument);
      resetEditorHistory();
      pageEditorActionToasts.success("publish");
    } catch (publishError) {
      // Failure ordering: the draft save above already committed; surface the
      // publish failure without hiding or rolling back the saved draft.
      setError(resolvePageEditorMutationError("publish", publishError));
    } finally {
      setIsPublishing(false);
    }
  };

  const handleSettingsSave = async () => {
    if (!page) return;
    setIsSaving(true);
    setError(null);
    try {
      const nextDocument: PageDocumentV2 = {
        ...pageDocument,
        settings: {
          ...pageDocument.settings,
          showInNav,
          revisionRetention,
        },
      };
      const updated = await updatePage(page.id, {
        title: settingsTitle.trim(),
        slug: settingsSlug.startsWith("/") ? settingsSlug : `/${settingsSlug}`,
        data: nextDocument,
      });
      const document = normalizePageData(updated.currentData);
      setPage(updated);
      setPageDocument(document);
      savedDocumentRef.current = cloneDocument(document);
      resetEditorHistory();
      setHasUnsavedChanges(false);
      setSettingsOpen(false);
      pageEditorActionToasts.success("saveDraft");
    } catch (settingsError) {
      setError(resolvePageEditorMutationError("saveDraft", settingsError));
    } finally {
      setIsSaving(false);
    }
  };

  // Host settings sheets save page-chrome metadata through their own client
  // call; only the detail metadata is synchronized so unsaved canvas edits
  // are never overwritten.
  const handleHostSettingsSaved = useCallback((detail: PageDetail) => {
    setPage(detail);
    setSettingsTitle(detail.title);
    setSettingsSlug(detail.slug);
    setSettingsOpen(false);
  }, []);

  const revisionsHost = editorHost.revisions;

  useEffect(() => {
    if (!page || editorHost.mode !== "page" || !revisionsHost) return undefined;
    if (hasUnsavedChanges) return undefined;
    if (revalidatedResourceKey !== `${editorHost.mode}:${page.id}`) return undefined;
    let cancelled = false;
    void revisionsHost
      .list(page.id)
      .then((items) => {
        if (cancelled) return;
        setRecoveryCheckError(null);
        const candidate = findRecoverableAutosaveRevision(items, page);
        setRecoverableAutosave(
          candidate && candidate.id !== dismissedRecoverableAutosaveId ? candidate : null
        );
      })
      .catch((revisionError) => {
        if (!cancelled) {
          setRecoveryCheckError(
            resolveInlineError(revisionError, "Could not check for draft recovery.")
          );
        }
      });
    return () => {
      cancelled = true;
    };
  }, [
    dismissedRecoverableAutosaveId,
    editorHost.mode,
    hasUnsavedChanges,
    page,
    revalidatedResourceKey,
    revisionsHost,
  ]);

  const openRevisions = async () => {
    if (!page || !revisionsHost) return;
    setRevisionsOpen(true);
    setRevisionsLoading(true);
    setRevisionsError(null);
    try {
      setRevisions(await revisionsHost.list(page.id));
    } catch (revisionError) {
      setRevisionsError(resolveInlineError(revisionError, "Failed to load page history."));
    } finally {
      setRevisionsLoading(false);
    }
  };

  const restoreRevision = async (revisionId: string) => {
    if (!page || !revisionsHost) return;
    setRestoringRevisionId(revisionId);
    try {
      const result = await revisionsHost.restore(page.id, revisionId);
      if (result.page) {
        hydrateFromDetail(result.page, { resetDirty: true });
      }
      setRevisions(await revisionsHost.list(page.id));
    } catch (restoreError) {
      setRevisionsError(resolveInlineError(restoreError, "Failed to restore revision."));
    } finally {
      setRestoringRevisionId(null);
    }
  };

  const discardRevision = async (revisionId: string) => {
    if (!page || !revisionsHost) return;
    setDiscardingRevisionId(revisionId);
    try {
      await revisionsHost.discard(page.id, revisionId);
      setRevisions(await revisionsHost.list(page.id));
    } catch (discardError) {
      setRevisionsError(resolveInlineError(discardError, "Failed to discard revision."));
    } finally {
      setDiscardingRevisionId(null);
    }
  };

  const restoreRecoverableAutosave = async () => {
    if (!page || !recoverableAutosave || !revisionsHost) return;
    setRestoringRevisionId(recoverableAutosave.id);
    setRecoveryActionError(null);
    try {
      const result = await revisionsHost.restore(page.id, recoverableAutosave.id);
      if (result.page) {
        hydrateFromDetail(result.page, { resetDirty: true });
      }
      setRecoverableAutosave(null);
      setDismissedRecoverableAutosaveId(null);
    } catch (restoreError) {
      setRecoveryActionError(resolveInlineError(restoreError, "Failed to restore draft version."));
    } finally {
      setRestoringRevisionId(null);
    }
  };

  const discardRecoverableAutosave = async () => {
    if (!page || !recoverableAutosave || !revisionsHost) return;
    setDiscardingRevisionId(recoverableAutosave.id);
    setRecoveryActionError(null);
    try {
      await revisionsHost.discard(page.id, recoverableAutosave.id);
      setRecoverableAutosave(null);
      setDismissedRecoverableAutosaveId(null);
    } catch (discardError) {
      setRecoveryActionError(resolveInlineError(discardError, "Failed to discard draft version."));
    } finally {
      setDiscardingRevisionId(null);
    }
  };

  const dismissRecoverableAutosave = () => {
    if (recoverableAutosave) setDismissedRecoverableAutosaveId(recoverableAutosave.id);
    setRecoverableAutosave(null);
    setRecoveryActionError(null);
  };

  const handlePreview = async () => {
    // Optional host capability (TASK-458-03): the affordance is hidden when
    // the host issues no preview tokens, so this is a type guard only.
    const previewHost = editorHost.preview;
    if (!page || !previewHost) return;
    setPreviewLoading(true);
    setPreviewError(null);
    try {
      const previewPageId = hasUnsavedChanges ? (await saveCurrentDraft())?.id : page.id;
      if (!previewPageId) return;
      const response = await previewHost(previewPageId);
      setPreviewUrl(response.previewUrl);
      setPreviewProbe(response.probe ?? null);
      setPreviewOpen(true);
    } catch (previewErrorValue) {
      setPreviewError(resolveInlineError(previewErrorValue, "Failed to generate preview."));
    } finally {
      setPreviewLoading(false);
    }
  };

  const navigationBlocked = hasUnsavedChanges || Boolean(recoverableAutosave);
  const { dialog: dirtyNavigationDialog } = useAdminDirtyNavigationGuard({
    blocked: navigationBlocked,
    title: recoverableAutosave
      ? "Leave without recovering draft version?"
      : "Discard unsaved page changes?",
    description: recoverableAutosave
      ? "A saved draft version is available. Cancel to recover it, or continue and leave it in history."
      : "Cancel to keep editing, or discard local changes and continue.",
    confirmLabel: "Discard and continue",
    cancelLabel: "Keep editing",
    onConfirmDiscard: () => {
      setHasUnsavedChanges(false);
      if (recoverableAutosave) {
        setDismissedRecoverableAutosaveId(recoverableAutosave.id);
        setRecoverableAutosave(null);
      }
    },
  });

  const topbarActions = (
    <div className="flex items-center gap-2">
      <DeviceSwitcher value={device} onChange={setDevice} />
      <Button
        type="button"
        variant={panelOpen ? "soft" : "ghost"}
        size="sm"
        onClick={() => setPanelOpen((open) => !open)}
        aria-label={panelOpen ? "Hide panel" : "Show panel"}
        aria-pressed={panelOpen}
      >
        <PanelRight className="h-4 w-4" />
        Panel
      </Button>
      <Button
        type="button"
        variant="ghost"
        size="sm"
        onClick={() => setLayersOpen((open) => !open)}
      >
        <Layers className="h-4 w-4" />
        Layers
      </Button>
      <Button type="button" variant="ghost" size="sm" onClick={() => setSettingsOpen(true)}>
        <Settings2 className="h-4 w-4" />
        {editorHost.settingsLabel}
      </Button>
      {revisionsHost ? (
        <Button type="button" variant="ghost" size="sm" onClick={openRevisions}>
          <History className="h-4 w-4" />
          History
        </Button>
      ) : null}
      {editorHost.preview ? (
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={previewLoading || !page}
          onClick={handlePreview}
        >
          <Eye className="h-4 w-4" />
          Preview
        </Button>
      ) : null}
      <Button
        type="button"
        variant="outline"
        size="sm"
        disabled={isSaving || !page}
        onClick={handleSaveDraft}
      >
        <Save className="h-4 w-4" />
        {isSaving ? "Saving..." : "Save"}
      </Button>
      {editorHost.publish ? (
        <Button type="button" size="sm" disabled={isPublishing || !page} onClick={handlePublish}>
          {isPublishing ? "Publishing..." : "Publish"}
        </Button>
      ) : null}
    </div>
  );

  return (
    <EditorShell
      breadcrumbs={
        <div className="flex items-center gap-3">
          <span className="text-sm text-muted-foreground">{editorHost.resourceLabel}</span>
          <span className="text-sm font-semibold">{page?.title ?? settingsTitle}</span>
          <StatusBadge status={page?.status ?? "draft"} />
          {hasUnsavedChanges ? (
            <Badge variant="warning" className="text-[10px] font-semibold uppercase">
              Unsaved
            </Badge>
          ) : null}
        </div>
      }
      topbarActions={topbarActions}
      centerScroll={false}
      contentClassName="h-full"
    >
      <div className="relative flex h-full min-h-0 flex-col bg-dotted">
        {error ? (
          <Alert variant="destructive" className="m-4">
            <AlertTitle>Page editor error</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        ) : null}

        {previewError ? (
          <Alert variant="destructive" className="m-4">
            <AlertTitle>Preview unavailable</AlertTitle>
            <AlertDescription>{previewError}</AlertDescription>
          </Alert>
        ) : null}

        {autosaveError ? (
          <Alert variant="destructive" className="m-4">
            <AlertTitle>Autosave paused</AlertTitle>
            <AlertDescription>{autosaveError}</AlertDescription>
          </Alert>
        ) : null}

        {revalidationError ? (
          <Alert variant="warning" className="m-4">
            <AlertTitle>Cached draft shown</AlertTitle>
            <AlertDescription>{revalidationError}</AlertDescription>
          </Alert>
        ) : null}

        {recoveryCheckError ? (
          <Alert variant="warning" className="m-4">
            <AlertTitle>Draft recovery unavailable</AlertTitle>
            <AlertDescription>{recoveryCheckError}</AlertDescription>
          </Alert>
        ) : null}

        {recoverableAutosave ? (
          <Alert variant="warning" className="m-4">
            <AlertTitle>Recover draft version</AlertTitle>
            <AlertDescription className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <span>
                A newer draft version from{" "}
                {new Date(recoverableAutosave.createdAt).toLocaleString()} is available in history.
              </span>
              <span className="flex flex-wrap gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={restoringRevisionId === recoverableAutosave.id}
                  onClick={() => void restoreRecoverableAutosave()}
                >
                  {restoringRevisionId === recoverableAutosave.id
                    ? "Restoring..."
                    : "Restore draft"}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={discardingRevisionId === recoverableAutosave.id}
                  onClick={() => void discardRecoverableAutosave()}
                >
                  {discardingRevisionId === recoverableAutosave.id
                    ? "Discarding..."
                    : "Discard draft"}
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={dismissRecoverableAutosave}
                >
                  Keep current
                </Button>
              </span>
            </AlertDescription>
            {recoveryActionError ? (
              <AlertDescription>{recoveryActionError}</AlertDescription>
            ) : null}
          </Alert>
        ) : null}

        <div
          className="flex items-center justify-center border-b border-border bg-muted/40 px-4 py-2 text-[11px] font-semibold uppercase text-muted-foreground"
          data-page-editor-canvas-context={device}
        >
          {device === "desktop"
            ? `${deviceScopeReadout("desktop")} · base view`
            : `${deviceScopeReadout(device)} · override context`}
        </div>

        <div
          className="min-h-0 flex-1 overflow-auto overscroll-contain p-6"
          data-page-editor-canvas-scroller="true"
          // Reserved floating-toolbar clearance: the bottom padding guarantees
          // scroll room past the toolbar, and the CSS variable feeds the
          // scroll-margin-bottom rule (globals.css) so scroll-into-view lands
          // canvas targets above the panel instead of underneath it.
          style={
            floatingToolbarVisible && toolbarCanvasClearance > 0
              ? ({
                  paddingBottom: toolbarCanvasClearance,
                  "--page-editor-toolbar-clearance": `${toolbarCanvasClearance}px`,
                } as CSSProperties)
              : undefined
          }
          onClick={() => selectSection(null)}
        >
          <div
            className={`mx-auto min-h-full w-full rounded-2xl bg-white p-4 shadow-soft transition-all ${canvasDeviceFrameClassMap[device]}`}
            // Site typography token variables (not the admin-theme ones) so
            // canvas `var(--text-*)`/`var(--font-*)` paints match the front.
            style={canvasSiteTokenVariables}
            data-page-editor-canvas-frame="true"
            data-page-editor-canvas-device={device}
          >
            {!isLoading && editorHost.canvasChrome ? (
              <div className="mb-4" data-page-editor-canvas-chrome="true">
                {editorHost.canvasChrome({ document: pageDocument, device })}
              </div>
            ) : null}
            {isLoading ? (
              <div className="p-16 text-center text-sm text-muted-foreground">Loading page...</div>
            ) : pageDocument.sections.length === 0 ? (
              <div className="p-16 text-center">
                <p className="text-sm text-muted-foreground">This page has no sections yet.</p>
                {canInsertSections ? (
                  <Button type="button" className="mt-4" onClick={openCommandPalette}>
                    <Plus className="h-4 w-4" />
                    Add section
                  </Button>
                ) : null}
              </div>
            ) : (
              <div className="space-y-4">
                {canInsertSections ? (
                  <div className="flex justify-center">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className={editorCanvasCtaButtonClass}
                      onClick={openCommandPalette}
                    >
                      <Plus className="h-4 w-4" />
                      Add section
                    </Button>
                  </div>
                ) : null}
                {pageDocument.sections.map((section, sectionIndex) => (
                  <Fragment key={section.id}>
                    {canInsertSections ? (
                      <SectionGapInsertZone
                        index={sectionIndex}
                        onInsert={openCommandPaletteAtGap}
                      />
                    ) : null}
                    <SectionCanvas
                      section={resolvePageSectionForBreakpoint(section, device)}
                      baseSection={section}
                      selected={section.id === selectedSectionId}
                      selectedBlockPath={
                        section.id === selectedSectionId ? selectedBlockPath : null
                      }
                      selectedBlockId={section.id === selectedSectionId ? selectedBlockId : null}
                      inlineEditTarget={inlineEditTarget}
                      device={device}
                      canAddBlockBeside={canAddBlockBeside}
                      canvasDataByBlockId={canvasDataByBlockId}
                      markToolbarDock={markToolbarDock}
                      onMarkToolbarDockChange={setMarkToolbarDock}
                      onSelect={() => selectSection(section.id)}
                      onSelectBlock={(blockPath) => selectBlock(section.id, blockPath)}
                      onAddBlock={openCommandPalette}
                      onAddBlockToTarget={openCommandPaletteForTarget}
                      onAddBlockBeside={openCommandPaletteBesideSelected}
                      onStartInlineEdit={startInlineEdit}
                      onCommitInlineEdit={commitInlineEdit}
                      onApplyTextMark={applyInlineTextMark}
                    />
                  </Fragment>
                ))}
                {canInsertSections ? (
                  <SectionGapInsertZone
                    index={pageDocument.sections.length}
                    onInsert={openCommandPaletteAtGap}
                  />
                ) : null}
              </div>
            )}
          </div>
        </div>

        {layersOpen ? (
          <div className="absolute left-4 top-16 z-20 w-72 rounded-2xl border border-border bg-popover p-3 shadow-pop">
            <div className="mb-2 flex items-center justify-between">
              <p className="text-sm font-semibold">Layers</p>
              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                onClick={() => setLayersOpen(false)}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
            <div className="space-y-1">
              {pageDocument.sections.map((section) => (
                <div key={section.id} className="space-y-1">
                  <button
                    type="button"
                    className={`flex w-full items-center justify-between rounded px-2 py-2 text-left text-sm ${
                      section.id === selectedSectionId && !selectedBlockId
                        ? "bg-primary/10 text-primary"
                        : "hover:bg-muted"
                    }`}
                    data-page-editor-layer-section-id={section.id}
                    data-page-editor-responsive-target={
                      hasAnyResponsiveOverride(
                        device,
                        readSectionBreakpointOverride(section, device)
                      )
                        ? "override"
                        : "inherited"
                    }
                    onClick={() => selectSection(section.id)}
                  >
                    <span>{section.name}</span>
                    <span className="flex items-center gap-2 text-xs uppercase text-muted-foreground">
                      {hasAnyResponsiveOverride(
                        device,
                        readSectionBreakpointOverride(section, device)
                      )
                        ? `${device} override`
                        : null}
                      {section.type}
                    </span>
                  </button>
                  <div className="space-y-1 pl-4">
                    <LayerBlockRows
                      section={section}
                      blocks={section.blocks}
                      ownerPath={null}
                      selectedBlockPath={
                        section.id === selectedSectionId ? selectedBlockPath : null
                      }
                      canAddBeside={canAddBlockBeside}
                      device={device}
                      onSelectBlock={(blockPath) => selectBlock(section.id, blockPath)}
                      onAddToTarget={openCommandPaletteForTarget}
                      onMoveToTarget={moveSelectedBlockToTarget}
                      onAddBeside={openCommandPaletteBesideSelected}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : null}

        {panelOpen && selectedSection && resolvedSelectedSection ? (
          <div
            ref={toolbarElementRef}
            className="absolute bottom-6 left-1/2 z-30 w-[min(760px,calc(100%-2rem))] rounded-2xl bg-slate-950 p-2 text-white shadow-2xl"
            style={{
              transform: `translateX(calc(-50% + ${toolbarOffset.x}px)) translateY(${toolbarOffset.y}px)`,
            }}
            aria-label={`${toolbarTargetLabel} tools`}
            data-page-editor-floating-toolbar="true"
            data-page-editor-toolbar-collapsed={toolbarCollapsed ? "true" : "false"}
            data-page-editor-toolbar-dragging={toolbarDragging ? "true" : "false"}
          >
            {/*
              Head row owns identity (name + variant chip + editing-scope
              pill) on the left and the right-aligned action cluster; the
              panel category icons live on their own second row so they can
              never collide with the scope pill (owner finding #3).
            */}
            <div className="flex flex-wrap items-center gap-2" data-page-editor-toolbar-row="head">
              <ToolbarIconButton
                tooltip={toolbarActionTooltips.drag}
                onPointerDown={startToolbarDrag}
              >
                <GripVertical className="h-4 w-4" />
              </ToolbarIconButton>
              <div className="flex min-w-0 flex-1 items-center gap-2 px-2">
                <PanelTop className="h-4 w-4 text-slate-400" />
                <span className="truncate text-sm font-semibold">{toolbarTargetLabel}</span>
                <span className="rounded bg-white/10 px-2 py-0.5 text-[10px] font-semibold uppercase">
                  {toolbarSelectionMeta}
                </span>
                <span
                  className="shrink-0 rounded-full bg-sky-400/15 px-2 py-0.5 text-[10px] font-semibold text-sky-200"
                  data-page-editor-editing-scope={device}
                >
                  {device === "desktop"
                    ? `Editing: ${deviceScopeReadout("desktop")} (base)`
                    : `Editing: ${deviceScopeReadout(device)} (overrides)`}
                </span>
              </div>
              <div
                className="ml-auto flex shrink-0 items-center gap-1"
                data-page-editor-toolbar-actions="true"
              >
                <ToolbarIconButton
                  tooltip={
                    toolbarCollapsed ? toolbarActionTooltips.expand : toolbarActionTooltips.collapse
                  }
                  onClick={() => setToolbarCollapsed((collapsed) => !collapsed)}
                >
                  {toolbarCollapsed ? (
                    <Maximize2 className="h-4 w-4" />
                  ) : (
                    <Minimize2 className="h-4 w-4" />
                  )}
                </ToolbarIconButton>
                {!toolbarCollapsed ? (
                  <>
                    <ToolbarIconButton
                      tooltip={toolbarActionTooltips.undo}
                      disabled={!canUndoEditorChange}
                      onClick={undoEditorChange}
                    >
                      <Undo2 className="h-4 w-4" />
                    </ToolbarIconButton>
                    <ToolbarIconButton
                      tooltip={toolbarActionTooltips.redo}
                      disabled={!canRedoEditorChange}
                      onClick={redoEditorChange}
                    >
                      <Redo2 className="h-4 w-4" />
                    </ToolbarIconButton>
                    <ToolbarIconButton
                      tooltip={toolbarActionTooltips.copySelection}
                      onClick={() => void copySelectedFragment()}
                    >
                      <Clipboard className="h-4 w-4" />
                    </ToolbarIconButton>
                    <ToolbarIconButton
                      tooltip={toolbarActionTooltips.pasteSelection}
                      onClick={() => void pasteClipboardFragment()}
                    >
                      <ClipboardPaste className="h-4 w-4" />
                    </ToolbarIconButton>
                    {verticalBlockMoveAvailable ? (
                      <>
                        <ToolbarIconButton
                          tooltip={
                            selectedBlock
                              ? sectionColumnMoveActive
                                ? toolbarActionTooltips.moveBlockUpColumn
                                : verticalBlockMoveStep > 1
                                  ? toolbarActionTooltips.moveBlockUpRow
                                  : toolbarActionTooltips.moveBlockUp
                              : toolbarActionTooltips.moveSectionUp
                          }
                          onClick={() =>
                            selectedBlock
                              ? sectionColumnMoveActive
                                ? moveSelectedBlockWithinColumnStack(-1)
                                : moveSelectedBlockBy(-verticalBlockMoveStep)
                              : moveSelectedSection(-1)
                          }
                        >
                          <ArrowUp className="h-4 w-4" />
                        </ToolbarIconButton>
                        <ToolbarIconButton
                          tooltip={
                            selectedBlock
                              ? sectionColumnMoveActive
                                ? toolbarActionTooltips.moveBlockDownColumn
                                : verticalBlockMoveStep > 1
                                  ? toolbarActionTooltips.moveBlockDownRow
                                  : toolbarActionTooltips.moveBlockDown
                              : toolbarActionTooltips.moveSectionDown
                          }
                          onClick={() =>
                            selectedBlock
                              ? sectionColumnMoveActive
                                ? moveSelectedBlockWithinColumnStack(1)
                                : moveSelectedBlockBy(verticalBlockMoveStep)
                              : moveSelectedSection(1)
                          }
                        >
                          <ArrowDown className="h-4 w-4" />
                        </ToolbarIconButton>
                      </>
                    ) : null}
                    {selectedBlock && horizontalBlockMoveAvailable ? (
                      <>
                        <ToolbarIconButton
                          tooltip={
                            horizontalMoveSetsColumn
                              ? toolbarActionTooltips.moveBlockLeftColumn
                              : toolbarActionTooltips.moveBlockLeft
                          }
                          onClick={() => moveSelectedBlockHorizontally(-1)}
                        >
                          <ArrowLeft className="h-4 w-4" />
                        </ToolbarIconButton>
                        <ToolbarIconButton
                          tooltip={
                            horizontalMoveSetsColumn
                              ? toolbarActionTooltips.moveBlockRightColumn
                              : toolbarActionTooltips.moveBlockRight
                          }
                          onClick={() => moveSelectedBlockHorizontally(1)}
                        >
                          <ArrowRight className="h-4 w-4" />
                        </ToolbarIconButton>
                      </>
                    ) : null}
                    {selectedBlock ? (
                      // Owner finding #7 (round 3): a bare Columns2 glyph read
                      // as a layout toggle, not an insert action — the icon
                      // now carries an explicit "+" badge so the action is
                      // discoverable without hovering for the tooltip.
                      <ToolbarIconButton
                        tooltip={toolbarActionTooltips.addBlockBeside}
                        disabled={!canAddBlockBeside}
                        onClick={openCommandPaletteBesideSelected}
                      >
                        <span className="relative inline-flex" aria-hidden="true">
                          <Columns2 className="h-4 w-4" />
                          <Plus
                            className="absolute -right-1.5 -top-1.5 h-2.5 w-2.5 rounded-full bg-slate-950"
                            strokeWidth={3}
                          />
                        </span>
                      </ToolbarIconButton>
                    ) : null}
                    <ToolbarIconButton
                      tooltip={
                        selectedBlock
                          ? toolbarActionTooltips.duplicateBlock
                          : toolbarActionTooltips.duplicateSection
                      }
                      onClick={selectedBlock ? duplicateSelectedBlock : duplicateSelectedSection}
                    >
                      <Copy className="h-4 w-4" />
                    </ToolbarIconButton>
                    <ToolbarIconButton
                      tooltip={
                        selectedBlock
                          ? toolbarActionTooltips.deleteBlock
                          : toolbarActionTooltips.deleteSection
                      }
                      onClick={requestDeleteSelection}
                    >
                      <Trash2 className="h-4 w-4" />
                    </ToolbarIconButton>
                  </>
                ) : null}
              </div>
            </div>
            {!toolbarCollapsed ? (
              <div
                className="mt-1 flex flex-wrap items-center gap-1 border-t border-white/10 pt-1"
                data-page-editor-toolbar-row="panels"
              >
                {visibleToolbarPanelOptions.map(({ panel, label, description, Icon }) => (
                  <ToolbarIconButton
                    key={panel}
                    tooltip={{ label: `${label} panel`, description }}
                    active={activeToolbarPanel === panel}
                    expanded={activeToolbarPanel === panel}
                    panelId={panel}
                    onClick={() => setActivePanel((current) => (current === panel ? null : panel))}
                  >
                    <Icon className="h-4 w-4" />
                  </ToolbarIconButton>
                ))}
              </div>
            ) : null}
            {!toolbarCollapsed && activeToolbarPanel === "host-appearance" ? (
              // Host-owned appearance panel (TASK-458-03): same subpanel
              // chrome as the registry panels, content rendered by the host
              // through the shared control primitives.
              <div
                className="mt-2 flex max-h-[min(72vh,calc(100dvh-8rem))] flex-col overflow-hidden rounded-lg bg-white/5 text-slate-100"
                data-page-editor-toolbar-panel="host-appearance"
                data-page-editor-subpanel="viewport-safe"
                role="region"
                aria-label={`${hostAppearancePanel?.label ?? "Appearance"} toolbar panel`}
              >
                <div
                  className="flex shrink-0 items-start justify-between gap-2 border-b border-white/10 px-3 py-2"
                  data-page-editor-subpanel-header="true"
                >
                  <div className="min-w-0">
                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-200">
                      {hostAppearancePanel?.label ?? "Appearance"}
                    </p>
                    {hostAppearancePanel ? (
                      <p className="truncate text-[11px] text-slate-400">
                        {hostAppearancePanel.description}
                      </p>
                    ) : null}
                  </div>
                  <ToolbarIconButton
                    tooltip={toolbarActionTooltips.closePanel}
                    onClick={() => setActivePanel(null)}
                  >
                    <X className="h-4 w-4" />
                  </ToolbarIconButton>
                </div>
                <div
                  className="min-h-0 flex-1 overflow-y-auto overscroll-contain p-3"
                  data-page-editor-subpanel-scroll="true"
                >
                  {hostAppearancePanel?.render({
                    document: pageDocument,
                    device,
                    updateDocument: setDocumentDraft,
                  })}
                </div>
              </div>
            ) : null}
            {!toolbarCollapsed && activeToolbarPanel && activeToolbarPanel !== "host-appearance" ? (
              <PageEditorColorPaletteContext.Provider value={sitePalette}>
                <ToolbarSubpanel
                  panel={activeToolbarPanel}
                  device={device}
                  section={resolvedSelectedSection}
                  baseSection={selectedSection}
                  block={toolbarBlockTarget}
                  baseBlock={selectedBlockId ? selectedBlock : (selectedSection.blocks[0] ?? null)}
                  hasBlockSelection={Boolean(selectedBlockId)}
                  onSectionControlChange={updateSelectedSectionControl}
                  onSectionVariantChange={updateSelectedSectionVariant}
                  onSectionStyle={(patch) => updateSectionGroup("style", patch)}
                  onSectionVisibility={(patch) => updateSectionGroup("visibility", patch)}
                  onBlockControlChange={updateSelectedBlockControl}
                  onClearOverride={(path) => {
                    if (device === "desktop") return;
                    updateSelectedSection((section) =>
                      clearResponsiveOverride(section, device, path)
                    );
                  }}
                  onClearBlockOverride={clearSelectedBlockOverride}
                  onResponsiveVisibleChange={setResponsiveTargetVisible}
                  onResponsiveOverrideReset={clearResponsiveTargetOverride}
                  onAddBlock={openCommandPalette}
                  onClose={() => setActivePanel(null)}
                />
              </PageEditorColorPaletteContext.Provider>
            ) : null}
          </div>
        ) : null}

        {!panelOpen && hasFloatingPanelSelection ? (
          // Reopen affordance when the sole control panel is hidden (mirrors the
          // shared CanvasEditor "Show panel" button). Restores panelOpen only.
          <button
            type="button"
            onClick={() => setPanelOpen(true)}
            className="absolute bottom-6 right-6 z-30 flex items-center gap-1.5 rounded-xl border border-border bg-popover px-3 py-2 text-xs font-medium shadow-pop transition-colors hover:text-primary"
            aria-label="Show panel"
          >
            <SlidersHorizontal className="size-3.5" /> Show panel
          </button>
        ) : null}

        {commandOpen ? (
          <PageEditorCommandPalette
            commandQuery={commandQuery}
            commandActiveIndex={commandActiveIndex}
            canInsertSections={canInsertSections}
            sections={filteredSections}
            blocks={filteredBlocks}
            templates={filteredTemplates}
            showTemplates={Boolean(editorHost.templateLibrary)}
            onQueryChange={handleCommandQueryChange}
            onKeyDown={handleCommandKeyDown}
            onAddSection={addSection}
            onAddBlock={addBlock}
            onInsertTemplate={(id) => void insertTemplate(id)}
            onClose={() => {
              setCommandOpen(false);
              setCommandActiveIndex(0);
              setPendingBlockInsert(null);
              setPendingSectionInsertIndex(null);
              setPendingBesideBlockPath(null);
            }}
          />
        ) : null}

        <ConfirmActionDialog
          open={Boolean(deleteSelectionTarget)}
          onOpenChange={(open) => {
            if (!open) setDeleteSelectionTarget(null);
          }}
          title={
            deleteSelectionTarget?.kind === "block"
              ? "Delete selected block"
              : "Delete selected section"
          }
          description={
            deleteSelectionTarget?.kind === "block"
              ? "This removes the selected block from the page draft."
              : "This removes the selected section and its blocks from the page draft."
          }
          targetLabel={deleteSelectionTarget?.label}
          confirmLabel={deleteSelectionTarget?.kind === "block" ? "Delete block" : "Delete section"}
          tone="destructive"
          onConfirm={confirmDeleteSelection}
        />

        {editorHost.renderSettings ? (
          editorHost.renderSettings({
            open: settingsOpen,
            onOpenChange: setSettingsOpen,
            detail: page,
            onSaved: handleHostSettingsSaved,
          })
        ) : (
          <SettingsSheet
            open={settingsOpen}
            title={settingsTitle}
            slug={settingsSlug}
            showInNav={showInNav}
            revisionRetention={revisionRetention}
            isSaving={isSaving}
            onOpenChange={setSettingsOpen}
            onTitleChange={setSettingsTitle}
            onSlugChange={setSettingsSlug}
            onShowInNavChange={setShowInNav}
            onRevisionRetentionChange={setRevisionRetention}
            onSave={handleSettingsSave}
          />
        )}

        {revisionsHost ? (
          <HistorySheet
            open={revisionsOpen}
            revisions={revisions}
            isLoading={revisionsLoading}
            error={revisionsError}
            restoringRevisionId={restoringRevisionId}
            discardingRevisionId={discardingRevisionId}
            onOpenChange={setRevisionsOpen}
            onRestore={restoreRevision}
            onDiscard={discardRevision}
          />
        ) : null}

        {editorHost.preview ? (
          <RuntimePreviewDialog
            open={previewOpen}
            onOpenChange={setPreviewOpen}
            title={editorHost.previewTitle}
            subtitle="Runtime preview of the saved draft (read-only, site theme)."
            canPreview={Boolean(previewUrl)}
            previewUrl={previewUrl}
            isLoading={previewLoading}
            error={previewError}
            device={device}
            onDeviceChange={setDevice}
            probeResult={previewProbe}
            iframeTitle="Page runtime preview"
            onFixPreviewTarget={() => void handlePreview()}
            fixPreviewTargetLabel="Retry preview"
          />
        ) : null}
        {dirtyNavigationDialog}
      </div>
    </EditorShell>
  );
}

const ToolbarSubpanel = ({
  panel,
  device,
  section,
  baseSection,
  block,
  baseBlock,
  hasBlockSelection,
  onSectionControlChange,
  onSectionVariantChange,
  onSectionStyle,
  onSectionVisibility,
  onBlockControlChange,
  onClearOverride,
  onClearBlockOverride,
  onResponsiveVisibleChange,
  onResponsiveOverrideReset,
  onAddBlock,
  onClose,
}: {
  /** Registry-driven panels only; "host-appearance" renders host content. */
  panel: Exclude<ToolbarPanel, "host-appearance">;
  device: PageBreakpoint;
  section: PageSectionV2;
  baseSection: PageSectionV2;
  block: PageBlockV2 | null;
  baseBlock: PageBlockV2 | null;
  hasBlockSelection: boolean;
  onSectionControlChange: (control: PageEditorControlDefinition, value: unknown) => void;
  onSectionVariantChange: (variant: PageSectionVariant) => void;
  onSectionStyle: (patch: Partial<PageSectionV2["style"]>) => void;
  onSectionVisibility: (patch: Partial<PageSectionV2["visibility"]>) => void;
  onBlockControlChange: (control: PageEditorControlDefinition, value: unknown) => void;
  onClearOverride: (path: readonly string[]) => void;
  onClearBlockOverride: (path: readonly string[]) => void;
  onResponsiveVisibleChange: (breakpoint: PageBreakpoint, visible: boolean) => void;
  onResponsiveOverrideReset: (breakpoint: PageOverrideBreakpoint, path: readonly string[]) => void;
  onAddBlock: () => void;
  onClose: () => void;
}) => {
  const primaryBlock = block ?? (hasBlockSelection ? undefined : section.blocks[0]);
  const primaryBaseBlock = baseBlock ?? (hasBlockSelection ? undefined : baseSection.blocks[0]);
  const blockPanelControls = primaryBlock
    ? getPageEditorControlsForTarget({ kind: "block", type: primaryBlock.type }).filter(
        (control) =>
          control.panel === panel &&
          (control.id !== "block.style.backgroundImage" ||
            primaryBlock.style?.backgroundType === "image")
      )
    : [];
  const sectionPanelControls = pageUniversalSectionControls.filter(
    (control) => control.panel === panel && control.id !== pageSectionStackVerticalControl.id
  );
  const sectionVariantControl =
    panel === "layout" ? getPageSectionVariantControl(section.type) : null;
  const shouldRenderBlockControls =
    Boolean(primaryBlock) && (panel === "content" || (hasBlockSelection && panel !== "responsive"));
  const sectionOverride = readSectionBreakpointOverride(baseSection, device);
  const panelMeta = toolbarPanelOptions.find((option) => option.panel === panel);
  return (
    <div
      className="mt-2 flex max-h-[min(72vh,calc(100dvh-8rem))] flex-col overflow-hidden rounded-lg bg-white/5 text-slate-100"
      data-page-editor-toolbar-panel={panel}
      data-page-editor-subpanel="viewport-safe"
      role="region"
      aria-label={`${panel} toolbar panel`}
    >
      <div
        className="flex shrink-0 items-start justify-between gap-2 border-b border-white/10 px-3 py-2"
        data-page-editor-subpanel-header="true"
      >
        <div className="min-w-0">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-200">
            {panelMeta?.label ?? panel}
          </p>
          {panelMeta ? (
            <p className="truncate text-[11px] text-slate-400">{panelMeta.description}</p>
          ) : null}
        </div>
        <ToolbarIconButton tooltip={toolbarActionTooltips.closePanel} onClick={onClose}>
          <X className="h-4 w-4" />
        </ToolbarIconButton>
      </div>
      <div
        className="min-h-0 flex-1 overflow-y-auto overscroll-contain p-3"
        data-page-editor-subpanel-scroll="true"
      >
        {shouldRenderBlockControls ? (
          <div className="grid gap-3 sm:grid-cols-[repeat(auto-fit,minmax(150px,1fr))]">
            {primaryBlock
              ? blockPanelControls.map((control) => (
                  <RegistryControlField
                    key={control.id}
                    block={primaryBlock}
                    baseBlock={primaryBaseBlock}
                    device={device}
                    control={control}
                    onChange={onBlockControlChange}
                    onReset={onClearBlockOverride}
                  />
                ))
              : null}
            {panel === "content" ? (
              <div className="flex items-end">
                <Button
                  type="button"
                  variant="outline"
                  className={editorDarkButtonClass}
                  onClick={onAddBlock}
                >
                  <Plus className="h-4 w-4" />
                  Add block
                </Button>
              </div>
            ) : null}
          </div>
        ) : null}
        {!shouldRenderBlockControls &&
        (panel === "layout" ||
          panel === "style" ||
          panel === "background" ||
          panel === "spacing" ||
          panel === "visibility") ? (
          <div className="grid gap-3 sm:grid-cols-[repeat(auto-fit,minmax(150px,1fr))]">
            {sectionPanelControls.map((control) => (
              <SectionRegistryControlField
                key={control.id}
                section={section}
                baseSection={baseSection}
                device={device}
                control={control}
                onChange={onSectionControlChange}
                onReset={onClearOverride}
              />
            ))}
            {sectionVariantControl ? (
              <SectionVariantControlField
                section={section}
                control={sectionVariantControl}
                onChange={onSectionVariantChange}
              />
            ) : null}
            {panel === "background" ? (
              <ResponsiveControlShell
                device={device}
                override={hasResponsiveOverride(device, sectionOverride, [
                  "style",
                  "backgroundImage",
                ])}
                label="Background image"
                onReset={() => onClearOverride(["style", "backgroundImage"])}
              >
                <ToolbarMediaUrlField
                  label="Background image"
                  value={section.style.backgroundImage ?? ""}
                  accept={["image/*"]}
                  onChange={(backgroundImage) => onSectionStyle({ backgroundImage })}
                />
              </ResponsiveControlShell>
            ) : null}
            {panel === "visibility" ? (
              <>
                <SupplementalSectionField
                  label="Anchor"
                  value={section.visibility.anchor ?? ""}
                  device={device}
                  override={hasResponsiveOverride(device, sectionOverride, [
                    "visibility",
                    "anchor",
                  ])}
                  onReset={() => onClearOverride(["visibility", "anchor"])}
                  onChange={(anchor) => onSectionVisibility({ anchor: anchor.trim() || null })}
                />
                <SectionDateRangeFields
                  key={section.id}
                  section={section}
                  device={device}
                  sectionOverride={sectionOverride}
                  onClearOverride={onClearOverride}
                  onSectionVisibility={onSectionVisibility}
                />
              </>
            ) : null}
          </div>
        ) : null}
        {!shouldRenderBlockControls && panel === "content" ? (
          <div className="grid gap-3 sm:grid-cols-[1fr_auto]">
            <p className="flex items-center text-sm text-slate-400">
              {primaryBlock ? getBlockDisplayLabel(primaryBlock) : "No block selected"}
            </p>
            <div className="flex items-end">
              <Button
                type="button"
                variant="outline"
                className={editorDarkButtonClass}
                onClick={onAddBlock}
              >
                <Plus className="h-4 w-4" />
                Add block
              </Button>
            </div>
          </div>
        ) : null}
        {panel === "responsive" ? (
          <ResponsivePanelContent
            device={device}
            section={section}
            baseSection={baseSection}
            baseBlock={hasBlockSelection ? (primaryBaseBlock ?? null) : null}
            onSectionControlChange={onSectionControlChange}
            onClearOverride={onClearOverride}
            onResponsiveVisibleChange={onResponsiveVisibleChange}
            onResponsiveOverrideReset={onResponsiveOverrideReset}
          />
        ) : null}
      </div>
    </div>
  );
};

/**
 * Responsive panel content (TASK-425-02): per-breakpoint hide-on-screen
 * toggles, the section vertical-layout toggle, and the explicit per-field
 * override list with reset-inheritance actions. The target is the selected
 * block when one is selected, otherwise the selected section. All metadata
 * comes from the registry-owned responsive panel contract; controls render
 * through the shared editor control primitives.
 */
const ResponsivePanelContent = ({
  device,
  section,
  baseSection,
  baseBlock,
  onSectionControlChange,
  onClearOverride,
  onResponsiveVisibleChange,
  onResponsiveOverrideReset,
}: {
  device: PageBreakpoint;
  section: PageSectionV2;
  baseSection: PageSectionV2;
  /** Selected base block, or null when the section is the target. */
  baseBlock: PageBlockV2 | null;
  onSectionControlChange: (control: PageEditorControlDefinition, value: unknown) => void;
  onClearOverride: (path: readonly string[]) => void;
  onResponsiveVisibleChange: (breakpoint: PageBreakpoint, visible: boolean) => void;
  onResponsiveOverrideReset: (breakpoint: PageOverrideBreakpoint, path: readonly string[]) => void;
}) => {
  const target = baseBlock ?? baseSection;
  const overrideSource = baseBlock
    ? readBlockBreakpointOverride(baseBlock, device)
    : readSectionBreakpointOverride(baseSection, device);
  const hasTargetOverride = hasAnyResponsiveOverride(device, overrideSource);
  const overrideDevice = device === "desktop" ? null : device;
  const entries = projectPageResponsiveOverrideEntries(
    baseBlock
      ? { kind: "block", type: baseBlock.type }
      : { kind: "section", type: baseSection.type },
    device,
    overrideSource
  );
  const overrideCount = entries.filter((entry) => entry.state === "override").length;
  return (
    <div className="space-y-4" data-page-editor-responsive-panel={baseBlock ? "block" : "section"}>
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm text-slate-400">
          {device === "desktop"
            ? `Editing ${deviceScopeReadout("desktop")} — the base every breakpoint inherits.`
            : `Editing ${deviceScopeReadout(device)} — edits create ${device} overrides.`}
        </p>
        <span
          className={`rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase ${
            hasTargetOverride ? "bg-sky-400/20 text-sky-200" : "bg-white/10 text-slate-400"
          }`}
          data-page-editor-responsive-target-state={hasTargetOverride ? "override" : "inherited"}
        >
          {device === "desktop" ? "base" : hasTargetOverride ? "override" : "inherited"}
        </span>
      </div>
      <div className="grid gap-2" data-page-editor-responsive-hide-group="true">
        {pageResponsiveHideToggles.map((toggle) => {
          const toggleBreakpoint = toggle.breakpoint === "desktop" ? null : toggle.breakpoint;
          const visible = getPageResponsiveEffectiveVisible(target, toggle.breakpoint);
          const overrideExists =
            toggleBreakpoint !== null &&
            hasPathValue(target.responsive?.[toggleBreakpoint], toggle.path);
          const state: ResponsiveBadgeState =
            toggleBreakpoint === null ? "base" : overrideExists ? "override" : "inherited";
          return (
            <div
              key={toggle.id}
              className="grid min-w-0 gap-1"
              data-page-editor-responsive-hide={toggle.breakpoint}
              data-page-editor-responsive-hide-state={state}
            >
              <ToggleSwitch
                label={toggle.label}
                value={!visible}
                onChange={(hidden) => onResponsiveVisibleChange(toggle.breakpoint, !hidden)}
              />
              <div className="flex min-h-6 items-center justify-between gap-2">
                <ResponsiveStateBadge
                  state={state}
                  device={toggle.breakpoint}
                  description={
                    toggleBreakpoint === null
                      ? "Base visibility. Hiding on desktop hides every breakpoint that does not override visibility."
                      : undefined
                  }
                />
                {toggleBreakpoint !== null && overrideExists ? (
                  <ResponsivePanelResetButton
                    label={toggle.label}
                    onClick={() => onResponsiveOverrideReset(toggleBreakpoint, toggle.path)}
                  />
                ) : null}
              </div>
            </div>
          );
        })}
      </div>
      {baseBlock ? null : (
        <SectionRegistryControlField
          section={section}
          baseSection={baseSection}
          device={device}
          control={pageSectionStackVerticalControl}
          onChange={onSectionControlChange}
          onReset={onClearOverride}
        />
      )}
      <div className="space-y-2" data-page-editor-responsive-override-list={device}>
        <p className="text-xs font-semibold uppercase tracking-wide text-slate-200">
          Per-field overrides
          {overrideDevice ? ` (${overrideCount})` : ""}
        </p>
        {overrideDevice === null ? (
          <p className="text-xs text-slate-400">
            Desktop is the base. Switch to tablet or mobile to review or reset per-field overrides.
          </p>
        ) : entries.length === 0 ? (
          <p className="text-xs text-slate-400">This selection exposes no responsive fields.</p>
        ) : (
          <ul className="space-y-1">
            {entries.map(({ control, state }) => (
              <li
                key={control.id}
                className="flex items-center justify-between gap-2"
                data-page-editor-override-entry={control.id}
                data-page-editor-override-state={state}
              >
                <span className="min-w-0 truncate text-xs text-slate-300">{control.label}</span>
                <span className="flex shrink-0 items-center gap-2">
                  <ResponsiveStateBadge state={state} device={device} />
                  {state === "override" ? (
                    <ResponsivePanelResetButton
                      label={control.label}
                      entryId={control.id}
                      onClick={() =>
                        onResponsiveOverrideReset(overrideDevice, control.overridePath)
                      }
                    />
                  ) : null}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
};

/** Reset-inheritance action used by the Responsive panel rows. */
const ResponsivePanelResetButton = ({
  label,
  entryId,
  onClick,
}: {
  label: string;
  entryId?: string;
  onClick: () => void;
}) => (
  <button
    type="button"
    aria-label={`Reset ${label} to inherited`}
    className={`inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-xs font-semibold text-slate-300 transition-colors hover:bg-white/10 hover:text-white ${editorControlFocusClass}`}
    data-page-editor-responsive-reset={label}
    data-page-editor-override-reset={entryId}
    onClick={onClick}
  >
    <RotateCcw className="h-3 w-3" />
    Reset
  </button>
);

const SectionRegistryControlField = ({
  section,
  baseSection,
  device,
  control,
  onChange,
  onReset,
}: {
  section: PageSectionV2;
  baseSection: PageSectionV2;
  device: PageBreakpoint;
  control: PageEditorControlDefinition;
  onChange: (control: PageEditorControlDefinition, value: unknown) => void;
  onReset: (path: readonly string[]) => void;
}) => {
  const value = readPathValue(section, control.path);
  const override = hasResponsiveOverride(
    device,
    readSectionBreakpointOverride(baseSection, device),
    control.overridePath
  );
  return (
    <ResponsiveControlShell
      device={device}
      override={override}
      label={control.label}
      onReset={() => onReset(control.overridePath)}
    >
      <RegistryControlInput
        control={control}
        rawValue={value}
        commitActiveOption={device !== "desktop" && !override}
        onCommit={(nextValue) => onChange(control, nextValue)}
      />
    </ResponsiveControlShell>
  );
};

const SectionVariantControlField = ({
  section,
  control,
  onChange,
}: {
  section: PageSectionV2;
  control: PageEditorControlDefinition;
  onChange: (variant: PageSectionVariant) => void;
}) => {
  const options = control.options ?? [];
  const fallback = options[0] ?? "default";
  const value = options.includes(section.variant) ? section.variant : fallback;
  const model = resolvePageEditorControlUiModel(control);
  const handleChange = (nextValue: string) => {
    if (isPageSectionVariantOption(section.type, nextValue)) {
      onChange(nextValue);
    }
  };
  return (
    <div className="grid min-w-0 gap-1" data-page-editor-section-variant-control="base">
      {model.kind === "segmented" ? (
        <SegmentedControl
          label={control.label}
          value={value}
          options={model.options}
          optionLabels={model.labels}
          onChange={handleChange}
        />
      ) : (
        <ToolbarSelectField
          label={control.label}
          value={value}
          options={options}
          optionLabels={model.kind === "select" ? model.labels : undefined}
          onChange={handleChange}
        />
      )}
      <div className="flex min-h-6 items-center justify-between gap-2">
        <ResponsiveStateBadge
          state="base"
          device="desktop"
          description="Base-only control. The section variant applies to every breakpoint."
        />
      </div>
    </div>
  );
};

const SupplementalSectionField = ({
  label,
  value,
  device,
  override,
  onReset,
  onChange,
}: {
  label: string;
  value: string;
  device: PageBreakpoint;
  override: boolean;
  onReset: () => void;
  onChange: (value: string) => void;
}) => (
  <ResponsiveControlShell device={device} override={override} label={label} onReset={onReset}>
    <ToolbarTextField label={label} value={value} onChange={onChange} />
  </ResponsiveControlShell>
);

/**
 * Visibility date-range preset: a toggle gates the free-form date inputs so
 * the panel reads as "show in date range" instead of two raw text fields.
 * Dates are written through the existing visibility paths; turning the toggle
 * off clears both stored values.
 */
const SectionDateRangeFields = ({
  section,
  device,
  sectionOverride,
  onClearOverride,
  onSectionVisibility,
}: {
  section: PageSectionV2;
  device: PageBreakpoint;
  sectionOverride: unknown;
  onClearOverride: (path: readonly string[]) => void;
  onSectionVisibility: (patch: Partial<PageSectionV2["visibility"]>) => void;
}) => {
  const hasStoredDates = Boolean(section.visibility.startsAt || section.visibility.endsAt);
  const [enabled, setEnabled] = useState(hasStoredDates);
  const open = enabled || hasStoredDates;
  return (
    <>
      <div className="flex items-end" data-page-editor-date-range-toggle={open ? "on" : "off"}>
        <ToggleSwitch
          label="Date range"
          value={open}
          onChange={(next) => {
            setEnabled(next);
            if (!next && hasStoredDates) {
              onSectionVisibility({ startsAt: null, endsAt: null });
            }
          }}
        />
      </div>
      {open ? (
        <>
          <SupplementalSectionField
            label="Starts at"
            value={section.visibility.startsAt ?? ""}
            device={device}
            override={hasResponsiveOverride(device, sectionOverride, ["visibility", "startsAt"])}
            onReset={() => onClearOverride(["visibility", "startsAt"])}
            onChange={(startsAt) => onSectionVisibility({ startsAt: startsAt.trim() || null })}
          />
          <SupplementalSectionField
            label="Ends at"
            value={section.visibility.endsAt ?? ""}
            device={device}
            override={hasResponsiveOverride(device, sectionOverride, ["visibility", "endsAt"])}
            onReset={() => onClearOverride(["visibility", "endsAt"])}
            onChange={(endsAt) => onSectionVisibility({ endsAt: endsAt.trim() || null })}
          />
        </>
      ) : null}
    </>
  );
};

const RegistryControlField = ({
  block,
  baseBlock,
  device,
  control,
  onChange,
  onReset,
}: {
  block: PageBlockV2;
  baseBlock: PageBlockV2 | undefined;
  device: PageBreakpoint;
  control: PageEditorControlDefinition;
  onChange: (control: PageEditorControlDefinition, value: unknown) => void;
  onReset: (path: readonly string[]) => void;
}) => {
  const value = readPathValue(block, control.path);
  const override = hasResponsiveOverride(
    device,
    readBlockBreakpointOverride(baseBlock, device),
    control.overridePath
  );
  // Scoped combobox sources (TASK-457) read the sibling prop named by the
  // registry's `filterBy` from the SAME resolved block the value comes from.
  const filterRaw = control.filterBy
    ? readPathValue(block, ["props", control.filterBy])
    : undefined;
  const comboboxFilterValue =
    typeof filterRaw === "string" && filterRaw.length > 0 ? filterRaw : null;
  return (
    <ResponsiveControlShell
      device={device}
      override={override}
      label={control.label}
      onReset={() => onReset(control.overridePath)}
    >
      <RegistryControlInput
        control={control}
        rawValue={value}
        renderDefault={getPageBlockRenderDefault(block, control.path)}
        blockBackgroundType={block.style?.backgroundType}
        commitActiveOption={device !== "desktop" && !override}
        comboboxFilterValue={comboboxFilterValue}
        onCommit={(nextValue) => onChange(control, nextValue)}
      />
    </ResponsiveControlShell>
  );
};

/** Mime accept hints for registry media controls, keyed by control id. */
const mediaControlAccept: Record<string, readonly string[]> = {
  "block.style.backgroundImage": ["image/*"],
  "block.image.props.src": ["image/*"],
  "block.video.props.src": ["video/*"],
  "block.card.props.image": ["image/*"],
};

/**
 * Resolves one canvas collection preview source through the cached admin
 * clients (TASK-457): the content types list gives id -> slug/name, the
 * per-type entries list gives the published entries the canvas projects. A
 * missing content type resolves to `null` (the fail-closed preview binding).
 */
const loadCollectionPreviewSource = async (
  contentTypeId: string
): Promise<PageEditorCollectionPreviewSource> => {
  const contentTypes = await listContentTypesCached();
  const contentType = contentTypes.find((candidate) => candidate.id === contentTypeId);
  if (!contentType) return null;
  const entries = await listEntriesCached(contentType.slug);
  return {
    contentType: { id: contentType.id, name: contentType.name, slug: contentType.slug },
    entries,
  };
};

/**
 * Saved listing queries are SCOPED to one content type (TASK-457): only
 * entry-sourced queries explicitly targeting the picked `contentTypeId`
 * resolve as options; with no content type picked the list is honestly empty
 * (the combobox shows the source's empty-state copy).
 */
const filterListingQueryOptions = (
  queries: readonly ListingQueryRecord[],
  contentTypeId: string | null
): ComboboxControlOption[] =>
  contentTypeId
    ? queries
        .filter(
          (record) =>
            record.query.source === "entries" &&
            record.query.sourceConfig.contentTypeId === contentTypeId
        )
        .map((record) => ({ value: record.id, label: record.name }))
    : [];

/**
 * Dynamic option sources for registry combobox controls (TASK-456/457). The
 * registry/adapter only NAME a source; this map is the editor-shell owner
 * that wires each source onto its cached admin client (cache-hydrate first,
 * cached fetch for revalidation). Values are stored ids, labels are names.
 * `filterValue` carries the sibling-prop scope for filtered sources
 * (`filterBy` in the registry); unfiltered sources ignore it.
 */
const comboboxOptionsSources: Record<
  PageEditorControlOptionsSource,
  {
    getCachedOptions: (filterValue: string | null) => ComboboxControlOption[] | null;
    listOptions: (filterValue: string | null) => Promise<ComboboxControlOption[]>;
  }
> = {
  forms: {
    getCachedOptions: () =>
      getCachedForms()?.map((form) => ({ value: form.id, label: form.name })) ?? null,
    listOptions: async () =>
      (await listFormsCached()).map((form) => ({ value: form.id, label: form.name })),
  },
  contentTypes: {
    getCachedOptions: () =>
      getCachedContentTypes()?.map((type) => ({ value: type.id, label: type.name })) ?? null,
    listOptions: async () =>
      (await listContentTypesCached()).map((type) => ({ value: type.id, label: type.name })),
  },
  listingQueries: {
    getCachedOptions: (filterValue) => {
      const cached = getCachedListingQueries();
      return cached ? filterListingQueryOptions(cached, filterValue) : null;
    },
    listOptions: async (filterValue) =>
      filterListingQueryOptions(await listListingQueriesCached(), filterValue),
  },
  // Unscoped saved-query list (TASK-459-02): the filters block has no
  // contentTypeId sibling, so it binds to any saved listing query directly.
  listingQueriesAll: {
    getCachedOptions: () =>
      getCachedListingQueries()?.map((record) => ({ value: record.id, label: record.name })) ??
      null,
    listOptions: async () =>
      (await listListingQueriesCached()).map((record) => ({
        value: record.id,
        label: record.name,
      })),
  },
  listingTemplates: {
    getCachedOptions: () =>
      getCachedListingTemplates()?.map((template) => ({
        value: template.id,
        label: template.name,
      })) ?? null,
    listOptions: async () =>
      (await listListingTemplatesCached()).map((template) => ({
        value: template.id,
        label: template.name,
      })),
  },
};

/**
 * Registry combobox field: hydrates options synchronously from the admin
 * cache when available and revalidates through the cached list call. Commits
 * the picked id (or `null` from the "None" row) straight through the normal
 * control write path — stored value shapes stay schema-owned. Filtered
 * sources (TASK-457, e.g. listing queries scoped by `contentTypeId`) key the
 * resolved lists by filter value so a scope switch never shows the previous
 * scope's options.
 */
const ToolbarComboboxField = ({
  label,
  model,
  rawValue,
  filterValue = null,
  onCommit,
}: {
  label: string;
  model: Extract<PageEditorControlUiModel, { kind: "combobox" }>;
  rawValue: unknown;
  /** Current value of the registry `filterBy` sibling prop, if any. */
  filterValue?: string | null;
  onCommit: (value: string | null) => void;
}) => {
  const source = comboboxOptionsSources[model.optionsSource];
  const filterKey = filterValue ?? "";
  const [resolvedByFilter, setResolvedByFilter] = useState<Record<string, ComboboxControlOption[]>>(
    {}
  );
  useEffect(() => {
    let active = true;
    source
      .listOptions(filterKey.length > 0 ? filterKey : null)
      .then((items) => {
        if (active) {
          setResolvedByFilter((current) => ({ ...current, [filterKey]: items }));
        }
      })
      .catch(() => {
        // Load failures keep the cached (or empty) list; the stored value
        // stays untouched and surfaces as dangling until options resolve.
        if (active) {
          setResolvedByFilter((current) =>
            filterKey in current ? current : { ...current, [filterKey]: [] }
          );
        }
      });
    return () => {
      active = false;
    };
  }, [source, filterKey]);
  const options =
    resolvedByFilter[filterKey] ?? source.getCachedOptions(filterKey.length > 0 ? filterKey : null);
  return (
    <ComboboxControl
      label={label}
      value={typeof rawValue === "string" && rawValue.length > 0 ? rawValue : null}
      options={options ?? []}
      placeholder={model.placeholder}
      allowNull={model.allowNull}
      loading={options === null || options === undefined}
      {...(model.emptyMessage ? { emptyMessage: model.emptyMessage } : {})}
      onChange={onCommit}
    />
  );
};

type ToolbarGradientStopDraft = {
  id: string;
  color: string;
  position: number;
};

type ToolbarGradientDraft = {
  kind: AuthoringGradientModel["kind"];
  angle: number;
  stops: ToolbarGradientStopDraft[];
};

let toolbarGradientStopId = 0;

const createToolbarGradientStopDraft = (
  color: string,
  position: number
): ToolbarGradientStopDraft => {
  toolbarGradientStopId += 1;
  return { id: `gradient-stop-${toolbarGradientStopId}`, color, position };
};

const clampToolbarGradientNumber = (value: number, min: number, max: number, fallback: number) => {
  if (!Number.isFinite(value)) return fallback;
  return Math.min(max, Math.max(min, Math.trunc(value)));
};

const createDefaultToolbarGradientDraft = (): ToolbarGradientDraft => ({
  kind: "linear",
  angle: 135,
  stops: [
    createToolbarGradientStopDraft("var(--color-primary)", 0),
    createToolbarGradientStopDraft("var(--color-accent)", 100),
  ],
});

const splitTopLevelCssList = (value: string): string[] => {
  const items: string[] = [];
  let depth = 0;
  let current = "";
  for (const char of value) {
    if (char === "(") depth += 1;
    if (char === ")") depth = Math.max(0, depth - 1);
    if (char === "," && depth === 0) {
      items.push(current.trim());
      current = "";
    } else {
      current += char;
    }
  }
  if (current.trim()) items.push(current.trim());
  return items;
};

const parseToolbarGradientStop = (value: string): ToolbarGradientStopDraft | null => {
  const match = /^(.*)\s+(-?\d+(?:\.\d+)?)%$/.exec(value.trim());
  if (!match?.[1] || !match[2]) return null;
  const position = Number(match[2]);
  return createToolbarGradientStopDraft(
    match[1].trim(),
    clampToolbarGradientNumber(position, 0, 100, 0)
  );
};

const parseToolbarGradientDraft = (value: string): ToolbarGradientDraft => {
  const trimmed = value.trim();
  const match = /^(linear|radial)-gradient\((.*)\)$/i.exec(trimmed);
  if (!match?.[1] || !match[2]) return createDefaultToolbarGradientDraft();
  const kind: AuthoringGradientModel["kind"] =
    match[1].toLowerCase() === "radial" ? "radial" : "linear";
  const parts = splitTopLevelCssList(match[2]);
  const angleMatch = kind === "linear" ? /^(-?\d+(?:\.\d+)?)deg$/i.exec(parts[0] ?? "") : null;
  const angle = angleMatch?.[1]
    ? clampToolbarGradientNumber(Number(angleMatch[1]), 0, 360, 135)
    : 135;
  const stopParts = kind === "linear" && angleMatch ? parts.slice(1) : parts;
  const stops = stopParts
    .map(parseToolbarGradientStop)
    .filter((stop): stop is ToolbarGradientStopDraft => Boolean(stop))
    .sort((left, right) => left.position - right.position);
  return stops.length >= 2 ? { kind, angle, stops } : createDefaultToolbarGradientDraft();
};

const normalizeToolbarGradientDraft = (draft: ToolbarGradientDraft): ToolbarGradientDraft => ({
  kind: draft.kind === "radial" ? "radial" : "linear",
  angle: clampToolbarGradientNumber(draft.angle, 0, 360, 135),
  stops: draft.stops
    .slice(0, 6)
    .map((stop) => ({
      ...stop,
      position: clampToolbarGradientNumber(stop.position, 0, 100, 0),
    }))
    .sort((left, right) => left.position - right.position),
});

const ToolbarGradientField = ({
  value,
  onCommit,
}: {
  value: string;
  onCommit: (value: string) => void;
}) => {
  const colorPalette = usePageEditorColorPalette();
  const sourceValue = value.trim();
  const [draftState, setDraftState] = useState(() => ({
    source: sourceValue,
    draft: parseToolbarGradientDraft(sourceValue),
  }));
  const draft =
    draftState.source === sourceValue ? draftState.draft : parseToolbarGradientDraft(sourceValue);
  const commitDraft = (nextDraft: ToolbarGradientDraft) => {
    const normalized = normalizeToolbarGradientDraft(nextDraft);
    setDraftState({ source: sourceValue, draft: normalized });
    const css = composeAuthoringGradientCss(normalized);
    if (css) onCommit(css);
  };
  const updateStop = (
    stopId: string,
    updater: (stop: ToolbarGradientStopDraft) => ToolbarGradientStopDraft
  ) => {
    commitDraft({
      ...draft,
      stops: draft.stops.map((stop) => (stop.id === stopId ? updater(stop) : stop)),
    });
  };
  return (
    <div className="grid gap-2" data-page-editor-control="gradient">
      <SegmentedControl
        label="Gradient type"
        value={draft.kind}
        options={["linear", "radial"]}
        optionLabels={{ linear: "Linear", radial: "Radial" }}
        onChange={(kind) =>
          commitDraft({ ...draft, kind: kind === "radial" ? "radial" : "linear" })
        }
      />
      {draft.kind === "linear" ? (
        <SliderStepperControl
          label="Angle"
          value={draft.angle}
          min={0}
          max={360}
          step={15}
          unit="deg"
          onChange={(angle) => commitDraft({ ...draft, angle })}
        />
      ) : null}
      <div className="grid gap-2" data-page-editor-gradient-stops="true">
        {draft.stops.map((stop, index) => (
          <div
            key={stop.id}
            className="grid gap-2 rounded-md border border-white/10 bg-white/5 p-2"
            data-page-editor-gradient-stop={index + 1}
          >
            <div className="flex items-start justify-between gap-2">
              <ColorSwatchControl
                label={`Stop ${index + 1}`}
                value={stop.color}
                palette={colorPalette}
                allowTransparent={false}
                onChange={(color) => {
                  if (color) updateStop(stop.id, (current) => ({ ...current, color }));
                }}
              />
              {draft.stops.length > 2 ? (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className={editorDarkGhostButtonClass}
                  onClick={() =>
                    commitDraft({
                      ...draft,
                      stops: draft.stops.filter((current) => current.id !== stop.id),
                    })
                  }
                >
                  Remove
                </Button>
              ) : null}
            </div>
            <SliderControl
              label={`Stop ${index + 1} position`}
              value={stop.position}
              min={0}
              max={100}
              step={1}
              unit="%"
              onChange={(position) => updateStop(stop.id, (current) => ({ ...current, position }))}
            />
          </div>
        ))}
      </div>
      <Button
        type="button"
        variant="outline"
        size="sm"
        className={editorDarkButtonClass}
        disabled={draft.stops.length >= 6}
        onClick={() => {
          const lastPosition = draft.stops.at(-1)?.position ?? 100;
          commitDraft({
            ...draft,
            stops: [
              ...draft.stops,
              createToolbarGradientStopDraft(
                "var(--color-surface)",
                clampToolbarGradientNumber(lastPosition + 10, 0, 100, 100)
              ),
            ],
          });
        }}
      >
        <Plus className="h-4 w-4" />
        Add stop
      </Button>
    </div>
  );
};

/**
 * Maps a registry control through the pure UI-model adapter onto the dedicated
 * floating-inspector primitives. Stored value shapes are preserved: segmented
 * and select emit the stored option token, toggles emit booleans, sliders emit
 * clamped numbers, swatches emit color strings, and media emits the resolved
 * library URL (or null). Raw text inputs remain only for free-form strings.
 */
const RegistryControlInput = ({
  control,
  rawValue,
  renderDefault,
  blockBackgroundType,
  commitActiveOption = false,
  comboboxFilterValue = null,
  onCommit,
}: {
  control: PageEditorControlDefinition;
  rawValue: unknown;
  blockBackgroundType?: string | null;
  /**
   * Current value of the registry `filterBy` sibling prop for combobox
   * controls with a scoped source (TASK-457); `null` when unscoped or unset.
   */
  comboboxFilterValue?: string | null;
  /**
   * Effective render default for the field when the document stores no value
   * (`pageBlockRenderDefaults`, owner finding #9 round 3). Display-only: the
   * control presents it as the active value, but committing it writes the
   * explicit value through the normal path.
   */
  renderDefault?: string | number;
  /**
   * Tablet/mobile fields without an override yet set this so an explicit
   * click on the inherited segmented value still commits — pinning it as a
   * breakpoint override instead of silently no-opping.
   */
  commitActiveOption?: boolean;
  onCommit: (value: unknown) => void;
}) => {
  const model = resolvePageEditorControlUiModel(control);
  const colorPalette = usePageEditorColorPalette();
  const fieldValue = fieldValueFromControlValue(control, rawValue, renderDefault);
  const hasStoredValue =
    control.input === "number" ? typeof rawValue === "number" : typeof rawValue === "string";
  if (control.id === "block.style.background" && blockBackgroundType === "gradient") {
    return (
      <ToolbarGradientField
        value={typeof rawValue === "string" ? rawValue : ""}
        onCommit={onCommit}
      />
    );
  }
  switch (model.kind) {
    case "segmented":
      // When the active option is only the DISPLAYED default of an unset
      // field (render default or registry fallback), an explicit click on it
      // must still commit — writing the explicit value instead of silently
      // no-opping (owner finding #9 round 3: acceptable and honest).
      return (
        <SegmentedControl
          label={control.label}
          value={fieldValue}
          options={model.options}
          optionLabels={model.labels}
          commitActiveOption={commitActiveOption || (!hasStoredValue && fieldValue.length > 0)}
          onChange={(nextValue) => onCommit(coerceControlFieldValue(control, nextValue))}
        />
      );
    case "select":
      return (
        <ToolbarSelectField
          label={control.label}
          value={fieldValue}
          options={model.options}
          optionLabels={model.labels}
          onChange={(nextValue) => onCommit(coerceControlFieldValue(control, nextValue))}
        />
      );
    case "combobox":
      // Dynamic reference picker (TASK-456): emits the stored id, or the
      // explicit `null` the nullable schema stores for "no selection".
      return (
        <ToolbarComboboxField
          label={control.label}
          model={model}
          rawValue={rawValue}
          filterValue={comboboxFilterValue}
          onCommit={(nextValue) => onCommit(nextValue)}
        />
      );
    case "toggle":
      // fieldValue carries the effective boolean (stored value or the schema
      // fallback for unset fields), so the switch never lies "off" for an
      // unset field that renders as enabled.
      return (
        <ToggleSwitch
          label={control.label}
          value={fieldValue === "yes"}
          onChange={(nextValue) => onCommit(nextValue)}
        />
      );
    case "slider":
    case "sliderStepper": {
      // An empty field value means "unset without a render default or schema
      // fallback": rest at the model minimum explicitly. `Number("")` is 0,
      // which would otherwise silently display 0 for values that render
      // differently when unset.
      const parsed = fieldValue.length > 0 ? Number(fieldValue) : Number.NaN;
      const sliderValue = Number.isFinite(parsed) ? parsed : model.min;
      const sliderProps = {
        label: control.label,
        value: sliderValue,
        min: model.min,
        max: model.max,
        step: model.step,
        unit: model.unit,
        onChange: (nextValue: number) =>
          onCommit(coerceControlFieldValue(control, String(nextValue))),
      };
      return model.kind === "slider" ? (
        <SliderControl {...sliderProps} />
      ) : (
        <SliderStepperControl {...sliderProps} />
      );
    }
    case "swatch":
      return (
        <ColorSwatchControl
          label={control.label}
          value={typeof rawValue === "string" ? rawValue : ""}
          palette={colorPalette}
          allowCustom={model.allowCustom}
          allowTransparent={model.allowTransparent}
          // "Transparent" commits the explicit cleared value (null) that the
          // pageDocumentV2 nullable block color normalizers store.
          onChange={(nextValue) => onCommit(nextValue)}
        />
      );
    case "media":
      return (
        <ToolbarMediaUrlField
          label={control.label}
          value={typeof rawValue === "string" ? rawValue : ""}
          accept={mediaControlAccept[control.id]}
          onChange={(nextValue) => onCommit(nextValue)}
        />
      );
    case "listItems":
      // Structured list items (footer link columns): commits the owner
      // `PageListItemV2` shapes — plain strings stay plain, link rows store
      // `{ label, href }` — through the normal control write path.
      return (
        <ListItemsControl
          label={control.label}
          value={Array.isArray(rawValue) ? rawValue : []}
          onChange={(nextItems) => onCommit(nextItems)}
        />
      );
    case "facetList":
      // Generic facet builder (TASK-459-02): commits the canonical
      // `ListingFacetConfig[]` shapes the pageDocumentV2 facet normalizer
      // owns, through the normal control write path.
      return (
        <FacetListControl
          label={control.label}
          value={Array.isArray(rawValue) ? rawValue : []}
          onChange={(nextFacets) => onCommit(nextFacets)}
        />
      );
    case "text":
      return (
        <ToolbarTextField
          label={control.label}
          value={fieldValue}
          onChange={(nextValue) => onCommit(coerceControlFieldValue(control, nextValue))}
        />
      );
    default:
      return <UnsupportedControlNotice label={control.label} model={model} />;
  }
};

const UnsupportedControlNotice = ({
  label,
  model,
}: {
  label: string;
  model: Extract<PageEditorControlUiModel, { kind: "unsupported" }>;
}) => (
  <div
    className="grid gap-1"
    data-page-editor-control="unsupported"
    data-page-editor-control-reason={model.reason}
  >
    <span className={editorControlLabelClass}>{label}</span>
    <p className="text-xs text-slate-400">This value cannot be edited here.</p>
  </div>
);

/**
 * Bridges URL-valued Page v2 media fields (image/video sources, card image,
 * section background image) onto the shared media library picker. The stored
 * contract stays a URL string: picking a library asset resolves and writes the
 * asset URL, never the asset id. Stored URLs that match a library asset show
 * as that selection; other stored URLs surface as a clearable readout.
 */
const ToolbarMediaUrlField = ({
  label,
  value,
  accept,
  onChange,
}: {
  label: string;
  value: string;
  accept?: readonly string[];
  onChange: (url: string | null) => void;
}) => {
  const [assets, setAssets] = useState<readonly MediaRecord[] | null>(() => getCachedMedia());
  const requestRef = useRef(0);
  const selectedAssetId = value ? (assets?.find((asset) => asset.url === value)?.id ?? null) : null;

  useEffect(() => {
    if (!value || assets) return;
    let active = true;
    listMediaCached()
      .then((items) => {
        if (active) setAssets(items);
      })
      .catch(() => {
        // The picker dialog owns media load errors; the stored value is kept.
      });
    return () => {
      active = false;
    };
  }, [assets, value]);

  const handlePickerChange = (next: unknown) => {
    if (typeof next !== "string" || next.length === 0) {
      onChange(null);
      return;
    }
    requestRef.current += 1;
    const requestId = requestRef.current;
    void listMediaCached()
      .then((items) => {
        if (requestId !== requestRef.current) return;
        setAssets(items);
        const match = items.find((item) => item.id === next);
        if (match) onChange(match.url);
      })
      .catch(() => {
        // Resolution failed: never write an asset id into a URL path.
      });
  };

  const showsExternalValue = Boolean(value) && assets !== null && !selectedAssetId;
  return (
    <div className="grid gap-1">
      <MediaPickerControl
        label={label}
        value={selectedAssetId}
        accept={accept ? [...accept] : undefined}
        onChange={handlePickerChange}
      />
      {showsExternalValue ? (
        <div
          className="flex items-center justify-between gap-2 rounded-md bg-white/10 px-2 py-1"
          data-page-editor-media-external={label}
        >
          <span className="truncate text-xs text-slate-300">{value}</span>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className={editorDarkGhostButtonClass}
            onClick={() => onChange(null)}
          >
            Clear
          </Button>
        </div>
      ) : null}
    </div>
  );
};

const ToolbarTextField = ({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
}) => (
  <label className={`grid gap-1 ${editorControlLabelClass}`} data-page-editor-control="text">
    {label}
    <input
      className={`rounded-md border border-white/15 bg-white/10 px-2 py-1.5 text-sm font-normal normal-case tracking-normal text-slate-100 placeholder:text-slate-500 ${editorControlFocusClass}`}
      value={value}
      onChange={(event) => onChange(event.target.value)}
    />
  </label>
);

const ToolbarSelectField = ({
  label,
  value,
  options,
  optionLabels,
  onChange,
}: {
  label: string;
  value: string;
  options: readonly string[];
  optionLabels?: Readonly<Record<string, string>>;
  onChange: (value: string) => void;
}) => (
  <label className={`grid gap-1 ${editorControlLabelClass}`} data-page-editor-control="select">
    {label}
    <select
      className={`rounded-md border border-white/15 bg-white/10 px-2 py-1.5 text-sm font-normal normal-case tracking-normal text-slate-100 ${editorControlFocusClass}`}
      value={value}
      onChange={(event) => onChange(event.target.value)}
    >
      {options.map((option) => (
        <option key={option} value={option}>
          {optionLabels?.[option] ?? option}
        </option>
      ))}
    </select>
  </label>
);

type ResponsiveBadgeState = "base" | "override" | "inherited";

const responsiveBadgeDescription = (state: ResponsiveBadgeState, device: PageBreakpoint) => {
  if (state === "base") {
    return "Base value. Desktop edits apply to every breakpoint without an override.";
  }
  if (state === "override") {
    return `Overridden on ${device}. This field no longer follows the desktop value.`;
  }
  return `Inherited from desktop. Editing on ${device} creates a ${device}-only override.`;
};

/**
 * Inline responsive-state badge with a hover/focus tooltip explaining the
 * Base / Override / Inherited cascade for the individual control.
 */
const ResponsiveStateBadge = ({
  state,
  device,
  description,
}: {
  state: ResponsiveBadgeState;
  device: PageBreakpoint;
  description?: string;
}) => (
  <Tooltip>
    <TooltipTrigger asChild>
      <span
        tabIndex={0}
        className={`rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase ${editorControlFocusClass} ${
          state === "override" ? "bg-sky-400/20 text-sky-200" : "bg-white/10 text-slate-400"
        }`}
        data-page-editor-responsive-badge={state}
      >
        {state === "base" ? "Base" : state === "override" ? "Override" : "Inherited"}
      </span>
    </TooltipTrigger>
    <TooltipContent side="top" sideOffset={6} className="max-w-[240px]">
      {description ?? responsiveBadgeDescription(state, device)}
    </TooltipContent>
  </Tooltip>
);

const ResponsiveControlShell = ({
  device,
  override,
  label,
  onReset,
  children,
}: {
  device: PageBreakpoint;
  override: boolean;
  /** Control label used in the reset affordance accessible name. */
  label?: string;
  onReset: () => void;
  children: ReactNode;
}) => {
  const state: ResponsiveBadgeState =
    device === "desktop" ? "base" : override ? "override" : "inherited";
  return (
    <div
      // `min-w-0` keeps wide controls (segmented strips) scrolling inside the
      // auto-fit panel grid cell instead of overlapping the neighbor column.
      className="grid min-w-0 gap-1"
      data-page-editor-responsive-field={override ? "override" : "inherited"}
    >
      {children}
      <div className="flex min-h-6 items-center justify-between gap-2">
        <ResponsiveStateBadge state={state} device={device} />
        {device !== "desktop" && override ? (
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                type="button"
                aria-label={label ? `Reset ${label} to inherited` : "Reset to inherited"}
                className={`inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-xs font-semibold text-slate-300 transition-colors hover:bg-white/10 hover:text-white ${editorControlFocusClass}`}
                data-page-editor-responsive-reset={label ?? "field"}
                onClick={onReset}
              >
                <RotateCcw className="h-3 w-3" />
                Reset
              </button>
            </TooltipTrigger>
            <TooltipContent side="top" sideOffset={6} className="max-w-[240px]">
              {`Remove the ${device} override and inherit the desktop value.`}
            </TooltipContent>
          </Tooltip>
        ) : null}
      </div>
    </div>
  );
};

const TextField = ({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
}) => (
  <label className="grid gap-1 text-xs font-semibold uppercase text-muted-foreground">
    {label}
    <input
      className="rounded border px-2 py-2 text-sm font-normal normal-case text-foreground"
      value={value}
      onChange={(event) => onChange(event.target.value)}
    />
  </label>
);

const NumberField = ({
  label,
  value,
  min,
  max,
  onChange,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  onChange: (value: number) => void;
}) => (
  <label className="grid gap-1 text-xs font-semibold uppercase text-muted-foreground">
    {label}
    <input
      className="rounded border px-2 py-2 text-sm font-normal text-foreground"
      type="number"
      value={value}
      min={min}
      max={max}
      onChange={(event) => onChange(Number(event.target.value))}
    />
  </label>
);

const SelectField = ({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: string;
  options: readonly string[];
  onChange: (value: string) => void;
}) => (
  <label className="grid gap-1 text-xs font-semibold uppercase text-muted-foreground">
    {label}
    <select
      className="rounded border px-2 py-2 text-sm font-normal text-foreground"
      value={value}
      onChange={(event) => onChange(event.target.value)}
    >
      {options.map((option) => (
        <option key={option} value={option}>
          {option}
        </option>
      ))}
    </select>
  </label>
);

const SettingsSheet = ({
  open,
  title,
  slug,
  showInNav,
  revisionRetention,
  isSaving,
  onOpenChange,
  onTitleChange,
  onSlugChange,
  onShowInNavChange,
  onRevisionRetentionChange,
  onSave,
}: {
  open: boolean;
  title: string;
  slug: string;
  showInNav: boolean;
  revisionRetention: number;
  isSaving: boolean;
  onOpenChange: (open: boolean) => void;
  onTitleChange: (value: string) => void;
  onSlugChange: (value: string) => void;
  onShowInNavChange: (value: boolean) => void;
  onRevisionRetentionChange: (value: number) => void;
  onSave: () => void;
}) => (
  <Sheet open={open} onOpenChange={onOpenChange}>
    <SheetContent side="right" className="space-y-6 p-6">
      <div>
        <SheetTitle>Page settings</SheetTitle>
        <SheetDescription>Update metadata and publishing defaults.</SheetDescription>
      </div>
      <TextField label="Title" value={title} onChange={onTitleChange} />
      <TextField label="Slug" value={slug} onChange={onSlugChange} />
      <SelectField
        label="Show in navigation"
        value={showInNav ? "yes" : "no"}
        options={["yes", "no"]}
        onChange={(value) => onShowInNavChange(value === "yes")}
      />
      <NumberField
        label="Revision retention"
        value={revisionRetention}
        min={1}
        max={100}
        onChange={onRevisionRetentionChange}
      />
      <Button type="button" disabled={isSaving} onClick={onSave}>
        {isSaving ? "Saving..." : "Save settings"}
      </Button>
    </SheetContent>
  </Sheet>
);

const HistorySheet = ({
  open,
  revisions,
  isLoading,
  error,
  restoringRevisionId,
  discardingRevisionId,
  onOpenChange,
  onRestore,
  onDiscard,
}: {
  open: boolean;
  revisions: PageRevision[];
  isLoading: boolean;
  error: string | null;
  restoringRevisionId: string | null;
  discardingRevisionId: string | null;
  onOpenChange: (open: boolean) => void;
  onRestore: (revisionId: string) => void;
  onDiscard: (revisionId: string) => void;
}) => (
  <Sheet open={open} onOpenChange={onOpenChange}>
    <SheetContent side="right" className="space-y-4 p-6">
      <div>
        <SheetTitle>Page history</SheetTitle>
        <SheetDescription>Restore published versions or manage draft autosaves.</SheetDescription>
      </div>
      {isLoading ? <p className="text-sm text-muted-foreground">Loading revisions...</p> : null}
      {error ? <p className="text-sm text-destructive">{error}</p> : null}
      {!isLoading && revisions.length === 0 ? (
        <p className="text-sm text-muted-foreground">No revisions yet.</p>
      ) : null}
      <div className="space-y-3">
        {revisions.map((revision) => (
          <div key={revision.id} className="rounded border p-3">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-sm font-semibold">
                  {revision.kind === "autosave" ? "Draft version" : `Version ${revision.version}`}
                </p>
                <p className="text-xs text-muted-foreground">
                  {revision.title ?? revision.slug ?? revision.id}
                </p>
              </div>
              <div className="flex gap-2">
                {revision.kind === "autosave" ? (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    disabled={discardingRevisionId === revision.id}
                    onClick={() => onDiscard(revision.id)}
                  >
                    Discard
                  </Button>
                ) : null}
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={restoringRevisionId === revision.id}
                  onClick={() => onRestore(revision.id)}
                >
                  Restore
                </Button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </SheetContent>
  </Sheet>
);
