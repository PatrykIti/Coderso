import type { WidgetBlock } from "../../widgets/types";
import { ensureRuntimeWidgetsRegistered } from "../../widgets/runtime";
import { normalizeWidgetBlock } from "../../widgets/validator";
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
  if (!text || !/^[a-zA-Z0-9_.-]+$/.test(text)) {
    throw new Error("custom_screen_definition_invalid");
  }
  const segments = text.split(".");
  if (segments.some((segment) => segment.length === 0 || unsafePathSegments.has(segment))) {
    throw new Error("custom_screen_definition_invalid");
  }
  return text;
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

// TASK-498-02 B0: per-kind, schema-first, reject-unknown `data` allow-lists for the
// data-oriented block kinds. `"label"` is REQUIRED in EVERY kind (including heading +
// tabs) because `createScreenBlock`'s base factory always seeds `data.label` and each
// branch spreads it — omitting it would make normalizeScreenBlockData reject the
// base-seeded label and throw `custom_screen_definition_invalid` on save. LEGACY kinds
// (field / record-header / field-group / columns / rich-text / legacy-widget) are NOT
// listed here and stay permissive, so stored V4 screens read back byte-stable.
const screenBlockDataAllowedKeys: Record<string, readonly string[]> = {
  heading: ["label", "text", "level", "align", "field"],
  text: ["content", "tone", "label"],
  stat: ["label", "format", "trend", "deltaField", "field"],
  divider: ["variant", "label"],
  image: ["label", "fit", "ratio", "field"],
  "related-list": ["label", "target", "displayField", "variant", "limit", "field"],
  tabs: ["label", "tabs"],
  button: ["label", "action", "variant", "href", "field"],
};

const coerceScreenEnum = <T extends string>(
  value: unknown,
  allowed: readonly T[],
  fallback: T
): T => (typeof value === "string" && allowed.includes(value as T) ? (value as T) : fallback);

const clampScreenInt = (value: unknown, fallback: number, min: number, max: number): number => {
  const n = typeof value === "number" && Number.isFinite(value) ? Math.floor(value) : fallback;
  return Math.min(max, Math.max(min, n));
};

const normalizeScreenBlockData = (type: string, value: unknown): Record<string, unknown> => {
  const data = normalizeScreenData(value); // existing JSON-safe normalize
  const allowed = screenBlockDataAllowedKeys[type];
  if (!allowed) return data; // legacy kinds: permissive (backward-compat)
  rejectUnknownKeys(data, allowed); // throws "custom_screen_definition_invalid" on unknown keys
  // Coerce enums / numerics to their allow-lists (no-op for already-valid stored data,
  // so a valid new-kind block round-trips byte-stable).
  switch (type) {
    case "heading":
      if ("level" in data) data.level = clampScreenInt(data.level, 2, 1, 3);
      if ("align" in data)
        data.align = coerceScreenEnum(data.align, ["left", "center", "right"], "left");
      break;
    case "text":
      if ("tone" in data) data.tone = coerceScreenEnum(data.tone, ["default", "muted"], "default");
      break;
    case "stat":
      if ("format" in data)
        data.format = coerceScreenEnum(data.format, ["number", "percent", "money"], "number");
      if ("trend" in data)
        data.trend = coerceScreenEnum(data.trend, ["auto", "up", "down", "flat"], "auto");
      break;
    case "divider":
      if ("variant" in data)
        data.variant = coerceScreenEnum(data.variant, ["line", "space", "label"], "line");
      break;
    case "image":
      if ("fit" in data) data.fit = coerceScreenEnum(data.fit, ["cover", "contain"], "cover");
      break;
    case "related-list":
      if ("variant" in data)
        data.variant = coerceScreenEnum(
          data.variant,
          ["checklist", "activity", "cards"],
          "checklist"
        );
      if ("limit" in data) data.limit = clampScreenInt(data.limit, 5, 1, 50);
      break;
    case "tabs":
      if ("tabs" in data) {
        const raw = Array.isArray(data.tabs) ? data.tabs : [];
        data.tabs = raw
          .filter((tab): tab is Record<string, unknown> => isRecord(tab))
          .map((tab) => ({
            id: typeof tab.id === "string" ? tab.id : "",
            label: typeof tab.label === "string" ? tab.label : "",
          }));
      }
      break;
    case "button":
      if ("action" in data)
        data.action = coerceScreenEnum(data.action, ["link", "publish", "custom"], "link");
      if ("variant" in data)
        data.variant = coerceScreenEnum(data.variant, ["primary", "secondary", "ghost"], "primary");
      break;
    default:
      break;
  }
  return data;
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

const normalizeScreenBlock = (value: unknown, index: number): ScreenBlockV1 => {
  if (!isRecord(value)) throw new Error("custom_screen_definition_invalid");
  rejectUnknownKeys(value, [
    "id",
    "type",
    "label",
    "variant",
    "data",
    "layout",
    "visibility",
    "editor",
    "legacyWidgetType",
    "children",
    "slots",
  ]);
  const id = normalizePath(value.id ?? `block-${index + 1}`);
  const type = normalizeText(value.type);
  if (!type) throw new Error("custom_screen_definition_invalid");
  const label = normalizeText(value.label);
  const variant = normalizeText(value.variant);
  const legacyWidgetType = normalizeText(value.legacyWidgetType);
  const children = Array.isArray(value.children)
    ? normalizeUniqueIds(
        value.children.map((item, childIndex) => normalizeScreenBlock(item, childIndex))
      )
    : undefined;
  const slots =
    value.slots === undefined || value.slots === null
      ? undefined
      : isRecord(value.slots)
        ? Object.fromEntries(
            Object.entries(value.slots).map(([slotId, items]) => {
              if (!normalizeText(slotId)) throw new Error("custom_screen_definition_invalid");
              if (!Array.isArray(items)) throw new Error("custom_screen_definition_invalid");
              return [
                slotId,
                normalizeUniqueIds(
                  items.map((item, slotIndex) => normalizeScreenBlock(item, slotIndex))
                ),
              ];
            })
          )
        : null;
  if (slots === null) throw new Error("custom_screen_definition_invalid");

  return {
    id,
    type,
    ...(label ? { label } : {}),
    ...(variant ? { variant } : {}),
    data: normalizeScreenBlockData(type, value.data),
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

const normalizeScreenSection = (value: unknown, index: number): ScreenSectionV1 => {
  if (!isRecord(value)) throw new Error("custom_screen_definition_invalid");
  rejectUnknownKeys(value, ["id", "type", "label", "data", "layout", "visibility", "blocks"]);
  const id = normalizePath(value.id ?? `section-${index + 1}`);
  const type = normalizeText(value.type) ?? "section";
  if (type !== "section") throw new Error("custom_screen_definition_invalid");
  const label = normalizeText(value.label);
  if (value.blocks !== undefined && !Array.isArray(value.blocks)) {
    throw new Error("custom_screen_definition_invalid");
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
    blocks: normalizeUniqueIds(
      (value.blocks ?? []).map((item, blockIndex) => normalizeScreenBlock(item, blockIndex))
    ),
  };
};

const sectionsLookLikeLegacyBlockArray = (sections: unknown[]) =>
  sections.some((item) => isRecord(item) && !("blocks" in item));

export function normalizeScreenDocumentV1(input: unknown): ScreenDocumentV1 {
  if (input === undefined || input === null) return { schemaVersion: 1, sections: [] };
  if (!isRecord(input)) throw new Error("custom_screen_definition_invalid");
  rejectUnknownKeys(input, ["schemaVersion", "sections"]);
  const schemaVersion = input.schemaVersion ?? 1;
  if (schemaVersion !== 1) throw new Error("custom_screen_definition_invalid");
  if (input.sections !== undefined && !Array.isArray(input.sections)) {
    throw new Error("custom_screen_definition_invalid");
  }
  return {
    schemaVersion: 1,
    sections: normalizeUniqueIds(
      (input.sections ?? []).map((item, index) => normalizeScreenSection(item, index))
    ),
  };
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

const repairLegacyScreenRecordForRead = (node: unknown): unknown => {
  if (Array.isArray(node)) return node.map(repairLegacyScreenRecordForRead);
  if (!isRecord(node)) return node;
  const next: Record<string, unknown> = { ...node };
  let changed = false;
  const repairedType =
    typeof node.type === "string" ? READ_REPAIR_BLOCK_TYPE[node.type] : undefined;
  if (repairedType) {
    next.type = repairedType;
    const allowed = screenBlockDataAllowedKeys[repairedType];
    if (allowed && isRecord(node.data)) {
      next.data = Object.fromEntries(
        Object.entries(node.data).filter(([key]) => allowed.includes(key))
      );
    }
    changed = true;
  }
  for (const key of ["blocks", "children"] as const) {
    if (Array.isArray(node[key])) {
      next[key] = node[key].map(repairLegacyScreenRecordForRead);
      changed = true;
    }
  }
  if (isRecord(node.slots)) {
    next.slots = Object.fromEntries(
      Object.entries(node.slots).map(([slot, items]) => [
        slot,
        Array.isArray(items) ? items.map(repairLegacyScreenRecordForRead) : items,
      ])
    );
    changed = true;
  }
  return changed ? next : node;
};

export function normalizeScreenDocumentV1ForRead(input: unknown): ScreenDocumentV1 {
  if (input === undefined || input === null) return { schemaVersion: 1, sections: [] };
  if (!isRecord(input)) throw new Error("custom_screen_definition_invalid");
  rejectUnknownKeys(input, ["schemaVersion", "sections"]);
  const schemaVersion = input.schemaVersion ?? 1;
  if (schemaVersion !== 1) throw new Error("custom_screen_definition_invalid");
  if (input.sections !== undefined && !Array.isArray(input.sections)) {
    throw new Error("custom_screen_definition_invalid");
  }
  const sections = repairLegacyScreenRecordForRead(input.sections ?? []) as unknown[];
  if (sectionsLookLikeLegacyBlockArray(sections)) {
    return {
      schemaVersion: 1,
      sections:
        sections.length > 0
          ? [
              createDefaultScreenSection(
                normalizeUniqueIds(sections.map((item, index) => normalizeScreenBlock(item, index)))
              ),
            ]
          : [],
    };
  }
  return {
    schemaVersion: 1,
    sections: normalizeUniqueIds(
      sections.map((item, index) => normalizeScreenSection(item, index))
    ),
  };
}

const normalizeScreenFieldBinding = (
  value: unknown,
  index: number,
  context?: CustomScreenDefinitionContext
): ScreenFieldBinding => {
  if (!isRecord(value)) throw new Error("custom_screen_definition_invalid");
  rejectUnknownKeys(value, ["id", "blockId", "widgetId", "propPath", "source", "field", "mode"]);
  const blockId = normalizeText(value.blockId) ?? normalizeText(value.widgetId);
  if (!blockId) throw new Error("custom_screen_definition_invalid");
  const propPath = normalizePath(value.propPath);
  const field = normalizePath(value.field);
  const fieldRoot = field.split(".")[0] ?? field;
  const allowedFieldRoots = getAllowedBindingFieldRoots(context);
  if (allowedFieldRoots && !allowedFieldRoots.has(fieldRoot)) {
    throw new Error("custom_screen_definition_invalid");
  }
  const source = normalizeText(value.source) ?? "entry";
  if (source !== "entry") throw new Error("custom_screen_definition_invalid");
  const id = slugify(normalizeText(value.id) ?? `${blockId}-${propPath}`) || `binding-${index + 1}`;
  return {
    id,
    blockId,
    propPath,
    source: "entry",
    field,
    mode: normalizeBindingMode(value.mode),
  };
};

export function normalizeScreenFieldBindings(
  value: unknown,
  context?: CustomScreenDefinitionContext
): ScreenFieldBinding[] {
  if (value === undefined || value === null) return [];
  if (!Array.isArray(value)) throw new Error("custom_screen_definition_invalid");
  return normalizeUniqueIds(
    value.map((item, index) => normalizeScreenFieldBinding(item, index, context))
  );
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
  if (blockIds.size > 0 && bindings.some((binding) => !blockIds.has(binding.blockId))) {
    throw new Error("custom_screen_definition_invalid");
  }
};

const normalizeCustomScreenListRowTemplate = (
  input: unknown,
  context?: CustomScreenDefinitionContext
): CustomScreenListRowTemplate => {
  if (!isRecord(input)) throw new Error("custom_screen_definition_invalid");
  rejectUnknownKeys(input, ["document", "bindings"]);
  const document = normalizeScreenDocumentV1(input.document);
  const bindings = normalizeScreenFieldBindings(input.bindings, context);
  assertScreenFieldBindingsTargetDocument(document, bindings);
  return { document, bindings };
};

const normalizeCustomScreenListRowTemplateForRead = (
  input: unknown,
  fallback: CustomScreenListRowTemplate,
  context?: CustomScreenDefinitionContext
): CustomScreenListRowTemplate => {
  try {
    return normalizeCustomScreenListRowTemplate(input, context);
  } catch {
    return fallback;
  }
};

export function normalizeCustomScreenListViewDefinition(
  input: unknown,
  context?: CustomScreenDefinitionContext
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
      : normalizeCustomScreenListRowTemplate(input.rowTemplate, context);

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
  context?: CustomScreenDefinitionContext
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
  const document = normalizeScreenDocumentV1(input.document);
  const bindings = normalizeScreenFieldBindings(input.bindings, context);
  const blockIds = collectScreenBlockIds(document);
  if (blockIds.size > 0 && bindings.some((binding) => !blockIds.has(binding.blockId))) {
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
  context?: CustomScreenDefinitionContext
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
  const document = normalizeScreenDocumentV1ForRead(input.document);
  const bindings = normalizeScreenFieldBindings(input.bindings, context);
  const blockIds = collectScreenBlockIds(document);
  if (blockIds.size > 0 && bindings.some((binding) => !blockIds.has(binding.blockId))) {
    throw new Error("custom_screen_definition_invalid");
  }
  return {
    document,
    bindings,
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
  return {
    schemaVersion: 4,
    listView: normalizeCustomScreenListViewDefinitionForRead(definition.listView, context),
    editorView: {
      document: migrateWidgetBlocksToScreenDocument(editorView.blocks),
      bindings: editorView.bindings.map(migrateCustomScreenBindingToScreenFieldBinding),
      saveMode: "entry",
      interactionMode: "inline",
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
  context?: CustomScreenDefinitionContext
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
    listView: normalizeCustomScreenListViewDefinition(rawInput.listView, context),
    editorView: normalizeCustomScreenEditorViewDefinitionV4(rawInput.editorView, context),
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

const screenFieldBindingSchema = {
  type: "object",
  required: ["blockId", "propPath", "source", "field"],
  properties: {
    id: { type: "string", minLength: 1, maxLength: 120 },
    blockId: { type: "string", minLength: 1, maxLength: 160 },
    propPath: {
      type: "string",
      minLength: 1,
      maxLength: 160,
      pattern: "^[a-zA-Z0-9_.-]+$",
    },
    source: { enum: ["entry"] },
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

const screenBlockV1Schema = {
  type: "object",
  required: ["id", "type", "data"],
  properties: {
    id: { type: "string", minLength: 1, maxLength: 160 },
    type: { type: "string", minLength: 1, maxLength: 160 },
    label: { type: "string", minLength: 1, maxLength: 160 },
    variant: { type: "string", minLength: 1, maxLength: 80 },
    data: { type: "object" },
    layout: { type: "object" },
    visibility: { type: "object" },
    editor: { type: "object" },
    legacyWidgetType: { type: "string", minLength: 1, maxLength: 160 },
    children: {
      type: "array",
      maxItems: 500,
      items: { type: "object" },
    },
    slots: {
      type: "object",
      additionalProperties: {
        type: "array",
        maxItems: 500,
        items: { type: "object" },
      },
    },
  },
  additionalProperties: false,
} as const;

const screenSectionV1Schema = {
  type: "object",
  required: ["id", "type", "data", "blocks"],
  properties: {
    id: { type: "string", minLength: 1, maxLength: 160 },
    type: { enum: ["section"] },
    label: { type: "string", minLength: 1, maxLength: 160 },
    data: { type: "object" },
    layout: { type: "object" },
    visibility: { type: "object" },
    blocks: {
      type: "array",
      maxItems: 500,
      items: screenBlockV1Schema,
    },
  },
  additionalProperties: false,
} as const;

const screenDocumentV1Schema = {
  type: "object",
  required: ["schemaVersion", "sections"],
  properties: {
    schemaVersion: { enum: [1] },
    sections: {
      type: "array",
      maxItems: 120,
      items: screenSectionV1Schema,
    },
  },
  additionalProperties: false,
} as const;

const customScreenListRowTemplateSchema = {
  type: "object",
  required: ["document", "bindings"],
  properties: {
    document: screenDocumentV1Schema,
    bindings: {
      type: "array",
      maxItems: 200,
      items: screenFieldBindingSchema,
    },
  },
  additionalProperties: false,
} as const;

const customScreenV4ListViewSchema = {
  ...customScreenV3DefinitionSchema.properties.listView,
  properties: {
    ...customScreenV3DefinitionSchema.properties.listView.properties,
    rowTemplate: customScreenListRowTemplateSchema,
  },
  additionalProperties: false,
} as const;

const customScreenV4DefinitionSchema = {
  type: "object",
  required: ["schemaVersion", "listView", "editorView"],
  properties: {
    schemaVersion: { enum: [4] },
    listView: customScreenV4ListViewSchema,
    editorView: {
      type: "object",
      required: ["document", "bindings", "saveMode", "interactionMode"],
      properties: {
        document: screenDocumentV1Schema,
        bindings: {
          type: "array",
          maxItems: 200,
          items: screenFieldBindingSchema,
        },
        saveMode: { enum: ["entry"] },
        interactionMode: { enum: ["inline"] },
      },
      additionalProperties: false,
    },
  },
  additionalProperties: false,
} as const;

export const customScreenDefinitionSchema = {
  ...customScreenV4DefinitionSchema,
} as const;

export const customScreenCreateSchema = {
  type: "object",
  required: ["name", "contentTypeId"],
  properties: {
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
    schemaVersion: { enum: [4] },
    definition: customScreenDefinitionSchema,
  },
  additionalProperties: false,
} as const;

export const customScreenUpdateSchema = {
  type: "object",
  minProperties: 1,
  properties: {
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
    schemaVersion: { enum: [4] },
    definition: customScreenDefinitionSchema,
  },
  additionalProperties: false,
} as const;
