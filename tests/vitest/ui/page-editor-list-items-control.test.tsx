// @vitest-environment happy-dom

import React from "react";
import { createRoot } from "react-dom/client";
import { afterEach, expect, test, vi } from "vitest";

import { ListItemsControl } from "../../../core/admin/ui/pages/editorControls/ListItemsControl";

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
    rerender: (next: React.ReactNode) => {
      React.act(() => {
        root.render(next);
      });
    },
    cleanup: () => {
      React.act(() => {
        root.unmount();
      });
      container.remove();
    },
  };
};

const click = (element: Element | null) => {
  expect(element).toBeTruthy();
  React.act(() => {
    element?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
  });
};

const input = (container: ParentNode, ariaLabel: string) => {
  const field = container.querySelector(`input[aria-label="${ariaLabel}"]`);
  expect(field).toBeTruthy();
  return field as HTMLInputElement;
};

/** Controlled-input change: the native value setter keeps React's onChange firing. */
const setInputValue = (field: HTMLInputElement, value: string) => {
  React.act(() => {
    const valueSetter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")?.set;
    valueSetter?.call(field, value);
    field.dispatchEvent(new Event("input", { bubbles: true }));
  });
};

const buttonByText = (container: ParentNode, text: string) =>
  Array.from(container.querySelectorAll("button")).find((candidate) =>
    candidate.textContent?.includes(text)
  ) ?? null;

afterEach(() => {
  document.body.innerHTML = "";
});

test("list items control renders stored shapes as rows: plain strings and link items", () => {
  const view = mount(
    <ListItemsControl
      label="Items"
      value={["Docs", { label: "Privacy", href: "/privacy" }]}
      onChange={vi.fn()}
    />
  );
  try {
    expect(view.container.querySelector('[data-page-editor-control="list-items"]')).toBeTruthy();
    expect(view.container.querySelectorAll("[data-page-editor-list-item-row]")).toHaveLength(2);
    expect(input(view.container, "Item 1 label").value).toBe("Docs");
    expect(input(view.container, "Item 1 link URL").value).toBe("");
    expect(input(view.container, "Item 2 label").value).toBe("Privacy");
    expect(input(view.container, "Item 2 link URL").value).toBe("/privacy");
  } finally {
    view.cleanup();
  }
});

test("authoring a link target commits the exact { label, href } stored shape and keeps plain items unchanged", () => {
  const onChange = vi.fn();
  const view = mount(
    <ListItemsControl label="Items" value={["Docs", "Guides"]} onChange={onChange} />
  );
  try {
    setInputValue(input(view.container, "Item 2 link URL"), "/guides");
    expect(onChange).toHaveBeenLastCalledWith(["Docs", { label: "Guides", href: "/guides" }]);

    // Clearing the link target collapses the row back to the legacy string.
    view.rerender(
      <ListItemsControl
        label="Items"
        value={["Docs", { label: "Guides", href: "/guides" }]}
        onChange={onChange}
      />
    );
    setInputValue(input(view.container, "Item 2 link URL"), "");
    expect(onChange).toHaveBeenLastCalledWith(["Docs", "Guides"]);

    // A whitespace-only target never stores a link item.
    setInputValue(input(view.container, "Item 2 link URL"), "   ");
    expect(onChange).toHaveBeenLastCalledWith(["Docs", "Guides"]);
  } finally {
    view.cleanup();
  }
});

test("rows can be added, edited, and removed; label edits keep the link target", () => {
  const onChange = vi.fn();
  const view = mount(
    <ListItemsControl
      label="Items"
      value={[{ label: "Privacy", href: "/privacy" }]}
      onChange={onChange}
    />
  );
  try {
    setInputValue(input(view.container, "Item 1 label"), "Privacy policy");
    expect(onChange).toHaveBeenLastCalledWith([{ label: "Privacy policy", href: "/privacy" }]);

    click(buttonByText(view.container, "Add item"));
    expect(onChange).toHaveBeenLastCalledWith([{ label: "Privacy", href: "/privacy" }, ""]);

    click(view.container.querySelector('button[aria-label="Remove item 1"]'));
    expect(onChange).toHaveBeenLastCalledWith([]);
  } finally {
    view.cleanup();
  }
});
