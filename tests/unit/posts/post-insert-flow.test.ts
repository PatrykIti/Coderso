import { expect, test } from "bun:test";

import {
  createInitialPostEditorState,
  createPostBlock,
  postEditorReducer,
} from "../../../core/admin/ui/posts/editor/postEditorStore";
import { resolvePostInsertMutation } from "../../../core/admin/ui/posts/editor/postInsertFlow";

test("resolvePostInsertMutation falls back to append when selection is missing", () => {
  const state = createInitialPostEditorState();
  const mutation = resolvePostInsertMutation({
    blocks: state.document.blocks,
    selectedBlockId: "missing-block",
    options: {
      source: "sidebar",
      target: { mode: "after-selected" },
    },
  });

  expect(mutation).toEqual({ atIndex: 1 });
});

test("resolvePostInsertMutation supports appender index target with bounds clamp", () => {
  const state = createInitialPostEditorState();
  const mutation = resolvePostInsertMutation({
    blocks: state.document.blocks,
    selectedBlockId: state.selectedBlockId,
    options: {
      source: "appender",
      target: { mode: "index", index: 999 },
    },
  });

  expect(mutation).toEqual({ atIndex: 1 });
});

test("resolvePostInsertMutation supports outline-plus source as selected-anchor insert", () => {
  const state = createInitialPostEditorState();
  const mutation = resolvePostInsertMutation({
    blocks: state.document.blocks,
    selectedBlockId: state.selectedBlockId,
    options: {
      source: "outline-plus",
      target: { mode: "after-selected" },
    },
  });

  expect(mutation).toEqual({ afterId: state.selectedBlockId });
});

test("shared insert orchestration keeps identical document shape for sidebar slash and appender paths", () => {
  const initial = createInitialPostEditorState();
  const withHeading = postEditorReducer(initial, {
    type: "insert_block",
    mutation: {
      block: createPostBlock("heading"),
      afterId: initial.selectedBlockId,
    },
  });

  const selectedId = withHeading.document.blocks[0]?.id ?? null;
  const insertWithSource = (
    source: "sidebar" | "slash" | "appender" | "outline-plus"
  ) => {
    const mutation = resolvePostInsertMutation({
      blocks: withHeading.document.blocks,
      selectedBlockId: selectedId,
      options:
        source === "sidebar" || source === "outline-plus"
          ? { source, target: { mode: "after-selected" } }
          : source === "slash"
            ? { source, target: { mode: "after-block", blockId: selectedId } }
            : { source, target: { mode: "index", index: 1 } },
    });

    return postEditorReducer(withHeading, {
      type: "insert_block",
      mutation: {
        block: createPostBlock("quote"),
        ...mutation,
      },
    });
  };

  const sidebarResult = insertWithSource("sidebar");
  const outlinePlusResult = insertWithSource("outline-plus");
  const slashResult = insertWithSource("slash");
  const appenderResult = insertWithSource("appender");

  const sidebarShape = sidebarResult.document.blocks.map((block) => block.type);
  expect(sidebarShape).toEqual(["writing-canvas", "quote", "heading"]);
  expect(outlinePlusResult.document.blocks.map((block) => block.type)).toEqual(sidebarShape);
  expect(slashResult.document.blocks.map((block) => block.type)).toEqual(sidebarShape);
  expect(appenderResult.document.blocks.map((block) => block.type)).toEqual(sidebarShape);
});
