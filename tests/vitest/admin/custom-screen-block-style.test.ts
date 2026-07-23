import { expect, test } from "vitest";

import {
  customScreenDefinitionSchema,
  normalizeCustomScreenSidebarConfig,
  normalizeScreenDocumentV1,
  normalizeScreenDocumentV1ForRead,
  SCREEN_BLOCK_MIN_HEIGHT_CLAMP,
  screenBlockAligns,
  screenBlockBoxSides,
  screenBlockWidths,
  screenImageRatios,
} from "../../../core/services/customScreens/customScreenSchemas";
import { validate } from "../../../core/server/validation/schemaValidator";
import { buildV4WithBlocks } from "./custom-screen-schema-fixtures";

test("normalizeCustomScreenSidebarConfig normalizes sidebar flags", () => {
  expect(
    normalizeCustomScreenSidebarConfig({
      showInSidebar: true,
      sidebarLabel: "  Catalog  ",
    })
  ).toEqual({
    showInSidebar: true,
    sidebarLabel: "Catalog",
  });

  expect(normalizeCustomScreenSidebarConfig()).toEqual({
    showInSidebar: false,
    sidebarLabel: null,
  });
});

// ---------------------------------------------------------------------------
// TASK-503-01: ScreenBlockStyleV1 validator + Ajv layer + exported constants
// ---------------------------------------------------------------------------

const buildScreenDoc = (block: Record<string, unknown>) => ({
  schemaVersion: 1 as const,
  sections: [
    {
      id: "section-default",
      type: "section" as const,
      data: { title: "Details" },
      blocks: [block],
    },
  ],
});

const fieldBlock = (extra: Record<string, unknown>) => ({
  id: "field-1",
  type: "field",
  data: { label: "Name" },
  ...extra,
});

const styledBlockData = (block: Record<string, unknown>) =>
  normalizeScreenDocumentV1(buildScreenDoc(block)).sections[0]?.blocks[0] as Record<
    string,
    unknown
  >;

test("TASK-503-01 valid style subset round-trips byte-stable + idempotent (write + read)", () => {
  const block = fieldBlock({
    style: {
      width: "half",
      minHeight: 240,
      margin: { top: 24 },
      padding: { top: 16, bottom: 16 },
      align: "center",
    },
  });
  const doc = buildScreenDoc(block);
  const once = normalizeScreenDocumentV1(doc);
  expect(once).toEqual(doc);
  // Idempotent: normalizing the output changes nothing (bytes stable).
  expect(normalizeScreenDocumentV1(once)).toEqual(once);
  // Read path funnels through the same normalizer.
  expect(normalizeScreenDocumentV1ForRead(doc)).toEqual(doc);
  // Byte-stability of the normalized form: re-normalizing is stringify-identical.
  expect(JSON.stringify(normalizeScreenDocumentV1(once))).toBe(JSON.stringify(once));
});

test("TASK-503-01 absent style key stays absent (byte-stability guard, write + read)", () => {
  const doc = buildScreenDoc(fieldBlock({}));
  const outBlock = styledBlockData(fieldBlock({}));
  expect("style" in outBlock).toBe(false);
  expect(normalizeScreenDocumentV1(doc)).toEqual(doc);
  expect(normalizeScreenDocumentV1ForRead(doc)).toEqual(doc);
});

test("TASK-503-01 unknown style / box keys throw on write AND read", () => {
  const unknownStyleKey = buildScreenDoc(
    fieldBlock({ style: { width: "half", background: "red" } })
  );
  const unknownBoxKey = buildScreenDoc(fieldBlock({ style: { margin: { top: 1, inline: 2 } } }));
  expect(() => normalizeScreenDocumentV1(unknownStyleKey)).toThrow(
    "custom_screen_definition_invalid"
  );
  expect(() => normalizeScreenDocumentV1ForRead(unknownStyleKey)).toThrow(
    "custom_screen_definition_invalid"
  );
  expect(() => normalizeScreenDocumentV1(unknownBoxKey)).toThrow(
    "custom_screen_definition_invalid"
  );
  expect(() => normalizeScreenDocumentV1ForRead(unknownBoxKey)).toThrow(
    "custom_screen_definition_invalid"
  );
});

test("TASK-503-01 invalid style values coerce / clamp (never throw)", () => {
  const style = (styledBlockData(
    fieldBlock({
      style: {
        width: "huge",
        align: 7,
        minHeight: 99999,
        margin: { top: "12" },
      },
    })
  ).style ?? {}) as Record<string, unknown>;
  expect(style.width).toBe("auto"); // not-in-enum → fallback
  expect(style.align).toBe("start"); // non-string → fallback
  expect(style.minHeight).toBe(SCREEN_BLOCK_MIN_HEIGHT_CLAMP.max); // 640
  expect(style.margin).toEqual({ top: 0 }); // non-number → min

  const low = (styledBlockData(fieldBlock({ style: { minHeight: -5 } })).style ?? {}) as Record<
    string,
    unknown
  >;
  expect(low.minHeight).toBe(0);
  const floor = (styledBlockData(fieldBlock({ style: { minHeight: 24.9 } })).style ?? {}) as Record<
    string,
    unknown
  >;
  expect(floor.minHeight).toBe(24);
  const nan = (styledBlockData(fieldBlock({ style: { minHeight: Number.NaN } })).style ??
    {}) as Record<string, unknown>;
  expect(nan.minHeight).toBe(0);
});

test("TASK-503-01 empty / junk style prunes to an absent style key (no throw)", () => {
  expect("style" in styledBlockData(fieldBlock({ style: {} }))).toBe(false);
  expect("style" in styledBlockData(fieldBlock({ style: { margin: {} } }))).toBe(false);
  // non-record style container drops silently, never throws.
  expect(() => styledBlockData(fieldBlock({ style: "junk" }))).not.toThrow();
  expect("style" in styledBlockData(fieldBlock({ style: "junk" }))).toBe(false);
});

test("TASK-503-01 variant regression: still round-trips byte-stable + validates (decision 1)", () => {
  const doc = buildScreenDoc(fieldBlock({ variant: "anything" }));
  expect(normalizeScreenDocumentV1(doc)).toEqual(doc);
  expect(normalizeScreenDocumentV1ForRead(doc)).toEqual(doc);
  const definition = buildV4WithBlocks([fieldBlock({ variant: "anything" })]);
  expect(() => validate(customScreenDefinitionSchema, definition)).not.toThrow();
});

test("TASK-503-01 Ajv layer accepts valid style + rejects unknown key / out-of-range / junk", () => {
  const withValidStyle = buildV4WithBlocks([
    fieldBlock({
      style: { width: "half", minHeight: 240, margin: { top: 24 }, align: "center" },
    }),
  ]);
  expect(() => validate(customScreenDefinitionSchema, withValidStyle)).not.toThrow();

  // A definition WITHOUT any style still validates (no new required member).
  expect(() =>
    validate(customScreenDefinitionSchema, buildV4WithBlocks([fieldBlock({})]))
  ).not.toThrow();

  for (const badStyle of [
    { width: "half", background: "red" }, // unknown key
    { minHeight: 10000 }, // out of range
    "junk", // non-object
  ]) {
    expect(() =>
      validate(customScreenDefinitionSchema, buildV4WithBlocks([fieldBlock({ style: badStyle })]))
    ).toThrow();
  }
});

test("TASK-503-01 image ratio is NOT schema-coerced: legacy / '' free text round-trips byte-stable (decision 3)", () => {
  const imageBlock = (data: Record<string, unknown>) => ({ id: "image-1", type: "image", data });
  for (const ratio of ["16/9", "16:9", ""]) {
    const doc = buildScreenDoc(imageBlock({ label: "Image", fit: "cover", ratio }));
    expect(normalizeScreenDocumentV1(doc)).toEqual(doc);
    expect(normalizeScreenDocumentV1ForRead(doc)).toEqual(doc);
  }
  // Image WITHOUT ratio stays absent.
  const noRatio = styledBlockData({
    id: "image-1",
    type: "image",
    data: { label: "Image", fit: "cover" },
  } as Record<string, unknown>);
  expect("ratio" in (noRatio.data as Record<string, unknown>)).toBe(false);
});

test("TASK-503-01 exported style constants are pinned (renderer/inspector class maps depend on them)", () => {
  expect(screenBlockWidths).toEqual(["auto", "full", "half", "third", "two-thirds"]);
  expect(screenBlockAligns).toEqual(["start", "center", "end", "stretch"]);
  expect(screenImageRatios).toEqual(["auto", "1/1", "4/3", "16/9", "3/2"]);
  expect(SCREEN_BLOCK_MIN_HEIGHT_CLAMP).toEqual({ min: 0, max: 640 });
  expect(screenBlockBoxSides).toEqual(["top", "right", "bottom", "left"]);
});

// ---------------------------------------------------------------------------
// TASK-505-01 Item A: ScreenSectionStyleV1 section-style channel
// ---------------------------------------------------------------------------
