import React from "react";
import { expect, test } from "vitest";
import { renderToString } from "react-dom/server";

import { BlockInspector } from "../../../core/admin/ui/posts/editor/inspector/BlockInspector";

test("BlockInspector renders block-specific and advanced controls", () => {
  const html = renderToString(
    <BlockInspector
      block={{
        id: "btn-1",
        type: "button",
        attrs: {
          label: "Contact us",
          url: "/contact",
          variant: "primary",
          size: "md",
          newTab: false,
        },
        content: null,
      }}
      onChangeAttrs={() => undefined}
    />
  );

  expect(html).toContain("Selected block");
  expect(html).toContain("Layout and style");
  expect(html).toContain("Block-specific");
  expect(html).toContain("Advanced");
  expect(html).toContain("Toggle");
  expect(html).toContain("Open in new tab");
});

test("BlockInspector renders empty state when no block selected", () => {
  const html = renderToString(
    <BlockInspector block={null} onChangeAttrs={() => undefined} />
  );

  expect(html).toContain("Select a block on canvas or list view");
});

test("BlockInspector renders image wrap controls", () => {
  const html = renderToString(
    <BlockInspector
      block={{
        id: "image-1",
        type: "image",
        attrs: {
          mediaId: "media-1",
          wrap: "left",
          widthPercent: 33,
          marginPreset: "sm",
          alt: "Image",
        },
        content: null,
      }}
      onChangeAttrs={() => undefined}
    />
  );

  expect(html).toContain("Text wrap");
  expect(html).toContain("Image width");
  expect(html).toContain("Image spacing");
});

test("BlockInspector shows writing-canvas guidance", () => {
  const html = renderToString(
    <BlockInspector
      block={{
        id: "writing-1",
        type: "writing-canvas",
        attrs: {},
        content: {
          version: 1,
          nodes: [{ id: "node-1", type: "paragraph", text: "<p>Body</p>" }],
        },
      }}
      onChangeAttrs={() => undefined}
    />
  );

  expect(html).toContain("Use the canvas editor to format paragraphs");
});
