import { expect, test } from "bun:test";
import { renderToString } from "react-dom/server";

import { PostEditorCanvas } from "../../../core/admin/ui/posts/editor/PostEditorCanvas";

test("PostEditorCanvas renders unified document canvas", () => {
  const html = renderToString(
    <PostEditorCanvas
      document={{
        version: 1,
        meta: {},
        blocks: [
          {
            id: "block-1",
            type: "writing-canvas",
            attrs: {},
            content: {
              version: 1,
              nodes: [{ id: "node-1", type: "paragraph", text: "<p>Intro</p>" }],
            },
          },
          { id: "block-2", type: "heading", attrs: { level: 2 }, content: "<h2>Title</h2>" },
        ],
      }}
      selectedBlockId="block-1"
      insertFocusToken={0}
      onSelectBlock={() => undefined}
      onUpdateBlockContent={() => undefined}
      onMoveBlock={() => undefined}
      onTransformBlock={() => undefined}
      onDeleteBlock={() => undefined}
      onInsertBlock={() => undefined}
    />
  );

  expect(html).toContain("data-post-editor-appender=\"true\"");
  expect(html).toContain("Heading");
  expect((html.match(/data-post-editor-appender=\"true\"/g) ?? []).length).toBe(2);
});

test("PostEditorCanvas shows empty state and writing-canvas appender", () => {
  const html = renderToString(
    <PostEditorCanvas
      document={{
        version: 1,
        meta: {},
        blocks: [],
      }}
      selectedBlockId={null}
      insertFocusToken={0}
      onSelectBlock={() => undefined}
      onUpdateBlockContent={() => undefined}
      onMoveBlock={() => undefined}
      onTransformBlock={() => undefined}
      onDeleteBlock={() => undefined}
      onInsertBlock={() => undefined}
    />
  );

  expect(html).toContain("No blocks yet.");
  expect(html).toContain("Add writing section");
});
