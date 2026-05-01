import type { ContentTypeSummary } from "@/services/contentTypesClient";
import type { EntrySummary } from "@/services/entriesClient";
import type { CustomScreenRecord } from "@/services/customScreensClient";
import { fieldsFromSchema } from "@/ui/content-types/schemaMapping";

import { resolveCustomScreenCapabilities } from "../../../services/customScreens/capabilities";
import type {
  CustomScreenListColumn,
  CustomScreenListFilter,
  CustomScreenListFormatter,
  CustomScreenListViewDefinition,
} from "../../../services/customScreens/customScreenSchemas";

export type CustomScreenSidebarShortcutState = "visible" | "configured_after_activation" | "hidden";
export type CustomScreenSidebarShortcutStateV3 =
  | CustomScreenSidebarShortcutState
  | "requires_editor_setup";

export type CustomScreenListRow = {
  screen: CustomScreenRecord;
  contentTypeLabel: string;
  contentTypeSlug?: string;
  modeLabel: string;
  sidebarShortcutLabel: string | null;
  sidebarShortcutState: CustomScreenSidebarShortcutStateV3;
  updatedAt: string;
};

export type CustomScreenFilterStatus = "all" | "active" | "draft";

export type CustomScreenContentTypeFilterOption = {
  value: string;
  label: string;
};

export type CustomScreenEntriesFilterOption = {
  id: string;
  label: string;
  options: Array<{ value: string; label: string }>;
};

export const resolveCustomScreenModeLabel = (screen: CustomScreenRecord) => {
  const capabilities =
    screen.capabilities ??
    resolveCustomScreenCapabilities({
      blocks: screen.blocks,
      bindings: screen.bindings,
    });
  if (capabilities.supportsDedicatedEditor) return "Workspace ready";
  if (capabilities.supportsDedicatedPreview) return "Preview only";
  return "Setup required";
};

export const resolveCustomScreenSidebarShortcutState = (
  screen: CustomScreenRecord
): CustomScreenSidebarShortcutStateV3 => {
  const capabilities =
    screen.capabilities ??
    resolveCustomScreenCapabilities({
      definition: screen.definition,
      blocks: screen.blocks,
      bindings: screen.bindings,
    });
  if (!screen.showInSidebar) return "hidden";
  if (screen.status === "active" && capabilities.supportsDedicatedEditor !== true) {
    return "requires_editor_setup";
  }
  if (screen.status === "active") return "visible";
  return "configured_after_activation";
};

export const buildCustomScreenListRows = (
  screens: CustomScreenRecord[],
  contentTypes: ContentTypeSummary[]
): CustomScreenListRow[] => {
  const contentTypeMap = new Map(contentTypes.map((type) => [type.id, type] as const));
  return screens.map((screen) => {
    const contentType = contentTypeMap.get(screen.contentTypeId);
    const sidebarShortcutState = resolveCustomScreenSidebarShortcutState(screen);
    return {
      screen,
      contentTypeLabel: contentType?.name ?? screen.contentTypeId,
      contentTypeSlug: contentType?.slug,
      modeLabel: resolveCustomScreenModeLabel(screen),
      sidebarShortcutLabel: screen.showInSidebar
        ? screen.sidebarLabel?.trim() || screen.name
        : null,
      sidebarShortcutState,
      updatedAt: screen.updatedAt,
    };
  });
};

export function filterCustomScreenRows(
  rows: CustomScreenListRow[],
  query: string,
  status: CustomScreenFilterStatus,
  contentTypeId: string
) {
  const normalized = query.trim().toLowerCase();
  return rows.filter((row) => {
    const screen = row.screen;
    const matchesQuery =
      !normalized ||
      screen.name.toLowerCase().includes(normalized) ||
      (screen.sidebarLabel ?? "").toLowerCase().includes(normalized) ||
      row.contentTypeLabel.toLowerCase().includes(normalized) ||
      screen.contentTypeId.toLowerCase().includes(normalized);
    const matchesStatus = status === "all" || screen.status === status;
    const matchesContentType = contentTypeId === "all" || screen.contentTypeId === contentTypeId;
    return matchesQuery && matchesStatus && matchesContentType;
  });
}

export const buildCustomScreenContentTypeFilterOptions = (
  rows: CustomScreenListRow[],
  contentTypes: ContentTypeSummary[]
): CustomScreenContentTypeFilterOption[] => {
  const byId = new Map<string, string>();
  for (const type of contentTypes) {
    byId.set(type.id, type.name);
  }
  for (const row of rows) {
    if (!byId.has(row.screen.contentTypeId)) {
      byId.set(row.screen.contentTypeId, row.contentTypeLabel);
    }
  }
  return Array.from(byId.entries())
    .map(([value, label]) => ({ value, label }))
    .sort((left, right) => left.label.localeCompare(right.label));
};

export type CustomScreenListFieldOption = {
  source: "system" | "field";
  field: string;
  label: string;
  formatter: CustomScreenListFormatter;
};

const systemFieldOptions: CustomScreenListFieldOption[] = [
  { source: "system", field: "title", label: "Record", formatter: "text" },
  { source: "system", field: "slug", label: "Slug", formatter: "text" },
  { source: "system", field: "status", label: "Status", formatter: "text" },
  { source: "system", field: "createdAt", label: "Created", formatter: "date" },
  { source: "system", field: "updatedAt", label: "Updated", formatter: "date" },
  { source: "system", field: "publishedAt", label: "Published", formatter: "date" },
];

const inferFormatter = (fieldType: string): CustomScreenListFormatter => {
  if (fieldType === "number") return "number";
  if (fieldType === "boolean") return "boolean";
  if (fieldType === "select") return "select";
  if (fieldType === "media") return "media";
  if (fieldType === "relation") return "relation";
  return "text";
};

const toConfigId = (value: string) =>
  value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)+/g, "");

export function listSelectableListFields(
  contentType: ContentTypeSummary
): CustomScreenListFieldOption[] {
  return [
    ...systemFieldOptions,
    ...fieldsFromSchema(contentType.schema).map((field) => ({
      source: "field" as const,
      field: field.name,
      label: field.label,
      formatter: inferFormatter(field.type),
    })),
  ];
}

export function buildListColumnFromOption(
  option: CustomScreenListFieldOption
): CustomScreenListColumn {
  return {
    id: toConfigId(`${option.source}-${option.field}`),
    source: option.source,
    field: option.field,
    label: option.label,
    formatter: option.formatter,
    visible: true,
  };
}

export function buildListFilterFromOption(
  option: CustomScreenListFieldOption
): CustomScreenListFilter {
  return {
    id: toConfigId(`filter-${option.source}-${option.field}`),
    source: option.source,
    field: option.field,
    label: option.label,
    operator: "equals",
    enabled: true,
  };
}

const entryStatusLabels: Record<EntrySummary["status"], string> = {
  published: "Published",
  draft: "Draft",
  scheduled: "Scheduled",
  archived: "Archived",
};

const formatDate = (value: unknown) => {
  if (typeof value !== "string" && !(value instanceof Date)) return "";
  try {
    return new Date(value).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  } catch {
    return String(value);
  }
};

const formatListValue = (value: unknown, formatter: CustomScreenListFormatter) => {
  if (value === undefined || value === null || value === "") return "—";
  if (formatter === "date") return formatDate(value);
  if (formatter === "boolean") return value === true ? "Yes" : "No";
  if (formatter === "number" && typeof value === "number") {
    return new Intl.NumberFormat("en-US").format(value);
  }
  if (Array.isArray(value)) return value.map((item) => String(item)).join(", ");
  return String(value);
};

export function readSystemEntryField(entry: EntrySummary, field: string) {
  switch (field) {
    case "title":
      return entry.title;
    case "slug":
      return entry.slug;
    case "status":
      return entry.status;
    case "createdAt":
      return entry.createdAt;
    case "updatedAt":
      return entry.updatedAt;
    case "publishedAt":
      return entry.publishedAt ?? null;
    default:
      return undefined;
  }
}

const readEntryFieldValue = (input: {
  entry: EntrySummary;
  source: "system" | "field";
  field: string;
}) =>
  input.source === "system"
    ? readSystemEntryField(input.entry, input.field)
    : input.entry.data?.[input.field];

const normalizeFilterToken = (value: unknown): string | null => {
  if (value === undefined || value === null || value === "") return null;
  if (typeof value === "boolean") return value ? "true" : "false";
  if (typeof value === "number") return String(value);
  if (typeof value === "string") return value;
  return String(value);
};

const resolveFilterOptionLabel = (rawValue: string, field: string) => {
  if (field === "status" && rawValue in entryStatusLabels) {
    return entryStatusLabels[rawValue as EntrySummary["status"]];
  }
  if (rawValue === "true") return "Yes";
  if (rawValue === "false") return "No";
  return rawValue;
};

const compareEntryValues = (left: unknown, right: unknown) => {
  if (left === right) return 0;
  if (left === undefined || left === null || left === "") return 1;
  if (right === undefined || right === null || right === "") return -1;
  if (typeof left === "number" && typeof right === "number") return left - right;
  if (typeof left === "boolean" && typeof right === "boolean") {
    return Number(left) - Number(right);
  }

  const leftDate = left instanceof Date ? left.getTime() : Date.parse(String(left));
  const rightDate = right instanceof Date ? right.getTime() : Date.parse(String(right));
  if (!Number.isNaN(leftDate) && !Number.isNaN(rightDate)) {
    return leftDate - rightDate;
  }

  return String(left).localeCompare(String(right), undefined, {
    numeric: true,
    sensitivity: "base",
  });
};

const resolveDefaultSortSource = (
  listView: CustomScreenListViewDefinition,
  field: string
): "system" | "field" => {
  const columnSource = listView.columns.find((column) => column.field === field)?.source;
  if (columnSource) return columnSource;
  const filterSource = listView.filters.find((filter) => filter.field === field)?.source;
  if (filterSource) return filterSource;
  return systemFieldOptions.some((option) => option.field === field) ? "system" : "field";
};

export function resolveEntryColumnValue(input: {
  entry: EntrySummary;
  column: CustomScreenListColumn;
}) {
  const rawValue = readEntryFieldValue({
    entry: input.entry,
    source: input.column.source,
    field: input.column.field,
  });
  return formatListValue(rawValue, input.column.formatter);
}

export function getVisibleListColumns(listView: CustomScreenListViewDefinition) {
  return listView.columns.filter((column) => column.visible !== false);
}

export function buildCustomScreenEntriesFilterOptions(input: {
  entries: EntrySummary[];
  listView: CustomScreenListViewDefinition;
}) {
  return input.listView.filters
    .filter((filter) => filter.enabled === true)
    .map((filter): CustomScreenEntriesFilterOption => {
      const values = new Map<string, string>();
      input.entries.forEach((entry) => {
        const rawValue = readEntryFieldValue({
          entry,
          source: filter.source,
          field: filter.field,
        });
        if (Array.isArray(rawValue)) {
          rawValue.forEach((item) => {
            const token = normalizeFilterToken(item);
            if (!token) return;
            values.set(token, resolveFilterOptionLabel(token, filter.field));
          });
          return;
        }
        const token = normalizeFilterToken(rawValue);
        if (!token) return;
        values.set(token, resolveFilterOptionLabel(token, filter.field));
      });

      const options = Array.from(values.entries())
        .map(([value, label]) => ({ value, label }))
        .sort((left, right) =>
          left.label.localeCompare(right.label, undefined, { sensitivity: "base" })
        );

      return {
        id: filter.id,
        label: filter.label,
        options,
      };
    })
    .filter((filter) => filter.options.length > 0);
}

export function filterCustomScreenEntries(input: {
  entries: EntrySummary[];
  listView: CustomScreenListViewDefinition;
  query: string;
  filters: Record<string, string>;
}) {
  const normalizedQuery = input.query.trim().toLowerCase();
  const enabledFilters = input.listView.filters.filter((filter) => filter.enabled === true);

  return input.entries.filter((entry) => {
    const matchesQuery =
      !normalizedQuery ||
      entry.title.toLowerCase().includes(normalizedQuery) ||
      entry.slug.toLowerCase().includes(normalizedQuery);
    if (!matchesQuery) return false;

    return enabledFilters.every((filter) => {
      const selectedValue = input.filters[filter.id];
      if (!selectedValue || selectedValue === "all") return true;
      const rawValue = readEntryFieldValue({
        entry,
        source: filter.source,
        field: filter.field,
      });
      if (Array.isArray(rawValue)) {
        return rawValue.some((item) => normalizeFilterToken(item) === selectedValue);
      }
      return normalizeFilterToken(rawValue) === selectedValue;
    });
  });
}

export function sortCustomScreenEntries(
  entries: EntrySummary[],
  listView: CustomScreenListViewDefinition
) {
  const source = resolveDefaultSortSource(listView, listView.defaultSort.field);
  const direction = listView.defaultSort.direction === "asc" ? 1 : -1;

  return [...entries].sort((left, right) => {
    const leftValue = readEntryFieldValue({
      entry: left,
      source,
      field: listView.defaultSort.field,
    });
    const rightValue = readEntryFieldValue({
      entry: right,
      source,
      field: listView.defaultSort.field,
    });
    return compareEntryValues(leftValue, rightValue) * direction;
  });
}
