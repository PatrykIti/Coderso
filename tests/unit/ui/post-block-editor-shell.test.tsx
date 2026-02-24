import { expect, test } from "bun:test";

import { PostBlockEditorShell } from "../../../core/admin/ui/posts/editor/PostBlockEditorShell";
import { renderAdminUi } from "../../utils/adminRouterRender";

test("PostBlockEditorShell renders Gutenberg-like frame", () => {
  const html = renderAdminUi(<PostBlockEditorShell />, {
    path: "/admin/coderso/posts/post-1",
  });

  expect(html).toContain("Post editor");
  expect(html).toContain("Add");
  expect(html).toContain("Document overview");
  expect(html).toContain("Save draft");
  expect(html).toContain("Publish");
  expect(html).toContain("Undo");
  expect(html).toContain("Runtime preview");
  expect(html).toContain("data-post-editor-region=\"secondary-sidebar\"");
  expect(html).toContain("List view");
});
