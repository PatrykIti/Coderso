import React from "react";
import { expect, test } from "vitest";
import { renderToString } from "react-dom/server";

import { renderAdminUi } from "../../utils/adminRouterRender";
import { PostBlockEditorShell } from "../../../core/admin/ui/posts/editor/PostBlockEditorShell";
import { PostEditorActionCluster } from "../../../core/admin/ui/posts/editor/header/PostEditorActionCluster";
import { PostEditorCanvas } from "../../../core/admin/ui/posts/editor/PostEditorCanvas";
import {
  createInitialPostEditorState,
  postEditorReducer,
} from "../../../core/admin/ui/posts/editor/postEditorStore";

// TASK-479-09-L03: presentation guards for the Post editor restyle (TASK-479-09-L02).
// The shell owns its store (no store prop) and renderAdminUi seeds no cached post,
// so usePostEditorState starts loading=true and the content region renders
// a fail-closed boundary instead of PostEditorCanvas or either mutating sidebar.
// The document-card classes therefore live behind the loading gate and are asserted
// via the direct PostEditorCanvas render below — NOT on the shell SSR snapshot. The
// dirty-flag wiring is asserted against the real reducer contract.

const readButtonTag = (html: string, marker: string) =>
  (html.match(/<button\b[^>]*>/g) ?? []).find((tag) => tag.includes(marker));
const hasDisabledAttribute = (tag: string) => /\sdisabled(?:=""|(?=[\s>]))/.test(tag);

test("shell renders a restyled fail-closed loading boundary with inert actions", () => {
  const html = renderAdminUi(<PostBlockEditorShell />, { path: "/admin/posts/post-1" });
  expect(html).toContain("Loading post editor...");
  expect(html).not.toContain("Post settings");
  expect(html).not.toContain("Featured image");
  expect(html).not.toContain("Move to trash");
  expect(html).not.toContain('data-post-editor-region="secondary-sidebar"');
  expect(html).not.toContain('data-post-editor-region="sidebar"');
  expect(html).not.toContain("data-post-editor-left-rail-");

  const closeButton = readButtonTag(html, 'data-post-editor-header-close="true"');
  expect(closeButton).toBeDefined();
  expect(hasDisabledAttribute(closeButton ?? "")).toBe(false);

  for (const label of ["Open runtime preview", "Save draft", "Publish post"]) {
    const actionButton = readButtonTag(html, `aria-label="${label}"`);
    expect(actionButton).toBeDefined();
    expect(hasDisabledAttribute(actionButton ?? "")).toBe(true);
  }

  // TASK-497-02 (E3): Preview/Save draft/Publish + the primary-actions cluster relocated from
  // the chrome-bar TopBar into the in-page PageHeader pageActions — now on the full-shell mount
  // (moved here from post-editor-header-workflow / post-editor-writing-canvas-flow TopBar mounts).
  expect(html).toContain('data-post-editor-header-cluster="primary-actions"');
  expect(html).toContain("Preview");
  expect(html).toContain("Publish");
});

test("the relocated primary-actions cluster flips the publish label + disables while saving", () => {
  // TASK-497-02 (E3): the "Update" publish-label flip and the saving-`disabled` state moved with
  // PostEditorActionCluster from the chrome-bar TopBar into PageHeader pageActions. Render the
  // cluster directly (context-free leaf) to assert the state-driven affordances the full-shell
  // mount cannot seed (published status / saving=true) — moved here from
  // post-editor-header-workflow.test.tsx :51/:59.
  const published = renderToString(
    <PostEditorActionCluster
      status="published"
      saving={false}
      onPreview={() => undefined}
      onSaveDraft={() => undefined}
      onPublish={() => undefined}
    />
  );
  expect(published).toContain("Update");
  expect(published).not.toContain(">Publish<");

  const saving = renderToString(
    <PostEditorActionCluster
      status="draft"
      saving
      onPreview={() => undefined}
      onSaveDraft={() => undefined}
      onPublish={() => undefined}
    />
  );
  expect(saving).toContain("disabled");
});

test("shell renders the in-page PageHeader (description + Preview/Publish) inside the framed card", () => {
  // TASK-497-02 (Extension #2, re-scope to prototype parity): the editor drops the
  // full-viewport app chrome for an in-page PageHeader (prototype PostEditorPreview.tsx:42
  // description + Preview/Publish primary actions) ABOVE a bordered rounded editor CARD
  // (EditorPreviewFrame.tsx:31-36 `rounded-2xl … shadow-card`). Both render outside the
  // content loading gate, so they appear in the shell SSR string.
  const html = renderAdminUi(<PostBlockEditorShell />, { path: "/admin/posts/post-1" });
  // in-page PageHeader description (prototype copy)
  expect(html).toContain("Write, format, and publish your story.");
  // Preview + Publish live in the PageHeader actions cluster (aria-labels)
  expect(html).toContain('aria-label="Open runtime preview"');
  expect(/aria-label="(Publish post|Update published post)"/.test(html)).toBe(true);
  // the editor body is wrapped in the framed rounded card (prototype EditorPreviewFrame)
  expect(html).toContain('data-post-editor-frame="true"');
  expect(html).toContain("rounded-2xl");
  expect(html).toContain("shadow-card");
});

test("the restyled document canvas card carries the prototype card tokens", () => {
  // PostEditorCanvas is a context-free leaf (no useAdminRouter) — render it directly
  // with explicit props via renderToString, the same idiom
  // post-editor-canvas-shared.test.tsx uses to assert canvas class tokens.
  const html = renderToString(
    <PostEditorCanvas
      document={{
        version: 1,
        meta: {},
        blocks: [
          {
            id: "block-1",
            type: "writing-canvas",
            attrs: {},
            content: {
              version: 1,
              nodes: [{ id: "node-1", type: "paragraph", text: "<p>Intro</p>" }],
            },
          },
        ],
      }}
      title="Hello"
      onTitleChange={() => undefined}
      selectedBlockId={null}
      insertFocusToken={0}
      onSelectBlock={() => undefined}
      onUpdateBlockContent={() => undefined}
      onInsertBlock={() => undefined}
    />
  );
  // restyled "document card" wrapper (was max-w-[720px]; now the prototype card)
  expect(html).toContain("rounded-2xl");
  expect(html).toContain("max-w-2xl");
  expect(html).toContain("shadow-card");
});

test("an edit marks the store dirty (real reducer contract, no severed wiring)", () => {
  const initial = createInitialPostEditorState();
  expect(initial.dirty).toBe(false);
  // any content mutation flips dirty; the restyle must keep these dispatches wired
  const next = postEditorReducer(initial, {
    type: "update_meta",
    patch: { title: "Hello" },
  });
  expect(next.dirty).toBe(true);
});
