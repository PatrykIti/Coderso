import { expect, test } from "bun:test";

import {
  normalizeSearchQuery,
  resolveSearchLimit,
  searchAll,
} from "../../../core/services/search/searchService";

test("normalizeSearchQuery trims and collapses whitespace", () => {
  expect(normalizeSearchQuery("  hello   world ")).toBe("hello world");
});

test("resolveSearchLimit clamps values", () => {
  expect(resolveSearchLimit(undefined, 20)).toBe(20);
  expect(resolveSearchLimit(0, 20)).toBe(20);
  expect(resolveSearchLimit(5.7, 20)).toBe(5);
  expect(resolveSearchLimit(120, 20)).toBe(50);
});

test("searchAll returns empty for short queries", async () => {
  const results = await searchAll("a");
  expect(results).toEqual([]);
});
