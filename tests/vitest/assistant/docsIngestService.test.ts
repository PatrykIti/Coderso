import { expect, test } from "vitest";

import {
  buildInternalDocChunks,
  parseInternalDoc,
  validateInternalDocContract,
} from "../../../core/services/assistant/docsIngestService";

const validInternalDoc = [
  "---",
  'title: "Hero widget basics"',
  'audience: "editor"',
  'productArea: "widgets"',
  'language: "pl"',
  "keywords:",
  "  - hero",
  "  - widget",
  "---",
  "",
  "# What Is It",
  "Hero explains the top section of the page.",
  "",
  "# When To Use",
  "Use hero for page entry context.",
  "",
  "# Step By Step",
  "1. Add Hero widget.",
  "2. Configure content and buttons.",
  "",
  "# Examples",
  "Simple example for landing page.",
  "",
  "# Common Mistakes",
  "Do not mix too many CTAs in one short hero.",
  "",
].join("\n");

test("parseInternalDoc reads frontmatter and body", () => {
  const parsed = parseInternalDoc(validInternalDoc);

  expect(parsed.meta.title).toBe("Hero widget basics");
  expect(parsed.meta.audience).toBe("editor");
  expect(parsed.meta.productArea).toBe("widgets");
  expect(parsed.meta.language).toBe("pl");
  expect(parsed.meta.keywords).toEqual(["hero", "widget"]);
  expect(parsed.body).toContain("What Is It");
  expect(parsed.bodyStartLine).toBeGreaterThan(0);
});

test("parseInternalDoc throws when frontmatter is missing", () => {
  expect(() => parseInternalDoc("# Missing frontmatter")).toThrow(
    "assistant_doc_frontmatter_missing"
  );
});

test("validateInternalDocContract reports missing required sections", () => {
  const parsed = parseInternalDoc(
    [
      "---",
      'title: "Broken doc"',
      'audience: "editor"',
      'productArea: "widgets"',
      'language: "pl"',
      "keywords: [hero]",
      "---",
      "",
      "# What Is It",
      "Short intro",
      "",
      "# Examples",
      "One example only",
      "",
    ].join("\n")
  );

  const errors = validateInternalDocContract("docs/coderso/widgets/broken.md", parsed);
  expect(errors.some((error) => error.code === "required_section_missing")).toBe(true);
  expect(errors.some((error) => error.message.includes("when to use"))).toBe(true);
});

test("buildInternalDocChunks creates deterministic heading-aware chunks", () => {
  const parsed = parseInternalDoc(validInternalDoc);
  const chunks = buildInternalDocChunks(parsed, 120);

  expect(chunks.length).toBeGreaterThan(0);
  expect(chunks[0]?.chunkIndex).toBe(0);
  expect(chunks[0]?.headingPath.length).toBeGreaterThan(0);
  expect(chunks[0]?.lineEnd).toBeGreaterThanOrEqual(chunks[0]?.lineStart ?? 0);
  expect(chunks.some((chunk) => chunk.heading.toLowerCase().includes("step by step"))).toBe(
    true
  );
});

test("buildInternalDocChunks rejects non-positive maxChunkChars", () => {
  const parsed = parseInternalDoc(validInternalDoc);
  expect(() => buildInternalDocChunks(parsed, 0)).toThrow(
    "assistant_doc_chunk_limit_invalid"
  );
});

test("buildInternalDocChunks rejects oversized lines that exceed chunk limit", () => {
  const parsed = parseInternalDoc(
    [
      "---",
      'title: "Oversized line doc"',
      'audience: "editor"',
      'productArea: "widgets"',
      'language: "pl"',
      "keywords: [hero]",
      "---",
      "",
      "# What Is It",
      "x".repeat(200),
      "",
      "# When To Use",
      "ok",
      "",
      "# Step By Step",
      "ok",
      "",
      "# Examples",
      "ok",
      "",
      "# Common Mistakes",
      "ok",
      "",
    ].join("\n")
  );

  expect(() => buildInternalDocChunks(parsed, 120)).toThrow(
    "assistant_doc_chunk_oversized"
  );
});

test("validateInternalDocContract reports body_too_large", () => {
  const parsed = parseInternalDoc(
    [
      "---",
      'title: "Huge doc"',
      'audience: "editor"',
      'productArea: "widgets"',
      'language: "pl"',
      "keywords: [hero]",
      "---",
      "",
      "# What Is It",
      "x".repeat(130_000),
      "",
      "# When To Use",
      "ok",
      "",
      "# Step By Step",
      "ok",
      "",
      "# Examples",
      "ok",
      "",
      "# Common Mistakes",
      "ok",
      "",
    ].join("\n")
  );

  const errors = validateInternalDocContract("docs/coderso/widgets/huge.md", parsed);
  expect(errors.some((error) => error.code === "doc_body_too_large")).toBe(true);
});
