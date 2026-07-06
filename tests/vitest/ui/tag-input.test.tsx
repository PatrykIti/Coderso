// @vitest-environment happy-dom

import React from "react";
import { createRoot } from "react-dom/client";
import { afterEach, expect, test } from "vitest";

import { TagInput } from "../../../core/admin/ui/media/TagInput";

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

let cleanupFns: Array<() => void> = [];

afterEach(() => {
  cleanupFns.forEach((fn) => fn());
  cleanupFns = [];
});

function Harness({ initial = [], max }: { initial?: string[]; max?: number }) {
  const [value, setValue] = React.useState<string[]>(initial);
  return (
    <div>
      <TagInput value={value} onChange={setValue} max={max} />
      <output data-testid="count">{value.length}</output>
      <output data-testid="value">{value.join("|")}</output>
    </div>
  );
}

const mount = (node: React.ReactNode) => {
  const container = document.createElement("div");
  document.body.appendChild(container);
  const root = createRoot(container);
  React.act(() => {
    root.render(node);
  });
  cleanupFns.push(() => {
    React.act(() => root.unmount());
    container.remove();
  });
  return container;
};

const typeInto = (input: HTMLInputElement, value: string) => {
  const descriptor = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value");
  React.act(() => {
    descriptor?.set?.call(input, value);
    input.dispatchEvent(new Event("input", { bubbles: true }));
  });
};

const pressKey = (input: HTMLInputElement, key: string) => {
  React.act(() => {
    input.dispatchEvent(new KeyboardEvent("keydown", { key, bubbles: true }));
  });
};

const val = (container: ParentNode) =>
  container.querySelector('[data-testid="value"]')?.textContent ?? "";

test("TagInput commits a tag on Enter and clears the draft", () => {
  const container = mount(<Harness />);
  const input = container.querySelector("input") as HTMLInputElement;
  typeInto(input, "brand");
  pressKey(input, "Enter");
  expect(val(container)).toBe("brand");
  expect(input.value).toBe("");
});

test("TagInput dedupes case-insensitively", () => {
  const container = mount(<Harness initial={["Brand"]} />);
  const input = container.querySelector("input") as HTMLInputElement;
  typeInto(input, "brand");
  pressKey(input, "Enter");
  expect(val(container)).toBe("Brand");
});

test("TagInput removes the last chip on Backspace when the draft is empty", () => {
  const container = mount(<Harness initial={["one", "two"]} />);
  const input = container.querySelector("input") as HTMLInputElement;
  pressKey(input, "Backspace");
  expect(val(container)).toBe("one");
});

test("TagInput caps the number of tags at max", () => {
  const container = mount(<Harness initial={["a", "b"]} max={2} />);
  const input = container.querySelector("input") as HTMLInputElement;
  expect(input.disabled).toBe(true);
  // Even a comma commit cannot exceed the cap.
  typeInto(input, "c");
  pressKey(input, ",");
  expect(val(container)).toBe("a|b");
});

test("TagInput removes a chip via its remove button", () => {
  const container = mount(<Harness initial={["keep", "drop"]} />);
  const removeButtons = container.querySelectorAll('button[aria-label^="Remove tag"]');
  const dropButton = Array.from(removeButtons).find((b) =>
    b.getAttribute("aria-label")?.includes("drop")
  ) as HTMLButtonElement;
  React.act(() => {
    dropButton.dispatchEvent(new MouseEvent("click", { bubbles: true }));
  });
  expect(val(container)).toBe("keep");
});
