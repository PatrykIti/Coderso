import { expect, test } from "bun:test";

import {
  applyCommandToBlockTags,
  getPostRichTextCommandKind,
} from "../../../core/admin/ui/posts/editor/richtext/postRichTextCommandEngine";
import { getToolbarCommandsForProfile } from "../../../core/admin/ui/posts/editor/richtext/PostRichTextToolbar";

test("heading and paragraph commands keep deterministic block-level transitions", () => {
  const toHeading = applyCommandToBlockTags("heading-1", ["p"]);
  const backToParagraph = applyCommandToBlockTags("paragraph", ["h1"]);
  const multiHeading = applyCommandToBlockTags("heading-4", ["p", "blockquote", "h2"]);

  expect(toHeading).toEqual(["h1"]);
  expect(backToParagraph).toEqual(["p"]);
  expect(multiHeading).toEqual(["h4", "h4", "h4"]);
});

test("quote command toggles between paragraph-like and blockquote modes", () => {
  const quoted = applyCommandToBlockTags("quote", ["p", "h3"]);
  const unquoted = applyCommandToBlockTags("quote", ["blockquote"]);

  expect(quoted).toEqual(["blockquote", "blockquote"]);
  expect(unquoted).toEqual(["p"]);
});

test("list commands wrap paragraph selections and unwrap active list selections", () => {
  const wrappedBullet = applyCommandToBlockTags("bullet-list", ["p", "p"]);
  const wrappedOrdered = applyCommandToBlockTags("ordered-list", ["p", "blockquote"]);
  const unwrappedBullet = applyCommandToBlockTags("bullet-list", ["ul", "ul"]);
  const unwrappedOrdered = applyCommandToBlockTags("ordered-list", ["ol"]);

  expect(wrappedBullet).toEqual(["ul"]);
  expect(wrappedOrdered).toEqual(["ol"]);
  expect(unwrappedBullet).toEqual(["p", "p"]);
  expect(unwrappedOrdered).toEqual(["p"]);
});

test("list command availability follows profile matrix contract", () => {
  const writingCommands = getToolbarCommandsForProfile("writing-canvas");
  const paragraphCommands = getToolbarCommandsForProfile("paragraph");
  const headingCommands = getToolbarCommandsForProfile("heading");
  const quoteCommands = getToolbarCommandsForProfile("quote");

  expect(writingCommands.has("bullet-list")).toBe(true);
  expect(paragraphCommands.has("ordered-list")).toBe(false);
  expect(headingCommands.has("bullet-list")).toBe(false);
  expect(headingCommands.has("ordered-list")).toBe(false);
  expect(quoteCommands.has("bullet-list")).toBe(false);
  expect(quoteCommands.has("ordered-list")).toBe(false);
});

test("command dispatch kind classification remains stable", () => {
  expect(getPostRichTextCommandKind("paragraph")).toBe("block-format");
  expect(getPostRichTextCommandKind("heading-6")).toBe("block-format");
  expect(getPostRichTextCommandKind("type-paragraph")).toBe("block-type");
  expect(getPostRichTextCommandKind("ordered-list")).toBe("list-format");
  expect(getPostRichTextCommandKind("align-left")).toBe("alignment");
});
