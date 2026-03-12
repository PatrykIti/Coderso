import { expect, test } from "vitest";

import {
  createEmptyPostBlockDocument,
  normalizePostBlockDocument,
} from "../../../core/services/posts/editor/postBlockNormalizer";

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
              id: "Code-1",
              type: "quote",
              variant: "code",
              align: "center",
              text: "<code>const x = 1</code>",
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
  expect(writingBlock?.attrs).toEqual({
    align: "left",
    width: "auto",
    spacingTop: "md",
    spacingBottom: "md",
    textScale: "md",
    highlight: false,
    hideOnMobile: false,
  });

  const content = writingBlock?.content as {
    version: number;
    nodes: Array<Record<string, unknown>>;
  };

  expect(content.version).toBe(1);
  expect(content.nodes).toHaveLength(6);
  expect(content.nodes[0]?.id).toBe("intro");
  expect(content.nodes[1]?.id).toBe("intro-2");
  expect(content.nodes[1]?.level).toBe(2);
  expect(content.nodes[2]?.level).toBe(1);
  expect(content.nodes[3]?.items).toEqual(["<p>One</p>", "<p>Two</p>"]);
  expect(content.nodes[4]?.mediaId).toBe("media-1");
  expect(content.nodes[4]?.wrap).toBe("right");
  expect(content.nodes[4]?.widthPercent).toBe(50);
  expect(content.nodes[5]?.type).toBe("quote");
  expect(content.nodes[5]?.variant).toBe("code");
  expect(content.nodes[5]?.align).toBe("center");
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

test("normalizePostBlockDocument keeps heading anchor ids for block and writing-canvas nodes", () => {
  const normalized = normalizePostBlockDocument({
    version: 1,
    blocks: [
      {
        id: "heading-1",
        type: "heading",
        attrs: { level: 2, anchorId: "manual-anchor" },
        content: "Section heading",
      },
      {
        id: "writing-1",
        type: "writing-canvas",
        attrs: {},
        content: {
          version: 1,
          nodes: [
            {
              id: "node-1",
              type: "heading",
              level: 2,
              text: "Inline heading",
              anchorId: "inline-anchor",
            },
          ],
        },
      },
    ],
  });

  const headingBlock = normalized.blocks[0];
  expect(headingBlock?.type).toBe("heading");
  expect((headingBlock?.attrs as { anchorId?: string }).anchorId).toBe("manual-anchor");

  const writingBlock = normalized.blocks[1];
  if (!writingBlock || writingBlock.type !== "writing-canvas") {
    throw new Error("expected writing-canvas block");
  }
  const content = writingBlock.content as {
    nodes: Array<{ type: string; anchorId?: string }>;
  };
  expect(content.nodes[0]?.type).toBe("heading");
  expect(content.nodes[0]?.anchorId).toBe("inline-anchor");
});

test("normalizePostBlockDocument normalizes expanded block attrs and typography meta", () => {
  const normalized = normalizePostBlockDocument({
    version: 1,
    blocks: [
      {
        id: "list-1",
        type: "list",
        attrs: {
          ordered: true,
          compact: true,
          align: "center",
          width: "wide",
          spacingTop: "lg",
          spacingBottom: "sm",
          textScale: "xl",
          highlight: true,
          hideOnMobile: true,
          anchorId: " custom-anchor ",
          className: "alpha beta<script>",
        },
        content: ["One", "Two"],
      },
      {
        id: "button-1",
        type: "button",
        attrs: {
          label: "Read more",
          url: "https://example.com",
          variant: "secondary",
          size: "lg",
          newTab: true,
        },
      },
      {
        id: "embed-1",
        type: "embed",
        attrs: {
          provider: "youtube",
          url: "https://youtu.be/video",
          aspect: "4:3",
          lazy: false,
        },
      },
      {
        id: "separator-1",
        type: "separator",
        attrs: {
          style: "dashed",
          thickness: 4,
        },
      },
    ],
    meta: {
      typography: {
        fontFamily: "serif",
        baseTextScale: "lg",
      },
    },
  });

  const list = normalized.blocks[0];
  const button = normalized.blocks[1];
  const embed = normalized.blocks[2];
  const separator = normalized.blocks[3];

  expect(list?.attrs).toMatchObject({
    ordered: true,
    compact: true,
    align: "center",
    width: "wide",
    spacingTop: "lg",
    spacingBottom: "sm",
    textScale: "xl",
    highlight: true,
    hideOnMobile: true,
    anchorId: "custom-anchor",
    className: "alpha betascript",
  });
  expect(button?.attrs).toMatchObject({
    variant: "secondary",
    size: "lg",
    newTab: true,
  });
  expect(embed?.attrs).toMatchObject({
    provider: "youtube",
    aspect: "4:3",
    lazy: false,
  });
  expect(separator?.attrs).toMatchObject({
    style: "dashed",
    thickness: 4,
  });
  expect(normalized.meta.typography).toEqual({
    fontFamily: "serif",
    baseTextScale: "lg",
  });
});

test("createEmptyPostBlockDocument seeds default typography for editor inheritance", () => {
  const empty = createEmptyPostBlockDocument();

  expect(empty.meta.typography).toEqual({
    fontFamily: "sans",
    baseTextScale: "md",
  });
});
