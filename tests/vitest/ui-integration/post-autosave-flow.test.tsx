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

  expect(html).toContain("Autosaved at");
  expect(html).toContain("Revisions");
});

test("PostEditorTopBar prioritizes saving and unsaved indicators", () => {
  const savingHtml = renderToString(
    <PostEditorTopBar
      {...createBaseProps()}
      saving
      dirty
    />
  );
  expect(savingHtml).toContain("Saving...");

  const dirtyHtml = renderToString(
    <PostEditorTopBar
      {...createBaseProps()}
      saving={false}
      dirty
    />
  );
  expect(dirtyHtml).toContain("Unsaved changes");
});
