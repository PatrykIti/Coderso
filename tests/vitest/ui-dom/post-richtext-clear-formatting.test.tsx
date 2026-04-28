import React from "react";
// @vitest-environment happy-dom

import { expect, test } from "vitest";

import { clearFormattingInBlocks } from "../../../core/admin/ui/posts/editor/richtext/PostRichTextAdapter";

test("clearFormattingInBlocks removes inline styling and data attributes", () => {
  document.body.innerHTML = `
    <div id="root">
      <p data-align="center" data-text-scale="xl">
        Hello <span data-font="serif">world</span> <s>strike</s>
      </p>
    </div>
  `;

  const block = document.querySelector("p");
  if (!(block instanceof HTMLElement)) {
    throw new Error("missing block");
  }

  clearFormattingInBlocks([block]);

  expect(block.getAttribute("data-align")).toBeNull();
  expect(block.getAttribute("data-text-scale")).toBeNull();
  expect(block.innerHTML).not.toContain("data-font");
  expect(block.innerHTML).not.toContain("<span");
  expect(block.innerHTML).not.toContain("<s");
});
