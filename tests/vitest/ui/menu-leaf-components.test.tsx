// @vitest-environment happy-dom

import React, { act } from "react";
import { createRoot } from "react-dom/client";
import { expect, test, vi } from "vitest";

import { MenuCreateDialog } from "../../../core/admin/ui/menus/MenuCreateDialog";
import { MenuItemDrawer } from "../../../core/admin/ui/menus/MenuItemDrawer";
import { MenuTree } from "../../../core/admin/ui/menus/MenuTree";

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

vi.mock("@/components/ui/button", () => ({
  Button: ({
    children,
    onClick,
    disabled,
    ...props
  }: {
    children: React.ReactNode;
    onClick?: () => void;
    disabled?: boolean;
    [key: string]: unknown;
  }) => (
    <button type="button" onClick={onClick} disabled={disabled} {...props}>
      {children}
    </button>
  ),
}));

vi.mock("@/components/ui/dialog", () => ({
  Dialog: ({
    children,
    open,
    onOpenChange,
  }: {
    children: React.ReactNode;
    open?: boolean;
    onOpenChange?: (open: boolean) => void;
  }) => (
    <div data-dialog-open={String(Boolean(open))} data-has-open-change={String(Boolean(onOpenChange))}>
      {children}
    </div>
  ),
  DialogContent: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  DialogDescription: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  DialogHeader: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  DialogTitle: ({ children }: { children: React.ReactNode }) => <p>{children}</p>,
}));

vi.mock("@/components/ui/input", () => ({
  Input: ({
    value,
    onChange,
    ...props
  }: {
    value?: string;
    onChange?: (event: React.ChangeEvent<HTMLInputElement>) => void;
    [key: string]: unknown;
  }) => <input defaultValue={value} onChange={onChange} {...props} />,
}));

vi.mock("@/components/ui/separator", () => ({
  Separator: () => <hr />,
}));

vi.mock("@/ui/menus/MenuItemForm", () => ({
  MenuItemForm: ({
    value,
    errors,
    onChange,
  }: {
    value: Record<string, unknown>;
    errors?: { label?: string; link?: string };
    onChange: (next: Record<string, unknown>) => void;
  }) => (
    <div>
      <p>{String(value.label)}</p>
      <p>{errors?.label}</p>
      <p>{errors?.link}</p>
      <button
        type="button"
        onClick={() =>
          onChange({
            ...value,
            label: "",
            linkType: "page",
            pageId: "",
            href: "",
          })
        }
      >
        invalidate
      </button>
      <button
        type="button"
        onClick={() =>
          onChange({
            ...value,
            label: "Support",
            linkType: "url",
            pageId: "",
            href: "https://nextless.test/support",
            parentId: "parent-1",
            visibility: "logged_in",
            badgeLabel: "New",
            badgeTone: "accent",
            description: "Help center",
            icon: "life-ring",
          })
        }
      >
        make-valid
      </button>
    </div>
  ),
}));

vi.mock("@/ui/menus/MenuItemRow", () => ({
  MenuItemRow: ({
    item,
    onSelect,
    onEdit,
    onDelete,
    onDragStart,
    onDragEnd,
    onDragOver,
    onDrop,
  }: {
    item: { id: string; label: string };
    onSelect?: (item: { id: string; label: string }, eventTimeStamp: number) => void;
    onEdit?: (item: { id: string; label: string }) => void;
    onDelete?: (item: { id: string; label: string }) => void;
    onDragStart?: (item: { id: string; label: string }, event: React.DragEvent<HTMLDivElement>) => void;
    onDragEnd?: (event: React.DragEvent<HTMLDivElement>) => void;
    onDragOver?: (item: { id: string; label: string }, event: React.DragEvent<HTMLDivElement>) => void;
    onDrop?: (item: { id: string; label: string }, event: React.DragEvent<HTMLDivElement>) => void;
  }) => (
    <div data-menu-row={item.id}>
      <span>{item.label}</span>
      <button type="button" onClick={() => onSelect?.(item, 200)}>
        select-{item.id}
      </button>
      <button type="button" onClick={() => onEdit?.(item)}>
        edit-{item.id}
      </button>
      <button type="button" onClick={() => onDelete?.(item)}>
        delete-{item.id}
      </button>
      <button
        type="button"
        onClick={() =>
          onDragStart?.(
            item,
            { timeStamp: 100 } as React.DragEvent<HTMLDivElement>
          )
        }
      >
        drag-start-{item.id}
      </button>
      <button
        type="button"
        onClick={() =>
          onDragOver?.(
            item,
            {
              clientX: 50,
              currentTarget: {
                getBoundingClientRect: () => ({ left: 0 }),
              },
            } as React.DragEvent<HTMLDivElement>
          )
        }
      >
        drag-over-child-{item.id}
      </button>
      <button
        type="button"
        onClick={() =>
          onDrop?.(
            item,
            { timeStamp: 150 } as React.DragEvent<HTMLDivElement>
          )
        }
      >
        drop-{item.id}
      </button>
      <button
        type="button"
        onClick={() => onDragEnd?.({ timeStamp: 200 } as React.DragEvent<HTMLDivElement>)}
      >
        drag-end-{item.id}
      </button>
    </div>
  ),
}));

const mount = (node: React.ReactNode) => {
  const container = document.createElement("div");
  document.body.appendChild(container);
  const root = createRoot(container);

  act(() => {
    root.render(node);
  });

  return {
    container,
    cleanup: () => {
      act(() => {
        root.unmount();
      });
      container.remove();
    },
  };
};

const setInputValue = (element: Element | null | undefined, value: string) => {
  if (!(element instanceof HTMLInputElement)) return;
  const descriptor = Object.getOwnPropertyDescriptor(
    HTMLInputElement.prototype,
    "value"
  );
  descriptor?.set?.call(element, value);
  element.dispatchEvent(new Event("input", { bubbles: true }));
  element.dispatchEvent(new Event("change", { bubbles: true }));
};

test("MenuCreateDialog validates, creates trimmed payloads, and reports async errors", async () => {
  const onOpenChange = vi.fn();
  const onCreate = vi
    .fn<(
      payload: { name: string; location?: string }
    ) => Promise<void>>()
    .mockResolvedValueOnce(undefined)
    .mockRejectedValueOnce(new Error("Failed to create menu."));

  const view = mount(
    <MenuCreateDialog open onOpenChange={onOpenChange} onCreate={onCreate} />
  );

  try {
    const inputs = Array.from(view.container.querySelectorAll("input"));
    const buttons = Array.from(view.container.querySelectorAll("button"));

    expect(view.container.textContent).toContain(
      "Theme slot identifier such as"
    );

    await act(async () => {
      buttons.find((button) => button.textContent?.includes("Create Menu"))?.click();
    });
    expect(view.container.textContent).toContain("Menu name is required.");

    await act(async () => {
      setInputValue(inputs[0], "  Main Menu  ");
      setInputValue(inputs[1], "  primary  ");
      buttons.find((button) => button.textContent?.includes("Create Menu"))?.click();
    });

    expect(onCreate).toHaveBeenNthCalledWith(1, {
      name: "Main Menu",
      location: "primary",
    });
    expect(onOpenChange).toHaveBeenCalledWith(false);

    await act(async () => {
      setInputValue(inputs[0], "Footer");
      setInputValue(inputs[1], "");
      buttons.find((button) => button.textContent?.includes("Create Menu"))?.click();
    });

    expect(onCreate).toHaveBeenNthCalledWith(2, {
      name: "Footer",
      location: undefined,
    });
    expect(view.container.textContent).toContain("Failed to create menu.");

    act(() => {
      buttons.find((button) => button.textContent === "Cancel")?.click();
      buttons.find((button) => button.getAttribute("aria-label") === "Close create menu dialog")?.click();
    });

    expect(onOpenChange).toHaveBeenCalledTimes(3);
  } finally {
    view.cleanup();
  }
});

test("MenuItemDrawer handles empty helper, validation, save normalization, and delete", () => {
  const onClose = vi.fn();
  const onSave = vi.fn();
  const onDelete = vi.fn();

  const emptyView = mount(
    <MenuItemDrawer
      item={null}
      pages={[]}
      parentOptions={[]}
      onClose={onClose}
      onSave={onSave}
      onDelete={onDelete}
    />
  );

  try {
    expect(emptyView.container.textContent).toContain(
      "Select a menu item to edit details."
    );
  } finally {
    emptyView.cleanup();
  }

  const item = {
    id: "item-1",
    label: "Home",
    href: "",
    pageId: "page-1",
    parentId: null,
    orderIndex: 0,
    settings: {
      visibility: "all" as const,
    },
    linkType: "page" as const,
  };

  const view = mount(
    <MenuItemDrawer
      item={item}
      pages={[]}
      parentOptions={[{ id: "parent-1", label: "Parent" }]}
      onClose={onClose}
      onSave={onSave}
      onDelete={onDelete}
    />
  );

  try {
    expect(view.container.textContent).toContain(
      "Create at least one page to link a menu item."
    );

    const buttons = Array.from(view.container.querySelectorAll("button"));

    act(() => {
      buttons.find((button) => button.textContent === "invalidate")?.click();
    });

    act(() => {
      buttons.find((button) => button.textContent?.includes("Update Item"))?.click();
    });

    expect(view.container.textContent).toContain("Navigation label is required.");

    act(() => {
      buttons.find((button) => button.textContent === "make-valid")?.click();
    });

    act(() => {
      buttons.find((button) => button.textContent?.includes("Update Item"))?.click();
      buttons.find((button) => button.textContent?.includes("Delete Item"))?.click();
      buttons.find((button) => button.textContent === "×")?.click();
    });

    expect(onSave).toHaveBeenCalledWith({
      ...item,
      label: "Support",
      linkType: "url",
      pageId: "",
      href: "https://nextless.test/support",
      parentId: "parent-1",
      settings: {
        visibility: "logged_in",
        badge: { label: "New", tone: "accent" },
        description: "Help center",
        icon: "life-ring",
      },
    });
    expect(onDelete).toHaveBeenCalledWith(item);
    expect(onClose).toHaveBeenCalledOnce();
  } finally {
    view.cleanup();
  }
});

test("MenuTree suppresses post-drag click selection and forwards edit/delete/move/root-drop", () => {
  const onSelect = vi.fn();
  const onEdit = vi.fn();
  const onDelete = vi.fn();
  const onMove = vi.fn();
  const onMoveToRoot = vi.fn();

  const items = [
    {
      id: "item-1",
      label: "Home",
      href: "/",
      pageId: null,
      parentId: null,
      orderIndex: 0,
      children: [],
    },
    {
      id: "item-2",
      label: "Blog",
      href: "/blog",
      pageId: null,
      parentId: null,
      orderIndex: 1,
      children: [],
    },
  ];

  const view = mount(
    <MenuTree
      items={items as never}
      activeId="item-1"
      onSelect={onSelect}
      onEdit={onEdit}
      onDelete={onDelete}
      onMove={onMove}
      onMoveToRoot={onMoveToRoot}
    />
  );

  try {
    const click = (label: string) =>
      Array.from(view.container.querySelectorAll("button")).find(
        (button) => button.textContent === label
      )?.click();

    act(() => {
      click("select-item-1");
      click("edit-item-2");
      click("delete-item-2");
    });

    act(() => {
      click("drag-start-item-1");
    });

    act(() => {
      click("select-item-1");
      click("drag-over-child-item-2");
    });

    act(() => {
      click("drop-item-2");
    });

    expect(onSelect).toHaveBeenCalledTimes(1);
    expect(onSelect).toHaveBeenCalledWith(expect.objectContaining({ id: "item-1" }));
    expect(onEdit).toHaveBeenCalledWith(expect.objectContaining({ id: "item-2" }));
    expect(onDelete).toHaveBeenCalledWith(expect.objectContaining({ id: "item-2" }));
    expect(onMove).toHaveBeenCalledWith("item-1", "item-2", "child");

    act(() => {
      click("drag-start-item-1");
    });

    const rootDrop = Array.from(view.container.querySelectorAll("div")).find(
      (div) => div.textContent?.trim() === "Drop here to move to top level"
    );

    act(() => {
      rootDrop?.dispatchEvent(
        new DragEvent("dragover", { bubbles: true, cancelable: true })
      );
      rootDrop?.dispatchEvent(
        new DragEvent("drop", { bubbles: true, cancelable: true })
      );
    });

    expect(onMoveToRoot).toHaveBeenCalledWith("item-1", "start");
  } finally {
    view.cleanup();
  }
});
