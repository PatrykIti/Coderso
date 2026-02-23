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
      onSelectBlock={() => undefined}
      onUpdateBlockContent={() => undefined}
      onMoveBlock={() => undefined}
      onTransformBlock={() => undefined}
      onDeleteBlock={() => undefined}
      onInsertBlockAfterSelected={() => undefined}
    />
  );

  expect(html).toContain("Document canvas");
  expect(html).toContain("Edit the full post flow in one view");
  expect(html).toContain("Heading");
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
      onSelectBlock={() => undefined}
      onUpdateBlockContent={() => undefined}
      onMoveBlock={() => undefined}
      onTransformBlock={() => undefined}
      onDeleteBlock={() => undefined}
      onInsertBlockAfterSelected={() => undefined}
    />
  );

  expect(html).toContain("No blocks yet.");
  expect(html).toContain("Add writing section");
});
