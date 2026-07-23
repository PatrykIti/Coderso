import React from "react";
import { expect, test } from "vitest";
import { renderToString } from "react-dom/server";

import { PostEditorTopBar } from "../../../core/admin/ui/posts/editor/PostEditorTopBar";

const createBaseProps = () => ({
  title: "Test post",
  status: "draft",
  dirty: false,
  saving: false,
  lastSavedAt: "2026-02-25T10:00:00.000Z",
  breadcrumbs: <span>Content / Posts / Test post</span>,
  onClose: () => undefined,
  onOpenRevisions: () => undefined,
  onPreview: () => undefined,
  onPublish: () => undefined,
  onToggleInserter: () => undefined,
  inserterVisible: false,
  onToggleFocusMode: () => undefined,
  focusMode: false,
  onToggleOutline: () => undefined,
  outlineVisible: true,
  onToggleDetails: () => undefined,
  detailsOpen: false,
  onOpenSettings: () => undefined,
});

test("PostEditorTopBar renders autosave and revisions status", () => {
  const html = renderToString(<PostEditorTopBar {...createBaseProps()} />);

  expect(html).toContain("Saved at");
  expect(html).toContain("Revisions");
});

test("PostEditorTopBar prioritizes saving and unsaved indicators", () => {
  const savingHtml = renderToString(<PostEditorTopBar {...createBaseProps()} saving dirty />);
  expect(savingHtml).toContain("Saving...");

  const dirtyHtml = renderToString(
    <PostEditorTopBar {...createBaseProps()} saving={false} dirty />
  );
  expect(dirtyHtml).toContain("Unsaved changes");
});

test("PostEditorTopBar exposes a Close-only pending boundary", () => {
  const html = renderToString(<PostEditorTopBar {...createBaseProps()} closePending />);

  expect(html).toContain('data-post-editor-close-pending="true"');
  expect(html).toContain('aria-busy="true"');
  expect(html).toContain("Saving latest changes before closing");
  const closeButtonTag = (html.match(/<button\b[^>]*>/g) ?? []).find((tag) =>
    tag.includes('data-post-editor-header-close="true"')
  );
  expect(closeButtonTag).toBeDefined();
  expect(closeButtonTag).toMatch(/\sdisabled(?:=""|(?=[\s>]))/);
});
