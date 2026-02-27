import { expect, test } from "bun:test";

import { BlockInspector } from "../../../core/admin/ui/posts/editor/inspector/BlockInspector";
import type { PostBlock } from "../../../core/services/posts/editor/postBlockDocument";
import { renderAdminUi } from "../../utils/adminRouterRender";

const paragraphBlock: PostBlock = {
  id: "block-1",
  type: "paragraph",
  attrs: {
    align: "left",
    width: "auto",
    spacingTop: "md",
    spacingBottom: "md",
    textScale: "md",
  },
  content: "<p>Example</p>",
};

const imageBlock: PostBlock = {
  id: "block-2",
  type: "image",
  attrs: {
    align: "left",
    width: "auto",
    spacingTop: "md",
    spacingBottom: "md",
    mediaId: "",
    alt: "",
    wrap: "none",
    widthPercent: 50,
    marginPreset: "md",
  },
  content: null,
};

test("BlockInspector hides toolbar-owned alignment/text size controls for paragraph", () => {
  const html = renderAdminUi(
    <BlockInspector block={paragraphBlock} onChangeAttrs={() => undefined} />
  );

  expect(html).not.toContain("Alignment");
  expect(html).not.toContain("Text size");
  expect(html).toContain("Width");
  expect(html).toContain("Spacing top");
});

test("BlockInspector keeps alignment control for non-text blocks", () => {
  const html = renderAdminUi(
    <BlockInspector block={imageBlock} onChangeAttrs={() => undefined} />
  );

  expect(html).toContain("Alignment");
  expect(html).toContain("Image width");
});
