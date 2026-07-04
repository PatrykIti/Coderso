import React from "react";
import { expect, test } from "vitest";

import { PostBlockEditorShell } from "../../../core/admin/ui/posts/editor/PostBlockEditorShell";
import { renderAdminUi } from "../../utils/adminRouterRender";

test("PostBlockEditorShell renders region-based layout shell", () => {
  const html = renderAdminUi(<PostBlockEditorShell />, {
    path: "/admin/posts/post-1",
  });

  expect(html).toContain('data-post-editor-region="header"');
  expect(html).toContain('data-post-editor-region="content"');
  expect(html).toContain('data-post-editor-region="secondary-sidebar"');
  expect(html).toContain('data-post-editor-header-cluster="primary-actions"');
  // TASK-497-02 (B1): secondary toolbar row collapsed into the single chrome strip.
  expect(html).not.toContain('data-post-editor-header-cluster="secondary-controls"');
  expect(html).toContain('data-post-editor-header-close="true"');
  // TASK-497-02 (E3): the in-page PageHeader renders above the editor card.
  expect(html).toContain("Write, format, and publish your story.");
  // TASK-497-02 (E4): the editor body is wrapped in the framed card.
  expect(html).toContain('data-post-editor-frame="true"');
  expect(html).toContain("rounded-2xl");
  expect(html).toContain("shadow-card");
  // TASK-497-02 (E4): the secondary-sidebar rail surface uses bg-muted/20.
  expect(html).toContain("bg-muted/20");
  // TASK-497-02 (E1/E2): Blocks is the default left-rail mode + the selected tab.
  expect(html).toContain('data-post-editor-left-rail-mode="blocks"');
  expect(html).toContain('data-post-editor-left-rail-tab="blocks"');
  // TASK-497-02 (E2): Outline + List survive as sibling tabs (relocated, not dropped).
  expect(html).toContain('data-post-editor-left-rail-tab="list-view"');
  expect(html).toContain("List");
  expect(html).toContain('data-post-editor-left-rail-tab="outline"');
  expect(html).toContain('id="post-editor-document-overview"');
  expect(html).toContain("Loading post editor");
  expect(html).toContain("Move to trash");
});
