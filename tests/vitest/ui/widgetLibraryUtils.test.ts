import { expect, test } from "vitest";

import {
  buildWidgetModuleOptions,
  countWidgetLibraryWidgets,
  countWidgetLibraryWidgetsByCategory,
  countWidgetLibrarySections,
  filterWidgetLibraryItems,
  filterWidgetLibraryItemsBySection,
  normalizeCategoryValue,
  normalizeWidgetLibrarySection,
  trimWidgetLibrarySelection,
} from "../../../core/admin/ui/widgets/widgetLibraryUtils";

test("normalizeCategoryValue trims and lowercases", () => {
  expect(normalizeCategoryValue(" Layout ")).toBe("layout");
  expect(normalizeCategoryValue("Content")).toBe("content");
});

test("normalizeWidgetLibrarySection rejects unknown and retired section ids", () => {
  expect(normalizeWidgetLibrarySection("media")).toBe("media");
  expect(normalizeWidgetLibrarySection("unknown")).toBe("all-items");
  // The widget-template surface is retired; its section id no longer resolves.
  expect(normalizeWidgetLibrarySection("templates")).toBe("all-items");
  expect(normalizeWidgetLibrarySection(null)).toBe("all-items");
});

test("filterWidgetLibraryItems returns only composite items in recommended widgets tab", () => {
  const items = filterWidgetLibraryItems(
    [
      {
        name: "Hero",
        categoryLabel: "Content",
        category: "content",
        complexity: "composite",
        module: "content",
        source: "core",
      },
      {
        name: "Spacer",
        categoryLabel: "Layout",
        category: "layout",
        complexity: "atomic",
        module: "layout",
        source: "core",
      },
    ],
    {
      query: "",
      activeScope: "widgets",
      widgetCategory: "all",
      widgetTab: "recommended",
      widgetModule: "all",
      widgetComplexity: "all",
    }
  );

  expect(items).toHaveLength(1);
  expect(items[0]?.name).toBe("Hero");
});

test("filterWidgetLibraryItems applies module and complexity filters in widgets scope", () => {
  const items = filterWidgetLibraryItems(
    [
      {
        name: "Hero",
        categoryLabel: "Content",
        category: "content",
        complexity: "composite",
        module: "content",
        source: "core",
      },
      {
        name: "Timeline",
        categoryLabel: "Content",
        category: "content",
        complexity: "composite",
        module: "content",
        source: "core",
      },
      {
        name: "Spacer",
        categoryLabel: "Layout",
        category: "layout",
        complexity: "atomic",
        module: "layout",
        source: "core",
      },
    ],
    {
      query: "",
      activeScope: "widgets",
      widgetCategory: "all",
      widgetTab: "all",
      widgetModule: "layout",
      widgetComplexity: "atomic",
    }
  );

  expect(items).toHaveLength(1);
  expect(items[0]?.name).toBe("Spacer");
});

test("filterWidgetLibraryItemsBySection maps dropdown sections to scope filters", () => {
  const widgets = [
    {
      name: "Hero",
      categoryLabel: "Layout",
      category: "layout",
      complexity: "composite" as const,
      module: "content",
      source: "core" as const,
      isFavorite: true,
    },
    {
      name: "Gallery",
      categoryLabel: "Media",
      category: "media",
      complexity: "composite" as const,
      module: "content",
      source: "core" as const,
      isFavorite: false,
    },
  ];

  expect(
    filterWidgetLibraryItemsBySection(widgets, {
      query: "",
      section: "favorites",
      widgetTab: "all",
      widgetModule: "all",
      widgetComplexity: "all",
    }).map((item) => item.name)
  ).toEqual(["Hero"]);

  expect(
    filterWidgetLibraryItemsBySection(widgets, {
      query: "",
      section: "layout",
      widgetTab: "all",
      widgetModule: "all",
      widgetComplexity: "all",
    }).map((item) => item.name)
  ).toEqual(["Hero"]);
});

test("countWidgetLibraryWidgets and category counts respect the same widget filters as the grid", () => {
  const widgets = [
    {
      name: "Hero",
      categoryLabel: "Layout",
      category: "layout",
      complexity: "composite" as const,
      module: "content",
      source: "core" as const,
    },
    {
      name: "Spacer",
      categoryLabel: "Layout",
      category: "layout",
      complexity: "atomic" as const,
      module: "layout",
      source: "core" as const,
    },
    {
      name: "Feature Grid",
      categoryLabel: "Content",
      category: "content",
      complexity: "composite" as const,
      module: "content",
      source: "core" as const,
    },
  ];

  expect(
    countWidgetLibraryWidgets(widgets, {
      query: "",
      widgetTab: "recommended",
      widgetModule: "all",
      widgetComplexity: "all",
    })
  ).toBe(2);

  expect(
    countWidgetLibraryWidgetsByCategory(widgets, {
      query: "",
      widgetTab: "recommended",
      widgetModule: "all",
      widgetComplexity: "all",
    })
  ).toEqual({
    layout: 1,
    content: 1,
    forms: 0,
    navigation: 0,
    media: 0,
  });
});

test("countWidgetLibrarySections and trimWidgetLibrarySelection stay visible-scope safe", () => {
  const widgets = [
    {
      name: "Hero",
      categoryLabel: "Layout",
      category: "layout",
      complexity: "composite" as const,
      module: "content",
      source: "core" as const,
      isFavorite: true,
    },
    {
      name: "Spacer",
      categoryLabel: "Layout",
      category: "layout",
      complexity: "atomic" as const,
      module: "layout",
      source: "core" as const,
      isFavorite: true,
    },
  ];

  expect(
    countWidgetLibrarySections(widgets, {
      query: "",
      widgetTab: "all",
      widgetModule: "all",
      widgetComplexity: "all",
    })
  ).toMatchObject({
    "all-items": 2,
    favorites: 2,
    "widgets-all": 2,
    layout: 2,
  });

  expect(trimWidgetLibrarySelection(["a", "b", "c"], ["b", "c"])).toEqual(["b", "c"]);
});

test("buildWidgetModuleOptions sorts strict ready modules first", () => {
  const options = buildWidgetModuleOptions(
    ["search", "forms", "content", "custom-module"],
    [
      {
        module: "content",
        label: "Content",
        enforcement: "strict",
        minimum: { pagePresets: 1, sectionPresets: 2, compositeWidgets: 3 },
        counts: { pagePresets: 1, sectionPresets: 2, compositeWidgets: 3 },
        missing: {
          pagePresets: 0,
          sectionPresets: 0,
          compositeWidgets: 0,
          compositeWidgetRefs: [],
        },
        valid: true,
      },
      {
        module: "forms",
        label: "Forms",
        enforcement: "strict",
        minimum: { pagePresets: 1, sectionPresets: 2, compositeWidgets: 3 },
        counts: { pagePresets: 1, sectionPresets: 2, compositeWidgets: 3 },
        missing: {
          pagePresets: 0,
          sectionPresets: 0,
          compositeWidgets: 0,
          compositeWidgetRefs: [],
        },
        valid: true,
      },
      {
        module: "search",
        label: "Search",
        enforcement: "advisory",
        minimum: { pagePresets: 1, sectionPresets: 2, compositeWidgets: 3 },
        counts: { pagePresets: 1, sectionPresets: 2, compositeWidgets: 1 },
        missing: {
          pagePresets: 0,
          sectionPresets: 0,
          compositeWidgets: 2,
          compositeWidgetRefs: ["search-result-grid"],
        },
        valid: false,
      },
    ]
  );

  expect(options.map((item) => item.value)).toEqual([
    "content",
    "forms",
    "search",
    "custom-module",
  ]);
  expect(options[0]?.label).toContain("Ready to use");
  expect(options[2]?.label).toContain("In preparation");
});
