import { expect, test } from "bun:test";
import { renderToString } from "react-dom/server";

import { mapPostDocumentForRuntime } from "../../../core/services/posts/runtime/postBlockRuntimeMapper";
import { PostBlockRuntimeRenderer } from "../../../core/services/posts/runtime/postBlockRuntimeRenderer";

test("runtime renderer keeps inline richtext image wrap attributes", async () => {
  const mapped = await mapPostDocumentForRuntime({
    document: {
      version: 1,
      blocks: [
        {
          id: "paragraph-1",
          type: "paragraph",
          attrs: {},
          content:
            '<p>Text before <img src="/media/inline.jpg" data-wrap="left" data-width="33" data-margin="lg" alt="Inline" /> text after.</p>',
        },
      ],
      meta: {},
    },
  });

  const html = renderToString(<PostBlockRuntimeRenderer document={mapped} />);
  expect(html).toContain('data-wrap="left"');
  expect(html).toContain('data-width="33"');
  expect(html).toContain('data-margin="lg"');
});

test("runtime renderer applies block image wrap classes for float layouts", async () => {
  const mapped = await mapPostDocumentForRuntime({
    document: {
      version: 1,
      blocks: [
        {
          id: "image-1",
          type: "image",
          attrs: {
            mediaId: "/media/block.jpg",
            wrap: "right",
            widthPercent: 66,
            marginPreset: "sm",
            alt: "Block image",
          },
          content: null,
        },
      ],
      meta: {},
    },
  });

  const html = renderToString(<PostBlockRuntimeRenderer document={mapped} />);
  expect(html).toContain("post-image-layout");
  expect(html).toContain("post-image-wrap-right");
  expect(html).toContain("post-image-width-66");
  expect(html).toContain("post-image-margin-sm");
});
