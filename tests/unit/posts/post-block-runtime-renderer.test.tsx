import { expect, test } from "bun:test";
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
                  text: "<p>Writing canvas paragraph</p>",
                },
                {
                  id: "node-2",
                  type: "heading",
                  level: 3,
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
  expect(html).toContain("Writing heading");
  expect(html).toContain("Point A");
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
