import React from "react";
import { expect, test } from "vitest";

import {
  PostEditorPage,
  resolvePostEditorMode,
} from "../../../core/admin/ui/posts/PostEditorPage";
import { renderAdminUi } from "../../utils/adminRouterRender";

test("PostEditorPage renders post editor shell", () => {
  const html = renderAdminUi(<PostEditorPage />, {
    path: "/admin/coderso/posts/post-1",
  });

  expect(html).toContain("Edit Post");
  expect(html).toContain("Loading post editor");
  expect(html).toContain("Document Outline");
  expect(html).toContain("Preview");
  expect(html).toContain("Editor settings");
});

test("PostEditorPage supports query override for classic editor", () => {
  const html = renderAdminUi(<PostEditorPage />, {
    path: "/admin/coderso/posts/post-1?editor=classic",
  });

  expect(html).toContain("Enter post title...");
  expect(html).not.toContain("Editor settings");
});

test("resolvePostEditorMode prioritizes query override over settings", () => {
  expect(resolvePostEditorMode("/admin/coderso/posts/post-1?editor=classic", "blocks")).toBe(
    "classic"
  );
  expect(resolvePostEditorMode("/admin/coderso/posts/post-1", "classic")).toBe(
    "classic"
  );
  expect(resolvePostEditorMode("/admin/coderso/posts/post-1", "invalid")).toBe(
    "blocks"
  );
});
