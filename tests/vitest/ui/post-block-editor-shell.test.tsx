import React from "react";
import { expect, test } from "vitest";

import { PostBlockEditorShell } from "../../../core/admin/ui/posts/editor/PostBlockEditorShell";
import { renderAdminUi } from "../../utils/adminRouterRender";

test("PostBlockEditorShell renders Gutenberg-like frame", () => {
  const html = renderAdminUi(<PostBlockEditorShell />, {
    path: "/admin/coderso/posts/post-1",
  });

  expect(html).toContain("Document Outline");
  expect(html).toContain("data-post-editor-outline-insert=\"true\"");
  expect(html).toContain("Editor settings");
  expect(html).toContain("Publish");
  expect(html).toContain("Preview");
  expect(html).toContain("data-post-editor-region=\"secondary-sidebar\"");
  expect(html).toContain("List view");
});
