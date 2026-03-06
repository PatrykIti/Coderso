import { expect, test } from "vitest";

import { resolveInlineWrapperTextRange } from "../../../core/admin/ui/posts/editor/richtext/PostRichTextAdapter";

test("resolveInlineWrapperTextRange selects the token around the caret", () => {
  expect(resolveInlineWrapperTextRange("hello world", 1)).toEqual({ start: 0, end: 5 });
  expect(resolveInlineWrapperTextRange("hello world", 6)).toEqual({ start: 6, end: 11 });
  expect(resolveInlineWrapperTextRange("hello world", 0)).toEqual({ start: 0, end: 5 });
});

test("resolveInlineWrapperTextRange prefers the previous token at whitespace", () => {
  expect(resolveInlineWrapperTextRange("hello world", 5)).toEqual({ start: 0, end: 5 });
});

test("resolveInlineWrapperTextRange returns null when no token exists", () => {
  expect(resolveInlineWrapperTextRange("", 0)).toBeNull();
  expect(resolveInlineWrapperTextRange("   ", 1)).toBeNull();
});

test("resolveInlineWrapperTextRange falls back to nearest token around whitespace", () => {
  expect(resolveInlineWrapperTextRange("hello world ", 12)).toEqual({ start: 6, end: 11 });
  expect(resolveInlineWrapperTextRange("  hello", 0)).toEqual({ start: 2, end: 7 });
});
