import { expect, test } from "bun:test";
import { renderToString } from "react-dom/server";

import { PostEditorTopBar } from "../../../core/admin/ui/posts/editor/PostEditorTopBar";

const createBaseProps = () => ({
  title: "Test post",
  status: "draft",
  dirty: false,
  saving: false,
  lastSavedAt: "2026-02-21T10:15:00.000Z",
  canUndo: true,
  canRedo: true,
  onUndo: () => undefined,
  onRedo: () => undefined,
  onOpenRevisions: () => undefined,
  onSaveDraft: () => undefined,
  onPreview: () => undefined,
  onPublish: () => undefined,
  onToggleFocusMode: () => undefined,
  focusMode: false,
  onToggleInserter: () => undefined,
  inserterVisible: false,
  onToggleOutline: () => undefined,
  outlineVisible: true,
  onOpenDetails: () => undefined,
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
      lastSavedAt={null}
    />
  );
  expect(savingHtml).toContain("Saving...");

  const dirtyHtml = renderToString(
    <PostEditorTopBar
      {...createBaseProps()}
      saving={false}
      dirty
      lastSavedAt={null}
    />
  );
  expect(dirtyHtml).toContain("Unsaved changes");
});
