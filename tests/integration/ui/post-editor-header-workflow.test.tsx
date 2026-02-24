import { expect, test } from "bun:test";
import { renderToString } from "react-dom/server";

import { PostEditorTopBar } from "../../../core/admin/ui/posts/editor/PostEditorTopBar";

const createHeaderProps = () => ({
  title: "Header workflow",
  status: "draft",
  dirty: false,
  saving: false,
  lastSavedAt: "2026-02-23T10:00:00.000Z",
  canUndo: true,
  canRedo: true,
  onUndo: () => undefined,
  onRedo: () => undefined,
  onOpenRevisions: () => undefined,
  onSaveDraft: () => undefined,
  onPreview: () => undefined,
  onPublish: () => undefined,
  onToggleInserter: () => undefined,
  inserterVisible: false,
  onToggleOutline: () => undefined,
  outlineVisible: true,
  onOpenDetails: () => undefined,
});

test("PostEditorTopBar renders document tools, context, and action clusters", () => {
  const html = renderToString(<PostEditorTopBar {...createHeaderProps()} />);

  expect(html).toContain("data-post-editor-header-cluster=\"tools\"");
  expect(html).toContain("data-post-editor-header-cluster=\"actions\"");
  expect(html).toContain("Add");
  expect(html).toContain("Document overview");
  expect(html).toContain("Revisions");
  expect(html).toContain("Details");
  expect(html).toContain("Runtime preview");
});

test("PostEditorTopBar reflects saving and dirty states", () => {
  const savingHtml = renderToString(
    <PostEditorTopBar
      {...createHeaderProps()}
      saving
      dirty
      lastSavedAt={null}
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

  expect(html).toContain("Published");
  expect(html).toContain("Update");
});
