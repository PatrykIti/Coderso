import { expect, test } from "bun:test";

import { normalizePostBlockDocument } from "../../../core/services/posts/editor/postBlockNormalizer";
import { adaptLegacyDocumentForRuntime } from "../../../core/services/posts/editor/postBlockLegacyAdapter";

test("adaptLegacyDocumentForRuntime converts legacy text blocks into writing-canvas segments", () => {
  const document = normalizePostBlockDocument({
    version: 1,
    blocks: [
      {
        id: "p-1",
        type: "paragraph",
        attrs: {},
        content: "<p>Legacy paragraph</p>",
      },
      {
        id: "h-1",
        type: "heading",
        attrs: { level: 3 },
        content: "<strong>Legacy heading</strong>",
      },
      {
        id: "l-1",
        type: "list",
        attrs: { ordered: true },
        content: ["First", "Second"],
      },
      {
        id: "button-1",
        type: "button",
        attrs: { label: "CTA", url: "/cta" },
        content: null,
      },
      {
        id: "q-1",
        type: "quote",
        attrs: {},
        content: "<p>Legacy quote</p>",
      },
    ],
    meta: {},
  });

  const adapted = adaptLegacyDocumentForRuntime(document);

  expect(adapted.warnings).toEqual([]);
  expect(adapted.document.blocks[0]?.type).toBe("writing-canvas");
  expect(adapted.document.blocks[1]?.type).toBe("button");
  expect(adapted.document.blocks[2]?.type).toBe("writing-canvas");

  const firstSegment = adapted.document.blocks[0];
  if (!firstSegment || firstSegment.type !== "writing-canvas") {
    throw new Error("expected writing-canvas segment");
  }
  const firstNodes = (firstSegment.content as { nodes: Array<{ type: string }> }).nodes;
  expect(firstNodes.map((node) => node.type)).toEqual(["paragraph", "heading", "list"]);
});

test("adaptLegacyDocumentForRuntime keeps legacy block when conversion fails and emits warning", () => {
  const document = normalizePostBlockDocument({
    version: 1,
    blocks: [
      {
        id: "l-invalid",
        type: "list",
        attrs: { ordered: false },
        content: [{ text: "invalid" }],
      },
    ],
    meta: {},
  });

  const adapted = adaptLegacyDocumentForRuntime(document);

  expect(adapted.document.blocks[0]?.type).toBe("list");
  expect(adapted.warnings.some((warning) => warning.includes("legacy_runtime_block_dropped"))).toBe(
    true
  );
});
