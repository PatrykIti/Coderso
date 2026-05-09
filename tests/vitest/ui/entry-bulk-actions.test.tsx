// @vitest-environment happy-dom

import React from "react";

import { createRoot } from "react-dom/client";
import { afterEach, expect, test, vi } from "vitest";

vi.mock("@/components/ui/badge", () => ({
  Badge: ({ children }: { children: React.ReactNode }) => <span>{children}</span>,
}));

vi.mock("@/components/ui/button", () => ({
  Button: ({
    children,
    onClick,
    disabled,
  }: {
    children: React.ReactNode;
    onClick?: () => void;
    disabled?: boolean;
  }) => (
    <button type="button" onClick={onClick} disabled={disabled}>
      {children}
    </button>
  ),
}));

vi.mock("@/components/ui/select", () => {
  const flattenText = (value: React.ReactNode): string =>
    React.Children.toArray(value)
      .map((child) => {
        if (typeof child === "string" || typeof child === "number") return String(child);
        if (React.isValidElement(child)) return flattenText(child.props.children);
        return "";
      })
      .join("")
      .trim();

  const collectOptions = (value: React.ReactNode): Array<{ value: string; label: string }> =>
    React.Children.toArray(value).flatMap((child) => {
      if (!React.isValidElement(child)) return [];
      if (typeof child.props.value === "string") {
        return [{ value: child.props.value, label: flattenText(child.props.children) }];
      }
      return collectOptions(child.props.children);
    });

  return {
    Select: ({
      children,
      onValueChange,
      value,
    }: {
      children: React.ReactNode;
      onValueChange?: (value: string) => void;
      value?: string;
    }) => (
      <select value={value} onChange={(event) => onValueChange?.(event.target.value)}>
        <option value="">Bulk actions</option>
        {collectOptions(children).map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    ),
    SelectTrigger: ({ children }: { children: React.ReactNode }) => <>{children}</>,
    SelectValue: ({ placeholder }: { placeholder?: string }) => <span>{placeholder}</span>,
    SelectContent: ({ children }: { children: React.ReactNode }) => <>{children}</>,
    SelectItem: ({ children, value }: { children: React.ReactNode; value: string }) => (
      <option value={value}>{children}</option>
    ),
  };
});

import { EntryBulkActionsBar } from "../../../core/admin/ui/entries/EntryBulkActionsBar";

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

function mount(node: React.ReactNode) {
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
}

afterEach(() => {
  document.body.innerHTML = "";
});

test("EntryBulkActionsBar renders selection count and disabled apply state", () => {
  const { container, cleanup } = mount(
    <EntryBulkActionsBar
      selectedCount={3}
      action=""
      onActionChange={() => undefined}
      onApply={() => undefined}
      onClear={() => undefined}
    />
  );

  expect(container.textContent).toContain("Selected");
  expect(container.textContent).toContain("3");
  expect(container.textContent).toContain("Bulk actions");
  expect(container.textContent).toContain("Apply");
  expect(container.textContent).toContain("Clear selection");

  const applyButton = Array.from(container.querySelectorAll("button")).find((button) =>
    button.textContent?.includes("Apply")
  );
  if (!(applyButton instanceof HTMLButtonElement)) {
    throw new Error("Missing apply button");
  }
  expect(applyButton.disabled).toBe(true);

  cleanup();
});

test("EntryBulkActionsBar forwards action changes and button callbacks", () => {
  const onActionChange = vi.fn();
  const onApply = vi.fn();
  const onClear = vi.fn();

  const { container, cleanup } = mount(
    <EntryBulkActionsBar
      selectedCount={2}
      action="draft"
      onActionChange={onActionChange}
      onApply={onApply}
      onClear={onClear}
    />
  );

  const select = container.querySelector("select");
  const applyButton = Array.from(container.querySelectorAll("button")).find((button) =>
    button.textContent?.includes("Apply")
  );
  const clearButton = Array.from(container.querySelectorAll("button")).find((button) =>
    button.textContent?.includes("Clear selection")
  );

  if (!(select instanceof HTMLSelectElement)) {
    throw new Error("Missing bulk action select");
  }
  if (!(applyButton instanceof HTMLButtonElement)) {
    throw new Error("Missing apply button");
  }
  if (!(clearButton instanceof HTMLButtonElement)) {
    throw new Error("Missing clear button");
  }

  React.act(() => {
    select.value = "delete";
    select.dispatchEvent(new Event("change", { bubbles: true }));
    applyButton.click();
    clearButton.click();
  });

  expect(onActionChange).toHaveBeenCalledWith("delete");
  expect(onApply).toHaveBeenCalledTimes(1);
  expect(onClear).toHaveBeenCalledTimes(1);

  cleanup();
});

test("EntryBulkActionsBar renders applying state", () => {
  const { container, cleanup } = mount(
    <EntryBulkActionsBar
      selectedCount={1}
      action="archive"
      onActionChange={() => undefined}
      onApply={() => undefined}
      onClear={() => undefined}
      isApplying
    />
  );

  const applyButton = Array.from(container.querySelectorAll("button")).find((button) =>
    button.textContent?.includes("Applying")
  );
  if (!(applyButton instanceof HTMLButtonElement)) {
    throw new Error("Missing applying button");
  }

  expect(applyButton.disabled).toBe(true);

  cleanup();
});
