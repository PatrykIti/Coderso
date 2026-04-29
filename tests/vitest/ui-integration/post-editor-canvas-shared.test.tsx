import React from "react";
import { expect, test } from "vitest";
import { renderToString } from "react-dom/server";

import { PostEditorCanvas } from "../../../core/admin/ui/posts/editor/PostEditorCanvas";

test("PostEditorCanvas renders unified document canvas", () => {
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
          { id: "block-2", type: "heading", attrs: { level: 2 }, content: "<h2>Title</h2>" },
        ],
      }}
      title="Unified flow"
      onTitleChange={() => undefined}
      selectedBlockId="block-1"
      insertFocusToken={0}
      onSelectBlock={() => undefined}
      onUpdateBlockContent={() => undefined}
      onInsertBlock={() => undefined}
      onDeleteBlock={() => undefined}
    />
  );

  expect(html).toContain("data-post-editor-flow=\"unified\"");
  expect(html).toContain("data-post-editor-canvas-shell=\"true\"");
  expect(html).toContain("data-post-editor-title-input=\"true\"");
  expect(html).toContain("max-w-[720px]");
  expect(html).toContain("text-5xl");
  expect(html).toContain("Heading");
});

test("PostEditorCanvas shows empty state and writing-canvas appender", () => {
  const html = renderToString(
    <PostEditorCanvas
      document={{
        version: 1,
        meta: {},
        blocks: [],
      }}
      title=""
      onTitleChange={() => undefined}
      selectedBlockId={null}
      insertFocusToken={0}
      onSelectBlock={() => undefined}
      onUpdateBlockContent={() => undefined}
      onInsertBlock={() => undefined}
    />
  );

  expect(html).toContain("No blocks yet.");
  expect(html).toContain("Add section");
});

test("PostEditorCanvas preview uses richtext styling for section blocks", () => {
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
              nodes: [{ id: "node-1", type: "paragraph", text: "<p>Quote me</p>" }],
            },
          },
        ],
      }}
      title="Preview surface"
      onTitleChange={() => undefined}
      selectedBlockId={null}
      insertFocusToken={0}
      onSelectBlock={() => undefined}
      onUpdateBlockContent={() => undefined}
      onInsertBlock={() => undefined}
    />
  );

  expect(html).toContain("post-editor-richtext");
});

test("PostEditorCanvas shows placeholder for empty section previews", () => {
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
              nodes: [{ id: "node-1", type: "paragraph", text: "" }],
            },
          },
        ],
      }}
      title="Empty section preview"
      onTitleChange={() => undefined}
      selectedBlockId={null}
      insertFocusToken={0}
      onSelectBlock={() => undefined}
      onUpdateBlockContent={() => undefined}
      onInsertBlock={() => undefined}
    />
  );

  expect(html).toContain("Start writing or paste content from Word...");
});

test("PostEditorCanvas preview renders heading markup for section nodes", () => {
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
              nodes: [{ id: "node-1", type: "heading", level: 2, text: "<h2>Heading</h2>" }],
            },
          },
        ],
      }}
      title="Heading preview"
      onTitleChange={() => undefined}
      selectedBlockId={null}
      insertFocusToken={0}
      onSelectBlock={() => undefined}
      onUpdateBlockContent={() => undefined}
      onInsertBlock={() => undefined}
    />
  );

  expect(html).toContain("<h2");
  expect(html).toContain("Heading");
});

test("PostEditorCanvas renders media placeholder when image is not configured", () => {
  const html = renderToString(
    <PostEditorCanvas
      document={{
        version: 1,
        meta: {},
        blocks: [{ id: "block-1", type: "image", attrs: {}, content: null }],
      }}
      title="Media post"
      onTitleChange={() => undefined}
      selectedBlockId="block-1"
      insertFocusToken={0}
      onSelectBlock={() => undefined}
      onUpdateBlockContent={() => undefined}
      onInsertBlock={() => undefined}
      onOpenBlockDetails={() => undefined}
    />
  );

  expect(html).toContain("data-post-editor-media-placeholder=\"image\"");
  expect(html).toContain("Click to choose image from media library");
});

test("PostEditorCanvas renders embed previews for supported providers and falls back on invalid urls", () => {
  const html = renderToString(
    <PostEditorCanvas
      document={{
        version: 1,
        meta: {},
        blocks: [
          {
            id: "embed-youtube",
            type: "embed",
            attrs: { provider: "youtube", url: "https://www.youtube.com/watch?v=abc123" },
            content: null,
          },
          {
            id: "embed-vimeo",
            type: "embed",
            attrs: { provider: "vimeo", url: "https://vimeo.com/54321" },
            content: null,
          },
          {
            id: "embed-loom",
            type: "embed",
            attrs: { provider: "loom", url: "https://www.loom.com/share/demo-id" },
            content: null,
          },
          {
            id: "embed-custom",
            type: "embed",
            attrs: { provider: "custom", url: "https://example.com/embed/demo" },
            content: null,
          },
          {
            id: "embed-invalid",
            type: "embed",
            attrs: { provider: "youtube", url: "notaurl" },
            content: null,
          },
          {
            id: "embed-lookalike",
            type: "embed",
            attrs: { provider: "youtube", url: "https://youtube.com.evil.test/watch?v=bad" },
            content: null,
          },
        ],
      }}
      title="Embeds"
      onTitleChange={() => undefined}
      selectedBlockId={null}
      insertFocusToken={0}
      onSelectBlock={() => undefined}
      onUpdateBlockContent={() => undefined}
      onInsertBlock={() => undefined}
      onOpenBlockDetails={() => undefined}
    />
  );

  expect(html).toContain("https://www.youtube.com/embed/abc123");
  expect(html).toContain("https://player.vimeo.com/video/54321");
  expect(html).toContain("https://www.loom.com/embed/demo-id");
  expect(html).toContain("https://example.com/embed/demo");
  expect(html).not.toContain("https://www.youtube.com/embed/bad");
  expect(html).toContain("data-post-editor-media-placeholder=\"embed\"");
  expect(html).toContain("Click to configure embed URL");
});

test("PostEditorCanvas renders delete control for selected block", () => {
  const html = renderToString(
    <PostEditorCanvas
      document={{
        version: 1,
        meta: {},
        blocks: [{ id: "block-1", type: "heading", attrs: { level: 2 }, content: "<h2>A</h2>" }],
      }}
      title="Delete affordance"
      onTitleChange={() => undefined}
      selectedBlockId="block-1"
      insertFocusToken={0}
      onSelectBlock={() => undefined}
      onUpdateBlockContent={() => undefined}
      onInsertBlock={() => undefined}
      onDeleteBlock={() => undefined}
    />
  );

  expect(html).toContain("aria-label=\"Delete block: Heading\"");
});

test("PostEditorCanvas keeps delete control discoverable on hover for non-selected blocks", () => {
  const html = renderToString(
    <PostEditorCanvas
      document={{
        version: 1,
        meta: {},
        blocks: [{ id: "block-1", type: "heading", attrs: { level: 2 }, content: "<h2>A</h2>" }],
      }}
      title="Delete hover"
      onTitleChange={() => undefined}
      selectedBlockId={null}
      insertFocusToken={0}
      onSelectBlock={() => undefined}
      onUpdateBlockContent={() => undefined}
      onInsertBlock={() => undefined}
      onDeleteBlock={() => undefined}
    />
  );

  expect(html).toContain("aria-label=\"Delete block: Heading\"");
  expect(html).toContain("opacity-0 group-hover:opacity-100 focus-visible:opacity-100");
});
