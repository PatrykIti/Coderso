import React from "react";
import { expect, test } from "vitest";

import { PostEditorPage } from "../../../core/admin/ui/posts/PostEditorPage";
import { PostBlockEditorShell } from "../../../core/admin/ui/posts/editor/PostBlockEditorShell";
import { renderAdminUi } from "../../utils/adminRouterRender";

test("post editor smoke: blocks mode renders canonical editor layout", () => {
  const html = renderAdminUi(<PostEditorPage />, {
    path: "/admin/coderso/posts/post-1",
  });

  expect(html).toContain("Editor settings");
  expect(html).toContain("Document Outline");
  expect(html).toContain("Preview");
});

test("post editor smoke: classic override route still opens legacy editor", () => {
  const html = renderAdminUi(<PostEditorPage />, {
    path: "/admin/coderso/posts/post-1?editor=classic",
  });

  expect(html).toContain("Enter post title...");
  expect(html).toContain("Save metadata");
  expect(html).not.toContain("Document Outline");
});

test("post editor smoke: shell action controls stay visible", () => {
  const html = renderAdminUi(<PostBlockEditorShell />, {
    path: "/admin/coderso/posts/post-1",
  });

  expect(html).toContain("Revisions");
  expect(html).toContain("Publish");
  expect(html).toContain("Document Outline");
});
