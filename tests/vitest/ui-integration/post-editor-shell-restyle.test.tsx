import React from "react";
import { expect, test } from "vitest";
import { renderToString } from "react-dom/server";

import { renderAdminUi } from "../../utils/adminRouterRender";
import { PostBlockEditorShell } from "../../../core/admin/ui/posts/editor/PostBlockEditorShell";
import { PostEditorCanvas } from "../../../core/admin/ui/posts/editor/PostEditorCanvas";
import {
  createInitialPostEditorState,
  postEditorReducer,
} from "../../../core/admin/ui/posts/editor/postEditorStore";

// TASK-479-09-L03: presentation guards for the Post editor restyle (TASK-479-09-L02).
// The shell owns its store (no store prop) and renderAdminUi seeds no cached post,
// so usePostEditorState starts loading=true and the content region renders
// "Loading post editor..." instead of PostEditorCanvas. The document-card classes
// therefore live behind the loading gate and are asserted via the direct
// PostEditorCanvas render below — NOT on the shell SSR snapshot. The dirty-flag
// wiring is asserted against the real reducer contract.

test("shell renders the restyled inspector sections + Publish action", () => {
  const html = renderAdminUi(<PostBlockEditorShell />, { path: "/admin/posts/post-1" });
  // TASK-497-02 (B7): the real DocumentInspector renders in the (ungated) details sidebar,
  // now flattened to the single "Post settings" header (replacing the old "Publishing"
  // InspectorSection card).
  expect(html).toContain("Post settings");
  expect(html).toContain("Featured image");
  // header workflow action still present
  expect(html).toContain("Publish");
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
