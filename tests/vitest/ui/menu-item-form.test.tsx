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

test("advanced link type toggle and page picker propagate through onChange", () => {
  const onChange = vi.fn();
  const value: MenuItemFormValue = {
    id: "item-1",
    label: "Home",
    linkType: "page",
    pageId: "",
    href: "",
    parentId: null,
    visibility: "all",
    badgeLabel: "",
    badgeTone: "default",
    description: "",
    icon: "",
  };
  const pages = [
    {
      id: "page-about",
      title: "About",
      slug: "about",
      status: "published" as const,
      updatedAt: "",
      author: null,
    },
  ];

  const container = document.createElement("div");
  document.body.appendChild(container);
  const root = createRoot(container);
  React.act(() => {
    root.render(
      <MenuItemForm value={value} pages={pages} parentOptions={[]} onChange={onChange} />
    );
  });

  try {
    const buttonByExactText = (text: string) =>
      Array.from(container.querySelectorAll("button")).find(
        (node) => node.textContent?.trim() === text
      );

    // Link Type -> Page (already page) keeps the draft shape.
    React.act(() => {
      buttonByExactText("Page")?.click();
    });
    expect(onChange.mock.calls.at(-1)?.[0]).toMatchObject({ linkType: "page", href: "" });

    // The mocked select exposes the page option; picking it sets pageId.
    const pageSelect = Array.from(container.querySelectorAll<HTMLSelectElement>("select")).find(
      (select) =>
        Array.from(select.querySelectorAll("option")).some(
          (option) => option.textContent === "About"
        )
    );
    expect(pageSelect).toBeTruthy();
    React.act(() => {
      const setter = Object.getOwnPropertyDescriptor(HTMLSelectElement.prototype, "value")?.set;
      setter?.call(pageSelect, "page-about");
      pageSelect?.dispatchEvent(new Event("change", { bubbles: true }));
    });
    expect(onChange.mock.calls.at(-1)?.[0]).toMatchObject({ pageId: "page-about" });

    // Link Type -> Custom URL restores the URL lane.
    React.act(() => {
      buttonByExactText("Custom URL")?.click();
    });
    expect(onChange.mock.calls.at(-1)?.[0]).toMatchObject({ linkType: "url", pageId: "" });
  } finally {
    React.act(() => {
      root.unmount();
    });
    container.remove();
  }
});

test("display-as, badge, description, and icon fields propagate through onChange", () => {
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
    const buttonByExactText = (text: string) =>
      Array.from(container.querySelectorAll("button")).find(
        (node) => node.textContent?.trim() === text
      );

    React.act(() => {
      buttonByExactText("Link")?.click();
    });
    expect(onChange.mock.calls.at(-1)?.[0]).toMatchObject({ variant: "link" });

    React.act(() => {
      buttonByExactText("Button")?.click();
    });
    expect(onChange.mock.calls.at(-1)?.[0]).toMatchObject({ variant: "button" });

    const setInput = (placeholder: string, next: string) => {
      const input = container.querySelector(
        `input[placeholder="${placeholder}"]`
      ) as HTMLInputElement | null;
      expect(input).not.toBeNull();
      React.act(() => {
        const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")?.set;
        setter?.call(input, next);
        input?.dispatchEvent(new Event("input", { bubbles: true }));
      });
    };

    setInput("New", "Hot");
    expect(onChange.mock.calls.at(-1)?.[0]).toMatchObject({ badgeLabel: "Hot" });

    setInput("Optional helper text", "Featured in the main menu");
    expect(onChange.mock.calls.at(-1)?.[0]).toMatchObject({
      description: "Featured in the main menu",
    });

    setInput("e.g. sparkles", "rocket");
    expect(onChange.mock.calls.at(-1)?.[0]).toMatchObject({ icon: "rocket" });
  } finally {
    React.act(() => {
      root.unmount();
    });
    container.remove();
  }
});

test("visibility and badge tone selects propagate their real enum values", () => {
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
    const changeSelect = (select: HTMLSelectElement | null | undefined, next: string) => {
      expect(select).not.toBeNull();
      React.act(() => {
        const setter = Object.getOwnPropertyDescriptor(HTMLSelectElement.prototype, "value")?.set;
        setter?.call(select, next);
        select?.dispatchEvent(new Event("change", { bubbles: true }));
      });
    };

    const selects = Array.from(container.querySelectorAll<HTMLSelectElement>("select"));
    const visibilitySelect = selects.find((select) =>
      Array.from(select.querySelectorAll("option")).some(
        (option) => option.textContent === "Show to everyone"
      )
    );
    changeSelect(visibilitySelect, "logged_in");
    expect(onChange.mock.calls.at(-1)?.[0]).toMatchObject({ visibility: "logged_in" });

    const badgeToneSelect = selects.find(
      (select) =>
        select !== visibilitySelect &&
        Array.from(select.querySelectorAll("option")).some((option) => option.value === "success")
    );
    changeSelect(badgeToneSelect, "success");
    expect(onChange.mock.calls.at(-1)?.[0]).toMatchObject({ badgeTone: "success" });
  } finally {
    React.act(() => {
      root.unmount();
    });
    container.remove();
  }
});
