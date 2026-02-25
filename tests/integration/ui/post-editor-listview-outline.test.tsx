import { expect, test } from "bun:test";
import { renderToString } from "react-dom/server";

import { PostListViewSidebar } from "../../../core/admin/ui/posts/editor/sidebars/PostListViewSidebar";

test("PostListViewSidebar renders document outline with list/outline tabs", () => {
  const html = renderToString(
    <PostListViewSidebar
      document={{
        version: 1,
        blocks: [
          {
            id: "writing-1",
            type: "writing-canvas",
            attrs: {},
            content: {
              version: 1,
              nodes: [
                { id: "node-1", type: "paragraph", text: "Intro paragraph" },
                { id: "node-2", type: "heading", level: 2, text: "Section title" },
              ],
            },
          },
          {
            id: "heading-1",
            type: "heading",
            attrs: { level: 3 },
            content: "Implementation",
          },
        ],
        meta: {},
      }}
      selectedBlockId="writing-1"
      onSelectBlock={() => undefined}
      onMoveBlockToIndex={() => undefined}
      onInsertBlock={() => undefined}
    />
  );

  expect(html).toContain("Document Outline");
  expect(html).toContain("data-post-editor-left-rail-mode=\"outline\"");
  expect(html).toContain("data-post-editor-left-rail-tab=\"outline\"");
  expect(html).toContain("data-post-editor-left-rail-tab=\"list-view\"");
  expect(html).toContain("List view");
  expect(html).toContain("Outline");
  expect(html).toContain("data-post-editor-outline-insert=\"true\"");
  expect(html).toContain("Section title");
  expect(html).toContain("Implementation");
});

test("PostListViewSidebar renders empty outline state without headings", () => {
  const html = renderToString(
    <PostListViewSidebar
      document={{
        version: 1,
        blocks: [
          {
            id: "paragraph-1",
            type: "paragraph",
            attrs: {},
            content: "Body only",
          },
        ],
        meta: {},
      }}
      selectedBlockId={null}
      onSelectBlock={() => undefined}
      onMoveBlockToIndex={() => undefined}
      onInsertBlock={() => undefined}
    />
  );

  expect(html).toContain("No headings found.");
});
