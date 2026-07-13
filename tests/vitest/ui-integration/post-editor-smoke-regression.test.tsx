import React from "react";
import { expect, test } from "vitest";

import { PostEditorPage } from "../../../core/admin/ui/posts/PostEditorPage";
import { PostBlockEditorShell } from "../../../core/admin/ui/posts/editor/PostBlockEditorShell";
import { renderAdminUi } from "../../utils/adminRouterRender";

const readButtonTag = (html: string, marker: string) =>
  (html.match(/<button\b[^>]*>/g) ?? []).find((tag) => tag.includes(marker));
const hasDisabledAttribute = (tag: string) => /\sdisabled(?:=""|(?=[\s>]))/.test(tag);

const expectLoadingBoundary = (html: string) => {
  expect(html).toContain("Loading post editor...");
  expect(html).toContain('data-post-editor-region="content"');
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
};

test("post editor smoke: blocks mode renders a fail-closed loading boundary", () => {
  const html = renderAdminUi(<PostEditorPage />, {
    path: "/admin/posts/post-1",
  });

  expect(html).toContain("Editor settings");
  expect(html).toContain("Preview");
  expectLoadingBoundary(html);
});

test("post editor smoke: classic override route still opens legacy editor", () => {
  const html = renderAdminUi(<PostEditorPage />, {
    path: "/admin/posts/post-1?editor=classic",
  });

  expect(html).toContain("Enter post title...");
  expect(html).toContain("Save metadata");
  expect(html).not.toContain("Document Outline");
});

test("post editor smoke: shell keeps Close available and mutation actions inert while loading", () => {
  const html = renderAdminUi(<PostBlockEditorShell />, {
    path: "/admin/posts/post-1",
  });

  expect(html).toContain("Revisions");
  expect(html).toContain("Publish");
  expectLoadingBoundary(html);
});
