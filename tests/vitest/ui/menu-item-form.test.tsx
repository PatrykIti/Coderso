// @vitest-environment happy-dom

import React from "react";
import { createRoot } from "react-dom/client";
import { expect, test, vi } from "vitest";
import { renderAdminUi } from "../../utils/adminRouterRender";

import { MenuItemForm, type MenuItemFormValue } from "../../../core/admin/ui/menus/MenuItemForm";

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

// Radix Select renders its options through a portal that does not surface in
// SSR/closed state, so mock it to a native <select> exposing every option's
// label — exactly as the sibling list-action suite does — to assert the real
// visibility enum without coupling to the popover internals.
vi.mock("@/components/ui/select", () => {
  const flattenText = (value: React.ReactNode): string =>
    React.Children.toArray(value)
      .map((child) => {
        if (typeof child === "string" || typeof child === "number") return String(child);
        if (React.isValidElement(child)) {
          return flattenText((child.props as { children?: React.ReactNode }).children);
        }
        return "";
      })
      .join("")
      .trim();

  const collectOptions = (value: React.ReactNode): Array<{ value: string; label: string }> =>
    React.Children.toArray(value).flatMap((child) => {
      if (!React.isValidElement(child)) return [];
      const props = child.props as { value?: string; children?: React.ReactNode };
      if (typeof props.value === "string") {
        return [{ value: props.value, label: flattenText(props.children) }];
      }
      return collectOptions(props.children);
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
        {collectOptions(children).map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    ),
    SelectContent: ({ children }: { children: React.ReactNode }) => <>{children}</>,
    SelectItem: ({ children }: { children: React.ReactNode; value: string }) => <>{children}</>,
    SelectTrigger: ({ children }: { children: React.ReactNode }) => <>{children}</>,
    SelectValue: () => null,
  };
});

test("MenuItemForm renders required fields", () => {
  const html = renderAdminUi(
    <MenuItemForm
      value={{
        id: "item-1",
        label: "Home",
        linkType: "page",
        pageId: "page-1",
        href: "",
        parentId: null,
        visibility: "all",
        badgeLabel: "",
        badgeTone: "default",
        description: "",
        icon: "sparkles",
      }}
      pages={[
        { id: "page-1", title: "Home", slug: "home", status: "draft", updatedAt: "", author: null },
      ]}
      parentOptions={[]}
      onChange={() => {}}
    />
  );

  expect(html).toContain("Navigation Label");
  expect(html).toContain("Parent Item");
  expect(html).toContain("Visibility");
  expect(html).toContain("Badge Label");
  expect(html).toContain("Optional runtime icon token");
  expect(html).toContain("Current token:");
  expect(html).toContain("sparkles");
});

test("binds Navigation Label / URL / Visibility to the form value with no open-in-new-tab control (TASK-479-10-L02)", () => {
  const onChange = vi.fn();
  const value: MenuItemFormValue = {
    id: "item-1",
    label: "Home",
    linkType: "url",
    pageId: "",
    href: "/home",
    parentId: null,
    visibility: "all",
    badgeLabel: "",
    badgeTone: "default",
    description: "",
    icon: "",
  };

  const container = document.createElement("div");
  document.body.appendChild(container);
  const root = createRoot(container);
  React.act(() => {
    root.render(<MenuItemForm value={value} pages={[]} parentOptions={[]} onChange={onChange} />);
  });

  try {
    // The prototype's "Open in new tab" switch is intentionally dropped — the
    // real menu item schema has no link-target field.
    expect(container.querySelector('[role="switch"]')).toBeNull();
    expect(container.textContent).not.toContain("Open in new tab");

    // Visibility lists the REAL enum (all | logged_in | logged_out).
    expect(container.textContent).toContain("Show to everyone");
    expect(container.textContent).toContain("Only logged-in users");
    expect(container.textContent).toContain("Only logged-out users");

    // URL field is bound to the form value.
    const urlInput = container.querySelector(
      'input[placeholder="https://"]'
    ) as HTMLInputElement | null;
    expect(urlInput?.value).toBe("/home");

    // Editing the label flows back through onChange with the new label.
    const labelInput = container.querySelector(
      'input[placeholder="Menu label"]'
    ) as HTMLInputElement | null;
    expect(labelInput).toBeTruthy();
    React.act(() => {
      const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")?.set;
      setter?.call(labelInput, "Updated label");
      labelInput?.dispatchEvent(new Event("input", { bubbles: true }));
    });

    expect(onChange).toHaveBeenCalled();
    expect(onChange.mock.calls.at(-1)?.[0]).toMatchObject({ label: "Updated label" });
  } finally {
    React.act(() => {
      root.unmount();
    });
    container.remove();
  }
});
