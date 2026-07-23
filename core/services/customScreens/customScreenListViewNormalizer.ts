import { normalizeScreenFieldBindingsWithMode } from "./customScreenBindingNormalizer";
import type {
  CustomScreenBindingMode,
  CustomScreenDefinitionContext,
  CustomScreenListColumn,
  CustomScreenListFilter,
  CustomScreenListFormatter,
  CustomScreenListRowTemplate,
  CustomScreenListViewDefinition,
  ScreenBindingWarningSink,
  ScreenFieldBinding,
} from "./customScreenContracts";
import {
  assertScreenFieldBindingsTargetDocument,
  collectScreenDocumentBlockIds,
  normalizeScreenDocumentV1AtPath,
} from "./screenDocumentNormalizer";
import {
  assertFieldAllowed,
  columnSources,
  filterOperators,
  getSchemaFieldNames,
  isRecord,
  listFormatters,
  normalizeBoolean,
  normalizePath,
  normalizeStringEnum,
  normalizeText,
  normalizeUniqueIds,
  readContentSchemaProperties,
  rejectUnknownKeys,
  slugify,
  sortDirections,
  systemListFields,
} from "./customScreenNormalizationPrimitives";
import { normalizeScreenDocumentV1ForReadWithRepairAtPath } from "./screenDocumentReadNormalizer";

export const readSchemaFieldKind = (definition: unknown): CustomScreenListFormatter => {
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

export const resolveFieldLabel = (field: string, definition?: unknown) => {
  if (isRecord(definition) && typeof definition.title === "string") {
    const title = definition.title.trim();
    if (title) return title;
  }
  return field
    .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
    .replace(/[-_]+/g, " ")
    .replace(/\b\w/g, (char) => char.toUpperCase());
};

export const systemColumn = (field: string, label?: string): CustomScreenListColumn => ({
  id: `system-${slugify(field)}`,
  source: "system",
  field,
  label: label ?? resolveFieldLabel(field),
  formatter: field.endsWith("At") ? "date" : "text",
  visible: true,
});

export const fieldColumn = (field: string, definition: unknown): CustomScreenListColumn => ({
  id: `field-${slugify(field)}`,
  source: "field",
  field,
  label: resolveFieldLabel(field, definition),
  formatter: readSchemaFieldKind(definition),
  visible: true,
});

export const fieldFilter = (field: string, definition: unknown): CustomScreenListFilter => ({
  id: `filter-${slugify(field)}`,
  source: "field",
  field,
  label: resolveFieldLabel(field, definition),
  operator: "equals",
  enabled: true,
});

export const rowTemplateBindingMode = (column: CustomScreenListColumn): CustomScreenBindingMode =>
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

export const pickSchemaField = (properties: Record<string, unknown>, preferred: string[]) => {
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

export const normalizeListColumn = (
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

export const normalizeListFilter = (
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

// TASK-505-01 (Item B): the SECOND (independent) binding dead-end — the list-view
// row-template binding set. Threads the SAME shared `sink` (field-orphans via
// normalizeScreenFieldBindings) and REPLACES the fatal block-orphan gate
// (assertScreenFieldBindingsTargetDocument) with an INLINE prune against the already-computed
// schemas-local Set — no import from screenDocumentOps.ts (would invert the schemas←ops layer).
export const normalizeCustomScreenListRowTemplate = (
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

export const normalizeCustomScreenListRowTemplateForRead = (
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

export const normalizeCustomScreenListViewDefinitionForRead = (
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
