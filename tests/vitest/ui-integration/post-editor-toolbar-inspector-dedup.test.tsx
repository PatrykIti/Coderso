import React from "react";
import { expect, test } from "vitest";
import { renderToString } from "react-dom/server";

import { PostEditorCanvas } from "../../../core/admin/ui/posts/editor/PostEditorCanvas";
import { BlockInspector } from "../../../core/admin/ui/posts/editor/inspector/BlockInspector";
import { PostRichTextToolbar } from "../../../core/admin/ui/posts/editor/richtext/PostRichTextToolbar";
import { renderAdminUi } from "../../utils/adminRouterRender";

test("text block controls are owned by toolbar, not duplicated in block inspector", () => {
  const toolbarHtml = renderAdminUi(
    <PostRichTextToolbar profile="paragraph" onCommand={() => undefined} />
  );
  const inspectorHtml = renderToString(
    <BlockInspector
      block={{
        id: "paragraph-1",
        type: "paragraph",
        attrs: {
          align: "left",
          textScale: "md",
          width: "auto",
          spacingTop: "md",
          spacingBottom: "md",
        },
        content: "<p>Example</p>",
      }}
      onChangeAttrs={() => undefined}
    />
  );

  expect(toolbarHtml).toContain("Type");
  expect(toolbarHtml).toContain('aria-label="Align left"');
  expect(inspectorHtml).not.toContain("Alignment");
  expect(inspectorHtml).not.toContain("Text size");
  expect(inspectorHtml).toContain("Width");
});

test("list block keeps dedicated settings without richtext toolbar profile", () => {
  const inspectorHtml = renderToString(
    <BlockInspector
      block={{
        id: "list-1",
        type: "list",
        attrs: {
          ordered: false,
          compact: true,
          width: "auto",
          spacingTop: "md",
          spacingBottom: "md",
        },
        content: ["One", "Two"],
      }}
      onChangeAttrs={() => undefined}
    />
  );
  const canvasHtml = renderToString(
    <PostEditorCanvas
      document={{
        version: 1,
        meta: {},
        blocks: [
          {
            id: "list-1",
            type: "list",
            attrs: { ordered: false, compact: true },
            content: ["One", "Two"],
          },
        ],
      }}
      title="List settings"
      onTitleChange={() => undefined}
      selectedBlockId="list-1"
      insertFocusToken={0}
      onSelectBlock={() => undefined}
      onUpdateBlockContent={() => undefined}
      onUpdateBlockAttrs={() => undefined}
      onInsertBlock={() => undefined}
    />
  );

  expect(inspectorHtml).toContain("Ordered list");
  expect(inspectorHtml).toContain("Compact spacing");
  expect(canvasHtml).not.toContain("More formatting");
  expect(canvasHtml).toContain("Compact spacing");
});
