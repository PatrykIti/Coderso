// TASK-105-08-04 (Item D): screenRuntimeRendererModel residual branches —
// inline number normalization edge cases, roving tab-index fallback, and slot
// traversal in builder tab-slot resolution.

import { expect, test } from "vitest";

import {
  builderSelectionTabSlot,
  builderTabSlot,
  normalizeInlineFieldValue,
  resolveRovingTabIndex,
} from "../../../core/admin/ui/custom-screens/screenRuntimeRendererModel";
import type { ScreenBlockV1 } from "../../../core/services/customScreens/customScreenSchemas";

const numberField = { id: "n", name: "count", type: "number" as const, label: "Count" };

test("normalizeInlineFieldValue handles blank, parsed, and non-finite numbers", () => {
  expect(normalizeInlineFieldValue("  ", numberField)).toBe("");
  expect(normalizeInlineFieldValue("42", numberField)).toBe(42);
  expect(normalizeInlineFieldValue("abc", numberField)).toBe("abc");
  // non-number fields pass through untouched
  expect(
    normalizeInlineFieldValue("42", { id: "t", name: "title", type: "text", label: "Title" })
  ).toBe("42");
});

test("resolveRovingTabIndex falls back to null for unknown keys", () => {
  expect(resolveRovingTabIndex("PageUp", 0, 3)).toBeNull();
});

const nestedBlock = (): ScreenBlockV1 => ({
  id: "tab",
  type: "tabs",
  data: {},
  slots: {
    "tab-one": [
      {
        id: "inner",
        type: "heading",
        data: {},
        children: [{ id: "leaf", type: "text", data: {} }],
      },
    ],
    "tab-two": [{ id: "other-leaf", type: "text", data: {} }],
  },
});

const tabs = [
  { id: "tab-one", label: "One" },
  { id: "tab-two", label: "Two" },
];

test("builderTabSlot finds the tab whose slot contains a target parent", () => {
  expect(
    builderTabSlot(nestedBlock(), tabs, {
      kind: "slot-end",
      sectionId: "s",
      parentId: "inner",
      slotId: "tab-one",
    })
  ).toBe("tab-one");
  // direct parent targeting returns the requested slot when valid
  expect(
    builderTabSlot(nestedBlock(), tabs, {
      kind: "slot-index",
      sectionId: "s",
      parentId: "tab",
      slotId: "tab-two",
      index: 0,
    })
  ).toBe("tab-two");
  // unknown tab for the direct parent resolves to null
  expect(
    builderTabSlot(nestedBlock(), tabs, {
      kind: "slot-end",
      sectionId: "s",
      parentId: "tab",
      slotId: "nope",
    })
  ).toBeNull();
  // non-slot target resolves to null
  expect(builderTabSlot(nestedBlock(), tabs, { kind: "section-end", sectionId: "s" })).toBeNull();
});

test("builderSelectionTabSlot resolves nested children through slots", () => {
  expect(builderSelectionTabSlot(nestedBlock(), tabs, "leaf")).toBe("tab-one");
  expect(builderSelectionTabSlot(nestedBlock(), tabs, "other-leaf")).toBe("tab-two");
  expect(builderSelectionTabSlot(nestedBlock(), tabs, "tab")).toBeNull();
  expect(builderSelectionTabSlot(nestedBlock(), tabs, null)).toBeNull();
  expect(builderSelectionTabSlot(nestedBlock(), tabs, "missing")).toBeNull();
});

test("builderSelectionTabSlot finds a target nested inside a slot's own tab block", () => {
  const deeplyNested = (): ScreenBlockV1 => ({
    id: "tab",
    type: "tabs",
    data: {},
    slots: {
      "tab-one": [
        {
          id: "outer",
          type: "tabs",
          data: {},
          slots: { "nested-slot": [{ id: "deep", type: "text", data: {} }] },
        },
      ],
      "tab-two": [],
    },
  });
  expect(builderSelectionTabSlot(deeplyNested(), tabs, "deep")).toBe("tab-one");
  expect(builderSelectionTabSlot(deeplyNested(), tabs, "missing")).toBeNull();
});
