// @vitest-environment happy-dom

import React from "react";
import { expect, test, vi } from "vitest";

import {
  clickByText,
  flush,
  mount,
  setInputValue,
  setSelectValue,
} from "./postEditorCanvasFixtures";

const renderCanvas = (
  Component: typeof import("../../../core/admin/ui/posts/editor/PostEditorCanvas").PostEditorCanvas,
  block: Record<string, unknown>,
  onUpdateBlockAttrs: ((id: string, patch: Record<string, unknown>) => void) | undefined
) =>
  mount(
    <Component
      document={{ version: 1, meta: {}, blocks: [block as never] }}
      title="Canvas"
      onTitleChange={() => undefined}
      selectedBlockId={String(block.id)}
      insertFocusToken={0}
      onSelectBlock={() => undefined}
      onUpdateBlockContent={() => undefined}
      onUpdateBlockAttrs={onUpdateBlockAttrs}
      onInsertBlock={() => undefined}
    />
  );

test("PostEditorCanvas media panels patch image wrap, widths, captions, columns, and labels", async () => {
  const { PostEditorCanvas } = await import("../../../core/admin/ui/posts/editor/PostEditorCanvas");

  const imageView = renderCanvas(
    PostEditorCanvas,
    { id: "img-1", type: "image", attrs: {}, content: null },
    vi.fn<(id: string, patch: Record<string, unknown>) => void>()
  );
  try {
    const selects = Array.from(imageView.container.querySelectorAll("select"));
    setSelectValue(selects[0], "left");
    expect(imageView.container.textContent).toContain("Wrap left");

    setSelectValue(selects[1], "66");
    expect(imageView.container.textContent).toContain("66%");
  } finally {
    imageView.cleanup();
  }

  const onUpdateBlockAttrs = vi.fn<(id: string, patch: Record<string, unknown>) => void>();

  const videoView = renderCanvas(
    PostEditorCanvas,
    { id: "vid-1", type: "video", attrs: {}, content: null },
    onUpdateBlockAttrs
  );
  try {
    setInputValue(
      videoView.container.querySelector('input[placeholder="Video caption"]') ?? undefined,
      "Clip caption"
    );
    expect(onUpdateBlockAttrs).toHaveBeenCalledWith("vid-1", { caption: "Clip caption" });
    clickByText(videoView.container, "Replace video");
    await flush();
    expect(videoView.container.textContent).toContain("Select Video");
  } finally {
    videoView.cleanup();
  }

  const galleryView = renderCanvas(
    PostEditorCanvas,
    { id: "gal-1", type: "gallery", attrs: {}, content: null },
    onUpdateBlockAttrs
  );
  try {
    setSelectValue(
      galleryView.container.querySelector('select option[value="2"]')?.closest("select") ??
        undefined,
      "2"
    );
    expect(onUpdateBlockAttrs).toHaveBeenCalledWith("gal-1", { columns: 2 });
    clickByText(galleryView.container, "Select gallery images");
    await flush();
    expect(galleryView.container.textContent).toContain("Select Gallery Images");
  } finally {
    galleryView.cleanup();
  }

  const audioView = renderCanvas(
    PostEditorCanvas,
    { id: "aud-1", type: "audio", attrs: {}, content: null },
    onUpdateBlockAttrs
  );
  try {
    setInputValue(
      audioView.container.querySelector('input[placeholder="Audio caption"]') ?? undefined,
      "Sound caption"
    );
    expect(onUpdateBlockAttrs).toHaveBeenCalledWith("aud-1", { caption: "Sound caption" });
    clickByText(audioView.container, "Replace audio");
    await flush();
    expect(audioView.container.textContent).toContain("Select Audio");
  } finally {
    audioView.cleanup();
  }

  const fileView = renderCanvas(
    PostEditorCanvas,
    { id: "file-1", type: "file", attrs: {}, content: null },
    onUpdateBlockAttrs
  );
  try {
    setInputValue(
      fileView.container.querySelector('input[placeholder="Download label"]') ?? undefined,
      "Read the report"
    );
    expect(onUpdateBlockAttrs).toHaveBeenCalledWith("file-1", { label: "Read the report" });
    clickByText(fileView.container, "Replace file");
    await flush();
    expect(fileView.container.textContent).toContain("Select File");
  } finally {
    fileView.cleanup();
  }
});

test("PostEditorCanvas renders file links, valid loom embeds, and unresolved vimeo providers", async () => {
  const { PostEditorCanvas } = await import("../../../core/admin/ui/posts/editor/PostEditorCanvas");

  const view = mount(
    <PostEditorCanvas
      document={{
        version: 1,
        meta: {},
        blocks: [
          {
            id: "file-url",
            type: "file",
            attrs: {
              url: "https://cdn.test/report.pdf",
              label: "Download report",
              showSize: false,
            },
            content: null,
          },
          {
            id: "embed-loom",
            type: "embed",
            attrs: {
              provider: "loom",
              url: "https://www.loom.com/share/loom-secret-id",
            },
            content: null,
          },
          {
            id: "embed-vimeo-invalid",
            type: "embed",
            attrs: {
              provider: "vimeo",
              url: "https://example.com/not-vimeo",
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
      onUpdateBlockAttrs={() => undefined}
      onInsertBlock={() => undefined}
    />
  );

  try {
    const link = view.container.querySelector('a[href="https://cdn.test/report.pdf"]');
    expect(link?.textContent).toContain("Download report");
    link?.dispatchEvent(new MouseEvent("click", { bubbles: true, cancelable: true }));
    expect(view.container.textContent).toContain("Download report");

    expect(view.container.innerHTML).toContain("loom.com/embed/loom-secret-id");
    expect(view.container.textContent).toContain("Click to configure embed URL");
  } finally {
    view.cleanup();
  }
});

test("PostEditorCanvas toggles gallery membership and closes the picker from the Done button", async () => {
  const { PostEditorCanvas } = await import("../../../core/admin/ui/posts/editor/PostEditorCanvas");

  const onUpdateBlockAttrs = vi.fn<(id: string, patch: Record<string, unknown>) => void>();

  const galleryView = renderCanvas(
    PostEditorCanvas,
    { id: "gal-2", type: "gallery", attrs: { mediaIds: ["media-1"] }, content: null },
    onUpdateBlockAttrs
  );
  try {
    clickByText(galleryView.container, "Select gallery images");
    await flush();
    expect(galleryView.container.textContent).toContain("Select Gallery Images");
    expect(galleryView.container.textContent).toContain("media-grid:1");

    clickByText(galleryView.container, "select-media:media-1.png");
    expect(onUpdateBlockAttrs).toHaveBeenCalledWith("gal-2", { mediaIds: [] });

    clickByText(galleryView.container, "Select gallery images");
    await flush();
    clickByText(galleryView.container, "Done");
    expect(galleryView.container.textContent).not.toContain("media-grid:1");
  } finally {
    galleryView.cleanup();
  }
});
