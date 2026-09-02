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

test("TagInput ignores a commit whose draft is blank or whitespace only", () => {
  const container = mount(<Harness initial={["keep"]} />);
  const input = container.querySelector("input") as HTMLInputElement;
  typeInto(input, "   ");
  pressKey(input, "Enter");
  expect(val(container)).toBe("keep");
  expect(input.value).toBe("");
});

test("TagInput commits the draft when the input blurs with content", () => {
  const container = mount(<Harness />);
  const input = container.querySelector("input") as HTMLInputElement;
  typeInto(input, "blur-tag");
  React.act(() => {
    input.dispatchEvent(new FocusEvent("focusout", { bubbles: true }));
  });
  expect(val(container)).toBe("blur-tag");
  expect(input.value).toBe("");
});

test("TagInput does not commit a blank draft on blur", () => {
  const container = mount(<Harness initial={["keep"]} />);
  const input = container.querySelector("input") as HTMLInputElement;
  React.act(() => {
    input.dispatchEvent(new FocusEvent("focusout", { bubbles: true }));
  });
  expect(val(container)).toBe("keep");
});

test("TagInput commits with comma and trims + length-caps the tag", () => {
  const container = mount(<Harness />);
  const input = container.querySelector("input") as HTMLInputElement;
  typeInto(input, "  spaced  ");
  pressKey(input, ",");
  expect(val(container)).toBe("spaced");
  typeInto(input, "x".repeat(60));
  pressKey(input, ",");
  const tags = val(container).split("|");
  expect(tags[1].length).toBe(48);
});

test("TagInput drops duplicates and rejects commits past the capacity", () => {
  const container = mount(<Harness initial={["alpha"]} max={1} />);
  const input = container.querySelector("input") as HTMLInputElement;
  typeInto(input, "ALPHA");
  pressKey(input, "Enter");
  expect(val(container)).toBe("alpha");
  // At capacity now: commit is refused and the input is disabled.
  typeInto(input, "beta");
  pressKey(input, "Enter");
  expect(val(container)).toBe("alpha");
  expect((input as HTMLInputElement).disabled).toBe(true);
});

test("TagInput rejects a duplicate tag when the list is not at capacity", () => {
  const container = mount(<Harness initial={["alpha", "beta"]} />);
  const input = container.querySelector("input") as HTMLInputElement;
  typeInto(input, "BETA");
  pressKey(input, "Enter");
  expect(val(container)).toBe("alpha|beta");
  expect((input as HTMLInputElement).disabled).toBe(false);
});

test("TagInput removes a chip via Backspace on an empty field", () => {
  const container = mount(<Harness initial={["first", "second"]} />);
  const input = container.querySelector("input") as HTMLInputElement;
  pressKey(input, "Backspace");
  expect(val(container)).toBe("first");
});

test("TagInput removes a chip via its remove button", () => {
  const container = mount(<Harness initial={["first", "second"]} />);
  const removeButton = Array.from(container.querySelectorAll("button")).find(
    (button) => button.getAttribute("aria-label") === "Remove tag second"
  );
  React.act(() => {
    removeButton?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
  });
  expect(val(container)).toBe("first");
});
