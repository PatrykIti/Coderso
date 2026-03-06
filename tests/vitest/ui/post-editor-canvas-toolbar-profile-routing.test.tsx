import React from "react";
import { expect, test } from "vitest";
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

  expect(html).toContain("Type");
  expect(html).toContain("Headings");
  expect(html).not.toContain("More formatting");
  expect(html).not.toContain("List");
  expect(html).not.toContain("Code");
  expect(html).toContain('aria-label="Align left"');
  expect(html).toContain('aria-label="Clear formatting"');
});

test("paragraph block routes to paragraph toolbar profile", () => {
  const html = renderCanvasForType("paragraph");

  expect(html).toContain("Type");
  expect(html).not.toContain("List");
  expect(html).not.toContain("Code");
  expect(html).not.toContain("More formatting");
  expect(html).toContain('aria-label="Align left"');
  expect(html).toContain('aria-label="Clear formatting"');
});

test("quote block renders type control without list group", () => {
  const html = renderCanvasForType("quote");

  expect(html).toContain("Type");
  expect(html).not.toContain("List");
  expect(html).not.toContain("More formatting");
});

test("non-richtext list block does not render richtext toolbar", () => {
  const html = renderCanvasForType("list");

  expect(html).not.toContain("More formatting");
  expect(html).toContain("One item per line");
});
