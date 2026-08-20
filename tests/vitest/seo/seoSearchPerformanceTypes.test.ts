import { describe, expect, test } from "vitest";

import {
  isSeoIndexingState,
  normalizeIndexingState,
  seoIndexingStates,
  seoSitemapStatuses,
  toNumber,
} from "../../../core/services/seo/seoSearchPerformanceTypes";

describe("normalizeIndexingState", () => {
  test("returns known enum members unchanged", () => {
    expect(normalizeIndexingState("INDEXED")).toBe("INDEXED");
    expect(normalizeIndexingState("NOT_INDEXED")).toBe("NOT_INDEXED");
    expect(normalizeIndexingState("EXCLUDED")).toBe("EXCLUDED");
    expect(normalizeIndexingState("UNKNOWN")).toBe("UNKNOWN");
  });

  test("maps GSC coverageState strings to the closest enum member", () => {
    expect(normalizeIndexingState("Submitted and indexed")).toBe("INDEXED");
    expect(normalizeIndexingState("Crawled - currently not indexed")).toBe("NOT_INDEXED");
    expect(normalizeIndexingState("Excluded by robots.txt")).toBe("EXCLUDED");
  });

  test("is case-insensitive for known phrases", () => {
    expect(normalizeIndexingState("indexed")).toBe("INDEXED");
    expect(normalizeIndexingState("NOT INDEXED")).toBe("NOT_INDEXED");
    expect(normalizeIndexingState("excluded")).toBe("EXCLUDED");
  });

  test("resolves ambiguous 'not indexed' phrases to NOT_INDEXED", () => {
    expect(normalizeIndexingState("Discovered - currently not indexed")).toBe("NOT_INDEXED");
    expect(normalizeIndexingState("Not found (404)")).toBe("NOT_INDEXED");
  });

  test("falls back to UNKNOWN for null, empty, or unrecognized input", () => {
    expect(normalizeIndexingState(null)).toBe("UNKNOWN");
    expect(normalizeIndexingState(undefined)).toBe("UNKNOWN");
    expect(normalizeIndexingState("")).toBe("UNKNOWN");
    expect(normalizeIndexingState("Page with duplicate without user-selected canonical")).toBe(
      "UNKNOWN"
    );
    expect(normalizeIndexingState("something unrelated")).toBe("UNKNOWN");
  });
});

describe("isSeoIndexingState", () => {
  test("accepts only exact enum members", () => {
    for (const state of seoIndexingStates) {
      expect(isSeoIndexingState(state)).toBe(true);
    }
  });

  test("rejects non-enum strings, casing variants, and non-strings", () => {
    expect(isSeoIndexingState("indexed")).toBe(false);
    expect(isSeoIndexingState("INDEXED ")).toBe(false);
    expect(isSeoIndexingState("Submitted and indexed")).toBe(false);
    expect(isSeoIndexingState("")).toBe(false);
    expect(isSeoIndexingState(null)).toBe(false);
    expect(isSeoIndexingState(undefined)).toBe(false);
    expect(isSeoIndexingState(0)).toBe(false);
    expect(isSeoIndexingState({})).toBe(false);
  });
});

describe("toNumber", () => {
  test("passes finite numbers through unchanged", () => {
    expect(toNumber(0)).toBe(0);
    expect(toNumber(1)).toBe(1);
    expect(toNumber(0.25)).toBe(0.25);
    expect(toNumber(-3)).toBe(-3);
  });

  test("coerces numeric strings", () => {
    expect(toNumber("0")).toBe(0);
    expect(toNumber("12")).toBe(12);
    expect(toNumber("0.04375")).toBe(0.04375);
    expect(toNumber(" 7 ")).toBe(7);
  });

  test("falls back on null, undefined, empty, and NaN values", () => {
    expect(toNumber(null)).toBe(0);
    expect(toNumber(undefined)).toBe(0);
    expect(toNumber("")).toBe(0);
    expect(toNumber("   ")).toBe(0);
    expect(toNumber("not-a-number")).toBe(0);
    expect(toNumber(Number.NaN)).toBe(0);
  });

  test("honors a custom fallback", () => {
    expect(toNumber(null, -1)).toBe(-1);
    expect(toNumber("n/a", 1)).toBe(1);
    expect(toNumber(Number.NaN, 5)).toBe(5);
    expect(toNumber("42", 5)).toBe(42);
  });
});

describe("sitemap status enum", () => {
  test("pins the exact status members", () => {
    expect(seoSitemapStatuses).toEqual(["pending", "submitted", "processed", "error"]);
  });
});
