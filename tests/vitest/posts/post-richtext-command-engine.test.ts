// @vitest-environment happy-dom

import { expect, test } from "vitest";

import {
  applyCommandToBlockTags,
  applyAlignmentToBlocks,
  applyCommandToRootHtmlWithoutBlocks,
  executeBlockCommandOnBlocks,
  getPostRichTextCommandKind,
  normalizePostRichTextBlockTag,
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

test("root html without block wrappers can be normalized for paragraph and quote commands", () => {
  expect(applyCommandToRootHtmlWithoutBlocks("quote", "Plain text node")).toBe(
    "<blockquote>Plain text node</blockquote>"
  );
  expect(applyCommandToRootHtmlWithoutBlocks("paragraph", "Plain text node")).toBe(
    "<p>Plain text node</p>"
  );
  expect(applyCommandToRootHtmlWithoutBlocks("quote", "")).toBe("<blockquote><br></blockquote>");
});

test("root html normalization skips values that already contain block tags", () => {
  expect(applyCommandToRootHtmlWithoutBlocks("quote", "<p>Body</p>")).toBeNull();
  expect(applyCommandToRootHtmlWithoutBlocks("paragraph", "<blockquote>Body</blockquote>")).toBeNull();
});

test("root html normalization wraps list commands and rejects unsupported commands", () => {
  expect(applyCommandToRootHtmlWithoutBlocks("bullet-list", "Plain text node")).toBe(
    "<ul><li>Plain text node</li></ul>"
  );
  expect(applyCommandToRootHtmlWithoutBlocks("ordered-list", "")).toBe("<ol><li><br></li></ol>");
  expect(applyCommandToRootHtmlWithoutBlocks("align-center", "Plain text node")).toBeNull();
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

test("block tag normalization maps editor divs to paragraphs", () => {
  expect(normalizePostRichTextBlockTag("div")).toBe("p");
  expect(normalizePostRichTextBlockTag("p")).toBe("p");
  expect(normalizePostRichTextBlockTag("blockquote")).toBe("blockquote");
  expect(normalizePostRichTextBlockTag(undefined)).toBeNull();
  expect(normalizePostRichTextBlockTag(null)).toBeNull();
  expect(normalizePostRichTextBlockTag("section")).toBeNull();
});

test("applyAlignmentToBlocks updates selected blocks and rejects invalid alignments", () => {
  document.body.innerHTML = `
    <div id="root">
      <p>One</p>
      <blockquote>Two</blockquote>
    </div>
  `;

  const blocks = Array.from(document.querySelectorAll<HTMLElement>("p, blockquote"));
  expect(applyAlignmentToBlocks(blocks, "center")).toBe(true);
  expect(blocks[0]?.getAttribute("data-align")).toBe("center");
  expect(blocks[1]?.getAttribute("data-align")).toBe("center");
  expect(applyAlignmentToBlocks(blocks, "invalid" as never)).toBe(false);
  expect(applyAlignmentToBlocks([], "left")).toBe(false);
});

test("executeBlockCommandOnBlocks handles list wrapping, unwrapping, quote toggles, and heading transforms", () => {
  document.body.innerHTML = `
    <div id="root">
      <p>Alpha</p>
      <p>Beta</p>
      <blockquote>Quote</blockquote>
      <ul data-align="right">
        <li>First</li>
        <li>Second</li>
      </ul>
    </div>
  `;

  const root = document.getElementById("root");
  if (!(root instanceof HTMLDivElement)) {
    throw new Error("missing root");
  }

  const firstParagraphs = Array.from(root.querySelectorAll("p")).slice(0, 2);
  expect(executeBlockCommandOnBlocks("bullet-list", firstParagraphs)).toBe(true);
  const list = root.querySelector("ul");
  expect(list?.textContent).toContain("Alpha");
  expect(list?.textContent).toContain("Beta");

  const wrappedList = root.querySelector("ul");
  if (!(wrappedList instanceof HTMLElement)) {
    throw new Error("missing wrapped list");
  }
  expect(executeBlockCommandOnBlocks("bullet-list", [wrappedList])).toBe(true);
  const unwrappedParagraphs = Array.from(root.querySelectorAll("p"));
  expect(unwrappedParagraphs.some((node) => node.textContent?.includes("Alpha"))).toBe(true);

  const quoteBlock = root.querySelector("blockquote");
  if (!(quoteBlock instanceof HTMLElement)) {
    throw new Error("missing quote block");
  }
  expect(executeBlockCommandOnBlocks("quote", [quoteBlock])).toBe(true);
  expect(root.querySelector("blockquote")).toBeNull();
  expect(Array.from(root.querySelectorAll("p")).some((node) => node.textContent?.includes("Quote"))).toBe(true);

  const paragraphForHeading = Array.from(root.querySelectorAll("p")).find((node) =>
    node.textContent?.includes("Quote")
  );
  if (!(paragraphForHeading instanceof HTMLElement)) {
    throw new Error("missing paragraph for heading transform");
  }
  expect(executeBlockCommandOnBlocks("heading-4", [paragraphForHeading])).toBe(true);
  expect(root.querySelector("h4")?.textContent).toContain("Quote");
  expect(executeBlockCommandOnBlocks("align-left", [paragraphForHeading])).toBe(false);
});

test("executeBlockCommandOnBlocks converts existing lists into heading blocks", () => {
  document.body.innerHTML = `
    <div id="root">
      <ul data-align="right">
        <li>Alpha</li>
        <li>Beta</li>
      </ul>
    </div>
  `;

  const list = document.querySelector("ul");
  if (!(list instanceof HTMLElement)) {
    throw new Error("missing list");
  }

  expect(executeBlockCommandOnBlocks("heading-2", [list])).toBe(true);

  const heading = document.querySelector("h2");
  expect(heading?.getAttribute("data-align")).toBe("right");
  expect(heading?.innerHTML).toBe("Alpha<br>Beta");
  expect(document.querySelector("ul")).toBeNull();
});
