// @vitest-environment happy-dom

import { expect, test } from "vitest";

import {
  applyCommandToBlockTags,
  executeBlockCommandOnBlocks,
} from "../../../core/admin/ui/posts/editor/richtext/postRichTextCommandEngine";

const bodyBlock = (tag: string, html = "", attrs: Record<string, string> = {}) => {
  const element = document.createElement(tag);
  element.innerHTML = html;
  for (const [name, value] of Object.entries(attrs)) {
    element.setAttribute(name, value);
  }
  document.body.appendChild(element);
  return element;
};

test("executeBlockCommandOnBlocks returns false for empty block selections", () => {
  expect(executeBlockCommandOnBlocks("bullet-list", [])).toBe(false);
  expect(executeBlockCommandOnBlocks("quote", [])).toBe(false);
});

test("applyCommandToBlockTags returns an empty array for empty tag lists", () => {
  expect(applyCommandToBlockTags("paragraph", [])).toEqual([]);
  expect(applyCommandToBlockTags("bullet-list", [])).toEqual([]);
});

test("unwrapListToParagraphs converts a list without items to a single paragraph with a break", () => {
  const list = bodyBlock("ul", "<span>loose text</span>");
  const result = executeBlockCommandOnBlocks("paragraph", [list]);
  expect(result).toBe(true);
  expect(document.body.contains(list)).toBe(false);
  const paragraphs = Array.from(document.body.querySelectorAll("p"));
  expect(paragraphs.length).toBe(1);
  expect(paragraphs[0]?.innerHTML).toBe("<br>");
  document.body.innerHTML = "";
});

test("unwrapListToParagraphs carries the inherited alignment into each paragraph", () => {
  const list = bodyBlock("ol", "<li>One</li><li>Two</li>", { "data-align": "center" });
  executeBlockCommandOnBlocks("paragraph", [list]);
  const paragraphs = Array.from(document.body.querySelectorAll("p"));
  expect(paragraphs.length).toBe(2);
  expect(paragraphs.every((p) => p.getAttribute("data-align") === "center")).toBe(true);
  expect(paragraphs[0]?.innerHTML).toBe("One");
  expect(paragraphs[1]?.innerHTML).toBe("Two");
  document.body.innerHTML = "";
});

test("wrapBlocksAsList merges nested list children into a new list and carries alignment", () => {
  const existingList = bodyBlock("ul", "<li>Nested one</li><li>Nested two</li>", {
    "data-align": "right",
  });
  const paragraph = bodyBlock("p", "Plain");
  const result = executeBlockCommandOnBlocks("bullet-list", [existingList, paragraph]);
  expect(result).toBe(true);
  const nextList = document.body.querySelector("ul");
  expect(nextList?.getAttribute("data-align")).toBe("right");
  expect(Array.from(nextList?.children ?? []).map((li) => li.innerHTML)).toEqual([
    "Nested one",
    "Nested two",
    "Plain",
  ]);
  expect(document.body.contains(paragraph)).toBe(false);
  document.body.innerHTML = "";
});

test("applyTagToBlock leaves blocks with unrecognized tags untouched", () => {
  const section = bodyBlock("section", "Custom");
  const result = executeBlockCommandOnBlocks("paragraph", [section]);
  expect(result).toBe(true);
  expect(section.tagName.toLowerCase()).toBe("section");
  expect(section.innerHTML).toBe("Custom");
  document.body.innerHTML = "";
});

test("applyTagToBlock replaces an editor div with the same normalized paragraph tag", () => {
  const div = bodyBlock("div", "Editor body");
  const result = executeBlockCommandOnBlocks("paragraph", [div]);
  expect(result).toBe(true);
  const paragraph = document.body.querySelector("p");
  expect(paragraph?.innerHTML).toBe("Editor body");
  expect(document.body.contains(div)).toBe(false);
  document.body.innerHTML = "";
});

test("applyTagToBlock unwraps a list into paragraphs for a paragraph command", () => {
  const list = bodyBlock("ul", "<li>Item</li>");
  const result = executeBlockCommandOnBlocks("paragraph", [list]);
  expect(result).toBe(true);
  expect(Array.from(document.body.querySelectorAll("p")).map((p) => p.innerHTML)).toEqual(["Item"]);
  document.body.innerHTML = "";
});

test("executeBlockCommandOnBlocks converts a list to a non-list block keeping attributes", () => {
  const list = bodyBlock("ul", "<li>Alpha</li><li>Beta</li>", { class: "custom-list" });
  const result = executeBlockCommandOnBlocks("quote", [list]);
  expect(result).toBe(true);
  const quote = document.body.querySelector("blockquote");
  expect(quote?.className).toBe("custom-list");
  expect(quote?.innerHTML).toBe("Alpha<br>Beta");
  document.body.innerHTML = "";
});
