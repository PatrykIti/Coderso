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
      title="Unified flow"
      onTitleChange={() => undefined}
      selectedBlockId="block-1"
      insertFocusToken={0}
      onSelectBlock={() => undefined}
      onUpdateBlockContent={() => undefined}
      onInsertBlock={() => undefined}
    />
  );

  expect(html).toContain("data-post-editor-flow=\"unified\"");
  expect(html).toContain("data-post-editor-title-input=\"true\"");
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
      title=""
      onTitleChange={() => undefined}
      selectedBlockId={null}
      insertFocusToken={0}
      onSelectBlock={() => undefined}
      onUpdateBlockContent={() => undefined}
      onInsertBlock={() => undefined}
    />
  );

  expect(html).toContain("No blocks yet.");
  expect(html).toContain("Add section");
});

test("PostEditorCanvas renders media placeholder when image is not configured", () => {
  const html = renderToString(
    <PostEditorCanvas
      document={{
        version: 1,
        meta: {},
        blocks: [{ id: "block-1", type: "image", attrs: {}, content: null }],
      }}
      title="Media post"
      onTitleChange={() => undefined}
      selectedBlockId="block-1"
      insertFocusToken={0}
      onSelectBlock={() => undefined}
      onUpdateBlockContent={() => undefined}
      onInsertBlock={() => undefined}
      onOpenBlockDetails={() => undefined}
    />
  );

  expect(html).toContain("data-post-editor-media-placeholder=\"image\"");
  expect(html).toContain("Click to configure image");
});
