import { renderToStaticMarkup } from "react-dom/server";
import { expect, test, vi } from "vitest";

import {
  createPageBlockV2,
  createPageSectionV2,
} from "../../../core/services/pages/pageDocumentV2";
import { LayerBlockRows } from "../../../core/admin/ui/pages/editor/PageEditorLayers";

test("LayerBlockRows renders nested slots and selected row actions", () => {
  const nestedText = createPageBlockV2("text", {
    id: "blk-nested-text",
    props: { text: "Nested text", format: "plain", align: "left" },
  });
  const columns = createPageBlockV2("columns", {
    id: "blk-columns",
    props: { count: 2, gap: 24, distribution: "equal" },
    slots: { "column:1": [nestedText], "column:2": [] },
  });
  const section = createPageSectionV2("content", {
    id: "sec-layers",
    blocks: [columns],
  });

  const html = renderToStaticMarkup(
    <LayerBlockRows
      section={section}
      blocks={section.blocks}
      ownerPath={null}
      selectedBlockPath={[{ index: 0 }]}
      canAddBeside
      device="desktop"
      onSelectBlock={vi.fn()}
      onAddToTarget={vi.fn()}
      onMoveToTarget={vi.fn()}
      onAddBeside={vi.fn()}
    />
  );

  expect(html).toContain('data-page-editor-layer-block-id="blk-columns"');
  expect(html).toContain("columns");
  expect(html).toContain("Column 1");
  expect(html).toContain("Column 2");
  expect(html).toContain('data-page-editor-layer-slot-key="column:1"');
  expect(html).toContain('data-page-editor-layer-block-id="blk-nested-text"');
  expect(html).toContain("Beside");
  expect(html).toContain("Move here");
  expect(html).toContain("Empty");
});
