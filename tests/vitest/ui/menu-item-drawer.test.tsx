// @vitest-environment happy-dom

import React from "react";
import { createRoot } from "react-dom/client";
import { expect, test, vi } from "vitest";

import {
  MenuItemDrawer,
  MenuItemInspector,
  type MenuItemDraft,
} from "../../../core/admin/ui/menus/MenuItemDrawer";
import type { PageSummary } from "../../../core/admin/services/pagesClient";

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

// The public drawer and inspector reuse MenuItemForm's Radix Select controls.
// A native select keeps page-link interactions deterministic in happy-dom while
// preserving the exported component contracts under test.
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

type DrawerProps = React.ComponentProps<typeof MenuItemDrawer>;
type InspectorProps = React.ComponentProps<typeof MenuItemInspector>;

const pages: PageSummary[] = [
  {
    id: "page-docs",
    title: "Documentation",
    slug: "docs",
    status: "published",
    updatedAt: "2026-08-23T00:00:00.000Z",
    author: null,
  },
  {
    id: "page-about",
    title: "About",
    slug: "about",
    status: "published",
    updatedAt: "2026-08-23T00:00:00.000Z",
    author: null,
  },
];

const parentOptions = [{ id: "parent-root", label: "Root navigation" }];

const drawerUrlItem: MenuItemDraft = {
  id: "item-url",
  label: "  Support  ",
  linkType: "url",
  pageId: "page-stale",
  href: "",
  parentId: "parent-root",
  orderIndex: 7,
  settings: {
    visibility: "logged_in",
    badge: { label: "  New  ", tone: "accent" },
    description: "  Help center  ",
    icon: "  life-ring  ",
    openInNewTab: false,
    variant: "link",
  },
};

const drawerPageItem: MenuItemDraft = {
  id: "item-page",
  label: "  Documentation  ",
  linkType: "page",
  pageId: "page-docs",
  href: "https://stale.example.test/docs",
  parentId: null,
  orderIndex: 3,
  settings: {
    visibility: "all",
    badge: { label: "  Docs  ", tone: "success" },
    description: "  Product guides  ",
    icon: "  book-open  ",
  },
};

const inspectorItem: MenuItemDraft = {
  id: "item-inspector",
  label: "Documentation",
  linkType: "url",
  pageId: "",
  href: "https://coderso.test/docs",
  parentId: "parent-root",
  orderIndex: 9,
  settings: {
    visibility: "all",
    badge: { label: "  Quick  ", tone: "warning" },
    description: "  Open docs  ",
    icon: "  book-open  ",
    openInNewTab: false,
    variant: "link",
  },
};

const mount = (element: React.ReactElement) => {
  const container = document.createElement("div");
  document.body.appendChild(container);
  const root = createRoot(container);

  React.act(() => {
    root.render(element);
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

const mountDrawer = (overrides: Partial<DrawerProps> = {}) => {
  const props: DrawerProps = {
    item: drawerUrlItem,
    pages,
    parentOptions,
    onClose: vi.fn(),
    onSave: vi.fn(),
    onDelete: vi.fn(),
    ...overrides,
  };

  return { ...mount(<MenuItemDrawer {...props} />), props };
};

const mountInspector = (overrides: Partial<InspectorProps> = {}) => {
  const props: InspectorProps = {
    activeItem: inspectorItem,
    pages,
    parentOptions,
    onChange: vi.fn(),
    onDelete: vi.fn(),
    menuSettingsSlot: <div data-testid="menu-settings-slot">Menu-level settings</div>,
    ...overrides,
  };

  return { ...mount(<MenuItemInspector {...props} />), props };
};

const buttonByExactText = (container: ParentNode, text: string) => {
  const button = Array.from(container.querySelectorAll("button")).find(
    (node) => node.textContent?.trim() === text
  );
  expect(button).toBeTruthy();
  if (!button) throw new Error(`Expected a button labelled ${text}.`);
  return button;
};

const clickButton = (container: ParentNode, text: string) => {
  const button = buttonByExactText(container, text);
  React.act(() => {
    button.click();
  });
};

const inputByPlaceholder = (container: ParentNode, placeholder: string) => {
  const input = container.querySelector(`input[placeholder="${placeholder}"]`);
  expect(input).toBeInstanceOf(HTMLInputElement);
  if (!(input instanceof HTMLInputElement)) {
    throw new Error(`Expected an input with placeholder ${placeholder}.`);
  }
  return input;
};

const setInputValue = (input: HTMLInputElement, value: string) => {
  const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")?.set;
  React.act(() => {
    setter?.call(input, value);
    input.dispatchEvent(new Event("input", { bubbles: true }));
  });
};

const selectWithOption = (container: ParentNode, optionText: string) => {
  const select = Array.from(container.querySelectorAll("select")).find((candidate) =>
    Array.from(candidate.querySelectorAll("option")).some(
      (option) => option.textContent?.trim() === optionText
    )
  );
  expect(select).toBeInstanceOf(HTMLSelectElement);
  if (!(select instanceof HTMLSelectElement)) {
    throw new Error(`Expected a select containing ${optionText}.`);
  }
  return select;
};

const setSelectValue = (select: HTMLSelectElement, value: string) => {
  const setter = Object.getOwnPropertyDescriptor(HTMLSelectElement.prototype, "value")?.set;
  React.act(() => {
    setter?.call(select, value);
    select.dispatchEvent(new Event("change", { bubbles: true }));
  });
};

test("MenuItemDrawer renders the no-item helper through its public wrapper", () => {
  const view = mountDrawer({ item: null, pages: [] });

  try {
    expect(view.container.textContent).toContain("Select a menu item to edit details.");
    expect(view.container.querySelector("button")).toBeNull();
  } finally {
    view.cleanup();
  }
});

test("MenuItemDrawer rejects a blank navigation label without saving", () => {
  const onSave = vi.fn();
  const blankLabelItem: MenuItemDraft = {
    id: "item-blank-label",
    label: "   ",
    linkType: "url",
    pageId: "",
    href: "https://coderso.test/home",
    parentId: null,
    orderIndex: 0,
  };
  const view = mountDrawer({ item: blankLabelItem, onSave });

  try {
    clickButton(view.container, "Update Item");

    expect(view.container.textContent).toContain("Navigation label is required.");
    expect(onSave).not.toHaveBeenCalled();
  } finally {
    view.cleanup();
  }
});

test("MenuItemDrawer rejects a page link with no selected page without saving", () => {
  const onSave = vi.fn();
  const missingPageItem: MenuItemDraft = {
    id: "item-missing-page",
    label: "Guides",
    linkType: "page",
    pageId: "",
    href: "",
    parentId: null,
    orderIndex: 1,
  };
  const view = mountDrawer({ item: missingPageItem, onSave, pages: [] });

  try {
    clickButton(view.container, "Update Item");

    expect(view.container.textContent).toContain("Select a page to link.");
    expect(onSave).not.toHaveBeenCalled();
  } finally {
    view.cleanup();
  }
});

test("MenuItemDrawer rejects a custom link with no URL without saving", () => {
  const onSave = vi.fn();
  const view = mountDrawer({ onSave });

  try {
    clickButton(view.container, "Update Item");

    expect(view.container.textContent).toContain("URL is required for custom links.");
    expect(onSave).not.toHaveBeenCalled();
  } finally {
    view.cleanup();
  }
});

test("MenuItemDrawer saves a valid URL draft with exact XOR and normalized settings", () => {
  const onSave = vi.fn();
  const expectedSave: MenuItemDraft = {
    id: "item-url",
    label: "Support",
    linkType: "url",
    pageId: "",
    href: "https://coderso.test/support",
    parentId: "parent-root",
    orderIndex: 7,
    settings: {
      visibility: "logged_in",
      badge: { label: "New", tone: "accent" },
      description: "Help center",
      icon: "life-ring",
    },
  };
  const view = mountDrawer({ item: drawerUrlItem, onSave });

  try {
    setInputValue(inputByPlaceholder(view.container, "https://"), expectedSave.href);
    clickButton(view.container, "Update Item");

    expect(onSave).toHaveBeenCalledTimes(1);
    expect(onSave).toHaveBeenCalledWith(expectedSave);
  } finally {
    view.cleanup();
  }
});

test("MenuItemDrawer saves a valid page draft with exact XOR and normalized settings", () => {
  const onSave = vi.fn();
  const expectedSave: MenuItemDraft = {
    id: "item-page",
    label: "Documentation",
    linkType: "page",
    pageId: "page-about",
    href: "",
    parentId: null,
    orderIndex: 3,
    settings: {
      visibility: "all",
      badge: { label: "Docs", tone: "success" },
      description: "Product guides",
      icon: "book-open",
    },
  };
  const view = mountDrawer({ item: drawerPageItem, onSave });

  try {
    setSelectValue(selectWithOption(view.container, "About"), expectedSave.pageId);
    clickButton(view.container, "Update Item");

    expect(onSave).toHaveBeenCalledTimes(1);
    expect(onSave).toHaveBeenCalledWith(expectedSave);
  } finally {
    view.cleanup();
  }
});

test("MenuItemDrawer forwards close and delete through the public controls", () => {
  const onClose = vi.fn();
  const onDelete = vi.fn();
  const view = mountDrawer({ item: drawerUrlItem, onClose, onDelete });

  try {
    clickButton(view.container, "×");
    clickButton(view.container, "Delete Item");

    expect(onClose).toHaveBeenCalledTimes(1);
    expect(onDelete).toHaveBeenCalledTimes(1);
    expect(onDelete).toHaveBeenCalledWith(drawerUrlItem);
  } finally {
    view.cleanup();
  }
});

test("MenuItemInspector renders the menu settings slot when no item is active", () => {
  const view = mountInspector({ activeItem: null });

  try {
    expect(view.container.querySelector('[data-testid="menu-settings-slot"]')).not.toBeNull();
    expect(view.container.textContent).toContain("Menu-level settings");
    expect(view.container.textContent).not.toContain("Item settings");
  } finally {
    view.cleanup();
  }
});

test("MenuItemInspector propagates live label, link, switch, disclosure, and delete actions", () => {
  const onChange = vi.fn();
  const onDelete = vi.fn();
  const expectedLabelChange: MenuItemDraft = {
    id: "item-inspector",
    label: "  Learn more  ",
    linkType: "url",
    pageId: "",
    href: "https://coderso.test/docs",
    parentId: "parent-root",
    orderIndex: 9,
    settings: {
      visibility: "all",
      badge: { label: "Quick", tone: "warning" },
      description: "Open docs",
      icon: "book-open",
    },
  };
  const expectedLinkChange: MenuItemDraft = {
    id: "item-inspector",
    label: "  Learn more  ",
    linkType: "url",
    pageId: "",
    href: "https://coderso.test/learn",
    parentId: "parent-root",
    orderIndex: 9,
    settings: {
      visibility: "all",
      badge: { label: "Quick", tone: "warning" },
      description: "Open docs",
      icon: "book-open",
    },
  };
  const expectedSwitchChange: MenuItemDraft = {
    id: "item-inspector",
    label: "  Learn more  ",
    linkType: "url",
    pageId: "",
    href: "https://coderso.test/learn",
    parentId: "parent-root",
    orderIndex: 9,
    settings: {
      visibility: "all",
      badge: { label: "Quick", tone: "warning" },
      description: "Open docs",
      icon: "book-open",
      openInNewTab: true,
    },
  };
  const view = mountInspector({ activeItem: inspectorItem, onChange, onDelete });

  try {
    expect(view.container.textContent).toContain("Item settings");
    expect(view.container.textContent).toContain("Open in new tab");
    expect(view.container.textContent).not.toContain("Display as");

    setInputValue(inputByPlaceholder(view.container, "Menu label"), expectedLabelChange.label);
    expect(onChange).toHaveBeenNthCalledWith(1, expectedLabelChange);

    setInputValue(inputByPlaceholder(view.container, "https://"), expectedLinkChange.href);
    expect(onChange).toHaveBeenNthCalledWith(2, expectedLinkChange);

    const openInNewTab = view.container.querySelector(
      '[role="switch"][aria-label="Open in new tab"]'
    );
    expect(openInNewTab).toBeInstanceOf(HTMLButtonElement);
    if (!(openInNewTab instanceof HTMLButtonElement)) {
      throw new Error("Expected the public Open in new tab switch.");
    }
    React.act(() => {
      openInNewTab.click();
    });
    expect(onChange).toHaveBeenNthCalledWith(3, expectedSwitchChange);
    expect(onChange).toHaveBeenCalledTimes(3);

    clickButton(view.container, "Advanced");
    expect(view.container.textContent).toContain("Display as");

    clickButton(view.container, "Remove item");
    expect(onDelete).toHaveBeenCalledTimes(1);
    expect(onDelete).toHaveBeenCalledWith(inspectorItem);
  } finally {
    view.cleanup();
  }
});
