// TASK-105-08-04 (Item C): customScreenEntryPresentation residual branches —
// block label fallbacks per block kind, rich-text/record-header presentation
// targets, record-header binding path filtering and unresolvable fields, and
// upsertPresentationOverride non-media removal.

import { expect, test } from "vitest";

import {
  resolvePresentationTarget,
  upsertPresentationOverride,
} from "../../../core/admin/ui/custom-screens/customScreenEntryPresentation";
import type { ScreenFieldBinding } from "../../../core/services/customScreens/customScreenSchemas";
import type { ScreenEntryPresentationOverrideDraft } from "../../../core/services/customScreens/screenEntryPresentationOverrideContract";

const fields = [
  { name: "city", label: "City", type: "text" },
  { name: "heroImage", label: "Hero image", type: "media" },
];

const bindings: ScreenFieldBinding[] = [
  {
    id: "b1",
    blockId: "block-title",
    propPath: "value",
    source: "entry",
    field: "city",
    mode: "readwrite",
  },
  {
    id: "b2",
    blockId: "block-header",
    propPath: "title",
    source: "entry",
    field: "title",
    mode: "read",
  },
  {
    id: "b3",
    blockId: "block-header",
    propPath: "badge",
    source: "entry",
    field: "missing-field",
    mode: "read",
  },
];

const baseBlock = (overrides: Record<string, unknown>) => ({
  id: "block-x",
  type: "field",
  data: {},
  ...overrides,
});

test("resolvePresentationTarget resolves rich-text and label fallbacks", () => {
  const richText = resolvePresentationTarget({
    block: baseBlock({ type: "rich-text", label: "Shared text" }),
    bindings,
    fields,
  });
  expect(richText).toMatchObject({
    supportsText: true,
    supportsDirectImage: false,
    label: "Shared text",
    mediaField: null,
  });

  const textFallback = resolvePresentationTarget({
    block: baseBlock({ type: "rich-text" }),
    bindings,
    fields,
  });
  expect(textFallback?.label).toBe("Shared text");
});

test("resolvePresentationTarget resolves field blocks through bindings or data", () => {
  const viaBinding = resolvePresentationTarget({
    block: baseBlock({ id: "block-title" }),
    bindings,
    fields,
  });
  expect(viaBinding?.label).toBe("Field");

  const unknownField = resolvePresentationTarget({
    block: baseBlock({ data: { field: "ghost" } }),
    bindings,
    fields,
  });
  expect(unknownField).toBeNull();

  const mediaField = resolvePresentationTarget({
    block: baseBlock({ id: "block-hero", data: { field: "heroImage" } }),
    bindings,
    fields,
  });
  expect(mediaField).toMatchObject({ supportsText: true, supportsDirectImage: false });
  expect(mediaField?.mediaField?.name).toBe("heroImage");
});

test("resolvePresentationTarget resolves record headers with binding path filtering", () => {
  const headerBlock = baseBlock({ id: "block-header", type: "record-header" });

  const target = resolvePresentationTarget({
    block: headerBlock,
    bindings: bindings.filter((binding) => binding.id !== "b3"),
    fields,
  });
  expect(target).toMatchObject({ supportsText: true, label: "Record header" });

  // A header binding pointing at an unresolvable field fails closed.
  const unresolvable = resolvePresentationTarget({ block: headerBlock, bindings, fields });
  expect(unresolvable).toBeNull();
});

test("resolvePresentationTarget resolves image blocks with the generic label", () => {
  expect(
    resolvePresentationTarget({ block: baseBlock({ type: "image" }), bindings, fields })
  ).toMatchObject({ supportsText: false, supportsDirectImage: true, label: "Selected block" });
});

test("upsertPresentationOverride removes same-block non-media prop path", () => {
  const before: ScreenEntryPresentationOverrideDraft[] = [
    { blockId: "a", propPath: "tone", value: "muted" },
    { blockId: "b", propPath: "tone", value: "primary" },
  ];
  expect(upsertPresentationOverride(before, "a", "tone", "strong")).toEqual([
    { blockId: "a", propPath: "tone", value: "strong" },
    { blockId: "b", propPath: "tone", value: "primary" },
  ]);
  expect(upsertPresentationOverride(before, "a", "tone", null)).toEqual([
    { blockId: "b", propPath: "tone", value: "primary" },
  ]);
});
