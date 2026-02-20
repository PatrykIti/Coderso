import type {
  WidgetCategoryId,
  WidgetComplexity,
  WidgetItem,
  WidgetLibraryTab,
  WidgetSource,
} from "./types";
import type { ModulePackStatus } from "../../../widgets/registry";

export const normalizeCategoryValue = (value: string) => value.trim().toLowerCase();

export const matchesTemplateCategory = (
  templateCategory: string,
  filter: string
) => {
  if (filter === "all") return true;
  return (
    normalizeCategoryValue(templateCategory) === normalizeCategoryValue(filter)
  );
};

type LibraryScope = "all-items" | "favorites" | "templates" | "widgets";

export type WidgetFilterItem = Pick<
  WidgetItem,
  | "name"
  | "categoryLabel"
  | "category"
  | "complexity"
  | "module"
  | "isFavorite"
  | "source"
>;

export type WidgetFilterOptions = {
  query: string;
  activeScope: LibraryScope;
  templateCategory: string;
  widgetCategory: "all" | WidgetCategoryId;
  widgetTab: WidgetLibraryTab;
  widgetModule: string;
  widgetComplexity: "all" | WidgetComplexity;
};

export type WidgetModuleOption = {
  value: string;
  label: string;
  readiness: "ready" | "needs-coverage" | "untracked";
  enforcement?: ModulePackStatus["enforcement"];
};

const toSource = (value: WidgetFilterItem["source"]): WidgetSource =>
  value === "template" ? "template" : "core";

export const filterWidgetLibraryItems = <T extends WidgetFilterItem>(
  widgets: T[],
  options: WidgetFilterOptions
) => {
  const normalized = options.query.trim().toLowerCase();
  const normalizedTemplateCategory =
    options.templateCategory === "all"
      ? "all"
      : normalizeCategoryValue(options.templateCategory);

  const matched = widgets.filter((widget) => {
    const source = toSource(widget.source);
    const matchesQuery =
      normalized.length === 0 ||
      widget.name.toLowerCase().includes(normalized) ||
      widget.categoryLabel.toLowerCase().includes(normalized);

    const matchesScope = (() => {
      if (options.activeScope === "all-items") return true;
      if (options.activeScope === "favorites") return Boolean(widget.isFavorite);
      if (options.activeScope === "templates") {
        if (source !== "template") return false;
        if (normalizedTemplateCategory === "all") return true;
        if (typeof widget.category !== "string") return false;
        return matchesTemplateCategory(widget.category, normalizedTemplateCategory);
      }
      if (options.activeScope === "widgets") {
        if (source !== "core") return false;
        if (options.widgetTab === "recommended" && widget.complexity !== "composite") {
          return false;
        }
        if (options.widgetModule !== "all" && widget.module !== options.widgetModule) {
          return false;
        }
        if (
          options.widgetComplexity !== "all" &&
          widget.complexity !== options.widgetComplexity
        ) {
          return false;
        }
        return (
          options.widgetCategory === "all" ||
          widget.category === options.widgetCategory
        );
      }
      return true;
    })();

    return matchesQuery && matchesScope;
  });

  if (options.activeScope !== "widgets") return matched;

  return [...matched].sort((left, right) => {
    if (left.complexity !== right.complexity) {
      if (left.complexity === "composite") return -1;
      return 1;
    }
    return left.name.localeCompare(right.name);
  });
};

const toDisplayLabel = (value: string) =>
  value
    .split("-")
    .filter(Boolean)
    .map((segment) => segment.charAt(0).toUpperCase() + segment.slice(1))
    .join(" ");

export function buildWidgetModuleOptions(
  moduleValues: Iterable<string>,
  packStatuses: ModulePackStatus[]
): WidgetModuleOption[] {
  const statusByModule = new Map(packStatuses.map((status) => [status.module, status]));
  const options = Array.from(new Set(moduleValues))
    .filter((module) => module.trim().length > 0)
    .map((module) => {
      const status = statusByModule.get(module);
      if (!status) {
        return {
          value: module,
          label: toDisplayLabel(module),
          readiness: "untracked" as const,
          enforcement: undefined,
        };
      }

      if (status.valid) {
        const readySuffix =
          status.enforcement === "strict" ? "Ready" : "Ready (Beta)";
        return {
          value: module,
          label: `${toDisplayLabel(module)} - ${readySuffix}`,
          readiness: "ready" as const,
          enforcement: status.enforcement,
        };
      }

      return {
        value: module,
        label: `${toDisplayLabel(module)} - Needs coverage`,
        readiness: "needs-coverage" as const,
        enforcement: status.enforcement,
      };
    });

  const weight = (option: WidgetModuleOption) => {
    if (option.readiness === "ready" && option.enforcement === "strict") return 0;
    if (option.readiness === "ready") return 1;
    if (option.readiness === "needs-coverage") return 2;
    return 3;
  };

  return options.sort((left, right) => {
    const byWeight = weight(left) - weight(right);
    if (byWeight !== 0) return byWeight;
    return left.label.localeCompare(right.label);
  });
}
