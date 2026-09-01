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
    ...props
  }: {
    children: React.ReactNode;
    onClick?: (event: React.MouseEvent<HTMLButtonElement>) => void;
    disabled?: boolean;
    [key: string]: unknown;
  }) => (
    <button type="button" onClick={onClick} disabled={disabled} {...props}>
      {children}
    </button>
  ),
}));

vi.mock("@/components/ui/checkbox", () => ({
  Checkbox: ({
    checked,
    onCheckedChange,
    ...props
  }: {
    checked?: boolean | "indeterminate";
    onCheckedChange?: (checked: boolean) => void;
    [key: string]: unknown;
  }) => (
    <button
      type="button"
      aria-checked={checked === true ? "true" : "false"}
      data-checked={String(Boolean(checked))}
      onClick={() => onCheckedChange?.(!checked)}
      {...props}
    />
  ),
}));

vi.mock("@/components/ui/dialog", () => ({
  Dialog: ({ children, open }: { children: React.ReactNode; open: boolean }) =>
    open ? <div data-dialog-open="true">{children}</div> : null,
  DialogContent: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  DialogHeader: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  DialogTitle: ({ children }: { children: React.ReactNode }) => <h2>{children}</h2>,
  DialogDescription: ({ children }: { children: React.ReactNode }) => <p>{children}</p>,
  DialogFooter: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

vi.mock("@/components/ui/scroll-area", () => ({
  ScrollArea: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

vi.mock("@/components/ui/separator", () => ({
  Separator: () => <hr />,
}));

import { EntryDeleteDialog } from "../../../core/admin/ui/entries/EntryDeleteDialog";
import { EntryTitleSlugFields } from "../../../core/admin/ui/entries/EntryTitleSlugFields";
import { EntryTypeSidebar } from "../../../core/admin/ui/entries/EntryTypeSidebar";
import { slugify } from "../../../core/admin/ui/entries/entrySlug";

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

test("EntryTitleSlugFields regenerates the slug from the title", () => {
  const onSlugChange = vi.fn();
  const view = mount(
    <EntryTitleSlugFields
      title="Launch Post"
      slug="old-slug"
      titleRef={null}
      onTitleChange={vi.fn()}
      onSlugChange={onSlugChange}
    />
  );
  try {
    const slugInput = view.container.querySelector<HTMLInputElement>("input");
    expect(slugInput?.value).toBe("old-slug");
    const regenerate = Array.from(view.container.querySelectorAll("button")).find(
      (button) => button.querySelector("svg") !== null
    );
    expect(regenerate).toBeInstanceOf(HTMLButtonElement);
    React.act(() => {
      regenerate?.click();
    });
    expect(onSlugChange).toHaveBeenCalledTimes(1);
    expect(onSlugChange).toHaveBeenCalledWith(slugify("Launch Post"));
  } finally {
    view.cleanup();
  }
});

test("EntryTypeSidebar hide-empty checkbox filters out empty types", () => {
  const view = mount(
    <EntryTypeSidebar
      types={[
        { id: "t-1", slug: "articles", name: "Articles", count: 2 },
        { id: "t-2", slug: "drafts", name: "Drafts", count: 0 },
      ]}
      activeSlug="articles"
      onSelect={vi.fn()}
    />
  );
  try {
    expect(view.container.textContent).toContain("Articles");
    expect(view.container.textContent).toContain("Drafts");

    const hideEmpty = view.container.querySelector<HTMLButtonElement>(
      'button[aria-label="Hide empty content types"]'
    );
    expect(hideEmpty).toBeInstanceOf(HTMLButtonElement);
    expect(hideEmpty?.getAttribute("data-checked")).toBe("false");
    React.act(() => {
      hideEmpty?.click();
    });
    expect(hideEmpty?.getAttribute("data-checked")).toBe("true");
    expect(view.container.textContent).toContain("Articles");
    expect(view.container.textContent).not.toContain("Drafts");
  } finally {
    view.cleanup();
  }
});

test("EntryDeleteDialog cancel closes the dialog", () => {
  const onOpenChange = vi.fn();
  const view = mount(
    <EntryDeleteDialog
      open
      onOpenChange={onOpenChange}
      title="Delete entry"
      description="This cannot be undone."
      onConfirm={vi.fn()}
    />
  );
  try {
    expect(view.container.querySelector('[data-dialog-open="true"]')).not.toBeNull();
    const cancel = Array.from(view.container.querySelectorAll("button")).find((button) =>
      button.textContent?.includes("Cancel")
    );
    expect(cancel).toBeInstanceOf(HTMLButtonElement);
    React.act(() => {
      cancel?.click();
    });
    expect(onOpenChange).toHaveBeenCalledWith(false);
  } finally {
    view.cleanup();
  }
});
