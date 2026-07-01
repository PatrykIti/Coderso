import React from "react";
import { expect, test } from "vitest";
import { renderToString } from "react-dom/server";

import { PostListViewPanel } from "../../../core/admin/ui/posts/editor/blocks/PostListViewPanel";
import { PostEditorTopBar } from "../../../core/admin/ui/posts/editor/PostEditorTopBar";

const createTopBarProps = () => ({
  title: "Test post",
  status: "draft",
  dirty: false,
  saving: false,
  lastSavedAt: "2026-02-25T10:00:00.000Z",
  breadcrumbs: <span>Content / Posts / Test post</span>,
  onClose: () => undefined,
  onOpenRevisions: () => undefined,
  onPreview: () => undefined,
  onPublish: () => undefined,
  onToggleInserter: () => undefined,
  inserterVisible: false,
  onToggleFocusMode: () => undefined,
  focusMode: false,
  onToggleOutline: () => undefined,
  outlineVisible: true,
  onToggleDetails: () => undefined,
  detailsOpen: false,
  onOpenSettings: () => undefined,
});

test("post editor top bar exposes document tools and publish actions", () => {
  const html = renderToString(<PostEditorTopBar {...createTopBarProps()} />);

  // TASK-497-02 (B1): the Outline header label is demoted to an icon button; assert the
  // preserved aria-label/title (this suite seeds outlineVisible:true → "Hide document overview").
  expect(html).toContain("Hide document overview");
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
