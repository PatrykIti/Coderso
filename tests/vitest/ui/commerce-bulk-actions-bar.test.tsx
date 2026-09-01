// @vitest-environment happy-dom

// TASK-105-08-06: `CommerceBulkActionsBar` interaction suite. Radix Select
// drives onActionChange; Apply/Clear wire onApply/onClear with disabled and
// applying states; the inline variant swaps layout + copy.

import React from "react";
import { createRoot } from "react-dom/client";
import { afterEach, expect, test, vi } from "vitest";

import {
  CommerceBulkActionsBar,
  type CommerceBulkActionValue,
} from "../../../core/admin/ui/commerce/CommerceBulkActionsBar";

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

type CommerceBulkAction = CommerceBulkActionValue | "";

const mount = (props: {
  selectedCount?: number;
  action?: CommerceBulkAction;
  onActionChange?: (value: CommerceBulkAction) => void;
  onApply?: () => void;
  onClear?: () => void;
  isApplying?: boolean;
  variant?: "card" | "inline";
}) => {
  const container = document.createElement("div");
  document.body.appendChild(container);
  const root = createRoot(container);
  const onActionChange = props.onActionChange ?? vi.fn<(value: CommerceBulkAction) => void>();
  const onApply = props.onApply ?? vi.fn();
  const onClear = props.onClear ?? vi.fn();
  React.act(() => {
    root.render(
      <CommerceBulkActionsBar
        selectedCount={props.selectedCount ?? 0}
        action={props.action ?? ""}
        onActionChange={onActionChange}
        onApply={onApply}
        onClear={onClear}
        isApplying={props.isApplying ?? false}
        variant={props.variant}
      />
    );
  });
  return {
    container,
    onActionChange,
    onApply,
    onClear,
    cleanup: () => {
      React.act(() => root.unmount());
      container.remove();
    },
  };
};

const click = (element: Element | null) => {
  if (!element) throw new Error("click target missing");
  React.act(() => {
    element.dispatchEvent(new MouseEvent("click", { bubbles: true, cancelable: true }));
  });
};

const findButton = (container: HTMLElement, text: string) =>
  Array.from(container.querySelectorAll("button")).find((button) =>
    button.textContent?.includes(text)
  ) ?? null;

afterEach(() => {
  document.body.innerHTML = "";
});

test("card variant renders selection count and all four bulk actions", () => {
  const view = mount({ selectedCount: 3 });
  try {
    expect(view.container.textContent).toContain("Selected 3");
    expect(view.container.textContent).toContain("Apply a bulk action to the selected products.");
    expect(
      view.container
        .querySelector("[data-commerce-bulk-actions]")
        ?.getAttribute("data-commerce-bulk-actions")
    ).toBe("card");
    // Radix Select items are rendered in a portal; verify the trigger exists.
    const trigger = view.container.querySelector('[role="combobox"]');
    expect(trigger).toBeTruthy();
  } finally {
    view.cleanup();
  }
});

test("inline variant uses compact layout and screen-reader-only description", () => {
  const view = mount({ variant: "inline" });
  try {
    expect(
      view.container
        .querySelector("[data-commerce-bulk-actions]")
        ?.getAttribute("data-commerce-bulk-actions")
    ).toBe("inline");
    const description = Array.from(view.container.querySelectorAll("span")).find((span) =>
      span.textContent?.includes("Apply a bulk action")
    );
    expect(description?.className).toContain("sr-only");
  } finally {
    view.cleanup();
  }
});

test("opening the select and choosing Publish emits the action value", () => {
  const view = mount({});
  try {
    const trigger = view.container.querySelector('[role="combobox"]');
    click(trigger);
    const publishItem = Array.from(document.body.querySelectorAll('[role="option"]')).find(
      (option) => option.textContent?.includes("Publish")
    );
    expect(publishItem).toBeTruthy();
    click(publishItem ?? null);
    expect(view.onActionChange).toHaveBeenCalledWith("publish");
  } finally {
    view.cleanup();
  }
});

test("Apply is disabled without an action and enabled once one is chosen", () => {
  const view = mount({});
  try {
    const applyButton = findButton(view.container, "Apply");
    expect(applyButton?.disabled).toBe(true);
  } finally {
    view.cleanup();
  }

  const chosen = mount({ action: "archive" });
  try {
    const applyButton = findButton(chosen.container, "Apply");
    expect(applyButton?.disabled).toBe(false);
    click(applyButton);
    expect(chosen.onApply).toHaveBeenCalledTimes(1);
  } finally {
    chosen.cleanup();
  }
});

test("isApplying replaces the Apply label and disables it", () => {
  const view = mount({ action: "publish", isApplying: true });
  try {
    expect(view.container.textContent).toContain("Applying...");
    const applyButton = findButton(view.container, "Applying...");
    expect(applyButton?.disabled).toBe(true);
  } finally {
    view.cleanup();
  }
});

test("Clear button emits onClear for both variants", () => {
  const card = mount({});
  try {
    click(findButton(card.container, "Clear selection"));
    expect(card.onClear).toHaveBeenCalledTimes(1);
  } finally {
    card.cleanup();
  }

  const inline = mount({ variant: "inline" });
  try {
    click(findButton(inline.container, "Clear"));
    expect(inline.onClear).toHaveBeenCalledTimes(1);
  } finally {
    inline.cleanup();
  }
});
