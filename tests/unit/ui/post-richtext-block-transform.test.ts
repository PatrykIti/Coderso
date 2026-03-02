import { expect, test } from "bun:test";

import { resolveBlockTransformForCommand } from "../../../core/admin/ui/posts/editor/richtext/postRichTextBlockTransforms";

test("resolves heading commands to heading block with level", () => {
  expect(resolveBlockTransformForCommand("heading-1")).toEqual({
    type: "heading",
    attrs: { level: 1 },
  });
  expect(resolveBlockTransformForCommand("heading-6")).toEqual({
    type: "heading",
    attrs: { level: 6 },
  });
});

test("resolves paragraph, quote, and code-block commands", () => {
  expect(resolveBlockTransformForCommand("paragraph")).toEqual({ type: "paragraph" });
  expect(resolveBlockTransformForCommand("quote")).toEqual({ type: "quote" });
  expect(resolveBlockTransformForCommand("code-block")).toEqual({ type: "code" });
});

test("ignores inline commands that do not map to block transforms", () => {
  expect(resolveBlockTransformForCommand("bold")).toBeNull();
  expect(resolveBlockTransformForCommand("inline-code")).toBeNull();
  expect(resolveBlockTransformForCommand("bullet-list")).toBeNull();
  expect(resolveBlockTransformForCommand("ordered-list")).toBeNull();
});
