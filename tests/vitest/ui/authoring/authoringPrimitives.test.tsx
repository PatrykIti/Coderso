// @vitest-environment happy-dom

import React from "react";
import { createRoot } from "react-dom/client";
import { afterEach, expect, test, vi } from "vitest";

import { InlineEditWrapper, selectionBorder } from "../../../../core/admin/ui/authoring";

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const mount = (node: React.ReactNode) => {
  const container = document.createElement("div");
  document.body.appendChild(container);
  const root = createRoot(container);

  React.act(() => {
    root.render(node);
  });

  return {
    container,
    cleanup: () => {
      React.act(() => {
        root.unmount();
      });
      container.remove();
    },
  };
};

afterEach(() => {
  document.body.innerHTML = "";
  vi.clearAllMocks();
});

test("InlineEditWrapper commits on Enter and restores on Escape", () => {
  const onCommit = vi.fn();
  const view = mount(
    <InlineEditWrapper value="Original" editable onCommit={onCommit} ariaLabel="Title" />
  );

  try {
    const textbox = view.container.querySelector('[role="textbox"]') as HTMLElement;
    expect(textbox).not.toBeNull();

    React.act(() => {
      textbox.focus();
      textbox.textContent = "Updated";
      textbox.blur();
    });

    expect(onCommit).toHaveBeenCalledWith("Updated");

    React.act(() => {
      textbox.focus();
      textbox.textContent = "Draft";
      textbox.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true }));
    });

    expect(onCommit).toHaveBeenCalledTimes(1);
    expect(textbox.textContent).toBe("Original");
  } finally {
    view.cleanup();
  }
});

test("InlineEditWrapper renders read-only markup when disabled", () => {
  const onCommit = vi.fn();
  const view = mount(<InlineEditWrapper value="Read only" editable={false} onCommit={onCommit} />);

  try {
    expect(view.container.querySelector('[role="textbox"]')).toBeNull();
    expect(view.container.textContent).toContain("Read only");
  } finally {
    view.cleanup();
  }
});

test("InlineEditWrapper does not persist placeholder text for empty values", () => {
  const onCommit = vi.fn();
  const view = mount(
    <InlineEditWrapper value="" editable onCommit={onCommit} placeholder="Empty" />
  );

  try {
    const textbox = view.container.querySelector('[role="textbox"]') as HTMLElement;
    expect(textbox).not.toBeNull();
    expect(textbox.textContent).toBe("");

    React.act(() => {
      textbox.focus();
      textbox.blur();
    });

    expect(onCommit).not.toHaveBeenCalled();
  } finally {
    view.cleanup();
  }
});

test("selectionBorder emits one selected ring token", () => {
  expect(selectionBorder({ level: "item", selected: true })).toContain("ring-2");
  expect(selectionBorder({ level: "container", selected: false })).toContain("ring-transparent");
});
