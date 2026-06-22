import type { LucideIcon } from "lucide-react";
import {
  Baseline,
  Brush,
  Eye,
  LayoutPanelTop,
  ListPlus,
  MonitorSmartphone,
  PaintBucket,
  Type,
} from "lucide-react";

import {
  pageBlockCapabilities,
  pageBlockTypes,
  pageSectionCapabilities,
  pageSectionTypes,
  type PageBlockType,
  type PageBreakpoint,
  type PageSectionType,
} from "../../../../services/pages/pageDocumentV2";
import { pageEditorDeviceMetadata } from "../../../../services/pages/pageEditorControlRegistry";

export type ToolbarPanel =
  | "layout"
  | "content"
  | "typography"
  | "style"
  | "spacing"
  | "background"
  | "responsive"
  | "visibility"
  /** Host-owned appearance panel slot (only offered when the host provides one). */
  | "host-appearance";

export type SectionOption = {
  type: PageSectionType;
  label: string;
  description: string;
};

export type BlockOption = {
  type: PageBlockType;
  label: string;
  description: string;
};

export type ToolbarPanelOption = {
  panel: ToolbarPanel;
  label: string;
  /** Hover tooltip description for the panel category icon. */
  description: string;
  Icon: LucideIcon;
};

export type ToolbarActionTooltip = {
  label: string;
  description: string;
};

export const sectionOptionCopy: Record<PageSectionType, Omit<SectionOption, "type">> = {
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

export const sectionOptions: SectionOption[] = pageSectionTypes.flatMap((type) =>
  pageSectionCapabilities[type].insertable ? [{ type, ...sectionOptionCopy[type] }] : []
);

export const blockOptionCopy: Record<PageBlockType, Omit<BlockOption, "type">> = {
  heading: { label: "Heading", description: "Section title or subheading." },
  text: { label: "Text", description: "Paragraph copy." },
  badge: { label: "Badge", description: "Compact label or status pill." },
  button: { label: "Button", description: "Clickable call to action." },
  image: { label: "Image", description: "Image from media or URL." },
  video: { label: "Video", description: "Embedded video from media or URL." },
  gallery: { label: "Gallery", description: "Visual collection block." },
  form: { label: "Form", description: "Configured form embed." },
  list: { label: "List", description: "Bulleted or numbered points." },
  card: { label: "Card", description: "Compact title and body block." },
  collection: { label: "Collection", description: "Data-bound listing block." },
  filters: { label: "Filters", description: "Visitor facet filters for a bound listing." },
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

export const blockOptions: BlockOption[] = pageBlockTypes.flatMap((type) =>
  pageBlockCapabilities[type].editorInsertable ? [{ type, ...blockOptionCopy[type] }] : []
);

export const toolbarPanelOptions: ToolbarPanelOption[] = [
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
export const toolbarActionTooltips = {
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
  moveBlockUpRow: {
    label: "Move block up",
    description: "Move the selected block one grid row earlier.",
  },
  moveBlockDownRow: {
    label: "Move block down",
    description: "Move the selected block one grid row later.",
  },
  moveBlockUpColumn: {
    label: "Move block up",
    description: "Move the selected block one position earlier in its column.",
  },
  moveBlockDownColumn: {
    label: "Move block down",
    description: "Move the selected block one position later in its column.",
  },
  moveBlockLeft: {
    label: "Move block left",
    description: "Move the selected block one position left in its row.",
  },
  moveBlockRight: {
    label: "Move block right",
    description: "Move the selected block one position right in its row.",
  },
  moveBlockLeftColumn: {
    label: "Move block left",
    description: "Move the selected block into the previous column.",
  },
  moveBlockRightColumn: {
    label: "Move block right",
    description: "Move the selected block into the next column.",
  },
  addBlockBeside: {
    label: "Add block beside",
    description: "Insert a new block next to the selected block in a row.",
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
export const canvasDeviceFrameClassMap: Record<PageBreakpoint, string> = {
  desktop: "max-w-[1080px]",
  tablet: "max-w-[744px]",
  mobile: "max-w-[390px]",
};

/** "Tablet · 744px" readout used by the scope pill and the canvas context bar. */
export const deviceScopeReadout = (device: PageBreakpoint) =>
  `${pageEditorDeviceMetadata[device].label} · ${pageEditorDeviceMetadata[device].width}px`;

export const pageEditorStatusBadgeClassName = (status: string) =>
  status === "published"
    ? "rounded-full border border-emerald-500/20 bg-emerald-500/10 px-2 py-0.5 text-[10px] font-semibold uppercase text-emerald-600"
    : "rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-semibold uppercase text-amber-800";

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
