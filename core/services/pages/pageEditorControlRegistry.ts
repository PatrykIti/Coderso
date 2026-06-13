import {
  PAGE_COLLECTION_LIMIT_CLAMP,
  PAGE_TYPOGRAPHY_LETTER_SPACING_CLAMP,
  PAGE_TYPOGRAPHY_LINE_HEIGHT_CLAMP,
  pageBackgroundTypes,
  pageBlockCapabilities,
  pageColumnDistributions,
  pageBlockWidths,
  pageButtonSizes,
  pageButtonTargets,
  pageButtonVariants,
  pageCollectionPaginationModes,
  pageDividerTones,
  pageFiltersBlockLayouts,
  pageGroupDirections,
  pageHeadingLevels,
  pageImageFits,
  pageSectionAlignments,
  pageSectionCapabilities,
  pageSectionJustify,
  pageShadowTokens,
  pageTextAlignments,
  pageTextFormats,
  pageBlockDefaultProps,
  pageBreakpoints,
  pageTypographyFontFamilies,
  pageTypographyFontSizes,
  pageTypographyFontWeights,
  type PageBlockType,
  type PageBreakpoint,
  type PageSectionVariant,
  type PageSectionType,
} from "./pageDocumentV2";
import { getPageSectionVariantOptions } from "./pageSectionTemplates";

export type PageEditorControlTarget = "section" | "block";
export type PageEditorControlPanel =
  | "layout"
  | "content"
  | "typography"
  | "style"
  | "spacing"
  | "background"
  | "responsive"
  | "visibility";
export type PageEditorControlInput =
  | "text"
  | "number"
  | "select"
  | "segmented"
  | "switch"
  | "color"
  | "swatch"
  | "media"
  /**
   * Structured list-items editor (`props.items` on the list block): per-item
   * rows with a label and an optional link target, committing the owner
   * `PageListItemV2` shapes (plain string, or `{ label, href }` link items).
   */
  | "items"
  /**
   * Generic facet-list builder (`props.facets` on the filters block,
   * TASK-459-02): per-facet rows with kind/label/field/operator plus the
   * option and sort-option lists, committing the canonical
   * `ListingFacetConfig[]` shape owned by `pageDocumentV2`/`filterContract`.
   * Field-driven by design — nothing vertical-specific.
   */
  | "facets";

/**
 * Dynamic option sources for unbounded reference pickers (TASK-456/457). A
 * `select` control flagged with an `optionsSource` resolves to a searchable
 * combobox model in `pageEditorControlUiModel`; the editor shell owns the
 * source wiring through the cached admin clients, mapping resource id ->
 * display name:
 * - `"forms"` -> `listFormsCached()` (admin forms client),
 * - `"contentTypes"` -> `listContentTypesCached()` (content types client),
 * - `"listingQueries"` -> `listListingQueriesCached()` (listings client),
 * - `"listingTemplates"` -> `listListingTemplatesCached()` (listings client).
 * The registry stays Bun-free: it only names the source, never imports the
 * client.
 */
export type PageEditorControlOptionsSource =
  | "forms"
  | "contentTypes"
  | "listingQueries"
  /**
   * Unscoped saved listing queries (TASK-459-02): the filters block binds to
   * any saved query directly (no `contentTypeId` sibling to scope by), so the
   * editor shell lists every saved query through the listings client.
   */
  | "listingQueriesAll"
  | "listingTemplates";

export type PageEditorControlDefinition = {
  id: string;
  panel: PageEditorControlPanel;
  target: PageEditorControlTarget;
  label: string;
  path: readonly string[];
  overridePath: readonly string[];
  input: PageEditorControlInput;
  responsive: boolean;
  options?: readonly string[];
  /**
   * Dynamic options source for reference pickers (TASK-456). Mutually
   * exclusive with static `options`; the adapter maps the control to a
   * `combobox` model and the editor shell resolves the option list.
   */
  optionsSource?: PageEditorControlOptionsSource;
  /**
   * Whether the stored value may be cleared to an explicit `null`
   * (schema-owned nullability in `pageDocumentV2`, e.g. `props.formId`).
   * Combobox models surface it as a "None" row.
   */
  nullable?: boolean;
  /**
   * Sibling prop key that SCOPES the dynamic option list (TASK-457): the
   * editor shell filters the resolved source options to entries belonging to
   * the current value of this prop (e.g. saved listing queries scoped to the
   * chosen `contentTypeId`). Only meaningful together with `optionsSource`.
   */
  filterBy?: string;
  clamp?: { min: number; max: number };
  /** Explicit slider step for fractional numeric controls (e.g. line height). */
  step?: number;
  /** Explicit readout unit; overrides the adapter's px default (use "" for unitless). */
  unit?: string;
  /**
   * Effective value the editor must DISPLAY when the stored field is unset
   * (sparse block style / defensive prop reads). It is the `pageDocumentV2`
   * schema default only where that default is render-equivalent to "unset"
   * (e.g. unset `style.opacity` renders exactly like the schema default `1`).
   * Controls whose unset state means "inherit baked styling" (block
   * width/align, typography tokens) omit it here — their effective rendered
   * defaults are owned by `pageBlockRenderDefaults.ts` and resolved by the
   * display path per block type/heading level (owner finding #9 round 3).
   * Nullable colors stay display-empty. Widgets must never show a zero-value
   * lie (e.g. Opacity `0` for an unset value that renders as `1`).
   */
  fallback?: string | number | boolean;
};

const control = (
  definition: Omit<PageEditorControlDefinition, "overridePath"> & {
    overridePath?: readonly string[];
  }
): PageEditorControlDefinition => ({
  ...definition,
  overridePath: definition.overridePath ?? definition.path,
});

/**
 * Display fallback for a block prop: the owner schema default from
 * `pageBlockDefaultProps`. Props are filled with these defaults on normalize,
 * so this is purely defensive — but it keeps a degenerate document honest
 * (e.g. a heading without `level` displays the schema default `h2`, never a
 * lying first option). Non-scalar defaults (arrays, null) have no fallback.
 */
const blockPropFallback = (type: PageBlockType, key: string): string | number | boolean | null => {
  const value = pageBlockDefaultProps[type][key];
  return typeof value === "string" || typeof value === "number" || typeof value === "boolean"
    ? value
    : null;
};

const blockPropControl = (
  type: PageBlockType,
  key: string,
  definition: Pick<PageEditorControlDefinition, "label" | "input"> &
    Partial<
      Pick<
        PageEditorControlDefinition,
        "panel" | "options" | "optionsSource" | "filterBy" | "clamp" | "unit"
      >
    >
) => {
  const fallback = blockPropFallback(type, key);
  return control({
    id: `block.${type}.props.${key}`,
    panel: definition.panel ?? "content",
    target: "block",
    label: definition.label,
    path: ["props", key],
    input: definition.input,
    responsive: true,
    ...(definition.options ? { options: definition.options } : {}),
    // Dynamic-source pickers derive nullability from the owner schema default:
    // a `null` default in `pageBlockDefaultProps` is the nullable-reference
    // contract (`formId`/`contentTypeId`/... use nullableStringSchema).
    ...(definition.optionsSource
      ? {
          optionsSource: definition.optionsSource,
          nullable: pageBlockDefaultProps[type][key] === null,
          ...(definition.filterBy ? { filterBy: definition.filterBy } : {}),
        }
      : {}),
    ...(definition.clamp ? { clamp: definition.clamp } : {}),
    ...(definition.unit !== undefined ? { unit: definition.unit } : {}),
    ...(fallback === null ? {} : { fallback }),
  });
};

export const pageUniversalSectionControls: readonly PageEditorControlDefinition[] = [
  control({
    id: "section.layout.columns",
    panel: "layout",
    target: "section",
    label: "Columns",
    path: ["layout", "columns"],
    input: "number",
    responsive: true,
    clamp: { min: 1, max: 4 },
  }),
  control({
    id: "section.layout.maxWidth",
    panel: "layout",
    target: "section",
    label: "Max width",
    path: ["layout", "maxWidth"],
    input: "number",
    responsive: true,
    clamp: { min: 320, max: 1920 },
  }),
  control({
    id: "section.layout.align",
    panel: "layout",
    target: "section",
    label: "Align",
    path: ["layout", "align"],
    input: "segmented",
    responsive: true,
    options: pageSectionAlignments,
  }),
  control({
    id: "section.layout.justify",
    panel: "layout",
    target: "section",
    label: "Justify",
    path: ["layout", "justify"],
    input: "segmented",
    responsive: true,
    options: pageSectionJustify,
  }),
  control({
    id: "section.style.background",
    panel: "background",
    target: "section",
    label: "Background",
    path: ["style", "background"],
    input: "color",
    responsive: true,
  }),
  control({
    id: "section.style.backgroundType",
    panel: "background",
    target: "section",
    label: "Background type",
    path: ["style", "backgroundType"],
    input: "select",
    responsive: true,
    options: pageBackgroundTypes,
  }),
  control({
    id: "section.style.accent",
    panel: "style",
    target: "section",
    label: "Accent",
    path: ["style", "accent"],
    input: "color",
    responsive: true,
  }),
  control({
    id: "section.style.radius",
    panel: "style",
    target: "section",
    label: "Radius",
    path: ["style", "radius"],
    input: "number",
    responsive: true,
    clamp: { min: 0, max: 64 },
  }),
  control({
    id: "section.style.shadow",
    panel: "style",
    target: "section",
    label: "Shadow",
    path: ["style", "shadow"],
    input: "select",
    responsive: true,
    options: pageShadowTokens,
  }),
  ...(
    [
      ["paddingTop", "Top"],
      ["paddingBottom", "Bottom"],
      ["paddingLeft", "Left"],
      ["paddingRight", "Right"],
      ["gap", "Gap"],
    ] as const
  ).map(([key, label]) =>
    control({
      id: `section.spacing.${key}`,
      panel: "spacing",
      target: "section",
      label,
      path: ["spacing", key],
      input: "number",
      responsive: true,
      clamp: key === "gap" ? { min: 0, max: 120 } : { min: 0, max: 240 },
    })
  ),
  control({
    id: "section.visibility.visible",
    panel: "visibility",
    target: "section",
    label: "Visible",
    path: ["visibility", "visible"],
    input: "switch",
    responsive: true,
  }),
  control({
    id: "section.visibility.authOnly",
    panel: "visibility",
    target: "section",
    label: "Auth only",
    path: ["visibility", "authOnly"],
    input: "switch",
    responsive: true,
  }),
  control({
    id: "section.layout.stackVertical",
    panel: "responsive",
    target: "section",
    label: "Stack vertically",
    path: ["layout", "stackVertical"],
    input: "switch",
    responsive: true,
  }),
] as const;

/**
 * Vertical-layout toggle owned by the Responsive panel (TASK-425). The stored
 * field is `layout.stackVertical` (`pageDocumentV2`); on tablet/mobile the
 * editor writes it through the existing `responsive[bp].layout` override
 * container like every other layout key. Sections only — blocks have no
 * stacking surface, so unsupported targets render no control.
 */
export const pageSectionStackVerticalControl: PageEditorControlDefinition =
  pageUniversalSectionControls.find(
    (definition) => definition.id === "section.layout.stackVertical"
  )!;

export const pageUniversalBlockControls: readonly PageEditorControlDefinition[] = [
  control({
    id: "block.style.width",
    panel: "layout",
    target: "block",
    label: "Width",
    path: ["style", "width"],
    input: "segmented",
    responsive: true,
    options: pageBlockWidths,
  }),
  control({
    id: "block.style.align",
    panel: "layout",
    target: "block",
    label: "Align",
    path: ["style", "align"],
    input: "segmented",
    responsive: true,
    options: pageTextAlignments,
  }),
  control({
    id: "block.style.textColor",
    panel: "style",
    target: "block",
    label: "Text color",
    path: ["style", "textColor"],
    input: "color",
    responsive: true,
  }),
  control({
    id: "block.style.background",
    panel: "background",
    target: "block",
    label: "Background",
    path: ["style", "background"],
    input: "color",
    responsive: true,
  }),
  control({
    id: "block.style.backgroundType",
    panel: "background",
    target: "block",
    label: "Background type",
    path: ["style", "backgroundType"],
    input: "select",
    responsive: true,
    options: pageBackgroundTypes,
    // Unset renders no background — exactly the schema default "none".
    fallback: "none",
  }),
  control({
    id: "block.style.opacity",
    panel: "style",
    target: "block",
    label: "Opacity",
    path: ["style", "opacity"],
    input: "number",
    responsive: true,
    clamp: { min: 0, max: 1 },
    // Unset opacity renders fully opaque; the schema default is 1 (see
    // normalizeBlockStyle). Displaying 0 for unset was the owner-reported lie.
    fallback: 1,
  }),
  control({
    id: "block.style.radius",
    panel: "style",
    target: "block",
    label: "Radius",
    path: ["style", "radius"],
    input: "number",
    responsive: true,
    clamp: { min: 0, max: 64 },
    // Unset renders no border-radius — the schema default 0.
    fallback: 0,
  }),
  control({
    id: "block.style.shadow",
    panel: "style",
    target: "block",
    label: "Shadow",
    path: ["style", "shadow"],
    input: "select",
    responsive: true,
    options: pageShadowTokens,
    // Unset renders no box-shadow — the schema default "none".
    fallback: "none",
  }),
  control({
    id: "block.style.borderColor",
    panel: "style",
    target: "block",
    label: "Border color",
    path: ["style", "borderColor"],
    input: "color",
    responsive: true,
  }),
  ...(["top", "right", "bottom", "left"] as const).flatMap((side) => [
    control({
      id: `block.style.padding.${side}`,
      panel: "spacing",
      target: "block",
      label: `Padding ${side}`,
      path: ["style", "padding", side],
      input: "number",
      responsive: true,
      clamp: { min: 0, max: 240 },
      // Unset sides render no padding — the schema default 0.
      fallback: 0,
    }),
    control({
      id: `block.style.margin.${side}`,
      panel: "spacing",
      target: "block",
      label: `Margin ${side}`,
      path: ["style", "margin", side],
      input: "number",
      responsive: true,
      clamp: { min: 0, max: 240 },
      // Unset sides render no margin — the schema default 0.
      fallback: 0,
    }),
  ]),
  control({
    id: "block.visibility.visible",
    panel: "visibility",
    target: "block",
    label: "Visible",
    path: ["visibility", "visible"],
    input: "switch",
    responsive: true,
    // Blocks are visible unless explicitly hidden (defaultBlockVisibility).
    fallback: true,
  }),
] as const;

/**
 * Shared per-block Typography cluster (TASK-424). It is exposed only on
 * typography-capable block types (never on sections) and writes the
 * token-backed `style.fontFamily/fontSize/fontWeight/lineHeight/letterSpacing`
 * fields owned by `pageDocumentV2`. Family/size/weight render as segmented
 * token selects; line height and letter spacing render as slider+stepper
 * controls with owner clamps.
 */
export const pageTypographyBlockControls: readonly PageEditorControlDefinition[] = [
  control({
    id: "block.style.fontFamily",
    panel: "typography",
    target: "block",
    label: "Font family",
    path: ["style", "fontFamily"],
    input: "segmented",
    responsive: true,
    options: pageTypographyFontFamilies,
  }),
  control({
    id: "block.style.fontSize",
    panel: "typography",
    target: "block",
    label: "Font size",
    path: ["style", "fontSize"],
    input: "segmented",
    responsive: true,
    options: pageTypographyFontSizes,
  }),
  control({
    id: "block.style.fontWeight",
    panel: "typography",
    target: "block",
    label: "Font weight",
    path: ["style", "fontWeight"],
    input: "segmented",
    responsive: true,
    options: pageTypographyFontWeights,
  }),
  control({
    id: "block.style.lineHeight",
    panel: "typography",
    target: "block",
    label: "Line height",
    path: ["style", "lineHeight"],
    input: "number",
    responsive: true,
    clamp: PAGE_TYPOGRAPHY_LINE_HEIGHT_CLAMP,
    step: 0.05,
    unit: "",
  }),
  control({
    id: "block.style.letterSpacing",
    panel: "typography",
    target: "block",
    label: "Letter spacing",
    path: ["style", "letterSpacing"],
    input: "number",
    responsive: true,
    clamp: PAGE_TYPOGRAPHY_LETTER_SPACING_CLAMP,
    step: 0.5,
    unit: "px",
    // The baked text classes set no tracking, so unset/null renders as the
    // CSS default `normal` (0px). Family/size/weight/line-height stay
    // fallback-less here: their unset state is the baked per-type styling,
    // owned and displayed via `pageBlockRenderDefaults.ts` (finding #9 r3).
    fallback: 0,
  }),
] as const;

/**
 * Typography-group presentation of the universal `block.style.align` control
 * for text-capable types without a `props.align` text-align path. The stored
 * path and id stay identical to the universal control — only the panel and
 * label move into the Typography group (TASK-424 relocation contract).
 */
const blockStyleTextAlignTypographyControl = control({
  id: "block.style.align",
  panel: "typography",
  target: "block",
  label: "Text align",
  path: ["style", "align"],
  input: "segmented",
  responsive: true,
  options: pageTextAlignments,
});

/**
 * Text-capable types whose text-align path is the universal `style.align`
 * (heading/text instead relocate their own `props.align` control). For these
 * types the accessor swaps the universal layout-panel presentation for the
 * Typography-group presentation; storage stays `style.align` either way.
 */
const styleAlignTypographyBlockTypes = new Set<PageBlockType>([
  "button",
  "list",
  "card",
  "statistic",
  "quote",
]);

export const getPageSectionVariantControl = (
  type: PageSectionType
): PageEditorControlDefinition | null => {
  const options = getPageSectionVariantOptions(type);
  if (options.length === 0) return null;
  return control({
    id: `section.${type}.variant`,
    panel: "layout",
    target: "section",
    label: "Variant",
    path: ["variant"],
    overridePath: ["variant"],
    input: "select",
    responsive: false,
    options,
  });
};

export const isPageSectionVariantOption = (
  type: PageSectionType,
  value: string
): value is PageSectionVariant =>
  getPageSectionVariantOptions(type).includes(value as PageSectionVariant);

export const pageBlockControlRegistry: Record<
  PageBlockType,
  readonly PageEditorControlDefinition[]
> = {
  heading: [
    blockPropControl("heading", "text", { label: "Primary text", input: "text" }),
    blockPropControl("heading", "level", {
      label: "Level",
      input: "select",
      options: pageHeadingLevels,
    }),
    ...pageTypographyBlockControls,
    // Relocated into the Typography group (TASK-424); stored path stays
    // props.align so existing documents and writes are untouched.
    blockPropControl("heading", "align", {
      label: "Text align",
      input: "segmented",
      panel: "typography",
      options: pageTextAlignments,
    }),
  ],
  text: [
    blockPropControl("text", "text", { label: "Primary text", input: "text" }),
    blockPropControl("text", "format", {
      label: "Format",
      input: "select",
      options: pageTextFormats,
    }),
    ...pageTypographyBlockControls,
    // Relocated into the Typography group (TASK-424); stored path stays
    // props.align so existing documents and writes are untouched.
    blockPropControl("text", "align", {
      label: "Text align",
      input: "segmented",
      panel: "typography",
      options: pageTextAlignments,
    }),
  ],
  button: [
    blockPropControl("button", "label", { label: "Primary text", input: "text" }),
    blockPropControl("button", "href", { label: "Button URL", input: "text" }),
    blockPropControl("button", "target", {
      label: "Target",
      input: "select",
      options: pageButtonTargets,
    }),
    blockPropControl("button", "variant", {
      label: "Variant",
      input: "select",
      options: pageButtonVariants,
    }),
    blockPropControl("button", "size", {
      label: "Size",
      input: "select",
      options: pageButtonSizes,
    }),
    ...pageTypographyBlockControls,
    blockStyleTextAlignTypographyControl,
  ],
  image: [
    blockPropControl("image", "src", { label: "Source", input: "media" }),
    blockPropControl("image", "alt", { label: "Alt text", input: "text" }),
    blockPropControl("image", "caption", { label: "Caption", input: "text" }),
    blockPropControl("image", "fit", {
      label: "Fit",
      input: "select",
      options: pageImageFits,
    }),
  ],
  video: [
    blockPropControl("video", "src", { label: "Source", input: "media" }),
    blockPropControl("video", "title", { label: "Title", input: "text" }),
    blockPropControl("video", "autoplay", { label: "Autoplay", input: "switch" }),
    blockPropControl("video", "muted", { label: "Muted", input: "switch" }),
  ],
  gallery: [],
  form: [
    // TASK-456: the form block Content panel. `formId` is a nullable
    // reference picked from the Forms admin through the dynamic "forms"
    // combobox source; `title` optionally overrides the resolved form name.
    blockPropControl("form", "formId", {
      label: "Form",
      input: "select",
      optionsSource: "forms",
    }),
    blockPropControl("form", "title", { label: "Title", input: "text" }),
  ],
  list: [
    blockPropControl("list", "items", { label: "Items", input: "items" }),
    blockPropControl("list", "ordered", { label: "Ordered", input: "switch" }),
    ...pageTypographyBlockControls,
    blockStyleTextAlignTypographyControl,
  ],
  card: [
    blockPropControl("card", "title", { label: "Title", input: "text" }),
    blockPropControl("card", "text", { label: "Body", input: "text" }),
    blockPropControl("card", "image", { label: "Image", input: "media" }),
    blockPropControl("card", "href", { label: "Link URL", input: "text" }),
    ...pageTypographyBlockControls,
    blockStyleTextAlignTypographyControl,
  ],
  collection: [
    // TASK-457: the collection block Content panel. `contentTypeId` binds the
    // listing to a content type; `queryId` optionally narrows it to a saved
    // listing query SCOPED to that type (the editor shell filters the source
    // by the current `contentTypeId` and clears the stored `queryId` when the
    // type changes); `limit` clamps to the single owner bound
    // (`PAGE_COLLECTION_LIMIT_CLAMP`, TASK-459-03 — schema, controls, and
    // runtime agree on 1..24); `templateId` optionally picks a listing
    // template. All three references are nullable in `pageBlockDefaultProps`,
    // so each combobox offers the "None" row.
    blockPropControl("collection", "contentTypeId", {
      label: "Content type",
      input: "select",
      optionsSource: "contentTypes",
    }),
    blockPropControl("collection", "queryId", {
      label: "Saved query",
      input: "select",
      optionsSource: "listingQueries",
      filterBy: "contentTypeId",
    }),
    blockPropControl("collection", "limit", {
      label: "Limit",
      input: "number",
      clamp: { min: PAGE_COLLECTION_LIMIT_CLAMP.min, max: PAGE_COLLECTION_LIMIT_CLAMP.max },
      // Entry count, not pixels: an explicit unitless readout.
      unit: "",
    }),
    blockPropControl("collection", "templateId", {
      label: "Listing template",
      input: "select",
      optionsSource: "listingTemplates",
    }),
    // TASK-459-03: visitor pagination. Mode "none" is the schema default
    // (existing pages render unchanged); "paged" renders the numbered pager +
    // totals, "load-more" the single next-page anchor. `pageSize` is nullable
    // — unset follows `limit` — and clamps to the same owner bound.
    blockPropControl("collection", "paginationMode", {
      label: "Pagination",
      input: "segmented",
      options: pageCollectionPaginationModes,
    }),
    blockPropControl("collection", "pageSize", {
      label: "Page size",
      input: "number",
      clamp: { min: PAGE_COLLECTION_LIMIT_CLAMP.min, max: PAGE_COLLECTION_LIMIT_CLAMP.max },
      unit: "",
    }),
  ],
  filters: [
    // TASK-459-02: the filters block Content panel. `queryId` binds the facet
    // form to a saved listing query (the SAME query a sibling collection
    // block lists, so visitor filters drive both); the facet builder commits
    // the canonical generic facet shapes; behavior toggles and labels cover
    // auto-apply, the free-text search row, the result count, and the no-JS
    // submit button.
    blockPropControl("filters", "queryId", {
      label: "Saved query",
      input: "select",
      optionsSource: "listingQueriesAll",
    }),
    blockPropControl("filters", "facets", { label: "Facets", input: "facets" }),
    blockPropControl("filters", "layout", {
      label: "Layout",
      input: "segmented",
      panel: "layout",
      options: pageFiltersBlockLayouts,
    }),
    blockPropControl("filters", "autoApply", { label: "Auto apply", input: "switch" }),
    blockPropControl("filters", "showSearch", { label: "Show search", input: "switch" }),
    blockPropControl("filters", "showCount", { label: "Show result count", input: "switch" }),
    blockPropControl("filters", "searchLabel", { label: "Search label", input: "text" }),
    blockPropControl("filters", "searchPlaceholder", {
      label: "Search placeholder",
      input: "text",
    }),
    blockPropControl("filters", "applyLabel", { label: "Apply button label", input: "text" }),
  ],
  embed: [],
  divider: [
    blockPropControl("divider", "tone", {
      label: "Tone",
      input: "select",
      options: pageDividerTones,
    }),
    blockPropControl("divider", "thickness", {
      label: "Thickness",
      input: "number",
      clamp: { min: 1, max: 16 },
    }),
  ],
  spacer: [
    blockPropControl("spacer", "size", {
      label: "Size",
      input: "number",
      clamp: { min: 0, max: 240 },
    }),
  ],
  statistic: [
    blockPropControl("statistic", "value", { label: "Value", input: "text" }),
    blockPropControl("statistic", "label", { label: "Label", input: "text" }),
    blockPropControl("statistic", "caption", { label: "Caption", input: "text" }),
    ...pageTypographyBlockControls,
    blockStyleTextAlignTypographyControl,
  ],
  icon: [],
  quote: [
    blockPropControl("quote", "text", { label: "Quote", input: "text" }),
    blockPropControl("quote", "cite", { label: "Cite", input: "text" }),
    ...pageTypographyBlockControls,
    blockStyleTextAlignTypographyControl,
  ],
  container: [],
  columns: [
    blockPropControl("columns", "count", {
      label: "Column count",
      input: "number",
      panel: "layout",
      clamp: { min: 1, max: 4 },
    }),
    blockPropControl("columns", "gap", {
      label: "Column gap",
      input: "number",
      panel: "spacing",
      clamp: { min: 0, max: 120 },
    }),
    blockPropControl("columns", "distribution", {
      label: "Distribution",
      input: "select",
      panel: "layout",
      options: pageColumnDistributions,
    }),
  ],
  group: [
    blockPropControl("group", "direction", {
      label: "Direction",
      input: "segmented",
      panel: "layout",
      options: pageGroupDirections,
    }),
    blockPropControl("group", "wrap", {
      label: "Wrap",
      input: "switch",
      panel: "layout",
    }),
    blockPropControl("group", "gap", {
      label: "Group gap",
      input: "number",
      panel: "spacing",
      clamp: { min: 0, max: 120 },
    }),
  ],
};

export const getPageEditorControlsForTarget = (target: {
  kind: PageEditorControlTarget;
  type: PageSectionType | PageBlockType;
}) => {
  if (target.kind === "section") {
    const type = target.type as PageSectionType;
    if (!pageSectionCapabilities[type]?.insertable) return [];
    const variantControl = getPageSectionVariantControl(type);
    return variantControl
      ? [...pageUniversalSectionControls, variantControl]
      : pageUniversalSectionControls;
  }
  const type = target.type as PageBlockType;
  if (!pageBlockCapabilities[type]?.editorInsertable) return [];
  // Types whose text-align relocates into the Typography group drop the
  // layout-panel presentation of the same stored field to avoid duplicates.
  const universalControls = styleAlignTypographyBlockTypes.has(type)
    ? pageUniversalBlockControls.filter((control) => control.id !== "block.style.align")
    : pageUniversalBlockControls;
  return [...universalControls, ...pageBlockControlRegistry[type]];
};

export const getPageSectionCapability = (type: PageSectionType) => pageSectionCapabilities[type];
export const getPageBlockCapability = (type: PageBlockType) => pageBlockCapabilities[type];

/**
 * Responsive panel contract (TASK-425-01). This block is the single owner of
 * the Responsive panel's control metadata: the canonical editor device
 * metadata (labels + canvas widths), the per-breakpoint hide-on-screen
 * toggles, and the per-field override-state projection consumed by the
 * panel's override list. The widgets themselves render in `PageEditor.tsx`
 * (TASK-425-02) through the shared editor control primitives.
 */

/**
 * Canonical editor device metadata: one shared source for the breakpoint
 * switcher labels, the canvas width readouts, and the editing-scope pill.
 * The widths are the editor canvas frame widths bracketed by the public
 * media bounds in `pageResponsiveCss.ts` (desktop >= 1024, tablet 640-1023,
 * mobile <= 639); `canvasDeviceFrameClassMap` in `PageEditor.tsx` must keep
 * its static Tailwind classes in sync with these values.
 */
export const pageEditorDeviceMetadata: Record<PageBreakpoint, { label: string; width: number }> = {
  desktop: { label: "Desktop", width: 1080 },
  tablet: { label: "Tablet", width: 744 },
  mobile: { label: "Mobile", width: 390 },
};

export type PageResponsiveHideToggle = {
  id: string;
  breakpoint: PageBreakpoint;
  label: string;
  /**
   * Schema-owned visibility path: the desktop toggle writes the BASE
   * `visibility.visible`, the tablet/mobile toggles write the existing
   * `responsive[bp].visibility.visible` override containers. No new schema
   * fields exist for hide-on-screen.
   */
  path: readonly ["visibility", "visible"];
};

/**
 * Per-breakpoint hide-on-screen toggles for the Responsive panel. They apply
 * to sections and blocks alike (both own `visibility.visible` plus the
 * responsive override container). Hiding on desktop hides every breakpoint
 * that does not override visibility, because tablet/mobile inherit the base.
 */
export const pageResponsiveHideToggles: readonly PageResponsiveHideToggle[] = pageBreakpoints.map(
  (breakpoint) => ({
    id: `responsive.hide.${breakpoint}`,
    breakpoint,
    label: `Hide on ${breakpoint}`,
    path: ["visibility", "visible"] as const,
  })
);

type PageResponsiveVisibilitySource = {
  visibility: { visible: boolean };
  responsive?: Partial<
    Record<Exclude<PageBreakpoint, "desktop">, { visibility?: { visible?: boolean } }>
  >;
};

/**
 * Effective visibility of a section/block at a breakpoint following the
 * cascade: tablet/mobile read their sparse override when present, otherwise
 * the desktop base. Mirrors `resolvePageSectionForBreakpoint` semantics.
 */
export const getPageResponsiveEffectiveVisible = (
  source: PageResponsiveVisibilitySource,
  breakpoint: PageBreakpoint
): boolean => {
  if (breakpoint === "desktop") return source.visibility.visible;
  return source.responsive?.[breakpoint]?.visibility?.visible ?? source.visibility.visible;
};

const isRecordValue = (value: unknown): value is Record<string, unknown> =>
  Boolean(value) && typeof value === "object" && !Array.isArray(value);

const hasNestedPathValue = (source: unknown, path: readonly string[]): boolean =>
  path.reduce<unknown>((current, key) => {
    if (!isRecordValue(current) || !(key in current)) return undefined;
    return current[key];
  }, source) !== undefined;

export type PageResponsiveOverrideEntryState = "base" | "override" | "inherited";

export type PageResponsiveOverrideEntry = {
  control: PageEditorControlDefinition;
  state: PageResponsiveOverrideEntryState;
};

/**
 * Projects every responsive-capable registry control of a target onto its
 * Base / Override / Inherited state for one breakpoint. `overrideSource` is
 * the target's sparse override record for that breakpoint
 * (`section.responsive[bp]` / `block.responsive[bp]`); on desktop every
 * field is `base` because desktop IS the cascade base. The Responsive
 * panel's override list renders these entries with reset-inheritance
 * actions; reset affordances may only appear for `override` entries.
 */
export const projectPageResponsiveOverrideEntries = (
  target: { kind: PageEditorControlTarget; type: PageSectionType | PageBlockType },
  breakpoint: PageBreakpoint,
  overrideSource: unknown
): PageResponsiveOverrideEntry[] =>
  getPageEditorControlsForTarget(target)
    .filter((definition) => definition.responsive)
    .map((definition) => ({
      control: definition,
      state:
        breakpoint === "desktop"
          ? "base"
          : hasNestedPathValue(overrideSource, definition.overridePath)
            ? "override"
            : "inherited",
    }));
