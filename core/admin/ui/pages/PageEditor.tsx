import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type {
  KeyboardEvent as ReactKeyboardEvent,
  PointerEvent as ReactPointerEvent,
  ReactNode,
} from "react";
import {
  ArrowDown,
  ArrowUp,
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
import { isApiClientError, isSessionExpiredApiError } from "@/services/apiClient";
import { cacheKeys } from "@/services/cachePolicy";
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
  getPageSectionVariantControl,
  isPageSectionVariantOption,
  getPageEditorControlsForTarget,
  pageUniversalSectionControls,
  type PageEditorControlDefinition,
} from "../../../services/pages/pageEditorControlRegistry";
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
import { getPageSectionFallbackVariant } from "../../../services/pages/pageSectionTemplates";
import { joinPageRenderClasses, PageSectionContent } from "../../../services/pages/pageRendererV2";
import { normalizePageRevisionRetentionValue } from "../../../services/pages/revisionRetention";
import {
  resolveAssistantPageSelection,
  summarizePageSectionsForAssistant,
} from "../../../services/assistant/pageActiveSurfaceSummary";
import { DeviceSwitcher } from "./DeviceSwitcher";

export type PageEditorProps = {
  pageId?: string;
  initialPage?: PageDetail | null;
};

type ToolbarPanel =
  | "layout"
  | "content"
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
  Icon: LucideIcon;
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
  { panel: "layout", label: "Layout", Icon: LayoutPanelTop },
  { panel: "content", label: "Content", Icon: Type },
  { panel: "style", label: "Style", Icon: Brush },
  { panel: "background", label: "Background", Icon: PaintBucket },
  { panel: "spacing", label: "Spacing", Icon: ListPlus },
  { panel: "responsive", label: "Responsive", Icon: MonitorSmartphone },
  { panel: "visibility", label: "Visibility", Icon: Eye },
];

const canvasDeviceFrameClassMap: Record<PageBreakpoint, string> = {
  desktop: "max-w-[1080px]",
  tablet: "max-w-[744px]",
  mobile: "max-w-[390px]",
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

const SectionCanvas = ({
  section,
  baseSection,
  selected,
  selectedBlockPath,
  device,
  onSelect,
  onSelectBlock,
  onAddBlock,
}: {
  section: PageSectionV2;
  baseSection: PageSectionV2;
  selected: boolean;
  selectedBlockPath: PageBlockPath | null;
  device: PageBreakpoint;
  onSelect: () => void;
  onSelectBlock: (blockPath: PageBlockPath) => void;
  onAddBlock: () => void;
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
  const [pageDocument, setPageDocument] = useState<PageDocumentV2>(() =>
    normalizePageData(initialPageDetail?.currentData)
  );
  const [selectedSectionId, setSelectedSectionId] = useState<string | null>(
    () => pageDocument.sections[0]?.id ?? null
  );
  const [selectedBlockPath, setSelectedBlockPath] = useState<PageBlockPath | null>(null);
  const [device, setDevice] = useState<PageBreakpoint>("desktop");
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
  const [layersOpen, setLayersOpen] = useState(false);
  const [activePanel, setActivePanel] = useState<ToolbarPanel>("content");
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
  const toolbarSelectionLabel = resolvedSelectedBlock
    ? getBlockDisplayLabel(resolvedSelectedBlock)
    : (selectedSection?.name ?? "Page selection");
  const toolbarSelectionMeta = resolvedSelectedBlock
    ? resolvedSelectedBlock.type
    : (selectedSection?.variant ?? "section");

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
  const commandResultCount = filteredSections.length + filteredBlocks.length;

  const openCommandPalette = useCallback(() => {
    setPendingBlockInsertTarget(null);
    setCommandOpen(true);
    setCommandQuery("");
    setCommandActiveIndex(0);
  }, []);

  const openCommandPaletteForTarget = useCallback((target: PageBlockInsertTarget) => {
    setPendingBlockInsertTarget(target);
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

  const addSection = useCallback(
    (type: PageSectionType) => {
      const section = createStarterSection(type);
      setDocumentDraft((current) => ({ ...current, sections: [...current.sections, section] }));
      selectSection(section.id);
      setCommandOpen(false);
      setCommandQuery("");
      setCommandActiveIndex(0);
      setPendingBlockInsertTarget(null);
    },
    [selectSection, setDocumentDraft]
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

  const runCommandResult = useCallback(
    (index: number) => {
      if (index < filteredSections.length) {
        const sectionOption = filteredSections[index];
        if (sectionOption) addSection(sectionOption.type);
        return;
      }
      const blockOption = filteredBlocks[index - filteredSections.length];
      if (blockOption) addBlock(blockOption.type);
    },
    [addBlock, addSection, filteredBlocks, filteredSections]
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
    duplicateSelectedBlock,
    duplicateSelectedSection,
    layersOpen,
    openCommandPalette,
    previewOpen,
    requestDeleteSelection,
    revisionsOpen,
    selectSection,
    selectedBlock,
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
        const loaded = await getPageCached(pageId);
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
        if (!cancelled) setError(resolveInlineError(loadError, "Failed to load page."));
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    };
    void load();
    return () => {
      cancelled = true;
    };
  }, [initialPageDetail, pageId, selectSection]);

  useEffect(() => {
    if (!page) return;
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
  }, [hasUnsavedChanges, page, pageDocument, selectedBlock, selectedSectionId]);

  useEffect(() => {
    if (!pageId) return undefined;
    return subscribeCacheEvents((event) => {
      if (event.key !== cacheKeys.pageDetail(pageId)) return;
      if (hasUnsavedChanges) return;
      const cached = getCachedPageDetail(pageId);
      if (!cached) return;
      if (page && !isNewerPageDetailTimestamp(cached.updatedAt, page.updatedAt)) return;
      const cachedDocument = normalizePageData(cached.currentData);
      setPage(cached);
      setPageDocument(cachedDocument);
      selectSection(cachedDocument.sections[0]?.id ?? null);
    });
  }, [hasUnsavedChanges, page, pageId, selectSection]);

  useEffect(() => {
    if (!page || !hasUnsavedChanges) return undefined;
    const timeoutId = window.setTimeout(() => {
      void autosavePage(page.id, { data: pageDocument })
        .then(() => setAutosaveError(null))
        .catch((autosaveErrorValue: unknown) => {
          setAutosaveError(
            resolveInlineError(autosaveErrorValue, "Autosave failed. Try saving manually.")
          );
        });
    }, 1500);
    return () => window.clearTimeout(timeoutId);
  }, [hasUnsavedChanges, page, pageDocument]);

  const saveCurrentDraft = useCallback(async () => {
    if (!page) return null;
    const updated = await updatePage(page.id, { data: pageDocument });
    setPage(updated);
    setPageDocument(normalizePageData(updated.currentData));
    setHasUnsavedChanges(false);
    setAutosaveError(null);
    return updated;
  }, [page, pageDocument]);

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
    if (!page) return;
    setIsPublishing(true);
    setError(null);
    try {
      await publishPage(page.id, pageDocument);
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

  const openRevisions = async () => {
    if (!page) return;
    setRevisionsOpen(true);
    setRevisionsLoading(true);
    setRevisionsError(null);
    try {
      setRevisions(await listPageRevisions(page.id));
    } catch (revisionError) {
      setRevisionsError(resolveInlineError(revisionError, "Failed to load page history."));
    } finally {
      setRevisionsLoading(false);
    }
  };

  const restoreRevision = async (revisionId: string) => {
    if (!page) return;
    setRestoringRevisionId(revisionId);
    try {
      const result = await restorePageRevision(page.id, revisionId);
      if (result.page) {
        const restoredDocument = normalizePageData(result.page.currentData);
        setPage(result.page);
        setPageDocument(restoredDocument);
        selectSection(restoredDocument.sections[0]?.id ?? null);
        setHasUnsavedChanges(false);
      }
      setRevisions(await listPageRevisions(page.id));
    } catch (restoreError) {
      setRevisionsError(resolveInlineError(restoreError, "Failed to restore revision."));
    } finally {
      setRestoringRevisionId(null);
    }
  };

  const discardRevision = async (revisionId: string) => {
    if (!page) return;
    setDiscardingRevisionId(revisionId);
    try {
      await discardPageRevision(page.id, revisionId);
      setRevisions(await listPageRevisions(page.id));
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
      const response = await previewPage(previewPageId, { ttlMinutes: 15, probe: true });
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
        Page settings
      </Button>
      <Button type="button" variant="ghost" size="sm" onClick={openRevisions}>
        <History className="h-4 w-4" />
        History
      </Button>
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
      <Button type="button" size="sm" disabled={isPublishing || !page} onClick={handlePublish}>
        {isPublishing ? "Publishing..." : "Publish"}
      </Button>
    </div>
  );

  return (
    <EditorShell
      breadcrumbs={
        <div className="flex items-center gap-3">
          <span className="text-sm text-muted-foreground">Pages</span>
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

        <div className="flex items-center justify-center border-b bg-background/80 px-4 py-2 text-[11px] font-semibold uppercase text-muted-foreground">
          {device === "desktop" ? "Desktop · 1080px · base view" : `${device} · override context`}
        </div>

        <div
          className="min-h-0 flex-1 overflow-auto overscroll-contain p-6"
          data-page-editor-canvas-scroller="true"
          onClick={() => selectSection(null)}
        >
          <div
            className={`mx-auto min-h-full w-full rounded bg-white p-4 shadow-sm transition-all ${canvasDeviceFrameClassMap[device]}`}
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
                {pageDocument.sections.map((section) => (
                  <SectionCanvas
                    key={section.id}
                    section={resolvePageSectionForBreakpoint(section, device)}
                    baseSection={section}
                    selected={section.id === selectedSectionId}
                    selectedBlockPath={section.id === selectedSectionId ? selectedBlockPath : null}
                    device={device}
                    onSelect={() => selectSection(section.id)}
                    onSelectBlock={(blockPath) => selectBlock(section.id, blockPath)}
                    onAddBlock={openCommandPalette}
                  />
                ))}
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
            aria-label={`${toolbarSelectionLabel} tools`}
            data-page-editor-floating-toolbar="true"
            data-page-editor-toolbar-collapsed={toolbarCollapsed ? "true" : "false"}
            data-page-editor-toolbar-dragging={toolbarDragging ? "true" : "false"}
          >
            <div className="flex flex-wrap items-center gap-2">
              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                title="Drag toolbar"
                aria-label="Drag toolbar"
                onPointerDown={startToolbarDrag}
              >
                <GripVertical className="h-4 w-4" />
              </Button>
              <div className="flex min-w-0 flex-1 items-center gap-2 px-2">
                <PanelTop className="h-4 w-4 text-slate-400" />
                <span className="truncate text-sm font-semibold">{toolbarSelectionLabel}</span>
                <span className="rounded bg-white/10 px-2 py-0.5 text-[10px] font-semibold uppercase">
                  {toolbarSelectionMeta}
                </span>
              </div>
              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                title={toolbarCollapsed ? "Expand toolbar" : "Collapse toolbar"}
                aria-label={toolbarCollapsed ? "Expand toolbar" : "Collapse toolbar"}
                onClick={() => setToolbarCollapsed((collapsed) => !collapsed)}
              >
                {toolbarCollapsed ? (
                  <Maximize2 className="h-4 w-4" />
                ) : (
                  <Minimize2 className="h-4 w-4" />
                )}
              </Button>
              {!toolbarCollapsed
                ? toolbarPanelOptions.map(({ panel, label, Icon }) => (
                    <Button
                      key={panel}
                      type="button"
                      variant={activePanel === panel ? "secondary" : "ghost"}
                      size="icon-sm"
                      title={`${label} panel`}
                      aria-label={`${label} panel`}
                      onClick={() => setActivePanel(panel)}
                    >
                      <Icon className="h-4 w-4" />
                    </Button>
                  ))
                : null}
              {!toolbarCollapsed ? (
                <>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-sm"
                    title={selectedBlock ? "Move block up" : "Move section up"}
                    aria-label={selectedBlock ? "Move block up" : "Move section up"}
                    onClick={() =>
                      selectedBlock ? moveSelectedBlock(-1) : moveSelectedSection(-1)
                    }
                  >
                    <ArrowUp className="h-4 w-4" />
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-sm"
                    title={selectedBlock ? "Move block down" : "Move section down"}
                    aria-label={selectedBlock ? "Move block down" : "Move section down"}
                    onClick={() => (selectedBlock ? moveSelectedBlock(1) : moveSelectedSection(1))}
                  >
                    <ArrowDown className="h-4 w-4" />
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-sm"
                    title={selectedBlock ? "Duplicate block" : "Duplicate section"}
                    aria-label={selectedBlock ? "Duplicate block" : "Duplicate section"}
                    onClick={selectedBlock ? duplicateSelectedBlock : duplicateSelectedSection}
                  >
                    <Copy className="h-4 w-4" />
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-sm"
                    title={selectedBlock ? "Delete block" : "Delete section"}
                    aria-label={selectedBlock ? "Delete block" : "Delete section"}
                    onClick={requestDeleteSelection}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </>
              ) : null}
            </div>
            {!toolbarCollapsed ? (
              <ToolbarSubpanel
                panel={activePanel}
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
                onAddBlock={openCommandPalette}
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

        <RuntimePreviewDialog
          open={previewOpen}
          onOpenChange={setPreviewOpen}
          title="Page preview"
          canPreview={Boolean(previewUrl)}
          previewUrl={previewUrl}
          isLoading={previewLoading}
          error={previewError}
          device={device}
          onDeviceChange={setDevice}
          probeResult={previewProbe}
          iframeTitle="Page runtime preview"
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
  onAddBlock,
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
  onAddBlock: () => void;
}) => {
  const primaryBlock = block ?? (hasBlockSelection ? undefined : section.blocks[0]);
  const primaryBaseBlock = baseBlock ?? (hasBlockSelection ? undefined : baseSection.blocks[0]);
  const blockPanelControls = primaryBlock
    ? getPageEditorControlsForTarget({ kind: "block", type: primaryBlock.type }).filter(
        (control) => control.panel === panel
      )
    : [];
  const sectionPanelControls = pageUniversalSectionControls.filter(
    (control) => control.panel === panel
  );
  const sectionVariantControl =
    panel === "layout" ? getPageSectionVariantControl(section.type) : null;
  const shouldRenderBlockControls =
    Boolean(primaryBlock) && (panel === "content" || (hasBlockSelection && panel !== "responsive"));
  const sectionOverride = readSectionBreakpointOverride(baseSection, device);
  const hasTargetOverride =
    hasAnyResponsiveOverride(device, sectionOverride) ||
    hasAnyResponsiveOverride(device, readBlockBreakpointOverride(primaryBaseBlock, device));
  return (
    <div
      className="mt-2 rounded-lg bg-white p-3 text-slate-950"
      data-page-editor-toolbar-panel={panel}
      role="region"
      aria-label={`${panel} toolbar panel`}
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
            <SupplementalSectionField
              label="Background image"
              value={section.style.backgroundImage ?? ""}
              device={device}
              override={hasResponsiveOverride(device, sectionOverride, [
                "style",
                "backgroundImage",
              ])}
              onReset={() => onClearOverride(["style", "backgroundImage"])}
              onChange={(backgroundImage) =>
                onSectionStyle({ backgroundImage: backgroundImage.trim() || null })
              }
            />
          ) : null}
          {panel === "visibility" ? (
            <>
              <SupplementalSectionField
                label="Anchor"
                value={section.visibility.anchor ?? ""}
                device={device}
                override={hasResponsiveOverride(device, sectionOverride, ["visibility", "anchor"])}
                onReset={() => onClearOverride(["visibility", "anchor"])}
                onChange={(anchor) => onSectionVisibility({ anchor: anchor.trim() || null })}
              />
              <SupplementalSectionField
                label="Starts at"
                value={section.visibility.startsAt ?? ""}
                device={device}
                override={hasResponsiveOverride(device, sectionOverride, [
                  "visibility",
                  "startsAt",
                ])}
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
        </div>
      ) : null}
      {!shouldRenderBlockControls && panel === "content" ? (
        <div className="grid gap-3 sm:grid-cols-[1fr_auto]">
          <p className="flex items-center text-sm text-muted-foreground">
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
        <div className="flex items-center justify-between gap-3">
          <p className="text-sm text-muted-foreground">
            {device === "desktop"
              ? "Desktop is the base cascade."
              : `${device} edits create overrides.`}
          </p>
          <span
            className={`rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase ${
              hasTargetOverride ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground"
            }`}
            data-page-editor-responsive-target-state={hasTargetOverride ? "override" : "inherited"}
          >
            {device === "desktop" ? "base" : hasTargetOverride ? "override" : "inherited"}
          </span>
        </div>
      ) : null}
    </div>
  );
};

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
  const fieldValue = fieldValueFromControlValue(control, value);
  const override = hasResponsiveOverride(
    device,
    readSectionBreakpointOverride(baseSection, device),
    control.overridePath
  );
  const handleChange = (nextValue: string) => {
    onChange(control, coerceControlFieldValue(control, nextValue));
  };

  if (control.input === "number") {
    const parsed = Number(fieldValue);
    return (
      <ResponsiveControlShell
        device={device}
        override={override}
        onReset={() => onReset(control.overridePath)}
      >
        <NumberField
          label={control.label}
          value={Number.isFinite(parsed) ? parsed : (control.clamp?.min ?? 0)}
          min={control.clamp?.min ?? 0}
          max={control.clamp?.max ?? 10_000}
          onChange={(nextValue) =>
            onChange(control, coerceControlFieldValue(control, String(nextValue)))
          }
        />
      </ResponsiveControlShell>
    );
  }

  if (control.input === "select" || control.input === "segmented") {
    return (
      <ResponsiveControlShell
        device={device}
        override={override}
        onReset={() => onReset(control.overridePath)}
      >
        <SelectField
          label={control.label}
          value={fieldValue}
          options={control.options ?? []}
          onChange={handleChange}
        />
      </ResponsiveControlShell>
    );
  }

  if (control.input === "switch") {
    return (
      <ResponsiveControlShell
        device={device}
        override={override}
        onReset={() => onReset(control.overridePath)}
      >
        <SelectField
          label={control.label}
          value={fieldValue}
          options={["yes", "no"]}
          onChange={handleChange}
        />
      </ResponsiveControlShell>
    );
  }

  return (
    <ResponsiveControlShell
      device={device}
      override={override}
      onReset={() => onReset(control.overridePath)}
    >
      <TextField label={control.label} value={fieldValue} onChange={handleChange} />
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
  return (
    <div className="grid gap-1" data-page-editor-section-variant-control="base">
      <SelectField
        label={control.label}
        value={value}
        options={options}
        onChange={(nextValue) => {
          if (isPageSectionVariantOption(section.type, nextValue)) {
            onChange(nextValue);
          }
        }}
      />
      <div className="flex min-h-6 items-center justify-between gap-2">
        <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] font-semibold uppercase text-muted-foreground">
          Base
        </span>
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
  <ResponsiveControlShell device={device} override={override} onReset={onReset}>
    <TextField label={label} value={value} onChange={onChange} />
  </ResponsiveControlShell>
);

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
  const fieldValue = fieldValueFromControlValue(control, value);
  const override = hasResponsiveOverride(
    device,
    readBlockBreakpointOverride(baseBlock, device),
    control.overridePath
  );
  const handleChange = (nextValue: string) => {
    onChange(control, coerceControlFieldValue(control, nextValue));
  };

  if (control.input === "number") {
    const parsed = Number(fieldValue);
    return (
      <ResponsiveControlShell
        device={device}
        override={override}
        onReset={() => onReset(control.overridePath)}
      >
        <NumberField
          label={control.label}
          value={Number.isFinite(parsed) ? parsed : (control.clamp?.min ?? 0)}
          min={control.clamp?.min ?? 0}
          max={control.clamp?.max ?? 10_000}
          onChange={(nextValue) =>
            onChange(control, coerceControlFieldValue(control, String(nextValue)))
          }
        />
      </ResponsiveControlShell>
    );
  }

  if (control.input === "select" || control.input === "segmented") {
    return (
      <ResponsiveControlShell
        device={device}
        override={override}
        onReset={() => onReset(control.overridePath)}
      >
        <SelectField
          label={control.label}
          value={fieldValue}
          options={control.options ?? []}
          onChange={handleChange}
        />
      </ResponsiveControlShell>
    );
  }

  if (control.input === "switch") {
    return (
      <ResponsiveControlShell
        device={device}
        override={override}
        onReset={() => onReset(control.overridePath)}
      >
        <SelectField
          label={control.label}
          value={fieldValue}
          options={["yes", "no"]}
          onChange={handleChange}
        />
      </ResponsiveControlShell>
    );
  }

  return (
    <ResponsiveControlShell
      device={device}
      override={override}
      onReset={() => onReset(control.overridePath)}
    >
      <TextField label={control.label} value={fieldValue} onChange={handleChange} />
    </ResponsiveControlShell>
  );
};

const ResponsiveControlShell = ({
  device,
  override,
  onReset,
  children,
}: {
  device: PageBreakpoint;
  override: boolean;
  onReset: () => void;
  children: ReactNode;
}) => (
  <div
    className="grid gap-1"
    data-page-editor-responsive-field={override ? "override" : "inherited"}
  >
    {children}
    <div className="flex min-h-6 items-center justify-between gap-2">
      <span
        className={`rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase ${
          override ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground"
        }`}
      >
        {device === "desktop" ? "Base" : override ? "Override" : "Inherited"}
      </span>
      {device !== "desktop" && override ? (
        <Button type="button" variant="ghost" size="sm" onClick={onReset}>
          Reset
        </Button>
      ) : null}
    </div>
  </div>
);

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
