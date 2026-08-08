import { sanitizeAuthoringLinkHref } from "./pageAuthoringSanitizers";
import {
  pageBlockTypes,
  pageSectionTypes,
  type PageBlockSlotKey,
  type PageBlockType,
  type PageBlockV2,
  type PageBlockVisibilityV2,
  type PageBreakpoint,
  type PageDocumentSeoV2,
  type PageDocumentSettingsV2,
  type PageSectionLayoutV2,
  type PageSectionSpacingV2,
  type PageSectionStyleV2,
  type PageSectionType,
  type PageSectionVisibilityV2,
} from "./pageDocumentV2Types";

export const pageBoxSpacingKeys = ["top", "right", "bottom", "left"] as const;
export const pageBlockStyleKeys = [
  "align",
  "width",
  "column",
  "textColor",
  "background",
  "backgroundType",
  "backgroundImage",
  "opacity",
  "radius",
  "shadow",
  "borderColor",
  "borderWidth",
  "borderStyle",
  "padding",
  "margin",
  "fontFamily",
  "fontSize",
  "fontWeight",
  "lineHeight",
  "letterSpacing",
  // ── TASK-532 typography fidelity (Bundle B) present-only style keys ──
  "fontSizeCustom",
  "textTransform",
  // ── end TASK-532 ──
  // TASK-522-01-L03 composition/decoration style fields (present-only).
  "decoration",
  "tilt",
  "tiltGlare",
  "layer",
  // TASK-524-02-L01 independent glass tint (present-only).
  "surfaceTint",
  "surfacePreset",
  "hoverEffect",
  "marquee",
  "composition",
  // TASK-525-02-L01 per-block staggered reveal (present-only number).
  "revealDelay",
  // ── TASK-531 REGION: arbitrary colored glow box-shadow (present-only object).
  "glow",
  // ── END TASK-531 REGION ──────────────────────────────────────────────────
  // ── TASK-534 ── present-only magnetic-hover flag (runtime pointer-attract).
  "magnetic",
  // ── TASK-533-01 REGION: block grid span (present-only clamped ints).
  "colSpan",
  "rowSpan",
  // ── END TASK-533-01 REGION ────────────────────────────────────────────────
] as const;
type MobileBreakpoint = Exclude<PageBreakpoint, "desktop">;
export const mobileBreakpoints: MobileBreakpoint[] = ["tablet", "mobile"];
export const defaultBreakpoints: PageBreakpoint[] = ["desktop", "tablet", "mobile"];

export const defaultSeo: PageDocumentSeoV2 = {};
export const defaultSettings: PageDocumentSettingsV2 = {
  template: "page-v2",
  showInNav: true,
};
export const defaultLayout: PageSectionLayoutV2 = {
  columns: 1,
  align: "start",
  justify: "start",
  maxWidth: 1080,
  stackVertical: false,
};
export const defaultStyle: PageSectionStyleV2 = {
  background: "#ffffff",
  backgroundType: "color",
  backgroundImage: null,
  accent: "#0d9488",
  radius: 0,
  shadow: "none",
};
export const defaultSpacing: PageSectionSpacingV2 = {
  paddingTop: 64,
  paddingBottom: 64,
  paddingLeft: 40,
  paddingRight: 40,
  gap: 24,
};
export const defaultVisibility: PageSectionVisibilityV2 = {
  visible: true,
  authOnly: false,
  anchor: null,
  startsAt: null,
  endsAt: null,
};
export const defaultBlockVisibility: PageBlockVisibilityV2 = {
  visible: true,
};
const pageLayoutBlockSlots: Partial<Record<PageBlockType, readonly PageBlockSlotKey[]>> = {
  container: ["children"],
  columns: ["column:1", "column:2", "column:3", "column:4"],
  group: ["children"],
  // ── TASK-534 ── switcher exposes one child-block tree per tab (panel:1..6).
  switcher: ["panel:1", "panel:2", "panel:3", "panel:4", "panel:5", "panel:6"],
};

export const pageBlockPropKeys: Record<PageBlockType, readonly string[]> = {
  heading: ["text", "level", "align", "marks"],
  text: ["text", "format", "align", "marks"],
  badge: [
    "text",
    "variant",
    "size",
    "shape",
    "weight",
    "background",
    "textColor",
    "icon",
    "iconPosition",
  ],
  button: ["label", "href", "target", "variant", "size"],
  image: ["assetId", "src", "alt", "caption", "fit"],
  video: ["assetId", "src", "title", "autoplay", "muted"],
  // ── TASK-534 ── present-only filter props (+ per-item optional `category`).
  gallery: ["items", "layout", "filterable", "filterCategories"],
  form: ["formId", "title", "textareaRows", "showSelectPrompt", "loadingLabel", "successBehavior"],
  list: ["items", "ordered"],
  card: ["title", "text", "image", "href"],
  collection: [
    "contentTypeId",
    "queryId",
    "limit",
    "templateId",
    "paginationMode",
    "pageSize",
    "showCta",
  ],
  filters: [
    "queryId",
    "facets",
    "aliases",
    "layout",
    "autoApply",
    "showSearch",
    "showCount",
    "searchLabel",
    "searchPlaceholder",
    "applyLabel",
  ],
  embed: ["html", "url", "provider"],
  // ── TASK-532 eyebrow divider (Bundle B): width/align/gradient present-only ──
  divider: ["tone", "thickness", "width", "align", "gradient"],
  spacer: ["size"],
  statistic: ["value", "label", "caption"],
  icon: ["name", "label", "animation", "size", "color", "speed"],
  quote: ["text", "cite", "marks"],
  container: [],
  columns: ["count", "gap", "distribution"],
  group: ["direction", "wrap", "gap"],
  // TASK-522-01-L01: sanitized inline SVG + optional stroke draw-in.
  customSvg: ["svg", "drawIn", "drawSpeed", "label"],
  // ── TASK-534 ── declarative-interactivity blocks.
  switcher: ["tabs", "activeIndex", "variant", "ariaLabel"],
  scrollHint: ["label", "glyph"],
};

export type PageBlockRuntimeRendererState = "real" | "placeholder" | "unsupported";
export type PageBlockPublicDataBinding = "none" | "scoped-read-only";

export type PageBlockCapabilitiesV2 = {
  editorInsertable: boolean;
  insertable: boolean;
  assistantEmittable: boolean;
  runtimeRenderer: PageBlockRuntimeRendererState;
  slots: readonly PageBlockSlotKey[];
  publicDataBinding: PageBlockPublicDataBinding;
  reason?: string;
};

export type PageSectionCapabilitiesV2 = {
  insertable: boolean;
  assistantEmittable: boolean;
  reason?: string;
};

const insertableSectionTypes = new Set<PageSectionType>([
  "hero",
  "content",
  "feature-grid",
  "media-split",
  "timeline",
  "gallery",
  "comparison",
  "faq",
  "testimonials",
  "cta",
  "custom",
]);

const pageSectionCapabilityReasons: Partial<Record<PageSectionType, string>> = {
  template: "template-section-boundary",
  navigation: "runtime-navigation-boundary",
  collection: "collection-section-boundary",
  filters: "listing-section-boundary",
  "lead-form": "form-section-boundary",
  embed: "embed-section-boundary",
};

export const pageSectionCapabilities = pageSectionTypes.reduce(
  (capabilities, type) => {
    const insertable = insertableSectionTypes.has(type);
    capabilities[type] = {
      insertable,
      assistantEmittable: insertable,
      ...(insertable ? {} : { reason: pageSectionCapabilityReasons[type] ?? "unsupported" }),
    };
    return capabilities;
  },
  {} as Record<PageSectionType, PageSectionCapabilitiesV2>
);

const realRuntimeBlockTypes = new Set<PageBlockType>([
  "heading",
  "text",
  "badge",
  "button",
  "image",
  "video",
  "gallery",
  "form",
  "list",
  "card",
  "collection",
  "filters",
  "embed",
  "divider",
  "spacer",
  "statistic",
  "quote",
  "container",
  "columns",
  "group",
  // TASK-521-04: the animated-icon block is a real runtime renderer — its
  // `renderPageBlockContent case "icon"` (pageRendererV2.tsx) mounts the curated
  // inline-SVG + CSS-keyframe glyph. Flip lands with the renderer/palette/controls.
  "icon",
  // TASK-522-01-L01: the custom-SVG block is a real runtime renderer — its
  // `renderPageBlockContent case "customSvg"` (522-02-L01) mounts the sanitized
  // inline SVG. Registered here so the capability report marks it runtime "real".
  "customSvg",
  // ── TASK-534 ── switcher (renderer case 534-02-L01, tablist runtime 534-01-L03)
  // + scrollHint (renderer case 534-02-L03, CSS-keyframe only) are real renderers.
  "switcher",
  "scrollHint",
]);
const dataBoundBlockTypes = new Set<PageBlockType>(["collection", "filters", "form", "embed"]);
// ── TASK-534 ── switcher is a SLOT HOST (panel:1..6). It MUST live in
// layoutBlockTypes because getPageBlockActiveSlotKeys (:1063) gates on THIS set,
// not on pageLayoutBlockSlots — omitting it would leave the editor slot
// enumeration returning [] (dead panels), even though the JSON schema + normalize
// slot-validation read pageBlockCapabilities[type].slots and would work.
const layoutBlockTypes = new Set<PageBlockType>(["container", "columns", "group", "switcher"]);
const editorInsertableBlockTypes = new Set<PageBlockType>([
  "heading",
  "text",
  "badge",
  "button",
  "image",
  "video",
  // ── TASK-534 ── the gallery block joins the editor-insertable catalog: its
  // authoring controls (filterable/filterCategories + layout) ship with 534-04,
  // clearing the `gallery-editor-controls-pending` capability reason. Acceptance
  // Criteria #2 inserts a `gallery` with `filterable:true` from the palette.
  "gallery",
  // TASK-456: the form block is editor-insertable — its public runtime
  // (scoped data binding, nonce/anti-abuse submit pipeline) shipped with
  // TASK-418-06-L04 and the authoring controls (formId combobox + title)
  // ship with this capability flip. The `lead-form` SECTION stays gated: a
  // lead-form layout is a section composed with this block (composite-first
  // product rule), so a dedicated section type would only add catalog noise.
  "form",
  "list",
  "card",
  // TASK-457: the collection block is editor-insertable — its public runtime
  // (scoped read-only content-list binding) shipped with TASK-418-06-L04 and
  // the authoring controls (contentTypeId/queryId/templateId comboboxes +
  // limit slider) ship with this capability flip. The `collection` SECTION
  // stays gated: a listing layout is a section composed with this block
  // (composite-first product rule).
  "collection",
  // TASK-459-02: the filters block is editor-insertable — a deliberate
  // TASK-452-style catalog amendment. Its public runtime (facet form reusing
  // the listing-filters markup, scoped read-only listing binding) and the
  // authoring controls (saved-query combobox + generic facet builder +
  // behavior toggles) ship together with this capability flip. The `filters`
  // SECTION stays gated `listing-section-boundary`: a filter layout is an
  // ordinary section composed with this block (composite-first product rule).
  "filters",
  "divider",
  "spacer",
  "statistic",
  "quote",
  // TASK-521-04: the animated-icon block is now editor-insertable — its palette
  // copy (pageEditorOptions.ts) + block controls (pageEditorControlRegistry.ts)
  // ship with this flip.
  "icon",
  "container",
  "columns",
  "group",
  // TASK-522-01-L01: the custom-SVG block is editor-insertable — its palette copy
  // (pageEditorOptions.ts) + block controls (pageEditorControlRegistry.ts) ship
  // with 522-02. No capability-reason stub (it IS insertable).
  "customSvg",
  // ── TASK-534 ── switcher + scrollHint are editor-insertable (palette copy in
  // blockOptionCopy 534-01-L01; controls in 534-04). No capability-reason stub.
  "switcher",
  "scrollHint",
]);
const insertableBlockTypes = editorInsertableBlockTypes;
const assistantEmittableBlockTypes = new Set<PageBlockType>([
  "heading",
  "text",
  "badge",
  "button",
  "image",
  "video",
  "list",
  "card",
  "divider",
  "spacer",
  "statistic",
  "quote",
  "container",
  "columns",
  "group",
]);
const pageBlockCapabilityReasons: Partial<Record<PageBlockType, string>> = {
  // ── TASK-534 ── `gallery` is now editor-insertable (filter/layout controls
  // shipped in 534-04), so its `gallery-editor-controls-pending` reason is dropped.
  embed: "embed-editor-controls-pending",
};

export const pageBlockCapabilities = pageBlockTypes.reduce(
  (capabilities, type) => {
    const runtimeRenderer: PageBlockRuntimeRendererState = realRuntimeBlockTypes.has(type)
      ? "real"
      : "placeholder";
    const insertable = insertableBlockTypes.has(type);
    capabilities[type] = {
      editorInsertable: editorInsertableBlockTypes.has(type),
      insertable,
      assistantEmittable: assistantEmittableBlockTypes.has(type),
      runtimeRenderer,
      slots: pageLayoutBlockSlots[type] ?? [],
      publicDataBinding: dataBoundBlockTypes.has(type) ? "scoped-read-only" : "none",
      ...(insertable ? {} : { reason: pageBlockCapabilityReasons[type] ?? "unsupported" }),
    };
    return capabilities;
  },
  {} as Record<PageBlockType, PageBlockCapabilitiesV2>
);

export const getPageBlockActiveSlotKeys = (block: PageBlockV2): readonly PageBlockSlotKey[] => {
  const slots = pageBlockCapabilities[block.type].slots;
  if (!layoutBlockTypes.has(block.type)) return [];
  if (block.type !== "columns") return slots;
  const rawCount = typeof block.props.count === "number" ? block.props.count : 2;
  const count = Math.max(1, Math.min(4, Math.trunc(rawCount)));
  return slots.slice(0, count);
};

/**
 * List block item contract: a plain string renders as text, while
 * `{ label, href }` renders as a link (footer link columns). Plain strings
 * stay first-class for backward compatibility with existing documents.
 */
export type PageListItemV2 = string | { label: string; href: string };

/**
 * Builds the stored shape for a list item from free-form editor input: a
 * non-empty link target produces the `{ label, href }` link item, anything
 * else collapses to the legacy plain-string item. Owned here so the panel
 * items editor and normalization agree on the stored contract.
 */
export const createPageListItem = (label: string, href: string): PageListItemV2 => {
  const safeHref = sanitizeAuthoringLinkHref(href);
  return safeHref ? { label, href: safeHref } : label;
};

export const pageBlockDefaultProps: Record<PageBlockType, Record<string, unknown>> = {
  heading: { text: "Heading", level: "h2", align: "left" },
  text: { text: "Write the section copy here.", format: "plain", align: "left" },
  badge: {
    text: "Badge",
    variant: "soft",
    size: "sm",
    shape: "pill",
    weight: "semibold",
    background: null,
    textColor: null,
    icon: null,
    iconPosition: "start",
  },
  button: { label: "Learn more", href: "/", target: "self", variant: "primary", size: "md" },
  image: { assetId: null, src: null, alt: "", caption: "", fit: "cover" },
  video: { assetId: null, src: null, title: "", autoplay: false, muted: true },
  gallery: { items: [], layout: "grid" },
  form: { formId: null, title: "" },
  list: { items: [], ordered: false },
  card: { title: "Card title", text: "", image: null, href: null },
  collection: {
    contentTypeId: null,
    queryId: null,
    limit: 6,
    templateId: null,
    // TASK-459-03: visitor pagination defaults — "none" preserves today's
    // render exactly; `pageSize: null` means "follow limit" when paged.
    paginationMode: "none",
    pageSize: null,
  },
  filters: {
    queryId: null,
    facets: [],
    aliases: {},
    layout: "horizontal",
    autoApply: true,
    showSearch: true,
    showCount: true,
    searchLabel: "Search",
    searchPlaceholder: "Search results...",
    applyLabel: "Apply filters",
  },
  embed: { html: "", url: "", provider: "custom" },
  divider: { tone: "neutral", thickness: 1 },
  spacer: { size: 32 },
  statistic: { value: "0", label: "Metric", caption: "" },
  icon: {
    name: "sparkles",
    label: "",
    animation: "pulse",
    size: 48,
    color: "var(--primary)",
    speed: 1600,
  },
  quote: { text: "", cite: "" },
  container: {},
  columns: { count: 2, gap: 24, distribution: "equal" },
  group: { direction: "column", wrap: false, gap: 16 },
  // TASK-522-01-L01: drawSpeed omitted until authored (the only present-only
  // prop); empty svg = neutral fallback at render.
  customSvg: { svg: "", drawIn: false, label: "" },
  // ── TASK-534 ── switcher/scrollHint defaults. gallery is UNCHANGED above
  // (filterable/filterCategories are present-only, not seeded).
  switcher: {
    tabs: [{ label: "Tab one" }, { label: "Tab two" }],
    activeIndex: 0,
    variant: "pill",
  },
  scrollHint: { label: "Scroll", glyph: "dot" },
};
