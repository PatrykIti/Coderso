import { expect, test } from "bun:test";

import {
  filterWidgetLibraryItems,
  matchesTemplateCategory,
  normalizeCategoryValue,
} from "../../../core/admin/ui/widgets/widgetLibraryUtils";

test("normalizeCategoryValue trims and lowercases", () => {
  expect(normalizeCategoryValue(" Layout ")).toBe("layout");
  expect(normalizeCategoryValue("Content")).toBe("content");
});

test("matchesTemplateCategory ignores case and whitespace", () => {
  expect(matchesTemplateCategory("Layout", "layout")).toBe(true);
  expect(matchesTemplateCategory(" Layout ", "Layout")).toBe(true);
  expect(matchesTemplateCategory("Media", "Forms")).toBe(false);
});

test("matchesTemplateCategory allows all", () => {
  expect(matchesTemplateCategory("Layout", "all")).toBe(true);
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
      templateCategory: "all",
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
      templateCategory: "all",
      widgetCategory: "all",
      widgetTab: "all",
      widgetModule: "layout",
      widgetComplexity: "atomic",
    }
  );

  expect(items).toHaveLength(1);
  expect(items[0]?.name).toBe("Spacer");
});
