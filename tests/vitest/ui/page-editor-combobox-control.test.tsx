// @vitest-environment happy-dom

import React from "react";
import { createRoot } from "react-dom/client";
import { afterEach, expect, test, vi } from "vitest";

import {
  ComboboxControl,
  type ComboboxControlOption,
} from "../../../core/admin/ui/pages/editorControls/ComboboxControl";

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const options: ComboboxControlOption[] = [
  { value: "form-contact", label: "Contact" },
  { value: "form-quote", label: "Quote request" },
  { value: "form-newsletter", label: "Newsletter signup" },
];

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

const pressKey = (element: Element | null, key: string) => {
  expect(element).toBeTruthy();
  React.act(() => {
    element?.dispatchEvent(new KeyboardEvent("keydown", { key, bubbles: true }));
  });
};

const trigger = (container: ParentNode) =>
  container.querySelector('button[role="combobox"]') as HTMLButtonElement | null;

const search = (container: ParentNode) =>
  container.querySelector('input[role="searchbox"]') as HTMLInputElement | null;

const optionRows = (container: ParentNode) =>
  Array.from(container.querySelectorAll("[data-page-editor-combobox-option]"));

/** Controlled-input change: the native value setter keeps React's onChange firing. */
const setSearchValue = (input: HTMLInputElement, value: string) => {
  React.act(() => {
    const valueSetter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")?.set;
    valueSetter?.call(input, value);
    input.dispatchEvent(new Event("input", { bubbles: true }));
  });
};

afterEach(() => {
  document.body.innerHTML = "";
});

test("combobox renders the placeholder, opens a searchable listbox, and commits the picked value", () => {
  const onChange = vi.fn();
  const view = mount(
    <ComboboxControl
      label="Form"
      value={null}
      options={options}
      placeholder="Pick a form"
      onChange={onChange}
    />
  );
  try {
    const triggerButton = trigger(view.container)!;
    expect(triggerButton.textContent).toContain("Pick a form");
    expect(triggerButton.getAttribute("aria-expanded")).toBe("false");
    expect(triggerButton.getAttribute("aria-haspopup")).toBe("listbox");

    click(triggerButton);
    expect(trigger(view.container)?.getAttribute("aria-expanded")).toBe("true");
    expect(view.container.querySelector('[role="listbox"]')).toBeTruthy();
    // No "None" row without allowNull.
    expect(optionRows(view.container).map((row) => row.textContent)).toEqual([
      "Contact",
      "Quote request",
      "Newsletter signup",
    ]);

    // Search filters by label (case-insensitive); commit emits the VALUE.
    setSearchValue(search(view.container)!, "quote");
    expect(optionRows(view.container).map((row) => row.textContent)).toEqual(["Quote request"]);
    click(view.container.querySelector('[data-page-editor-combobox-option="form-quote"] button'));
    expect(onChange).toHaveBeenCalledWith("form-quote");
    // Commit closes the popover.
    expect(view.container.querySelector('[role="listbox"]')).toBeNull();
  } finally {
    view.cleanup();
  }
});

test("combobox is keyboard accessible: arrows move the active option, Enter commits, Escape closes", () => {
  const onChange = vi.fn();
  const view = mount(
    <ComboboxControl label="Form" value={null} options={options} onChange={onChange} />
  );
  try {
    click(trigger(view.container));
    const searchInput = search(view.container)!;
    expect(searchInput.getAttribute("aria-activedescendant")).toBeTruthy();

    pressKey(searchInput, "ArrowDown");
    pressKey(searchInput, "ArrowDown");
    pressKey(searchInput, "ArrowUp");
    pressKey(searchInput, "Enter");
    expect(onChange).toHaveBeenCalledWith("form-quote");

    click(trigger(view.container));
    pressKey(search(view.container), "Escape");
    expect(view.container.querySelector('[role="listbox"]')).toBeNull();
    expect(onChange).toHaveBeenCalledTimes(1);

    // End/Home jump to the last/first row.
    click(trigger(view.container));
    pressKey(search(view.container), "End");
    pressKey(search(view.container), "Enter");
    expect(onChange).toHaveBeenLastCalledWith("form-newsletter");
  } finally {
    view.cleanup();
  }
});

test("combobox offers a None row for nullable values that commits null", () => {
  const onChange = vi.fn();
  const view = mount(
    <ComboboxControl
      label="Form"
      value="form-contact"
      options={options}
      allowNull
      onChange={onChange}
    />
  );
  try {
    expect(trigger(view.container)?.textContent).toContain("Contact");
    click(trigger(view.container));
    const rows = optionRows(view.container);
    expect(rows[0]?.getAttribute("data-page-editor-combobox-option")).toBe("none");
    expect(rows[0]?.textContent).toBe("None");
    click(rows[0]!.querySelector("button"));
    expect(onChange).toHaveBeenCalledWith(null);
  } finally {
    view.cleanup();
  }
});

test("combobox marks a dangling stored value instead of displaying it as unset", () => {
  const onChange = vi.fn();
  const view = mount(
    <ComboboxControl
      label="Form"
      value="form-deleted"
      options={options}
      allowNull
      onChange={onChange}
    />
  );
  try {
    const triggerButton = trigger(view.container)!;
    expect(triggerButton.textContent).toContain("Missing: form-deleted");
    expect(triggerButton.getAttribute("data-page-editor-combobox-dangling")).toBe("form-deleted");

    click(triggerButton);
    const danglingRow = view.container.querySelector(
      '[data-page-editor-combobox-option="__dangling__"]'
    );
    expect(danglingRow).toBeTruthy();
    expect(danglingRow?.getAttribute("aria-disabled")).toBe("true");
    // The dangling row is informational; picking a real option still works.
    click(view.container.querySelector('[data-page-editor-combobox-option="form-contact"] button'));
    expect(onChange).toHaveBeenCalledWith("form-contact");
  } finally {
    view.cleanup();
  }
});

test("combobox shows loading and empty states without mutating the stored value", () => {
  const onChange = vi.fn();
  const view = mount(
    <ComboboxControl label="Form" value="form-contact" options={[]} loading onChange={onChange} />
  );
  try {
    // While loading, a stored value is NOT marked dangling.
    expect(trigger(view.container)?.getAttribute("data-page-editor-combobox-dangling")).toBeNull();
    click(trigger(view.container));
    expect(
      view.container.querySelector('[data-page-editor-combobox-state="loading"]')
    ).toBeTruthy();

    view.rerender(
      <ComboboxControl
        label="Form"
        value={null}
        options={options}
        emptyMessage="No forms match."
        onChange={onChange}
      />
    );
    setSearchValue(search(view.container)!, "zzz");
    const emptyState = view.container.querySelector('[data-page-editor-combobox-state="empty"]');
    expect(emptyState?.textContent).toBe("No forms match.");
    expect(onChange).not.toHaveBeenCalled();
  } finally {
    view.cleanup();
  }
});
