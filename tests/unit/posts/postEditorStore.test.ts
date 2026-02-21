import { expect, test } from "bun:test";

import {
  createInitialPostEditorState,
  createPostBlock,
  postEditorReducer,
} from "../../../core/admin/ui/posts/editor/postEditorStore";

test("postEditorStore initializes with default paragraph block", () => {
  const state = createInitialPostEditorState();
  expect(state.document.blocks.length).toBe(1);
  expect(state.document.blocks[0]?.type).toBe("paragraph");
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
  expect(deletedSecond.document.blocks[0]?.type).toBe("paragraph");
});

test("postEditorStore supports undo and redo", () => {
  const initial = createInitialPostEditorState();
  const updated = postEditorReducer(initial, {
    type: "update_block",
    mutation: {
      id: initial.selectedBlockId ?? "",
      mutate: (block) => ({ ...block, content: "Hello world" }),
    },
  });

  expect(updated.dirty).toBe(true);
  expect(updated.history.past.length).toBe(1);

  const undone = postEditorReducer(updated, { type: "undo" });
  expect(undone.history.future.length).toBe(1);
  expect(undone.document.blocks[0]?.content).toBe("");

  const redone = postEditorReducer(undone, { type: "redo" });
  expect(redone.document.blocks[0]?.content).toBe("Hello world");
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
    "paragraph",
  ]);
});

test("postEditorStore transforms selected block without changing id", () => {
  const initial = createInitialPostEditorState();
  const blockId = initial.selectedBlockId ?? "";
  const updated = postEditorReducer(initial, {
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

  expect(transformed.document.blocks[0]?.id).toBe(blockId);
  expect(transformed.document.blocks[0]?.type).toBe("list");
  expect(transformed.document.blocks[0]?.content).toEqual(["Item one", "Item two"]);
});
