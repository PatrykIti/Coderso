import { expect, test } from "bun:test";
import { renderToString } from "react-dom/server";

import { PostListViewPanel } from "../../../core/admin/ui/posts/editor/blocks/PostListViewPanel";
import { PostEditorTopBar } from "../../../core/admin/ui/posts/editor/PostEditorTopBar";

const createTopBarProps = () => ({
  title: "Test post",
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
  onToggleInserter: () => undefined,
  inserterVisible: false,
  onToggleOutline: () => undefined,
  outlineVisible: true,
  onOpenDetails: () => undefined,
});

test("post editor top bar exposes document tools and publish actions", () => {
  const html = renderToString(<PostEditorTopBar {...createTopBarProps()} />);

  expect(html).toContain("Add");
  expect(html).toContain("Document overview");
  expect(html).toContain("Runtime preview");
  expect(html).toContain("Publish");
});

test("post list view panel uses logical writing-first labels", () => {
  const html = renderToString(
    <PostListViewPanel
      blocks={[
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
      ]}
      selectedBlockId="block-1"
      onSelectBlock={() => undefined}
      onMoveBlockToIndex={() => undefined}
    />
  );

  expect(html).toContain("Section");
  expect(html).toContain("CTA block");
  expect(html).toContain("Embed block");
});
