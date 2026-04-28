import { expect, test } from "vitest";

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

test("resolves type commands to block transforms", () => {
  expect(resolveBlockTransformForCommand("type-section")).toEqual({
    type: "writing-canvas",
  });
  expect(resolveBlockTransformForCommand("type-paragraph")).toEqual({
    type: "paragraph",
  });
  expect(resolveBlockTransformForCommand("type-heading")).toEqual({
    type: "heading",
    attrs: { level: 2 },
  });
  expect(resolveBlockTransformForCommand("type-quote")).toEqual({
    type: "quote",
  });
});

test("ignores inline commands that do not map to block transforms", () => {
  expect(resolveBlockTransformForCommand("bold")).toBeNull();
  expect(resolveBlockTransformForCommand("inline-code")).toBeNull();
  expect(resolveBlockTransformForCommand("bullet-list")).toBeNull();
  expect(resolveBlockTransformForCommand("ordered-list")).toBeNull();
});
