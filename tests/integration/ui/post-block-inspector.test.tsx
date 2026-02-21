import { expect, test } from "bun:test";
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
  expect(html).toContain("Open in new tab");
  expect(html).toContain("Custom class");
  expect(html).toContain("Hide on mobile");
});

test("BlockInspector renders empty state when no block selected", () => {
  const html = renderToString(
    <BlockInspector block={null} onChangeAttrs={() => undefined} />
  );

  expect(html).toContain("Select a block on canvas or list view");
});
