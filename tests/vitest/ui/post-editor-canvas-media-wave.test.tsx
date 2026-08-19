// @vitest-environment happy-dom

import React from "react";
import { test, expect, vi } from "vitest";
import {
  mediaState,
  createProjectedKindMediaRecords,
  mount,
  clickByText,
  setInputValue,
  flush,
} from "./postEditorCanvasFixtures";

test("PostEditorCanvas opens image picker, loads media, applies selected asset, and resolves existing media ids", async () => {
  const { PostEditorCanvas } = await import("../../../core/admin/ui/posts/editor/PostEditorCanvas");

  const onSelectBlock = vi.fn();
  const onUpdateBlockAttrs = vi.fn();

  const pickerView = mount(
    <PostEditorCanvas
      document={{
        version: 1,
        meta: {},
        blocks: [{ id: "image-1", type: "image", attrs: {}, content: null }],
      }}
      title="Canvas"
      onTitleChange={() => undefined}
      selectedBlockId="image-1"
      insertFocusToken={0}
      onSelectBlock={onSelectBlock}
      onUpdateBlockContent={() => undefined}
      onUpdateBlockAttrs={onUpdateBlockAttrs}
      onInsertBlock={() => undefined}
    />
  );

  try {
    clickByText(pickerView.container, "Click to choose image from media library");
    await flush();

    expect(mediaState.calls).toContain(true);
    expect(pickerView.container.textContent).toContain("Select Image");
    expect(pickerView.container.textContent).toContain("media-grid:1");

    const searchInput = pickerView.container.querySelector(
      'input[placeholder="Search by file name, title, or original name"]'
    );
    setInputValue(searchInput ?? undefined, "hero");

    clickByText(pickerView.container, "select-media:media-1.png");

    expect(onSelectBlock).toHaveBeenCalledWith("image-1");
    expect(onUpdateBlockAttrs).toHaveBeenCalledWith("image-1", {
      mediaId: "media-1",
      alt: "Hero alt",
      caption: "Hero caption",
    });
  } finally {
    pickerView.cleanup();
  }

  mediaState.reset();
  const lookupView = mount(
    <PostEditorCanvas
      document={{
        version: 1,
        meta: {},
        blocks: [
          {
            id: "image-2",
            type: "image",
            attrs: { mediaId: "media-1" },
            content: null,
          },
        ],
      }}
      title="Lookup"
      onTitleChange={() => undefined}
      selectedBlockId={null}
      insertFocusToken={0}
      onSelectBlock={() => undefined}
      onUpdateBlockContent={() => undefined}
      onInsertBlock={() => undefined}
    />
  );

  try {
    await flush();

    expect(mediaState.calls).toContain(false);
    expect(lookupView.container.innerHTML).toContain("/media/media-1.png");
    expect(lookupView.container.innerHTML).toContain('alt="Hero alt"');
  } finally {
    lookupView.cleanup();
  }
});

test("PostEditorCanvas scopes media picker and patches video, gallery, audio, and file blocks", async () => {
  const { PostEditorCanvas } = await import("../../../core/admin/ui/posts/editor/PostEditorCanvas");

  mediaState.records = [
    {
      id: "video-1",
      key: "uploads/video.mp4",
      url: "/media/video.mp4",
      originalName: "video.mp4",
      type: "file" as const,
      mimeType: "video/mp4",
      size: 2048,
      createdAt: "2026-03-12T10:00:00.000Z",
    },
    {
      id: "image-2",
      key: "uploads/gallery.png",
      url: "/media/gallery.png",
      originalName: "gallery.png",
      type: "image" as const,
      mimeType: "image/png",
      size: 1024,
      createdAt: "2026-03-12T10:00:00.000Z",
    },
    {
      id: "audio-1",
      key: "uploads/audio.mp3",
      url: "/media/audio.mp3",
      originalName: "audio.mp3",
      type: "file" as const,
      mimeType: "audio/mpeg",
      size: 1024,
      createdAt: "2026-03-12T10:00:00.000Z",
    },
    {
      id: "file-1",
      key: "uploads/report.pdf",
      url: "/media/report.pdf",
      originalName: "report.pdf",
      type: "file" as const,
      mimeType: "application/pdf",
      size: 4096,
      createdAt: "2026-03-12T10:00:00.000Z",
    },
  ];
  const onUpdateBlockAttrs = vi.fn();

  const renderWithBlock = (block: Record<string, unknown>) =>
    mount(
      <PostEditorCanvas
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

  const videoView = renderWithBlock({
    id: "video-block",
    type: "video",
    attrs: {},
    content: null,
  });

  try {
    clickByText(videoView.container, "Click to choose video from media library");
    await flush();
    expect(videoView.container.textContent).toContain("Select Video");
    expect(videoView.container.textContent).toContain("media-grid:1");
    clickByText(videoView.container, "select-media:video.mp4");
    expect(onUpdateBlockAttrs).toHaveBeenCalledWith("video-block", {
      mediaId: "video-1",
    });
  } finally {
    videoView.cleanup();
  }

  const galleryView = renderWithBlock({
    id: "gallery-block",
    type: "gallery",
    attrs: { mediaIds: ["media-1"] },
    content: null,
  });

  try {
    clickByText(galleryView.container, "Click to choose gallery images");
    await flush();
    expect(galleryView.container.textContent).toContain("Select Gallery Images");
    expect(galleryView.container.textContent).toContain("media-grid:1");
    clickByText(galleryView.container, "select-media:gallery.png");
    expect(onUpdateBlockAttrs).toHaveBeenCalledWith("gallery-block", {
      mediaIds: ["media-1", "image-2"],
    });
  } finally {
    galleryView.cleanup();
  }

  const audioView = renderWithBlock({
    id: "audio-block",
    type: "audio",
    attrs: {},
    content: null,
  });

  try {
    clickByText(audioView.container, "Click to choose audio from media library");
    await flush();
    clickByText(audioView.container, "select-media:audio.mp3");
    expect(onUpdateBlockAttrs).toHaveBeenCalledWith("audio-block", {
      mediaId: "audio-1",
    });
  } finally {
    audioView.cleanup();
  }

  const fileView = renderWithBlock({
    id: "file-block",
    type: "file",
    attrs: {},
    content: null,
  });

  try {
    clickByText(fileView.container, "Click to choose file from media library");
    await flush();
    clickByText(fileView.container, "select-media:report.pdf");
    expect(onUpdateBlockAttrs).toHaveBeenCalledWith("file-block", {
      mediaId: "file-1",
    });
  } finally {
    fileView.cleanup();
  }
});

test("PostEditorCanvas admits picker assets by projected media kind instead of MIME prefix", async () => {
  const { PostEditorCanvas } = await import("../../../core/admin/ui/posts/editor/PostEditorCanvas");

  mediaState.records = createProjectedKindMediaRecords();

  const renderPicker = (type: "image" | "video" | "gallery" | "audio" | "file") =>
    mount(
      <PostEditorCanvas
        document={{
          version: 1,
          meta: {},
          blocks: [{ id: `${type}-block`, type, attrs: {}, content: null }],
        }}
        title="Canvas"
        onTitleChange={() => undefined}
        selectedBlockId={`${type}-block`}
        insertFocusToken={0}
        onSelectBlock={() => undefined}
        onUpdateBlockContent={() => undefined}
        onUpdateBlockAttrs={() => undefined}
        onInsertBlock={() => undefined}
      />
    );

  const cases = [
    {
      type: "image" as const,
      trigger: "Click to choose image from media library",
      count: 1,
      included: ["passive.png"],
      excluded: ["active.svg", "unsupported.avif", "mismatched.png"],
    },
    {
      type: "gallery" as const,
      trigger: "Click to choose gallery images",
      count: 1,
      included: ["passive.png"],
      excluded: ["active.svg", "unsupported.avif", "mismatched.png"],
    },
    {
      type: "video" as const,
      trigger: "Click to choose video from media library",
      count: 1,
      included: ["clip.mp4"],
      excluded: ["report.pdf", "passive.png"],
    },
    {
      type: "audio" as const,
      trigger: "Click to choose audio from media library",
      count: 1,
      included: ["sound.mp3"],
      excluded: ["report.pdf", "passive.png"],
    },
    {
      type: "file" as const,
      trigger: "Click to choose file from media library",
      count: 4,
      included: ["active.svg", "unsupported.avif", "mismatched.png", "report.pdf"],
      excluded: ["passive.png", "clip.mp4", "sound.mp3"],
    },
  ];

  for (const pickerCase of cases) {
    const view = renderPicker(pickerCase.type);
    try {
      clickByText(view.container, pickerCase.trigger);
      await flush();

      expect(view.container.textContent).toContain(`media-grid:${pickerCase.count}`);
      for (const filename of pickerCase.included) {
        expect(view.container.textContent).toContain(`select-media:${filename}`);
      }
      for (const filename of pickerCase.excluded) {
        expect(view.container.textContent).not.toContain(`select-media:${filename}`);
      }
    } finally {
      view.cleanup();
    }
  }
});

test("PostEditorCanvas rechecks projected kind for persisted media while preserving URL overrides", async () => {
  const { PostEditorCanvas } = await import("../../../core/admin/ui/posts/editor/PostEditorCanvas");

  mediaState.records = createProjectedKindMediaRecords();

  const view = mount(
    <PostEditorCanvas
      document={{
        version: 1,
        meta: {},
        blocks: [
          { id: "image-passive", type: "image", attrs: { mediaId: "passive-png" }, content: null },
          { id: "image-svg", type: "image", attrs: { mediaId: "active-svg" }, content: null },
          {
            id: "image-avif",
            type: "image",
            attrs: { mediaId: "unsupported-avif" },
            content: null,
          },
          {
            id: "image-mismatch",
            type: "image",
            attrs: { mediaId: "mismatched-png" },
            content: null,
          },
          {
            id: "gallery-unsafe-only",
            type: "gallery",
            attrs: { mediaIds: ["active-svg", "unsupported-avif", "mismatched-png"] },
            content: null,
          },
          {
            id: "gallery-mixed",
            type: "gallery",
            attrs: {
              mediaIds: ["active-svg", "passive-png", "unsupported-avif", "mismatched-png"],
            },
            content: null,
          },
          { id: "video-valid", type: "video", attrs: { mediaId: "video" }, content: null },
          {
            id: "video-mismatch",
            type: "video",
            attrs: { mediaId: "document" },
            content: null,
          },
          { id: "audio-valid", type: "audio", attrs: { mediaId: "audio" }, content: null },
          {
            id: "audio-mismatch",
            type: "audio",
            attrs: { mediaId: "video" },
            content: null,
          },
          { id: "file-valid", type: "file", attrs: { mediaId: "document" }, content: null },
          {
            id: "file-mismatch",
            type: "file",
            attrs: { mediaId: "passive-png" },
            content: null,
          },
          {
            id: "video-legacy-url",
            type: "video",
            attrs: { mediaId: "document", url: "/legacy/clip.mp4" },
            content: null,
          },
          {
            id: "audio-legacy-url",
            type: "audio",
            attrs: { mediaId: "video", url: "/legacy/sound.mp3" },
            content: null,
          },
          {
            id: "file-legacy-url",
            type: "file",
            attrs: { mediaId: "passive-png", url: "/legacy/report.pdf" },
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
    />
  );

  const block = (id: string) =>
    view.container.querySelector(`[data-post-editor-block-id="${id}"]`) as HTMLElement | null;

  try {
    await flush();

    expect(block("image-passive")?.querySelector("img")?.getAttribute("src")).toBe(
      "/media/uploads/passive.png"
    );
    for (const id of ["image-svg", "image-avif", "image-mismatch"]) {
      expect(block(id)?.querySelector("img")).toBeNull();
      expect(
        block(id)?.querySelector('[data-post-editor-media-placeholder="image"]')
      ).not.toBeNull();
    }

    expect(block("gallery-unsafe-only")?.querySelectorAll("img")).toHaveLength(0);
    expect(
      block("gallery-unsafe-only")?.querySelector('[data-post-editor-media-placeholder="gallery"]')
    ).not.toBeNull();
    expect(block("gallery-mixed")?.querySelectorAll("img")).toHaveLength(1);
    expect(block("gallery-mixed")?.querySelector("img")?.getAttribute("src")).toBe(
      "/media/uploads/passive.png"
    );

    expect(block("video-valid")?.querySelector("video")?.getAttribute("src")).toBe(
      "/media/uploads/clip.mp4"
    );
    expect(block("video-mismatch")?.querySelector("video")).toBeNull();
    expect(
      block("video-mismatch")?.querySelector('[data-post-editor-media-placeholder="video"]')
    ).not.toBeNull();

    expect(block("audio-valid")?.querySelector("audio")?.getAttribute("src")).toBe(
      "/media/uploads/sound.mp3"
    );
    expect(block("audio-mismatch")?.querySelector("audio")).toBeNull();
    expect(
      block("audio-mismatch")?.querySelector('[data-post-editor-media-placeholder="audio"]')
    ).not.toBeNull();

    expect(block("file-valid")?.querySelector("a")?.getAttribute("href")).toBe(
      "/media/uploads/report.pdf"
    );
    expect(block("file-mismatch")?.querySelector("a")).toBeNull();
    expect(
      block("file-mismatch")?.querySelector('[data-post-editor-media-placeholder="file"]')
    ).not.toBeNull();

    expect(block("video-legacy-url")?.querySelector("video")?.getAttribute("src")).toBe(
      "/legacy/clip.mp4"
    );
    expect(block("audio-legacy-url")?.querySelector("audio")?.getAttribute("src")).toBe(
      "/legacy/sound.mp3"
    );
    expect(block("file-legacy-url")?.querySelector("a")?.getAttribute("href")).toBe(
      "/legacy/report.pdf"
    );
  } finally {
    view.cleanup();
  }
});

test("PostEditorCanvas resets image picker state on close and surfaces media load errors", async () => {
  const { PostEditorCanvas } = await import("../../../core/admin/ui/posts/editor/PostEditorCanvas");

  const view = mount(
    <PostEditorCanvas
      document={{
        version: 1,
        meta: {},
        blocks: [{ id: "image-3", type: "image", attrs: {}, content: null }],
      }}
      title="Canvas"
      onTitleChange={() => undefined}
      selectedBlockId="image-3"
      insertFocusToken={0}
      onSelectBlock={() => undefined}
      onUpdateBlockContent={() => undefined}
      onInsertBlock={() => undefined}
    />
  );

  try {
    clickByText(view.container, "Click to choose image from media library");
    await flush();

    const searchInput = view.container.querySelector(
      'input[placeholder="Search by file name, title, or original name"]'
    );
    setInputValue(searchInput ?? undefined, "banner");

    clickByText(view.container, "dialog-close");
    await flush();

    expect(view.container.textContent).not.toContain("Select Image");

    clickByText(view.container, "Click to choose image from media library");
    await flush();

    const reopenedSearchInput = view.container.querySelector(
      'input[placeholder="Search by file name, title, or original name"]'
    ) as HTMLInputElement | null;
    expect(reopenedSearchInput?.value).toBe("");
  } finally {
    view.cleanup();
  }

  mediaState.reset();
  mediaState.error = {
    name: "ApiClientError",
    message: "Media unavailable.",
  };

  const errorView = mount(
    <PostEditorCanvas
      document={{
        version: 1,
        meta: {},
        blocks: [{ id: "image-4", type: "image", attrs: {}, content: null }],
      }}
      title="Canvas"
      onTitleChange={() => undefined}
      selectedBlockId="image-4"
      insertFocusToken={0}
      onSelectBlock={() => undefined}
      onUpdateBlockContent={() => undefined}
      onInsertBlock={() => undefined}
    />
  );

  try {
    clickByText(errorView.container, "Click to choose image from media library");
    await flush();

    expect(errorView.container.textContent).toContain("Media unavailable.");
  } finally {
    errorView.cleanup();
  }
});

test("PostEditorCanvas skips direct-url lookup, tolerates unresolved lookup failures, and uses bare media patches", async () => {
  const { PostEditorCanvas } = await import("../../../core/admin/ui/posts/editor/PostEditorCanvas");

  mediaState.reset();
  const directUrlView = mount(
    <PostEditorCanvas
      document={{
        version: 1,
        meta: {},
        blocks: [
          {
            id: "image-url",
            type: "image",
            attrs: { mediaId: "/media/direct.png" },
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
    />
  );

  try {
    await flush();
    expect(mediaState.calls).not.toContain(false);
    expect(directUrlView.container.innerHTML).toContain("/media/direct.png");
  } finally {
    directUrlView.cleanup();
  }

  mediaState.reset();
  mediaState.error = new Error("lookup exploded");
  const unresolvedLookupView = mount(
    <PostEditorCanvas
      document={{
        version: 1,
        meta: {},
        blocks: [
          {
            id: "image-missing",
            type: "image",
            attrs: { mediaId: "missing-media" },
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
    />
  );

  try {
    await flush();
    expect(mediaState.calls).toContain(false);
    expect(unresolvedLookupView.container.textContent).toContain(
      "Click to choose image from media library"
    );
  } finally {
    unresolvedLookupView.cleanup();
  }

  mediaState.reset();
  mediaState.records = [
    {
      id: "media-2",
      key: "uploads/plain.png",
      url: "/media/plain.png",
      originalName: "plain.png",
      type: "image",
      mimeType: "image/png",
      size: 120,
      width: 800,
      height: 600,
      alt: "",
      title: "Plain",
      caption: "",
      createdAt: "2026-03-12T10:00:00.000Z",
    },
  ];

  const onUpdateBlockAttrs = vi.fn();
  const barePatchView = mount(
    <PostEditorCanvas
      document={{
        version: 1,
        meta: {},
        blocks: [{ id: "image-bare", type: "image", attrs: {}, content: null }],
      }}
      title="Canvas"
      onTitleChange={() => undefined}
      selectedBlockId="image-bare"
      insertFocusToken={0}
      onSelectBlock={() => undefined}
      onUpdateBlockContent={() => undefined}
      onUpdateBlockAttrs={onUpdateBlockAttrs}
      onInsertBlock={() => undefined}
    />
  );

  try {
    clickByText(barePatchView.container, "Click to choose image from media library");
    await flush();
    clickByText(barePatchView.container, "select-media:plain.png");

    expect(onUpdateBlockAttrs).toHaveBeenCalledWith("image-bare", {
      mediaId: "media-2",
    });
  } finally {
    barePatchView.cleanup();
  }
});

test("PostEditorCanvas schedules focus restoration, cancels pending frames, and surfaces generic picker load errors", async () => {
  const { PostEditorCanvas } = await import("../../../core/admin/ui/posts/editor/PostEditorCanvas");

  const scrollSpy = vi
    .spyOn(HTMLElement.prototype, "scrollIntoView")
    .mockImplementation(() => undefined);
  const focusSpy = vi
    .spyOn(HTMLTextAreaElement.prototype, "focus")
    .mockImplementation(() => undefined);

  let rafCallback: FrameRequestCallback | null = null;
  const requestAnimationFrameSpy = vi
    .spyOn(window, "requestAnimationFrame")
    .mockImplementation((callback: FrameRequestCallback) => {
      rafCallback = callback;
      return 17;
    });
  const cancelAnimationFrameSpy = vi
    .spyOn(window, "cancelAnimationFrame")
    .mockImplementation(() => undefined);

  const view = mount(
    <PostEditorCanvas
      document={{
        version: 1,
        meta: {},
        blocks: [{ id: "code-focus", type: "code", attrs: {}, content: "const answer = 42;" }],
      }}
      title="Canvas"
      onTitleChange={() => undefined}
      selectedBlockId="code-focus"
      insertFocusToken={1}
      onSelectBlock={() => undefined}
      onUpdateBlockContent={() => undefined}
      onInsertBlock={() => undefined}
    />
  );

  try {
    expect(scrollSpy).toHaveBeenCalled();
    expect(requestAnimationFrameSpy).toHaveBeenCalledTimes(1);
    expect(focusSpy).not.toHaveBeenCalled();

    React.act(() => {
      rafCallback?.(0);
    });

    expect(focusSpy).toHaveBeenCalled();
  } finally {
    view.cleanup();
  }

  expect(cancelAnimationFrameSpy).toHaveBeenCalledWith(17);

  mediaState.reset();
  mediaState.error = new Error("generic picker failure");
  const genericErrorView = mount(
    <PostEditorCanvas
      document={{
        version: 1,
        meta: {},
        blocks: [{ id: "image-generic", type: "image", attrs: {}, content: null }],
      }}
      title="Canvas"
      onTitleChange={() => undefined}
      selectedBlockId="image-generic"
      insertFocusToken={0}
      onSelectBlock={() => undefined}
      onUpdateBlockContent={() => undefined}
      onInsertBlock={() => undefined}
    />
  );

  try {
    clickByText(genericErrorView.container, "Click to choose image from media library");
    await flush();

    expect(genericErrorView.container.textContent).toContain("Failed to load media assets.");
  } finally {
    genericErrorView.cleanup();
  }
});
