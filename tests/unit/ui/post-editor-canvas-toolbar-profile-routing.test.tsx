import { expect, test } from "bun:test";
import { renderToString } from "react-dom/server";

import { PostEditorCanvas } from "../../../core/admin/ui/posts/editor/PostEditorCanvas";
import type {
  PostBlock,
  PostBlockDocument,
  PostBlockType,
} from "../../../core/services/posts/editor/postBlockDocument";

const createBlock = (type: PostBlockType): PostBlock => {
  if (type === "writing-canvas") {
    return {
      id: "block-1",
      type,
      attrs: {},
      content: {
        version: 1,
        nodes: [{ id: "node-1", type: "paragraph", text: "<p>Hello</p>" }],
      },
    };
  }

  if (type === "list") {
    return {
      id: "block-1",
      type,
      attrs: { ordered: false, compact: false },
      content: ["One", "Two"],
    };
  }

  return {
    id: "block-1",
    type,
    attrs: type === "heading" ? { level: 2 } : {},
    content: "<p>Hello</p>",
  };
};

const renderCanvasForType = (type: PostBlockType) => {
  const document: PostBlockDocument = {
    version: 1,
    meta: {},
    blocks: [createBlock(type)],
  };
  return renderToString(
    <PostEditorCanvas
      document={document}
      title="Toolbar profile routing"
      onTitleChange={() => undefined}
      selectedBlockId="block-1"
      insertFocusToken={0}
      onSelectBlock={() => undefined}
      onUpdateBlockContent={() => undefined}
      onInsertBlock={() => undefined}
    />
  );
};

test("heading block routes to reduced heading toolbar profile", () => {
  const html = renderCanvasForType("heading");

  expect(html).toContain('aria-label="Paragraph"');
  expect(html).toContain("More formatting");
  expect(html).not.toContain('aria-label="Heading 1"');
  expect(html).not.toContain('aria-label="Bullet list"');
  expect(html).not.toContain('aria-label="Quote"');
});

test("paragraph block routes to paragraph toolbar profile", () => {
  const html = renderCanvasForType("paragraph");

  expect(html).toContain('aria-label="Paragraph"');
  expect(html).toContain("Headings");
  expect(html).toContain("List");
  expect(html).toContain('aria-label="Quote"');
});

test("quote block keeps quote toggle and omits heading list actions", () => {
  const html = renderCanvasForType("quote");

  expect(html).toContain('aria-label="Quote"');
  expect(html).toContain('aria-label="Paragraph"');
  expect(html).not.toContain('aria-label="Heading 1"');
  expect(html).not.toContain('aria-label="Bullet list"');
});

test("non-richtext list block does not render richtext toolbar", () => {
  const html = renderCanvasForType("list");

  expect(html).not.toContain("More formatting");
  expect(html).toContain("One item per line");
});
