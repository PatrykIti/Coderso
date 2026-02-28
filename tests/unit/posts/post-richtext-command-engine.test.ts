import { expect, test } from "bun:test";

import {
  applyCommandToBlockTags,
  getPostRichTextCommandKind,
  resolveAlignmentForCommand,
  resolveBlockTagForCommand,
  resolveListTagForCommand,
  resolveToolbarProfileForBlockType,
} from "../../../core/admin/ui/posts/editor/richtext/postRichTextCommandEngine";

test("block format commands map selected blocks to target heading level", () => {
  const next = applyCommandToBlockTags("heading-3", ["p", "blockquote"]);
  expect(next).toEqual(["h3", "h3"]);
});

test("paragraph command converts heading/quote/list selections to paragraph", () => {
  const next = applyCommandToBlockTags("paragraph", ["h2", "blockquote", "ul", "ol"]);
  expect(next).toEqual(["p", "p", "p", "p"]);
});

test("quote command toggles blockquote mode on and off", () => {
  const quoted = applyCommandToBlockTags("quote", ["p", "h2"]);
  const unquoted = applyCommandToBlockTags("quote", ["blockquote", "blockquote"]);

  expect(quoted).toEqual(["blockquote", "blockquote"]);
  expect(unquoted).toEqual(["p", "p"]);
});

test("list commands wrap and unwrap selected block tags", () => {
  const bulletWrapped = applyCommandToBlockTags("bullet-list", ["p", "h3"]);
  const bulletUnwrapped = applyCommandToBlockTags("bullet-list", ["ul", "ul"]);
  const orderedWrapped = applyCommandToBlockTags("ordered-list", ["p"]);
  const orderedUnwrapped = applyCommandToBlockTags("ordered-list", ["ol"]);

  expect(bulletWrapped).toEqual(["ul"]);
  expect(bulletUnwrapped).toEqual(["p", "p"]);
  expect(orderedWrapped).toEqual(["ol"]);
  expect(orderedUnwrapped).toEqual(["p"]);
});

test("non-block commands do not mutate block tag structure", () => {
  const source = ["p", "h2", "blockquote"] as const;
  const aligned = applyCommandToBlockTags("align-center", source);
  const highlighted = applyCommandToBlockTags("highlight", source);
  expect(aligned).toEqual(["p", "h2", "blockquote"]);
  expect(highlighted).toEqual(["p", "h2", "blockquote"]);
});

test("command kind and fallback mappings are deterministic", () => {
  expect(getPostRichTextCommandKind("bold")).toBe("native-inline");
  expect(getPostRichTextCommandKind("inline-code")).toBe("inline-wrapper");
  expect(getPostRichTextCommandKind("link")).toBe("link");
  expect(getPostRichTextCommandKind("heading-2")).toBe("block-format");
  expect(getPostRichTextCommandKind("ordered-list")).toBe("list-format");
  expect(getPostRichTextCommandKind("align-right")).toBe("alignment");
  expect(getPostRichTextCommandKind("clear-formatting")).toBe("clear-formatting");

  expect(resolveBlockTagForCommand("heading-2")).toBe("h2");
  expect(resolveBlockTagForCommand("paragraph")).toBe("p");
  expect(resolveListTagForCommand("ordered-list")).toBe("ol");
  expect(resolveListTagForCommand("bullet-list")).toBe("ul");
  expect(resolveAlignmentForCommand("align-left")).toBe("left");
  expect(resolveAlignmentForCommand("align-center")).toBe("center");
  expect(resolveAlignmentForCommand("align-right")).toBe("right");
});

test("toolbar profile routing by block type is explicit", () => {
  expect(resolveToolbarProfileForBlockType("writing-canvas")).toBe("writing-canvas");
  expect(resolveToolbarProfileForBlockType("paragraph")).toBe("paragraph");
  expect(resolveToolbarProfileForBlockType("heading")).toBe("heading");
  expect(resolveToolbarProfileForBlockType("quote")).toBe("quote");
  expect(resolveToolbarProfileForBlockType("callout")).toBe("callout");
  expect(resolveToolbarProfileForBlockType("list")).toBeNull();
  expect(resolveToolbarProfileForBlockType("image")).toBeNull();
});
