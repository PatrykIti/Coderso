export const POST_IMAGE_WRAP_VALUES = ["none", "left", "right"] as const;
export const POST_IMAGE_WIDTH_VALUES = [25, 33, 50, 66, 100] as const;
export const POST_IMAGE_MARGIN_VALUES = ["sm", "md", "lg"] as const;

export type PostImageWrap = (typeof POST_IMAGE_WRAP_VALUES)[number];
export type PostImageWidth = (typeof POST_IMAGE_WIDTH_VALUES)[number];
export type PostImageMargin = (typeof POST_IMAGE_MARGIN_VALUES)[number];

export type PostImageLayout = {
  wrap: PostImageWrap;
  widthPercent: PostImageWidth;
  marginPreset: PostImageMargin;
};

export const DEFAULT_POST_IMAGE_LAYOUT: PostImageLayout = {
  wrap: "none",
  widthPercent: 50,
  marginPreset: "md",
};

const wrapSet = new Set<string>(POST_IMAGE_WRAP_VALUES);
const widthSet = new Set<number>(POST_IMAGE_WIDTH_VALUES);
const marginSet = new Set<string>(POST_IMAGE_MARGIN_VALUES);

const parseWidthValue = (value: unknown) => {
  if (typeof value === "number" && Number.isFinite(value)) return Math.round(value);
  if (typeof value === "string" && value.trim().length > 0) {
    const parsed = Number(value.trim());
    if (Number.isFinite(parsed)) return Math.round(parsed);
  }
  return null;
};

export const normalizePostImageWrap = (value: unknown): PostImageWrap => {
  if (typeof value !== "string") return DEFAULT_POST_IMAGE_LAYOUT.wrap;
  const normalized = value.trim().toLowerCase();
  return wrapSet.has(normalized)
    ? (normalized as PostImageWrap)
    : DEFAULT_POST_IMAGE_LAYOUT.wrap;
};

export const normalizePostImageWidth = (value: unknown): PostImageWidth => {
  const parsed = parseWidthValue(value);
  if (parsed === null) return DEFAULT_POST_IMAGE_LAYOUT.widthPercent;
  return widthSet.has(parsed)
    ? (parsed as PostImageWidth)
    : DEFAULT_POST_IMAGE_LAYOUT.widthPercent;
};

export const normalizePostImageMargin = (value: unknown): PostImageMargin => {
  if (typeof value !== "string") return DEFAULT_POST_IMAGE_LAYOUT.marginPreset;
  const normalized = value.trim().toLowerCase();
  return marginSet.has(normalized)
    ? (normalized as PostImageMargin)
    : DEFAULT_POST_IMAGE_LAYOUT.marginPreset;
};

const isRecord = (value: unknown): value is Record<string, unknown> =>
  Boolean(value) && typeof value === "object" && !Array.isArray(value);

export const normalizePostImageLayout = (value: unknown): PostImageLayout => {
  if (!isRecord(value)) {
    return { ...DEFAULT_POST_IMAGE_LAYOUT };
  }
  return {
    wrap: normalizePostImageWrap(value.wrap),
    widthPercent: normalizePostImageWidth(value.widthPercent),
    marginPreset: normalizePostImageMargin(value.marginPreset),
  };
};

export const resolvePostImageLayoutFromAttrs = (
  attrs: Record<string, unknown>
): PostImageLayout =>
  normalizePostImageLayout({
    wrap: attrs.wrap,
    widthPercent: attrs.widthPercent,
    marginPreset: attrs.marginPreset,
  });

export const buildPostImageLayoutClasses = (layout: PostImageLayout) =>
  [
    "post-image-layout",
    `post-image-wrap-${layout.wrap}`,
    `post-image-width-${layout.widthPercent}`,
    `post-image-margin-${layout.marginPreset}`,
  ].join(" ");
