import { expect, test } from "bun:test";

import { PostBlockEditorShell } from "../../../core/admin/ui/posts/editor/PostBlockEditorShell";
import { renderAdminUi } from "../../utils/adminRouterRender";

test("PostBlockEditorShell renders Gutenberg-like frame", () => {
  const html = renderAdminUi(<PostBlockEditorShell />, {
    path: "/admin/coderso/posts/post-1",
  });

  expect(html).toContain("Block inserter");
  expect(html).toContain("Document");
  expect(html).toContain("Block");
  expect(html).toContain("Save draft");
  expect(html).toContain("Revisions");
  expect(html).toContain("Runtime preview");
  expect(html).toContain("Blocks");
  expect(html).toContain("Details");
});
