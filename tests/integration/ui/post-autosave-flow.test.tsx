import { expect, test } from "bun:test";
import { renderToString } from "react-dom/server";

import { PostEditorTopBar } from "../../../core/admin/ui/posts/editor/PostEditorTopBar";

const createBaseProps = () => ({
  title: "Test post",
  status: "draft",
  dirty: false,
  saving: false,
  onOpenRevisions: () => undefined,
  onPreview: () => undefined,
  onPublish: () => undefined,
  onToggleFocusMode: () => undefined,
  focusMode: false,
  onToggleOutline: () => undefined,
  outlineVisible: true,
  onOpenDetails: () => undefined,
  onOpenSettings: () => undefined,
});

test("PostEditorTopBar renders autosave and revisions status", () => {
  const html = renderToString(<PostEditorTopBar {...createBaseProps()} />);

  expect(html).toContain("Saved");
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
