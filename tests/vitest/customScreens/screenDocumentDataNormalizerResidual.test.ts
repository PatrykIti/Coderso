import { expect, test } from "vitest";

import {
  normalizeOptionalIntegerProperty,
  normalizeOptionalStringProperty,
  normalizeTabsForWrite,
} from "../../../core/services/customScreens/screenDocumentDataNormalizer";

test("normalizeOptionalStringProperty drops a non-string value on stored-read", () => {
  const data: Record<string, unknown> = { label: 123 };
  normalizeOptionalStringProperty(data, "label", "stored-read");
  expect(data.label).toBeUndefined();
});

test("normalizeOptionalStringProperty rejects a non-string value on write", () => {
  const data: Record<string, unknown> = { label: 123 };
  expect(() => normalizeOptionalStringProperty(data, "label", "write")).toThrow(
    "custom_screen_definition_invalid"
  );
});

test("normalizeOptionalIntegerProperty clamps a non-integer value to a bounded integer", () => {
  const data: Record<string, unknown> = { count: 2.5 };
  normalizeOptionalIntegerProperty(data, "count", 1, 1, 10, "stored-read");
  expect(data.count).toBe(2);

  const outOfRange: Record<string, unknown> = { count: 20 };
  normalizeOptionalIntegerProperty(outOfRange, "count", 1, 1, 10, "stored-read");
  expect(outOfRange.count).toBe(10);
});

test("normalizeOptionalIntegerProperty rejects a non-integer value on write", () => {
  const data: Record<string, unknown> = { count: 2.5 };
  expect(() => normalizeOptionalIntegerProperty(data, "count", 1, 1, 10, "write")).toThrow(
    "custom_screen_definition_invalid"
  );
});

test("normalizeTabsForWrite rejects an out-of-range tabs collection", () => {
  expect(() => normalizeTabsForWrite([], ["blocks", 0])).toThrow(
    "custom_screen_definition_invalid"
  );
  expect(() => normalizeTabsForWrite("not-an-array", ["blocks", 0])).toThrow(
    "custom_screen_definition_invalid"
  );
});

test("normalizeTabsForWrite rejects a non-record tab item", () => {
  expect(() => normalizeTabsForWrite(["bad-tab"], ["blocks", 0])).toThrow(
    "custom_screen_definition_invalid"
  );
});

test("normalizeTabsForWrite trims ids and labels", () => {
  const result = normalizeTabsForWrite(
    [
      { id: " tab-1 ", label: " Overview " },
      { id: "tab-2", label: "Details" },
    ],
    ["blocks", 0]
  );

  expect(result).toEqual([
    { id: "tab-1", label: "Overview" },
    { id: "tab-2", label: "Details" },
  ]);
});
