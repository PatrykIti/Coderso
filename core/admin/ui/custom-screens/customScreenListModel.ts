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

export type CustomScreenListRow = {
  screen: CustomScreenRecord;
  contentTypeLabel: string;
  contentTypeSlug?: string;
  modeLabel: string;
  sidebarShortcutLabel: string | null;
  sidebarShortcutState: CustomScreenSidebarShortcutState;
  updatedAt: string;
};

export type CustomScreenFilterStatus = "all" | "active" | "draft";

export type CustomScreenContentTypeFilterOption = {
  value: string;
  label: string;
};

const modeLabels = {
  "collection-only": "Collection",
  dashboard: "Dashboard",
  editor: "Editor",
} as const;

export const resolveCustomScreenModeLabel = (screen: CustomScreenRecord) => {
  const capabilities =
    screen.capabilities ??
    resolveCustomScreenCapabilities({
      blocks: screen.blocks,
      bindings: screen.bindings,
    });
  return modeLabels[capabilities.mode] ?? "Collection";
};

export const resolveCustomScreenSidebarShortcutState = (
  screen: CustomScreenRecord
): CustomScreenSidebarShortcutState => {
  if (!screen.showInSidebar) return "hidden";
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

export function resolveEntryColumnValue(input: {
  entry: EntrySummary;
  column: CustomScreenListColumn;
}) {
  const rawValue =
    input.column.source === "system"
      ? readSystemEntryField(input.entry, input.column.field)
      : input.entry.data?.[input.column.field];
  return formatListValue(rawValue, input.column.formatter);
}

export function getVisibleListColumns(listView: CustomScreenListViewDefinition) {
  return listView.columns.filter((column) => column.visible !== false);
}
