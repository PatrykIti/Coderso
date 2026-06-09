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
] as const;

const pageSectionVariants = [
  "default",
  "split",
  "centered",
  "full-width",
  "cards",
  "grid",
  "horizontal",
  "compact",
] as const;
const pageSectionAlignments = ["start", "center", "end", "stretch"] as const;
const pageSectionJustify = ["start", "center", "end", "between"] as const;
const pageShadowTokens = ["none", "sm", "md", "lg"] as const;
const pageBackgroundTypes = ["none", "color", "gradient", "image", "video"] as const;
const pageButtonTargets = ["self", "blank"] as const;
const pageButtonVariants = ["primary", "secondary", "ghost", "link"] as const;
const pageButtonSizes = ["sm", "md", "lg"] as const;
const pageTextFormats = ["plain", "rich"] as const;
const pageTextAlignments = ["left", "center", "right"] as const;
const pageHeadingLevels = ["h1", "h2", "h3", "h4", "h5", "h6"] as const;

export type PageBreakpoint = (typeof pageBreakpoints)[number];
export type PageSectionType = (typeof pageSectionTypes)[number];
export type PageBlockType = (typeof pageBlockTypes)[number];
export type PageSectionVariant = (typeof pageSectionVariants)[number];
export type PageSectionAlignment = (typeof pageSectionAlignments)[number];
export type PageSectionJustify = (typeof pageSectionJustify)[number];
export type PageShadowToken = (typeof pageShadowTokens)[number];
export type PageBackgroundType = (typeof pageBackgroundTypes)[number];

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

export type PageBlockStyleV2 = {
  align?: "left" | "center" | "right";
  width?: "auto" | "full";
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

const pageBlockPropKeys: Record<PageBlockType, readonly string[]> = {
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
};

const pageBlockDefaultProps: Record<PageBlockType, Record<string, unknown>> = {
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
};

export const pageDocumentV2JsonSchema: RecordValue = {
  type: "object",
  required: ["schemaVersion", "sections"],
  additionalProperties: false,
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
          responsive: { type: "object", additionalProperties: true },
          blocks: {
            type: "array",
            items: {
              type: "object",
              required: ["id", "type", "props", "visibility"],
              additionalProperties: false,
              properties: {
                id: { type: "string", minLength: 1 },
                type: { type: "string", enum: [...pageBlockTypes] },
                props: { type: "object", additionalProperties: true },
                style: { type: "object", additionalProperties: true },
                visibility: {
                  type: "object",
                  required: ["visible"],
                  additionalProperties: false,
                  properties: { visible: { type: "boolean" } },
                },
                responsive: { type: "object", additionalProperties: true },
              },
            },
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
  assertKnownKeys(input, ["columns", "align", "justify", "maxWidth"], path, mode);
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
  assertKnownKeys(input, ["align", "width"], path, mode);
  const result: PageBlockStyleV2 = {};
  if (input.align !== undefined) {
    result.align = normalizeEnum(input.align, pageTextAlignments, "left", `${path}.align`, mode);
  }
  if (input.width !== undefined) {
    result.width = normalizeEnum(
      input.width,
      ["auto", "full"] as const,
      "auto",
      `${path}.width`,
      mode
    );
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
  path: string
): Record<string, unknown> => {
  const input = requireRecord(value ?? {}, path, mode);
  assertKnownKeys(input, pageBlockPropKeys[type], path, mode);
  const defaults = pageBlockDefaultProps[type];
  const result: Record<string, unknown> = { ...defaults };

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
  if (key === "limit") return readNumber(value, 6, 1, 50);
  if (key === "ordered" || key === "autoplay" || key === "muted") return Boolean(value);
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
        : normalizeBlockProps(type, overrideInput.props, mode, `${path}.${breakpoint}.props`);
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

const normalizeBlock = (
  value: unknown,
  sectionIndex: number,
  blockIndex: number,
  mode: NormalizeMode
): PageBlockV2 => {
  const path = `sections.${sectionIndex}.blocks.${blockIndex}`;
  const input = requireRecord(value, path, mode);
  assertKnownKeys(input, ["id", "type", "props", "style", "visibility", "responsive"], path, mode);
  const type = normalizeEnum(input.type, pageBlockTypes, "text", `${path}.type`, mode);
  const style = normalizeBlockStyle(input.style, mode, `${path}.style`);
  const responsive = normalizeBlockResponsive(input.responsive, type, mode, `${path}.responsive`);
  return {
    id: normalizeId(input.id, "blk", blockIndex, mode),
    type,
    props: normalizeBlockProps(type, input.props, mode, `${path}.props`),
    ...(style ? { style } : {}),
    visibility: normalizeBlockVisibility(
      input.visibility,
      mode,
      `${path}.visibility`
    ) as PageBlockVisibilityV2,
    ...(responsive ? { responsive } : {}),
  };
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

const normalizeSection = (value: unknown, index: number, mode: NormalizeMode): PageSectionV2 => {
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
  const blocks = requireArray(input.blocks, `${path}.blocks`, mode).map((block, blockIndex) =>
    normalizeBlock(block, index, blockIndex, mode)
  );

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
  };
  return normalizeBlock(payload, 0, 0, "stored-read");
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
  return normalizeSection(payload, 0, "stored-read");
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

  const sections = requireArray(input.sections, "sections", mode).map((section, index) =>
    normalizeSection(section, index, mode)
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
  if (breakpoint === "desktop") return cloneRecord(section);
  const override = section.responsive[breakpoint];
  if (!override) return cloneRecord(section);

  return {
    ...cloneRecord(section),
    layout: { ...section.layout, ...(override.layout ?? {}) },
    style: { ...section.style, ...(override.style ?? {}) },
    spacing: { ...section.spacing, ...(override.spacing ?? {}) },
    visibility: { ...section.visibility, ...(override.visibility ?? {}) },
  };
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
