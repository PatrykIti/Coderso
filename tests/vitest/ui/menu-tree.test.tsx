// @vitest-environment happy-dom

import React from "react";
import { createRoot } from "react-dom/client";
import { afterEach, expect, test, vi } from "vitest";

import { MenuTree } from "../../../core/admin/ui/menus/MenuTree";
import type { MenuItemDisplay } from "../../../core/admin/ui/menus/types";

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const item = (overrides: Partial<MenuItemDisplay>): MenuItemDisplay => ({
  id: "item",
  label: "Item",
  href: "/",
  pageId: null,
  parentId: null,
  parentLabel: null,
  orderIndex: 0,
  pageTitle: null,
  status: "ok",
  children: [],
  ...overrides,
});

const items: MenuItemDisplay[] = [
  item({
    id: "root",
    label: "Home",
    orderIndex: 0,
    children: [
      item({
        id: "child",
        label: "About",
        parentId: "root",
        parentLabel: "Home",
        orderIndex: 0,
      }),
    ],
  }),
  item({ id: "blog", label: "Blog", href: "/blog", orderIndex: 1 }),
];

const mount = (props?: Partial<React.ComponentProps<typeof MenuTree>>) => {
  const container = document.createElement("div");
  document.body.appendChild(container);
  const root = createRoot(container);
  const defaults = {
    items,
    activeId: "root",
    onSelect: vi.fn(),
    onEdit: vi.fn(),
    onDelete: vi.fn(),
    onMove: vi.fn(),
  } satisfies React.ComponentProps<typeof MenuTree>;

  React.act(() => {
    root.render(<MenuTree {...defaults} {...props} />);
  });

  return {
    container,
    props: { ...defaults, ...props },
    cleanup: () => {
      React.act(() => {
        root.unmount();
      });
      container.remove();
    },
  };
};

const dispatchDragEvent = (
  target: Element,
  type: string,
  options: { clientX?: number; clientY?: number } = {}
) => {
  const event = new DragEvent(type, {
    bubbles: true,
    cancelable: true,
    clientX: options.clientX ?? 0,
    clientY: options.clientY ?? 0,
  });
  Object.defineProperty(event, "dataTransfer", {
    configurable: true,
    value: {
      effectAllowed: "",
      setDragImage: vi.fn(),
      setData: vi.fn(),
    },
  });
  Object.defineProperty(event, "clientX", {
    configurable: true,
    value: options.clientX ?? 0,
  });
  Object.defineProperty(event, "clientY", {
    configurable: true,
    value: options.clientY ?? 0,
  });
  target.dispatchEvent(event);
};

const mockRect = (element: Element, rect: Pick<DOMRect, "left" | "top" | "height">) => {
  vi.spyOn(element, "getBoundingClientRect").mockReturnValue({
    ...rect,
    x: rect.left,
    y: rect.top,
    bottom: rect.top + rect.height,
    right: rect.left + 240,
    width: 240,
    toJSON: () => ({}),
  } as DOMRect);
};

afterEach(() => {
  vi.restoreAllMocks();
});

test("MenuTree renders nested hierarchy hints for child items", () => {
  const view = mount();

  try {
    expect(view.container.querySelector('[data-menu-depth="1"]')).not.toBeNull();
    expect(view.container.textContent).toContain("Sub-item of Home");
  } finally {
    view.cleanup();
  }
});

test("MenuTree resolves before, after, and child from row drag events", () => {
  const onMove = vi.fn();
  const view = mount({ onMove });

  try {
    const rootHandle = view.container.querySelector('[data-menu-drag-handle="root"]');
    expect(rootHandle).not.toBeNull();
    if (!rootHandle) return;

    React.act(() => {
      dispatchDragEvent(rootHandle, "dragstart");
    });
    const blogRow = view.container.querySelector('[data-menu-row-id="blog"]');
    expect(blogRow).not.toBeNull();
    if (!blogRow) return;
    mockRect(blogRow, { left: 0, top: 100, height: 40 });
    React.act(() => {
      dispatchDragEvent(blogRow, "dragover", { clientX: 8, clientY: 104 });
    });

    const beforeMarker = view.container.querySelector('[data-menu-drop-line="blog:before"]');
    expect(beforeMarker?.textContent).toContain("Drop before");
    expect(blogRow.contains(beforeMarker)).toBe(true);
    expect(beforeMarker?.className).toContain("absolute");
    expect(beforeMarker?.className).toContain("pointer-events-none");

    React.act(() => {
      dispatchDragEvent(blogRow, "drop", { clientX: 8, clientY: 104 });
    });
    expect(onMove).toHaveBeenLastCalledWith("root", "blog", "before");

    React.act(() => {
      dispatchDragEvent(rootHandle, "dragstart");
    });
    const blogRowAfter = view.container.querySelector('[data-menu-row-id="blog"]');
    expect(blogRowAfter).not.toBeNull();
    if (!blogRowAfter) return;
    mockRect(blogRowAfter, { left: 0, top: 100, height: 40 });
    React.act(() => {
      dispatchDragEvent(blogRowAfter, "dragover", { clientX: 8, clientY: 136 });
    });
    const afterMarker = view.container.querySelector('[data-menu-drop-line="blog:after"]');
    expect(afterMarker?.textContent).toContain("Drop after");
    expect(blogRowAfter.contains(afterMarker)).toBe(true);
    expect(afterMarker?.className).toContain("absolute");
    expect(afterMarker?.className).toContain("pointer-events-none");

    React.act(() => {
      dispatchDragEvent(blogRowAfter, "drop", { clientX: 8, clientY: 136 });
    });
    expect(onMove).toHaveBeenLastCalledWith("root", "blog", "after");

    React.act(() => {
      dispatchDragEvent(rootHandle, "dragstart");
    });
    const blogRowChild = view.container.querySelector('[data-menu-row-id="blog"]');
    expect(blogRowChild).not.toBeNull();
    if (!blogRowChild) return;
    mockRect(blogRowChild, { left: 0, top: 100, height: 40 });
    React.act(() => {
      dispatchDragEvent(blogRowChild, "dragover", { clientX: 120, clientY: 120 });
    });
    React.act(() => {
      dispatchDragEvent(blogRowChild, "drop", { clientX: 120, clientY: 120 });
    });
    expect(onMove).toHaveBeenLastCalledWith("root", "blog", "child");
  } finally {
    view.cleanup();
  }
});

test("MenuTree keeps bottom-band same-level drops from the handle lane", () => {
  const onMove = vi.fn();
  const view = mount({ onMove });

  try {
    const rootHandle = view.container.querySelector('[data-menu-drag-handle="root"]');
    expect(rootHandle).not.toBeNull();
    if (!rootHandle) return;

    React.act(() => {
      dispatchDragEvent(rootHandle, "dragstart");
    });
    const blogRow = view.container.querySelector('[data-menu-row-id="blog"]');
    expect(blogRow).not.toBeNull();
    if (!blogRow) return;
    mockRect(blogRow, { left: 0, top: 100, height: 40 });

    React.act(() => {
      dispatchDragEvent(blogRow, "dragover", { clientX: 8, clientY: 136 });
      dispatchDragEvent(blogRow, "drop", { clientX: 8, clientY: 136 });
    });

    expect(onMove).toHaveBeenLastCalledWith("root", "blog", "after");
  } finally {
    view.cleanup();
  }
});

test("MenuTree maps the middle row band to child without horizontal bias", () => {
  const onMove = vi.fn();
  const view = mount({ onMove });

  try {
    const rootHandle = view.container.querySelector('[data-menu-drag-handle="root"]');
    expect(rootHandle).not.toBeNull();
    if (!rootHandle) return;

    React.act(() => {
      dispatchDragEvent(rootHandle, "dragstart");
    });
    const blogRow = view.container.querySelector('[data-menu-row-id="blog"]');
    expect(blogRow).not.toBeNull();
    if (!blogRow) return;
    mockRect(blogRow, { left: 0, top: 100, height: 40 });

    React.act(() => {
      dispatchDragEvent(blogRow, "dragover", { clientX: 8, clientY: 120 });
      dispatchDragEvent(blogRow, "drop", { clientX: 8, clientY: 120 });
    });

    expect(onMove).toHaveBeenLastCalledWith("root", "blog", "child");
  } finally {
    view.cleanup();
  }
});

test("MenuTree exposes keyboard reorder actions without root drop zones", () => {
  const onMove = vi.fn();
  const view = mount({ onMove });

  try {
    const buttons = Array.from(view.container.querySelectorAll("button"));
    React.act(() => {
      buttons.find((button) => button.getAttribute("aria-label") === "Move down Home")?.click();
      buttons.find((button) => button.getAttribute("aria-label") === "Indent Blog")?.click();
      buttons.find((button) => button.getAttribute("aria-label") === "Outdent About")?.click();
    });

    expect(onMove).toHaveBeenCalledWith("root", "blog", "after");
    expect(onMove).toHaveBeenCalledWith("blog", "root", "child");
    expect(onMove).toHaveBeenCalledWith("child", "root", "after");

    const rootHandle = view.container.querySelector('[data-menu-drag-handle="root"]');
    expect(rootHandle).not.toBeNull();
    if (!rootHandle) return;

    React.act(() => {
      dispatchDragEvent(rootHandle, "dragstart");
    });
    expect(view.container.textContent).not.toContain("Drop here to move to top level");
  } finally {
    view.cleanup();
  }
});
