import { expect, test } from "bun:test";

import {
  adaptLegacyPostDataToDocument,
  coercePostDocument,
  ensurePostDocumentForRead,
  ensurePostDocumentForWrite,
} from "../../../core/services/posts/editor/postBlockLegacyAdapter";

test("adaptLegacyPostDataToDocument maps legacy content and excerpt", () => {
  const document = adaptLegacyPostDataToDocument({
    title: "Article",
    excerpt: "Legacy excerpt",
    content: "Legacy body",
  });

  expect(document.version).toBe(1);
  expect(document.meta.title).toBe("Article");
  expect(document.meta.excerpt).toBe("Legacy excerpt");
  expect(document.blocks[0]?.type).toBe("paragraph");
  expect(document.blocks[0]?.content).toBe("Legacy body");
});

test("ensurePostDocumentForRead falls back to legacy when document is invalid", () => {
  const data = ensurePostDocumentForRead({
    excerpt: "Fallback excerpt",
    content: "Fallback body",
    document: { version: 99 },
  });

  expect(data.document).toBeObject();
  const document = data.document as { version: number; blocks: Array<{ content: unknown }> };
  expect(document.version).toBe(1);
  expect(document.blocks[0]?.content).toBe("Fallback body");
});

test("ensurePostDocumentForWrite rejects invalid explicit document", () => {
  expect(() =>
    ensurePostDocumentForWrite({
      document: {
        version: 1,
        blocks: [{ id: "a", type: "unknown", content: "x" }],
      },
    })
  ).toThrow("post_document_invalid");
});

test("ensurePostDocumentForWrite keeps document and hydrates content fallback", () => {
  const data = ensurePostDocumentForWrite({
    document: {
      version: 1,
      blocks: [
        {
          id: "intro",
          type: "paragraph",
          attrs: {},
          content: "Intro paragraph",
        },
      ],
      meta: {
        excerpt: "Read this first",
      },
    },
  });

  expect(data.document).toBeObject();
  expect(data.content).toBe("Intro paragraph");
  expect(data.excerpt).toBe("Read this first");
});

test("coercePostDocument always returns a valid document", () => {
  const document = coercePostDocument({ document: { version: 42 } });
  expect(document.version).toBe(1);
  expect(document.blocks.length).toBeGreaterThan(0);
});

test("ensurePostDocumentForWrite uses writing-canvas as default for empty payload", () => {
  const data = ensurePostDocumentForWrite({});
  const document = data.document as { blocks: Array<{ type: string }> };
  expect(document.blocks.length).toBe(1);
  expect(document.blocks[0]?.type).toBe("writing-canvas");
});

test("ensurePostDocumentForWrite collects text fallback from writing-canvas nodes", () => {
  const data = ensurePostDocumentForWrite({
    document: {
      version: 1,
      blocks: [
        {
          id: "writing",
          type: "writing-canvas",
          attrs: {},
          content: {
            version: 1,
            nodes: [
              { id: "node-1", type: "paragraph", text: "<p>Hello writing canvas</p>" },
              { id: "node-2", type: "list", ordered: false, items: ["<p>Item A</p>"] },
            ],
          },
        },
      ],
    },
  });

  expect(data.content).toContain("Hello writing canvas");
  expect(data.content).toContain("Item A");
});
