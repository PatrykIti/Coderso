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

test("post editor top bar exposes the chrome-bar document tools", () => {
  const html = renderToString(<PostEditorTopBar {...createTopBarProps()} />);

  // TASK-497-02 (E3/E4): Preview/Publish moved OUT of the chrome-bar TopBar into the shell's
  // PageHeader pageActions (asserted on the full-shell mount in post-editor-shell-restyle.test.tsx).
  // The Outline toggle stays in the chrome bar as an icon button (outlineVisible:true →
  // "Hide document overview").
  expect(html).toContain("Hide document overview");
  expect(html).not.toContain("Preview");
  expect(html).not.toContain("Publish");
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
