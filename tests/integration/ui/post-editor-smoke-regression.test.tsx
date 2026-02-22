import { expect, test } from "bun:test";

import { PostEditorPage } from "../../../core/admin/ui/posts/PostEditorPage";
import { PostBlockEditorShell } from "../../../core/admin/ui/posts/editor/PostBlockEditorShell";
import { renderAdminUi } from "../../utils/adminRouterRender";

test("post editor smoke: blocks mode renders canonical editor layout", () => {
  const html = renderAdminUi(<PostEditorPage />, {
    path: "/admin/coderso/posts/post-1",
  });

  expect(html).toContain("Home");
  expect(html).toContain("Insert");
  expect(html).toContain("Review");
  expect(html).toContain("View");
  expect(html).toContain("Save draft");
  expect(html).toContain("Add writing section");
});

test("post editor smoke: classic override route still opens legacy editor", () => {
  const html = renderAdminUi(<PostEditorPage />, {
    path: "/admin/coderso/posts/post-1?editor=classic",
  });

  expect(html).toContain("Enter post title...");
  expect(html).toContain("Runtime preview");
  expect(html).not.toContain("Home");
});

test("post editor smoke: shell action controls stay visible", () => {
  const html = renderAdminUi(<PostBlockEditorShell />, {
    path: "/admin/coderso/posts/post-1",
  });

  expect(html).toContain("Undo");
  expect(html).toContain("Save draft");
  expect(html).toContain("Publish");
  expect(html).toContain("Add writing section");
});
