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

test("PostEditorTopBar renders the chrome-bar document tools and context", () => {
  const html = renderToString(<PostEditorTopBar {...createHeaderProps()} />);

  // TASK-497-02 (E3/E4): Preview/Save draft/Publish + the primary-actions cluster and the
  // dynamic post title moved OUT of the chrome-bar TopBar into the shell's PageHeader
  // pageActions/title (asserted on the full-shell mount in post-editor-shell-restyle.test.tsx).
  // The single chrome strip keeps ONLY the close button, the six icon toggles, Revisions/
  // Settings, the sync badge, and the STATIC "Post editor" title.
  expect(html).not.toContain('data-post-editor-header-cluster="secondary-controls"');
  expect(html).not.toContain('data-post-editor-header-cluster="primary-actions"');
  expect(html).toContain('data-post-editor-header-close="true"');
  // Add block / Outline labels are icon buttons — assert the preserved aria-label/title
  // (this suite seeds outlineVisible:true → "Hide document overview").
  expect(html).toContain("Toggle block inserter");
  expect(html).toContain("Hide document overview");
  expect(html).toContain("Revisions");
  expect(html).toContain("Editor settings");
  // The chrome bar's left context is the static title span, not the dynamic post title.
  expect(html).toContain("Post editor");
  expect(html).not.toContain("Header workflow");
});

test("PostEditorTopBar reflects saving and dirty states in the sync badge", () => {
  const savingHtml = renderToString(<PostEditorTopBar {...createHeaderProps()} saving dirty />);

  // The sync badge stays in the chrome bar; the saving-`disabled` primary actions moved to
  // PageHeader pageActions (asserted via the cluster render in post-editor-shell-restyle.test.tsx).
  expect(savingHtml).toContain("Saving...");
  expect(savingHtml).not.toContain("Unsaved changes");
});

test("PostEditorTopBar chrome bar carries no status pill or publish label", () => {
  const html = renderToString(<PostEditorTopBar {...createHeaderProps()} status="published" />);

  // The "Update" publish-label flip moved with PostEditorActionCluster to PageHeader pageActions
  // (asserted in post-editor-shell-restyle.test.tsx). The chrome bar renders no status pill.
  expect(html).not.toContain("data-post-editor-header-status");
  expect(html).not.toContain(">Published<");
  expect(html).not.toContain("Update");
});
