import type { WidgetBlock } from "../../widgets/types";
import { ensureRuntimeWidgetsRegistered } from "../../widgets/runtime";
import { normalizeWidgetBlocks } from "../../widgets/validator";

export const customScreenBindingModes = ["read", "write", "readwrite"] as const;
export const customScreenStatusValues = ["draft", "active"] as const;
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
export type CustomScreenDefinitionVersion = 1 | 2;
export type CustomScreenRowClickMode = (typeof customScreenRowClickModes)[number];
export type CustomScreenCreateMode = (typeof customScreenCreateModes)[number];
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

export type CustomScreenListViewDefinition = {
  columns: CustomScreenListColumn[];
  filters: CustomScreenListFilter[];
  defaultSort: {
    field: string;
    direction: CustomScreenSortDirection;
  };
  rowClick: CustomScreenRowClickMode;
  createMode: CustomScreenCreateMode;
  bulkActions: {
    delete: boolean;
    publish: boolean;
    unpublish: boolean;
  };
};

export type CustomScreenEditorViewDefinition = {
  blocks: WidgetBlock[];
  bindings: CustomScreenBinding[];
  saveMode: "entry";
};

export type CustomScreenDefinitionV2 = {
  schemaVersion: 2;
  listView: CustomScreenListViewDefinition;
  editorView: CustomScreenEditorViewDefinition;
};

export type CustomScreenDefinition = CustomScreenDefinitionV2;

export type CustomScreenSidebarConfig = {
  showInSidebar: boolean;
  sidebarLabel: string | null;
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

const supportedDefinitionVersions = new Set<CustomScreenDefinitionVersion>([1, 2]);
const bindingModes = new Set<CustomScreenBindingMode>(customScreenBindingModes);
const unsafePathSegments = new Set(["__proto__", "prototype", "constructor"]);
const rowClickModes = new Set<CustomScreenRowClickMode>(customScreenRowClickModes);
const createModes = new Set<CustomScreenCreateMode>(customScreenCreateModes);
const columnSources = new Set<CustomScreenListColumnSource>(customScreenListColumnSources);
const listFormatters = new Set<CustomScreenListFormatter>(customScreenListFormatters);
const sortDirections = new Set<CustomScreenSortDirection>(customScreenSortDirections);
const filterOperators = new Set<CustomScreenListFilterOperator>(customScreenListFilterOperators);
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

export function normalizeCustomScreenBlocks(value: unknown): WidgetBlock[] {
  if (value === undefined || value === null) return [];
  if (!Array.isArray(value)) {
    throw new Error("custom_screen_definition_invalid");
  }
  ensureRuntimeWidgetsRegistered();
  return normalizeWidgetBlocks(value as WidgetBlock[]);
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
    rowClick: "editor-view",
    createMode: "editor-view",
    bulkActions: {
      delete: true,
      publish: true,
      unpublish: true,
    },
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

export function normalizeCustomScreenListViewDefinition(
  input: unknown,
  context?: CustomScreenDefinitionContext
): CustomScreenListViewDefinition {
  if (input === undefined || input === null) {
    return buildDefaultListViewDefinition(context?.contentType);
  }
  if (!isRecord(input)) throw new Error("custom_screen_definition_invalid");
  rejectUnknownKeys(input, [
    "columns",
    "filters",
    "defaultSort",
    "rowClick",
    "createMode",
    "bulkActions",
  ]);

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

  return {
    columns,
    filters,
    defaultSort,
    rowClick: normalizeStringEnum(input.rowClick, rowClickModes, defaults.rowClick),
    createMode: normalizeStringEnum(input.createMode, createModes, defaults.createMode),
    bulkActions,
  };
}

export function normalizeCustomScreenEditorViewDefinition(
  input: unknown,
  context?: CustomScreenDefinitionContext
): CustomScreenEditorViewDefinition {
  if (input === undefined || input === null) {
    return { blocks: [], bindings: [], saveMode: "entry" };
  }
  if (!isRecord(input)) throw new Error("custom_screen_definition_invalid");
  rejectUnknownKeys(input, ["blocks", "bindings", "saveMode"]);
  const saveMode = normalizeText(input.saveMode) ?? "entry";
  if (saveMode !== "entry") throw new Error("custom_screen_definition_invalid");
  return {
    blocks: normalizeCustomScreenBlocks(input.blocks),
    bindings: normalizeCustomScreenBindings(input.bindings, context),
    saveMode: "entry",
  };
}

export function migrateV1DefinitionToV2(
  definition: CustomScreenDefinitionV1,
  context?: CustomScreenDefinitionContext
): CustomScreenDefinitionV2 {
  return {
    schemaVersion: 2,
    listView: buildDefaultListViewDefinition(context?.contentType),
    editorView: {
      blocks: definition.blocks,
      bindings: definition.bindings,
      saveMode: "entry",
    },
  };
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
  const version =
    "listView" in rawInput || "editorView" in rawInput
      ? 2
      : normalizeCustomScreenSchemaVersion(rawInput.schemaVersion);

  if (version === 1) {
    return migrateV1DefinitionToV2(normalizeCustomScreenV1Definition(rawInput, context), context);
  }

  rejectUnknownKeys(rawInput, ["schemaVersion", "listView", "editorView"]);
  const schemaVersion = normalizeCustomScreenSchemaVersion(rawInput.schemaVersion);
  if (schemaVersion !== 2) throw new Error("custom_screen_definition_invalid");
  return {
    schemaVersion: 2,
    listView: normalizeCustomScreenListViewDefinition(rawInput.listView, context),
    editorView: normalizeCustomScreenEditorViewDefinition(rawInput.editorView, context),
  };
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

const customScreenLegacyDefinitionSchema = {
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

const customScreenV2DefinitionSchema = {
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

export const customScreenDefinitionSchema = {
  oneOf: [customScreenLegacyDefinitionSchema, customScreenV2DefinitionSchema],
} as const;

export const customScreenCreateSchema = {
  type: "object",
  required: ["name", "contentTypeId"],
  properties: {
    name: { type: "string", minLength: 1, maxLength: 160 },
    contentTypeId: { type: "string", minLength: 1, maxLength: 64 },
    status: { enum: customScreenStatusValues },
    showInSidebar: { type: "boolean" },
    sidebarLabel: {
      anyOf: [{ type: "string", minLength: 1, maxLength: 160 }, { type: "null" }],
    },
    schemaVersion: { enum: [1, 2] },
    definition: customScreenDefinitionSchema,
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

export const customScreenUpdateSchema = {
  type: "object",
  minProperties: 1,
  properties: {
    name: { type: "string", minLength: 1, maxLength: 160 },
    contentTypeId: { type: "string", minLength: 1, maxLength: 64 },
    status: { enum: customScreenStatusValues },
    showInSidebar: { type: "boolean" },
    sidebarLabel: {
      anyOf: [{ type: "string", minLength: 1, maxLength: 160 }, { type: "null" }],
    },
    schemaVersion: { enum: [1, 2] },
    definition: customScreenDefinitionSchema,
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
