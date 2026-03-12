import { expect, test } from "vitest";

import { buildPostDocumentOutline } from "../../../core/services/posts/editor/postDocumentOutline";

test("buildPostDocumentOutline creates stable anchors with dedupe and custom ids", () => {
  const outline = buildPostDocumentOutline({
    version: 1,
    blocks: [
      {
        id: "heading-1",
        type: "heading",
        attrs: { level: 2 },
        content: "Intro",
      },
      {
        id: "heading-2",
        type: "heading",
        attrs: { level: 2, anchorId: "custom-anchor" },
        content: "Manual anchor",
      },
      {
        id: "writing-1",
        type: "writing-canvas",
        attrs: {},
        content: {
          version: 1,
          nodes: [{ id: "node-1", type: "heading", level: 2, text: "Intro" }],
        },
      },
    ],
    meta: {},
  });

  expect(outline.items.map((item) => item.anchorId)).toEqual([
    "intro",
    "custom-anchor",
    "intro-2",
  ]);
  expect(outline.warnings).toHaveLength(0);
});

test("buildPostDocumentOutline reports hierarchy and empty heading warnings", () => {
  const outline = buildPostDocumentOutline({
    version: 1,
    blocks: [
      {
        id: "heading-1",
        type: "heading",
        attrs: { level: 1 },
        content: "Title",
      },
      {
        id: "heading-2",
        type: "heading",
        attrs: { level: 3 },
        content: "Deep section",
      },
      {
        id: "heading-3",
        type: "heading",
        attrs: { level: 1 },
        content: "Another title",
      },
      {
        id: "writing-1",
        type: "writing-canvas",
        attrs: {},
        content: {
          version: 1,
          nodes: [{ id: "node-1", type: "heading", level: 2, text: "" }],
        },
      },
    ],
    meta: {},
  });

  const warningCodes = outline.warnings.map((warning) => warning.code);

  expect(warningCodes).toContain("skipped_heading_level");
  expect(warningCodes).toContain("multiple_h1");
  expect(warningCodes).toContain("empty_heading");
  expect(outline.items.at(-1)?.text).toBe("Empty heading");
});
