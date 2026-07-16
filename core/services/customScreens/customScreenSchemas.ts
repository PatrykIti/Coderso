import type { WidgetBlock } from "../../widgets/types";
import { ensureRuntimeWidgetsRegistered } from "../../widgets/runtime";
import { normalizeWidgetBlock } from "../../widgets/validator";
// TASK-503-01: block-level style channel reuses the exported page spacing clamp.
// services→services import is the menuDocumentV2 precedent; the Bun-free boundary
// bans only @/ui/pages imports. PAGE_BLOCK_BOX_SPACING_CLAMP = { min: 0, max: 240 }.
import { PAGE_BLOCK_BOX_SPACING_CLAMP } from "../pages/pageDocumentV2";
import {
  sanitizeAuthoringLinkHref,
  sanitizeAuthoringMediaUrl,
} from "../pages/pageAuthoringSanitizers";
import {
  isBindingWriteModeSupported,
  resolveCustomScreenBindingContracts,
} from "./bindingResolver";

export const customScreenBindingModes = ["read", "write", "readwrite"] as const;
export const customScreenStatusValues = ["draft", "active"] as const;
export const customScreenCollectionRoleValues = [
  "canonical-admin-screen",
  "secondary-admin-screen",
] as const;
export const customScreenRowClickModes = ["editor-view", "classic-editor"] as const;
export const customScreenCreateModes = ["editor-view", "drawer"] as const;
export const customScreenListColumnSources = ["system", "field"] as const;
export const customScreenListFormatters = [
  "text",
  "number",
  "boolean",
  "date",
  "select",
  "media",
  "relation",
] as const;
export const customScreenSortDirections = ["asc", "desc"] as const;
export const customScreenListFilterOperators = ["equals"] as const;

export type CustomScreenBindingMode = (typeof customScreenBindingModes)[number];
export type CustomScreenStatus = (typeof customScreenStatusValues)[number];
export type CustomScreenCollectionRole = (typeof customScreenCollectionRoleValues)[number];
export type CustomScreenDefinitionVersion = 1 | 2 | 3 | 4;
export type CustomScreenListColumnSource = (typeof customScreenListColumnSources)[number];
export type CustomScreenListFormatter = (typeof customScreenListFormatters)[number];
export type CustomScreenSortDirection = (typeof customScreenSortDirections)[number];
export type CustomScreenListFilterOperator = (typeof customScreenListFilterOperators)[number];

export type CustomScreenBinding = {
  id: string;
  widgetId: string;
  propPath: string;
  field: string;
  mode: CustomScreenBindingMode;
};

export type ScreenFieldBinding = {
  id: string;
  blockId: string;
  propPath: string;
  source: "entry";
  field: string;
  mode: CustomScreenBindingMode;
};

export type CustomScreenDefinitionV1 = {
  schemaVersion: 1;
  blocks: WidgetBlock[];
  bindings: CustomScreenBinding[];
};

export type CustomScreenListColumn = {
  id: string;
  source: CustomScreenListColumnSource;
  field: string;
  label: string;
  formatter: CustomScreenListFormatter;
  visible: boolean;
};

export type CustomScreenListFilter = {
  id: string;
  source: CustomScreenListColumnSource;
  field: string;
  label: string;
  operator: CustomScreenListFilterOperator;
  enabled: boolean;
};

export type CustomScreenListRowTemplate = {
  document: ScreenDocumentV1;
  bindings: ScreenFieldBinding[];
};

export type CustomScreenListViewDefinition = {
  columns: CustomScreenListColumn[];
  filters: CustomScreenListFilter[];
  defaultSort: {
    field: string;
    direction: CustomScreenSortDirection;
  };
  bulkActions: {
    delete: boolean;
    publish: boolean;
    unpublish: boolean;
  };
  rowTemplate?: CustomScreenListRowTemplate;
};

export type CustomScreenListViewDefinitionV2 = CustomScreenListViewDefinition & {
  rowClick: (typeof customScreenRowClickModes)[number];
  createMode: (typeof customScreenCreateModes)[number];
};

export type CustomScreenEditorViewDefinition = {
  blocks: WidgetBlock[];
  bindings: CustomScreenBinding[];
  saveMode: "entry";
  interactionMode: "inline";
};

export type ScreenBlockV1 = {
  id: string;
  type: string;
  label?: string;
  variant?: string;
  style?: ScreenBlockStyleV1;
  data: Record<string, unknown>;
  layout?: WidgetBlock["layout"];
  visibility?: WidgetBlock["visibility"];
  editor?: WidgetBlock["editor"];
  legacyWidgetType?: string;
  children?: ScreenBlockV1[];
  slots?: Record<string, ScreenBlockV1[]>;
};

export type ScreenSectionV1 = {
  id: string;
  type: "section";
  label?: string;
  data: Record<string, unknown>;
  layout?: WidgetBlock["layout"];
  visibility?: WidgetBlock["visibility"];
  style?: ScreenSectionStyleV1;
  blocks: ScreenBlockV1[];
};

export type ScreenDocumentV1 = {
  schemaVersion: 1;
  sections: ScreenSectionV1[];
};

export type CustomScreenEditorViewDefinitionV4 = {
  document: ScreenDocumentV1;
  bindings: ScreenFieldBinding[];
  saveMode: "entry";
  interactionMode: "inline";
};

export type CustomScreenDefinitionV2 = {
  schemaVersion: 2;
  listView: CustomScreenListViewDefinitionV2;
  editorView: {
    blocks: WidgetBlock[];
    bindings: CustomScreenBinding[];
    saveMode: "entry";
  };
};

export type CustomScreenDefinitionV3 = {
  schemaVersion: 3;
  listView: CustomScreenListViewDefinition;
  editorView: CustomScreenEditorViewDefinition;
};

export type CustomScreenDefinitionV4 = {
  schemaVersion: 4;
  listView: CustomScreenListViewDefinition;
  editorView: CustomScreenEditorViewDefinitionV4;
};

export type CustomScreenDefinition = CustomScreenDefinitionV4;
export type CustomScreenLegacyDefinition =
  | CustomScreenDefinitionV1
  | CustomScreenDefinitionV2
  | CustomScreenDefinitionV3;

export type CustomScreenSidebarConfig = {
  showInSidebar: boolean;
  sidebarLabel: string | null;
};

export type CustomScreenCollectionLink = {
  collectionRole: CustomScreenCollectionRole | null;
  compositionKey: string | null;
};

export type CustomScreenDefinitionContext = {
  contentType?: {
    id?: string;
    slug?: string;
    name?: string;
    schema?: {
      required?: string[];
      properties?: Record<string, unknown>;
    };
  } | null;
};

const supportedDefinitionVersions = new Set<CustomScreenDefinitionVersion>([1, 2, 3, 4]);
const bindingModes = new Set<CustomScreenBindingMode>(customScreenBindingModes);
const collectionRoles = new Set<CustomScreenCollectionRole>(customScreenCollectionRoleValues);
const unsafePathSegments = new Set(["__proto__", "prototype", "constructor"]);
const SCREEN_PATH_MAX = 160;
const SCREEN_PATH_SEGMENT_PATTERN_SOURCE = "[a-zA-Z0-9_-]+";
const SCREEN_PATH_BODY_PATTERN_SOURCE = `${SCREEN_PATH_SEGMENT_PATTERN_SOURCE}(?:\\.${SCREEN_PATH_SEGMENT_PATTERN_SOURCE})*`;
const SCREEN_PATH_PATTERN_SOURCE = `^${SCREEN_PATH_BODY_PATTERN_SOURCE}$`;
const SCREEN_PATH_PATTERN = new RegExp(SCREEN_PATH_PATTERN_SOURCE);
const SCREEN_UNSAFE_PATH_SEGMENT_PATTERN_SOURCE =
  "(^|\\.)(?:__proto__|prototype|constructor)(?:\\.|$)";
const SCREEN_BINDING_ID_MAX = 120;
const SCREEN_BINDING_ID_PATTERN_SOURCE = "^[a-z0-9]+(?:-[a-z0-9]+)*$";
const SCREEN_PATH_HASH_OFFSET = 0xcbf29ce484222325n;
const SCREEN_PATH_HASH_PRIME = 0x100000001b3n;
const columnSources = new Set<CustomScreenListColumnSource>(customScreenListColumnSources);
const listFormatters = new Set<CustomScreenListFormatter>(customScreenListFormatters);
const sortDirections = new Set<CustomScreenSortDirection>(customScreenSortDirections);
const filterOperators = new Set<CustomScreenListFilterOperator>(customScreenListFilterOperators);
export const defaultScreenSectionId = "section-default";
const systemListFields = new Set([
  "title",
  "slug",
  "status",
  "createdAt",
  "updatedAt",
  "publishedAt",
]);

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

type ScreenNormalizeMode = "write" | "stored-read";
type ScreenBindingNormalizeMode = ScreenNormalizeMode | "compatibility-write";
type ScreenFieldPathToken =
  | "definition"
  | "editorView"
  | "listView"
  | "rowTemplate"
  | "document"
  | "sections"
  | "blocks"
  | "children"
  | "slots"
  | "data"
  | "tabs"
  | "id"
  | "action"
  | "href"
  | "src";
type ScreenFieldPathSegment = ScreenFieldPathToken | number;
type GeneratedScreenFieldPath = string & { readonly __generated: unique symbol };

export const CUSTOM_SCREEN_ERROR_FIELDS_MAX = 8;
export const CUSTOM_SCREEN_ERROR_FIELD_PATH_MAX = 240;

const generatedFieldPath = (
  ...segments: ReadonlyArray<ScreenFieldPathSegment>
): GeneratedScreenFieldPath =>
  segments.join(".").slice(0, CUSTOM_SCREEN_ERROR_FIELD_PATH_MAX) as GeneratedScreenFieldPath;

const boundGeneratedFields = (fields: readonly GeneratedScreenFieldPath[]): string[] =>
  [...new Set(fields)]
    .slice(0, CUSTOM_SCREEN_ERROR_FIELDS_MAX)
    .map((field) => field.slice(0, CUSTOM_SCREEN_ERROR_FIELD_PATH_MAX));

export class CustomScreenDefinitionError extends Error {
  readonly code = "custom_screen_definition_invalid" as const;
  readonly fields: string[];

  constructor(fields: readonly GeneratedScreenFieldPath[] = []) {
    super("custom_screen_definition_invalid");
    this.name = "CustomScreenDefinitionError";
    this.fields = boundGeneratedFields(fields);
  }
}

const invalid = (...fields: readonly GeneratedScreenFieldPath[]): never => {
  throw new CustomScreenDefinitionError(fields);
};

const normalizeText = (value: unknown) => {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
};

const slugify = (value: string) =>
  value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)+/g, "");

const rejectUnknownKeys = (input: Record<string, unknown>, allowed: readonly string[]) => {
  const allowedSet = new Set(allowed);
  const unknown = Object.keys(input).find((key) => !allowedSet.has(key));
  if (unknown) throw new Error("custom_screen_definition_invalid");
};

const normalizePath = (value: unknown) => {
  const text = normalizeText(value);
  if (!text || !SCREEN_PATH_PATTERN.test(text)) {
    throw new Error("custom_screen_definition_invalid");
  }
  const segments = text.split(".");
  if (segments.some((segment) => segment.length === 0 || unsafePathSegments.has(segment))) {
    throw new Error("custom_screen_definition_invalid");
  }
  return text;
};

const stableScreenPathHash = (value: string) => {
  let hash = SCREEN_PATH_HASH_OFFSET;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= BigInt(value.charCodeAt(index));
    hash = BigInt.asUintN(64, hash * SCREEN_PATH_HASH_PRIME);
  }
  return hash.toString(36).padStart(13, "0");
};

const canonicalizeStoredScreenPath = (value: string) => {
  if (value.length <= SCREEN_PATH_MAX) return value;
  const suffix = `-${stableScreenPathHash(value)}`;
  return `${value.slice(0, SCREEN_PATH_MAX - suffix.length)}${suffix}`;
};

const canonicalizeScreenBindingId = (value: string, hashSeed = value) => {
  if (value.length <= SCREEN_BINDING_ID_MAX) return value;
  const suffix = `-${stableScreenPathHash(hashSeed)}`;
  const prefix = value.slice(0, SCREEN_BINDING_ID_MAX - suffix.length).replace(/-+$/g, "");
  return `${prefix}${suffix}`;
};

export const buildScreenFieldBindingId = (blockId: string, propPath: string) => {
  const slugSeed = `${blockId}-${propPath}`;
  const hashSeed = JSON.stringify([blockId, propPath]);
  const hash = stableScreenPathHash(hashSeed);
  const maxPrefixLength = SCREEN_BINDING_ID_MAX - hash.length - 1;
  const readablePrefix = slugify(slugSeed) || "binding";
  const boundedPrefix = readablePrefix.slice(0, maxPrefixLength).replace(/-+$/g, "") || "binding";
  return `${boundedPrefix}-${hash}`;
};

const normalizeScreenPath = (
  value: unknown,
  mode: ScreenBindingNormalizeMode,
  canonicalizeStoredOverflow = true
) => {
  const normalized = normalizePath(value);
  if (
    mode !== "stored-read" &&
    (typeof value !== "string" || value !== normalized || normalized.length > SCREEN_PATH_MAX)
  ) {
    throw new Error("custom_screen_definition_invalid");
  }
  return mode === "stored-read" && canonicalizeStoredOverflow
    ? canonicalizeStoredScreenPath(normalized)
    : normalized;
};

const normalizeBindingMode = (value: unknown): CustomScreenBindingMode => {
  const mode = normalizeText(value) ?? "readwrite";
  if (!bindingModes.has(mode as CustomScreenBindingMode)) {
    throw new Error("custom_screen_definition_invalid");
  }
  return mode as CustomScreenBindingMode;
};

const readContentSchemaProperties = (context?: CustomScreenDefinitionContext) => {
  const properties = context?.contentType?.schema?.properties;
  if (!properties || typeof properties !== "object" || Array.isArray(properties)) {
    return {};
  }
  return properties;
};

const getSchemaFieldNames = (context?: CustomScreenDefinitionContext) =>
  new Set(Object.keys(readContentSchemaProperties(context)));

const getAllowedBindingFieldRoots = (context?: CustomScreenDefinitionContext) => {
  const schemaFields = getSchemaFieldNames(context);
  if (schemaFields.size === 0) return null;
  return new Set([...systemListFields, ...schemaFields]);
};

const assertFieldAllowed = (
  field: string,
  source: CustomScreenListColumnSource,
  context?: CustomScreenDefinitionContext
) => {
  if (source === "system") {
    if (!systemListFields.has(field)) {
      throw new Error("custom_screen_definition_invalid");
    }
    return;
  }

  const schemaFields = getSchemaFieldNames(context);
  if (schemaFields.size > 0 && !schemaFields.has(field)) {
    throw new Error("custom_screen_definition_invalid");
  }
};

const normalizeBoolean = (value: unknown, fallback: boolean) =>
  typeof value === "boolean" ? value : fallback;

const normalizeStringEnum = <T extends string>(value: unknown, allowed: Set<T>, fallback: T): T => {
  const normalized = normalizeText(value) ?? fallback;
  if (!allowed.has(normalized as T)) {
    throw new Error("custom_screen_definition_invalid");
  }
  return normalized as T;
};

export function normalizeCustomScreenSchemaVersion(value: unknown): CustomScreenDefinitionVersion {
  if (value === undefined || value === null) return 1;
  if (typeof value !== "number" || !Number.isFinite(value) || Math.floor(value) !== value) {
    throw new Error("custom_screen_definition_invalid");
  }
  if (!supportedDefinitionVersions.has(value as CustomScreenDefinitionVersion)) {
    throw new Error("custom_screen_definition_invalid");
  }
  return value as CustomScreenDefinitionVersion;
}

const normalizeJsonValue = (value: unknown): unknown => {
  if (
    value === null ||
    typeof value === "string" ||
    typeof value === "number" ||
    typeof value === "boolean"
  ) {
    return value;
  }
  if (Array.isArray(value)) return value.map(normalizeJsonValue);
  if (!isRecord(value)) throw new Error("custom_screen_definition_invalid");
  return Object.fromEntries(
    Object.entries(value).map(([key, item]) => {
      if (unsafePathSegments.has(key)) throw new Error("custom_screen_definition_invalid");
      return [key, normalizeJsonValue(item)];
    })
  );
};

const retiredScreenWidgetTypes = new Set([
  "screen-record-header",
  "screen-field-value",
  "screen-field-group",
  "screen-two-column",
]);

const normalizeLegacyScreenWidgetBlock = (value: unknown): WidgetBlock | null => {
  if (!isRecord(value)) return null;
  const type = normalizeText(value.type);
  if (!type || !retiredScreenWidgetTypes.has(type)) return null;
  const id = normalizeText(value.id);
  if (!id) throw new Error("custom_screen_definition_invalid");
  const data = normalizeJsonValue(value.data ?? {});
  if (!isRecord(data)) throw new Error("custom_screen_definition_invalid");
  const variant = normalizeText(value.variant);
  const slots = isRecord(value.slots)
    ? Object.fromEntries(
        Object.entries(value.slots).map(([slotId, items]) => {
          if (!Array.isArray(items)) return [slotId, []];
          return [slotId, items.map((item) => normalizeLegacyScreenWidgetBlock(item) ?? item)];
        })
      )
    : undefined;
  const children = Array.isArray(value.children)
    ? value.children.map((item) => normalizeLegacyScreenWidgetBlock(item) ?? item)
    : undefined;

  return {
    id,
    type,
    ...(variant ? { variant } : {}),
    data,
    ...(isRecord(value.layout) ? { layout: value.layout as WidgetBlock["layout"] } : {}),
    ...(isRecord(value.visibility)
      ? { visibility: value.visibility as WidgetBlock["visibility"] }
      : {}),
    ...(isRecord(value.editor) ? { editor: value.editor as WidgetBlock["editor"] } : {}),
    ...(children ? { children: children as WidgetBlock[] } : {}),
    ...(slots ? { slots: slots as Record<string, WidgetBlock[]> } : {}),
  };
};

export function normalizeCustomScreenBlocks(value: unknown): WidgetBlock[] {
  if (value === undefined || value === null) return [];
  if (!Array.isArray(value)) {
    throw new Error("custom_screen_definition_invalid");
  }
  ensureRuntimeWidgetsRegistered();
  return value.map((item) => normalizeLegacyScreenWidgetBlock(item) ?? normalizeWidgetBlock(item));
}

const normalizeScreenData = (value: unknown): Record<string, unknown> => {
  if (value === undefined || value === null) return {};
  const normalized = normalizeJsonValue(value);
  if (!isRecord(normalized)) throw new Error("custom_screen_definition_invalid");
  return normalized;
};

const screenBlockDataAllowedKeys = {
  heading: ["label", "text", "level", "align", "field"],
  text: ["content", "tone", "label"],
  stat: ["label", "format", "trend", "deltaField", "field"],
  divider: ["variant", "label"],
  image: ["label", "fit", "ratio", "field", "src"],
  "related-list": ["label", "target", "displayField", "variant", "limit", "field"],
  tabs: ["label", "tabs"],
  button: ["label", "action", "variant", "href", "field"],
} as const satisfies Record<string, readonly string[]>;

const compatibilityScreenBlockTypes = [
  "field",
  "field-group",
  "record-header",
  "columns",
  "rich-text",
  "legacy-widget",
] as const;

type FixedScreenBlockType = keyof typeof screenBlockDataAllowedKeys;

export type ScreenTabItem = Readonly<{ id: string; label: string }>;
export const SCREEN_TAB_ID = /^[a-z][a-z0-9_-]{0,63}$/;
export const SCREEN_TABS_MIN = 1;
export const SCREEN_TABS_MAX = 24;
export const SCREEN_TAB_LABEL_MAX = 120;
export const SCREEN_DOCUMENT_SECTIONS_MAX = 120;
export const SCREEN_BLOCK_COLLECTION_MAX = 500;
const SCREEN_MEDIA_ASSET_UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const screenCodePoints = (value: string) => Array.from(value);
const screenCodePointLength = (value: string) => screenCodePoints(value).length;
const truncateScreenCodePoints = (value: string, maximum: number) =>
  screenCodePoints(value).slice(0, maximum).join("");

export function isScreenMediaAssetUuid(value: unknown): value is string {
  return typeof value === "string" && SCREEN_MEDIA_ASSET_UUID.test(value);
}

const coerceScreenEnum = <T extends string>(
  value: unknown,
  allowed: readonly T[],
  fallback: T
): T => (typeof value === "string" && allowed.includes(value as T) ? (value as T) : fallback);

const clampScreenInt = (value: unknown, fallback: number, min: number, max: number): number => {
  const n = typeof value === "number" && Number.isFinite(value) ? Math.floor(value) : fallback;
  return Math.min(max, Math.max(min, n));
};

// TASK-503-01: block-level style channel — a validated, sparse, additive subset on
// ScreenBlockV1. Consumed by the renderer (503-02 class maps + inline style) and the
// inspector Layout group (503-03). Enums coerce, ints clamp (coerce-not-throw, the
// screen module's value style); only unknown KEYS throw (rejectUnknownKeys).
export const screenBlockWidths = ["auto", "full", "half", "third", "two-thirds"] as const;
export const screenBlockAligns = ["start", "center", "end", "stretch"] as const;
export const screenImageRatios = ["auto", "1/1", "4/3", "16/9", "3/2"] as const;
export const SCREEN_BLOCK_MIN_HEIGHT_CLAMP = { min: 0, max: 640 } as const;
export const screenBlockBoxSides = ["top", "right", "bottom", "left"] as const;

export type ScreenBlockWidth = (typeof screenBlockWidths)[number];
export type ScreenBlockAlign = (typeof screenBlockAligns)[number];
export type ScreenImageRatio = (typeof screenImageRatios)[number];
export type ScreenBlockBoxSpacingV1 = Partial<Record<(typeof screenBlockBoxSides)[number], number>>;
export type ScreenBlockStyleV1 = {
  width?: ScreenBlockWidth;
  minHeight?: number; // clamped int px 0..640 — height as min-height, content-safe
  margin?: ScreenBlockBoxSpacingV1; // per-side clamped ints, PAGE_BLOCK_BOX_SPACING_CLAMP
  padding?: ScreenBlockBoxSpacingV1;
  align?: ScreenBlockAlign;
};

const screenBlockStyleAllowedKeys = ["width", "minHeight", "margin", "padding", "align"] as const;

// Per-side box spacing: junk container drops (never throws); an unknown SIDE key throws;
// each present side clamps via the exported page clamp (non-number → min). Prunes empty.
const normalizeScreenBlockBoxSpacing = (value: unknown): ScreenBlockBoxSpacingV1 | undefined => {
  if (!isRecord(value)) return undefined;
  rejectUnknownKeys(value, screenBlockBoxSides);
  const out: ScreenBlockBoxSpacingV1 = {};
  for (const side of screenBlockBoxSides) {
    if (value[side] === undefined) continue;
    out[side] = clampScreenInt(
      value[side],
      PAGE_BLOCK_BOX_SPACING_CLAMP.min,
      PAGE_BLOCK_BOX_SPACING_CLAMP.min,
      PAGE_BLOCK_BOX_SPACING_CLAMP.max
    );
  }
  return Object.keys(out).length > 0 ? out : undefined;
};

// absent/null/non-record → undefined (no throw, byte-stable); unknown style key throws;
// values coerce/clamp; empty (all-junk / {}) prunes to undefined so it never persists.
const normalizeScreenBlockStyle = (value: unknown): ScreenBlockStyleV1 | undefined => {
  if (value === undefined || value === null) return undefined;
  if (!isRecord(value)) return undefined;
  rejectUnknownKeys(value, screenBlockStyleAllowedKeys);
  const margin = normalizeScreenBlockBoxSpacing(value.margin);
  const padding = normalizeScreenBlockBoxSpacing(value.padding);
  const style: ScreenBlockStyleV1 = {
    ...(value.width !== undefined
      ? { width: coerceScreenEnum(value.width, screenBlockWidths, "auto") }
      : {}),
    ...(value.minHeight !== undefined
      ? {
          minHeight: clampScreenInt(
            value.minHeight,
            SCREEN_BLOCK_MIN_HEIGHT_CLAMP.min,
            SCREEN_BLOCK_MIN_HEIGHT_CLAMP.min,
            SCREEN_BLOCK_MIN_HEIGHT_CLAMP.max
          ),
        }
      : {}),
    ...(margin ? { margin } : {}),
    ...(padding ? { padding } : {}),
    ...(value.align !== undefined
      ? { align: coerceScreenEnum(value.align, screenBlockAligns, "start") }
      : {}),
  };
  return Object.keys(style).length > 0 ? style : undefined;
};

// TASK-505-01: section-level style channel — a NEW additive channel on ScreenSectionV1
// (does NOT reuse the dead `layout` field; retyping `layout` to an enum-validated shape
// would THROW on legacy WidgetLayout docs — not byte-safe). Mirrors ScreenBlockStyleV1
// exactly: enums coerce, ints clamp (coerce-not-throw), only unknown KEYS throw.
// `columns` absent → today's vertical `space-y-4` stack (byte-identical DOM).
export const screenSectionColumnPresets = [
  "1",
  "2",
  "3",
  "4",
  "1-1",
  "1-2",
  "2-1",
  "1-3",
  "3-1",
  "2-3",
  "3-2",
  "1-1-1",
  "1-1-1-1",
] as const;
export type ScreenSectionColumnPreset = (typeof screenSectionColumnPresets)[number];

export const SCREEN_SECTION_COLUMN_GAP_CLAMP = { min: 0, max: 64 } as const;

export type ScreenSectionStyleV1 = {
  columns?: ScreenSectionColumnPreset; // absent → vertical stack (unchanged)
  columnGap?: number; // clamped int px 0..64
};

const screenSectionStyleAllowedKeys = ["columns", "columnGap"] as const;

// Preset → grid-template-columns fr-ratio map. EXPORTED as the single source of truth;
// 505-02 renderer emits `gridTemplateColumns: screenSectionColumnTemplate[preset]`.
// Owner's `3/4 : 1/4` = "3-1" → "3fr 1fr"; `1/4 : 3/4` = "1-3" → "1fr 3fr".
export const screenSectionColumnTemplate: Record<ScreenSectionColumnPreset, string> = {
  "1": "1fr",
  "2": "1fr 1fr",
  "3": "1fr 1fr 1fr",
  "4": "1fr 1fr 1fr 1fr",
  "1-1": "1fr 1fr",
  "1-2": "1fr 2fr",
  "2-1": "2fr 1fr",
  "1-3": "1fr 3fr",
  "3-1": "3fr 1fr",
  "2-3": "2fr 3fr",
  "3-2": "3fr 2fr",
  "1-1-1": "1fr 1fr 1fr",
  "1-1-1-1": "1fr 1fr 1fr 1fr",
};

// absent/null/non-record → undefined (no throw, byte-stable); unknown style KEY throws;
// values coerce/clamp; empty ({} / all-junk) prunes to undefined so it NEVER persists.
const normalizeScreenSectionStyle = (value: unknown): ScreenSectionStyleV1 | undefined => {
  if (value === undefined || value === null) return undefined;
  if (!isRecord(value)) return undefined;
  rejectUnknownKeys(value, screenSectionStyleAllowedKeys); // unknown KEY → invalid
  const style: ScreenSectionStyleV1 = {
    ...(value.columns !== undefined
      ? { columns: coerceScreenEnum(value.columns, screenSectionColumnPresets, "1") }
      : {}),
    ...(value.columnGap !== undefined
      ? {
          columnGap: clampScreenInt(
            value.columnGap,
            SCREEN_SECTION_COLUMN_GAP_CLAMP.min, // fallback = min (junk → 0)
            SCREEN_SECTION_COLUMN_GAP_CLAMP.min,
            SCREEN_SECTION_COLUMN_GAP_CLAMP.max
          ),
        }
      : {}),
  };
  return Object.keys(style).length > 0 ? style : undefined;
};

// TASK-505-01 (Item B): transient, NEVER-persisted binding-GC warning surfaced on the
// PATCH 200 response record (505-03 renders it). Declared + exported HERE (single
// declaring file); customScreenService.ts only re-exposes it on the returned record.
export type CustomScreenBindingWarning = {
  code: "binding_field_removed" | "binding_block_removed";
  fields: string[]; // offending content-type field name(s), source order, de-duped
};

// TASK-505-01 (Item B): an OPTIONAL, caller-supplied mutable out-param threaded top-down
// through the WRITE normalizers. Pruned orphan field names accumulate by SIDE-EFFECT — no
// normalizer changes its return type. The service reads it AFTER the call (B5). ForRead
// variants pass a DISCARD instance to prune silently (optional read-repair cleanup).
export type ScreenBindingWarningSink = {
  removedFieldOrphans: string[];
  removedBlockOrphans: string[];
};

const isFixedScreenBlockType = (type: string): type is FixedScreenBlockType =>
  Object.prototype.hasOwnProperty.call(screenBlockDataAllowedKeys, type);
const compatibilityScreenBlockTypeSet = new Set<string>(compatibilityScreenBlockTypes);
const isCompatibilityScreenBlockType = (type: string) => compatibilityScreenBlockTypeSet.has(type);
const hasScreenAuthoringUrlAsciiControl = (value: string): boolean => {
  for (let index = 0; index < value.length; index += 1) {
    const codeUnit = value.charCodeAt(index);
    if (codeUnit <= 0x1f || codeUnit === 0x7f) return true;
  }
  return false;
};

export function sanitizeScreenAuthoringUrl(value: unknown, kind: "link" | "media"): string | null {
  if (typeof value !== "string") return null;
  if (hasScreenAuthoringUrlAsciiControl(value) || value.includes("\\")) return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  return kind === "link" ? sanitizeAuthoringLinkHref(trimmed) : sanitizeAuthoringMediaUrl(trimmed);
}

// Retained delegating compatibility export after the Inspector and renderer migrated to
// sanitizeScreenAuthoringUrl directly.
export const normalizeScreenImageSrc = (value: unknown): string =>
  sanitizeScreenAuthoringUrl(value, "media") ?? "";

const normalizeScreenUrl = (
  value: unknown,
  kind: "link" | "media",
  mode: ScreenNormalizeMode,
  path: GeneratedScreenFieldPath
): string | undefined => {
  if (value === undefined || value === "") return undefined;
  if (value === null || typeof value !== "string") {
    if (mode === "write") invalid(path);
    return undefined;
  }
  const safe = sanitizeScreenAuthoringUrl(value, kind);
  if (safe !== null) return safe;
  if (mode === "write") invalid(path);
  return undefined;
};

const normalizeOptionalStringProperty = (
  data: Record<string, unknown>,
  key: string,
  mode: ScreenNormalizeMode
) => {
  if (!(key in data)) return;
  if (typeof data[key] === "string") return;
  if (mode === "write") invalid();
  delete data[key];
};

const normalizeOptionalPathProperty = (
  data: Record<string, unknown>,
  key: string,
  mode: ScreenNormalizeMode,
  allowEmpty: boolean
) => {
  if (!(key in data)) return;
  const value = data[key];
  if (allowEmpty && value === "") return;
  try {
    const normalized = normalizeScreenPath(value, mode, false);
    if (normalized.length > SCREEN_PATH_MAX) throw new Error("path_too_long");
    data[key] = normalized;
  } catch {
    if (mode === "write") invalid();
    delete data[key];
  }
};

const normalizeOptionalEnumProperty = <T extends string>(
  data: Record<string, unknown>,
  key: string,
  values: readonly T[],
  fallback: T,
  mode: ScreenNormalizeMode
) => {
  if (!(key in data)) return;
  const value = data[key];
  if (typeof value === "string" && values.includes(value as T)) return;
  if (mode === "write") invalid();
  data[key] = fallback;
};

const normalizeOptionalIntegerProperty = (
  data: Record<string, unknown>,
  key: string,
  fallback: number,
  min: number,
  max: number,
  mode: ScreenNormalizeMode
) => {
  if (!(key in data)) return;
  const value = data[key];
  if (
    typeof value === "number" &&
    Number.isFinite(value) &&
    Number.isInteger(value) &&
    value >= min &&
    value <= max
  ) {
    return;
  }
  if (mode === "write") invalid();
  data[key] = clampScreenInt(value, fallback, min, max);
};

const normalizeTabsForWrite = (
  raw: unknown,
  blockPath: readonly ScreenFieldPathSegment[]
): ScreenTabItem[] => {
  if (!Array.isArray(raw) || raw.length < SCREEN_TABS_MIN || raw.length > SCREEN_TABS_MAX) {
    invalid(generatedFieldPath(...blockPath, "data", "tabs"));
  }
  const tabs = raw as unknown[];
  const seen = new Set<string>();
  let changed = false;
  const normalized = tabs.map((item, index) => {
    if (!isRecord(item)) {
      invalid(generatedFieldPath(...blockPath, "data", "tabs", index));
    }
    const tab = item as Record<string, unknown>;
    try {
      rejectUnknownKeys(tab, ["id", "label"]);
    } catch {
      invalid(generatedFieldPath(...blockPath, "data", "tabs", index));
    }
    const id = typeof tab.id === "string" ? tab.id.trim() : "";
    const label = typeof tab.label === "string" ? tab.label.trim() : "";
    if (!SCREEN_TAB_ID.test(id) || seen.has(id)) {
      invalid(generatedFieldPath(...blockPath, "data", "tabs", index, "id"));
    }
    if (!label || screenCodePointLength(label) > SCREEN_TAB_LABEL_MAX) {
      invalid(generatedFieldPath(...blockPath, "data", "tabs", index));
    }
    seen.add(id);
    if (id === tab.id && label === tab.label) return tab as ScreenTabItem;
    changed = true;
    return { id, label };
  });
  return changed ? normalized : (tabs as ScreenTabItem[]);
};

const normalizeScreenBlockData = (
  type: string,
  value: unknown,
  mode: ScreenNormalizeMode,
  blockPath: readonly ScreenFieldPathSegment[]
): Record<string, unknown> => {
  const fixedType = isFixedScreenBlockType(type);
  if (mode === "write") {
    if (!fixedType && !isCompatibilityScreenBlockType(type)) invalid();
    if (!isRecord(value)) invalid();
  }
  const data = normalizeScreenData(value);
  if (!fixedType) return data;
  try {
    rejectUnknownKeys(data, screenBlockDataAllowedKeys[type]);
  } catch {
    invalid();
  }

  switch (type) {
    case "heading":
      normalizeOptionalStringProperty(data, "label", mode);
      normalizeOptionalStringProperty(data, "text", mode);
      normalizeOptionalIntegerProperty(data, "level", 2, 1, 3, mode);
      normalizeOptionalEnumProperty(data, "align", ["left", "center", "right"], "left", mode);
      normalizeOptionalPathProperty(data, "field", mode, false);
      break;
    case "text":
      normalizeOptionalStringProperty(data, "content", mode);
      normalizeOptionalEnumProperty(data, "tone", ["default", "muted"], "default", mode);
      normalizeOptionalStringProperty(data, "label", mode);
      break;
    case "stat":
      normalizeOptionalStringProperty(data, "label", mode);
      normalizeOptionalEnumProperty(data, "format", ["number", "percent", "money"], "number", mode);
      normalizeOptionalEnumProperty(data, "trend", ["auto", "up", "down", "flat"], "auto", mode);
      normalizeOptionalPathProperty(data, "deltaField", mode, true);
      normalizeOptionalPathProperty(data, "field", mode, false);
      break;
    case "divider":
      normalizeOptionalEnumProperty(data, "variant", ["line", "space", "label"], "line", mode);
      normalizeOptionalStringProperty(data, "label", mode);
      break;
    case "image": {
      normalizeOptionalStringProperty(data, "label", mode);
      normalizeOptionalEnumProperty(data, "fit", ["cover", "contain"], "cover", mode);
      normalizeOptionalStringProperty(data, "ratio", mode);
      normalizeOptionalPathProperty(data, "field", mode, false);
      if ("src" in data) {
        const src = normalizeScreenUrl(
          data.src,
          "media",
          mode,
          generatedFieldPath(...blockPath, "data", "src")
        );
        if (src === undefined) delete data.src;
        else data.src = src;
      }
      break;
    }
    case "related-list":
      normalizeOptionalStringProperty(data, "label", mode);
      normalizeOptionalPathProperty(data, "target", mode, true);
      normalizeOptionalPathProperty(data, "displayField", mode, true);
      normalizeOptionalEnumProperty(
        data,
        "variant",
        ["checklist", "activity", "cards"],
        "checklist",
        mode
      );
      normalizeOptionalIntegerProperty(data, "limit", 5, 1, 50, mode);
      normalizeOptionalPathProperty(data, "field", mode, false);
      break;
    case "tabs":
      normalizeOptionalStringProperty(data, "label", mode);
      data.tabs = normalizeTabsForWrite(data.tabs, blockPath);
      break;
    case "button": {
      normalizeOptionalStringProperty(data, "label", mode);
      if ("action" in data && data.action !== "link") {
        if (mode === "write") {
          invalid(generatedFieldPath(...blockPath, "data", "action"));
        }
        data.action = "link";
        delete data.href;
      }
      normalizeOptionalEnumProperty(
        data,
        "variant",
        ["primary", "secondary", "ghost"],
        "primary",
        mode
      );
      normalizeOptionalPathProperty(data, "field", mode, false);
      if ("href" in data) {
        const href = normalizeScreenUrl(
          data.href,
          "link",
          mode,
          generatedFieldPath(...blockPath, "data", "href")
        );
        if (href === undefined) delete data.href;
        else data.href = href;
      }
      break;
    }
  }
  return data;
};

const sameSet = (left: readonly string[], right: readonly string[]) =>
  left.length === right.length && left.every((value) => right.includes(value));

const assertTabSlots = (block: ScreenBlockV1, blockPath: readonly ScreenFieldPathSegment[]) => {
  if (block.type !== "tabs") return;
  const tabs = block.data.tabs as ScreenTabItem[];
  const tabIds = tabs.map((tab) => tab.id);
  const slotIds = Object.keys(block.slots ?? {});
  if (!sameSet(tabIds, slotIds)) {
    invalid(
      generatedFieldPath(...blockPath, "data", "tabs"),
      generatedFieldPath(...blockPath, "slots")
    );
  }
};

const screenBlockTypeFromWidgetType = (type: string) => {
  switch (type) {
    case "screen-field-value":
      return "field";
    case "screen-field-group":
      return "field-group";
    case "screen-record-header":
      return "record-header";
    case "screen-two-column":
      return "columns";
    default:
      return "legacy-widget";
  }
};

const widgetTypeFromScreenBlock = (block: ScreenBlockV1) => {
  if (block.legacyWidgetType) return block.legacyWidgetType;
  switch (block.type) {
    case "field":
      return "screen-field-value";
    case "field-group":
      return "screen-field-group";
    case "record-header":
      return "screen-record-header";
    case "columns":
      return "screen-two-column";
    default:
      return block.type;
  }
};

const normalizeScreenBlock = (
  value: unknown,
  index: number,
  mode: ScreenNormalizeMode,
  blockPath: readonly ScreenFieldPathSegment[]
): ScreenBlockV1 => {
  if (!isRecord(value)) throw new Error("custom_screen_definition_invalid");
  rejectUnknownKeys(value, [
    "id",
    "type",
    "label",
    "variant",
    "style",
    "data",
    "layout",
    "visibility",
    "editor",
    "legacyWidgetType",
    "children",
    "slots",
  ]);
  const id = normalizeScreenPath(
    mode === "write" ? value.id : (value.id ?? `block-${index + 1}`),
    mode
  );
  const type = normalizeText(value.type);
  if (!type) throw new Error("custom_screen_definition_invalid");
  const label = normalizeText(value.label);
  const variant = normalizeText(value.variant);
  const style = normalizeScreenBlockStyle(value.style);
  const legacyWidgetType = normalizeText(value.legacyWidgetType);
  if (Array.isArray(value.children) && value.children.length > SCREEN_BLOCK_COLLECTION_MAX) {
    invalid(generatedFieldPath(...blockPath, "children"));
  }
  const children = Array.isArray(value.children)
    ? normalizeUniqueIds(
        value.children.map((item, childIndex) =>
          normalizeScreenBlock(item, childIndex, mode, [...blockPath, "children", childIndex])
        )
      )
    : undefined;
  const slots =
    value.slots === undefined || value.slots === null
      ? undefined
      : isRecord(value.slots)
        ? Object.fromEntries(
            Object.entries(value.slots).map(([slotId, items], slotGroupIndex) => {
              if (!normalizeText(slotId)) throw new Error("custom_screen_definition_invalid");
              if (!Array.isArray(items)) throw new Error("custom_screen_definition_invalid");
              if (items.length > SCREEN_BLOCK_COLLECTION_MAX) {
                invalid(generatedFieldPath(...blockPath, "slots", slotGroupIndex));
              }
              return [
                slotId,
                normalizeUniqueIds(
                  items.map((item, slotIndex) =>
                    normalizeScreenBlock(item, slotIndex, mode, [
                      ...blockPath,
                      "slots",
                      slotGroupIndex,
                      slotIndex,
                    ])
                  )
                ),
              ];
            })
          )
        : null;
  if (slots === null) throw new Error("custom_screen_definition_invalid");

  const block: ScreenBlockV1 = {
    id,
    type,
    ...(label ? { label } : {}),
    ...(variant ? { variant } : {}),
    ...(style ? { style } : {}),
    data: normalizeScreenBlockData(type, value.data, mode, blockPath),
    ...(value.layout !== undefined
      ? { layout: normalizeJsonValue(value.layout) as WidgetBlock["layout"] }
      : {}),
    ...(value.visibility !== undefined
      ? { visibility: normalizeJsonValue(value.visibility) as WidgetBlock["visibility"] }
      : {}),
    ...(value.editor !== undefined
      ? { editor: normalizeJsonValue(value.editor) as WidgetBlock["editor"] }
      : {}),
    ...(legacyWidgetType ? { legacyWidgetType } : {}),
    ...(children ? { children } : {}),
    ...(slots ? { slots } : {}),
  };
  assertTabSlots(block, blockPath);
  return block;
};

const createDefaultScreenSection = (
  blocks: ScreenBlockV1[],
  id = defaultScreenSectionId
): ScreenSectionV1 => ({
  id,
  type: "section",
  label: "Details",
  data: { title: "Details" },
  blocks,
});

const normalizeScreenSection = (
  value: unknown,
  index: number,
  mode: ScreenNormalizeMode,
  sectionPath: readonly ScreenFieldPathSegment[]
): ScreenSectionV1 => {
  if (!isRecord(value)) throw new Error("custom_screen_definition_invalid");
  rejectUnknownKeys(value, [
    "id",
    "type",
    "label",
    "data",
    "layout",
    "visibility",
    "style",
    "blocks",
  ]);
  const id = normalizeScreenPath(
    mode === "write" ? value.id : (value.id ?? `section-${index + 1}`),
    mode
  );
  const type = normalizeText(value.type) ?? "section";
  if (type !== "section") throw new Error("custom_screen_definition_invalid");
  const label = normalizeText(value.label);
  const style = normalizeScreenSectionStyle(value.style);
  if (value.blocks !== undefined && !Array.isArray(value.blocks)) {
    throw new Error("custom_screen_definition_invalid");
  }
  if (Array.isArray(value.blocks) && value.blocks.length > SCREEN_BLOCK_COLLECTION_MAX) {
    invalid(generatedFieldPath(...sectionPath, "blocks"));
  }
  return {
    id,
    type: "section",
    ...(label ? { label } : {}),
    data: normalizeScreenData(value.data),
    ...(value.layout !== undefined
      ? { layout: normalizeJsonValue(value.layout) as WidgetBlock["layout"] }
      : {}),
    ...(value.visibility !== undefined
      ? { visibility: normalizeJsonValue(value.visibility) as WidgetBlock["visibility"] }
      : {}),
    ...(style ? { style } : {}),
    blocks: normalizeUniqueIds(
      (value.blocks ?? []).map((item, blockIndex) =>
        normalizeScreenBlock(item, blockIndex, mode, [...sectionPath, "blocks", blockIndex])
      )
    ),
  };
};

const sectionsLookLikeLegacyBlockArray = (sections: unknown[]) =>
  sections.some((item) => isRecord(item) && !("blocks" in item));

const normalizeScreenDocumentV1AtPath = (
  input: unknown,
  mode: ScreenNormalizeMode,
  documentPath: readonly ScreenFieldPathSegment[]
): ScreenDocumentV1 => {
  if (input === undefined || input === null) return { schemaVersion: 1, sections: [] };
  if (!isRecord(input)) throw new Error("custom_screen_definition_invalid");
  rejectUnknownKeys(input, ["schemaVersion", "sections"]);
  const schemaVersion = input.schemaVersion ?? 1;
  if (schemaVersion !== 1) throw new Error("custom_screen_definition_invalid");
  if (input.sections !== undefined && !Array.isArray(input.sections)) {
    throw new Error("custom_screen_definition_invalid");
  }
  if (Array.isArray(input.sections) && input.sections.length > SCREEN_DOCUMENT_SECTIONS_MAX) {
    invalid(generatedFieldPath(...documentPath, "sections"));
  }
  return {
    schemaVersion: 1,
    sections: normalizeUniqueIds(
      (input.sections ?? []).map((item, index) =>
        normalizeScreenSection(item, index, mode, [...documentPath, "sections", index])
      )
    ),
  };
};

export function normalizeScreenDocumentV1(input: unknown): ScreenDocumentV1 {
  return normalizeScreenDocumentV1AtPath(input, "write", ["definition", "editorView", "document"]);
}

// TASK-498-04: READ-PATH-ONLY block repair — remap a stored `actions` placeholder block
// (dropped from the union and promoted to `button` in TASK-498-02) to the typed `button`
// kind so old screens upgrade VISUALLY on read without a write/migration. Applied ONLY inside
// the ...ForRead document normalizers, NEVER on the write path (`normalizeScreenDocumentV1` /
// `normalizeScreenBlock`), so it cannot widen the write contract. The remapped `button` data is
// intersected with the button allow-list so the per-kind reject-unknown normalizer cannot throw
// on a stray legacy `actions` data key — the block reads back usable instead of falling through
// to the neutral legacy placeholder. Non-`actions` records pass through byte-stable.
const READ_REPAIR_BLOCK_TYPE: Record<string, string> = { actions: "button" };

const nextRepairedTabId = (index: number, used: ReadonlySet<string>) => {
  const base = `tab-${index + 1}`;
  if (!used.has(base)) return base;
  let suffix = 2;
  while (used.has(`${base}-${suffix}`)) suffix += 1;
  return `${base}-${suffix}`;
};

const hasCanonicalStoredTabs = (data: Record<string, unknown>, slots: unknown) => {
  if (
    !Array.isArray(data.tabs) ||
    data.tabs.length < SCREEN_TABS_MIN ||
    data.tabs.length > SCREEN_TABS_MAX ||
    !isRecord(slots)
  ) {
    return false;
  }
  const seen = new Set<string>();
  const tabIds: string[] = [];
  for (const item of data.tabs) {
    if (!isRecord(item)) return false;
    const keys = Object.keys(item);
    if (
      keys.length !== 2 ||
      !Object.prototype.hasOwnProperty.call(item, "id") ||
      !Object.prototype.hasOwnProperty.call(item, "label") ||
      typeof item.id !== "string" ||
      typeof item.label !== "string"
    ) {
      return false;
    }
    if (
      item.id !== item.id.trim() ||
      !SCREEN_TAB_ID.test(item.id) ||
      seen.has(item.id) ||
      item.label !== item.label.trim() ||
      !item.label ||
      screenCodePointLength(item.label) > SCREEN_TAB_LABEL_MAX
    ) {
      return false;
    }
    seen.add(item.id);
    tabIds.push(item.id);
  }
  const slotIds = Object.keys(slots);
  return sameSet(tabIds, slotIds) && Object.values(slots).every(Array.isArray);
};

const repairStoredTabsForRead = (
  data: Record<string, unknown>,
  slots: unknown
): { data: Record<string, unknown>; slots: Record<string, unknown[]>; repaired: boolean } => {
  if (hasCanonicalStoredTabs(data, slots)) {
    return {
      data,
      slots: slots as Record<string, unknown[]>,
      repaired: false,
    };
  }
  const rawSlots = isRecord(slots) ? slots : {};
  const rawTabs = Array.isArray(data.tabs) ? data.tabs.slice(0, SCREEN_TABS_MAX) : [];
  const slotDerivedTabs = Object.keys(rawSlots)
    .sort()
    .slice(0, SCREEN_TABS_MAX)
    .map((id, index) => ({ id, label: `Tab ${index + 1}` }));
  const tabs =
    rawTabs.length > 0
      ? rawTabs
      : slotDerivedTabs.length > 0
        ? slotDerivedTabs
        : [{ id: "tab-1", label: "Tab 1" }];
  const consumedSlotIds = new Set<string>();
  const usedIds = new Set<string>();
  const repairedSlots: Record<string, unknown[]> = {};
  const repairedTabs: ScreenTabItem[] = tabs.map((rawTab, index) => {
    const rawItem = isRecord(rawTab) ? rawTab : {};
    const rawId = typeof rawItem.id === "string" ? rawItem.id : "";
    const trimmedId = rawId.trim();
    const id =
      SCREEN_TAB_ID.test(trimmedId) && !usedIds.has(trimmedId)
        ? trimmedId
        : nextRepairedTabId(index, usedIds);
    usedIds.add(id);

    const trimmedLabel = typeof rawItem.label === "string" ? rawItem.label.trim() : "";
    const label = trimmedLabel
      ? truncateScreenCodePoints(trimmedLabel, SCREEN_TAB_LABEL_MAX)
      : `Tab ${index + 1}`;
    const sourceSlotId =
      rawId && Object.prototype.hasOwnProperty.call(rawSlots, rawId)
        ? rawId
        : Object.prototype.hasOwnProperty.call(rawSlots, trimmedId)
          ? trimmedId
          : null;
    const sourceItems = sourceSlotId ? rawSlots[sourceSlotId] : undefined;
    repairedSlots[id] =
      sourceSlotId && !consumedSlotIds.has(sourceSlotId) && Array.isArray(sourceItems)
        ? sourceItems
        : [];
    if (sourceSlotId) consumedSlotIds.add(sourceSlotId);
    return { id, label };
  });
  return {
    data: { ...data, tabs: repairedTabs },
    slots: repairedSlots,
    repaired: true,
  };
};

type ScreenReadRepairContext = {
  unsupportedButtonNodes: WeakSet<Record<string, unknown>>;
};

const repairLegacyScreenRecordForRead = (
  node: unknown,
  context: ScreenReadRepairContext
): unknown => {
  if (Array.isArray(node)) {
    return node.map((item) => repairLegacyScreenRecordForRead(item, context));
  }
  if (!isRecord(node)) return node;
  const next: Record<string, unknown> = { ...node };
  let changed = false;
  const repairedType =
    typeof node.type === "string" ? READ_REPAIR_BLOCK_TYPE[node.type] : undefined;
  if (repairedType) {
    next.type = repairedType;
    const allowed = isFixedScreenBlockType(repairedType)
      ? screenBlockDataAllowedKeys[repairedType]
      : null;
    if (allowed && isRecord(node.data)) {
      const allowedSet = new Set<string>(allowed);
      next.data = Object.fromEntries(
        Object.entries(node.data).filter(([key]) => allowedSet.has(key))
      );
    }
    changed = true;
  }
  const effectiveType = repairedType ?? (typeof node.type === "string" ? node.type : undefined);
  const hasUnsupportedButtonAction =
    effectiveType === "button" &&
    isRecord(node.data) &&
    Object.prototype.hasOwnProperty.call(node.data, "action") &&
    node.data.action !== "link";
  if (effectiveType === "button" && isRecord(next.data)) {
    if (next.data.action === "publish" || next.data.action === "custom") {
      next.data = { ...next.data, action: "link" };
      delete (next.data as Record<string, unknown>).href;
      changed = true;
    }
  }
  if (effectiveType === "tabs") {
    const repairedTabs = repairStoredTabsForRead(isRecord(next.data) ? next.data : {}, node.slots);
    if (repairedTabs.repaired) {
      next.data = repairedTabs.data;
      next.slots = repairedTabs.slots;
      changed = true;
    }
  }
  for (const key of ["blocks", "children"] as const) {
    if (Array.isArray(node[key])) {
      next[key] = node[key].map((item) => repairLegacyScreenRecordForRead(item, context));
      changed = true;
    }
  }
  const repairedSlotSource = isRecord(next.slots) ? next.slots : node.slots;
  if (isRecord(repairedSlotSource)) {
    next.slots = Object.fromEntries(
      Object.entries(repairedSlotSource).map(([slot, items]) => [
        slot,
        Array.isArray(items)
          ? items.map((item) => repairLegacyScreenRecordForRead(item, context))
          : items,
      ])
    );
    changed = true;
  }
  const repairedNode = changed ? next : node;
  if (hasUnsupportedButtonAction) {
    context.unsupportedButtonNodes.add(repairedNode);
  }
  return repairedNode;
};

const collectRepairedScreenBlocksInReadOrder = (
  repairedSections: unknown[]
): Record<string, unknown>[] => {
  const blocks: Record<string, unknown>[] = [];
  const visit = (items: unknown[]) => {
    items.forEach((node) => {
      if (!isRecord(node)) return;
      blocks.push(node);
      if (Array.isArray(node.children)) visit(node.children);
      if (isRecord(node.slots)) {
        Object.values(node.slots).forEach((slotItems) => {
          if (Array.isArray(slotItems)) visit(slotItems);
        });
      }
    });
  };
  if (sectionsLookLikeLegacyBlockArray(repairedSections)) {
    visit(repairedSections);
  } else {
    repairedSections.forEach((section) => {
      if (isRecord(section) && Array.isArray(section.blocks)) visit(section.blocks);
    });
  }
  return blocks;
};

const collectNormalizedUnsupportedButtonIds = (
  repairedSections: unknown[],
  normalizedDocument: ScreenDocumentV1,
  context: ScreenReadRepairContext
): Set<string> => {
  const repairedBlocks = collectRepairedScreenBlocksInReadOrder(repairedSections);
  const normalizedBlocks: ScreenBlockV1[] = [];
  normalizedDocument.sections.forEach((section) =>
    visitScreenBlocks(section.blocks, (block) => normalizedBlocks.push(block))
  );
  if (repairedBlocks.length !== normalizedBlocks.length) {
    throw new Error("custom_screen_definition_invalid");
  }
  const ids = new Set<string>();
  repairedBlocks.forEach((repairedBlock, index) => {
    if (context.unsupportedButtonNodes.has(repairedBlock)) {
      const normalizedBlock = normalizedBlocks[index];
      if (!normalizedBlock) throw new Error("custom_screen_definition_invalid");
      ids.add(normalizedBlock.id);
    }
  });
  return ids;
};

type NormalizedScreenDocumentRead = {
  document: ScreenDocumentV1;
  unsupportedButtonIds: Set<string>;
};

const normalizeScreenDocumentV1ForReadWithRepairAtPath = (
  input: unknown,
  documentPath: readonly ScreenFieldPathSegment[]
): NormalizedScreenDocumentRead => {
  if (input === undefined || input === null) {
    return {
      document: { schemaVersion: 1, sections: [] },
      unsupportedButtonIds: new Set<string>(),
    };
  }
  if (!isRecord(input)) throw new Error("custom_screen_definition_invalid");
  rejectUnknownKeys(input, ["schemaVersion", "sections"]);
  const schemaVersion = input.schemaVersion ?? 1;
  if (schemaVersion !== 1) throw new Error("custom_screen_definition_invalid");
  if (input.sections !== undefined && !Array.isArray(input.sections)) {
    throw new Error("custom_screen_definition_invalid");
  }
  const rawSections = input.sections ?? [];
  const legacyFlatSections = sectionsLookLikeLegacyBlockArray(rawSections);
  if (
    rawSections.length >
    (legacyFlatSections ? SCREEN_BLOCK_COLLECTION_MAX : SCREEN_DOCUMENT_SECTIONS_MAX)
  ) {
    throw new Error("custom_screen_definition_invalid");
  }
  const repairContext: ScreenReadRepairContext = {
    unsupportedButtonNodes: new WeakSet<Record<string, unknown>>(),
  };
  const repairedSections = repairLegacyScreenRecordForRead(rawSections, repairContext) as unknown[];
  const document: ScreenDocumentV1 = sectionsLookLikeLegacyBlockArray(repairedSections)
    ? {
        schemaVersion: 1,
        sections:
          repairedSections.length > 0
            ? [
                createDefaultScreenSection(
                  normalizeUniqueIds(
                    repairedSections.map((item, index) =>
                      normalizeScreenBlock(item, index, "stored-read", [
                        ...documentPath,
                        "sections",
                        0,
                        "blocks",
                        index,
                      ])
                    )
                  )
                ),
              ]
            : [],
      }
    : {
        schemaVersion: 1,
        sections: normalizeUniqueIds(
          repairedSections.map((item, index) =>
            normalizeScreenSection(item, index, "stored-read", [...documentPath, "sections", index])
          )
        ),
      };
  return {
    document,
    unsupportedButtonIds: collectNormalizedUnsupportedButtonIds(
      repairedSections,
      document,
      repairContext
    ),
  };
};

const normalizeScreenDocumentV1ForReadAtPath = (
  input: unknown,
  documentPath: readonly ScreenFieldPathSegment[]
): ScreenDocumentV1 => {
  return normalizeScreenDocumentV1ForReadWithRepairAtPath(input, documentPath).document;
};

export function normalizeScreenDocumentV1ForRead(input: unknown): ScreenDocumentV1 {
  return normalizeScreenDocumentV1ForReadAtPath(input, ["definition", "editorView", "document"]);
}

// TASK-505-01 (Item B): a missing-content-type-field binding (fieldRoot ∉ live schema) is
// PRUNED + recorded when a `sink` is threaded (write=warn, ForRead=discard — both non-fatal
// → recoverable Save), returning null to signal "drop me". Only when NO sink is threaded does
// the field-orphan case keep the bare throw. Genuinely-malformed bindings (non-record, no
// blockId, bad source/mode, unknown KEY) STILL throw regardless of the sink.
const normalizeScreenFieldBinding = (
  value: unknown,
  context?: CustomScreenDefinitionContext,
  sink?: ScreenBindingWarningSink,
  mode: ScreenBindingNormalizeMode = "write"
): ScreenFieldBinding | null => {
  if (!isRecord(value)) throw new Error("custom_screen_definition_invalid");
  rejectUnknownKeys(
    value,
    mode === "write"
      ? ["id", "blockId", "propPath", "source", "field", "mode"]
      : ["id", "blockId", "widgetId", "propPath", "source", "field", "mode"]
  );
  const hasBlockId = Object.prototype.hasOwnProperty.call(value, "blockId");
  const hasWidgetId = Object.prototype.hasOwnProperty.call(value, "widgetId");
  if (mode === "compatibility-write" && hasBlockId === hasWidgetId) {
    throw new Error("custom_screen_definition_invalid");
  }
  const blockId = normalizeScreenPath(value.blockId ?? value.widgetId, mode);
  const propPath = normalizeScreenPath(value.propPath, mode);
  const field = normalizeScreenPath(value.field, mode);
  const fieldRoot = field.split(".")[0] ?? field;
  const allowedFieldRoots = getAllowedBindingFieldRoots(context);
  if (allowedFieldRoots && !allowedFieldRoots.has(fieldRoot)) {
    if (sink) {
      sink.removedFieldOrphans.push(field); // PRUNE + record (write=warn / ForRead=discarded)
      return null;
    }
    throw new Error("custom_screen_definition_invalid"); // only when NO sink is threaded
  }
  const hasSource = Object.prototype.hasOwnProperty.call(value, "source");
  if (mode === "write" && (!hasSource || value.source !== "entry")) {
    throw new Error("custom_screen_definition_invalid");
  }
  if (mode === "compatibility-write" && hasSource && value.source !== "entry") {
    throw new Error("custom_screen_definition_invalid");
  }
  if (mode === "stored-read") {
    const source = normalizeText(value.source) ?? "entry";
    if (source !== "entry") throw new Error("custom_screen_definition_invalid");
  }
  const hasExplicitId = Object.prototype.hasOwnProperty.call(value, "id");
  const explicitId = hasExplicitId ? normalizeText(value.id) : null;
  const normalizedExplicitId = explicitId ? slugify(explicitId) : null;
  if (
    mode !== "stored-read" &&
    hasExplicitId &&
    (typeof value.id !== "string" ||
      !normalizedExplicitId ||
      value.id !== normalizedExplicitId ||
      normalizedExplicitId.length > SCREEN_BINDING_ID_MAX)
  ) {
    throw new Error("custom_screen_definition_invalid");
  }
  const id = normalizedExplicitId
    ? canonicalizeScreenBindingId(normalizedExplicitId)
    : buildScreenFieldBindingId(blockId, propPath);
  const hasMode = Object.prototype.hasOwnProperty.call(value, "mode");
  let bindingMode: CustomScreenBindingMode;
  if (mode === "stored-read") {
    bindingMode = normalizeBindingMode(value.mode);
  } else if (!hasMode) {
    bindingMode = "readwrite";
  } else if (
    typeof value.mode === "string" &&
    bindingModes.has(value.mode as CustomScreenBindingMode)
  ) {
    bindingMode = value.mode as CustomScreenBindingMode;
  } else {
    throw new Error("custom_screen_definition_invalid");
  }
  return {
    id,
    blockId,
    propPath,
    source: "entry",
    field,
    mode: bindingMode,
  };
};

const normalizeScreenFieldBindingsWithMode = (
  value: unknown,
  context?: CustomScreenDefinitionContext,
  sink?: ScreenBindingWarningSink,
  mode: ScreenBindingNormalizeMode = "write"
): ScreenFieldBinding[] => {
  if (value === undefined || value === null) return [];
  if (!Array.isArray(value)) throw new Error("custom_screen_definition_invalid");
  return normalizeUniqueIds(
    value
      .map((item) => normalizeScreenFieldBinding(item, context, sink, mode))
      .filter((binding): binding is ScreenFieldBinding => binding !== null)
  );
};

export function normalizeScreenFieldBindings(
  value: unknown,
  context?: CustomScreenDefinitionContext,
  sink?: ScreenBindingWarningSink
): ScreenFieldBinding[] {
  return normalizeScreenFieldBindingsWithMode(value, context, sink, "compatibility-write");
}

const migrateWidgetBlockToScreenBlock = (block: WidgetBlock): ScreenBlockV1 => {
  const slots =
    block.slots && typeof block.slots === "object" && !Array.isArray(block.slots)
      ? Object.fromEntries(
          Object.entries(block.slots).map(([slotId, items]) => [
            slotId,
            Array.isArray(items) ? items.map(migrateWidgetBlockToScreenBlock) : [],
          ])
        )
      : undefined;
  const children = Array.isArray(block.children)
    ? block.children.map(migrateWidgetBlockToScreenBlock)
    : undefined;
  const screenType = screenBlockTypeFromWidgetType(block.type);
  return {
    id: block.id,
    type: screenType,
    ...(typeof block.variant === "string" && block.variant.trim()
      ? { variant: block.variant.trim() }
      : {}),
    data: normalizeScreenData(block.data ?? {}),
    ...(block.layout ? { layout: block.layout } : {}),
    ...(block.visibility ? { visibility: block.visibility } : {}),
    ...(block.editor ? { editor: block.editor } : {}),
    ...(screenType === "legacy-widget" ? { legacyWidgetType: block.type } : {}),
    ...(children ? { children } : {}),
    ...(slots ? { slots } : {}),
  };
};

const projectScreenBlockToWidgetBlock = (block: ScreenBlockV1): WidgetBlock => {
  const slots = block.slots
    ? Object.fromEntries(
        Object.entries(block.slots).map(([slotId, items]) => [
          slotId,
          items.map(projectScreenBlockToWidgetBlock),
        ])
      )
    : undefined;
  const children = block.children ? block.children.map(projectScreenBlockToWidgetBlock) : undefined;
  return {
    id: block.id,
    type: widgetTypeFromScreenBlock(block),
    ...(block.variant ? { variant: block.variant } : {}),
    data: block.data,
    ...(block.layout ? { layout: block.layout } : {}),
    ...(block.visibility ? { visibility: block.visibility } : {}),
    ...(block.editor ? { editor: block.editor } : {}),
    ...(children ? { children } : {}),
    ...(slots ? { slots } : {}),
  };
};

const migrateCustomScreenBindingToScreenFieldBinding = (
  binding: CustomScreenBinding
): ScreenFieldBinding => ({
  id: binding.id,
  blockId: binding.widgetId,
  propPath: binding.propPath,
  source: "entry",
  field: binding.field,
  mode: binding.mode,
});

const migrateWidgetBlocksToScreenDocument = (blocks: WidgetBlock[]): ScreenDocumentV1 => ({
  schemaVersion: 1,
  sections:
    blocks.length > 0
      ? [createDefaultScreenSection(blocks.map(migrateWidgetBlockToScreenBlock))]
      : [],
});

const projectScreenFieldBindingToCustomScreenBinding = (
  binding: ScreenFieldBinding
): CustomScreenBinding => ({
  id: binding.id,
  widgetId: binding.blockId,
  propPath: binding.propPath,
  field: binding.field,
  mode: binding.mode,
});

export function getCustomScreenEditorViewBlocks(definition: CustomScreenDefinition): WidgetBlock[] {
  return definition.editorView.document.sections.flatMap((section) =>
    section.blocks.map(projectScreenBlockToWidgetBlock)
  );
}

export function getCustomScreenEditorViewBindings(
  definition: CustomScreenDefinition
): CustomScreenBinding[] {
  return definition.editorView.bindings.map(projectScreenFieldBindingToCustomScreenBinding);
}

export function getCustomScreenEditorViewCompat(
  definition: CustomScreenDefinition
): CustomScreenEditorViewDefinition {
  return {
    blocks: getCustomScreenEditorViewBlocks(definition),
    bindings: getCustomScreenEditorViewBindings(definition),
    saveMode: "entry",
    interactionMode: "inline",
  };
}

export function withCustomScreenEditorViewCompat(
  definition: CustomScreenDefinition,
  editorView: CustomScreenEditorViewDefinition
): CustomScreenDefinition {
  return {
    ...definition,
    editorView: {
      document: migrateWidgetBlocksToScreenDocument(editorView.blocks),
      bindings: editorView.bindings.map(migrateCustomScreenBindingToScreenFieldBinding),
      saveMode: "entry",
      interactionMode: "inline",
    },
  };
}

export function normalizeCustomScreenBindings(
  value: unknown,
  context?: CustomScreenDefinitionContext
): CustomScreenBinding[] {
  if (value === undefined || value === null) return [];
  if (!Array.isArray(value)) {
    throw new Error("custom_screen_definition_invalid");
  }
  const allowedFieldRoots = getAllowedBindingFieldRoots(context);

  const normalized = value.map((item, index) => {
    if (!isRecord(item)) throw new Error("custom_screen_definition_invalid");

    const widgetId = normalizeText(item.widgetId);
    if (!widgetId) throw new Error("custom_screen_definition_invalid");

    const propPath = normalizePath(item.propPath);
    const field = normalizePath(item.field);
    const fieldRoot = field.split(".")[0] ?? field;
    if (allowedFieldRoots && !allowedFieldRoots.has(fieldRoot)) {
      throw new Error("custom_screen_definition_invalid");
    }
    const mode = normalizeBindingMode(item.mode);
    const id =
      slugify(normalizeText(item.id) ?? `${widgetId}-${propPath}`) || `binding-${index + 1}`;

    return {
      id,
      widgetId,
      propPath,
      field,
      mode,
    };
  });

  const ids = new Set<string>();
  normalized.forEach((binding) => {
    if (ids.has(binding.id)) {
      throw new Error("custom_screen_definition_invalid");
    }
    ids.add(binding.id);
  });

  return normalized;
}

export function normalizeCustomScreenV1Definition(
  input: {
    schemaVersion?: unknown;
    blocks?: unknown;
    bindings?: unknown;
  } = {},
  context?: CustomScreenDefinitionContext
): CustomScreenDefinitionV1 {
  const version = normalizeCustomScreenSchemaVersion(input.schemaVersion);
  if (version !== 1) throw new Error("custom_screen_definition_invalid");
  return {
    schemaVersion: 1,
    blocks: normalizeCustomScreenBlocks(input.blocks),
    bindings: normalizeCustomScreenBindings(input.bindings, context),
  };
}

const readSchemaFieldKind = (definition: unknown): CustomScreenListFormatter => {
  if (!isRecord(definition)) return "text";
  const fieldType = definition.xFieldType;
  if (fieldType === "number") return "number";
  if (fieldType === "boolean") return "boolean";
  if (fieldType === "select") return "select";
  if (fieldType === "media") return "media";
  if (fieldType === "relation") return "relation";
  if (definition.type === "number" || definition.type === "integer") return "number";
  if (definition.type === "boolean") return "boolean";
  if (definition.enum || (isRecord(definition.items) && Array.isArray(definition.items.enum))) {
    return "select";
  }
  return "text";
};

const resolveFieldLabel = (field: string, definition?: unknown) => {
  if (isRecord(definition) && typeof definition.title === "string") {
    const title = definition.title.trim();
    if (title) return title;
  }
  return field
    .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
    .replace(/[-_]+/g, " ")
    .replace(/\b\w/g, (char) => char.toUpperCase());
};

const systemColumn = (field: string, label?: string): CustomScreenListColumn => ({
  id: `system-${slugify(field)}`,
  source: "system",
  field,
  label: label ?? resolveFieldLabel(field),
  formatter: field.endsWith("At") ? "date" : "text",
  visible: true,
});

const fieldColumn = (field: string, definition: unknown): CustomScreenListColumn => ({
  id: `field-${slugify(field)}`,
  source: "field",
  field,
  label: resolveFieldLabel(field, definition),
  formatter: readSchemaFieldKind(definition),
  visible: true,
});

const fieldFilter = (field: string, definition: unknown): CustomScreenListFilter => ({
  id: `filter-${slugify(field)}`,
  source: "field",
  field,
  label: resolveFieldLabel(field, definition),
  operator: "equals",
  enabled: true,
});

const rowTemplateBindingMode = (column: CustomScreenListColumn): CustomScreenBindingMode =>
  column.source === "field" || column.field === "title" || column.field === "slug"
    ? "readwrite"
    : "read";

export function buildDefaultListRowTemplate(
  columns: readonly CustomScreenListColumn[]
): CustomScreenListRowTemplate {
  const visibleColumns = columns.filter((column) => column.visible !== false);
  const blocks = visibleColumns.map((column) => ({
    id: `row-cell-${slugify(column.id) || slugify(`${column.source}-${column.field}`)}`,
    type: "field",
    data: {
      field: column.field,
      label: column.label,
      source: column.source,
    },
  }));

  return {
    document: {
      schemaVersion: 1,
      sections: [
        {
          id: "row-template",
          type: "section",
          label: "Row",
          data: { title: "Row" },
          blocks,
        },
      ],
    },
    bindings: visibleColumns.map((column) => {
      const blockId = `row-cell-${slugify(column.id) || slugify(`${column.source}-${column.field}`)}`;
      return {
        id: `${blockId}-value`,
        blockId,
        propPath: "value",
        source: "entry" as const,
        field: column.field,
        mode: rowTemplateBindingMode(column),
      };
    }),
  };
}

const pickSchemaField = (properties: Record<string, unknown>, preferred: string[]) => {
  const keys = Object.keys(properties);
  return (
    preferred.find((field) => Object.prototype.hasOwnProperty.call(properties, field)) ??
    keys[0] ??
    null
  );
};

export function buildDefaultListViewDefinition(
  contentType?: CustomScreenDefinitionContext["contentType"]
): CustomScreenListViewDefinition {
  const context = { contentType };
  const properties = readContentSchemaProperties(context);
  const titleField = pickSchemaField(properties, ["title", "name"]);
  const summaryField = pickSchemaField(properties, ["summary", "description"]);
  const statusField = pickSchemaField(properties, ["status", "projectStatus"]);
  const columns: CustomScreenListColumn[] = [
    systemColumn("title", "Record"),
    ...(titleField && titleField !== "title"
      ? [fieldColumn(titleField, properties[titleField])]
      : []),
    ...(summaryField && summaryField !== titleField
      ? [fieldColumn(summaryField, properties[summaryField])]
      : []),
    ...(statusField && statusField !== titleField && statusField !== summaryField
      ? [fieldColumn(statusField, properties[statusField])]
      : []),
    systemColumn("updatedAt", "Updated"),
  ];

  return {
    columns,
    filters: statusField ? [fieldFilter(statusField, properties[statusField])] : [],
    defaultSort: { field: "updatedAt", direction: "desc" },
    bulkActions: {
      delete: true,
      publish: true,
      unpublish: true,
    },
    rowTemplate: buildDefaultListRowTemplate(columns),
  };
}

const normalizeListColumn = (
  value: unknown,
  index: number,
  context?: CustomScreenDefinitionContext
): CustomScreenListColumn => {
  if (!isRecord(value)) throw new Error("custom_screen_definition_invalid");
  rejectUnknownKeys(value, ["id", "source", "field", "label", "formatter", "visible"]);
  const source = normalizeStringEnum(value.source, columnSources, "field");
  const field = normalizePath(value.field);
  assertFieldAllowed(field, source, context);
  const label = normalizeText(value.label) ?? resolveFieldLabel(field);
  const formatter = normalizeStringEnum(
    value.formatter,
    listFormatters,
    source === "system" && field.endsWith("At") ? "date" : "text"
  );
  const fallbackId = `${source}-${slugify(field) || index + 1}`;
  const id = slugify(normalizeText(value.id) ?? fallbackId) || fallbackId;
  return {
    id,
    source,
    field,
    label,
    formatter,
    visible: normalizeBoolean(value.visible, true),
  };
};

const normalizeListFilter = (
  value: unknown,
  index: number,
  context?: CustomScreenDefinitionContext
): CustomScreenListFilter => {
  if (!isRecord(value)) throw new Error("custom_screen_definition_invalid");
  rejectUnknownKeys(value, ["id", "source", "field", "label", "operator", "enabled"]);
  const source = normalizeStringEnum(value.source, columnSources, "field");
  const field = normalizePath(value.field);
  assertFieldAllowed(field, source, context);
  const label = normalizeText(value.label) ?? resolveFieldLabel(field);
  const fallbackId = `filter-${source}-${slugify(field) || index + 1}`;
  const id = slugify(normalizeText(value.id) ?? fallbackId) || fallbackId;
  return {
    id,
    source,
    field,
    label,
    operator: normalizeStringEnum(value.operator, filterOperators, "equals"),
    enabled: normalizeBoolean(value.enabled, true),
  };
};

const normalizeUniqueIds = <T extends { id: string }>(items: T[]) => {
  const ids = new Set<string>();
  items.forEach((item) => {
    if (ids.has(item.id)) throw new Error("custom_screen_definition_invalid");
    ids.add(item.id);
  });
  return items;
};

const collectScreenDocumentBlockIds = (document: ScreenDocumentV1) => {
  const ids = new Set<string>();
  const visit = (blocks: ScreenBlockV1[]) => {
    blocks.forEach((block) => {
      if (ids.has(block.id)) throw new Error("custom_screen_definition_invalid");
      ids.add(block.id);
      if (Array.isArray(block.children) && block.children.length > 0) {
        visit(block.children);
      }
      if (block.slots && typeof block.slots === "object" && !Array.isArray(block.slots)) {
        Object.values(block.slots).forEach((items) => {
          if (Array.isArray(items) && items.length > 0) {
            visit(items);
          }
        });
      }
    });
  };
  document.sections.forEach((section) => visit(section.blocks));
  return ids;
};

const assertScreenFieldBindingsTargetDocument = (
  document: ScreenDocumentV1,
  bindings: ScreenFieldBinding[]
) => {
  const blockIds = collectScreenDocumentBlockIds(document);
  if (bindings.some((binding) => !blockIds.has(binding.blockId))) {
    throw new Error("custom_screen_definition_invalid");
  }
};

// TASK-505-01 (Item B): the SECOND (independent) binding dead-end — the list-view
// row-template binding set. Threads the SAME shared `sink` (field-orphans via
// normalizeScreenFieldBindings) and REPLACES the fatal block-orphan gate
// (assertScreenFieldBindingsTargetDocument) with an INLINE prune against the already-computed
// schemas-local Set — no import from screenDocumentOps.ts (would invert the schemas←ops layer).
const normalizeCustomScreenListRowTemplate = (
  input: unknown,
  context?: CustomScreenDefinitionContext,
  sink?: ScreenBindingWarningSink
): CustomScreenListRowTemplate => {
  if (!isRecord(input)) throw new Error("custom_screen_definition_invalid");
  rejectUnknownKeys(input, ["document", "bindings"]);
  const document = normalizeScreenDocumentV1AtPath(input.document, "write", [
    "definition",
    "listView",
    "rowTemplate",
    "document",
  ]);
  const bindings = normalizeScreenFieldBindingsWithMode(input.bindings, context, sink, "write");
  if (sink) {
    const blockIds = collectScreenDocumentBlockIds(document);
    const kept: ScreenFieldBinding[] = [];
    for (const binding of bindings) {
      if (blockIds.has(binding.blockId)) kept.push(binding);
      else sink.removedBlockOrphans.push(binding.field);
    }
    return { document, bindings: kept };
  }
  assertScreenFieldBindingsTargetDocument(document, bindings);
  return { document, bindings };
};

const normalizeCustomScreenListRowTemplateForRead = (
  input: unknown,
  fallback: CustomScreenListRowTemplate,
  context?: CustomScreenDefinitionContext
): CustomScreenListRowTemplate => {
  try {
    if (!isRecord(input)) throw new Error("custom_screen_definition_invalid");
    rejectUnknownKeys(input, ["document", "bindings"]);
    const { document, unsupportedButtonIds } = normalizeScreenDocumentV1ForReadWithRepairAtPath(
      input.document,
      ["definition", "listView", "rowTemplate", "document"]
    );
    const discardSink: ScreenBindingWarningSink = {
      removedFieldOrphans: [],
      removedBlockOrphans: [],
    };
    const bindings = normalizeScreenFieldBindingsWithMode(
      input.bindings,
      context,
      discardSink,
      "stored-read"
    );
    const blockIds = collectScreenDocumentBlockIds(document);
    return {
      document,
      bindings: bindings.filter(
        (binding) =>
          blockIds.has(binding.blockId) &&
          !(unsupportedButtonIds.has(binding.blockId) && binding.propPath === "href")
      ),
    };
  } catch {
    return fallback;
  }
};

export function normalizeCustomScreenListViewDefinition(
  input: unknown,
  context?: CustomScreenDefinitionContext,
  sink?: ScreenBindingWarningSink
): CustomScreenListViewDefinition {
  if (input === undefined || input === null) {
    return buildDefaultListViewDefinition(context?.contentType);
  }
  if (!isRecord(input)) throw new Error("custom_screen_definition_invalid");
  rejectUnknownKeys(input, ["columns", "filters", "defaultSort", "bulkActions", "rowTemplate"]);

  const defaults = buildDefaultListViewDefinition(context?.contentType);
  const columns =
    input.columns === undefined
      ? defaults.columns
      : Array.isArray(input.columns)
        ? normalizeUniqueIds(
            input.columns.map((item, index) => normalizeListColumn(item, index, context))
          )
        : null;
  if (!columns) throw new Error("custom_screen_definition_invalid");

  const filters =
    input.filters === undefined
      ? defaults.filters
      : Array.isArray(input.filters)
        ? normalizeUniqueIds(
            input.filters.map((item, index) => normalizeListFilter(item, index, context))
          )
        : null;
  if (!filters) throw new Error("custom_screen_definition_invalid");

  let defaultSort = defaults.defaultSort;
  if (input.defaultSort !== undefined && input.defaultSort !== null) {
    if (!isRecord(input.defaultSort)) {
      throw new Error("custom_screen_definition_invalid");
    }
    rejectUnknownKeys(input.defaultSort, ["field", "direction"]);
    const field = normalizePath(input.defaultSort.field);
    if (!systemListFields.has(field) && !getSchemaFieldNames(context).has(field)) {
      throw new Error("custom_screen_definition_invalid");
    }
    defaultSort = {
      field,
      direction: normalizeStringEnum(input.defaultSort.direction, sortDirections, "desc"),
    };
  }

  const bulkActionsInput = input.bulkActions;
  const bulkActions = isRecord(bulkActionsInput)
    ? (() => {
        rejectUnknownKeys(bulkActionsInput, ["delete", "publish", "unpublish"]);
        return {
          delete: normalizeBoolean(bulkActionsInput.delete, true),
          publish: normalizeBoolean(bulkActionsInput.publish, true),
          unpublish: normalizeBoolean(bulkActionsInput.unpublish, true),
        };
      })()
    : defaults.bulkActions;
  const fallbackRowTemplate = buildDefaultListRowTemplate(columns);
  const rowTemplate =
    input.rowTemplate === undefined || input.rowTemplate === null
      ? fallbackRowTemplate
      : normalizeCustomScreenListRowTemplate(input.rowTemplate, context, sink);

  return {
    columns,
    filters,
    defaultSort,
    bulkActions,
    rowTemplate,
  };
}

export function normalizeCustomScreenEditorViewDefinition(
  input: unknown,
  context?: CustomScreenDefinitionContext
): CustomScreenEditorViewDefinition {
  if (input === undefined || input === null) {
    return { blocks: [], bindings: [], saveMode: "entry", interactionMode: "inline" };
  }
  if (!isRecord(input)) throw new Error("custom_screen_definition_invalid");
  rejectUnknownKeys(input, ["blocks", "bindings", "saveMode", "interactionMode"]);
  const saveMode = normalizeText(input.saveMode) ?? "entry";
  if (saveMode !== "entry") throw new Error("custom_screen_definition_invalid");
  const interactionMode = normalizeText(input.interactionMode) ?? "inline";
  if (interactionMode !== "inline") throw new Error("custom_screen_definition_invalid");
  const blocks = normalizeCustomScreenBlocks(input.blocks);
  const bindings = normalizeCustomScreenBindings(input.bindings, context);
  const contracts = resolveCustomScreenBindingContracts(blocks);
  if (
    bindings.some(
      (binding) =>
        !isBindingWriteModeSupported(binding, {
          contracts,
        })
    )
  ) {
    throw new Error("custom_screen_definition_invalid");
  }
  return {
    blocks,
    bindings,
    saveMode: "entry",
    interactionMode: "inline",
  };
}

const visitScreenBlocks = (blocks: ScreenBlockV1[], visitor: (block: ScreenBlockV1) => void) => {
  blocks.forEach((block) => {
    visitor(block);
    if (Array.isArray(block.children) && block.children.length > 0) {
      visitScreenBlocks(block.children, visitor);
    }
    if (block.slots && typeof block.slots === "object" && !Array.isArray(block.slots)) {
      Object.values(block.slots).forEach((items) => {
        if (Array.isArray(items) && items.length > 0) {
          visitScreenBlocks(items, visitor);
        }
      });
    }
  });
};

const collectScreenBlockIds = (document: ScreenDocumentV1) => {
  const ids = new Set<string>();
  document.sections.forEach((section) => {
    visitScreenBlocks(section.blocks, (block) => {
      if (ids.has(block.id)) throw new Error("custom_screen_definition_invalid");
      ids.add(block.id);
    });
  });
  return ids;
};

export function normalizeCustomScreenEditorViewDefinitionV4(
  input: unknown,
  context?: CustomScreenDefinitionContext,
  sink?: ScreenBindingWarningSink
): CustomScreenEditorViewDefinitionV4 {
  if (input === undefined || input === null) {
    return {
      document: { schemaVersion: 1, sections: [] },
      bindings: [],
      saveMode: "entry",
      interactionMode: "inline",
    };
  }
  if (!isRecord(input)) throw new Error("custom_screen_definition_invalid");
  rejectUnknownKeys(input, ["document", "bindings", "saveMode", "interactionMode"]);
  const saveMode = normalizeText(input.saveMode) ?? "entry";
  if (saveMode !== "entry") throw new Error("custom_screen_definition_invalid");
  const interactionMode = normalizeText(input.interactionMode) ?? "inline";
  if (interactionMode !== "inline") throw new Error("custom_screen_definition_invalid");
  const document = normalizeScreenDocumentV1AtPath(input.document, "write", [
    "definition",
    "editorView",
    "document",
  ]);
  const bindings = normalizeScreenFieldBindingsWithMode(input.bindings, context, sink, "write");
  const blockIds = collectScreenBlockIds(document);
  // TASK-505-01 (Item B): when a sink is threaded, PRUNE block-orphans inline (recoverable
  // Save) instead of hard-throwing; no reconcileScreenBindings import (schemas←ops layering).
  if (sink) {
    const kept: ScreenFieldBinding[] = [];
    for (const binding of bindings) {
      if (blockIds.has(binding.blockId)) kept.push(binding);
      else sink.removedBlockOrphans.push(binding.field);
    }
    return {
      document,
      bindings: kept,
      saveMode: "entry",
      interactionMode: "inline",
    };
  }
  if (bindings.some((binding) => !blockIds.has(binding.blockId))) {
    throw new Error("custom_screen_definition_invalid");
  }
  return {
    document,
    bindings,
    saveMode: "entry",
    interactionMode: "inline",
  };
}

export function normalizeCustomScreenEditorViewDefinitionV4ForRead(
  input: unknown,
  _context?: CustomScreenDefinitionContext
): CustomScreenEditorViewDefinitionV4 {
  if (input === undefined || input === null) {
    return {
      document: { schemaVersion: 1, sections: [] },
      bindings: [],
      saveMode: "entry",
      interactionMode: "inline",
    };
  }
  if (!isRecord(input)) throw new Error("custom_screen_definition_invalid");
  rejectUnknownKeys(input, ["document", "bindings", "saveMode", "interactionMode"]);
  const saveMode = normalizeText(input.saveMode) ?? "entry";
  if (saveMode !== "entry") throw new Error("custom_screen_definition_invalid");
  const interactionMode = normalizeText(input.interactionMode) ?? "inline";
  if (interactionMode !== "inline") throw new Error("custom_screen_definition_invalid");
  const { document, unsupportedButtonIds } = normalizeScreenDocumentV1ForReadWithRepairAtPath(
    input.document,
    ["definition", "editorView", "document"]
  );
  // TASK-505-01/03 (Item B) — read-path RETAINS field-orphans so recovery UX can NAME them.
  // A field-orphan (binding → LIVE block, but its content-type field was deleted AFTER save)
  // is created by an EXTERNAL schema change, never re-saved, so it can only surface on
  // reopen. We therefore normalize bindings WITHOUT content-type context (skips field-root
  // validation → the orphan is kept, not pruned, not thrown) so the editor's
  // detectScreenBindingOrphans can raise the amber "Orphaned field bindings" notice naming
  // the dead field (505-03 Acceptance #5/#6, 505-04 SMOKE #4/#5). The WRITE path still prunes
  // field-orphans on Save (recoverable Save + post-save `binding_field_removed` warning).
  // Block-orphans (binding → a block that no longer exists) CANNOT be persisted — the write
  // path prunes them on Save — and a dead blockId can never render, so they are dropped on
  // read (structural, context-independent) exactly as before. Genuinely-malformed bindings
  // still throw here and fall through to the outer read-repair.
  const bindings = normalizeScreenFieldBindingsWithMode(
    input.bindings,
    undefined,
    undefined,
    "stored-read"
  );
  const blockIds = collectScreenBlockIds(document);
  const keptBindings = bindings.filter(
    (binding) =>
      blockIds.has(binding.blockId) &&
      !(unsupportedButtonIds.has(binding.blockId) && binding.propPath === "href")
  );
  return {
    document,
    bindings: keptBindings,
    saveMode: "entry",
    interactionMode: "inline",
  };
}

const normalizeCustomScreenBindingsForRead = (
  value: unknown,
  context?: CustomScreenDefinitionContext
) => {
  try {
    return normalizeCustomScreenBindings(value, context);
  } catch {
    return normalizeCustomScreenBindings(value);
  }
};

const normalizeCustomScreenListViewDefinitionForRead = (
  input: unknown,
  context?: CustomScreenDefinitionContext
): CustomScreenListViewDefinition => {
  const defaults = buildDefaultListViewDefinition(context?.contentType);
  if (!isRecord(input)) {
    return defaults;
  }

  const columns = Array.isArray(input.columns)
    ? normalizeUniqueIds(
        input.columns.flatMap((item, index) => {
          try {
            return [normalizeListColumn(item, index, context)];
          } catch {
            return [];
          }
        })
      )
    : defaults.columns;

  const filters = Array.isArray(input.filters)
    ? normalizeUniqueIds(
        input.filters.flatMap((item, index) => {
          try {
            return [normalizeListFilter(item, index, context)];
          } catch {
            return [];
          }
        })
      )
    : defaults.filters;

  let defaultSort = defaults.defaultSort;
  if (isRecord(input.defaultSort)) {
    try {
      const field = normalizePath(input.defaultSort.field);
      if (systemListFields.has(field) || getSchemaFieldNames(context).has(field)) {
        defaultSort = {
          field,
          direction: normalizeStringEnum(input.defaultSort.direction, sortDirections, "desc"),
        };
      }
    } catch {
      defaultSort = defaults.defaultSort;
    }
  }

  const bulkActions = isRecord(input.bulkActions)
    ? {
        delete: normalizeBoolean(input.bulkActions.delete, true),
        publish: normalizeBoolean(input.bulkActions.publish, true),
        unpublish: normalizeBoolean(input.bulkActions.unpublish, true),
      }
    : defaults.bulkActions;
  const resolvedColumns = columns.length > 0 ? columns : defaults.columns;
  const fallbackRowTemplate = buildDefaultListRowTemplate(resolvedColumns);
  const rowTemplate =
    input.rowTemplate === undefined || input.rowTemplate === null
      ? fallbackRowTemplate
      : normalizeCustomScreenListRowTemplateForRead(
          input.rowTemplate,
          fallbackRowTemplate,
          context
        );

  return {
    columns: resolvedColumns,
    filters,
    defaultSort,
    bulkActions,
    rowTemplate,
  };
};

export function migrateV1DefinitionToV3(
  definition: CustomScreenDefinitionV1,
  context?: CustomScreenDefinitionContext
): CustomScreenDefinitionV3 {
  return {
    schemaVersion: 3,
    listView: buildDefaultListViewDefinition(context?.contentType),
    editorView: {
      blocks: definition.blocks,
      bindings: definition.bindings,
      saveMode: "entry",
      interactionMode: "inline",
    },
  };
}

export function migrateV3DefinitionToV4(
  definition: CustomScreenDefinitionV3,
  context?: CustomScreenDefinitionContext
): CustomScreenDefinitionV4 {
  const editorView = {
    blocks: normalizeCustomScreenBlocks(definition.editorView.blocks),
    bindings: normalizeCustomScreenBindingsForRead(definition.editorView.bindings, context),
    saveMode: "entry" as const,
    interactionMode: "inline" as const,
  };
  const migratedEditorView = {
    document: migrateWidgetBlocksToScreenDocument(editorView.blocks),
    bindings: editorView.bindings.map(migrateCustomScreenBindingToScreenFieldBinding),
    saveMode: "entry" as const,
    interactionMode: "inline" as const,
  };
  const normalizedEditorView = normalizeCustomScreenEditorViewDefinitionV4ForRead(
    migratedEditorView,
    context
  );
  return {
    schemaVersion: 4,
    listView: normalizeCustomScreenListViewDefinitionForRead(definition.listView, context),
    editorView: {
      ...normalizedEditorView,
      // Legacy V1/V2/V3 reads historically retain block-orphan bindings for recovery.
      // Reuse the same stored-read canonicalizer, but do not apply the V4-only orphan prune.
      bindings: normalizeScreenFieldBindingsWithMode(
        migratedEditorView.bindings,
        undefined,
        undefined,
        "stored-read"
      ),
    },
  };
}

export function migrateV1DefinitionToV4(
  definition: CustomScreenDefinitionV1,
  context?: CustomScreenDefinitionContext
): CustomScreenDefinitionV4 {
  return migrateV3DefinitionToV4(migrateV1DefinitionToV3(definition, context), context);
}

export function migrateV2DefinitionToV3(
  definition: CustomScreenDefinitionV2,
  context?: CustomScreenDefinitionContext
): CustomScreenDefinitionV3 {
  const { rowClick: _rowClick, createMode: _createMode, ...listViewInput } = definition.listView;
  return {
    schemaVersion: 3,
    listView: normalizeCustomScreenListViewDefinitionForRead(listViewInput, context),
    editorView: {
      blocks: normalizeCustomScreenBlocks(definition.editorView.blocks),
      bindings: normalizeCustomScreenBindingsForRead(definition.editorView.bindings, context),
      saveMode: "entry",
      interactionMode: "inline",
    },
  };
}

export function migrateV2DefinitionToV4(
  definition: CustomScreenDefinitionV2,
  context?: CustomScreenDefinitionContext
): CustomScreenDefinitionV4 {
  return migrateV3DefinitionToV4(migrateV2DefinitionToV3(definition, context), context);
}

export function normalizeCustomScreenDefinition(
  input: {
    schemaVersion?: unknown;
    blocks?: unknown;
    bindings?: unknown;
    definition?: unknown;
    listView?: unknown;
    editorView?: unknown;
  } = {},
  context?: CustomScreenDefinitionContext
): CustomScreenDefinition {
  const rawInput = input.definition !== undefined ? input.definition : input;
  if (!isRecord(rawInput)) throw new Error("custom_screen_definition_invalid");
  if ("contentTypeId" in rawInput) {
    throw new Error("custom_screen_definition_invalid");
  }
  const hasV2ListViewKeys =
    isRecord(rawInput.listView) &&
    ("rowClick" in rawInput.listView || "createMode" in rawInput.listView);
  const hasV4EditorDocument = isRecord(rawInput.editorView) && "document" in rawInput.editorView;
  const version =
    "listView" in rawInput || "editorView" in rawInput
      ? hasV2ListViewKeys
        ? 2
        : hasV4EditorDocument
          ? 4
          : normalizeCustomScreenSchemaVersion(rawInput.schemaVersion ?? 3)
      : normalizeCustomScreenSchemaVersion(rawInput.schemaVersion);

  if (version === 1) {
    return migrateV1DefinitionToV4(normalizeCustomScreenV1Definition(rawInput, context), context);
  }

  if (version === 2) {
    throw new Error("custom_screen_definition_invalid");
  }

  rejectUnknownKeys(rawInput, ["schemaVersion", "listView", "editorView"]);
  const schemaVersion = normalizeCustomScreenSchemaVersion(rawInput.schemaVersion ?? version);
  if (schemaVersion === 3) {
    return migrateV3DefinitionToV4(
      {
        schemaVersion: 3,
        listView: normalizeCustomScreenListViewDefinition(rawInput.listView, context),
        editorView: normalizeCustomScreenEditorViewDefinition(rawInput.editorView, context),
      },
      context
    );
  }
  if (schemaVersion !== 4) throw new Error("custom_screen_definition_invalid");
  return {
    schemaVersion: 4,
    listView: normalizeCustomScreenListViewDefinition(rawInput.listView, context),
    editorView: normalizeCustomScreenEditorViewDefinitionV4(rawInput.editorView, context),
  };
}

export function normalizeCustomScreenDefinitionForWrite(
  input: {
    schemaVersion?: unknown;
    blocks?: unknown;
    bindings?: unknown;
    definition?: unknown;
    listView?: unknown;
    editorView?: unknown;
  } = {},
  context?: CustomScreenDefinitionContext,
  sink?: ScreenBindingWarningSink
): CustomScreenDefinition {
  if (input.blocks !== undefined || input.bindings !== undefined) {
    throw new Error("custom_screen_legacy_write_unsupported");
  }
  if (
    input.schemaVersion !== undefined &&
    normalizeCustomScreenSchemaVersion(input.schemaVersion) !== 4
  ) {
    throw new Error("custom_screen_legacy_write_unsupported");
  }

  const rawInput =
    input.definition !== undefined
      ? input.definition
      : {
          ...(input.schemaVersion !== undefined ? { schemaVersion: input.schemaVersion } : {}),
          ...(input.listView !== undefined ? { listView: input.listView } : {}),
          ...(input.editorView !== undefined ? { editorView: input.editorView } : {}),
        };
  if (!isRecord(rawInput)) throw new Error("custom_screen_definition_invalid");
  if ("contentTypeId" in rawInput) {
    throw new Error("custom_screen_definition_invalid");
  }
  if ("blocks" in rawInput || "bindings" in rawInput) {
    throw new Error("custom_screen_legacy_write_unsupported");
  }

  const hasV4EditorDocument = isRecord(rawInput.editorView) && "document" in rawInput.editorView;
  const hasLegacyEditorView =
    isRecord(rawInput.editorView) &&
    ("blocks" in rawInput.editorView || !("document" in rawInput.editorView));
  const hasV2ListViewKeys =
    isRecord(rawInput.listView) &&
    ("rowClick" in rawInput.listView || "createMode" in rawInput.listView);
  const version =
    rawInput.schemaVersion === undefined && !("listView" in rawInput) && !("editorView" in rawInput)
      ? 4
      : normalizeCustomScreenSchemaVersion(rawInput.schemaVersion ?? (hasV4EditorDocument ? 4 : 3));

  if (version !== 4 || hasLegacyEditorView || hasV2ListViewKeys) {
    throw new Error("custom_screen_legacy_write_unsupported");
  }

  rejectUnknownKeys(rawInput, ["schemaVersion", "listView", "editorView"]);
  return {
    schemaVersion: 4,
    listView: normalizeCustomScreenListViewDefinition(rawInput.listView, context, sink),
    editorView: normalizeCustomScreenEditorViewDefinitionV4(rawInput.editorView, context, sink),
  };
}

export function normalizeCustomScreenDefinitionForRead(
  input: {
    schemaVersion?: unknown;
    blocks?: unknown;
    bindings?: unknown;
    definition?: unknown;
    listView?: unknown;
    editorView?: unknown;
  } = {},
  context?: CustomScreenDefinitionContext
): CustomScreenDefinition {
  const rawInput = input.definition !== undefined ? input.definition : input;
  if (isRecord(rawInput)) {
    const hasV4EditorDocument = isRecord(rawInput.editorView) && "document" in rawInput.editorView;
    if (hasV4EditorDocument) {
      try {
        const version = normalizeCustomScreenSchemaVersion(rawInput.schemaVersion ?? 4);
        if (version !== 4) throw new Error("custom_screen_definition_invalid");
        rejectUnknownKeys(rawInput, ["schemaVersion", "listView", "editorView"]);
        return {
          schemaVersion: 4,
          listView: normalizeCustomScreenListViewDefinitionForRead(rawInput.listView, context),
          editorView: normalizeCustomScreenEditorViewDefinitionV4ForRead(
            rawInput.editorView,
            context
          ),
        };
      } catch {
        // Fall through to the broader legacy read-repair path below.
      }
    }
  }
  try {
    return normalizeCustomScreenDefinition(input, context);
  } catch {
    if (isRecord(rawInput)) {
      const version =
        "listView" in rawInput || "editorView" in rawInput
          ? isRecord(rawInput.listView) &&
            ("rowClick" in rawInput.listView || "createMode" in rawInput.listView)
            ? 2
            : 3
          : typeof rawInput.schemaVersion === "number"
            ? rawInput.schemaVersion
            : null;

      if (version === 2) {
        const legacyListView = (() => {
          try {
            if (!isRecord(rawInput.listView)) {
              return {
                ...buildDefaultListViewDefinition(context?.contentType),
                rowClick: "editor-view" as const,
                createMode: "editor-view" as const,
              };
            }
            const columns =
              Array.isArray(rawInput.listView.columns) && rawInput.listView.columns.length > 0
                ? rawInput.listView.columns
                : buildDefaultListViewDefinition(context?.contentType).columns;
            const filters = Array.isArray(rawInput.listView.filters)
              ? rawInput.listView.filters
              : [];
            const defaultSort = isRecord(rawInput.listView.defaultSort)
              ? {
                  field:
                    typeof rawInput.listView.defaultSort.field === "string"
                      ? rawInput.listView.defaultSort.field
                      : buildDefaultListViewDefinition(context?.contentType).defaultSort.field,
                  direction:
                    rawInput.listView.defaultSort.direction === "asc" ||
                    rawInput.listView.defaultSort.direction === "desc"
                      ? rawInput.listView.defaultSort.direction
                      : buildDefaultListViewDefinition(context?.contentType).defaultSort.direction,
                }
              : buildDefaultListViewDefinition(context?.contentType).defaultSort;
            const bulkActions = isRecord(rawInput.listView.bulkActions)
              ? {
                  delete:
                    typeof rawInput.listView.bulkActions.delete === "boolean"
                      ? rawInput.listView.bulkActions.delete
                      : true,
                  publish:
                    typeof rawInput.listView.bulkActions.publish === "boolean"
                      ? rawInput.listView.bulkActions.publish
                      : true,
                  unpublish:
                    typeof rawInput.listView.bulkActions.unpublish === "boolean"
                      ? rawInput.listView.bulkActions.unpublish
                      : true,
                }
              : buildDefaultListViewDefinition(context?.contentType).bulkActions;
            return {
              columns,
              filters,
              defaultSort,
              rowClick:
                rawInput.listView.rowClick === "classic-editor" ||
                rawInput.listView.rowClick === "editor-view"
                  ? rawInput.listView.rowClick
                  : "editor-view",
              createMode:
                rawInput.listView.createMode === "drawer" ||
                rawInput.listView.createMode === "editor-view"
                  ? rawInput.listView.createMode
                  : "editor-view",
              bulkActions,
            } satisfies CustomScreenDefinitionV2["listView"];
          } catch {
            return {
              ...buildDefaultListViewDefinition(context?.contentType),
              rowClick: "editor-view" as const,
              createMode: "editor-view" as const,
            };
          }
        })();

        const legacyEditorView = (() => {
          try {
            if (!isRecord(rawInput.editorView)) {
              return {
                blocks: normalizeCustomScreenBlocks(input.blocks),
                bindings: normalizeCustomScreenBindings(input.bindings),
                saveMode: "entry" as const,
              };
            }
            return {
              blocks: normalizeCustomScreenBlocks(rawInput.editorView.blocks),
              bindings: normalizeCustomScreenBindings(rawInput.editorView.bindings),
              saveMode: "entry" as const,
            } satisfies CustomScreenDefinitionV2["editorView"];
          } catch {
            return {
              blocks: normalizeCustomScreenBlocks(input.blocks),
              bindings: normalizeCustomScreenBindings(input.bindings),
              saveMode: "entry" as const,
            };
          }
        })();

        return migrateV2DefinitionToV4(
          {
            schemaVersion: 2,
            listView: legacyListView,
            editorView: legacyEditorView,
          },
          context
        );
      }
    }

    try {
      return normalizeCustomScreenDefinition(input);
    } catch {
      return migrateV1DefinitionToV4(
        normalizeCustomScreenV1Definition({
          schemaVersion: 1,
          blocks: input.blocks,
          bindings: input.bindings,
        }),
        context
      );
    }
  }
}

export function normalizeCustomScreenSidebarConfig(
  input: {
    showInSidebar?: unknown;
    sidebarLabel?: unknown;
  } = {}
): CustomScreenSidebarConfig {
  const showInSidebar = input.showInSidebar === true;
  const label = normalizeText(input.sidebarLabel);
  return {
    showInSidebar,
    sidebarLabel: label,
  };
}

const normalizeCollectionRole = (value: unknown): CustomScreenCollectionRole | null => {
  if (value === undefined || value === null) return null;
  const role = normalizeText(value);
  if (!role || !collectionRoles.has(role as CustomScreenCollectionRole)) {
    throw new Error("custom_screen_invalid");
  }
  return role as CustomScreenCollectionRole;
};

const normalizeCompositionKey = (value: unknown): string | null => {
  if (value === undefined || value === null) return null;
  const key = normalizeText(value);
  if (!key) return null;
  if (key.length > 160) throw new Error("custom_screen_invalid");
  return normalizePath(key);
};

export function normalizeCustomScreenCollectionLink(
  input: {
    collectionRole?: unknown;
    compositionKey?: unknown;
  } = {}
): CustomScreenCollectionLink {
  return {
    collectionRole: normalizeCollectionRole(input.collectionRole),
    compositionKey: normalizeCompositionKey(input.compositionKey),
  };
}

export const customScreenBindingSchema = {
  type: "object",
  required: ["widgetId", "propPath", "field"],
  properties: {
    id: { type: "string", minLength: 1, maxLength: 120 },
    widgetId: { type: "string", minLength: 1, maxLength: 160 },
    propPath: {
      type: "string",
      minLength: 1,
      maxLength: 160,
      pattern: "^[a-zA-Z0-9_.-]+$",
    },
    field: {
      type: "string",
      minLength: 1,
      maxLength: 160,
      pattern: "^[a-zA-Z0-9_.-]+$",
    },
    mode: { enum: customScreenBindingModes },
  },
  additionalProperties: false,
} as const;

const _customScreenLegacyDefinitionSchema = {
  type: "object",
  required: ["schemaVersion", "blocks", "bindings"],
  properties: {
    schemaVersion: { enum: [1] },
    blocks: {
      type: "array",
      maxItems: 500,
      items: { type: "object" },
    },
    bindings: {
      type: "array",
      maxItems: 200,
      items: customScreenBindingSchema,
    },
  },
  additionalProperties: false,
} as const;

const customScreenListColumnSchema = {
  type: "object",
  required: ["source", "field", "label"],
  properties: {
    id: { type: "string", minLength: 1, maxLength: 120 },
    source: { enum: customScreenListColumnSources },
    field: { type: "string", minLength: 1, maxLength: 160 },
    label: { type: "string", minLength: 1, maxLength: 160 },
    formatter: { enum: customScreenListFormatters },
    visible: { type: "boolean" },
  },
  additionalProperties: false,
} as const;

const customScreenListFilterSchema = {
  type: "object",
  required: ["source", "field", "label"],
  properties: {
    id: { type: "string", minLength: 1, maxLength: 120 },
    source: { enum: customScreenListColumnSources },
    field: { type: "string", minLength: 1, maxLength: 160 },
    label: { type: "string", minLength: 1, maxLength: 160 },
    operator: { enum: customScreenListFilterOperators },
    enabled: { type: "boolean" },
  },
  additionalProperties: false,
} as const;

const _customScreenV2DefinitionSchema = {
  type: "object",
  required: ["schemaVersion", "listView", "editorView"],
  properties: {
    schemaVersion: { enum: [2] },
    listView: {
      type: "object",
      required: ["columns", "filters", "defaultSort", "rowClick", "createMode", "bulkActions"],
      properties: {
        columns: {
          type: "array",
          maxItems: 50,
          items: customScreenListColumnSchema,
        },
        filters: {
          type: "array",
          maxItems: 30,
          items: customScreenListFilterSchema,
        },
        defaultSort: {
          type: "object",
          required: ["field", "direction"],
          properties: {
            field: { type: "string", minLength: 1, maxLength: 160 },
            direction: { enum: customScreenSortDirections },
          },
          additionalProperties: false,
        },
        rowClick: { enum: customScreenRowClickModes },
        createMode: { enum: customScreenCreateModes },
        bulkActions: {
          type: "object",
          required: ["delete", "publish", "unpublish"],
          properties: {
            delete: { type: "boolean" },
            publish: { type: "boolean" },
            unpublish: { type: "boolean" },
          },
          additionalProperties: false,
        },
      },
      additionalProperties: false,
    },
    editorView: {
      type: "object",
      required: ["blocks", "bindings", "saveMode"],
      properties: {
        blocks: {
          type: "array",
          maxItems: 500,
          items: { type: "object" },
        },
        bindings: {
          type: "array",
          maxItems: 200,
          items: customScreenBindingSchema,
        },
        saveMode: { enum: ["entry"] },
      },
      additionalProperties: false,
    },
  },
  additionalProperties: false,
} as const;

const customScreenV3DefinitionSchema = {
  type: "object",
  required: ["schemaVersion", "listView", "editorView"],
  properties: {
    schemaVersion: { enum: [3] },
    listView: {
      type: "object",
      required: ["columns", "filters", "defaultSort", "bulkActions"],
      properties: {
        columns: {
          type: "array",
          maxItems: 50,
          items: customScreenListColumnSchema,
        },
        filters: {
          type: "array",
          maxItems: 30,
          items: customScreenListFilterSchema,
        },
        defaultSort: {
          type: "object",
          required: ["field", "direction"],
          properties: {
            field: { type: "string", minLength: 1, maxLength: 160 },
            direction: { enum: customScreenSortDirections },
          },
          additionalProperties: false,
        },
        bulkActions: {
          type: "object",
          required: ["delete", "publish", "unpublish"],
          properties: {
            delete: { type: "boolean" },
            publish: { type: "boolean" },
            unpublish: { type: "boolean" },
          },
          additionalProperties: false,
        },
      },
      additionalProperties: false,
    },
    editorView: {
      type: "object",
      required: ["blocks", "bindings", "saveMode", "interactionMode"],
      properties: {
        blocks: {
          type: "array",
          maxItems: 500,
          items: { type: "object" },
        },
        bindings: {
          type: "array",
          maxItems: 200,
          items: customScreenBindingSchema,
        },
        saveMode: { enum: ["entry"] },
        interactionMode: { enum: ["inline"] },
      },
      additionalProperties: false,
    },
  },
  additionalProperties: false,
} as const;

const nonEmptyScreenPathSchema = {
  type: "string",
  minLength: 1,
  maxLength: SCREEN_PATH_MAX,
  pattern: SCREEN_PATH_PATTERN_SOURCE,
  not: { pattern: SCREEN_UNSAFE_PATH_SEGMENT_PATTERN_SOURCE },
} as const;
const emptyOrScreenPathSchema = {
  type: "string",
  maxLength: SCREEN_PATH_MAX,
  pattern: `^(?:${SCREEN_PATH_BODY_PATTERN_SOURCE})?$`,
  not: { pattern: SCREEN_UNSAFE_PATH_SEGMENT_PATTERN_SOURCE },
} as const;

const screenFieldBindingSchema = {
  type: "object",
  required: ["blockId", "propPath", "source", "field"],
  properties: {
    id: {
      type: "string",
      minLength: 1,
      maxLength: SCREEN_BINDING_ID_MAX,
      pattern: SCREEN_BINDING_ID_PATTERN_SOURCE,
    },
    blockId: nonEmptyScreenPathSchema,
    propPath: nonEmptyScreenPathSchema,
    source: { enum: ["entry"] },
    field: nonEmptyScreenPathSchema,
    mode: { enum: customScreenBindingModes },
  },
  additionalProperties: false,
} as const;

// TASK-503-01: Ajv mirror of ScreenBlockStyleV1 — references the SAME exported
// constants as the normalizer (zero drift). The route layer REJECTS out-of-range /
// float / unknown-key style payloads (additionalProperties: false); stored documents
// read through the coercing normalizer. Both reference identical constants.
const screenBlockBoxSpacingSchema = {
  type: "object",
  properties: {
    top: {
      type: "integer",
      minimum: PAGE_BLOCK_BOX_SPACING_CLAMP.min,
      maximum: PAGE_BLOCK_BOX_SPACING_CLAMP.max,
    },
    right: {
      type: "integer",
      minimum: PAGE_BLOCK_BOX_SPACING_CLAMP.min,
      maximum: PAGE_BLOCK_BOX_SPACING_CLAMP.max,
    },
    bottom: {
      type: "integer",
      minimum: PAGE_BLOCK_BOX_SPACING_CLAMP.min,
      maximum: PAGE_BLOCK_BOX_SPACING_CLAMP.max,
    },
    left: {
      type: "integer",
      minimum: PAGE_BLOCK_BOX_SPACING_CLAMP.min,
      maximum: PAGE_BLOCK_BOX_SPACING_CLAMP.max,
    },
  },
  additionalProperties: false,
} as const;

const screenBlockStyleV1Schema = {
  type: "object",
  properties: {
    width: { enum: screenBlockWidths },
    minHeight: {
      type: "integer",
      minimum: SCREEN_BLOCK_MIN_HEIGHT_CLAMP.min,
      maximum: SCREEN_BLOCK_MIN_HEIGHT_CLAMP.max,
    },
    margin: screenBlockBoxSpacingSchema,
    padding: screenBlockBoxSpacingSchema,
    align: { enum: screenBlockAligns },
  },
  additionalProperties: false,
} as const;

const clearableScreenDataLabelSchema = { type: "string" } as const;

const fixedScreenBlockDataSchemas = {
  heading: {
    type: "object",
    properties: {
      label: clearableScreenDataLabelSchema,
      text: { type: "string" },
      level: { type: "integer", minimum: 1, maximum: 3 },
      align: { enum: ["left", "center", "right"] },
      field: nonEmptyScreenPathSchema,
    },
    additionalProperties: false,
  },
  text: {
    type: "object",
    properties: {
      content: { type: "string" },
      tone: { enum: ["default", "muted"] },
      label: clearableScreenDataLabelSchema,
    },
    additionalProperties: false,
  },
  stat: {
    type: "object",
    properties: {
      label: clearableScreenDataLabelSchema,
      format: { enum: ["number", "percent", "money"] },
      trend: { enum: ["auto", "up", "down", "flat"] },
      deltaField: emptyOrScreenPathSchema,
      field: nonEmptyScreenPathSchema,
    },
    additionalProperties: false,
  },
  divider: {
    type: "object",
    properties: {
      variant: { enum: ["line", "space", "label"] },
      label: clearableScreenDataLabelSchema,
    },
    additionalProperties: false,
  },
  image: {
    type: "object",
    properties: {
      label: clearableScreenDataLabelSchema,
      fit: { enum: ["cover", "contain"] },
      ratio: { type: "string" },
      field: nonEmptyScreenPathSchema,
      src: { type: "string" },
    },
    additionalProperties: false,
  },
  "related-list": {
    type: "object",
    properties: {
      label: clearableScreenDataLabelSchema,
      target: emptyOrScreenPathSchema,
      displayField: emptyOrScreenPathSchema,
      variant: { enum: ["checklist", "activity", "cards"] },
      limit: { type: "integer", minimum: 1, maximum: 50 },
      field: nonEmptyScreenPathSchema,
    },
    additionalProperties: false,
  },
  tabs: {
    type: "object",
    required: ["tabs"],
    properties: {
      label: clearableScreenDataLabelSchema,
      tabs: {
        type: "array",
        minItems: SCREEN_TABS_MIN,
        maxItems: SCREEN_TABS_MAX,
        items: {
          type: "object",
          required: ["id", "label"],
          properties: {
            id: { type: "string", pattern: SCREEN_TAB_ID.source },
            label: {
              type: "string",
              minLength: 1,
              maxLength: SCREEN_TAB_LABEL_MAX,
              pattern: "\\S",
            },
          },
          additionalProperties: false,
        },
      },
    },
    additionalProperties: false,
  },
  button: {
    type: "object",
    properties: {
      label: clearableScreenDataLabelSchema,
      action: { enum: ["link"] },
      variant: { enum: ["primary", "secondary", "ghost"] },
      href: { type: "string" },
      field: nonEmptyScreenPathSchema,
    },
    additionalProperties: false,
  },
} as const satisfies Record<FixedScreenBlockType, object>;

// TASK-505-01: Ajv mirror of ScreenSectionStyleV1 — references the SAME exported constants
// as normalizeScreenSectionStyle (zero drift). Rejects out-of-range gap / unknown key at the
// route edge (additionalProperties:false); stored docs read through the coercing normalizer.
const screenSectionStyleV1Schema = {
  type: "object",
  properties: {
    columns: { enum: screenSectionColumnPresets },
    columnGap: {
      type: "integer",
      minimum: SCREEN_SECTION_COLUMN_GAP_CLAMP.min,
      maximum: SCREEN_SECTION_COLUMN_GAP_CLAMP.max,
    },
  },
  additionalProperties: false,
} as const;

const localScreenBlockRef = { $ref: "#/$defs/customScreenV4ScreenBlock" } as const;
const localScreenDocumentRef = { $ref: "#/$defs/customScreenV4ScreenDocument" } as const;
const localScreenDefinitionRef = { $ref: "#/$defs/customScreenV4Definition" } as const;

const screenBlockBranch = (type: string, dataSchema: object) => ({
  type: "object",
  required: ["id", "type", "data"],
  properties: {
    id: nonEmptyScreenPathSchema,
    type: { const: type },
    label: { type: "string", minLength: 1, maxLength: 160 },
    variant: { type: "string", minLength: 1, maxLength: 80 },
    style: screenBlockStyleV1Schema,
    data: dataSchema,
    layout: { type: "object" },
    visibility: { type: "object" },
    editor: { type: "object" },
    legacyWidgetType: { type: "string", minLength: 1, maxLength: 160 },
    children: {
      type: "array",
      maxItems: SCREEN_BLOCK_COLLECTION_MAX,
      items: localScreenBlockRef,
    },
    slots: {
      type: "object",
      additionalProperties: {
        type: "array",
        maxItems: SCREEN_BLOCK_COLLECTION_MAX,
        items: localScreenBlockRef,
      },
    },
  },
  additionalProperties: false,
});

const screenSectionSchemaUsing = (blockRef: object) => ({
  type: "object",
  required: ["id", "type", "data", "blocks"],
  properties: {
    id: nonEmptyScreenPathSchema,
    type: { const: "section" },
    label: { type: "string", minLength: 1, maxLength: 160 },
    data: { type: "object" },
    layout: { type: "object" },
    visibility: { type: "object" },
    style: screenSectionStyleV1Schema,
    blocks: {
      type: "array",
      maxItems: SCREEN_BLOCK_COLLECTION_MAX,
      items: blockRef,
    },
  },
  additionalProperties: false,
});

const customScreenV4ListViewSchemaUsing = (documentRef: object) => ({
  ...customScreenV3DefinitionSchema.properties.listView,
  properties: {
    ...customScreenV3DefinitionSchema.properties.listView.properties,
    rowTemplate: {
      type: "object",
      required: ["document", "bindings"],
      properties: {
        document: documentRef,
        bindings: {
          type: "array",
          maxItems: 200,
          items: screenFieldBindingSchema,
        },
      },
      additionalProperties: false,
    },
  },
  additionalProperties: false,
});

const customScreenV4DefinitionSchemaUsing = (documentRef: object) => ({
  type: "object",
  required: ["schemaVersion", "listView", "editorView"],
  properties: {
    schemaVersion: { const: 4 },
    listView: customScreenV4ListViewSchemaUsing(documentRef),
    editorView: {
      type: "object",
      required: ["document", "bindings", "saveMode", "interactionMode"],
      properties: {
        document: documentRef,
        bindings: {
          type: "array",
          maxItems: 200,
          items: screenFieldBindingSchema,
        },
        saveMode: { const: "entry" },
        interactionMode: { const: "inline" },
      },
      additionalProperties: false,
    },
  },
  additionalProperties: false,
});

const buildCustomScreenV4Defs = () => ({
  customScreenV4ScreenBlock: {
    oneOf: [
      ...Object.entries(fixedScreenBlockDataSchemas).map(([type, dataSchema]) =>
        screenBlockBranch(type, dataSchema)
      ),
      ...compatibilityScreenBlockTypes.map((type) => screenBlockBranch(type, { type: "object" })),
    ],
  },
  customScreenV4ScreenDocument: {
    type: "object",
    required: ["schemaVersion", "sections"],
    properties: {
      schemaVersion: { const: 1 },
      sections: {
        type: "array",
        maxItems: SCREEN_DOCUMENT_SECTIONS_MAX,
        items: screenSectionSchemaUsing(localScreenBlockRef),
      },
    },
    additionalProperties: false,
  },
  customScreenV4Definition: customScreenV4DefinitionSchemaUsing(localScreenDocumentRef),
});

const buildStandaloneCustomScreenDefinitionSchema = () => {
  const $defs = buildCustomScreenV4Defs();
  return { ...$defs.customScreenV4Definition, $defs };
};

const buildCustomScreenMutationProperties = () => ({
  name: { type: "string", minLength: 1, maxLength: 160 },
  contentTypeId: { type: "string", minLength: 1, maxLength: 64 },
  status: { enum: customScreenStatusValues },
  collectionRole: {
    anyOf: [{ enum: customScreenCollectionRoleValues }, { type: "null" }],
  },
  compositionKey: {
    anyOf: [
      { type: "string", minLength: 1, maxLength: 160, pattern: "^[a-zA-Z0-9_.-]+$" },
      { type: "null" },
    ],
  },
  showInSidebar: { type: "boolean" },
  sidebarLabel: {
    anyOf: [{ type: "string", minLength: 1, maxLength: 160 }, { type: "null" }],
  },
  schemaVersion: { const: 4 },
  definition: localScreenDefinitionRef,
});

const buildCustomScreenMutationSchema = (kind: "create" | "update") => ({
  type: "object",
  $defs: buildCustomScreenV4Defs(),
  ...(kind === "create" ? { required: ["name", "contentTypeId"] } : { minProperties: 1 }),
  properties: buildCustomScreenMutationProperties(),
  additionalProperties: false,
});

export const customScreenDefinitionSchema = buildStandaloneCustomScreenDefinitionSchema();
export const customScreenCreateSchema = buildCustomScreenMutationSchema("create");
export const customScreenUpdateSchema = buildCustomScreenMutationSchema("update");
