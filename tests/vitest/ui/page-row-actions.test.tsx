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
  DropdownMenuTrigger: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  DropdownMenuContent: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  DropdownMenuSeparator: () => <hr />,
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
}));

import { PageRowActions } from "../../../core/admin/ui/pages/PageRowActions";

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

test("PageRowActions routes actions and disables publish/delete when unavailable", () => {
  const onEdit = vi.fn();
  const onPreview = vi.fn();
  const onDuplicate = vi.fn();
  const onPublish = vi.fn();
  const onUnpublish = vi.fn();

  const view = mount(
    <PageRowActions
      status="draft"
      onEdit={onEdit}
      onPreview={onPreview}
      onDuplicate={onDuplicate}
      onPublish={onPublish}
      onUnpublish={onUnpublish}
    />
  );

  try {
    const buttons = Array.from(view.container.querySelectorAll("button"));
    const trigger = buttons[0];
    const editButton = buttons.find((button) => button.textContent?.includes("Edit"));
    const previewButton = buttons.find((button) => button.textContent?.includes("Preview"));
    const duplicateButton = buttons.find((button) => button.textContent?.includes("Duplicate"));
    const publishButton = buttons.find((button) => button.textContent?.includes("Publish"));
    const unpublishButton = buttons.find((button) => button.textContent?.includes("Unpublish"));
    const deleteButton = buttons.find((button) => button.textContent?.includes("Delete"));

    expect(trigger).toBeDefined();
    expect(publishButton?.hasAttribute("disabled")).toBe(false);
    expect(unpublishButton?.hasAttribute("disabled")).toBe(true);
    expect(deleteButton?.hasAttribute("disabled")).toBe(true);

    act(() => {
      (editButton as HTMLButtonElement).click();
      (previewButton as HTMLButtonElement).click();
      (duplicateButton as HTMLButtonElement).click();
      (publishButton as HTMLButtonElement).click();
    });

    expect(onEdit).toHaveBeenCalledTimes(1);
    expect(onPreview).toHaveBeenCalledTimes(1);
    expect(onDuplicate).toHaveBeenCalledTimes(1);
    expect(onPublish).toHaveBeenCalledTimes(1);
    expect(onUnpublish).not.toHaveBeenCalled();
  } finally {
    view.cleanup();
  }
});

test("PageRowActions enables unpublish/delete for published pages and respects disabled trigger", () => {
  const onUnpublish = vi.fn();
  const onDelete = vi.fn();

  const view = mount(
    <PageRowActions
      status="published"
      onEdit={() => undefined}
      onPreview={() => undefined}
      onDuplicate={() => undefined}
      onPublish={() => undefined}
      onUnpublish={onUnpublish}
      onDelete={onDelete}
      disabled
    />
  );

  try {
    const buttons = Array.from(view.container.querySelectorAll("button"));
    const trigger = buttons[0];
    const publishButton = buttons.find((button) => button.textContent?.includes("Publish"));
    const unpublishButton = buttons.find((button) => button.textContent?.includes("Unpublish"));
    const deleteButton = buttons.find((button) => button.textContent?.includes("Delete"));

    expect(trigger?.hasAttribute("disabled")).toBe(true);
    expect(publishButton?.hasAttribute("disabled")).toBe(true);
    expect(unpublishButton?.hasAttribute("disabled")).toBe(false);
    expect(deleteButton?.hasAttribute("disabled")).toBe(false);

    act(() => {
      (unpublishButton as HTMLButtonElement).click();
      (deleteButton as HTMLButtonElement).click();
    });

    expect(onUnpublish).toHaveBeenCalledTimes(1);
    expect(onDelete).toHaveBeenCalledTimes(1);
  } finally {
    view.cleanup();
  }
});

test("PageRowActions disables delete without handler and keeps publish available for archived pages", () => {
  const onPublish = vi.fn();

  const view = mount(
    <PageRowActions
      status="archived"
      onEdit={() => undefined}
      onPreview={() => undefined}
      onDuplicate={() => undefined}
      onPublish={onPublish}
      onUnpublish={() => undefined}
    />
  );

  try {
    const buttons = Array.from(view.container.querySelectorAll("button"));
    const publishButton = buttons.find((button) => button.textContent?.includes("Publish"));
    const unpublishButton = buttons.find((button) => button.textContent?.includes("Unpublish"));
    const deleteButton = buttons.find((button) => button.textContent?.includes("Delete"));

    expect(publishButton?.hasAttribute("disabled")).toBe(false);
    expect(unpublishButton?.hasAttribute("disabled")).toBe(true);
    expect(deleteButton?.hasAttribute("disabled")).toBe(true);

    act(() => {
      (publishButton as HTMLButtonElement).click();
    });

    expect(onPublish).toHaveBeenCalledTimes(1);
  } finally {
    view.cleanup();
  }
});
