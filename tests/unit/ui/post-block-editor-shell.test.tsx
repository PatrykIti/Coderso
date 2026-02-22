import { expect, test } from "bun:test";

import { PostBlockEditorShell } from "../../../core/admin/ui/posts/editor/PostBlockEditorShell";
import { renderAdminUi } from "../../utils/adminRouterRender";

test("PostBlockEditorShell renders Gutenberg-like frame", () => {
  const html = renderAdminUi(<PostBlockEditorShell />, {
    path: "/admin/coderso/posts/post-1",
  });

  expect(html).toContain("Home");
  expect(html).toContain("Insert");
  expect(html).toContain("Review");
  expect(html).toContain("View");
  expect(html).toContain("Save draft");
  expect(html).toContain("Publish");
  expect(html).toContain("Undo");
  expect(html).toContain("Add writing section");
});
