import { expect, test } from "bun:test";

import { PostBlockEditorShell } from "../../../core/admin/ui/posts/editor/PostBlockEditorShell";
import { renderAdminUi } from "../../utils/adminRouterRender";

test("PostBlockEditorShell renders region-based layout shell", () => {
  const html = renderAdminUi(<PostBlockEditorShell />, {
    path: "/admin/coderso/posts/post-1",
  });

  expect(html).toContain("data-post-editor-region=\"header\"");
  expect(html).toContain("data-post-editor-region=\"content\"");
  expect(html).toContain("data-post-editor-region=\"secondary-sidebar\"");
  expect(html).toContain("data-post-editor-header-cluster=\"primary-actions\"");
  expect(html).toContain("data-post-editor-header-cluster=\"secondary-controls\"");
  expect(html).toContain("data-post-editor-header-close=\"true\"");
  expect(html).toContain("data-post-editor-left-rail-mode=\"outline\"");
  expect(html).toContain("List view");
  expect(html).toContain("Loading post editor");
  expect(html).toContain("Document Outline");
  expect(html).toContain("Move to trash");
});
