import React from "react";
import { expect, test } from "vitest";

import { PostBlockEditorShell } from "../../../core/admin/ui/posts/editor/PostBlockEditorShell";
import { renderAdminUi } from "../../utils/adminRouterRender";

const readButtonTag = (html: string, marker: string) =>
  (html.match(/<button\b[^>]*>/g) ?? []).find((tag) => tag.includes(marker));
const hasDisabledAttribute = (tag: string) => /\sdisabled(?:=""|(?=[\s>]))/.test(tag);

test("PostBlockEditorShell renders a fail-closed loading frame", () => {
  const html = renderAdminUi(<PostBlockEditorShell />, {
    path: "/admin/posts/post-1",
  });

  expect(html).toContain('data-post-editor-region="header"');
  expect(html).toContain('data-post-editor-region="content"');
  expect(html).toContain('data-post-editor-frame="true"');
  expect(html).toContain("Loading post editor...");
  expect(html).toContain("Editor settings");
  expect(html).toContain("Publish");
  expect(html).toContain("Preview");
  expect(html).not.toContain('data-post-editor-region="secondary-sidebar"');
  expect(html).not.toContain('data-post-editor-region="sidebar"');
  expect(html).not.toContain("data-post-editor-left-rail-");
  expect(html).not.toContain("Move to trash");

  const closeButton = readButtonTag(html, 'data-post-editor-header-close="true"');
  expect(closeButton).toBeDefined();
  expect(hasDisabledAttribute(closeButton ?? "")).toBe(false);

  for (const label of ["Open runtime preview", "Save draft", "Publish post"]) {
    const actionButton = readButtonTag(html, `aria-label="${label}"`);
    expect(actionButton).toBeDefined();
    expect(hasDisabledAttribute(actionButton ?? "")).toBe(true);
  }
});
