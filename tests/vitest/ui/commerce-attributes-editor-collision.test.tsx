// @vitest-environment happy-dom

// TASK-575: the AttributesEditor must check the rename predicate BEFORE
// emitting. Renaming onto an existing attribute key must not fire `onRenameKey`
// (draft untouched) and must render an inline collision message; a subsequent
// valid rename clears the message and emits normally.

import React from "react";
import { createRoot } from "react-dom/client";
import { afterEach, expect, test, vi } from "vitest";

import { AttributesEditor } from "../../../core/admin/ui/commerce/components/AttributesEditor";

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const mount = () => {
  const container = document.createElement("div");
  document.body.appendChild(container);
  const root = createRoot(container);
  const onSet = vi.fn();
  const onRemove = vi.fn();
  const onRenameKey = vi.fn();
  React.act(() => {
    root.render(
      <AttributesEditor
        attributes={{ color: "oak", size: "L" }}
        onSet={onSet}
        onRemove={onRemove}
        onRenameKey={onRenameKey}
      />
    );
  });
  return {
    container,
    onSet,
    onRemove,
    onRenameKey,
    cleanup: () => {
      React.act(() => root.unmount());
      container.remove();
    },
  };
};

const setValue = (input: Element | null, value: string) => {
  const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, "value")?.set;
  React.act(() => {
    setter?.call(input, value);
    input?.dispatchEvent(new Event("input", { bubbles: true }));
    input?.dispatchEvent(new Event("change", { bubbles: true }));
  });
};

afterEach(() => {
  document.body.innerHTML = "";
});

test("renaming onto an existing key emits nothing and shows an inline message", () => {
  const view = mount();
  try {
    const colorKeyInput = view.container.querySelector('[aria-label="Attribute key for color"]');
    expect(colorKeyInput).toBeTruthy();
    setValue(colorKeyInput, "size");

    expect(view.onRenameKey).not.toHaveBeenCalled();
    expect(view.onSet).not.toHaveBeenCalled();
    expect(view.onRemove).not.toHaveBeenCalled();

    const alert = view.container.querySelector('[role="alert"]');
    expect(alert).toBeTruthy();
    expect(alert?.textContent).toContain('Attribute key "size" already exists.');
    expect(alert?.textContent).toContain("size");
  } finally {
    view.cleanup();
  }
});

test("a trim-only rename of the same key is a no-op success (emits)", () => {
  const view = mount();
  try {
    const colorKeyInput = view.container.querySelector('[aria-label="Attribute key for color"]');
    setValue(colorKeyInput, " color ");

    expect(view.onRenameKey).toHaveBeenCalledWith("color", " color ");
    expect(view.container.querySelector('[role="alert"]')).toBeNull();
  } finally {
    view.cleanup();
  }
});

test("a valid rename after a collision clears the message and emits", () => {
  const view = mount();
  try {
    const colorKeyInput = view.container.querySelector('[aria-label="Attribute key for color"]');
    setValue(colorKeyInput, "size");
    expect(view.container.querySelector('[role="alert"]')).toBeTruthy();
    expect(view.onRenameKey).not.toHaveBeenCalled();

    setValue(colorKeyInput, "finish");
    expect(view.onRenameKey).toHaveBeenCalledWith("color", "finish");
    expect(view.container.querySelector('[role="alert"]')).toBeNull();
  } finally {
    view.cleanup();
  }
});

test("editing an existing attribute value emits onSet", () => {
  const view = mount();
  try {
    const valueInput = view.container.querySelector('[aria-label="Attribute value for color"]');
    setValue(valueInput, "dark oak");
    expect(view.onSet).toHaveBeenCalledWith("color", "dark oak");
  } finally {
    view.cleanup();
  }
});

test("typing a key with a draft value auto-commits the pair and resets the draft row", () => {
  const view = mount();
  try {
    const valueInput = view.container.querySelector('[aria-label="New attribute value"]');
    setValue(valueInput, "L");
    const keyInput = view.container.querySelector('[aria-label="New attribute key"]');
    setValue(keyInput, "size");
    expect(view.onSet).toHaveBeenCalledWith("size", "L");
    expect((keyInput as HTMLInputElement).value).toBe("");
    expect((valueInput as HTMLInputElement).value).toBe("");
  } finally {
    view.cleanup();
  }
});

test("typing a value without a draft key stores the draft until the Add button commits", () => {
  const view = mount();
  try {
    const valueInput = view.container.querySelector('[aria-label="New attribute value"]');
    setValue(valueInput, "XL");
    const keyInput = view.container.querySelector('[aria-label="New attribute key"]');
    setValue(keyInput, "size");
    expect(view.onSet).toHaveBeenCalledWith("size", "XL");
  } finally {
    view.cleanup();
  }
});

test("Add attribute button commits the draft pair and fires onSet", () => {
  const view = mount();
  try {
    const keyInput = view.container.querySelector('[aria-label="New attribute key"]');
    const valueInput = view.container.querySelector('[aria-label="New attribute value"]');
    setValue(keyInput, "material");
    setValue(valueInput, "walnut");
    const addButton = view.container.querySelector('[aria-label="Add attribute"]') as HTMLElement;
    React.act(() => {
      addButton.dispatchEvent(new MouseEvent("click", { bubbles: true, cancelable: true }));
    });
    expect(view.onSet).toHaveBeenCalledWith("material", "walnut");
    expect((keyInput as HTMLInputElement).value).toBe("");
  } finally {
    view.cleanup();
  }
});
