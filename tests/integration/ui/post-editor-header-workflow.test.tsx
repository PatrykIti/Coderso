import { expect, test } from "bun:test";
import { renderToString } from "react-dom/server";

import { PostEditorTopBar } from "../../../core/admin/ui/posts/editor/PostEditorTopBar";

const createHeaderProps = () => ({
  title: "Header workflow",
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

test("PostEditorTopBar renders document tools, context, and action clusters", () => {
  const html = renderToString(<PostEditorTopBar {...createHeaderProps()} />);

  expect(html).toContain("data-post-editor-header-cluster=\"actions\"");
  expect(html).toContain("Outline");
  expect(html).toContain("Revisions");
  expect(html).toContain("Preview");
  expect(html).toContain("Editor settings");
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

  expect(html).toContain("Published");
  expect(html).toContain("Update");
});
