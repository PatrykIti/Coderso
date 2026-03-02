import { expect, test } from "bun:test";

import {
  resolvePostRichTextCommandKind,
  resolvePostRichTextShortcutCommand,
} from "../../../core/admin/ui/posts/editor/richtext/PostRichTextAdapter";

test("shortcut resolver maps supported editor shortcuts to richtext commands", () => {
  expect(resolvePostRichTextShortcutCommand({ key: "b", ctrlKey: true })).toBe("bold");
  expect(resolvePostRichTextShortcutCommand({ key: "i", metaKey: true })).toBe("italic");
  expect(resolvePostRichTextShortcutCommand({ key: "u", ctrlKey: true })).toBe("underline");
  expect(resolvePostRichTextShortcutCommand({ key: "k", metaKey: true })).toBe("link");
  expect(resolvePostRichTextShortcutCommand({ key: "7", ctrlKey: true, shiftKey: true })).toBe(
    "ordered-list"
  );
  expect(resolvePostRichTextShortcutCommand({ key: "8", metaKey: true, shiftKey: true })).toBe(
    "bullet-list"
  );
});

test("shortcut resolver ignores unsupported or modifier-less shortcuts", () => {
  expect(resolvePostRichTextShortcutCommand({ key: "b" })).toBeNull();
  expect(resolvePostRichTextShortcutCommand({ key: "x", ctrlKey: true })).toBeNull();
  expect(resolvePostRichTextShortcutCommand({ key: "7", ctrlKey: true })).toBeNull();
});

test("adapter dispatch kind resolver is stable for core commands", () => {
  expect(resolvePostRichTextCommandKind("bold")).toBe("native-inline");
  expect(resolvePostRichTextCommandKind("highlight")).toBe("inline-wrapper");
  expect(resolvePostRichTextCommandKind("heading-1")).toBe("block-format");
  expect(resolvePostRichTextCommandKind("type-paragraph")).toBe("block-type");
  expect(resolvePostRichTextCommandKind("ordered-list")).toBe("list-format");
  expect(resolvePostRichTextCommandKind("align-center")).toBe("alignment");
  expect(resolvePostRichTextCommandKind("clear-formatting")).toBe("clear-formatting");
});
