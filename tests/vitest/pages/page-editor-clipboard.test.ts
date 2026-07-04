import { expect, test } from "vitest";

import {
  createPageBlockV2,
  createPageSectionV2,
  type PageDocumentV2,
} from "../../../core/services/pages/pageDocumentV2";
import {
  PAGE_EDITOR_CLIPBOARD_MIME,
  insertSectionAfter,
  parsePageEditorClipboardFragment,
  serializePageEditorClipboardPayload,
} from "../../../core/services/pages/pageEditorClipboard";

test("Page editor clipboard serializes and parses block fragments with fresh ids", () => {
  const block = createPageBlockV2("heading", {
    id: "blk-original",
    props: {
      text: "Copied heading",
      level: "h2",
      align: "left",
      marks: [
        { type: "bold", from: 0, to: 6 },
        { type: "link", from: 7, to: 14, href: "/safe" },
      ],
    },
    style: {
      backgroundType: "image",
      backgroundImage: "/uploads/hero.jpg",
      borderWidth: 2,
      borderStyle: "dashed",
    },
  });

  const serialized = serializePageEditorClipboardPayload("block", block);
  expect(JSON.parse(serialized)).toMatchObject({
    clip: PAGE_EDITOR_CLIPBOARD_MIME,
    kind: "block",
  });

  const fragment = parsePageEditorClipboardFragment(serialized);
  expect(fragment?.kind).toBe("block");
  if (fragment?.kind !== "block") return;
  expect(fragment.block.id).not.toBe("blk-original");
  expect(fragment.block.type).toBe("heading");
  expect(fragment.block.props.text).toBe("Copied heading");
  expect(fragment.block.props.marks).toEqual([
    { type: "bold", from: 0, to: 6 },
    { type: "link", from: 7, to: 14, href: "/safe" },
  ]);
  expect(fragment.block.style).toMatchObject({
    backgroundType: "image",
    backgroundImage: "/uploads/hero.jpg",
    borderWidth: 2,
    borderStyle: "dashed",
  });
});

test("Page editor clipboard parses sections, mints nested ids, and inserts after selection", () => {
  const section = createPageSectionV2("content", {
    id: "sec-original",
    name: "Original section",
    blocks: [createPageBlockV2("text", { id: "blk-original", props: { text: "Copy" } })],
  });
  const fragment = parsePageEditorClipboardFragment(
    serializePageEditorClipboardPayload("section", section)
  );
  expect(fragment?.kind).toBe("section");
  if (fragment?.kind !== "section") return;

  expect(fragment.section.id).not.toBe("sec-original");
  expect(fragment.section.name).toBe("Original section copy");
  expect(fragment.section.blocks[0]?.id).not.toBe("blk-original");

  const document: PageDocumentV2 = {
    schemaVersion: 2,
    breakpoints: ["desktop", "tablet", "mobile"],
    seo: {},
    settings: { template: "page-v2", showInNav: true },
    sections: [
      createPageSectionV2("hero", { id: "sec-a", name: "A" }),
      createPageSectionV2("cta", { id: "sec-b", name: "B" }),
    ],
  };
  expect(
    insertSectionAfter(document, "sec-a", fragment.section).sections.map((entry) => entry.id)
  ).toEqual(["sec-a", fragment.section.id, "sec-b"]);
  expect(
    insertSectionAfter(document, null, fragment.section).sections.map((entry) => entry.id)
  ).toEqual(["sec-a", "sec-b", fragment.section.id]);
});

test("Page editor clipboard rejects malformed or unsafe fragments", () => {
  expect(parsePageEditorClipboardFragment("not json")).toBeNull();
  expect(
    parsePageEditorClipboardFragment(
      JSON.stringify({ clip: "text/plain", kind: "block", data: {} })
    )
  ).toBeNull();
  expect(
    parsePageEditorClipboardFragment(
      JSON.stringify({
        clip: PAGE_EDITOR_CLIPBOARD_MIME,
        kind: "block",
        data: {
          id: "blk-bad",
          type: "text",
          props: {
            text: "Bad",
            format: "plain",
            align: "left",
            marks: [{ type: "color", from: 0, to: 3, color: "url(javascript:alert(1))" }],
          },
        },
      })
    )
  ).toBeNull();
});
