import { expect, test } from "bun:test";

import {
  DEFAULT_PAGE_TEMPLATE_KEY,
  listPageTemplateOptions,
  normalizePageTemplateKey,
} from "../../../core/services/pages/pageTemplateService";

test("normalizePageTemplateKey returns default key for non-string input", () => {
  expect(normalizePageTemplateKey(undefined)).toBe(DEFAULT_PAGE_TEMPLATE_KEY);
  expect(normalizePageTemplateKey(null)).toBe(DEFAULT_PAGE_TEMPLATE_KEY);
  expect(normalizePageTemplateKey(123)).toBe(DEFAULT_PAGE_TEMPLATE_KEY);
  expect(normalizePageTemplateKey({})).toBe(DEFAULT_PAGE_TEMPLATE_KEY);
});

test("normalizePageTemplateKey trims, lowercases, and normalizes separators", () => {
  expect(normalizePageTemplateKey(" Landing ")).toBe("landing");
  expect(normalizePageTemplateKey("About us")).toBe("about-us");
  expect(normalizePageTemplateKey("ABOUT__US")).toBe("about-us");
  expect(normalizePageTemplateKey("a---b")).toBe("a-b");
});

test("normalizePageTemplateKey strips leading/trailing separators and falls back when empty", () => {
  expect(normalizePageTemplateKey("---")).toBe(DEFAULT_PAGE_TEMPLATE_KEY);
  expect(normalizePageTemplateKey("  ")).toBe(DEFAULT_PAGE_TEMPLATE_KEY);
  expect(normalizePageTemplateKey("__landing__")).toBe("landing");
});

test("listPageTemplateOptions always includes default key", async () => {
  const result = await listPageTemplateOptions({ themeName: "default" });
  expect(result.templates.some((item) => item.key === DEFAULT_PAGE_TEMPLATE_KEY)).toBeTrue();
});
