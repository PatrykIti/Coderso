import React from "react";
import { expect, test } from "vitest";
import { renderToString } from "react-dom/server";

import { PostEditorTopBar } from "../../../core/admin/ui/posts/editor/PostEditorTopBar";

const createHeaderProps = () => ({
  title: "Header workflow",
  status: "draft",
  dirty: false,
  saving: false,
  lastSavedAt: "2026-02-25T10:00:00.000Z",
  breadcrumbs: <span>Content / Posts / Header workflow</span>,
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

test("PostEditorTopBar renders document tools, context, and action clusters", () => {
  const html = renderToString(<PostEditorTopBar {...createHeaderProps()} />);

  expect(html).toContain("data-post-editor-header-cluster=\"primary-actions\"");
  expect(html).toContain("data-post-editor-header-cluster=\"secondary-controls\"");
  expect(html).toContain("data-post-editor-header-close=\"true\"");
  expect(html).toContain("Add block");
  expect(html).toContain("Outline");
  expect(html).toContain("Revisions");
  expect(html).toContain("Preview");
  expect(html).toContain("Editor settings");
  expect(html).toContain("Header workflow");
});

test("PostEditorTopBar reflects saving and dirty states", () => {
  const savingHtml = renderToString(
    <PostEditorTopBar
      {...createHeaderProps()}
      saving
      dirty
    />
  );

  expect(savingHtml).toContain("Saving...");
  expect(savingHtml).not.toContain("Unsaved changes");
  expect(savingHtml).toContain("disabled");
});

test("PostEditorTopBar switches publish label for published status", () => {
  const html = renderToString(
    <PostEditorTopBar
      {...createHeaderProps()}
      status="published"
    />
  );

  expect(html).not.toContain("data-post-editor-header-status");
  expect(html).not.toContain(">Published<");
  expect(html).toContain("Update");
});
