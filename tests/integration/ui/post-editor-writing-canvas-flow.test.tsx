import { expect, test } from "bun:test";
import { renderToString } from "react-dom/server";

import { PostListViewPanel } from "../../../core/admin/ui/posts/editor/blocks/PostListViewPanel";
import { PostEditorTopBar } from "../../../core/admin/ui/posts/editor/PostEditorTopBar";

const createTopBarProps = () => ({
  title: "Test post",
  status: "draft",
  dirty: false,
  saving: false,
  onOpenRevisions: () => undefined,
  onPreview: () => undefined,
  onPublish: () => undefined,
  onToggleFocusMode: () => undefined,
  focusMode: false,
  onToggleOutline: () => undefined,
  outlineVisible: true,
  onOpenDetails: () => undefined,
  onOpenSettings: () => undefined,
});

test("post editor top bar exposes document tools and publish actions", () => {
  const html = renderToString(<PostEditorTopBar {...createTopBarProps()} />);

  expect(html).toContain("Outline");
  expect(html).toContain("Preview");
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
