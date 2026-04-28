// @vitest-environment happy-dom

import React, { act } from "react";
import { createRoot } from "react-dom/client";
import { afterEach, expect, test, vi } from "vitest";

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

vi.mock("@/components/ui/dropdown-menu", () => ({
  DropdownMenu: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  DropdownMenuContent: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  DropdownMenuItem: ({
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
  DropdownMenuSeparator: () => <hr />,
  DropdownMenuTrigger: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

import { WidgetLibraryRowActions } from "../../../core/admin/ui/widgets/WidgetLibraryRowActions";

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

afterEach(() => {
  document.body.innerHTML = "";
});

test("WidgetLibraryRowActions keeps core actions source-specific", () => {
  const onPreview = vi.fn();
  const onConfigure = vi.fn();
  const onInsert = vi.fn();
  const onFavoriteToggle = vi.fn();

  const view = mount(
    <WidgetLibraryRowActions
      source="core"
      section="all-items"
      isFavorite={false}
      onPreview={onPreview}
      onConfigure={onConfigure}
      onInsert={onInsert}
      onFavoriteToggle={onFavoriteToggle}
    />
  );

  try {
    const buttons = Array.from(view.container.querySelectorAll("button"));
    const preview = buttons.find((button) => button.textContent?.includes("Preview"));
    const configure = buttons.find((button) => button.textContent?.includes("Configure"));
    const insert = buttons.find((button) => button.textContent?.includes("Insert"));
    const favorite = buttons.find((button) =>
      button.textContent?.includes("Add to favorites")
    );
    const duplicate = buttons.find((button) =>
      button.textContent?.includes("Duplicate")
    );

    expect(preview).toBeDefined();
    expect(configure).toBeDefined();
    expect(insert).toBeDefined();
    expect(favorite).toBeDefined();
    expect(duplicate).toBeUndefined();

    act(() => {
      (preview as HTMLButtonElement).click();
      (configure as HTMLButtonElement).click();
      (insert as HTMLButtonElement).click();
      (favorite as HTMLButtonElement).click();
    });

    expect(onPreview).toHaveBeenCalledTimes(1);
    expect(onConfigure).toHaveBeenCalledTimes(1);
    expect(onInsert).toHaveBeenCalledTimes(1);
    expect(onFavoriteToggle).toHaveBeenCalledTimes(1);
  } finally {
    view.cleanup();
  }
});

test("WidgetLibraryRowActions exposes template management only in Templates section", () => {
  const view = mount(
    <WidgetLibraryRowActions
      source="template"
      section="favorites"
      isFavorite
      onPreview={() => undefined}
      onEditTemplate={() => undefined}
      onDuplicateTemplate={() => undefined}
      onDeleteTemplate={() => undefined}
      onFavoriteToggle={() => undefined}
    />
  );

  try {
    expect(view.container.textContent).toContain("Edit template");
    expect(view.container.textContent).toContain("Remove from favorites");
    expect(view.container.textContent).not.toContain("Duplicate");
    expect(view.container.textContent).not.toContain("Delete");
  } finally {
    view.cleanup();
  }

  const templatesView = mount(
    <WidgetLibraryRowActions
      source="template"
      section="templates"
      isFavorite
      onPreview={() => undefined}
      onEditTemplate={() => undefined}
      onDuplicateTemplate={() => undefined}
      onDeleteTemplate={() => undefined}
      onFavoriteToggle={() => undefined}
    />
  );

  try {
    expect(templatesView.container.textContent).toContain("Duplicate");
    expect(templatesView.container.textContent).toContain("Delete");
  } finally {
    templatesView.cleanup();
  }
});
