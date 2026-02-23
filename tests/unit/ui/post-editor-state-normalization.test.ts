import { expect, test } from "bun:test";

import { normalizeEditorDocumentForWritingFlow } from "../../../core/admin/ui/posts/editor/hooks/usePostEditorState";

test("normalizeEditorDocumentForWritingFlow removes empty leading paragraph before writing-canvas", () => {
  const document = normalizeEditorDocumentForWritingFlow({
    document: {
      version: 1,
      blocks: [
        { id: "block-1", type: "paragraph", attrs: {}, content: "" },
        {
          id: "block-2",
          type: "writing-canvas",
          attrs: {},
          content: {
            version: 1,
            nodes: [{ id: "node-1", type: "paragraph", text: "<p>Body</p>" }],
          },
        },
      ],
      meta: {},
    },
  });

  expect(document.blocks.length).toBe(1);
  expect(document.blocks[0]?.type).toBe("writing-canvas");
});

test("normalizeEditorDocumentForWritingFlow upgrades single empty paragraph document to writing-canvas", () => {
  const document = normalizeEditorDocumentForWritingFlow({
    document: {
      version: 1,
      blocks: [{ id: "block-1", type: "paragraph", attrs: {}, content: "" }],
      meta: {},
    },
  });

  expect(document.blocks.length).toBe(1);
  expect(document.blocks[0]?.type).toBe("writing-canvas");
});
