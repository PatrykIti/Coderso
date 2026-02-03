import { expect, test } from "bun:test";

import {
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
