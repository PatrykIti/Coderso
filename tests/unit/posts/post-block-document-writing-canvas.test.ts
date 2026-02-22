import { expect, test } from "bun:test";

import {
  POST_BLOCK_TYPES,
  createEmptyWritingCanvasContent,
  isPostBlockType,
} from "../../../core/services/posts/editor/postBlockDocument";

test("post block types include writing-canvas", () => {
  expect(POST_BLOCK_TYPES).toContain("writing-canvas");
  expect(isPostBlockType("writing-canvas")).toBe(true);
});

test("createEmptyWritingCanvasContent returns deterministic initial node", () => {
  const content = createEmptyWritingCanvasContent();

  expect(content.version).toBe(1);
  expect(content.nodes).toHaveLength(1);
  expect(content.nodes[0]).toEqual({
    id: "node-1",
    type: "paragraph",
    text: "",
  });
});
