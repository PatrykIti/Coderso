import { expect, test } from "bun:test";

import {
  buildClipboardImageInsertHtml,
  extractClipboardImageFiles,
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
