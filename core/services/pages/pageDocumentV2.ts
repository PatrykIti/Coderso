import { DEFAULT_TOKENS } from "../theme/tokenTypes";

export const PAGE_DOCUMENT_SCHEMA_VERSION = 2 as const;

export const pageBreakpoints = ["desktop", "tablet", "mobile"] as const;
export const pageSectionTypes = [
  "template",
  "navigation",
  "hero",
  "content",
  "feature-grid",
  "media-split",
  "timeline",
  "gallery",
  "collection",
  "comparison",
  "filters",
  "lead-form",
  "faq",
  "testimonials",
  "cta",
  "embed",
  "custom",
] as const;
export const pageBlockTypes = [
  "heading",
  "text",
  "button",
  "image",
  "video",
  "gallery",
  "form",
  "list",
  "card",
  "collection",
  "embed",
  "divider",
  "spacer",
  "statistic",
  "icon",
  "quote",
  "container",
  "columns",
  "group",
] as const;

export const pageSectionVariants = [
  "default",
  "split",
  "centered",
  "full-width",
  "cards",
  "grid",
  "horizontal",
  "compact",
] as const;
export const pageSectionAlignments = ["start", "center", "end", "stretch"] as const;
export const pageSectionJustify = ["start", "center", "end", "between"] as const;
export const pageShadowTokens = ["none", "sm", "md", "lg"] as const;
export const pageBackgroundTypes = ["none", "color", "gradient", "image", "video"] as const;
export const pageButtonTargets = ["self", "blank"] as const;
export const pageButtonVariants = ["primary", "secondary", "ghost", "link"] as const;
export const pageButtonSizes = ["sm", "md", "lg"] as const;
export const pageTextFormats = ["plain", "rich"] as const;
export const pageTextAlignments = ["left", "center", "right"] as const;
export const pageHeadingLevels = ["h1", "h2", "h3", "h4", "h5", "h6"] as const;
export const pageBlockWidths = ["auto", "full"] as const;
export const pageImageFits = ["cover", "contain"] as const;
export const pageGalleryLayouts = ["grid", "carousel", "masonry"] as const;
export const pageDividerTones = ["neutral", "muted", "accent"] as const;
export const pageColumnDistributions = ["equal", "auto"] as const;
export const pageGroupDirections = ["row", "column"] as const;
export const pageBlockSlotKeys = [
  "children",
  "column:1",
  "column:2",
  "column:3",
  "column:4",
] as const;

/**
 * Token-backed typography contract (TASK-424). Option tokens reference the
 * theme token stack (`DesignTokens.typography` in `core/services/theme/
 * tokenTypes.ts`, emitted as `--font-sans`/`--font-display` and
 * `--text-sm`...`--text-5xl` by `core/ui/theme/tokenCss.ts`). All typography
 * style fields are nullable and default to unset, so documents saved before
 * this contract render exactly as before (the baked utility classes stay the
 * fallback). The scale tops out at `5xl` (3rem = 48px), matching the baked h1
 * utility class so the largest explicit preset never shrinks a default h1.
 */
export const pageTypographyFontFamilies = ["sans", "display"] as const;
export const pageTypographyFontSizes = [
  "sm",
  "md",
  "lg",
  "xl",
  "2xl",
  "3xl",
  "4xl",
  "5xl",
] as const;
export const pageTypographyFontWeights = ["normal", "medium", "semibold", "bold"] as const;
/** Unitless `line-height` bounds for block typography. */
export const PAGE_TYPOGRAPHY_LINE_HEIGHT_CLAMP = { min: 1, max: 2.5 } as const;
/** `letter-spacing` bounds in px for block typography. */
export const PAGE_TYPOGRAPHY_LETTER_SPACING_CLAMP = { min: -2, max: 8 } as const;
/**
 * Block types whose rendered output paints user-editable text, and therefore
 * may expose (and paint) the typography style surface. Layout, media, and
 * data-bound blocks stay outside this contract.
 */
export const pageTypographyCapableBlockTypes = [
  "heading",
  "text",
  "button",
  "list",
  "card",
  "statistic",
  "quote",
] as const;
export const PAGE_BLOCK_MAX_TREE_DEPTH = 4 as const;
export const PAGE_BLOCK_MAX_CHILDREN_PER_SLOT = 24 as const;

export type PageBreakpoint = (typeof pageBreakpoints)[number];
export type PageSectionType = (typeof pageSectionTypes)[number];
export type PageBlockType = (typeof pageBlockTypes)[number];
export type PageSectionVariant = (typeof pageSectionVariants)[number];
export type PageSectionAlignment = (typeof pageSectionAlignments)[number];
export type PageSectionJustify = (typeof pageSectionJustify)[number];
export type PageShadowToken = (typeof pageShadowTokens)[number];
export type PageBackgroundType = (typeof pageBackgroundTypes)[number];
export type PageBlockWidth = (typeof pageBlockWidths)[number];
export type PageColumnDistribution = (typeof pageColumnDistributions)[number];
export type PageGroupDirection = (typeof pageGroupDirections)[number];
export type PageBlockSlotKey = (typeof pageBlockSlotKeys)[number];
export type PageTypographyFontFamily = (typeof pageTypographyFontFamilies)[number];
export type PageTypographyFontSize = (typeof pageTypographyFontSizes)[number];
export type PageTypographyFontWeight = (typeof pageTypographyFontWeights)[number];
export type PageTypographyCapableBlockType = (typeof pageTypographyCapableBlockTypes)[number];

export const isPageTypographyCapableBlockType = (
  type: PageBlockType
): type is PageTypographyCapableBlockType =>
  (pageTypographyCapableBlockTypes as readonly string[]).includes(type);

/**
 * CSS values for typography tokens. Family and size tokens resolve through the
 * theme CSS variables on the published front (`toCssVariables` paints them on
 * `:root`), with the `DEFAULT_TOKENS` value as a literal fallback so the admin
 * canvas (which does not mount the front token stylesheet) paints the same
 * defaults. Weight tokens map to plain numeric weights.
 */
export const pageTypographyFontFamilyCssValues: Record<PageTypographyFontFamily, string> = {
  sans: `var(--font-sans, ${DEFAULT_TOKENS.typography.sans})`,
  display: `var(--font-display, ${DEFAULT_TOKENS.typography.display})`,
};

export const pageTypographyFontSizeCssValues: Record<PageTypographyFontSize, string> = {
  sm: `var(--text-sm, ${DEFAULT_TOKENS.typography.sm})`,
  md: `var(--text-md, ${DEFAULT_TOKENS.typography.md})`,
  lg: `var(--text-lg, ${DEFAULT_TOKENS.typography.lg})`,
  xl: `var(--text-xl, ${DEFAULT_TOKENS.typography.xl})`,
  "2xl": `var(--text-2xl, ${DEFAULT_TOKENS.typography["2xl"]})`,
  "3xl": `var(--text-3xl, ${DEFAULT_TOKENS.typography["3xl"]})`,
  "4xl": `var(--text-4xl, ${DEFAULT_TOKENS.typography["4xl"]})`,
  "5xl": `var(--text-5xl, ${DEFAULT_TOKENS.typography["5xl"]})`,
};

export const pageTypographyFontWeightCssValues: Record<PageTypographyFontWeight, string> = {
  normal: "400",
  medium: "500",
  semibold: "600",
  bold: "700",
};

export type PageDocumentSeoV2 = {
  title?: string;
  description?: string;
  image?: string | null;
};

export type PageCollectionLinkV2 = {
  contentTypeId: string;
  pageRole: "canonical-list-page" | "supporting-page";
  compositionKey?: string | null;
  listingQueryId?: string | null;
  listingTemplateId?: string | null;
};

export type PageDocumentSettingsV2 = {
  template: string;
  showInNav: boolean;
  revisionRetention?: number;
  collectionLink?: PageCollectionLinkV2;
};

export type PageSectionLayoutV2 = {
  columns: number;
  align: PageSectionAlignment;
  justify: PageSectionJustify;
  maxWidth: number;
  /**
   * Vertical-stacking switch (TASK-425). When the EFFECTIVE resolved value at
   * a breakpoint is `true`, the section content grid is forced to a single
   * column, beating the template-floored column count. It is per-breakpoint
   * override-able through `responsive[bp].layout.stackVertical` like every
   * other layout key; the typical authoring shape keeps the base `false` and
   * sets `responsive.mobile.layout.stackVertical = true`. Optional on input;
   * full normalization defaults it to `false`, so documents saved before this
   * field render exactly as before.
   */
  stackVertical?: boolean;
};

export type PageSectionStyleV2 = {
  background: string;
  backgroundType: PageBackgroundType;
  backgroundImage?: string | null;
  accent: string;
  radius: number;
  shadow: PageShadowToken;
};

export type PageSectionSpacingV2 = {
  paddingTop: number;
  paddingBottom: number;
  paddingLeft: number;
  paddingRight: number;
  gap: number;
};

export type PageSectionVisibilityV2 = {
  visible: boolean;
  authOnly: boolean;
  anchor?: string | null;
  startsAt?: string | null;
  endsAt?: string | null;
};

export type PageBoxSpacingV2 = {
  top?: number;
  right?: number;
  bottom?: number;
  left?: number;
};

export type PageBlockStyleV2 = {
  align?: "left" | "center" | "right";
  width?: PageBlockWidth;
  textColor?: string | null;
  background?: string | null;
  backgroundType?: PageBackgroundType;
  opacity?: number;
  radius?: number;
  shadow?: PageShadowToken;
  borderColor?: string | null;
  padding?: PageBoxSpacingV2;
  margin?: PageBoxSpacingV2;
  /** Token-backed typography (TASK-424); null/unset keeps the baked classes. */
  fontFamily?: PageTypographyFontFamily | null;
  fontSize?: PageTypographyFontSize | null;
  fontWeight?: PageTypographyFontWeight | null;
  /** Unitless line-height clamped to {@link PAGE_TYPOGRAPHY_LINE_HEIGHT_CLAMP}. */
  lineHeight?: number | null;
  /** Letter-spacing in px clamped to {@link PAGE_TYPOGRAPHY_LETTER_SPACING_CLAMP}. */
  letterSpacing?: number | null;
};

export type PageBlockVisibilityV2 = {
  visible: boolean;
};

export type PageBlockResponsiveOverrideV2 = {
  props?: Record<string, unknown>;
  style?: PageBlockStyleV2;
  visibility?: Partial<PageBlockVisibilityV2>;
};

export type PageBlockV2 = {
  id: string;
  type: PageBlockType;
  props: Record<string, unknown>;
  style?: PageBlockStyleV2;
  visibility: PageBlockVisibilityV2;
  responsive?: Partial<Record<Exclude<PageBreakpoint, "desktop">, PageBlockResponsiveOverrideV2>>;
  slots?: Partial<Record<PageBlockSlotKey, PageBlockV2[]>>;
};

export type PageSectionResponsiveOverrideV2 = {
  layout?: Partial<PageSectionLayoutV2>;
  style?: Partial<PageSectionStyleV2>;
  spacing?: Partial<PageSectionSpacingV2>;
  visibility?: Partial<PageSectionVisibilityV2>;
};

export type PageSectionV2 = {
  id: string;
  type: PageSectionType;
  name: string;
  variant: PageSectionVariant;
  layout: PageSectionLayoutV2;
  style: PageSectionStyleV2;
  spacing: PageSectionSpacingV2;
  visibility: PageSectionVisibilityV2;
  responsive: Partial<Record<Exclude<PageBreakpoint, "desktop">, PageSectionResponsiveOverrideV2>>;
  blocks: PageBlockV2[];
};

export type PageDocumentV2 = {
  schemaVersion: typeof PAGE_DOCUMENT_SCHEMA_VERSION;
  breakpoints: PageBreakpoint[];
  seo: PageDocumentSeoV2;
  settings: PageDocumentSettingsV2;
  sections: PageSectionV2[];
};

export type PageDocumentErrorCode = "page_document_invalid" | "page_document_unknown_field";

export class PageDocumentError extends Error {
  code: PageDocumentErrorCode;
  path?: string;

  constructor(code: PageDocumentErrorCode, message: string, path?: string) {
    super(message);
    this.name = "PageDocumentError";
    this.code = code;
    this.path = path;
  }
}

type NormalizeMode = "stored-read" | "write";
type RecordValue = Record<string, unknown>;
type MobileBreakpoint = Exclude<PageBreakpoint, "desktop">;
type BlockNormalizationContext = {
  mode: NormalizeMode;
  blockIds: Set<string>;
  visiting: WeakSet<object>;
};

const pageBoxSpacingKeys = ["top", "right", "bottom", "left"] as const;
const pageBlockStyleKeys = [
  "align",
  "width",
  "textColor",
  "background",
  "backgroundType",
  "opacity",
  "radius",
  "shadow",
  "borderColor",
  "padding",
  "margin",
  "fontFamily",
  "fontSize",
  "fontWeight",
  "lineHeight",
  "letterSpacing",
] as const;
const mobileBreakpoints: MobileBreakpoint[] = ["tablet", "mobile"];
const defaultBreakpoints: PageBreakpoint[] = ["desktop", "tablet", "mobile"];

const defaultSeo: PageDocumentSeoV2 = {};
const defaultSettings: PageDocumentSettingsV2 = {
  template: "page-v2",
  showInNav: true,
};
const defaultLayout: PageSectionLayoutV2 = {
  columns: 1,
  align: "start",
  justify: "start",
  maxWidth: 1080,
  stackVertical: false,
};
const defaultStyle: PageSectionStyleV2 = {
  background: "#ffffff",
  backgroundType: "color",
  backgroundImage: null,
  accent: "#0d9488",
  radius: 0,
  shadow: "none",
};
const defaultSpacing: PageSectionSpacingV2 = {
  paddingTop: 64,
  paddingBottom: 64,
  paddingLeft: 40,
  paddingRight: 40,
  gap: 24,
};
const defaultVisibility: PageSectionVisibilityV2 = {
  visible: true,
  authOnly: false,
  anchor: null,
  startsAt: null,
  endsAt: null,
};
const defaultBlockVisibility: PageBlockVisibilityV2 = {
  visible: true,
};

const pageLayoutBlockSlots: Partial<Record<PageBlockType, readonly PageBlockSlotKey[]>> = {
  container: ["children"],
  columns: ["column:1", "column:2", "column:3", "column:4"],
  group: ["children"],
};

export const pageBlockPropKeys: Record<PageBlockType, readonly string[]> = {
  heading: ["text", "level", "align"],
  text: ["text", "format", "align"],
  button: ["label", "href", "target", "variant", "size"],
  image: ["assetId", "src", "alt", "caption", "fit"],
  video: ["assetId", "src", "title", "autoplay", "muted"],
  gallery: ["items", "layout"],
  form: ["formId", "title"],
  list: ["items", "ordered"],
  card: ["title", "text", "image", "href"],
  collection: ["contentTypeId", "queryId", "limit", "templateId"],
  embed: ["html", "url", "provider"],
  divider: ["tone", "thickness"],
  spacer: ["size"],
  statistic: ["value", "label", "caption"],
  icon: ["name", "label"],
  quote: ["text", "cite"],
  container: [],
  columns: ["count", "gap", "distribution"],
  group: ["direction", "wrap", "gap"],
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
  "button",
  "image",
  "video",
  "gallery",
  "form",
  "list",
  "card",
  "collection",
  "embed",
  "divider",
  "spacer",
  "statistic",
  "quote",
  "container",
  "columns",
  "group",
]);
const dataBoundBlockTypes = new Set<PageBlockType>(["collection", "form", "embed"]);
const layoutBlockTypes = new Set<PageBlockType>(["container", "columns", "group"]);
const editorInsertableBlockTypes = new Set<PageBlockType>([
  "heading",
  "text",
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
const insertableBlockTypes = editorInsertableBlockTypes;
const assistantEmittableBlockTypes = new Set<PageBlockType>([
  "heading",
  "text",
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
  gallery: "gallery-editor-controls-pending",
  form: "form-editor-controls-pending",
  collection: "collection-editor-controls-pending",
  embed: "embed-editor-controls-pending",
  icon: "icon-runtime-renderer-pending",
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

export const pageBlockDefaultProps: Record<PageBlockType, Record<string, unknown>> = {
  heading: { text: "Heading", level: "h2", align: "left" },
  text: { text: "Write the section copy here.", format: "plain", align: "left" },
  button: { label: "Learn more", href: "/", target: "self", variant: "primary", size: "md" },
  image: { assetId: null, src: null, alt: "", caption: "", fit: "cover" },
  video: { assetId: null, src: null, title: "", autoplay: false, muted: true },
  gallery: { items: [], layout: "grid" },
  form: { formId: null, title: "" },
  list: { items: [], ordered: false },
  card: { title: "Card title", text: "", image: null, href: null },
  collection: { contentTypeId: null, queryId: null, limit: 6, templateId: null },
  embed: { html: "", url: "", provider: "custom" },
  divider: { tone: "neutral", thickness: 1 },
  spacer: { size: 32 },
  statistic: { value: "0", label: "Metric", caption: "" },
  icon: { name: "sparkles", label: "" },
  quote: { text: "", cite: "" },
  container: {},
  columns: { count: 2, gap: 24, distribution: "equal" },
  group: { direction: "column", wrap: false, gap: 16 },
};

const numericSchema = (minimum: number, maximum: number): RecordValue => ({
  type: "number",
  minimum,
  maximum,
});

const nullableNumericSchema = (minimum: number, maximum: number): RecordValue => ({
  type: ["number", "null"],
  minimum,
  maximum,
});

const nullableEnumSchema = (options: readonly string[]): RecordValue => ({
  type: ["string", "null"],
  enum: [...options, null],
});

const stringSchema: RecordValue = { type: "string" };
const nullableStringSchema: RecordValue = { type: ["string", "null"] };
const booleanSchema: RecordValue = { type: "boolean" };
const arraySchema: RecordValue = { type: "array" };

const blockPropJsonSchemaForType = (type: PageBlockType, key: string): RecordValue => {
  if (type === "heading" && key === "level")
    return { type: "string", enum: [...pageHeadingLevels] };
  if ((type === "heading" || type === "text") && key === "align") {
    return { type: "string", enum: [...pageTextAlignments] };
  }
  if (type === "text" && key === "format") return { type: "string", enum: [...pageTextFormats] };
  if (type === "button" && key === "target")
    return { type: "string", enum: [...pageButtonTargets] };
  if (type === "button" && key === "variant") {
    return { type: "string", enum: [...pageButtonVariants] };
  }
  if (type === "button" && key === "size") return { type: "string", enum: [...pageButtonSizes] };
  if (type === "image" && key === "fit") return { type: "string", enum: [...pageImageFits] };
  if (type === "gallery" && key === "layout")
    return { type: "string", enum: [...pageGalleryLayouts] };
  if (type === "divider" && key === "tone") return { type: "string", enum: [...pageDividerTones] };
  if (type === "columns" && key === "distribution") {
    return { type: "string", enum: [...pageColumnDistributions] };
  }
  if (type === "group" && key === "direction") {
    return { type: "string", enum: [...pageGroupDirections] };
  }
  if (key === "limit") return numericSchema(1, 50);
  if (key === "thickness") return numericSchema(1, 16);
  if (key === "count") return numericSchema(1, 4);
  if (type === "columns" && key === "gap") return numericSchema(0, 120);
  if (type === "group" && key === "gap") return numericSchema(0, 120);
  if (key === "size") return numericSchema(0, 240);
  if (key === "ordered" || key === "autoplay" || key === "muted" || key === "wrap") {
    return booleanSchema;
  }
  if (key === "items") return arraySchema;
  if (
    [
      "assetId",
      "src",
      "image",
      "href",
      "formId",
      "contentTypeId",
      "queryId",
      "templateId",
    ].includes(key)
  ) {
    return nullableStringSchema;
  }
  return stringSchema;
};

const pageBoxSpacingJsonSchema: RecordValue = {
  type: "object",
  additionalProperties: false,
  properties: Object.fromEntries(pageBoxSpacingKeys.map((key) => [key, numericSchema(0, 160)])),
};

const pageBlockStyleJsonSchema: RecordValue = {
  type: "object",
  additionalProperties: false,
  properties: {
    align: { type: "string", enum: [...pageTextAlignments] },
    width: { type: "string", enum: [...pageBlockWidths] },
    textColor: { type: ["string", "null"] },
    background: { type: ["string", "null"] },
    backgroundType: { type: "string", enum: [...pageBackgroundTypes] },
    opacity: numericSchema(0, 1),
    radius: numericSchema(0, 64),
    shadow: { type: "string", enum: [...pageShadowTokens] },
    borderColor: { type: ["string", "null"] },
    padding: pageBoxSpacingJsonSchema,
    margin: pageBoxSpacingJsonSchema,
    fontFamily: nullableEnumSchema(pageTypographyFontFamilies),
    fontSize: nullableEnumSchema(pageTypographyFontSizes),
    fontWeight: nullableEnumSchema(pageTypographyFontWeights),
    lineHeight: nullableNumericSchema(
      PAGE_TYPOGRAPHY_LINE_HEIGHT_CLAMP.min,
      PAGE_TYPOGRAPHY_LINE_HEIGHT_CLAMP.max
    ),
    letterSpacing: nullableNumericSchema(
      PAGE_TYPOGRAPHY_LETTER_SPACING_CLAMP.min,
      PAGE_TYPOGRAPHY_LETTER_SPACING_CLAMP.max
    ),
  },
};

const pageBlockVisibilityJsonSchema: RecordValue = {
  type: "object",
  required: ["visible"],
  additionalProperties: false,
  properties: { visible: { type: "boolean" } },
};

const blockPropsJsonSchemaForType = (type: PageBlockType): RecordValue => ({
  type: "object",
  additionalProperties: false,
  properties: Object.fromEntries(
    pageBlockPropKeys[type].map((key) => [key, blockPropJsonSchemaForType(type, key)])
  ),
});

const blockResponsiveJsonSchemaForType = (type: PageBlockType): RecordValue => {
  const overrideSchema: RecordValue = {
    type: "object",
    additionalProperties: false,
    properties: {
      props: blockPropsJsonSchemaForType(type),
      style: pageBlockStyleJsonSchema,
      visibility: {
        type: "object",
        additionalProperties: false,
        properties: { visible: { type: "boolean" } },
      },
    },
  };
  return {
    type: "object",
    additionalProperties: false,
    properties: Object.fromEntries(
      mobileBreakpoints.map((breakpoint) => [breakpoint, overrideSchema])
    ),
  };
};

const blockDepthJsonSchemaRef = (depth: number): RecordValue => ({
  $ref: `#/$defs/pageBlockDepth${depth}`,
});

const blockJsonSchemaForType = (type: PageBlockType, depth: number): RecordValue => {
  const allowedSlots = pageBlockCapabilities[type].slots;
  const properties: RecordValue = {
    id: { type: "string", minLength: 1 },
    type: { const: type },
    props: blockPropsJsonSchemaForType(type),
    style: pageBlockStyleJsonSchema,
    visibility: pageBlockVisibilityJsonSchema,
    responsive: blockResponsiveJsonSchemaForType(type),
  };

  if (allowedSlots.length > 0 && depth < PAGE_BLOCK_MAX_TREE_DEPTH) {
    properties.slots = blockSlotsJsonSchemaForType(type, depth);
  }

  return {
    type: "object",
    required: ["id", "type", "props", "visibility"],
    additionalProperties: false,
    properties,
  };
};

const blockSlotsJsonSchemaForType = (type: PageBlockType, depth: number): RecordValue => ({
  type: "object",
  additionalProperties: false,
  properties: Object.fromEntries(
    pageBlockCapabilities[type].slots.map((slotKey) => [
      slotKey,
      {
        type: "array",
        maxItems: PAGE_BLOCK_MAX_CHILDREN_PER_SLOT,
        items: blockDepthJsonSchemaRef(depth + 1),
      },
    ])
  ),
});

const blockJsonSchemaForDepth = (depth: number): RecordValue => ({
  oneOf: pageBlockTypes.map((type) => blockJsonSchemaForType(type, depth)),
});

const pageBlockDepthJsonSchemas: RecordValue = Object.fromEntries(
  Array.from({ length: PAGE_BLOCK_MAX_TREE_DEPTH }, (_, index) => {
    const depth = index + 1;
    return [`pageBlockDepth${depth}`, blockJsonSchemaForDepth(depth)];
  })
);

const partialSectionLayoutJsonSchema: RecordValue = {
  type: "object",
  additionalProperties: false,
  properties: {
    columns: numericSchema(1, 4),
    align: { type: "string", enum: [...pageSectionAlignments] },
    justify: { type: "string", enum: [...pageSectionJustify] },
    maxWidth: numericSchema(320, 1920),
    stackVertical: booleanSchema,
  },
};

const partialSectionStyleJsonSchema: RecordValue = {
  type: "object",
  additionalProperties: false,
  properties: {
    background: { type: "string" },
    backgroundType: { type: "string", enum: [...pageBackgroundTypes] },
    backgroundImage: { type: ["string", "null"] },
    accent: { type: "string" },
    radius: numericSchema(0, 64),
    shadow: { type: "string", enum: [...pageShadowTokens] },
  },
};

const partialSectionSpacingJsonSchema: RecordValue = {
  type: "object",
  additionalProperties: false,
  properties: {
    paddingTop: numericSchema(0, 240),
    paddingBottom: numericSchema(0, 240),
    paddingLeft: numericSchema(0, 160),
    paddingRight: numericSchema(0, 160),
    gap: numericSchema(0, 120),
  },
};

const partialSectionVisibilityJsonSchema: RecordValue = {
  type: "object",
  additionalProperties: false,
  properties: {
    visible: { type: "boolean" },
    authOnly: { type: "boolean" },
    anchor: { type: ["string", "null"] },
    startsAt: { type: ["string", "null"] },
    endsAt: { type: ["string", "null"] },
  },
};

const sectionResponsiveJsonSchema: RecordValue = {
  type: "object",
  additionalProperties: false,
  properties: Object.fromEntries(
    mobileBreakpoints.map((breakpoint) => [
      breakpoint,
      {
        type: "object",
        additionalProperties: false,
        properties: {
          layout: partialSectionLayoutJsonSchema,
          style: partialSectionStyleJsonSchema,
          spacing: partialSectionSpacingJsonSchema,
          visibility: partialSectionVisibilityJsonSchema,
        },
      },
    ])
  ),
};

export const pageDocumentV2JsonSchema: RecordValue = {
  type: "object",
  required: ["schemaVersion", "sections"],
  additionalProperties: false,
  $defs: pageBlockDepthJsonSchemas,
  properties: {
    schemaVersion: { const: PAGE_DOCUMENT_SCHEMA_VERSION },
    breakpoints: {
      type: "array",
      items: { type: "string", enum: [...pageBreakpoints] },
      minItems: 3,
      maxItems: 3,
    },
    seo: {
      type: "object",
      additionalProperties: false,
      properties: {
        title: { type: "string" },
        description: { type: "string" },
        image: { type: ["string", "null"] },
      },
    },
    settings: {
      type: "object",
      additionalProperties: false,
      properties: {
        template: { type: "string" },
        showInNav: { type: "boolean" },
        revisionRetention: { type: "number", minimum: 1, maximum: 100 },
        collectionLink: {
          type: "object",
          required: ["contentTypeId", "pageRole"],
          additionalProperties: false,
          properties: {
            contentTypeId: { type: "string", minLength: 1 },
            pageRole: { type: "string", enum: ["canonical-list-page", "supporting-page"] },
            compositionKey: { type: ["string", "null"] },
            listingQueryId: { type: ["string", "null"] },
            listingTemplateId: { type: ["string", "null"] },
          },
        },
      },
    },
    sections: {
      type: "array",
      items: {
        type: "object",
        required: [
          "id",
          "type",
          "name",
          "variant",
          "layout",
          "style",
          "spacing",
          "visibility",
          "responsive",
          "blocks",
        ],
        additionalProperties: false,
        properties: {
          id: { type: "string", minLength: 1 },
          type: { type: "string", enum: [...pageSectionTypes] },
          name: { type: "string", minLength: 1 },
          variant: { type: "string", enum: [...pageSectionVariants] },
          layout: {
            type: "object",
            required: ["columns", "align", "justify", "maxWidth"],
            additionalProperties: false,
            properties: {
              columns: { type: "number", minimum: 1, maximum: 4 },
              align: { type: "string", enum: [...pageSectionAlignments] },
              justify: { type: "string", enum: [...pageSectionJustify] },
              maxWidth: { type: "number", minimum: 320, maximum: 1920 },
              stackVertical: { type: "boolean" },
            },
          },
          style: {
            type: "object",
            required: ["background", "backgroundType", "accent", "radius", "shadow"],
            additionalProperties: false,
            properties: {
              background: { type: "string" },
              backgroundType: { type: "string", enum: [...pageBackgroundTypes] },
              backgroundImage: { type: ["string", "null"] },
              accent: { type: "string" },
              radius: { type: "number", minimum: 0, maximum: 64 },
              shadow: { type: "string", enum: [...pageShadowTokens] },
            },
          },
          spacing: {
            type: "object",
            required: ["paddingTop", "paddingBottom", "paddingLeft", "paddingRight", "gap"],
            additionalProperties: false,
            properties: {
              paddingTop: { type: "number", minimum: 0, maximum: 240 },
              paddingBottom: { type: "number", minimum: 0, maximum: 240 },
              paddingLeft: { type: "number", minimum: 0, maximum: 160 },
              paddingRight: { type: "number", minimum: 0, maximum: 160 },
              gap: { type: "number", minimum: 0, maximum: 120 },
            },
          },
          visibility: {
            type: "object",
            required: ["visible", "authOnly"],
            additionalProperties: false,
            properties: {
              visible: { type: "boolean" },
              authOnly: { type: "boolean" },
              anchor: { type: ["string", "null"] },
              startsAt: { type: ["string", "null"] },
              endsAt: { type: ["string", "null"] },
            },
          },
          responsive: sectionResponsiveJsonSchema,
          blocks: {
            type: "array",
            items: blockDepthJsonSchemaRef(1),
          },
        },
      },
    },
  },
};

const isRecord = (value: unknown): value is RecordValue =>
  Boolean(value) && typeof value === "object" && !Array.isArray(value);

const cloneRecord = <T>(value: T): T => JSON.parse(JSON.stringify(value)) as T;

const readText = (value: unknown, fallback: string) => {
  if (typeof value !== "string") return fallback;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : fallback;
};

const readOptionalText = (value: unknown): string | null | undefined => {
  if (value === undefined) return undefined;
  if (value === null) return null;
  if (typeof value !== "string") return undefined;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
};

const readBoolean = (value: unknown, fallback: boolean) =>
  typeof value === "boolean" ? value : fallback;

const readNumber = (value: unknown, fallback: number, min: number, max: number) => {
  if (!Number.isFinite(value)) return fallback;
  return Math.min(max, Math.max(min, value as number));
};

const normalizeEnum = <T extends string>(
  value: unknown,
  options: readonly T[],
  fallback: T,
  context: string,
  mode: NormalizeMode
): T => {
  if (typeof value === "string" && options.includes(value as T)) return value as T;
  if (mode === "write") {
    throw new PageDocumentError("page_document_invalid", `Invalid ${context}.`, context);
  }
  return fallback;
};

/**
 * Nullable enum normalizer for the typography token fields: `null` is the
 * explicit "use the baked default" value. Unknown tokens reject on fresh
 * writes and fall back to `null` (no invented styling) on stored reads.
 */
const normalizeNullableEnum = <T extends string>(
  value: unknown,
  options: readonly T[],
  context: string,
  mode: NormalizeMode
): T | null => {
  if (value === null) return null;
  if (typeof value === "string" && options.includes(value as T)) return value as T;
  if (mode === "write") {
    throw new PageDocumentError("page_document_invalid", `Invalid ${context}.`, context);
  }
  return null;
};

/**
 * Nullable clamped number for the typography fields. Non-numeric values reject
 * on fresh writes and fall back to `null` on stored reads; finite values clamp
 * into the owner bounds.
 */
const readNullableClampedNumber = (
  value: unknown,
  clamp: { readonly min: number; readonly max: number },
  context: string,
  mode: NormalizeMode
): number | null => {
  if (value === null) return null;
  if (!Number.isFinite(value)) {
    if (mode === "write") {
      throw new PageDocumentError("page_document_invalid", `Invalid ${context}.`, context);
    }
    return null;
  }
  return Math.min(clamp.max, Math.max(clamp.min, value as number));
};

const assertKnownKeys = (
  value: RecordValue,
  allowed: readonly string[],
  path: string,
  mode: NormalizeMode
) => {
  if (mode !== "write") return;
  for (const key of Object.keys(value)) {
    if (!allowed.includes(key)) {
      const fieldPath = path ? `${path}.${key}` : key;
      throw new PageDocumentError(
        "page_document_unknown_field",
        `Unknown page document field: ${fieldPath}`,
        fieldPath
      );
    }
  }
};

const requireRecord = (value: unknown, path: string, mode: NormalizeMode): RecordValue => {
  if (isRecord(value)) return value;
  if (mode === "write") {
    throw new PageDocumentError("page_document_invalid", `Expected object at ${path}.`, path);
  }
  return {};
};

const requireArray = (value: unknown, path: string, mode: NormalizeMode): unknown[] => {
  if (Array.isArray(value)) return value;
  if (mode === "write") {
    throw new PageDocumentError("page_document_invalid", `Expected array at ${path}.`, path);
  }
  return [];
};

const normalizeId = (value: unknown, prefix: string, index: number, mode: NormalizeMode) => {
  if (typeof value === "string" && value.trim().length > 0) return value.trim();
  if (mode === "write") {
    throw new PageDocumentError("page_document_invalid", `Missing ${prefix} id.`, `${prefix}.id`);
  }
  return `${prefix}_${index + 1}`;
};

const normalizeBreakpoints = (value: unknown, mode: NormalizeMode): PageBreakpoint[] => {
  if (value === undefined) return [...defaultBreakpoints];
  const source = requireArray(value, "breakpoints", mode);
  const unique = source.filter(
    (item, index): item is PageBreakpoint =>
      typeof item === "string" &&
      pageBreakpoints.includes(item as PageBreakpoint) &&
      source.indexOf(item) === index
  );
  if (unique.length === pageBreakpoints.length && unique[0] === "desktop") return unique;
  if (mode === "write") {
    throw new PageDocumentError(
      "page_document_invalid",
      "Page document breakpoints must be desktop, tablet, and mobile.",
      "breakpoints"
    );
  }
  return [...defaultBreakpoints];
};

const normalizeSeo = (value: unknown, mode: NormalizeMode): PageDocumentSeoV2 => {
  const input = requireRecord(value ?? {}, "seo", mode);
  assertKnownKeys(input, ["title", "description", "image"], "seo", mode);
  const title = readOptionalText(input.title);
  const description = readOptionalText(input.description);
  const image = readOptionalText(input.image);
  return {
    ...(title !== undefined && title !== null ? { title } : {}),
    ...(description !== undefined && description !== null ? { description } : {}),
    ...(image !== undefined ? { image } : {}),
  };
};

const normalizeCollectionLink = (
  value: unknown,
  mode: NormalizeMode
): PageCollectionLinkV2 | undefined => {
  if (value === undefined) return undefined;
  const input = requireRecord(value, "settings.collectionLink", mode);
  assertKnownKeys(
    input,
    ["contentTypeId", "pageRole", "compositionKey", "listingQueryId", "listingTemplateId"],
    "settings.collectionLink",
    mode
  );
  const contentTypeId = readText(input.contentTypeId, "");
  const pageRole = normalizeEnum(
    input.pageRole,
    ["canonical-list-page", "supporting-page"] as const,
    "supporting-page",
    "settings.collectionLink.pageRole",
    mode
  );
  if (!contentTypeId) {
    if (mode === "write") {
      throw new PageDocumentError(
        "page_document_invalid",
        "Page collection link requires contentTypeId.",
        "settings.collectionLink.contentTypeId"
      );
    }
    return undefined;
  }

  const compositionKey = readOptionalText(input.compositionKey);
  const listingQueryId = readOptionalText(input.listingQueryId);
  const listingTemplateId = readOptionalText(input.listingTemplateId);
  return {
    contentTypeId,
    pageRole,
    ...(compositionKey !== undefined ? { compositionKey } : {}),
    ...(listingQueryId !== undefined ? { listingQueryId } : {}),
    ...(listingTemplateId !== undefined ? { listingTemplateId } : {}),
  };
};

const normalizeSettings = (value: unknown, mode: NormalizeMode): PageDocumentSettingsV2 => {
  const input = requireRecord(value ?? {}, "settings", mode);
  assertKnownKeys(
    input,
    ["template", "showInNav", "revisionRetention", "collectionLink"],
    "settings",
    mode
  );
  const collectionLink = normalizeCollectionLink(input.collectionLink, mode);
  const revisionRetention =
    input.revisionRetention === undefined
      ? undefined
      : readNumber(input.revisionRetention, 10, 1, 100);
  return {
    template: readText(input.template, defaultSettings.template),
    showInNav: readBoolean(input.showInNav, defaultSettings.showInNav),
    ...(revisionRetention !== undefined ? { revisionRetention } : {}),
    ...(collectionLink ? { collectionLink } : {}),
  };
};

const normalizeSectionLayout = (
  value: unknown,
  mode: NormalizeMode,
  path: string,
  partial = false
): Partial<PageSectionLayoutV2> | PageSectionLayoutV2 => {
  const input = requireRecord(value ?? {}, path, mode);
  assertKnownKeys(input, ["columns", "align", "justify", "maxWidth", "stackVertical"], path, mode);
  const result: Partial<PageSectionLayoutV2> = {};
  if (!partial || input.columns !== undefined) {
    result.columns = readNumber(input.columns, defaultLayout.columns, 1, 4);
  }
  if (!partial || input.align !== undefined) {
    result.align = normalizeEnum(
      input.align,
      pageSectionAlignments,
      defaultLayout.align,
      `${path}.align`,
      mode
    );
  }
  if (!partial || input.justify !== undefined) {
    result.justify = normalizeEnum(
      input.justify,
      pageSectionJustify,
      defaultLayout.justify,
      `${path}.justify`,
      mode
    );
  }
  if (!partial || input.maxWidth !== undefined) {
    result.maxWidth = readNumber(input.maxWidth, defaultLayout.maxWidth, 320, 1920);
  }
  if (!partial || input.stackVertical !== undefined) {
    result.stackVertical = readBoolean(input.stackVertical, false);
  }
  return partial ? result : ({ ...defaultLayout, ...result } satisfies PageSectionLayoutV2);
};

const normalizeSectionStyle = (
  value: unknown,
  mode: NormalizeMode,
  path: string,
  partial = false
): Partial<PageSectionStyleV2> | PageSectionStyleV2 => {
  const input = requireRecord(value ?? {}, path, mode);
  assertKnownKeys(
    input,
    ["background", "backgroundType", "backgroundImage", "accent", "radius", "shadow"],
    path,
    mode
  );
  const result: Partial<PageSectionStyleV2> = {};
  if (!partial || input.background !== undefined) {
    result.background = readText(input.background, defaultStyle.background);
  }
  if (!partial || input.backgroundType !== undefined) {
    result.backgroundType = normalizeEnum(
      input.backgroundType,
      pageBackgroundTypes,
      defaultStyle.backgroundType,
      `${path}.backgroundType`,
      mode
    );
  }
  if (!partial || input.backgroundImage !== undefined) {
    result.backgroundImage = readOptionalText(input.backgroundImage) ?? null;
  }
  if (!partial || input.accent !== undefined) {
    result.accent = readText(input.accent, defaultStyle.accent);
  }
  if (!partial || input.radius !== undefined) {
    result.radius = readNumber(input.radius, defaultStyle.radius, 0, 64);
  }
  if (!partial || input.shadow !== undefined) {
    result.shadow = normalizeEnum(
      input.shadow,
      pageShadowTokens,
      defaultStyle.shadow,
      `${path}.shadow`,
      mode
    );
  }
  return partial ? result : ({ ...defaultStyle, ...result } satisfies PageSectionStyleV2);
};

const normalizeSectionSpacing = (
  value: unknown,
  mode: NormalizeMode,
  path: string,
  partial = false
): Partial<PageSectionSpacingV2> | PageSectionSpacingV2 => {
  const input = requireRecord(value ?? {}, path, mode);
  assertKnownKeys(
    input,
    ["paddingTop", "paddingBottom", "paddingLeft", "paddingRight", "gap"],
    path,
    mode
  );
  const result: Partial<PageSectionSpacingV2> = {};
  if (!partial || input.paddingTop !== undefined) {
    result.paddingTop = readNumber(input.paddingTop, defaultSpacing.paddingTop, 0, 240);
  }
  if (!partial || input.paddingBottom !== undefined) {
    result.paddingBottom = readNumber(input.paddingBottom, defaultSpacing.paddingBottom, 0, 240);
  }
  if (!partial || input.paddingLeft !== undefined) {
    result.paddingLeft = readNumber(input.paddingLeft, defaultSpacing.paddingLeft, 0, 160);
  }
  if (!partial || input.paddingRight !== undefined) {
    result.paddingRight = readNumber(input.paddingRight, defaultSpacing.paddingRight, 0, 160);
  }
  if (!partial || input.gap !== undefined) {
    result.gap = readNumber(input.gap, defaultSpacing.gap, 0, 120);
  }
  return partial ? result : ({ ...defaultSpacing, ...result } satisfies PageSectionSpacingV2);
};

const normalizeSectionVisibility = (
  value: unknown,
  mode: NormalizeMode,
  path: string,
  partial = false
): Partial<PageSectionVisibilityV2> | PageSectionVisibilityV2 => {
  const input = requireRecord(value ?? {}, path, mode);
  assertKnownKeys(input, ["visible", "authOnly", "anchor", "startsAt", "endsAt"], path, mode);
  const result: Partial<PageSectionVisibilityV2> = {};
  if (!partial || input.visible !== undefined) {
    result.visible = readBoolean(input.visible, defaultVisibility.visible);
  }
  if (!partial || input.authOnly !== undefined) {
    result.authOnly = readBoolean(input.authOnly, defaultVisibility.authOnly);
  }
  if (!partial || input.anchor !== undefined) {
    result.anchor = normalizeAnchor(input.anchor);
  }
  if (!partial || input.startsAt !== undefined) {
    result.startsAt = readOptionalText(input.startsAt) ?? null;
  }
  if (!partial || input.endsAt !== undefined) {
    result.endsAt = readOptionalText(input.endsAt) ?? null;
  }
  return partial ? result : ({ ...defaultVisibility, ...result } satisfies PageSectionVisibilityV2);
};

const normalizeAnchor = (value: unknown) => {
  const text = readOptionalText(value);
  if (!text) return null;
  return text.startsWith("#") ? text.slice(1) : text;
};

const normalizeBlockStyle = (
  value: unknown,
  mode: NormalizeMode,
  path: string,
  partial = false
): PageBlockStyleV2 | undefined => {
  if (value === undefined && partial) return undefined;
  const input = requireRecord(value ?? {}, path, mode);
  assertKnownKeys(input, pageBlockStyleKeys, path, mode);
  const result: PageBlockStyleV2 = {};
  if (input.align !== undefined) {
    result.align = normalizeEnum(input.align, pageTextAlignments, "left", `${path}.align`, mode);
  }
  if (input.width !== undefined) {
    result.width = normalizeEnum(input.width, pageBlockWidths, "auto", `${path}.width`, mode);
  }
  if (input.textColor !== undefined) {
    result.textColor = readOptionalText(input.textColor) ?? null;
  }
  if (input.background !== undefined) {
    result.background = readOptionalText(input.background) ?? null;
  }
  if (input.backgroundType !== undefined) {
    result.backgroundType = normalizeEnum(
      input.backgroundType,
      pageBackgroundTypes,
      "none",
      `${path}.backgroundType`,
      mode
    );
  }
  if (input.opacity !== undefined) {
    result.opacity = readNumber(input.opacity, 1, 0, 1);
  }
  if (input.radius !== undefined) {
    result.radius = readNumber(input.radius, 0, 0, 64);
  }
  if (input.shadow !== undefined) {
    result.shadow = normalizeEnum(input.shadow, pageShadowTokens, "none", `${path}.shadow`, mode);
  }
  if (input.borderColor !== undefined) {
    result.borderColor = readOptionalText(input.borderColor) ?? null;
  }
  if (input.padding !== undefined) {
    const padding = normalizeBlockBoxSpacing(input.padding, mode, `${path}.padding`);
    if (padding) result.padding = padding;
  }
  if (input.margin !== undefined) {
    const margin = normalizeBlockBoxSpacing(input.margin, mode, `${path}.margin`);
    if (margin) result.margin = margin;
  }
  if (input.fontFamily !== undefined) {
    result.fontFamily = normalizeNullableEnum(
      input.fontFamily,
      pageTypographyFontFamilies,
      `${path}.fontFamily`,
      mode
    );
  }
  if (input.fontSize !== undefined) {
    result.fontSize = normalizeNullableEnum(
      input.fontSize,
      pageTypographyFontSizes,
      `${path}.fontSize`,
      mode
    );
  }
  if (input.fontWeight !== undefined) {
    result.fontWeight = normalizeNullableEnum(
      input.fontWeight,
      pageTypographyFontWeights,
      `${path}.fontWeight`,
      mode
    );
  }
  if (input.lineHeight !== undefined) {
    result.lineHeight = readNullableClampedNumber(
      input.lineHeight,
      PAGE_TYPOGRAPHY_LINE_HEIGHT_CLAMP,
      `${path}.lineHeight`,
      mode
    );
  }
  if (input.letterSpacing !== undefined) {
    result.letterSpacing = readNullableClampedNumber(
      input.letterSpacing,
      PAGE_TYPOGRAPHY_LETTER_SPACING_CLAMP,
      `${path}.letterSpacing`,
      mode
    );
  }
  return Object.keys(result).length > 0 ? result : undefined;
};

const normalizeBlockBoxSpacing = (
  value: unknown,
  mode: NormalizeMode,
  path: string
): PageBoxSpacingV2 | undefined => {
  const input = requireRecord(value ?? {}, path, mode);
  assertKnownKeys(input, pageBoxSpacingKeys, path, mode);
  const result: PageBoxSpacingV2 = {};
  for (const key of pageBoxSpacingKeys) {
    if (input[key] !== undefined) {
      result[key] = readNumber(input[key], 0, 0, 160);
    }
  }
  return Object.keys(result).length > 0 ? result : undefined;
};

const normalizeBlockVisibility = (
  value: unknown,
  mode: NormalizeMode,
  path: string,
  partial = false
): Partial<PageBlockVisibilityV2> | PageBlockVisibilityV2 => {
  const input = requireRecord(value ?? {}, path, mode);
  assertKnownKeys(input, ["visible"], path, mode);
  const result: Partial<PageBlockVisibilityV2> = {};
  if (!partial || input.visible !== undefined) {
    result.visible = readBoolean(input.visible, defaultBlockVisibility.visible);
  }
  return partial
    ? result
    : ({ ...defaultBlockVisibility, ...result } satisfies PageBlockVisibilityV2);
};

const normalizeBlockProps = (
  type: PageBlockType,
  value: unknown,
  mode: NormalizeMode,
  path: string,
  partial = false
): Record<string, unknown> => {
  const input = requireRecord(value ?? {}, path, mode);
  assertKnownKeys(input, pageBlockPropKeys[type], path, mode);
  const defaults = pageBlockDefaultProps[type];
  const result: Record<string, unknown> = partial ? {} : { ...defaults };

  for (const key of pageBlockPropKeys[type]) {
    if (input[key] !== undefined)
      result[key] = normalizeBlockProp(type, key, input[key], mode, `${path}.${key}`);
  }

  return result;
};

const normalizeBlockProp = (
  type: PageBlockType,
  key: string,
  value: unknown,
  mode: NormalizeMode,
  path: string
) => {
  if (type === "heading" && key === "level") {
    return normalizeEnum(value, pageHeadingLevels, "h2", path, mode);
  }
  if ((type === "heading" || type === "text") && key === "align") {
    return normalizeEnum(value, pageTextAlignments, "left", path, mode);
  }
  if (type === "text" && key === "format") {
    return normalizeEnum(value, pageTextFormats, "plain", path, mode);
  }
  if (type === "button" && key === "target") {
    return normalizeEnum(value, pageButtonTargets, "self", path, mode);
  }
  if (type === "button" && key === "variant") {
    return normalizeEnum(value, pageButtonVariants, "primary", path, mode);
  }
  if (type === "button" && key === "size") {
    return normalizeEnum(value, pageButtonSizes, "md", path, mode);
  }
  if (type === "image" && key === "fit") {
    return normalizeEnum(value, pageImageFits, "cover", path, mode);
  }
  if (type === "gallery" && key === "layout") {
    return normalizeEnum(value, pageGalleryLayouts, "grid", path, mode);
  }
  if (type === "divider" && key === "tone") {
    return normalizeEnum(value, pageDividerTones, "neutral", path, mode);
  }
  if (type === "columns" && key === "distribution") {
    return normalizeEnum(value, pageColumnDistributions, "equal", path, mode);
  }
  if (type === "group" && key === "direction") {
    return normalizeEnum(value, pageGroupDirections, "column", path, mode);
  }
  if (key === "limit") return readNumber(value, 6, 1, 50);
  if (key === "thickness") return readNumber(value, 1, 1, 16);
  if (type === "columns" && key === "count") return readNumber(value, 2, 1, 4);
  if ((type === "columns" || type === "group") && key === "gap") {
    return readNumber(value, type === "columns" ? 24 : 16, 0, 120);
  }
  if (type === "spacer" && key === "size") return readNumber(value, 32, 0, 240);
  if (key === "ordered" || key === "autoplay" || key === "muted" || key === "wrap") {
    return Boolean(value);
  }
  if (key === "items") return Array.isArray(value) ? cloneRecord(value) : [];
  if (value === undefined) return undefined;
  if (value === null) return null;
  if (typeof value === "string") return value.trim();
  if (typeof value === "number" || typeof value === "boolean") return value;
  if (isRecord(value) || Array.isArray(value)) return cloneRecord(value);
  return value;
};

const normalizeBlockResponsive = (
  value: unknown,
  type: PageBlockType,
  mode: NormalizeMode,
  path: string
): PageBlockV2["responsive"] => {
  if (value === undefined) return undefined;
  const input = requireRecord(value, path, mode);
  assertKnownKeys(input, mobileBreakpoints, path, mode);
  const result: NonNullable<PageBlockV2["responsive"]> = {};

  for (const breakpoint of mobileBreakpoints) {
    if (input[breakpoint] === undefined) continue;
    const overrideInput = requireRecord(input[breakpoint], `${path}.${breakpoint}`, mode);
    assertKnownKeys(overrideInput, ["props", "style", "visibility"], `${path}.${breakpoint}`, mode);
    const props =
      overrideInput.props === undefined
        ? undefined
        : normalizeBlockProps(type, overrideInput.props, mode, `${path}.${breakpoint}.props`, true);
    const style = normalizeBlockStyle(
      overrideInput.style,
      mode,
      `${path}.${breakpoint}.style`,
      true
    );
    const visibility =
      overrideInput.visibility === undefined
        ? undefined
        : normalizeBlockVisibility(
            overrideInput.visibility,
            mode,
            `${path}.${breakpoint}.visibility`,
            true
          );
    const normalized = {
      ...(props ? { props } : {}),
      ...(style ? { style } : {}),
      ...(visibility && Object.keys(visibility).length > 0 ? { visibility } : {}),
    };
    if (Object.keys(normalized).length > 0) result[breakpoint] = normalized;
  }

  return Object.keys(result).length > 0 ? result : undefined;
};

const ensureUniqueBlockId = (
  id: string,
  path: string,
  context: BlockNormalizationContext
): string => {
  if (!context.blockIds.has(id)) {
    context.blockIds.add(id);
    return id;
  }
  if (context.mode === "write") {
    throw new PageDocumentError(
      "page_document_invalid",
      `Duplicate page block id: ${id}.`,
      `${path}.id`
    );
  }

  let suffix = 2;
  let candidate = `${id}_${suffix}`;
  while (context.blockIds.has(candidate)) {
    suffix += 1;
    candidate = `${id}_${suffix}`;
  }
  context.blockIds.add(candidate);
  return candidate;
};

const normalizeBlockSlots = (
  value: unknown,
  type: PageBlockType,
  mode: NormalizeMode,
  path: string,
  depth: number,
  context: BlockNormalizationContext
): PageBlockV2["slots"] => {
  if (value === undefined) return undefined;
  const allowedSlots = pageBlockCapabilities[type].slots;
  if (allowedSlots.length === 0) {
    if (mode === "write") {
      throw new PageDocumentError(
        "page_document_invalid",
        `Block type ${type} does not support slots.`,
        path
      );
    }
    return undefined;
  }
  if (depth >= PAGE_BLOCK_MAX_TREE_DEPTH) {
    if (mode === "write") {
      throw new PageDocumentError(
        "page_document_invalid",
        "Page block slots exceed the maximum nesting depth.",
        path
      );
    }
    return undefined;
  }
  if (!isRecord(value)) {
    if (mode === "write") {
      throw new PageDocumentError("page_document_invalid", `Expected object at ${path}.`, path);
    }
    return undefined;
  }

  assertKnownKeys(value, allowedSlots, path, mode);
  const result: NonNullable<PageBlockV2["slots"]> = {};

  for (const slotKey of allowedSlots) {
    const slotValue = value[slotKey];
    if (slotValue === undefined) continue;
    if (!Array.isArray(slotValue)) {
      if (mode === "write") {
        throw new PageDocumentError(
          "page_document_invalid",
          `Expected array at ${path}.${slotKey}.`,
          `${path}.${slotKey}`
        );
      }
      continue;
    }
    if (slotValue.length > PAGE_BLOCK_MAX_CHILDREN_PER_SLOT && mode === "write") {
      throw new PageDocumentError(
        "page_document_invalid",
        `Page block slot ${path}.${slotKey} exceeds ${PAGE_BLOCK_MAX_CHILDREN_PER_SLOT} children.`,
        `${path}.${slotKey}`
      );
    }

    const normalizedChildren: PageBlockV2[] = [];
    const children = slotValue.slice(0, PAGE_BLOCK_MAX_CHILDREN_PER_SLOT);
    children.forEach((child, childIndex) => {
      const normalized = normalizeBlock(
        child,
        `${path}.${slotKey}.${childIndex}`,
        childIndex,
        mode,
        depth + 1,
        context
      );
      if (normalized) normalizedChildren.push(normalized);
    });
    result[slotKey] = normalizedChildren;
  }

  return Object.keys(result).length > 0 ? result : undefined;
};

const normalizeBlock = (
  value: unknown,
  path: string,
  blockIndex: number,
  mode: NormalizeMode,
  depth: number,
  context: BlockNormalizationContext
): PageBlockV2 | null => {
  if (depth > PAGE_BLOCK_MAX_TREE_DEPTH) {
    if (mode === "write") {
      throw new PageDocumentError(
        "page_document_invalid",
        "Page block tree exceeds the maximum nesting depth.",
        path
      );
    }
    return null;
  }
  const input = requireRecord(value, path, mode);
  if (context.visiting.has(input)) {
    if (mode === "write") {
      throw new PageDocumentError(
        "page_document_invalid",
        "Page block tree contains a cycle.",
        path
      );
    }
    return null;
  }

  context.visiting.add(input);
  try {
    assertKnownKeys(
      input,
      ["id", "type", "props", "style", "visibility", "responsive", "slots"],
      path,
      mode
    );
    const type = normalizeEnum(input.type, pageBlockTypes, "text", `${path}.type`, mode);
    const id = ensureUniqueBlockId(normalizeId(input.id, "blk", blockIndex, mode), path, context);
    const style = normalizeBlockStyle(input.style, mode, `${path}.style`);
    const responsive = normalizeBlockResponsive(input.responsive, type, mode, `${path}.responsive`);
    const slots = normalizeBlockSlots(input.slots, type, mode, `${path}.slots`, depth, context);
    return {
      id,
      type,
      props: normalizeBlockProps(type, input.props, mode, `${path}.props`),
      ...(style ? { style } : {}),
      visibility: normalizeBlockVisibility(
        input.visibility,
        mode,
        `${path}.visibility`
      ) as PageBlockVisibilityV2,
      ...(responsive ? { responsive } : {}),
      ...(slots ? { slots } : {}),
    };
  } finally {
    context.visiting.delete(input);
  }
};

const normalizeSectionResponsive = (
  value: unknown,
  mode: NormalizeMode,
  path: string
): PageSectionV2["responsive"] => {
  if (value === undefined) return {};
  const input = requireRecord(value, path, mode);
  assertKnownKeys(input, mobileBreakpoints, path, mode);
  const result: PageSectionV2["responsive"] = {};

  for (const breakpoint of mobileBreakpoints) {
    if (input[breakpoint] === undefined) continue;
    const overrideInput = requireRecord(input[breakpoint], `${path}.${breakpoint}`, mode);
    assertKnownKeys(
      overrideInput,
      ["layout", "style", "spacing", "visibility"],
      `${path}.${breakpoint}`,
      mode
    );
    const layout =
      overrideInput.layout === undefined
        ? undefined
        : normalizeSectionLayout(overrideInput.layout, mode, `${path}.${breakpoint}.layout`, true);
    const style =
      overrideInput.style === undefined
        ? undefined
        : normalizeSectionStyle(overrideInput.style, mode, `${path}.${breakpoint}.style`, true);
    const spacing =
      overrideInput.spacing === undefined
        ? undefined
        : normalizeSectionSpacing(
            overrideInput.spacing,
            mode,
            `${path}.${breakpoint}.spacing`,
            true
          );
    const visibility =
      overrideInput.visibility === undefined
        ? undefined
        : normalizeSectionVisibility(
            overrideInput.visibility,
            mode,
            `${path}.${breakpoint}.visibility`,
            true
          );
    const normalized = {
      ...(layout && Object.keys(layout).length > 0 ? { layout } : {}),
      ...(style && Object.keys(style).length > 0 ? { style } : {}),
      ...(spacing && Object.keys(spacing).length > 0 ? { spacing } : {}),
      ...(visibility && Object.keys(visibility).length > 0 ? { visibility } : {}),
    };
    if (Object.keys(normalized).length > 0) result[breakpoint] = normalized;
  }

  return result;
};

const normalizeSection = (
  value: unknown,
  index: number,
  mode: NormalizeMode,
  blockContext: BlockNormalizationContext
): PageSectionV2 => {
  const path = `sections.${index}`;
  const input = requireRecord(value, path, mode);
  assertKnownKeys(
    input,
    [
      "id",
      "type",
      "name",
      "variant",
      "layout",
      "style",
      "spacing",
      "visibility",
      "responsive",
      "blocks",
    ],
    path,
    mode
  );
  const type = normalizeEnum(input.type, pageSectionTypes, "custom", `${path}.type`, mode);
  const blocks = requireArray(input.blocks, `${path}.blocks`, mode).flatMap((block, blockIndex) => {
    const normalized = normalizeBlock(
      block,
      `${path}.blocks.${blockIndex}`,
      blockIndex,
      mode,
      1,
      blockContext
    );
    return normalized ? [normalized] : [];
  });

  return {
    id: normalizeId(input.id, "sec", index, mode),
    type,
    name: readText(input.name, toSectionName(type)),
    variant: normalizeEnum(input.variant, pageSectionVariants, "default", `${path}.variant`, mode),
    layout: normalizeSectionLayout(input.layout, mode, `${path}.layout`) as PageSectionLayoutV2,
    style: normalizeSectionStyle(input.style, mode, `${path}.style`) as PageSectionStyleV2,
    spacing: normalizeSectionSpacing(
      input.spacing,
      mode,
      `${path}.spacing`
    ) as PageSectionSpacingV2,
    visibility: normalizeSectionVisibility(
      input.visibility,
      mode,
      `${path}.visibility`
    ) as PageSectionVisibilityV2,
    responsive: normalizeSectionResponsive(input.responsive, mode, `${path}.responsive`),
    blocks,
  };
};

const toSectionName = (type: PageSectionType) =>
  type
    .split("-")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");

export function createPageDocumentId(prefix: "sec" | "blk" = "sec") {
  const uuid =
    typeof globalThis.crypto?.randomUUID === "function"
      ? globalThis.crypto.randomUUID()
      : `${Date.now().toString(36)}${Math.random().toString(36).slice(2)}`;
  return `${prefix}_${uuid.replace(/-/g, "").slice(0, 12)}`;
}

export function createDefaultPageDocumentV2(): PageDocumentV2 {
  return {
    schemaVersion: PAGE_DOCUMENT_SCHEMA_VERSION,
    breakpoints: [...defaultBreakpoints],
    seo: { ...defaultSeo },
    settings: { ...defaultSettings },
    sections: [],
  };
}

export function createPageBlockV2(type: PageBlockType, input?: Partial<PageBlockV2>): PageBlockV2 {
  const payload = {
    id: input?.id ?? createPageDocumentId("blk"),
    type,
    props: input?.props ?? pageBlockDefaultProps[type],
    style: input?.style,
    visibility: input?.visibility ?? defaultBlockVisibility,
    responsive: input?.responsive,
    slots: input?.slots,
  };
  const block = normalizeBlock(payload, "block", 0, "stored-read", 1, {
    mode: "stored-read",
    blockIds: new Set(),
    visiting: new WeakSet(),
  });
  if (!block)
    throw new PageDocumentError("page_document_invalid", "Page block is invalid.", "block");
  return block;
}

export function createPageSectionV2(
  type: PageSectionType,
  input?: Partial<PageSectionV2>
): PageSectionV2 {
  const payload = {
    id: input?.id ?? createPageDocumentId("sec"),
    type,
    name: input?.name ?? toSectionName(type),
    variant: input?.variant ?? "default",
    layout: input?.layout ?? defaultLayout,
    style: input?.style ?? defaultStyle,
    spacing: input?.spacing ?? defaultSpacing,
    visibility: input?.visibility ?? defaultVisibility,
    responsive: input?.responsive ?? {},
    blocks: input?.blocks ?? [],
  };
  return normalizeSection(payload, 0, "stored-read", {
    mode: "stored-read",
    blockIds: new Set(),
    visiting: new WeakSet(),
  });
}

export function isPageDocumentError(
  error: unknown,
  code?: PageDocumentErrorCode
): error is PageDocumentError {
  return error instanceof PageDocumentError && (!code || error.code === code);
}

export function isLegacyOrVersionlessPageDocument(value: unknown): boolean {
  if (!isRecord(value)) return true;
  if (value.schemaVersion === PAGE_DOCUMENT_SCHEMA_VERSION) return false;
  return value.schemaVersion === undefined || Array.isArray(value.blocks);
}

export function normalizePageDocumentV2ForWrite(value: unknown): PageDocumentV2 {
  const input = requireRecord(value, "data", "write");
  if (input.schemaVersion !== PAGE_DOCUMENT_SCHEMA_VERSION) {
    throw new PageDocumentError(
      "page_document_invalid",
      "Pages require schemaVersion 2 and sections[].",
      "schemaVersion"
    );
  }
  assertKnownKeys(
    input,
    ["schemaVersion", "breakpoints", "seo", "settings", "sections"],
    "",
    "write"
  );

  return normalizePageDocumentV2(input, "write");
}

export function normalizeStoredPageDocumentV2ForRead(value: unknown): PageDocumentV2 {
  if (isLegacyOrVersionlessPageDocument(value)) return createDefaultPageDocumentV2();
  return normalizePageDocumentV2(value, "stored-read");
}

export function normalizePageDocumentV2(
  value: unknown,
  mode: NormalizeMode = "write"
): PageDocumentV2 {
  const input = requireRecord(value, "data", mode);
  if (mode === "write") {
    assertKnownKeys(
      input,
      ["schemaVersion", "breakpoints", "seo", "settings", "sections"],
      "",
      mode
    );
  }
  if (input.schemaVersion !== PAGE_DOCUMENT_SCHEMA_VERSION) {
    if (mode === "write") {
      throw new PageDocumentError(
        "page_document_invalid",
        "Pages require schemaVersion 2 and sections[].",
        "schemaVersion"
      );
    }
    return createDefaultPageDocumentV2();
  }

  const blockContext: BlockNormalizationContext = {
    mode,
    blockIds: new Set(),
    visiting: new WeakSet(),
  };
  const sections = requireArray(input.sections, "sections", mode).map((section, index) =>
    normalizeSection(section, index, mode, blockContext)
  );

  return {
    schemaVersion: PAGE_DOCUMENT_SCHEMA_VERSION,
    breakpoints: normalizeBreakpoints(input.breakpoints, mode),
    seo: normalizeSeo(input.seo, mode),
    settings: normalizeSettings(input.settings, mode),
    sections,
  };
}

export function resolvePageSectionForBreakpoint(
  section: PageSectionV2,
  breakpoint: PageBreakpoint
): PageSectionV2 {
  const base = cloneRecord(section);
  if (breakpoint === "desktop") {
    return {
      ...base,
      blocks: base.blocks.map((block) => resolvePageBlockForBreakpoint(block, breakpoint)),
    };
  }
  const override = section.responsive[breakpoint];
  if (!override) {
    return {
      ...base,
      blocks: base.blocks.map((block) => resolvePageBlockForBreakpoint(block, breakpoint)),
    };
  }

  return {
    ...base,
    layout: { ...section.layout, ...(override.layout ?? {}) },
    style: { ...section.style, ...(override.style ?? {}) },
    spacing: { ...section.spacing, ...(override.spacing ?? {}) },
    visibility: { ...section.visibility, ...(override.visibility ?? {}) },
    blocks: base.blocks.map((block) => resolvePageBlockForBreakpoint(block, breakpoint)),
  };
}

export function resolvePageBlockForBreakpoint(
  block: PageBlockV2,
  breakpoint: PageBreakpoint
): PageBlockV2 {
  const base = cloneRecord(block);
  const resolveSlots = (slots: PageBlockV2["slots"]): PageBlockV2["slots"] | undefined => {
    if (!slots) return undefined;
    return Object.fromEntries(
      Object.entries(slots).map(([slotKey, children]) => [
        slotKey,
        (children ?? []).map((child) => resolvePageBlockForBreakpoint(child, breakpoint)),
      ])
    ) as PageBlockV2["slots"];
  };
  const resolvedSlots = resolveSlots(base.slots);
  if (breakpoint === "desktop") {
    return resolvedSlots ? { ...base, slots: resolvedSlots } : base;
  }
  const override = block.responsive?.[breakpoint];
  if (!override) return resolvedSlots ? { ...base, slots: resolvedSlots } : base;

  const style = { ...(base.style ?? {}), ...(override.style ?? {}) };
  const resolved: PageBlockV2 = {
    ...base,
    props: { ...base.props, ...(override.props ?? {}) },
    visibility: { ...base.visibility, ...(override.visibility ?? {}) },
    ...(resolvedSlots ? { slots: resolvedSlots } : {}),
  };
  if (Object.keys(style).length > 0) resolved.style = style;
  else delete resolved.style;
  return resolved;
}

export function resolvePageDocumentForBreakpoint(
  document: PageDocumentV2,
  breakpoint: PageBreakpoint
): PageDocumentV2 {
  return {
    ...cloneRecord(document),
    sections: document.sections.map((section) =>
      resolvePageSectionForBreakpoint(section, breakpoint)
    ),
  };
}

export function clearResponsiveOverride(
  section: PageSectionV2,
  breakpoint: MobileBreakpoint,
  path: readonly string[]
): PageSectionV2 {
  if (path.length === 0) return cloneRecord(section);
  const next = cloneRecord(section);
  const override = next.responsive[breakpoint];
  if (!override) return next;
  removeNestedPath(override as RecordValue, path);
  if (isEmptyRecord(override)) {
    const { [breakpoint]: _removed, ...rest } = next.responsive;
    next.responsive = rest;
  }
  return next;
}

export function clearBlockResponsiveOverride(
  block: PageBlockV2,
  breakpoint: MobileBreakpoint,
  path: readonly string[]
): PageBlockV2 {
  if (path.length === 0) return cloneRecord(block);
  const next = cloneRecord(block);
  const override = next.responsive?.[breakpoint];
  if (!override) return next;
  removeNestedPath(override as RecordValue, path);
  if (isEmptyRecord(override)) {
    const { [breakpoint]: _removed, ...rest } = next.responsive ?? {};
    if (Object.keys(rest).length > 0) next.responsive = rest;
    else delete next.responsive;
  }
  return next;
}

export function toPublishedPageDocumentV2(value: unknown): PageDocumentV2 {
  return stripEditorFields(normalizeStoredPageDocumentV2ForRead(value)) as PageDocumentV2;
}

const removeNestedPath = (target: RecordValue, path: readonly string[]) => {
  const [head, ...tail] = path;
  if (!head) return;
  if (tail.length === 0) {
    delete target[head];
    return;
  }
  const child = target[head];
  if (!isRecord(child)) return;
  removeNestedPath(child, tail);
  if (isEmptyRecord(child)) delete target[head];
};

const isEmptyRecord = (value: unknown): value is RecordValue =>
  isRecord(value) && Object.keys(value).length === 0;

const stripEditorFields = (value: unknown): unknown => {
  if (Array.isArray(value)) return value.map(stripEditorFields);
  if (!isRecord(value)) return value;
  return Object.fromEntries(
    Object.entries(value)
      .filter(([key]) => key !== "editor")
      .map(([key, nested]) => [key, stripEditorFields(nested)])
  );
};
