// @vitest-environment happy-dom

import { afterEach, expect, test, vi } from "vitest";

import {
  createInitialPostEditorState,
  createPostBlock,
  postEditorReducer,
} from "../../../core/admin/ui/posts/editor/postEditorStore";
import { createEmptyPostBlockDocument } from "../../../core/services/posts/editor/postBlockNormalizer";

afterEach(() => {
  vi.unstubAllGlobals();
});

const makeState = () => createInitialPostEditorState();

test("createPostBlock shapes heading, list, quote, image, separator, callout, button, embed blocks", () => {
  expect(createPostBlock("heading")).toMatchObject({
    type: "heading",
    attrs: { level: 2 },
    content: "",
  });
  expect(createPostBlock("list")).toMatchObject({
    type: "list",
    attrs: { ordered: false },
    content: [""],
  });
  expect(createPostBlock("quote")).toMatchObject({ type: "quote", content: "" });
  expect(createPostBlock("image")).toMatchObject({
    type: "image",
    attrs: { mediaId: null, alt: "" },
    content: null,
  });
  expect(createPostBlock("separator")).toMatchObject({ type: "separator", content: null });
  expect(createPostBlock("callout")).toMatchObject({
    type: "callout",
    attrs: { tone: "info" },
    content: "",
  });
  expect(createPostBlock("button")).toMatchObject({
    type: "button",
    attrs: { label: "Button", url: "", variant: "primary" },
    content: null,
  });
  expect(createPostBlock("embed")).toMatchObject({
    type: "embed",
    attrs: { provider: "custom", url: "" },
    content: null,
  });
});

test("createPostBlock falls back to the default base shape for unknown types", () => {
  const block = createPostBlock("unknown-type" as never);
  expect(block).toMatchObject({ type: "unknown-type", attrs: {}, content: null });
});

test("insert_block generates numeric ids beyond non-numeric and numeric siblings", () => {
  const initial = makeState();
  const seeded = postEditorReducer(initial, {
    type: "hydrate",
    document: {
      version: 1,
      blocks: [
        { id: "custom", type: "paragraph", attrs: {}, content: "" },
        { id: "block-5", type: "paragraph", attrs: {}, content: "" },
      ],
      meta: {},
    },
  });
  const next = postEditorReducer(seeded, {
    type: "insert_block",
    mutation: { block: createPostBlock("paragraph", "") },
  });
  expect(next.document.blocks.map((block) => block.id)).toContain("block-6");
});

test("update_block for a missing block id keeps the state unchanged", () => {
  const initial = makeState();
  const next = postEditorReducer(initial, {
    type: "update_block",
    mutation: { id: "ghost", mutate: (block) => ({ ...block, content: "changed" }) },
  });
  expect(next).toBe(initial);
  expect(next.document.blocks).toHaveLength(1);
});

test("insert_block appends when afterId is absent or points at a missing block", () => {
  const initial = makeState();
  const appended = postEditorReducer(initial, {
    type: "insert_block",
    mutation: { block: createPostBlock("quote") },
  });
  expect(appended.document.blocks.at(-1)?.type).toBe("quote");

  const afterGhost = postEditorReducer(initial, {
    type: "insert_block",
    mutation: { block: createPostBlock("quote"), afterId: "ghost" },
  });
  expect(afterGhost.document.blocks.at(-1)?.type).toBe("quote");
});

test("move_block at document boundaries leaves the state unchanged", () => {
  const single = makeState();
  const movedUp = postEditorReducer(single, {
    type: "move_block",
    mutation: { id: single.document.blocks[0]?.id ?? "block-1", direction: "up" },
  });
  expect(movedUp).toBe(single);

  const seeded = postEditorReducer(makeState(), {
    type: "insert_block",
    mutation: { block: createPostBlock("quote") },
  });
  const lastId = seeded.document.blocks.at(-1)?.id ?? "";
  const movedDown = postEditorReducer(seeded, {
    type: "move_block",
    mutation: { id: lastId, direction: "down" },
  });
  expect(movedDown).toBe(seeded);
});

test("move_block reorders adjacent blocks upward and downward", () => {
  const seeded = postEditorReducer(makeState(), {
    type: "insert_block",
    mutation: { block: createPostBlock("quote") },
  });
  const secondId = seeded.document.blocks[1]?.id ?? "";
  const up = postEditorReducer(seeded, {
    type: "move_block",
    mutation: { id: secondId, direction: "up" },
  });
  expect(up.document.blocks[0]?.id).toBe(secondId);

  const firstId = up.document.blocks[0]?.id ?? "";
  const down = postEditorReducer(up, {
    type: "move_block",
    mutation: { id: firstId, direction: "down" },
  });
  expect(down.document.blocks[1]?.id).toBe(firstId);
});

test("move_block_to_index for a missing id or the current position keeps state", () => {
  const initial = makeState();
  const missing = postEditorReducer(initial, {
    type: "move_block_to_index",
    mutation: { id: "ghost", targetIndex: 0 },
  });
  expect(missing).toBe(initial);

  const blockId = initial.document.blocks[0]?.id ?? "block-1";
  const sameIndex = postEditorReducer(initial, {
    type: "move_block_to_index",
    mutation: { id: blockId, targetIndex: 0 },
  });
  expect(sameIndex).toBe(initial);
});

test("transform_block for a missing id or an unsupported transform keeps state", () => {
  const initial = makeState();
  const missing = postEditorReducer(initial, {
    type: "transform_block",
    mutation: { id: "ghost", targetType: "quote" },
  });
  expect(missing).toBe(initial);

  const seeded = postEditorReducer(initial, {
    type: "hydrate",
    document: {
      version: 1,
      blocks: [{ id: "sep-1", type: "separator", attrs: {}, content: null }],
      meta: {},
    },
  });
  const sepId = seeded.document.blocks[0]?.id ?? "sep-1";
  const unsupported = postEditorReducer(seeded, {
    type: "transform_block",
    mutation: { id: sepId, targetType: "quote" },
  });
  expect(unsupported).toBe(seeded);
});

test("ensure_toc_block inserts after an existing afterBlockId and selects the toc", () => {
  const initial = makeState();
  const firstId = initial.document.blocks[0]?.id ?? "block-1";
  const next = postEditorReducer(initial, {
    type: "ensure_toc_block",
    afterBlockId: firstId,
  });
  const tocIndex = next.document.blocks.findIndex((block) => block.type === "toc");
  expect(tocIndex).toBe(1);
  expect(next.selectedBlockId).toBe(next.document.blocks[tocIndex]?.id ?? null);

  const existing = postEditorReducer(next, { type: "ensure_toc_block" });
  expect(existing.document.blocks.filter((block) => block.type === "toc")).toHaveLength(1);
  expect(existing.selectedBlockId).toBe(next.document.blocks[tocIndex]?.id ?? null);
});

test("hydrate resets the document and keeps lastSavedAt", () => {
  const marked = postEditorReducer(makeState(), {
    type: "mark_saved",
    at: "2026-03-12T10:00:00.000Z",
  });
  const hydrated = postEditorReducer(marked, {
    type: "hydrate",
    document: {
      version: 1,
      blocks: [{ id: "fresh-1", type: "paragraph", attrs: {}, content: "Fresh" }],
      meta: {},
    },
    selectedBlockId: "fresh-1",
  });
  expect(hydrated.lastSavedAt).toBe("2026-03-12T10:00:00.000Z");
  expect(hydrated.document.blocks[0]?.id).toBe("fresh-1");
  expect(hydrated.selectedBlockId).toBe("fresh-1");
  expect(hydrated.dirty).toBe(false);
});

test("undo and redo with empty histories keep the state unchanged", () => {
  const initial = makeState();
  expect(postEditorReducer(initial, { type: "undo" })).toBe(initial);
  expect(postEditorReducer(initial, { type: "redo" })).toBe(initial);
});

test("unknown action types keep the state unchanged", () => {
  const initial = makeState();
  const next = postEditorReducer(initial, { type: "bogus_action" } as never);
  expect(next).toBe(initial);
});

test("cloneDocument falls back to JSON round-trip when structuredClone is unavailable", () => {
  vi.stubGlobal("structuredClone", undefined);
  const initial = makeState();
  const next = postEditorReducer(initial, {
    type: "update_meta",
    patch: { excerpt: "Fallback clone" },
  });
  expect(next.document.meta.excerpt).toBe("Fallback clone");
  expect(next.document).not.toBe(initial.document);
});

test("select_block stores null selections", () => {
  const initial = makeState();
  const next = postEditorReducer(initial, { type: "select_block", id: null });
  expect(next.selectedBlockId).toBeNull();
});

test("createInitialPostEditorState seeds a document and selected id when provided", () => {
  const document = createEmptyPostBlockDocument();
  const state = createInitialPostEditorState(document, "block-1");
  expect(state.document.blocks).toHaveLength(1);
  expect(state.dirty).toBe(false);
});
