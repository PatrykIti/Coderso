import type { WidgetCategoryId, WidgetComplexity, WidgetItem, WidgetLibraryTab } from "./types";
import type { ModulePackStatus } from "../../../widgets/registry";

export const normalizeCategoryValue = (value: string) => value.trim().toLowerCase();

// Reusable templates moved to the dedicated Page Templates surface; the
// widget library scopes are core-widget-only.
export type WidgetLibraryScope = "all-items" | "favorites" | "widgets";

export type WidgetLibrarySection = "all-items" | "favorites" | "widgets-all" | WidgetCategoryId;

export const WIDGET_LIBRARY_SECTION_IDS = [
  "all-items",
  "favorites",
  "widgets-all",
  "layout",
  "content",
  "forms",
  "navigation",
  "media",
] as const satisfies readonly WidgetLibrarySection[];

const widgetCategorySections = new Set<WidgetLibrarySection>([
  "layout",
  "content",
  "forms",
  "navigation",
  "media",
]);

export function normalizeWidgetLibrarySection(
  value: string | null | undefined
): WidgetLibrarySection {
  return WIDGET_LIBRARY_SECTION_IDS.includes(value as WidgetLibrarySection)
    ? (value as WidgetLibrarySection)
    : "all-items";
}

export type WidgetFilterItem = Pick<
  WidgetItem,
  "name" | "categoryLabel" | "category" | "complexity" | "module" | "isFavorite" | "source"
>;

export type WidgetFilterOptions = {
  query: string;
  activeScope: WidgetLibraryScope;
  widgetCategory: "all" | WidgetCategoryId;
  widgetTab: WidgetLibraryTab;
  widgetModule: string;
  widgetComplexity: "all" | WidgetComplexity;
};

export type WidgetSectionFilterOptions = Omit<
  WidgetFilterOptions,
  "activeScope" | "widgetCategory"
> & {
  section: WidgetLibrarySection;
};

export type WidgetModuleOption = {
  value: string;
  label: string;
  readiness: "ready" | "needs-coverage" | "untracked";
  enforcement?: ModulePackStatus["enforcement"];
};

export type WidgetScopeCountOptions = Pick<
  WidgetFilterOptions,
  "query" | "widgetTab" | "widgetModule" | "widgetComplexity"
>;

export function resolveWidgetLibrarySectionFilter(
  section: WidgetLibrarySection
): Pick<WidgetFilterOptions, "activeScope" | "widgetCategory"> {
  if (section === "widgets-all") {
    return { activeScope: "widgets", widgetCategory: "all" };
  }
  if (widgetCategorySections.has(section)) {
    return {
      activeScope: "widgets",
      widgetCategory: section as WidgetCategoryId,
    };
  }
  if (section === "all-items" || section === "favorites") {
    return { activeScope: section, widgetCategory: "all" };
  }
  return { activeScope: "all-items", widgetCategory: "all" };
}

export const filterWidgetLibraryItems = <T extends WidgetFilterItem>(
  widgets: T[],
  options: WidgetFilterOptions
) => {
  const normalized = options.query.trim().toLowerCase();

  const matched = widgets.filter((widget) => {
    const matchesQuery =
      normalized.length === 0 ||
      widget.name.toLowerCase().includes(normalized) ||
      widget.categoryLabel.toLowerCase().includes(normalized);

    const matchesScope = (() => {
      if (options.activeScope === "all-items") return true;
      if (options.activeScope === "favorites") return Boolean(widget.isFavorite);
      if (options.activeScope === "widgets") {
        if (options.widgetTab === "recommended" && widget.complexity !== "composite") {
          return false;
        }
        if (options.widgetModule !== "all" && widget.module !== options.widgetModule) {
          return false;
        }
        if (options.widgetComplexity !== "all" && widget.complexity !== options.widgetComplexity) {
          return false;
        }
        return options.widgetCategory === "all" || widget.category === options.widgetCategory;
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

export function filterWidgetLibraryItemsBySection<T extends WidgetFilterItem>(
  widgets: T[],
  options: WidgetSectionFilterOptions
) {
  const sectionFilter = resolveWidgetLibrarySectionFilter(options.section);
  return filterWidgetLibraryItems(widgets, {
    ...options,
    ...sectionFilter,
  });
}

export function countWidgetLibraryWidgets<T extends WidgetFilterItem>(
  widgets: T[],
  options: WidgetScopeCountOptions
) {
  return filterWidgetLibraryItems(widgets, {
    ...options,
    activeScope: "widgets",
    widgetCategory: "all",
  }).length;
}

export function countWidgetLibraryWidgetsByCategory<T extends WidgetFilterItem>(
  widgets: T[],
  options: WidgetScopeCountOptions
) {
  const categories: WidgetCategoryId[] = ["layout", "content", "forms", "navigation", "media"];

  return categories.reduce<Record<WidgetCategoryId, number>>(
    (result, category) => {
      result[category] = filterWidgetLibraryItems(widgets, {
        ...options,
        activeScope: "widgets",
        widgetCategory: category,
      }).length;
      return result;
    },
    {
      layout: 0,
      content: 0,
      forms: 0,
      navigation: 0,
      media: 0,
    }
  );
}

export function countWidgetLibrarySections<T extends WidgetFilterItem>(
  widgets: T[],
  options: Omit<WidgetSectionFilterOptions, "section">
) {
  return WIDGET_LIBRARY_SECTION_IDS.reduce<Record<WidgetLibrarySection, number>>(
    (result, section) => {
      result[section] = filterWidgetLibraryItemsBySection(widgets, {
        ...options,
        section,
      }).length;
      return result;
    },
    {
      "all-items": 0,
      favorites: 0,
      "widgets-all": 0,
      layout: 0,
      content: 0,
      forms: 0,
      navigation: 0,
      media: 0,
    }
  );
}

export function trimWidgetLibrarySelection(
  selectedIds: Iterable<string>,
  visibleIds: Iterable<string>
) {
  const visible = new Set(visibleIds);
  return Array.from(selectedIds).filter((id) => visible.has(id));
}

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
          status.enforcement === "strict" ? "Ready to use" : "Ready to use (Beta)";
        return {
          value: module,
          label: `${toDisplayLabel(module)} - ${readySuffix}`,
          readiness: "ready" as const,
          enforcement: status.enforcement,
        };
      }

      return {
        value: module,
        label: `${toDisplayLabel(module)} - In preparation`,
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
