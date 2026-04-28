import React from "react";
import { expect, test } from "vitest";

import {
  buildClipboardImageInsertHtml,
  extractClipboardImageFiles,
  resolvePostRichTextCommandKind,
  resolveClipboardPasteMode,
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

test("clipboard helper exports normalize image extraction, insert html, and paste mode", () => {
  const itemImage = new File(["img"], "item-image.png", { type: "image/png" });
  const fileImage = new File(["img"], "fallback-photo.jpg", { type: "image/jpeg" });
  const nonImage = new File(["txt"], "note.txt", { type: "text/plain" });

  expect(
    extractClipboardImageFiles({
      items: [
        { kind: "string", type: "text/plain" },
        { kind: "file", type: "image/png", getAsFile: () => itemImage },
        { kind: "file", type: "image/jpeg", getAsFile: () => null },
      ],
      files: [fileImage],
    })
  ).toEqual([itemImage]);

  expect(
    extractClipboardImageFiles({
      items: [{ kind: "file", type: "image/png", getAsFile: () => null }],
      files: [fileImage, nonImage],
    })
  ).toEqual([fileImage]);

  const html = buildClipboardImageInsertHtml(
    { id: 'media<&>"', url: "https://cdn.test/image?a=1&b=2" },
    "  Poster <alt>  "
  );
  expect(html).toContain('data-media-id="media&lt;&amp;&gt;&quot;"');
  expect(html).toContain('alt="Poster &lt;alt&gt;"');
  expect(html).toContain('data-wrap="none"');
  expect(html).toContain('data-width="50"');
  expect(html).toContain('data-margin="md"');

  expect(
    resolveClipboardPasteMode({
      normalizedHtml: "<p>Rich</p>",
      imageFilesCount: 0,
    })
  ).toBe("rich-text");
  expect(
    resolveClipboardPasteMode({
      normalizedHtml: "",
      imageFilesCount: 0,
      hasPostPasteDirectives: true,
    })
  ).toBe("rich-text");
  expect(
    resolveClipboardPasteMode({
      normalizedHtml: "",
      imageFilesCount: 2,
    })
  ).toBe("images");
  expect(
    resolveClipboardPasteMode({
      normalizedHtml: "",
      imageFilesCount: 0,
    })
  ).toBe("none");
});
