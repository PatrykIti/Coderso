import { expect, test } from "bun:test";

import { PostEditorPage } from "../../../core/admin/ui/posts/PostEditorPage";
import { renderAdminUi } from "../../utils/adminRouterRender";

test("PostEditorPage renders post editor shell", () => {
  const html = renderAdminUi(<PostEditorPage />, {
    path: "/admin/coderso/posts/post-1",
  });

  expect(html).toContain("Edit Post");
  expect(html).toContain("Loading post editor");
  expect(html).toContain("Block inserter");
  expect(html).toContain("Runtime preview");
  expect(html).toContain("Document");
  expect(html).toContain("Block");
});
