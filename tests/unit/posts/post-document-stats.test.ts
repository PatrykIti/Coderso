import { expect, test } from "bun:test";

import { buildPostDocumentStats } from "../../../core/services/posts/editor/postDocumentStats";

test("buildPostDocumentStats returns zeroed metrics for empty document", () => {
  const stats = buildPostDocumentStats({
    version: 1,
    blocks: [],
    meta: {},
  });

  expect(stats).toEqual({
    words: 0,
    characters: 0,
    readingTimeMinutes: 0,
    headings: 0,
    paragraphs: 0,
    blocks: 0,
  });
});

test("buildPostDocumentStats counts writing-canvas and block content deterministically", () => {
  const stats = buildPostDocumentStats({
    version: 1,
    blocks: [
      {
        id: "writing-1",
        type: "writing-canvas",
        attrs: {},
        content: {
          version: 1,
          nodes: [
            { id: "n1", type: "paragraph", text: "Hello world" },
            { id: "n2", type: "heading", level: 2, text: "Intro" },
            { id: "n3", type: "list", ordered: false, items: ["A", "B"] },
            {
              id: "n4",
              type: "image",
              mediaId: "m1",
              alt: "Team photo",
              caption: "Our crew",
              wrap: "none",
              widthPercent: 50,
            },
          ],
        },
      },
      {
        id: "paragraph-1",
        type: "paragraph",
        attrs: {},
        content: "Standalone paragraph",
      },
      {
        id: "heading-1",
        type: "heading",
        attrs: { level: 3 },
        content: "Roadmap",
      },
      {
        id: "button-1",
        type: "button",
        attrs: { label: "Contact us" },
        content: null,
      },
    ],
    meta: {},
  });

  expect(stats.words).toBe(14);
  expect(stats.characters).toBeGreaterThan(0);
  expect(stats.readingTimeMinutes).toBe(1);
  expect(stats.headings).toBe(2);
  expect(stats.paragraphs).toBe(2);
  expect(stats.blocks).toBe(4);
});

test("buildPostDocumentStats supports custom reading speed", () => {
  const longText = Array.from({ length: 220 }).fill("word").join(" ");
  const stats = buildPostDocumentStats(
    {
      version: 1,
      blocks: [
        {
          id: "paragraph-1",
          type: "paragraph",
          attrs: {},
          content: longText,
        },
      ],
      meta: {},
    },
    { wordsPerMinute: 110 }
  );

  expect(stats.words).toBe(220);
  expect(stats.readingTimeMinutes).toBe(2);
});
