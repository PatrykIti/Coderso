import React from "react";
import { expect, test } from "vitest";
import { renderToString } from "react-dom/server";

import { PostBlockRuntimeRenderer } from "../../../core/services/posts/runtime/postBlockRuntimeRenderer";
import {
  getPostRuntimePlainText,
  mapPostDocumentForRuntime,
  resolvePostRuntimeExcerpt,
} from "../../../core/services/posts/runtime/postBlockRuntimeMapper";
import type { getMediaById } from "../../../core/services/media/mediaService";

test("mapPostDocumentForRuntime renders sanitized rich blocks", async () => {
  const mapped = await mapPostDocumentForRuntime({
    document: {
      version: 1,
      blocks: [
        {
          id: "heading-1",
          type: "heading",
          attrs: { level: 2 },
          content: "<h2>Runtime heading</h2>",
        },
        {
          id: "paragraph-1",
          type: "paragraph",
          attrs: {},
          content:
            "<p>Hello <strong>world</strong> <script>alert(1)</script><a href=\"javascript:alert(1)\">bad</a></p>",
        },
        {
          id: "list-1",
          type: "list",
          attrs: { ordered: true },
          content: ["First", "Second"],
        },
        {
          id: "button-1",
          type: "button",
          attrs: {
            label: "Read more",
            url: "javascript:alert(1)",
          },
          content: null,
        },
      ],
      meta: {},
    },
  });

  const html = renderToString(<PostBlockRuntimeRenderer document={mapped} />);

  expect(html).toContain("Runtime heading");
  expect(html).toContain("<ol");
  expect(html).toContain("First");
  expect(html).toContain('href="#"');
  expect(html).not.toContain("javascript:alert(1)");
  expect(html).not.toContain("<script>");
});

test("mapPostDocumentForRuntime renders writing-canvas nodes and keeps parity metadata", async () => {
  const mapped = await mapPostDocumentForRuntime(
    {
      document: {
        version: 1,
        blocks: [
          {
            id: "writing-1",
            type: "writing-canvas",
            attrs: {},
            content: {
              version: 1,
              nodes: [
                {
                  id: "node-1",
                  type: "paragraph",
                  text: "<p>Writing canvas paragraph with <code>inline</code> code</p>",
                },
                {
                  id: "node-2",
                  type: "heading",
                  level: 1,
                  text: "<em>Writing heading</em>",
                },
                {
                  id: "node-3",
                  type: "list",
                  ordered: false,
                  items: ["<p>Point A</p>", "<p>Point B</p>"],
                },
                {
                  id: "node-4",
                  type: "quote",
                  variant: "code",
                  align: "center",
                  text: "<code>const value = 42;</code>",
                },
                {
                  id: "node-4b",
                  type: "quote",
                  text: "<p>Runtime quote</p>",
                },
                {
                  id: "node-5",
                  type: "image",
                  mediaId: "media-writing",
                  alt: "Writing image",
                  caption: "Inline media",
                  wrap: "right",
                  widthPercent: 33,
                },
              ],
            },
          },
        ],
        meta: {},
      },
    },
    {
      getMediaById: async () =>
        ({
          id: "media-writing",
          url: "https://cdn.example.com/media/writing.jpg",
          alt: "Writing media alt",
        }) as Awaited<ReturnType<typeof getMediaById>>,
    }
  );

  const html = renderToString(<PostBlockRuntimeRenderer document={mapped} />);
  expect(html).toContain("Writing canvas paragraph");
  expect(html).toContain("<code>inline</code>");
  expect(html).toContain("Writing heading");
  expect(html).toContain("<h1");
  expect(html).toContain("Point A");
  expect(html).toContain("const value = 42;");
  expect(html).toContain("<blockquote");
  expect(html).toContain("Runtime quote");
  expect(html).toContain("text-center");
  expect(html).toContain("https://cdn.example.com/media/writing.jpg");
  expect(html).toContain('data-post-runtime-warning-count="0"');
});

test("mapPostDocumentForRuntime resolves image media id and embed providers", async () => {
  const mapped = await mapPostDocumentForRuntime(
    {
      document: {
        version: 1,
        blocks: [
          {
            id: "image-1",
            type: "image",
            attrs: {
              mediaId: "media-123",
              alt: "Resolved image",
            },
            content: null,
          },
          {
            id: "embed-1",
            type: "embed",
            attrs: {
              provider: "youtube",
              url: "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
            },
            content: null,
          },
        ],
        meta: {},
      },
    },
    {
      getMediaById: async () =>
        ({
          id: "media-123",
          url: "https://cdn.example.com/media/image.jpg",
          alt: "Media alt",
        }) as Awaited<ReturnType<typeof getMediaById>>,
    }
  );

  const html = renderToString(<PostBlockRuntimeRenderer document={mapped} />);
  expect(html).toContain("https://cdn.example.com/media/image.jpg");
  expect(html).toContain("Resolved image");
  expect(html).toContain("https://www.youtube.com/embed/dQw4w9WgXcQ");
});

test("mapPostDocumentForRuntime renders dedicated media blocks safely", async () => {
  const mediaRecords = {
    "video-1": {
      id: "video-1",
      key: "uploads/demo.mp4",
      url: "https://cdn.example.com/media/demo.mp4",
      mimeType: "video/mp4",
      size: 4096,
      title: "Demo video",
      caption: "Video caption",
    },
    "gallery-1": {
      id: "gallery-1",
      key: "uploads/gallery-1.jpg",
      url: "https://cdn.example.com/media/gallery-1.jpg",
      mimeType: "image/jpeg",
      size: 1024,
      alt: "Gallery one",
      caption: "Gallery caption",
    },
    "audio-1": {
      id: "audio-1",
      key: "uploads/audio.mp3",
      url: "https://cdn.example.com/media/audio.mp3",
      mimeType: "audio/mpeg",
      size: 2048,
      caption: "Audio caption",
    },
    "file-1": {
      id: "file-1",
      key: "uploads/report.pdf",
      url: "https://cdn.example.com/media/report.pdf",
      mimeType: "application/pdf",
      size: 8192,
      title: "Quarterly report",
    },
  };
  const mapped = await mapPostDocumentForRuntime(
    {
      document: {
        version: 1,
        blocks: [
          {
            id: "video-block",
            type: "video",
            attrs: { mediaId: "video-1", caption: "Custom video caption" },
            content: null,
          },
          {
            id: "gallery-block",
            type: "gallery",
            attrs: { mediaIds: ["gallery-1", "missing"], columns: 4 },
            content: null,
          },
          {
            id: "audio-block",
            type: "audio",
            attrs: { mediaId: "audio-1" },
            content: null,
          },
          {
            id: "file-block",
            type: "file",
            attrs: { mediaId: "file-1", label: "Download report", newTab: true },
            content: null,
          },
          {
            id: "unsafe-video",
            type: "video",
            attrs: { url: "javascript:alert(1)" },
            content: null,
          },
        ],
        meta: {},
      },
    },
    {
      getMediaById: async (id) =>
        (mediaRecords[id as keyof typeof mediaRecords] ?? null) as Awaited<
          ReturnType<typeof getMediaById>
        >,
    }
  );

  const html = renderToString(<PostBlockRuntimeRenderer document={mapped} />);

  expect(html).toContain("https://cdn.example.com/media/demo.mp4");
  expect(html).toContain("Custom video caption");
  expect(html).toContain('data-post-runtime-gallery="true"');
  expect(html).toContain("https://cdn.example.com/media/gallery-1.jpg");
  expect(html).toContain("Gallery caption");
  expect(html).toContain("https://cdn.example.com/media/audio.mp3");
  expect(html).toContain("Audio caption");
  expect(html).toContain('href="https://cdn.example.com/media/report.pdf"');
  expect(html).toContain('target="_blank"');
  expect(html).toContain("8.0 KB");
  expect(html).not.toContain("javascript:alert");
});

test("mapPostDocumentForRuntime falls back to legacy content and excerpt helpers", async () => {
  const mapped = await mapPostDocumentForRuntime({
    content: "<p>Legacy paragraph content</p>",
    excerpt: "Legacy excerpt",
  });

  const html = renderToString(<PostBlockRuntimeRenderer document={mapped} />);
  expect(html).toContain("Legacy paragraph content");

  const excerpt = resolvePostRuntimeExcerpt(
    {
      document: {
        version: 1,
        blocks: [
          {
            id: "paragraph-1",
            type: "paragraph",
            attrs: {},
            content: "<p>Excerpt from runtime document body.</p>",
          },
        ],
        meta: {},
      },
    },
    80
  );

  expect(excerpt).toContain("Excerpt from runtime document body.");
  expect(getPostRuntimePlainText(mapped)).toContain("Legacy paragraph content");
});

test("mapPostDocumentForRuntime builds dynamic toc from heading index with stable anchors", async () => {
  const mapped = await mapPostDocumentForRuntime({
    document: {
      version: 1,
      blocks: [
        {
          id: "toc-1",
          type: "toc",
          attrs: {
            title: "On this page",
            minLevel: 1,
            maxLevel: 3,
          },
          content: null,
        },
        {
          id: "heading-1",
          type: "heading",
          attrs: { level: 2 },
          content: "Intro",
        },
        {
          id: "heading-2",
          type: "heading",
          attrs: { level: 2, anchorId: "custom-anchor" },
          content: "Manual anchor",
        },
        {
          id: "writing-1",
          type: "writing-canvas",
          attrs: {},
          content: {
            version: 1,
            nodes: [
              {
                id: "node-1",
                type: "heading",
                level: 2,
                text: "Intro",
              },
            ],
          },
        },
      ],
      meta: {},
    },
  });

  const tocBlock = mapped.blocks.find((block) => block.type === "toc");
  if (!tocBlock?.content.toc) {
    throw new Error("expected toc block");
  }

  expect(tocBlock.content.toc.items).toEqual([
    { anchorId: "intro", level: 2, text: "Intro" },
    { anchorId: "custom-anchor", level: 2, text: "Manual anchor" },
    { anchorId: "intro-2", level: 2, text: "Intro" },
  ]);

  const html = renderToString(<PostBlockRuntimeRenderer document={mapped} />);
  expect(html).toContain('href="#intro"');
  expect(html).toContain('href="#intro-2"');
  expect(html).toContain('href="#custom-anchor"');
  expect(html).toContain('id="intro"');
  expect(html).toContain('id="intro-2"');
});

test("mapPostDocumentForRuntime renders toc empty state when heading range has no matches", async () => {
  const mapped = await mapPostDocumentForRuntime({
    document: {
      version: 1,
      blocks: [
        {
          id: "toc-1",
          type: "toc",
          attrs: {
            minLevel: 3,
            maxLevel: 6,
            hideIfEmpty: false,
          },
          content: null,
        },
        {
          id: "heading-1",
          type: "heading",
          attrs: { level: 1 },
          content: "Title",
        },
      ],
      meta: {},
    },
  });

  const html = renderToString(<PostBlockRuntimeRenderer document={mapped} />);
  expect(html).toContain("No headings found for this range.");
});
