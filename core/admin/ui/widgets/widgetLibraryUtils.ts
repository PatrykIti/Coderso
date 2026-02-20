import type {
  WidgetCategoryId,
  WidgetComplexity,
  WidgetItem,
  WidgetLibraryTab,
  WidgetSource,
} from "./types";

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
