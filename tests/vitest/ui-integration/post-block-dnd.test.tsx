import React from "react";
import { expect, test } from "vitest";
import { renderToString } from "react-dom/server";

import { PostListViewPanel } from "../../../core/admin/ui/posts/editor/blocks/PostListViewPanel";

test("PostListViewPanel exposes drag-and-drop and keyboard fallback affordances", () => {
  const html = renderToString(
    <PostListViewPanel
      blocks={[
        { id: "a", type: "paragraph", attrs: {}, content: "Intro" },
        { id: "b", type: "heading", attrs: { level: 2 }, content: "Section" },
      ]}
      selectedBlockId="a"
      onSelectBlock={() => undefined}
      onMoveBlockToIndex={() => undefined}
    />
  );

  expect(html).toContain("List view");
  expect(html).toContain("Drag blocks to reorder");
  expect(html).toContain("Alt");
  expect(html).toContain("Arrow keys");
  expect(html).toContain("draggable=\"true\"");
  expect(html).toContain("Paragraph");
  expect(html).toContain("Heading");
});

test("PostListViewPanel renders delete affordance when delete handler is provided", () => {
  const html = renderToString(
    <PostListViewPanel
      blocks={[
        { id: "a", type: "paragraph", attrs: {}, content: "Intro" },
        { id: "b", type: "heading", attrs: { level: 2 }, content: "Section" },
      ]}
      selectedBlockId="a"
      onSelectBlock={() => undefined}
      onDeleteBlock={() => undefined}
      onMoveBlockToIndex={() => undefined}
    />
  );

  expect(html).toContain("aria-label=\"Delete block 1: Paragraph\"");
  expect(html).toContain("aria-label=\"Delete block 2: Heading\"");
  expect(html).toContain("text-muted-foreground opacity-60 transition");
});
