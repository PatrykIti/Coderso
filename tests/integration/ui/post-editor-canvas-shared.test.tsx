import { expect, test } from "bun:test";
import { renderToString } from "react-dom/server";

import { PostEditorCanvas } from "../../../core/admin/ui/posts/editor/PostEditorCanvas";

test("PostEditorCanvas renders unified document canvas with outline", () => {
  const html = renderToString(
    <PostEditorCanvas
      document={{
        version: 1,
        meta: {},
        blocks: [
          { id: "block-1", type: "paragraph", attrs: {}, content: "<p>Intro</p>" },
          { id: "block-2", type: "heading", attrs: { level: 2 }, content: "<h2>Title</h2>" },
        ],
      }}
      selectedBlockId="block-1"
      onSelectBlock={() => undefined}
      onUpdateBlockContent={() => undefined}
      onMoveBlock={() => undefined}
      onMoveBlockToIndex={() => undefined}
      onTransformBlock={() => undefined}
      onDeleteBlock={() => undefined}
      onInsertBlockAfterSelected={() => undefined}
      outlineVisible
    />
  );

  expect(html).toContain("Document canvas");
  expect(html).toContain("List view");
  expect(html).toContain("Paragraph");
  expect(html).toContain("Heading");
});

test("PostEditorCanvas can hide outline panel", () => {
  const html = renderToString(
    <PostEditorCanvas
      document={{
        version: 1,
        meta: {},
        blocks: [{ id: "block-1", type: "paragraph", attrs: {}, content: "" }],
      }}
      selectedBlockId="block-1"
      onSelectBlock={() => undefined}
      onUpdateBlockContent={() => undefined}
      onMoveBlock={() => undefined}
      onMoveBlockToIndex={() => undefined}
      onTransformBlock={() => undefined}
      onDeleteBlock={() => undefined}
      onInsertBlockAfterSelected={() => undefined}
      outlineVisible={false}
    />
  );

  expect(html).toContain("Document canvas");
  expect(html).not.toContain("List view");
});
