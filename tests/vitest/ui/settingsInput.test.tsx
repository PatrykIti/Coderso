import React from "react";
import { expect, test } from "vitest";

import {
  listToText,
  normalizeOptional,
  parseListWithFallback,
  parsePositiveNumber,
} from "../../../core/admin/ui/settings/securitySettingsUtils";

test("listToText joins values", () => {
  expect(listToText(["a", "b", "c"])) .toBe("a, b, c");
});

test("parseListWithFallback returns fallback when empty and not allowed", () => {
  const fallback = ["GET", "POST"];
  const result = parseListWithFallback("", fallback, false);
  expect(result).toEqual(fallback);
});

test("parseListWithFallback allows empty list when configured", () => {
  const fallback = ["GET"];
  const result = parseListWithFallback("", fallback, true);
  expect(result).toEqual([]);
});

test("parsePositiveNumber parses valid values", () => {
  expect(parsePositiveNumber("15", "ttl")).toBe(15);
});

test("normalizeOptional returns null for blanks", () => {
  expect(normalizeOptional(" ")).toBeNull();
});
