import { expect, test } from "bun:test";

import { normalizePostBlockDocument } from "../../../core/services/posts/editor/postBlockNormalizer";

test("normalizePostBlockDocument normalizes writing-canvas nodes and limits", () => {
  const normalized = normalizePostBlockDocument({
    version: 1,
    blocks: [
      {
        id: "Writing",
        type: "writing-canvas",
        attrs: { unexpected: true },
        content: {
          version: 9,
          nodes: [
            {
              id: " Intro ",
              type: "paragraph",
              text: "<p>Welcome <script>alert(1)</script>home</p>",
            },
            {
              id: "Intro",
              type: "heading",
              level: 9,
              text: "<h2>Title</h2>",
            },
            {
              id: "Main-title",
              type: "heading",
              level: 1,
              text: "<h1>Main title</h1>",
            },
            {
              id: "List-1",
              type: "list",
              ordered: true,
              items: ["<p>One</p>", "<p>Two</p>", 3],
            },
            {
              id: "Image-1",
              type: "image",
              mediaId: " media-1 ",
              alt: " Hero image ",
              caption: " Overview ",
              wrap: "right",
              widthPercent: 77,
            },
            {
              id: "skip-me",
              type: "unsupported",
              text: "ignored",
            },
          ],
        },
      },
    ],
  });

  const writingBlock = normalized.blocks[0];
  expect(writingBlock?.type).toBe("writing-canvas");
  expect(writingBlock?.attrs).toEqual({});

  const content = writingBlock?.content as {
    version: number;
    nodes: Array<Record<string, unknown>>;
  };

  expect(content.version).toBe(1);
  expect(content.nodes).toHaveLength(5);
  expect(content.nodes[0]?.id).toBe("intro");
  expect(content.nodes[1]?.id).toBe("intro-2");
  expect(content.nodes[1]?.level).toBe(2);
  expect(content.nodes[2]?.level).toBe(1);
  expect(content.nodes[3]?.items).toEqual(["<p>One</p>", "<p>Two</p>"]);
  expect(content.nodes[4]?.mediaId).toBe("media-1");
  expect(content.nodes[4]?.wrap).toBe("right");
  expect(content.nodes[4]?.widthPercent).toBe(50);
});

test("normalizePostBlockDocument uses default writing-canvas node for invalid payload", () => {
  const normalized = normalizePostBlockDocument({
    blocks: [
      {
        id: "canvas",
        type: "writing-canvas",
        content: null,
      },
    ],
  });

  const content = normalized.blocks[0]?.content as {
    nodes: Array<{ type: string }>;
  };

  expect(content.nodes).toHaveLength(1);
  expect(content.nodes[0]?.type).toBe("paragraph");
});
