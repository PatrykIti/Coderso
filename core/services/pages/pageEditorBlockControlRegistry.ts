import {
  ANIMATED_ICON_SIZE_CLAMP,
  ANIMATED_ICON_SPEED_CLAMP,
  PAGE_COLLECTION_LIMIT_CLAMP,
  PAGE_DIVIDER_WIDTH_CLAMP,
  SWITCHER_MAX_PANELS,
  animatedIconAnimations,
  animatedIconNames,
  pageBadgeIconPositions,
  pageBadgeIcons,
  pageBadgeShapes,
  pageBadgeSizes,
  pageBadgeVariants,
  pageBadgeWeights,
  pageBlockCapabilities,
  pageBreakpoints,
  pageButtonSizes,
  pageButtonTargets,
  pageButtonVariants,
  pageCollectionPaginationModes,
  pageColumnDistributions,
  pageDividerAligns,
  pageDividerTones,
  pageFiltersBlockLayouts,
  pageGalleryLayouts,
  pageGroupDirections,
  pageHeadingLevels,
  pageImageFits,
  pageSectionCapabilities,
  pageTextAlignments,
  pageTextFormats,
  pageMarqueeDirections,
  scrollHintGlyphs,
  switcherVariants,
  type PageBlockType,
  type PageBreakpoint,
  type PageSectionType,
} from "./pageDocumentV2";
import {
  FORM_EMBED_SUCCESS_BEHAVIORS,
  FORM_EMBED_TEXTAREA_ROWS_LIMITS,
} from "../../widgets/core/formEmbedContract";
import {
  blockPropControl,
  control,
  type PageEditorControlDefinition,
  type PageEditorControlTarget,
} from "./pageEditorControlDefinition";
import {
  blockStyleTextAlignTypographyControl,
  createLayoutCompositionControl,
  pageTypographyBlockControls,
  pageUniversalBlockControls,
  styleAlignTypographyBlockTypes,
} from "./pageEditorBlockStyleControls";
import {
  getPageSectionVariantControl,
  pageUniversalSectionControls,
} from "./pageEditorSectionControls";

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
    blockPropControl("text", "align", {
      label: "Text align",
      input: "segmented",
      panel: "typography",
      options: pageTextAlignments,
    }),
  ],
  badge: [
    blockPropControl("badge", "text", { label: "Text", input: "text" }),
    blockPropControl("badge", "variant", {
      label: "Variant",
      input: "segmented",
      options: pageBadgeVariants,
    }),
    blockPropControl("badge", "size", {
      label: "Size",
      input: "segmented",
      options: pageBadgeSizes,
    }),
    blockPropControl("badge", "shape", {
      label: "Shape",
      input: "segmented",
      options: pageBadgeShapes,
    }),
    blockPropControl("badge", "weight", {
      label: "Weight",
      input: "segmented",
      options: pageBadgeWeights,
    }),
    blockPropControl("badge", "background", {
      label: "Background",
      input: "color",
      panel: "background",
    }),
    blockPropControl("badge", "textColor", {
      label: "Text color",
      input: "color",
      panel: "style",
    }),
    blockPropControl("badge", "icon", {
      label: "Icon",
      input: "select",
      options: pageBadgeIcons,
    }),
    blockPropControl("badge", "iconPosition", {
      label: "Icon position",
      input: "segmented",
      options: pageBadgeIconPositions,
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
  gallery: [
    // TASK-539: all four gallery props are BASE-only — the public responsive
    // prop contract supports only heading/text alignment. Editing them while a
    // tablet/mobile device is active updates the base document.
    blockPropControl("gallery", "items", {
      label: "Gallery items",
      input: "galleryItems",
      panel: "content",
      responsive: false,
    }),
    blockPropControl("gallery", "layout", {
      label: "Layout",
      input: "segmented",
      panel: "style",
      options: pageGalleryLayouts,
      responsive: false,
    }),
    blockPropControl("gallery", "filterable", {
      label: "Filterable",
      input: "switch",
      panel: "content",
      responsive: false,
    }),
    blockPropControl("gallery", "filterCategories", {
      label: "Filter categories",
      input: "galleryCategoryTokens",
      panel: "content",
      responsive: false,
      // Category tokens exist only when filtering is enabled (base gate).
      showWhen: { path: ["props", "filterable"], equals: true },
    }),
  ],
  form: [
    blockPropControl("form", "formId", {
      label: "Form",
      input: "select",
      optionsSource: "forms",
    }),
    blockPropControl("form", "title", { label: "Title", input: "text" }),
    control({
      id: "block.form.props.textareaRows",
      panel: "content",
      target: "block",
      label: "Textarea rows",
      path: ["props", "textareaRows"],
      input: "number",
      responsive: false,
      clamp: {
        min: FORM_EMBED_TEXTAREA_ROWS_LIMITS.min,
        max: FORM_EMBED_TEXTAREA_ROWS_LIMITS.max,
      },
      unit: "",
    }),
    control({
      id: "block.form.props.showSelectPrompt",
      panel: "content",
      target: "block",
      label: "Show select prompt",
      path: ["props", "showSelectPrompt"],
      input: "switch",
      responsive: false,
    }),
    control({
      id: "block.form.props.loadingLabel",
      panel: "content",
      target: "block",
      label: "Loading label",
      path: ["props", "loadingLabel"],
      input: "text",
      responsive: false,
    }),
    control({
      id: "block.form.props.successBehavior",
      panel: "content",
      target: "block",
      label: "After successful submission",
      path: ["props", "successBehavior"],
      input: "select",
      responsive: false,
      options: FORM_EMBED_SUCCESS_BEHAVIORS,
    }),
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
      unit: "",
    }),
    blockPropControl("collection", "templateId", {
      label: "Listing template",
      input: "select",
      optionsSource: "listingTemplates",
    }),
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
    control({
      id: "block.collection.props.showCta",
      panel: "content",
      target: "block",
      label: "Show card action",
      path: ["props", "showCta"],
      input: "switch",
      responsive: false,
    }),
  ],
  filters: [
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
    // TASK-539: all five divider props are BASE-only (the responsive prop
    // contract supports only heading/text alignment); `width`/`align` appear
    // only when the base `gradient` rule is enabled, and a tablet/mobile
    // override can never open or close that gate.
    blockPropControl("divider", "tone", {
      label: "Tone",
      input: "select",
      options: pageDividerTones,
      responsive: false,
    }),
    blockPropControl("divider", "thickness", {
      label: "Thickness",
      input: "number",
      clamp: { min: 1, max: 16 },
      responsive: false,
    }),
    blockPropControl("divider", "gradient", {
      label: "Gradient rule",
      input: "switch",
      panel: "style",
      responsive: false,
    }),
    blockPropControl("divider", "width", {
      label: "Rule length",
      input: "number",
      panel: "style",
      clamp: PAGE_DIVIDER_WIDTH_CLAMP,
      unit: "px",
      responsive: false,
      showWhen: { path: ["props", "gradient"], equals: true },
    }),
    blockPropControl("divider", "align", {
      label: "Rule align",
      input: "segmented",
      panel: "style",
      options: pageDividerAligns,
      responsive: false,
      showWhen: { path: ["props", "gradient"], equals: true },
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
  icon: [
    blockPropControl("icon", "name", {
      label: "Icon",
      input: "select",
      options: animatedIconNames,
    }),
    blockPropControl("icon", "animation", {
      label: "Animation",
      panel: "style",
      input: "segmented",
      options: animatedIconAnimations,
    }),
    blockPropControl("icon", "size", {
      label: "Size",
      panel: "style",
      input: "number",
      clamp: { min: ANIMATED_ICON_SIZE_CLAMP.min, max: ANIMATED_ICON_SIZE_CLAMP.max },
      unit: "px",
    }),
    blockPropControl("icon", "speed", {
      label: "Speed",
      panel: "style",
      input: "number",
      clamp: { min: ANIMATED_ICON_SPEED_CLAMP.min, max: ANIMATED_ICON_SPEED_CLAMP.max },
      unit: "ms",
    }),
    blockPropControl("icon", "color", {
      label: "Color",
      panel: "style",
      input: "color",
    }),
  ],
  quote: [
    blockPropControl("quote", "text", { label: "Quote", input: "text" }),
    blockPropControl("quote", "cite", { label: "Cite", input: "text" }),
    ...pageTypographyBlockControls,
    blockStyleTextAlignTypographyControl,
  ],
  container: [createLayoutCompositionControl("container")],
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
    createLayoutCompositionControl("columns"),
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
    createLayoutCompositionControl("group"),
    control({
      id: "group.marquee.speed",
      panel: "style",
      target: "block",
      label: "Ticker speed",
      path: ["style", "marquee", "speed"],
      input: "number",
      responsive: false,
      clamp: { min: 8, max: 40 },
      unit: "s",
    }),
    control({
      id: "group.marquee.direction",
      panel: "style",
      target: "block",
      label: "Ticker direction",
      path: ["style", "marquee", "direction"],
      input: "select",
      responsive: false,
      options: pageMarqueeDirections,
    }),
    control({
      id: "group.marquee.seamless",
      panel: "style",
      target: "block",
      label: "Seamless loop",
      path: ["style", "marquee", "seamless"],
      input: "switch",
      responsive: false,
    }),
  ],
  customSvg: [
    blockPropControl("customSvg", "svg", {
      label: "SVG source",
      input: "text",
      panel: "content",
    }),
    blockPropControl("customSvg", "label", {
      label: "Accessible label",
      input: "text",
      panel: "content",
    }),
    blockPropControl("customSvg", "drawIn", {
      label: "Stroke draw-in",
      input: "switch",
      panel: "style",
    }),
    blockPropControl("customSvg", "drawSpeed", {
      label: "Draw speed",
      input: "number",
      panel: "style",
      clamp: { min: 600, max: 6000 },
      unit: "ms",
    }),
  ],
  switcher: [
    blockPropControl("switcher", "tabs", {
      label: "Tabs",
      input: "items",
      panel: "content",
    }),
    blockPropControl("switcher", "activeIndex", {
      label: "Default tab",
      input: "number",
      panel: "content",
      clamp: { min: 0, max: SWITCHER_MAX_PANELS - 1 },
    }),
    blockPropControl("switcher", "variant", {
      label: "Style",
      input: "segmented",
      panel: "style",
      options: switcherVariants,
    }),
    control({
      id: "block.switcher.props.ariaLabel",
      panel: "content",
      target: "block",
      label: "Tab list label",
      path: ["props", "ariaLabel"],
      input: "text",
      responsive: false,
    }),
  ],
  scrollHint: [
    blockPropControl("scrollHint", "glyph", {
      label: "Indicator",
      input: "segmented",
      panel: "style",
      options: scrollHintGlyphs,
    }),
    blockPropControl("scrollHint", "label", {
      label: "Accessible label",
      input: "text",
      panel: "content",
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
  const universalControls = styleAlignTypographyBlockTypes.has(type)
    ? pageUniversalBlockControls.filter((control) => control.id !== "block.style.align")
    : pageUniversalBlockControls;
  return [...universalControls, ...pageBlockControlRegistry[type]];
};

export const getPageSectionCapability = (type: PageSectionType) => pageSectionCapabilities[type];
export const getPageBlockCapability = (type: PageBlockType) => pageBlockCapabilities[type];

export const pageEditorDeviceMetadata: Record<PageBreakpoint, { label: string; width: number }> = {
  desktop: { label: "Desktop", width: 1080 },
  tablet: { label: "Tablet", width: 744 },
  mobile: { label: "Mobile", width: 390 },
};

export type PageResponsiveHideToggle = {
  id: string;
  breakpoint: PageBreakpoint;
  label: string;
  path: readonly ["visibility", "visible"];
};

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
