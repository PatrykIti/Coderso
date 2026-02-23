import { expect, test } from "bun:test";

import {
  createInitialPostEditorState,
  createPostBlock,
  postEditorReducer,
} from "../../../core/admin/ui/posts/editor/postEditorStore";

test("postEditorStore initializes with default writing-canvas block", () => {
  const state = createInitialPostEditorState();
  expect(state.document.blocks.length).toBe(1);
  expect(state.document.blocks[0]?.type).toBe("writing-canvas");
  expect(state.selectedBlockId).toBe(state.document.blocks[0]?.id ?? null);
});

test("postEditorStore update_meta marks state as dirty", () => {
  const initial = createInitialPostEditorState();
  const next = postEditorReducer(initial, {
    type: "update_meta",
    patch: { excerpt: "New excerpt" },
  });

  expect(next.document.meta.excerpt).toBe("New excerpt");
  expect(next.dirty).toBe(true);
  expect(next.history.past.length).toBe(1);
});

test("postEditorStore insert/delete keeps selection and minimum one block", () => {
  const initial = createInitialPostEditorState();
  const inserted = postEditorReducer(initial, {
    type: "insert_block",
    mutation: { block: createPostBlock("heading"), afterId: initial.selectedBlockId },
  });

  expect(inserted.document.blocks.length).toBe(2);
  expect(inserted.selectedBlockId).toBe(inserted.document.blocks[1]?.id ?? null);

  const deletedFirst = postEditorReducer(inserted, {
    type: "delete_block",
    id: inserted.document.blocks[0]?.id ?? "",
  });
  const deletedSecond = postEditorReducer(deletedFirst, {
    type: "delete_block",
    id: deletedFirst.document.blocks[0]?.id ?? "",
  });

  expect(deletedSecond.document.blocks.length).toBe(1);
  expect(deletedSecond.document.blocks[0]?.type).toBe("writing-canvas");
});

test("postEditorStore supports undo and redo", () => {
  const initial = createInitialPostEditorState();
  const withParagraph = postEditorReducer(initial, {
    type: "insert_block",
    mutation: { block: createPostBlock("paragraph"), afterId: initial.selectedBlockId },
  });
  const paragraphId = withParagraph.selectedBlockId ?? "";
  const updated = postEditorReducer(withParagraph, {
    type: "update_block",
    mutation: {
      id: paragraphId,
      mutate: (block) => ({ ...block, content: "Hello world" }),
    },
  });

  expect(updated.dirty).toBe(true);
  expect(updated.history.past.length).toBe(2);

  const undone = postEditorReducer(updated, { type: "undo" });
  expect(undone.history.future.length).toBe(1);
  const undoneParagraph = undone.document.blocks.find((block) => block.id === paragraphId);
  expect(undoneParagraph?.content).toBe("");

  const redone = postEditorReducer(undone, { type: "redo" });
  const redoneParagraph = redone.document.blocks.find((block) => block.id === paragraphId);
  expect(redoneParagraph?.content).toBe("Hello world");
});

test("postEditorStore moves blocks by target index", () => {
  const initial = createInitialPostEditorState();
  const withHeading = postEditorReducer(initial, {
    type: "insert_block",
    mutation: { block: createPostBlock("heading"), afterId: initial.selectedBlockId },
  });
  const withQuote = postEditorReducer(withHeading, {
    type: "insert_block",
    mutation: { block: createPostBlock("quote"), afterId: withHeading.selectedBlockId },
  });

  const moved = postEditorReducer(withQuote, {
    type: "move_block_to_index",
    mutation: { id: withQuote.document.blocks[0]?.id ?? "", targetIndex: 3 },
  });

  expect(moved.document.blocks.map((block) => block.type)).toEqual([
    "heading",
    "quote",
    "writing-canvas",
  ]);
});

test("postEditorStore transforms selected block without changing id", () => {
  const initial = createInitialPostEditorState();
  const withParagraph = postEditorReducer(initial, {
    type: "insert_block",
    mutation: { block: createPostBlock("paragraph"), afterId: initial.selectedBlockId },
  });
  const blockId = withParagraph.selectedBlockId ?? "";
  const updated = postEditorReducer(withParagraph, {
    type: "update_block",
    mutation: {
      id: blockId,
      mutate: (block) => ({ ...block, content: "Item one\nItem two" }),
    },
  });

  const transformed = postEditorReducer(updated, {
    type: "transform_block",
    mutation: { id: blockId, targetType: "list" },
  });

  const transformedBlock = transformed.document.blocks.find((block) => block.id === blockId);
  expect(transformedBlock?.id).toBe(blockId);
  expect(transformedBlock?.type).toBe("list");
  expect(transformedBlock?.content).toEqual(["Item one", "Item two"]);
});

test("postEditorStore ensure_toc_block inserts toc once and keeps idempotency", () => {
  const initial = createInitialPostEditorState();
  const withHeading = postEditorReducer(initial, {
    type: "insert_block",
    mutation: { block: createPostBlock("heading"), afterId: initial.selectedBlockId },
  });

  const withToc = postEditorReducer(withHeading, {
    type: "ensure_toc_block",
    afterBlockId: null,
  });
  const tocBlocks = withToc.document.blocks.filter((block) => block.type === "toc");

  expect(tocBlocks).toHaveLength(1);
  expect(withToc.document.blocks[0]?.type).toBe("toc");
  expect(withToc.selectedBlockId).toBe(tocBlocks[0]?.id ?? null);

  const secondEnsure = postEditorReducer(withToc, {
    type: "ensure_toc_block",
    afterBlockId: null,
  });
  const tocBlocksAfterSecondEnsure = secondEnsure.document.blocks.filter(
    (block) => block.type === "toc"
  );
  expect(tocBlocksAfterSecondEnsure).toHaveLength(1);
  expect(secondEnsure.selectedBlockId).toBe(tocBlocksAfterSecondEnsure[0]?.id ?? null);
});
