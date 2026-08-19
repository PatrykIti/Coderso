import { describe, expect, test } from "vitest";

import {
  PAGE_BLOCK_GRID_ITEM_ATTRIBUTE,
  type PageBlockGridPlacementTarget,
  resolvePageBlockGridPlacement,
} from "../../../core/services/pages/pageBlockGridPlacement";
import type { PageBlockPath } from "../../../core/services/pages/pageBlockPaths";
import {
  createPageBlockV2,
  createPageSectionV2,
  type PageBlockV2,
  type PageSectionType,
  type PageSectionV2,
  type PageSectionVariant,
} from "../../../core/services/pages/pageDocumentV2";

const ROOT_PATH: PageBlockPath = [{ index: 0 }];

const NESTED_PATH: PageBlockPath = [{ index: 0 }, { slotKey: "children", index: 0 }];

const DEEP_PATH: PageBlockPath = [
  { index: 0 },
  { slotKey: "children", index: 0 },
  { slotKey: "children", index: 0 },
];

const block = (id: string, overrides: Partial<PageBlockV2> = {}): PageBlockV2 =>
  createPageBlockV2("text", {
    id,
    props: { text: id, format: "plain", align: "left" },
    ...overrides,
  });

const section = (
  type: PageSectionType,
  options: { variant?: PageSectionVariant; columns?: number; blocks?: PageBlockV2[] } = {}
): PageSectionV2 =>
  createPageSectionV2(type, {
    variant: options.variant,
    layout: { columns: options.columns ?? 1, align: "start", justify: "start", maxWidth: 1080 },
    blocks: options.blocks,
  });

/** Recursively freezes a value so any write attempt throws in strict mode. */
const deepFreeze = <T>(value: T): T => {
  if (value === null || typeof value !== "object") return value;
  for (const key of Object.keys(value as Record<string, unknown>)) {
    deepFreeze((value as Record<string, unknown>)[key]);
  }
  return Object.freeze(value);
};

describe("PAGE_BLOCK_GRID_ITEM_ATTRIBUTE", () => {
  test("pins the exact attribute bytes", () => {
    expect(PAGE_BLOCK_GRID_ITEM_ATTRIBUTE).toBe("data-page-block-grid-item");
  });

  test("pins the full placement-target union at the type boundary", () => {
    const targets: readonly PageBlockGridPlacementTarget[] = [
      "block-frame",
      "section-template-wrapper",
      "none",
    ];
    expect(targets).toEqual(["block-frame", "section-template-wrapper", "none"]);
  });
});

describe("resolvePageBlockGridPlacement", () => {
  test("ordinary section root resolves to block-frame under both policies", () => {
    const s = section("content", {
      columns: 3,
      blocks: [block("blk-a"), block("blk-b")],
    });
    expect(resolvePageBlockGridPlacement(s, ROOT_PATH, { includeHiddenBlocks: false })).toBe(
      "block-frame"
    );
    expect(resolvePageBlockGridPlacement(s, ROOT_PATH, { includeHiddenBlocks: true })).toBe(
      "block-frame"
    );
  });

  test.each(["timeline", "gallery", "faq", "testimonials"] as const)(
    "%s section root resolves to section-template-wrapper",
    (type) => {
      const s = section(type, { blocks: [block("blk-a")] });
      expect(resolvePageBlockGridPlacement(s, ROOT_PATH, { includeHiddenBlocks: false })).toBe(
        "section-template-wrapper"
      );
      expect(resolvePageBlockGridPlacement(s, ROOT_PATH, { includeHiddenBlocks: true })).toBe(
        "section-template-wrapper"
      );
    }
  );

  test("nested slot children resolve to none even under a root grid item", () => {
    const s = section("content", {
      blocks: [block("blk-root", { slots: { children: [block("blk-child")] } })],
    });
    expect(resolvePageBlockGridPlacement(s, NESTED_PATH, { includeHiddenBlocks: false })).toBe(
      "none"
    );
    expect(resolvePageBlockGridPlacement(s, NESTED_PATH, { includeHiddenBlocks: true })).toBe(
      "none"
    );
    expect(resolvePageBlockGridPlacement(s, DEEP_PATH, { includeHiddenBlocks: false })).toBe(
      "none"
    );
  });

  test("actual per-column composition resolves root to none", () => {
    const s = section("content", {
      columns: 2,
      blocks: [block("blk-a"), block("blk-b", { style: { column: 2 } })],
    });
    expect(resolvePageBlockGridPlacement(s, ROOT_PATH, { includeHiddenBlocks: false })).toBe(
      "none"
    );
    expect(resolvePageBlockGridPlacement(s, ROOT_PATH, { includeHiddenBlocks: true })).toBe("none");
  });

  test("non-default media-split variants resolve to none", () => {
    for (const variant of ["split", "horizontal"] as const) {
      const s = section("media-split", { variant, blocks: [block("blk-a")] });
      expect(resolvePageBlockGridPlacement(s, ROOT_PATH, { includeHiddenBlocks: false })).toBe(
        "none"
      );
      expect(resolvePageBlockGridPlacement(s, ROOT_PATH, { includeHiddenBlocks: true })).toBe(
        "none"
      );
    }
  });

  test("default media-split resolves to block-frame", () => {
    const s = section("media-split", { variant: "default", blocks: [block("blk-a")] });
    expect(resolvePageBlockGridPlacement(s, ROOT_PATH, { includeHiddenBlocks: false })).toBe(
      "block-frame"
    );
    expect(resolvePageBlockGridPlacement(s, ROOT_PATH, { includeHiddenBlocks: true })).toBe(
      "block-frame"
    );
  });

  test("hidden-only assigned sibling: hidden policy sees block-frame, include sees none", () => {
    const s = section("content", {
      columns: 2,
      blocks: [
        block("blk-a"),
        block("blk-b", { style: { column: 2 }, visibility: { visible: false } }),
      ],
    });
    expect(resolvePageBlockGridPlacement(s, ROOT_PATH, { includeHiddenBlocks: false })).toBe(
      "block-frame"
    );
    expect(resolvePageBlockGridPlacement(s, ROOT_PATH, { includeHiddenBlocks: true })).toBe("none");
  });

  test("visible assigned sibling resolves to none under both policies", () => {
    const s = section("content", {
      columns: 2,
      blocks: [block("blk-a"), block("blk-b", { style: { column: 2 } })],
    });
    expect(resolvePageBlockGridPlacement(s, ROOT_PATH, { includeHiddenBlocks: false })).toBe(
      "none"
    );
    expect(resolvePageBlockGridPlacement(s, ROOT_PATH, { includeHiddenBlocks: true })).toBe("none");
  });

  test("never mutates the section, path, options, or their nested structures", () => {
    const s = section("content", {
      columns: 2,
      blocks: [block("blk-a"), block("blk-b", { style: { column: 2 } })],
    });
    const path: PageBlockPath = [{ index: 0 }];
    const options = { includeHiddenBlocks: false };
    const originalBlocks = s.blocks;
    const originalFirstBlock = s.blocks[0];

    deepFreeze(s);
    deepFreeze(path);
    deepFreeze(options);

    expect(() => resolvePageBlockGridPlacement(s, path, options)).not.toThrow();
    expect(() =>
      resolvePageBlockGridPlacement(s, path, { includeHiddenBlocks: true })
    ).not.toThrow();

    expect(Object.isFrozen(s)).toBe(true);
    expect(Object.isFrozen(s.blocks)).toBe(true);
    expect(Object.isFrozen(s.blocks[0])).toBe(true);
    expect(Object.isFrozen(s.blocks[1])).toBe(true);
    expect(Object.isFrozen(s.blocks[1]!.style)).toBe(true);
    expect(Object.isFrozen(path)).toBe(true);
    expect(Object.isFrozen(path[0])).toBe(true);
    expect(Object.isFrozen(options)).toBe(true);

    // Reference identity: the section's root list and blocks are untouched.
    expect(s.blocks).toBe(originalBlocks);
    expect(s.blocks[0]).toBe(originalFirstBlock);
  });
});
