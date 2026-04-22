// @vitest-environment happy-dom

import React, { act } from "react";
import { createRoot } from "react-dom/client";
import { expect, test, vi } from "vitest";

import { MenuItemDeleteDialog } from "../../../core/admin/ui/menus/MenuItemDeleteDialog";

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

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

test("MenuItemDeleteDialog renders item impact and supports cancel/confirm", () => {
  const onOpenChange = vi.fn();
  const onConfirm = vi.fn();

  const view = mount(
    <MenuItemDeleteDialog
      open
      itemLabel="About"
      descendantCount={2}
      onOpenChange={onOpenChange}
      onConfirm={onConfirm}
    />
  );

  try {
    expect(document.body.textContent).toContain("Delete menu item?");
    expect(document.body.textContent).toContain("About");
    expect(document.body.textContent).toContain("This also removes 2 child items.");

    const buttons = Array.from(document.body.querySelectorAll("button"));

    act(() => {
      buttons.find((button) => button.textContent === "Cancel")?.click();
      buttons.find((button) => button.textContent === "Delete item")?.click();
    });

    expect(onOpenChange).toHaveBeenCalledWith(false);
    expect(onConfirm).toHaveBeenCalledOnce();
  } finally {
    view.cleanup();
  }
});
