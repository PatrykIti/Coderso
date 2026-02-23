import { expect, test } from "bun:test";
import { renderToString } from "react-dom/server";

import { PostEditorCanvas } from "../../../core/admin/ui/posts/editor/PostEditorCanvas";
import { PostEditorTopBar } from "../../../core/admin/ui/posts/editor/PostEditorTopBar";

const createTopBarProps = () => ({
  status: "draft",
  dirty: false,
  saving: false,
  lastSavedAt: "2026-02-22T22:00:00.000Z",
  canUndo: true,
  canRedo: true,
  onUndo: () => undefined,
  onRedo: () => undefined,
  onOpenRevisions: () => undefined,
  onSaveDraft: () => undefined,
  onPreview: () => undefined,
  onPublish: () => undefined,
  onInsertBlock: () => undefined,
  onToggleOutline: () => undefined,
  outlineVisible: true,
  onOpenDetails: () => undefined,
});

test("post editor top bar exposes writing-first insert actions", () => {
  const html = renderToString(<PostEditorTopBar {...createTopBarProps()} />);

  expect(html).toContain("Writing flow");
  expect(html).toContain("Add writing section");
  expect(html).toContain("Add CTA block");
  expect(html).toContain("Add embed block");
});

test("post editor canvas list view uses logical writing-first labels", () => {
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
              nodes: [{ id: "node-1", type: "paragraph", text: "<p>Body</p>" }],
            },
          },
          {
            id: "block-2",
            type: "button",
            attrs: { label: "Contact", url: "/contact" },
            content: null,
          },
          {
            id: "block-3",
            type: "embed",
            attrs: { provider: "youtube", url: "https://youtu.be/demo" },
            content: null,
          },
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

  expect(html).toContain("Section");
  expect(html).toContain("CTA block");
  expect(html).toContain("Embed block");
});
