import {
  pageBackgroundTypes,
  pageBlockCapabilities,
  pageColumnDistributions,
  pageBlockWidths,
  pageButtonSizes,
  pageButtonTargets,
  pageButtonVariants,
  pageDividerTones,
  pageGroupDirections,
  pageHeadingLevels,
  pageImageFits,
  pageSectionAlignments,
  pageSectionCapabilities,
  pageSectionJustify,
  pageShadowTokens,
  pageTextAlignments,
  pageTextFormats,
  type PageBlockType,
  type PageSectionVariant,
  type PageSectionType,
} from "./pageDocumentV2";
import { getPageSectionVariantOptions } from "./pageSectionTemplates";

export type PageEditorControlTarget = "section" | "block";
export type PageEditorControlPanel =
  | "layout"
  | "content"
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
  | "media";

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
  clamp?: { min: number; max: number };
};

const control = (
  definition: Omit<PageEditorControlDefinition, "overridePath"> & {
    overridePath?: readonly string[];
  }
): PageEditorControlDefinition => ({
  ...definition,
  overridePath: definition.overridePath ?? definition.path,
});

const blockPropControl = (
  type: PageBlockType,
  key: string,
  definition: Pick<PageEditorControlDefinition, "label" | "input"> &
    Partial<Pick<PageEditorControlDefinition, "panel" | "options" | "clamp">>
) =>
  control({
    id: `block.${type}.props.${key}`,
    panel: definition.panel ?? "content",
    target: "block",
    label: definition.label,
    path: ["props", key],
    input: definition.input,
    responsive: true,
    ...(definition.options ? { options: definition.options } : {}),
    ...(definition.clamp ? { clamp: definition.clamp } : {}),
  });

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
] as const;

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
  }),
] as const;

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
    blockPropControl("heading", "align", {
      label: "Text align",
      input: "segmented",
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
    blockPropControl("text", "align", {
      label: "Text align",
      input: "segmented",
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
  form: [],
  list: [
    blockPropControl("list", "items", { label: "Items", input: "text" }),
    blockPropControl("list", "ordered", { label: "Ordered", input: "switch" }),
  ],
  card: [
    blockPropControl("card", "title", { label: "Title", input: "text" }),
    blockPropControl("card", "text", { label: "Body", input: "text" }),
    blockPropControl("card", "image", { label: "Image", input: "media" }),
    blockPropControl("card", "href", { label: "Link URL", input: "text" }),
  ],
  collection: [],
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
  ],
  icon: [],
  quote: [
    blockPropControl("quote", "text", { label: "Quote", input: "text" }),
    blockPropControl("quote", "cite", { label: "Cite", input: "text" }),
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
  return pageBlockCapabilities[type]?.editorInsertable
    ? [...pageUniversalBlockControls, ...pageBlockControlRegistry[type]]
    : [];
};

export const getPageSectionCapability = (type: PageSectionType) => pageSectionCapabilities[type];
export const getPageBlockCapability = (type: PageBlockType) => pageBlockCapabilities[type];
