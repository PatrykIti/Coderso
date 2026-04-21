import React from "react";
import { expect, test } from "vitest";

import {
  buildClipboardImageInsertHtml,
  extractClipboardImageFiles,
  resolveClipboardPasteMode,
} from "../../../core/admin/ui/posts/editor/richtext/PostRichTextAdapter";

test("clipboard image helper extracts only image files from items", () => {
  const imageFile = new File(["img"], "clipboard.png", { type: "image/png" });
  const textFile = new File(["text"], "note.txt", { type: "text/plain" });

  const files = extractClipboardImageFiles({
    items: [
      {
        kind: "file",
        type: "text/plain",
        getAsFile: () => textFile,
      },
      {
        kind: "file",
        type: "image/png",
        getAsFile: () => imageFile,
      },
    ],
  });

  expect(files).toHaveLength(1);
  expect(files[0]?.name).toBe("clipboard.png");
});

test("clipboard image helper falls back to clipboard files and handles missing clipboard", () => {
  const imageFile = new File(["img"], "fallback-image.png", { type: "image/png" });
  const textFile = new File(["text"], "note.txt", { type: "text/plain" });

  expect(extractClipboardImageFiles(null)).toEqual([]);

  const files = extractClipboardImageFiles({
    items: [
      {
        kind: "string",
        type: "image/png",
        getAsFile: () => null,
      },
    ],
    files: [textFile, imageFile],
  });

  expect(files).toHaveLength(1);
  expect(files[0]?.name).toBe("fallback-image.png");
});

test("clipboard image helper renders safe html payload", () => {
  const html = buildClipboardImageInsertHtml(
    {
      id: "media-1",
      url: "/media/example.png",
    },
    `Alt "quoted" <text>`
  );

  expect(html).toContain('src="/media/example.png"');
  expect(html).toContain('data-media-id="media-1"');
  expect(html).toContain('alt="Alt &quot;quoted&quot; &lt;text&gt;"');
  expect(html).toContain('data-wrap="none"');
  expect(html).toContain('data-width="50"');
  expect(html).toContain('data-margin="md"');
  expect(html).toContain('loading="lazy"');
});

test("clipboard image helper respects custom layout and trims long alt text", () => {
  const html = buildClipboardImageInsertHtml(
    {
      id: "media-2",
      url: "/media/custom.png",
    },
    ` ${"a".repeat(600)} `,
    {
      wrap: "left",
      widthPercent: 66,
      marginPreset: "lg",
    }
  );

  expect(html).toContain('data-wrap="left"');
  expect(html).toContain('data-width="75"');
  expect(html).toContain('data-margin="lg"');
  expect(html).toContain(`alt="${"a".repeat(500)}"`);
});

test("clipboard mode prefers rich-text when both text/html and image files exist", () => {
  const mode = resolveClipboardPasteMode({
    normalizedHtml: "<p>Heading from clipboard</p>",
    imageFilesCount: 1,
  });

  expect(mode).toBe("rich-text");
});

test("clipboard mode falls back to image upload when normalized text payload is empty", () => {
  const mode = resolveClipboardPasteMode({
    normalizedHtml: "",
    imageFilesCount: 2,
  });

  expect(mode).toBe("images");
});

test("clipboard mode treats directives as rich text and returns none for empty payloads", () => {
  expect(
    resolveClipboardPasteMode({
      normalizedHtml: "   ",
      imageFilesCount: 0,
      hasPostPasteDirectives: true,
    })
  ).toBe("rich-text");

  expect(
    resolveClipboardPasteMode({
      normalizedHtml: "",
      imageFilesCount: 0,
    })
  ).toBe("none");
});
