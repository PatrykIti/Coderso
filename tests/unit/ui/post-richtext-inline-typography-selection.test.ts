import { expect, test } from "bun:test";

import { applyInlineTypographySelection } from "../../../core/admin/ui/posts/editor/richtext/PostRichTextAdapter";

test("applyInlineTypographySelection updates list item and removes nested typography span", () => {
  if (typeof window === "undefined" || typeof document === "undefined") {
    return;
  }
  const selection = window.getSelection?.();
  if (!selection) {
    return;
  }

  document.body.innerHTML = `
    <div id="root" contenteditable="true">
      <ul>
        <li>First</li>
        <li><span data-text-scale="xl">Second</span></li>
      </ul>
    </div>
  `;

  const root = document.getElementById("root") as HTMLElement | null;
  if (!root) {
    throw new Error("missing root");
  }

  const span = root.querySelector("li span");
  if (!span || !span.firstChild || !(span.firstChild instanceof Text)) {
    throw new Error("missing typography span text");
  }

  const range = document.createRange();
  range.setStart(span.firstChild, 0);
  range.setEnd(span.firstChild, span.firstChild.nodeValue?.length ?? 0);
  selection.removeAllRanges();
  selection.addRange(range);

  const applied = applyInlineTypographySelection(root, { "data-text-scale": "sm" });
  expect(applied).toBe(true);

  const listItems = root.querySelectorAll("li");
  expect(listItems[1]?.getAttribute("data-text-scale")).toBe("sm");
  expect(root.innerHTML).toContain('data-text-scale="sm"');
  expect(root.innerHTML).not.toContain('data-text-scale="xl"');
});
