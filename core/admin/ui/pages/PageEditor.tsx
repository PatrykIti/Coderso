import { Fragment, useCallback, useEffect, useMemo, useRef, useState } from "react";
import type {
  CSSProperties,
  KeyboardEvent as ReactKeyboardEvent,
  PointerEvent as ReactPointerEvent,
  ReactNode,
} from "react";
import {
  ArrowDown,
  ArrowUp,
  Baseline,
  Brush,
  Copy,
  Eye,
  GripVertical,
  History,
  Layers,
  LayoutPanelTop,
  ListPlus,
  Maximize2,
  Minimize2,
  MonitorSmartphone,
  PaintBucket,
  PanelTop,
  Plus,
  RotateCcw,
  Save,
  Search,
  Settings2,
  Trash2,
  Type,
  X,
  type LucideIcon,
} from "lucide-react";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetDescription, SheetTitle } from "@/components/ui/sheet";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { isApiClientError, isSessionExpiredApiError } from "@/services/apiClient";
import { cacheKeys } from "@/services/cachePolicy";
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
import { ConfirmActionDialog } from "@/ui/shared/ConfirmActionDialog";
import {
  clearActiveAssistantSurfaceContext,
  setActiveAssistantSurfaceContext,
} from "@/ui/assistant/activeSurfaceContext";
import { subscribeCacheEvents } from "@/utils/cacheBus";
import {
  clearBlockResponsiveOverride,
  clearResponsiveOverride,
  PAGE_BLOCK_MAX_CHILDREN_PER_SLOT,
  PAGE_BLOCK_MAX_TREE_DEPTH,
  createPageBlockV2,
  createPageDocumentId,
  createPageSectionV2,
  isPageTypographyCapableBlockType,
  normalizeStoredPageDocumentV2ForRead,
  pageBlockCapabilities,
  pageBlockPropKeys,
  pageBlockTypes,
  pageSectionCapabilities,
  pageSectionTypes,
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
  pageEditorDeviceMetadata,
  pageResponsiveHideToggles,
  pageSectionStackVerticalControl,
  pageUniversalSectionControls,
  projectPageResponsiveOverrideEntries,
  type PageEditorControlDefinition,
} from "../../../services/pages/pageEditorControlRegistry";
import {
  resolvePageEditorControlUiModel,
  type PageEditorControlUiModel,
} from "../../../services/pages/pageEditorControlUiModel";
import { DEFAULT_TOKENS, type DesignTokenOverrides } from "../../../services/theme/tokenTypes";
import { mergeTokens } from "../../../services/theme/tokenUtils";
import { assertTokenOverrides } from "../../../services/theme/tokenValidation";
import { toPageTypographyCssVariableMap } from "../../../ui/theme/tokenCss";
import {
  ColorSwatchControl,
  MediaPickerControl,
  SegmentedControl,
  SliderControl,
  SliderStepperControl,
  ToggleSwitch,
} from "./editorControls";
import { editorControlFocusClass, editorControlLabelClass } from "./editorControls/controlChrome";
import {
  deletePageBlockAtPath,
  duplicatePageBlockAtPath,
  duplicatePageBlockTreeWithNewIds,
  getDefaultPageBlockInsertTarget,
  getPageBlockAtPath,
  getPageBlockEditorSlotKeys,
  getPageBlockInsertTargetStatus,
  getPageBlockListAtPath,
  getPageBlockSiblingMoveTarget,
  insertPageBlockAtTarget,
  isPageBlockPathDescendant,
  isSamePageBlockPath,
  movePageBlockToTarget,
  serializePageBlockPath,
  updatePageBlockAtPath,
  type PageBlockInsertTarget,
  type PageBlockPath,
} from "../../../services/pages/pageBlockPaths";
import {
  commitInlineText,
  inlineEditableTargets,
  resolveInlineEditTarget,
} from "../../../services/pages/pageInlineEditContract";
import {
  instantiatePageTemplateSections,
  normalizeStoredPageTemplateDocument,
} from "../../../services/pages/pageTemplateLibrarySchema";
import { getPageSectionFallbackVariant } from "../../../services/pages/pageSectionTemplates";
import { joinPageRenderClasses, PageSectionContent } from "../../../services/pages/pageRendererV2";
import { normalizePageRevisionRetentionValue } from "../../../services/pages/revisionRetention";
import {
  resolveAssistantPageSelection,
  summarizePageSectionsForAssistant,
} from "../../../services/assistant/pageActiveSurfaceSummary";
import { DeviceSwitcher } from "./DeviceSwitcher";

export type PageEditorHostRevisions = {
  list: (id: string) => Promise<PageRevision[]>;
  restore: (
    id: string,
    revisionId: string
  ) => Promise<{ ok: boolean; restored: boolean; revision: PageRevision; page: PageDetail }>;
  discard: (id: string, revisionId: string) => Promise<{ ok: boolean }>;
};

export type PageEditorHostPreviewResponse = {
  previewUrl: string;
  probe?: PreviewProbeResult;
};

export type PageEditorHostSettingsRenderProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  detail: PageDetail | null;
  onSaved: (detail: PageDetail) => void;
};

/**
 * Document host abstraction: the Page Editor v2 surface (canvas, floating
 * panel, registry control pipeline, inline edit) is shared verbatim between
 * Pages and Page Templates. Hosts only swap the page-chrome concerns: load
 * and save endpoints, cache keys, publish/revisions availability, preview
 * issuance, the settings sheet, and assistant surface advertisement.
 */
export type PageEditorHost = {
  mode: "page" | "page-template";
  resourceLabel: string;
  settingsLabel: string;
  previewTitle: string;
  loadFailedMessage: string;
  /** Advertise the assistant active surface only when the host owns one. */
  assistantSurface: boolean;
  detailCacheKey: (id: string) => string;
  getCachedDetail: (id: string) => PageDetail | null;
  loadDetail: (id: string) => Promise<PageDetail | null>;
  saveDocument: (id: string, document: PageDocumentV2) => Promise<PageDetail>;
  autosaveDocument?: (id: string, document: PageDocumentV2) => Promise<unknown>;
  publish?: (id: string, document: PageDocumentV2) => Promise<unknown>;
  preview: (id: string) => Promise<PageEditorHostPreviewResponse>;
  revisions?: PageEditorHostRevisions;
  /** Page-chrome settings: defaults to the page settings sheet when omitted. */
  renderSettings?: (props: PageEditorHostSettingsRenderProps) => ReactNode;
  /** Published reusable templates offered by the insert/apply picker. */
  templateLibrary?: {
    listPublished: () => Promise<{ id: string; name: string; description: string | null }[]>;
    instantiateSections: (id: string) => Promise<PageSectionV2[]>;
  };
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
  loadDetail: (id) => getPageCached(id),
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

type ToolbarPanel =
  | "layout"
  | "content"
  | "typography"
  | "style"
  | "spacing"
  | "background"
  | "responsive"
  | "visibility";

type SectionOption = {
  type: PageSectionType;
  label: string;
  description: string;
};

type BlockOption = {
  type: PageBlockType;
  label: string;
  description: string;
};

type ToolbarPanelOption = {
  panel: ToolbarPanel;
  label: string;
  /** Hover tooltip description for the panel category icon. */
  description: string;
  Icon: LucideIcon;
};

type ToolbarActionTooltip = {
  label: string;
  description: string;
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

const sectionOptionCopy: Record<PageSectionType, Omit<SectionOption, "type">> = {
  template: { label: "Template", description: "Template boundary section." },
  navigation: { label: "Navigation", description: "Runtime navigation boundary." },
  hero: { label: "Hero", description: "Headline, copy, and primary action." },
  content: { label: "Content", description: "Simple text-led section." },
  "feature-grid": { label: "Feature grid", description: "Cards or repeated highlights." },
  "media-split": { label: "Media split", description: "Copy next to image or video." },
  timeline: { label: "Timeline", description: "Ordered story or milestone section." },
  gallery: { label: "Gallery", description: "Visual collection section." },
  collection: { label: "Collection", description: "Data-bound listing boundary." },
  comparison: { label: "Comparison", description: "Compare options or service tiers." },
  filters: { label: "Filters", description: "Listing filter boundary." },
  "lead-form": { label: "Lead form", description: "Form-focused conversion boundary." },
  faq: { label: "FAQ", description: "Question and answer content." },
  testimonials: { label: "Testimonials", description: "Quotes or social proof." },
  cta: { label: "CTA", description: "Focused call to action." },
  embed: { label: "Embed", description: "Trusted embed boundary." },
  custom: { label: "Custom", description: "Flexible generic section." },
};

const sectionOptions: SectionOption[] = pageSectionTypes.flatMap((type) =>
  pageSectionCapabilities[type].insertable ? [{ type, ...sectionOptionCopy[type] }] : []
);

const blockOptionCopy: Record<PageBlockType, Omit<BlockOption, "type">> = {
  heading: { label: "Heading", description: "Section title or subheading." },
  text: { label: "Text", description: "Paragraph copy." },
  button: { label: "Button", description: "Clickable call to action." },
  image: { label: "Image", description: "Image from media or URL." },
  video: { label: "Video", description: "Embedded video from media or URL." },
  gallery: { label: "Gallery", description: "Visual collection block." },
  form: { label: "Form", description: "Configured form embed." },
  list: { label: "List", description: "Bulleted or numbered points." },
  card: { label: "Card", description: "Compact title and body block." },
  collection: { label: "Collection", description: "Data-bound listing block." },
  embed: { label: "Embed", description: "Trusted external embed." },
  divider: { label: "Divider", description: "Visual separator." },
  spacer: { label: "Spacer", description: "Vertical rhythm control." },
  statistic: { label: "Statistic", description: "Metric value with label and caption." },
  icon: { label: "Icon", description: "Small symbolic block." },
  quote: { label: "Quote", description: "Pull quote with optional citation." },
  container: { label: "Container", description: "Nested layout container." },
  columns: { label: "Columns", description: "Nested column layout." },
  group: { label: "Group", description: "Nested grouped layout." },
};

const blockOptions: BlockOption[] = pageBlockTypes.flatMap((type) =>
  pageBlockCapabilities[type].editorInsertable ? [{ type, ...blockOptionCopy[type] }] : []
);

const toolbarPanelOptions: ToolbarPanelOption[] = [
  {
    panel: "layout",
    label: "Layout",
    description: "Variant, columns, alignment, and max width presets.",
    Icon: LayoutPanelTop,
  },
  {
    panel: "content",
    label: "Content",
    description: "Copy and content fields for the selected block.",
    Icon: Type,
  },
  {
    panel: "typography",
    label: "Typography",
    description: "Font family, size, weight, line height, letter spacing, and text align.",
    Icon: Baseline,
  },
  {
    panel: "style",
    label: "Style",
    description: "Accent color, radius, and shadow presets.",
    Icon: Brush,
  },
  {
    panel: "background",
    label: "Background",
    description: "Background type, color, and image.",
    Icon: PaintBucket,
  },
  {
    panel: "spacing",
    label: "Spacing",
    description: "Padding and block gap presets.",
    Icon: ListPlus,
  },
  {
    panel: "responsive",
    label: "Responsive",
    description: "Breakpoint override state for this selection.",
    Icon: MonitorSmartphone,
  },
  {
    panel: "visibility",
    label: "Visibility",
    description: "Visibility, anchor, and date range scheduling.",
    Icon: Eye,
  },
];

/**
 * Hover tooltip copy for the floating-toolbar action icons. Labels double as
 * the accessible names so tests and assistive tech read the same metadata the
 * tooltip shows; no ad hoc `title` strings.
 */
const toolbarActionTooltips = {
  drag: {
    label: "Drag toolbar",
    description: "Drag to reposition the toolbar over the canvas.",
  },
  collapse: {
    label: "Collapse toolbar",
    description: "Hide the panel icons and actions; the selection stays.",
  },
  expand: {
    label: "Expand toolbar",
    description: "Show the panel icons and actions again.",
  },
  closePanel: {
    label: "Close panel",
    description: "Close this panel; the toolbar stays open.",
  },
  moveSectionUp: {
    label: "Move section up",
    description: "Move the selected section one position earlier.",
  },
  moveSectionDown: {
    label: "Move section down",
    description: "Move the selected section one position later.",
  },
  moveBlockUp: {
    label: "Move block up",
    description: "Move the selected block one position earlier.",
  },
  moveBlockDown: {
    label: "Move block down",
    description: "Move the selected block one position later.",
  },
  duplicateSection: {
    label: "Duplicate section",
    description: "Insert a copy of the selected section below it.",
  },
  duplicateBlock: {
    label: "Duplicate block",
    description: "Insert a copy of the selected block after it.",
  },
  deleteSection: {
    label: "Delete section",
    description: "Remove the selected section after confirmation.",
  },
  deleteBlock: {
    label: "Delete block",
    description: "Remove the selected block after confirmation.",
  },
} satisfies Record<string, ToolbarActionTooltip>;

/**
 * Static Tailwind canvas frame widths. Tailwind scans literal class strings,
 * so these stay hardcoded — they MUST match the canonical widths in
 * `pageEditorDeviceMetadata` (the switcher/scope readouts derive from there).
 */
const canvasDeviceFrameClassMap: Record<PageBreakpoint, string> = {
  desktop: "max-w-[1080px]",
  tablet: "max-w-[744px]",
  mobile: "max-w-[390px]",
};

/** "Tablet · 744px" readout used by the scope pill and the canvas context bar. */
const deviceScopeReadout = (device: PageBreakpoint) =>
  `${pageEditorDeviceMetadata[device].label} · ${pageEditorDeviceMetadata[device].width}px`;

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
const useCanvasSiteTokenVariables = (): CSSProperties => {
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
    () =>
      toPageTypographyCssVariableMap(
        mergeTokens(DEFAULT_TOKENS, readSiteDesignTokenOverrides(settings))
      ) as CSSProperties,
    [settings]
  );
};

const pageEditorStatusBadgeClassName = (status: string) =>
  status === "published"
    ? "rounded-full border border-emerald-500/20 bg-emerald-500/10 px-2 py-0.5 text-[10px] font-semibold uppercase text-emerald-600"
    : "rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-semibold uppercase text-amber-800";

const resolvePageId = (pathname: string) => {
  const parts = pathname.split("/").filter(Boolean);
  const pageIndex = parts.findIndex((segment) => segment === "pages");
  if (pageIndex === -1) return null;
  return parts[pageIndex + 1] ?? null;
};

const cloneDocument = (document: PageDocumentV2): PageDocumentV2 =>
  JSON.parse(JSON.stringify(document)) as PageDocumentV2;

const readText = (value: unknown, fallback = "") => {
  if (typeof value !== "string") return fallback;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : fallback;
};

const primaryContentPropByBlockType: Partial<Record<PageBlockType, string>> = {
  heading: "text",
  text: "text",
  button: "label",
  image: "alt",
  video: "title",
  card: "title",
  form: "title",
  statistic: "value",
  icon: "label",
  quote: "text",
};

const filterBlockPropsPatch = (type: PageBlockType, patch: Record<string, unknown>) => {
  const allowed = pageBlockPropKeys[type];
  return Object.fromEntries(
    Object.entries(patch).filter(([key, value]) => value !== undefined && allowed.includes(key))
  );
};

const getPrimaryBlockContent = (block: PageBlockV2 | undefined) => {
  if (!block) return "";
  const prop = primaryContentPropByBlockType[block.type];
  return prop ? readText(block.props[prop]) : "";
};

const getBlockDisplayLabel = (block: PageBlockV2) =>
  getPrimaryBlockContent(block) ||
  readText(block.props.title) ||
  readText(block.props.alt) ||
  block.type.replace(/-/g, " ");

export type ToolbarLabelTarget =
  | { kind: "section"; type: PageSectionType }
  | { kind: "block"; type: PageBlockType }
  | null;

type ResolveToolbarTargetLabelOptions = {
  /**
   * When true (the shared default), targets without curated display copy fall
   * back to a humanized type name. The fallback never reads user content.
   */
  fallbackToTypeName?: boolean;
};

const humanizeTypeName = (type: string) => {
  const spaced = type.replace(/-/g, " ").trim();
  return spaced ? `${spaced.charAt(0).toUpperCase()}${spaced.slice(1)}` : "Selection";
};

// Single owner of the floating-toolbar label contract (TASK-451-02-L01).
// Toolbar labels and their aria text always resolve from the block/section
// TYPE display name ("Text tools", "Statistic tools", "Quote tools",
// "Hero tools") — user-entered content (copy, statistic values, quote text)
// must never leak into the toolbar label. Content hints stay only where they
// already exist (layer rows, delete dialogs, content panel header).
// TASK-438/446/447 adopt this helper for their per-type fallback labels.
export const resolveToolbarTargetLabel = (
  target: ToolbarLabelTarget,
  options: ResolveToolbarTargetLabelOptions = {}
): string => {
  const { fallbackToTypeName = true } = options;
  if (!target) return "Page";
  const copy =
    target.kind === "block" ? blockOptionCopy[target.type] : sectionOptionCopy[target.type];
  if (copy?.label) return copy.label;
  return fallbackToTypeName ? humanizeTypeName(target.type) : "Selection";
};

type BlockControlGroup = "props" | "style" | "visibility";
type SectionControlGroup = "layout" | "style" | "spacing" | "visibility";

const blockControlGroups: readonly BlockControlGroup[] = ["props", "style", "visibility"];
const sectionControlGroups: readonly SectionControlGroup[] = [
  "layout",
  "style",
  "spacing",
  "visibility",
];

const isPlainRecord = (value: unknown): value is Record<string, unknown> =>
  Boolean(value) && typeof value === "object" && !Array.isArray(value);

const isBlockControlGroup = (value: string | undefined): value is BlockControlGroup =>
  blockControlGroups.includes(value as BlockControlGroup);

const isSectionControlGroup = (value: string | undefined): value is SectionControlGroup =>
  sectionControlGroups.includes(value as SectionControlGroup);

const readPathValue = (source: unknown, path: readonly string[]): unknown =>
  path.reduce<unknown>((current, key) => {
    if (!isPlainRecord(current)) return undefined;
    return current[key];
  }, source);

const setNestedPathValue = (
  source: unknown,
  path: readonly string[],
  value: unknown
): Record<string, unknown> => {
  const current = isPlainRecord(source) ? source : {};
  const [key, ...rest] = path;
  if (!key) return { ...current };
  if (rest.length === 0) return { ...current, [key]: value };
  return {
    ...current,
    [key]: setNestedPathValue(current[key], rest, value),
  };
};

const patchBlockPropsForDevice = (
  block: PageBlockV2,
  device: PageBreakpoint,
  patch: Record<string, unknown>
): PageBlockV2 => {
  const knownPatch = filterBlockPropsPatch(block.type, patch);
  if (Object.keys(knownPatch).length === 0) return block;
  if (device === "desktop") {
    return { ...block, props: { ...block.props, ...knownPatch } };
  }
  return {
    ...block,
    responsive: {
      ...block.responsive,
      [device]: {
        ...(block.responsive?.[device] ?? {}),
        props: {
          ...(block.responsive?.[device]?.props ?? {}),
          ...knownPatch,
        },
      },
    },
  };
};

const patchBlockControlForDevice = (
  block: PageBlockV2,
  device: PageBreakpoint,
  control: PageEditorControlDefinition,
  value: unknown
): PageBlockV2 => {
  const [group, ...path] = control.overridePath;
  if (!isBlockControlGroup(group) || path.length === 0) return block;
  if (group === "props") {
    const [key] = path;
    return key ? patchBlockPropsForDevice(block, device, { [key]: value }) : block;
  }

  if (device === "desktop") {
    return {
      ...block,
      [group]: setNestedPathValue(block[group], path, value),
    };
  }

  const breakpoint = block.responsive?.[device] ?? {};
  return {
    ...block,
    responsive: {
      ...block.responsive,
      [device]: {
        ...breakpoint,
        [group]: setNestedPathValue(breakpoint[group], path, value),
      },
    },
  };
};

type PageOverrideBreakpoint = Exclude<PageBreakpoint, "desktop">;

/**
 * Responsive-panel hide toggles write an EXPLICIT breakpoint (not the active
 * canvas device): desktop writes the base `visibility.visible`, tablet and
 * mobile write the existing sparse `responsive[bp].visibility.visible`
 * override containers (TASK-425). No new schema paths.
 */
const setSectionVisibleForBreakpoint = (
  section: PageSectionV2,
  breakpoint: PageBreakpoint,
  visible: boolean
): PageSectionV2 => {
  if (breakpoint === "desktop") {
    return { ...section, visibility: { ...section.visibility, visible } };
  }
  return {
    ...section,
    responsive: {
      ...section.responsive,
      [breakpoint]: {
        ...(section.responsive[breakpoint] ?? {}),
        visibility: { ...(section.responsive[breakpoint]?.visibility ?? {}), visible },
      },
    },
  };
};

const setBlockVisibleForBreakpoint = (
  block: PageBlockV2,
  breakpoint: PageBreakpoint,
  visible: boolean
): PageBlockV2 => {
  if (breakpoint === "desktop") {
    return { ...block, visibility: { ...block.visibility, visible } };
  }
  return {
    ...block,
    responsive: {
      ...block.responsive,
      [breakpoint]: {
        ...(block.responsive?.[breakpoint] ?? {}),
        visibility: { ...(block.responsive?.[breakpoint]?.visibility ?? {}), visible },
      },
    },
  };
};

const patchSectionControlForDevice = (
  section: PageSectionV2,
  device: PageBreakpoint,
  control: PageEditorControlDefinition,
  value: unknown
): PageSectionV2 => {
  const [group, ...path] = control.overridePath;
  if (!isSectionControlGroup(group) || path.length === 0) return section;

  if (device === "desktop") {
    return {
      ...section,
      [group]: setNestedPathValue(section[group], path, value),
    };
  }

  const breakpoint = section.responsive[device] ?? {};
  return {
    ...section,
    responsive: {
      ...section.responsive,
      [device]: {
        ...breakpoint,
        [group]: setNestedPathValue(breakpoint[group], path, value),
      },
    },
  };
};

const listItemsFromFieldValue = (value: string) =>
  value
    .split(/\r?\n|,/)
    .map((item) => item.trim())
    .filter(Boolean);

const fieldValueFromControlValue = (
  control: PageEditorControlDefinition,
  value: unknown
): string => {
  if (control.input === "switch") return value === true ? "yes" : "no";
  if (control.input === "number") return typeof value === "number" ? String(value) : "";
  if (control.input === "select" || control.input === "segmented") {
    return typeof value === "string" ? value : (control.options?.[0] ?? "");
  }
  if (control.path[0] === "props" && control.path[1] === "items") {
    if (!Array.isArray(value)) return "";
    return value
      .map((item) => {
        if (typeof item === "string") return item;
        if (isPlainRecord(item) && typeof item.label === "string") return item.label;
        return "";
      })
      .filter(Boolean)
      .join(", ");
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
  if (control.path[0] === "props" && control.path[1] === "items") {
    return listItemsFromFieldValue(value);
  }
  return value;
};

const hasPathValue = (source: unknown, path: readonly string[]) =>
  path.reduce<unknown>((current, key) => {
    if (!isPlainRecord(current) || !(key in current)) return undefined;
    return current[key];
  }, source) !== undefined;

const hasResponsiveOverride = (
  breakpoint: PageBreakpoint,
  source: unknown,
  path: readonly string[]
) => breakpoint !== "desktop" && hasPathValue(source, path);

const hasAnyResponsiveOverride = (breakpoint: PageBreakpoint, source: unknown) =>
  breakpoint !== "desktop" && isPlainRecord(source) && Object.keys(source).length > 0;

const clampToolbarOffset = (value: number, min: number, max: number) =>
  Math.max(min, Math.min(max, value));

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

type PageEditorInlineEditTarget = {
  blockId: string;
  propPath: string;
};

type PageEditorInlineEditCommit = {
  blockId: string;
  propPath: string;
  /** Text content of the contenteditable region at blur time. */
  text: string;
  /** Text the canvas painted when editing started (includes renderer fallbacks). */
  renderedText: string;
};

/** Stable ref callback: focuses a freshly activated inline-edit region with the caret at the end. */
const focusInlineEditableNode = (node: HTMLElement | null) => {
  if (!node || typeof document === "undefined" || document.activeElement === node) return;
  node.focus();
  const selection = node.ownerDocument.defaultView?.getSelection?.();
  if (!selection || typeof node.ownerDocument.createRange !== "function") return;
  const range = node.ownerDocument.createRange();
  range.selectNodeContents(node);
  range.collapse(false);
  selection.removeAllRanges();
  selection.addRange(range);
};

const readInlineEditableElementText = (element: HTMLElement): string => {
  // innerText preserves line breaks typed into multiline regions in real
  // browsers; DOM test environments without it fall back to textContent.
  const { innerText } = element as HTMLElement & { innerText?: unknown };
  return typeof innerText === "string" ? innerText : (element.textContent ?? "");
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

const InlineEditableCanvasText = ({
  block,
  propPath,
  text,
  selected,
  editing,
  onStartEdit,
  onCommit,
}: {
  block: PageBlockV2;
  propPath: string;
  text: string;
  selected: boolean;
  editing: boolean;
  onStartEdit: (target: PageEditorInlineEditTarget) => void;
  onCommit: (commit: PageEditorInlineEditCommit) => void;
}) => {
  const target = resolveInlineEditTarget(block, propPath);
  // Fail closed: anything outside the inline-edit contract renders the plain
  // text node with no contentEditable surface at all.
  if (!target) return <>{text}</>;
  const { multiline } = target;
  return (
    <span
      // Key by painted text so a commit replaces the DOM node instead of
      // reconciling text nodes the browser restructured while editing.
      key={`${propPath}:${text}`}
      ref={editing ? focusInlineEditableNode : undefined}
      contentEditable={editing ? true : undefined}
      suppressContentEditableWarning
      data-page-editor-inline-edit={editing ? "active" : "idle"}
      data-page-editor-inline-edit-prop={propPath}
      className={
        editing ? "cursor-text outline-none ring-1 ring-primary/60 ring-offset-2" : undefined
      }
      onDoubleClick={
        editing || !selected
          ? undefined
          : (event) => {
              event.preventDefault();
              event.stopPropagation();
              onStartEdit({ blockId: block.id, propPath });
            }
      }
      onClick={
        editing
          ? (event) => {
              event.stopPropagation();
            }
          : undefined
      }
      onKeyDown={
        editing
          ? (event) => {
              if (event.key === "Escape") {
                event.preventDefault();
                event.stopPropagation();
                event.currentTarget.blur();
                return;
              }
              if (event.key === "Enter" && !multiline) {
                event.preventDefault();
                event.stopPropagation();
                event.currentTarget.blur();
              }
            }
          : undefined
      }
      onBlur={
        editing
          ? (event) => {
              onCommit({
                blockId: block.id,
                propPath,
                text: readInlineEditableElementText(event.currentTarget),
                renderedText: text,
              });
            }
          : undefined
      }
    >
      {text}
    </span>
  );
};

const readSectionBreakpointOverride = (section: PageSectionV2, breakpoint: PageBreakpoint) =>
  breakpoint === "desktop" ? undefined : section.responsive[breakpoint];

const readBlockBreakpointOverride = (block: PageBlockV2 | undefined, breakpoint: PageBreakpoint) =>
  breakpoint === "desktop" ? undefined : block?.responsive?.[breakpoint];

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

// Stale or replayed pageDetail cache events must never replace a newer loaded
// document: autosave persists only a revision (not currentData), so an older
// cached record can otherwise wipe live editor content (TASK-449-02).
const isNewerPageDetailTimestamp = (candidate: string, loaded: string): boolean => {
  const candidateMs = Date.parse(candidate);
  const loadedMs = Date.parse(loaded);
  if (Number.isNaN(candidateMs) || Number.isNaN(loadedMs)) return false;
  return candidateMs > loadedMs;
};

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

const HiddenBlockGhost = ({ block }: { block: PageBlockV2 }) => (
  <div
    className="flex min-h-14 items-center justify-between gap-3 rounded border border-dashed border-muted-foreground/40 bg-muted/70 px-3 py-2 text-xs text-muted-foreground"
    data-page-editor-hidden-block-ghost="true"
  >
    <span className="shrink-0 font-semibold uppercase">Hidden {block.type}</span>
    <span className="min-w-0 truncate">{getBlockDisplayLabel(block)}</span>
  </div>
);

// Hover-revealed "+" insertion zone rendered in every canvas gap (above the
// first section, between sections, and below the last one). Activating it
// opens the existing command palette pre-targeted at the gap index.
const SectionGapInsertZone = ({
  index,
  onInsert,
}: {
  index: number;
  onInsert: (gapIndex: number) => void;
}) => (
  <div
    className="group relative flex h-7 items-center justify-center"
    data-page-editor-section-gap={index}
    onClick={(event) => event.stopPropagation()}
  >
    <div
      className="absolute inset-x-6 top-1/2 h-px -translate-y-1/2 bg-primary/30 opacity-0 transition-opacity group-focus-within:opacity-100 group-hover:opacity-100"
      aria-hidden="true"
    />
    <Button
      type="button"
      variant="outline"
      size="sm"
      className="relative z-10 h-6 gap-1 rounded-full px-2 text-xs opacity-0 shadow-sm transition-opacity focus-visible:opacity-100 group-focus-within:opacity-100 group-hover:opacity-100"
      aria-label={`Add section at position ${index + 1}`}
      onClick={() => onInsert(index)}
    >
      <Plus className="h-3 w-3" />
      Add section
    </Button>
  </div>
);

const SectionCanvas = ({
  section,
  baseSection,
  selected,
  selectedBlockPath,
  selectedBlockId,
  inlineEditTarget,
  device,
  onSelect,
  onSelectBlock,
  onAddBlock,
  onStartInlineEdit,
  onCommitInlineEdit,
}: {
  section: PageSectionV2;
  baseSection: PageSectionV2;
  selected: boolean;
  selectedBlockPath: PageBlockPath | null;
  selectedBlockId: string | null;
  inlineEditTarget: PageEditorInlineEditTarget | null;
  device: PageBreakpoint;
  onSelect: () => void;
  onSelectBlock: (blockPath: PageBlockPath) => void;
  onAddBlock: () => void;
  onStartInlineEdit: (target: PageEditorInlineEditTarget) => void;
  onCommitInlineEdit: (commit: PageEditorInlineEditCommit) => void;
}) => {
  const sectionHasOverride = hasAnyResponsiveOverride(
    device,
    readSectionBreakpointOverride(baseSection, device)
  );
  const visibilityBadges = [
    !section.visibility.visible ? "Hidden" : null,
    section.visibility.authOnly ? "Auth only" : null,
    section.visibility.startsAt ? `Starts ${section.visibility.startsAt}` : null,
    section.visibility.endsAt ? `Ends ${section.visibility.endsAt}` : null,
  ].filter((badge): badge is string => Boolean(badge));
  return (
    <section
      className={`group relative transition ${
        selected
          ? "outline outline-2 outline-offset-2 outline-primary"
          : "hover:outline hover:outline-1 hover:outline-offset-2 hover:outline-primary/40"
      } ${section.visibility.visible ? "" : "opacity-65"}`}
      data-page-editor-section={section.type}
      data-section-id={section.id}
      data-page-editor-responsive-target={sectionHasOverride ? "override" : "inherited"}
      data-page-editor-visibility={section.visibility.visible ? "visible" : "hidden"}
      onClick={(event) => {
        event.stopPropagation();
        onSelect();
      }}
    >
      <div className="absolute -top-3 left-4 hidden rounded bg-primary px-2 py-0.5 text-[10px] font-semibold uppercase text-primary-foreground group-hover:block group-focus-within:block">
        {section.name} · {section.variant}
      </div>
      {sectionHasOverride ? (
        <span className="absolute right-3 top-3 rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-semibold uppercase text-primary">
          {device} override
        </span>
      ) : null}
      {visibilityBadges.length > 0 ? (
        <div className="absolute right-3 top-9 z-10 flex max-w-[70%] flex-wrap justify-end gap-1">
          {visibilityBadges.map((badge) => (
            <span
              key={badge}
              className="rounded-full bg-muted px-2 py-0.5 text-[10px] font-semibold uppercase text-muted-foreground"
              data-page-editor-visibility-badge={badge}
            >
              {badge}
            </span>
          ))}
        </div>
      ) : null}
      <PageSectionContent
        section={section}
        layoutMode="canvas-device"
        includeHiddenBlocks
        emptyContent={
          <button
            type="button"
            className="rounded border border-dashed p-6 text-center text-sm text-muted-foreground hover:border-primary/40 hover:text-primary"
            onClick={(event) => {
              event.stopPropagation();
              onSelect();
              onAddBlock();
            }}
          >
            Add the first block
          </button>
        }
        renderInlineText={({ block, propPath, text }) => (
          <InlineEditableCanvasText
            block={block}
            propPath={propPath}
            text={text}
            selected={block.id === selectedBlockId}
            editing={Boolean(
              inlineEditTarget &&
              inlineEditTarget.blockId === block.id &&
              inlineEditTarget.propPath === propPath
            )}
            onStartEdit={onStartInlineEdit}
            onCommit={onCommitInlineEdit}
          />
        )}
        renderBlockFrame={({
          block,
          content,
          renderProps: blockRenderProps,
          blockPath,
          depth,
          slotKey,
        }) => {
          const baseBlock = getPageBlockAtPath(baseSection, blockPath) ?? undefined;
          const blockHasOverride = hasAnyResponsiveOverride(
            device,
            readBlockBreakpointOverride(baseBlock, device)
          );
          const blockSelected = isSamePageBlockPath(blockPath, selectedBlockPath);
          return (
            <div
              className={joinPageRenderClasses(
                "relative transition outline outline-1 outline-offset-2",
                blockRenderProps.className,
                blockSelected
                  ? "outline-primary ring-2 ring-primary/20"
                  : "outline-transparent hover:outline-primary/30",
                block.visibility.visible ? undefined : "opacity-70"
              )}
              style={blockRenderProps.style}
              {...blockRenderProps.dataAttributes}
              data-page-editor-block={block.type}
              data-page-editor-block-id={block.id}
              data-page-editor-block-path={serializePageBlockPath(blockPath)}
              data-page-editor-block-depth={depth}
              data-page-editor-block-slot-key={slotKey}
              data-page-editor-responsive-target={blockHasOverride ? "override" : "inherited"}
              data-page-editor-visibility={block.visibility.visible ? "visible" : "hidden"}
              data-selected={blockSelected ? "true" : undefined}
              onClick={(event) => {
                event.preventDefault();
                event.stopPropagation();
                onSelectBlock(blockPath);
              }}
            >
              {blockHasOverride ? (
                <span className="absolute right-2 top-2 rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-semibold uppercase text-primary">
                  {device}
                </span>
              ) : null}
              {block.visibility.visible ? content : <HiddenBlockGhost block={block} />}
            </div>
          );
        }}
      />
    </section>
  );
};

const createLayerBlockPath = (
  ownerPath: PageBlockPath | null,
  slotKey: PageBlockPath[number]["slotKey"],
  index: number
): PageBlockPath =>
  ownerPath
    ? ([...ownerPath, { slotKey, index }] as PageBlockPath)
    : ([{ index }] as PageBlockPath);

const formatSlotLabel = (slotKey: string) =>
  slotKey.startsWith("column:")
    ? `Column ${slotKey.replace("column:", "")}`
    : slotKey.replace(/-/g, " ").replace(/^./, (character) => character.toUpperCase());

const LayerBlockRows = ({
  section,
  blocks,
  ownerPath,
  slotKey,
  selectedBlockPath,
  device,
  onSelectBlock,
  onAddToTarget,
  onMoveToTarget,
}: {
  section: PageSectionV2;
  blocks: readonly PageBlockV2[];
  ownerPath: PageBlockPath | null;
  slotKey?: PageBlockPath[number]["slotKey"];
  selectedBlockPath: PageBlockPath | null;
  device: PageBreakpoint;
  onSelectBlock: (blockPath: PageBlockPath) => void;
  onAddToTarget: (target: PageBlockInsertTarget) => void;
  onMoveToTarget: (target: PageBlockInsertTarget) => void;
}) => (
  <div className="space-y-1">
    {blocks.map((block, index) => {
      const blockPath = createLayerBlockPath(ownerPath, slotKey, index);
      const serializedPath = serializePageBlockPath(blockPath);
      const slotKeys = getPageBlockEditorSlotKeys(block);
      const blockSelected = isSamePageBlockPath(blockPath, selectedBlockPath);
      return (
        <div key={block.id} className="space-y-1">
          <button
            type="button"
            className={`flex w-full items-center justify-between rounded px-2 py-1.5 text-left text-xs ${
              blockSelected ? "bg-primary/10 text-primary" : "hover:bg-muted"
            }`}
            data-page-editor-layer-block-id={block.id}
            data-page-editor-layer-block-path={serializedPath}
            data-page-editor-responsive-target={
              hasAnyResponsiveOverride(device, readBlockBreakpointOverride(block, device))
                ? "override"
                : "inherited"
            }
            onClick={() => onSelectBlock(blockPath)}
          >
            <span className="truncate">{getBlockDisplayLabel(block)}</span>
            <span className="ml-2 shrink-0 uppercase text-muted-foreground">
              {hasAnyResponsiveOverride(device, readBlockBreakpointOverride(block, device))
                ? `${device} `
                : ""}
              {block.type}
            </span>
          </button>
          {slotKeys.length > 0 ? (
            <div className="space-y-1 border-l pl-3">
              {slotKeys.map((childSlotKey) => {
                const children = block.slots?.[childSlotKey] ?? [];
                const target: PageBlockInsertTarget = {
                  listPath: { ownerPath: blockPath, slotKey: childSlotKey },
                  index: children.length,
                };
                const listResult = getPageBlockListAtPath(section, target.listPath);
                const canAdd =
                  listResult.status === "ok" &&
                  blockPath.length + 1 <= PAGE_BLOCK_MAX_TREE_DEPTH &&
                  listResult.blocks.length < PAGE_BLOCK_MAX_CHILDREN_PER_SLOT;
                const selectedBlockForMove = selectedBlockPath
                  ? getPageBlockAtPath(section, selectedBlockPath)
                  : null;
                const canMove =
                  selectedBlockPath !== null &&
                  selectedBlockForMove !== null &&
                  canAdd &&
                  getPageBlockInsertTargetStatus(section, target, selectedBlockForMove) === "ok" &&
                  !isSamePageBlockPath(selectedBlockPath, blockPath) &&
                  !(selectedBlockPath && isPageBlockPathDescendant(blockPath, selectedBlockPath));
                const slotLabel = formatSlotLabel(childSlotKey);
                return (
                  <div
                    key={`${serializedPath}:${childSlotKey}`}
                    className="space-y-1"
                    data-page-editor-layer-slot-key={childSlotKey}
                    data-page-editor-layer-slot-owner-path={serializedPath}
                  >
                    <div className="flex items-center justify-between gap-2 rounded bg-muted/60 px-2 py-1 text-[11px] uppercase text-muted-foreground">
                      <span>{slotLabel}</span>
                      <span className="flex items-center gap-1">
                        <Button
                          type="button"
                          variant="ghost"
                          size="xs"
                          title={`Add block to ${slotLabel}`}
                          aria-label={`Add block to ${slotLabel}`}
                          disabled={!canAdd}
                          onClick={() => onAddToTarget(target)}
                        >
                          Add
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          size="xs"
                          title={`Move selected block to ${slotLabel}`}
                          aria-label={`Move selected block to ${slotLabel}`}
                          disabled={!canMove}
                          onClick={() => onMoveToTarget(target)}
                        >
                          Move here
                        </Button>
                      </span>
                    </div>
                    {children.length > 0 ? (
                      <LayerBlockRows
                        section={section}
                        blocks={children}
                        ownerPath={blockPath}
                        slotKey={childSlotKey}
                        selectedBlockPath={selectedBlockPath}
                        device={device}
                        onSelectBlock={onSelectBlock}
                        onAddToTarget={onAddToTarget}
                        onMoveToTarget={onMoveToTarget}
                      />
                    ) : (
                      <p className="px-2 py-1 text-[11px] text-muted-foreground">Empty</p>
                    )}
                  </div>
                );
              })}
            </div>
          ) : null}
        </div>
      );
    })}
  </div>
);

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
  const [page, setPage] = useState<PageDetail | null>(initialPageDetail ?? null);
  const [pageDocument, setPageDocument] = useState<PageDocumentV2>(() =>
    normalizePageData(initialPageDetail?.currentData)
  );
  const [selectedSectionId, setSelectedSectionId] = useState<string | null>(
    () => pageDocument.sections[0]?.id ?? null
  );
  const [selectedBlockPath, setSelectedBlockPath] = useState<PageBlockPath | null>(null);
  const [inlineEditTarget, setInlineEditTarget] = useState<PageEditorInlineEditTarget | null>(null);
  const [device, setDevice] = useState<PageBreakpoint>("desktop");
  const canvasSiteTokenVariables = useCanvasSiteTokenVariables();
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [isLoading, setIsLoading] = useState(!initialPageDetail && Boolean(pageId));
  const [isSaving, setIsSaving] = useState(false);
  const [isPublishing, setIsPublishing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [autosaveError, setAutosaveError] = useState<string | null>(null);
  const [commandOpen, setCommandOpen] = useState(false);
  const [commandQuery, setCommandQuery] = useState("");
  const [commandActiveIndex, setCommandActiveIndex] = useState(0);
  const [pendingBlockInsertTarget, setPendingBlockInsertTarget] =
    useState<PageBlockInsertTarget | null>(null);
  // Gap index pre-targeted by the inline per-gap "+" zones: a chosen section
  // is spliced at this index instead of being appended.
  const [pendingSectionInsertIndex, setPendingSectionInsertIndex] = useState<number | null>(null);
  const [layersOpen, setLayersOpen] = useState(false);
  const [activePanel, setActivePanel] = useState<ToolbarPanel | null>("content");
  const [toolbarCollapsed, setToolbarCollapsed] = useState(false);
  const [toolbarDragging, setToolbarDragging] = useState(false);
  const [toolbarOffset, setToolbarOffset] = useState({ x: 0, y: 0 });
  const toolbarDragRef = useRef({ startX: 0, startY: 0, baseX: 0, baseY: 0 });
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

  const selectedSection =
    pageDocument.sections.find((section) => section.id === selectedSectionId) ?? null;
  const resolvedSelectedSection = selectedSection
    ? resolvePageSectionForBreakpoint(selectedSection, device)
    : null;
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
  // Typography is a block-only panel: it surfaces only for selected
  // typography-capable blocks, never for section selections (the owner
  // contract has no consolidated all-section-texts surface).
  const typographyPanelAvailable = Boolean(
    selectedBlockId &&
    resolvedSelectedBlock &&
    isPageTypographyCapableBlockType(resolvedSelectedBlock.type)
  );
  const visibleToolbarPanelOptions = typographyPanelAvailable
    ? toolbarPanelOptions
    : toolbarPanelOptions.filter((option) => option.panel !== "typography");
  const activeToolbarPanel =
    activePanel === "typography" && !typographyPanelAvailable ? null : activePanel;

  const filteredSections = useMemo(() => {
    const query = commandQuery.trim().toLowerCase();
    return query
      ? sectionOptions.filter((option) =>
          `${option.label} ${option.description}`.toLowerCase().includes(query)
        )
      : sectionOptions;
  }, [commandQuery]);
  const filteredBlocks = useMemo(() => {
    const query = commandQuery.trim().toLowerCase();
    return query
      ? blockOptions.filter((option) =>
          `${option.label} ${option.description}`.toLowerCase().includes(query)
        )
      : blockOptions;
  }, [commandQuery]);
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
    setPendingBlockInsertTarget(null);
    setPendingSectionInsertIndex(null);
    setCommandOpen(true);
    setCommandQuery("");
    setCommandActiveIndex(0);
  }, []);

  const openCommandPaletteForTarget = useCallback((target: PageBlockInsertTarget) => {
    setPendingBlockInsertTarget(target);
    setPendingSectionInsertIndex(null);
    setCommandOpen(true);
    setCommandQuery("");
    setCommandActiveIndex(0);
  }, []);

  // Opens the existing command palette pre-targeted at a canvas gap so the
  // chosen section lands at that gap instead of being appended.
  const openCommandPaletteAtGap = useCallback((gapIndex: number) => {
    setPendingBlockInsertTarget(null);
    setPendingSectionInsertIndex(gapIndex);
    setCommandOpen(true);
    setCommandQuery("");
    setCommandActiveIndex(0);
  }, []);

  const setDocumentDraft = useCallback((updater: (current: PageDocumentV2) => PageDocumentV2) => {
    setPageDocument((current) => updater(cloneDocument(current)));
    setHasUnsavedChanges(true);
  }, []);

  const selectSection = useCallback((sectionId: string | null) => {
    setSelectedSectionId(sectionId);
    setSelectedBlockPath(null);
  }, []);

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
      updateSelectedSection((section) => {
        if (device === "desktop") {
          return { ...section, [key]: { ...section[key], ...patch } };
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
                ...patch,
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
      updateSelectedSection((section) =>
        patchSectionControlForDevice(section, device, control, value)
      );
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
      setPendingBlockInsertTarget(null);
      setPendingSectionInsertIndex(null);
    },
    [pendingSectionInsertIndex, selectSection, setDocumentDraft]
  );

  const addBlock = useCallback(
    (type: PageBlockType) => {
      const block = createPageBlockV2(type);
      if (!selectedSectionId) {
        const section = createPageSectionV2("content", { blocks: [block] });
        setDocumentDraft((current) => ({ ...current, sections: [...current.sections, section] }));
        selectBlock(section.id, [{ index: 0 }]);
        setCommandOpen(false);
        setCommandQuery("");
        setCommandActiveIndex(0);
        setPendingBlockInsertTarget(null);
        setPendingSectionInsertIndex(null);
        return;
      }
      if (!selectedSection) return;
      const target =
        pendingBlockInsertTarget ??
        getDefaultPageBlockInsertTarget(selectedSection, selectedBlockPath);
      const result = insertPageBlockAtTarget(selectedSection, target, block);
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
      setPendingBlockInsertTarget(null);
      setPendingSectionInsertIndex(null);
    },
    [
      pendingBlockInsertTarget,
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
      setPendingBlockInsertTarget(null);
      setPendingSectionInsertIndex(null);
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

  const moveSelectedBlock = useCallback(
    (direction: -1 | 1) => {
      if (!selectedSectionId || !selectedSection || !selectedBlockPath) return;
      const target = getPageBlockSiblingMoveTarget(selectedBlockPath, direction);
      if (!target) return;
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
          setPendingBlockInsertTarget(null);
          setPendingSectionInsertIndex(null);
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
    deleteSelectionTarget,
    device,
    duplicateSelectedBlock,
    duplicateSelectedSection,
    layersOpen,
    openCommandPalette,
    previewOpen,
    requestDeleteSelection,
    revisionsOpen,
    selectSection,
    selectedBlock,
    selectedBlockPath,
    selectedSection,
    selectedSectionId,
    settingsOpen,
  ]);

  useEffect(() => {
    if (!pageId || initialPageDetail) return;
    let cancelled = false;
    const load = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const loaded = await editorHost.loadDetail(pageId);
        if (cancelled) return;
        setPage(loaded);
        const document = normalizePageData(loaded?.currentData);
        setPageDocument(document);
        selectSection(document.sections[0]?.id ?? null);
        setSettingsTitle(loaded?.title ?? "Homepage");
        setSettingsSlug(loaded?.slug ?? "/");
        setShowInNav(document.settings.showInNav);
        setRevisionRetention(
          normalizePageRevisionRetentionValue(document.settings.revisionRetention)
        );
      } catch (loadError) {
        if (!cancelled) setError(resolveInlineError(loadError, editorHost.loadFailedMessage));
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    };
    void load();
    return () => {
      cancelled = true;
    };
  }, [editorHost, initialPageDetail, pageId, selectSection]);

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
      if (page && !isNewerPageDetailTimestamp(cached.updatedAt, page.updatedAt)) return;
      const cachedDocument = normalizePageData(cached.currentData);
      setPage(cached);
      setPageDocument(cachedDocument);
      selectSection(cachedDocument.sections[0]?.id ?? null);
    });
  }, [editorHost, hasUnsavedChanges, page, pageId, selectSection]);

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
    setPage(updated);
    setPageDocument(normalizePageData(updated.currentData));
    setHasUnsavedChanges(false);
    setAutosaveError(null);
    return updated;
  }, [editorHost, page, pageDocument]);

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
    try {
      await editorHost.publish(page.id, pageDocument);
      setPage({ ...page, status: "published" });
      setHasUnsavedChanges(false);
      pageEditorActionToasts.success("publish");
    } catch (publishError) {
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
      setPage(updated);
      setPageDocument(normalizePageData(updated.currentData));
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
        const restoredDocument = normalizePageData(result.page.currentData);
        setPage(result.page);
        setPageDocument(restoredDocument);
        selectSection(restoredDocument.sections[0]?.id ?? null);
        setHasUnsavedChanges(false);
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

  const handlePreview = async () => {
    if (!page) return;
    setPreviewLoading(true);
    setPreviewError(null);
    try {
      const previewPageId = hasUnsavedChanges ? (await saveCurrentDraft())?.id : page.id;
      if (!previewPageId) return;
      const response = await editorHost.preview(previewPageId);
      setPreviewUrl(response.previewUrl);
      setPreviewProbe(response.probe ?? null);
      setPreviewOpen(true);
    } catch (previewErrorValue) {
      setPreviewError(resolveInlineError(previewErrorValue, "Failed to generate preview."));
    } finally {
      setPreviewLoading(false);
    }
  };

  const topbarActions = (
    <div className="flex items-center gap-2">
      <DeviceSwitcher value={device} onChange={setDevice} />
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
          <span className={pageEditorStatusBadgeClassName(page?.status ?? "draft")}>
            {page?.status ?? "draft"}
          </span>
          {hasUnsavedChanges ? (
            <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-semibold uppercase text-amber-800">
              Unsaved
            </span>
          ) : null}
        </div>
      }
      topbarActions={topbarActions}
      centerScroll={false}
      contentClassName="h-full"
    >
      <div className="relative flex h-full min-h-0 flex-col bg-[radial-gradient(circle_at_1px_1px,rgba(15,23,42,0.12)_1px,transparent_0)] [background-size:24px_24px]">
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

        <div
          className="flex items-center justify-center border-b bg-background/80 px-4 py-2 text-[11px] font-semibold uppercase text-muted-foreground"
          data-page-editor-canvas-context={device}
        >
          {device === "desktop"
            ? `${deviceScopeReadout("desktop")} · base view`
            : `${deviceScopeReadout(device)} · override context`}
        </div>

        <div
          className="min-h-0 flex-1 overflow-auto overscroll-contain p-6"
          data-page-editor-canvas-scroller="true"
          onClick={() => selectSection(null)}
        >
          <div
            className={`mx-auto min-h-full w-full rounded bg-white p-4 shadow-sm transition-all ${canvasDeviceFrameClassMap[device]}`}
            // Site typography token variables (not the admin-theme ones) so
            // canvas `var(--text-*)`/`var(--font-*)` paints match the front.
            style={canvasSiteTokenVariables}
            data-page-editor-canvas-frame="true"
            data-page-editor-canvas-device={device}
          >
            {isLoading ? (
              <div className="p-16 text-center text-sm text-muted-foreground">Loading page...</div>
            ) : pageDocument.sections.length === 0 ? (
              <div className="p-16 text-center">
                <p className="text-sm text-muted-foreground">This page has no sections yet.</p>
                <Button type="button" className="mt-4" onClick={openCommandPalette}>
                  <Plus className="h-4 w-4" />
                  Add section
                </Button>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="flex justify-center">
                  <Button type="button" variant="outline" size="sm" onClick={openCommandPalette}>
                    <Plus className="h-4 w-4" />
                    Add section
                  </Button>
                </div>
                {pageDocument.sections.map((section, sectionIndex) => (
                  <Fragment key={section.id}>
                    <SectionGapInsertZone index={sectionIndex} onInsert={openCommandPaletteAtGap} />
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
                      onSelect={() => selectSection(section.id)}
                      onSelectBlock={(blockPath) => selectBlock(section.id, blockPath)}
                      onAddBlock={openCommandPalette}
                      onStartInlineEdit={startInlineEdit}
                      onCommitInlineEdit={commitInlineEdit}
                    />
                  </Fragment>
                ))}
                <SectionGapInsertZone
                  index={pageDocument.sections.length}
                  onInsert={openCommandPaletteAtGap}
                />
              </div>
            )}
          </div>
        </div>

        {layersOpen ? (
          <div className="absolute left-4 top-16 z-20 w-72 rounded border bg-background p-3 shadow-lg">
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
                      device={device}
                      onSelectBlock={(blockPath) => selectBlock(section.id, blockPath)}
                      onAddToTarget={openCommandPaletteForTarget}
                      onMoveToTarget={moveSelectedBlockToTarget}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : null}

        {selectedSection && resolvedSelectedSection ? (
          <div
            className="absolute bottom-6 left-1/2 z-30 w-[min(760px,calc(100%-2rem))] rounded-xl bg-slate-950 p-2 text-white shadow-2xl"
            style={{
              transform: `translateX(calc(-50% + ${toolbarOffset.x}px)) translateY(${toolbarOffset.y}px)`,
            }}
            aria-label={`${toolbarTargetLabel} tools`}
            data-page-editor-floating-toolbar="true"
            data-page-editor-toolbar-collapsed={toolbarCollapsed ? "true" : "false"}
            data-page-editor-toolbar-dragging={toolbarDragging ? "true" : "false"}
          >
            <div className="flex flex-wrap items-center gap-2">
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
              {!toolbarCollapsed
                ? visibleToolbarPanelOptions.map(({ panel, label, description, Icon }) => (
                    <ToolbarIconButton
                      key={panel}
                      tooltip={{ label: `${label} panel`, description }}
                      active={activeToolbarPanel === panel}
                      expanded={activeToolbarPanel === panel}
                      panelId={panel}
                      onClick={() =>
                        setActivePanel((current) => (current === panel ? null : panel))
                      }
                    >
                      <Icon className="h-4 w-4" />
                    </ToolbarIconButton>
                  ))
                : null}
              {!toolbarCollapsed ? (
                <>
                  <ToolbarIconButton
                    tooltip={
                      selectedBlock
                        ? toolbarActionTooltips.moveBlockUp
                        : toolbarActionTooltips.moveSectionUp
                    }
                    onClick={() =>
                      selectedBlock ? moveSelectedBlock(-1) : moveSelectedSection(-1)
                    }
                  >
                    <ArrowUp className="h-4 w-4" />
                  </ToolbarIconButton>
                  <ToolbarIconButton
                    tooltip={
                      selectedBlock
                        ? toolbarActionTooltips.moveBlockDown
                        : toolbarActionTooltips.moveSectionDown
                    }
                    onClick={() => (selectedBlock ? moveSelectedBlock(1) : moveSelectedSection(1))}
                  >
                    <ArrowDown className="h-4 w-4" />
                  </ToolbarIconButton>
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
            {!toolbarCollapsed && activeToolbarPanel ? (
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
            ) : null}
          </div>
        ) : null}

        {commandOpen ? (
          <div
            className="absolute inset-0 z-40 flex items-start justify-center overflow-hidden bg-background/50 p-4 backdrop-blur-sm sm:p-6"
            role="dialog"
            aria-label="Command palette"
          >
            <div
              className="flex max-h-[calc(100dvh_-_8rem)] min-h-0 w-full max-w-xl flex-col overflow-hidden rounded-xl border bg-background p-4 shadow-2xl sm:max-h-[calc(100dvh_-_9rem)]"
              data-page-editor-command-dialog="viewport-safe"
            >
              <div className="flex shrink-0 items-center gap-2 rounded border px-3 py-2">
                <Search className="h-4 w-4 text-muted-foreground" />
                <input
                  className="w-full bg-transparent text-sm outline-none"
                  value={commandQuery}
                  onChange={(event) => handleCommandQueryChange(event.target.value)}
                  onKeyDown={handleCommandKeyDown}
                  placeholder="Search sections and blocks"
                  aria-label="Search sections and blocks"
                  aria-controls="page-editor-command-results"
                  autoFocus
                />
              </div>
              <div
                id="page-editor-command-results"
                className="mt-4 min-h-0 flex-1 overflow-y-auto overscroll-contain pr-1"
                data-page-editor-command-results-scroll="true"
              >
                <div className="grid gap-4 md:grid-cols-2">
                  <CommandGroup title="Sections">
                    {filteredSections.map((option, index) => (
                      <CommandButton
                        key={option.type}
                        label={option.label}
                        description={option.description}
                        active={commandActiveIndex === index}
                        onClick={() => addSection(option.type)}
                      />
                    ))}
                  </CommandGroup>
                  <CommandGroup title="Blocks">
                    {filteredBlocks.map((option, index) => {
                      const resultIndex = filteredSections.length + index;
                      return (
                        <CommandButton
                          key={option.type}
                          label={option.label}
                          description={option.description}
                          active={commandActiveIndex === resultIndex}
                          onClick={() => addBlock(option.type)}
                        />
                      );
                    })}
                  </CommandGroup>
                  {editorHost.templateLibrary && filteredTemplates.length > 0 ? (
                    <CommandGroup title="Page templates">
                      {filteredTemplates.map((option, index) => {
                        const resultIndex = filteredSections.length + filteredBlocks.length + index;
                        return (
                          <CommandButton
                            key={option.id}
                            label={option.name}
                            description={option.description ?? "Insert template sections"}
                            active={commandActiveIndex === resultIndex}
                            onClick={() => void insertTemplate(option.id)}
                          />
                        );
                      })}
                    </CommandGroup>
                  ) : null}
                </div>
              </div>
              <div className="mt-4 flex shrink-0 justify-end">
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => {
                    setCommandOpen(false);
                    setCommandActiveIndex(0);
                    setPendingBlockInsertTarget(null);
                    setPendingSectionInsertIndex(null);
                  }}
                >
                  Close
                </Button>
              </div>
            </div>
          </div>
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
      </div>
    </EditorShell>
  );
}

const CommandGroup = ({ title, children }: { title: string; children: ReactNode }) => (
  <div>
    <p className="mb-2 text-xs font-semibold uppercase text-muted-foreground">{title}</p>
    <div className="space-y-2">{children}</div>
  </div>
);

const CommandButton = ({
  label,
  description,
  active,
  onClick,
}: {
  label: string;
  description: string;
  active?: boolean;
  onClick: () => void;
}) => (
  <button
    type="button"
    className={`w-full rounded border p-3 text-left hover:bg-muted ${
      active ? "border-primary bg-primary/10" : ""
    }`}
    aria-current={active ? "true" : undefined}
    data-page-editor-command-active={active ? "true" : "false"}
    onClick={onClick}
  >
    <span className="block text-sm font-semibold">{label}</span>
    <span className="mt-1 block text-xs text-muted-foreground">{description}</span>
  </button>
);

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
  panel: ToolbarPanel;
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
        (control) => control.panel === panel
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
                <Button type="button" variant="outline" onClick={onAddBlock}>
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
              <Button type="button" variant="outline" onClick={onAddBlock}>
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
 * comes from the registry-owned responsive panel contract; widgets render
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

/**
 * Icon button for the dark floating toolbar. The accessible name and the
 * hover description both come from toolbar panel/action metadata and render
 * through the shared tooltip component instead of native `title` strings.
 */
const ToolbarIconButton = ({
  tooltip,
  active = false,
  expanded,
  panelId,
  onClick,
  onPointerDown,
  children,
}: {
  tooltip: ToolbarActionTooltip;
  active?: boolean;
  expanded?: boolean;
  panelId?: ToolbarPanel;
  onClick?: () => void;
  onPointerDown?: (event: ReactPointerEvent<HTMLButtonElement>) => void;
  children: ReactNode;
}) => (
  <Tooltip>
    <TooltipTrigger asChild>
      <button
        type="button"
        aria-label={tooltip.label}
        aria-expanded={expanded}
        data-page-editor-toolbar-icon={panelId}
        className={`inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-md transition-colors ${editorControlFocusClass} ${
          active ? "bg-white/15 text-white" : "text-slate-300 hover:bg-white/10 hover:text-white"
        }`}
        onClick={onClick}
        onPointerDown={onPointerDown}
      >
        {children}
      </button>
    </TooltipTrigger>
    <TooltipContent side="top" sideOffset={8} className="max-w-[240px]">
      <p className="text-xs font-semibold">{tooltip.label}</p>
      <p className="text-xs opacity-80">{tooltip.description}</p>
    </TooltipContent>
  </Tooltip>
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
      <RegistryControlWidget
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
  return (
    <ResponsiveControlShell
      device={device}
      override={override}
      label={control.label}
      onReset={() => onReset(control.overridePath)}
    >
      <RegistryControlWidget
        control={control}
        rawValue={value}
        commitActiveOption={device !== "desktop" && !override}
        onCommit={(nextValue) => onChange(control, nextValue)}
      />
    </ResponsiveControlShell>
  );
};

/** Mime accept hints for registry media controls, keyed by control id. */
const mediaControlAccept: Record<string, readonly string[]> = {
  "block.image.props.src": ["image/*"],
  "block.video.props.src": ["video/*"],
  "block.card.props.image": ["image/*"],
};

/**
 * Maps a registry control through the pure UI-model adapter onto the dedicated
 * floating-inspector primitives. Stored value shapes are preserved: segmented
 * and select emit the stored option token, toggles emit booleans, sliders emit
 * clamped numbers, swatches emit color strings, and media emits the resolved
 * library URL (or null). Raw text inputs remain only for free-form strings.
 */
const RegistryControlWidget = ({
  control,
  rawValue,
  commitActiveOption = false,
  onCommit,
}: {
  control: PageEditorControlDefinition;
  rawValue: unknown;
  /**
   * Tablet/mobile fields without an override yet set this so an explicit
   * click on the inherited segmented value still commits — pinning it as a
   * breakpoint override instead of silently no-opping.
   */
  commitActiveOption?: boolean;
  onCommit: (value: unknown) => void;
}) => {
  const model = resolvePageEditorControlUiModel(control);
  const fieldValue = fieldValueFromControlValue(control, rawValue);
  switch (model.kind) {
    case "segmented":
      return (
        <SegmentedControl
          label={control.label}
          value={fieldValue}
          options={model.options}
          optionLabels={model.labels}
          commitActiveOption={commitActiveOption}
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
    case "toggle":
      return (
        <ToggleSwitch
          label={control.label}
          value={rawValue === true}
          onChange={(nextValue) => onCommit(nextValue)}
        />
      );
    case "slider":
    case "sliderStepper": {
      const parsed = Number(fieldValue);
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
          <Button type="button" variant="ghost" size="sm" onClick={() => onChange(null)}>
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
