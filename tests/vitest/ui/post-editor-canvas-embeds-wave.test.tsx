// @vitest-environment happy-dom

import { test, expect } from "vitest";
import { mount } from "./postEditorCanvasFixtures";

test("PostEditorCanvas previews mixed list content and resolves provider-specific embed URL fallbacks", async () => {
  const { PostEditorCanvas } = await import("../../../core/admin/ui/posts/editor/PostEditorCanvas");

  const view = mount(
    <PostEditorCanvas
      document={{
        version: 1,
        meta: {},
        blocks: [
          {
            id: "list-mixed",
            type: "list",
            attrs: {},
            content: ["Visible item", 42, null],
          },
          {
            id: "embed-youtube-short",
            type: "embed",
            attrs: {
              provider: "youtube",
              url: "https://youtu.be/short-id",
            },
            content: null,
          },
          {
            id: "embed-youtube-path",
            type: "embed",
            attrs: {
              provider: "youtube",
              url: "https://www.youtube.com/shorts/path-id",
            },
            content: null,
          },
          {
            id: "embed-vimeo",
            type: "embed",
            attrs: {
              provider: "vimeo",
              url: "https://vimeo.com/channels/staffpicks/123456789",
            },
            content: null,
          },
          {
            id: "embed-loom-invalid",
            type: "embed",
            attrs: {
              provider: "loom",
              url: "https://www.loom.com/not-a-share-id",
            },
            content: null,
          },
          {
            id: "embed-custom-invalid",
            type: "embed",
            attrs: {
              provider: "custom",
              url: "notaurl",
            },
            content: null,
          },
        ],
      }}
      title="Canvas"
      onTitleChange={() => undefined}
      selectedBlockId={null}
      insertFocusToken={0}
      onSelectBlock={() => undefined}
      onUpdateBlockContent={() => undefined}
      onInsertBlock={() => undefined}
      onOpenBlockDetails={() => undefined}
    />
  );

  try {
    expect(view.container.textContent).toContain("Visible item");
    expect(view.container.textContent).not.toContain(">42<");
    expect(view.container.innerHTML).toContain("https://www.youtube.com/embed/short-id");
    expect(view.container.innerHTML).toContain("https://www.youtube.com/embed/path-id");
    expect(view.container.innerHTML).toContain("https://player.vimeo.com/video/123456789");
    expect(view.container.textContent).toContain("Click to configure embed URL");
  } finally {
    view.cleanup();
  }
});
