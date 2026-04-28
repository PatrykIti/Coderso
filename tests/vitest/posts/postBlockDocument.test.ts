import { expect, test } from "vitest";

import {
  createEmptyPostBlockDocument,
  normalizePostBlockDocument,
} from "../../../core/services/posts/editor/postBlockNormalizer";

test("normalizePostBlockDocument normalizes blocks and meta", () => {
  const result = normalizePostBlockDocument({
    version: 1,
    blocks: [
      {
        id: " Hero Heading ",
        type: "heading",
        attrs: { level: 8 },
        content: "Welcome",
      },
      {
        id: "Hero Heading",
        type: "list",
        attrs: { ordered: true },
        content: ["one", "two", 3],
      },
    ],
    meta: {
      title: "  Launch post ",
      excerpt: "  Short summary ",
    },
  });

  expect(result.version).toBe(1);
  expect(result.blocks).toHaveLength(2);
  expect(result.blocks[0]?.id).toBe("hero-heading");
  expect(result.blocks[0]?.attrs).toEqual({
    align: "left",
    width: "auto",
    spacingTop: "md",
    spacingBottom: "md",
    textScale: "md",
    highlight: false,
    hideOnMobile: false,
    level: 6,
  });
  expect(result.blocks[1]?.id).toBe("hero-heading-2");
  expect(result.blocks[1]?.content).toEqual(["one", "two"]);
  expect(result.meta.title).toBe("Launch post");
  expect(result.meta.excerpt).toBe("Short summary");
  expect(result.meta.readingTimeMinutes).toBeGreaterThanOrEqual(1);
});

test("normalizePostBlockDocument assigns unique fallback ids", () => {
  const result = normalizePostBlockDocument({
    blocks: [
      { type: "paragraph", content: "a" },
      { type: "paragraph", content: "b" },
      { id: "block-1", type: "paragraph", content: "c" },
    ],
  });

  expect(result.blocks[0]?.id).toBe("block-1");
  expect(result.blocks[1]?.id).toBe("block-2");
  expect(result.blocks[2]?.id).toBe("block-1-2");
});

test("normalizePostBlockDocument throws on invalid block type", () => {
  expect(() =>
    normalizePostBlockDocument({
      blocks: [{ id: "x", type: "unknown", content: "x" }],
    })
  ).toThrow("post_document_invalid");
});

test("normalizePostBlockDocument with fallback returns empty document", () => {
  const result = normalizePostBlockDocument({ version: 2 }, { fallbackToEmpty: true });
  expect(result).toEqual(createEmptyPostBlockDocument());
});
