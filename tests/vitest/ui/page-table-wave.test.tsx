// @vitest-environment happy-dom

import React from "react";
import { createRoot } from "react-dom/client";
import { afterEach, expect, test, vi } from "vitest";

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

vi.mock("@/components/ui/table", () => ({
  Table: ({ children }: { children: React.ReactNode }) => <table>{children}</table>,
  TableBody: ({ children }: { children: React.ReactNode }) => <tbody>{children}</tbody>,
  TableCell: ({
    children,
    colSpan,
    className,
  }: {
    children: React.ReactNode;
    colSpan?: number;
    className?: string;
  }) => (
    <td colSpan={colSpan} className={className}>
      {children}
    </td>
  ),
  TableHead: ({ children }: { children: React.ReactNode }) => <th>{children}</th>,
  TableHeader: ({ children }: { children: React.ReactNode }) => <thead>{children}</thead>,
  TableRow: ({ children }: { children: React.ReactNode }) => <tr>{children}</tr>,
}));

vi.mock("@/components/ui/badge", () => ({
  Badge: ({ children, className }: { children: React.ReactNode; className?: string }) => (
    <span data-badge-class={className}>{children}</span>
  ),
}));

vi.mock("@/components/ui/checkbox", () => ({
  Checkbox: ({
    "aria-label": ariaLabel,
    checked,
    onCheckedChange,
  }: {
    "aria-label"?: string;
    checked?: boolean | "indeterminate";
    onCheckedChange?: (checked: boolean) => void;
  }) => (
    <input
      type="checkbox"
      aria-label={ariaLabel}
      checked={checked === true}
      data-indeterminate={String(checked === "indeterminate")}
      onChange={(event) => onCheckedChange?.(event.target.checked)}
    />
  ),
}));

vi.mock("@/components/ui/avatar", () => ({
  Avatar: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  AvatarFallback: ({ children }: { children: React.ReactNode }) => <span>{children}</span>,
}));

vi.mock("@/ui/shared/AdminLink", () => ({
  AdminLink: ({
    children,
    href,
    "aria-label": ariaLabel,
  }: {
    children: React.ReactNode;
    href: string;
    "aria-label"?: string;
  }) => (
    <a href={href} aria-label={ariaLabel}>
      {children}
    </a>
  ),
}));

vi.mock("../../../core/admin/ui/pages/PageRowActions", () => ({
  PageRowActions: ({
    status,
    onEdit,
    onPreview,
    onPublish,
    onUnpublish,
    onDuplicate,
    onDelete,
  }: {
    status: string;
    onEdit: () => void;
    onPreview: () => void;
    onPublish: () => void;
    onUnpublish: () => void;
    onDuplicate: () => void;
    onDelete?: () => void;
  }) => (
    <div data-status={status} data-has-delete={String(Boolean(onDelete))}>
      <button type="button" onClick={onEdit}>
        edit-page
      </button>
      <button type="button" onClick={onPreview}>
        preview-page
      </button>
      <button type="button" onClick={onPublish}>
        publish-page
      </button>
      <button type="button" onClick={onUnpublish}>
        unpublish-page
      </button>
      <button type="button" onClick={onDuplicate}>
        duplicate-page
      </button>
      {onDelete ? (
        <button type="button" onClick={onDelete}>
          delete-page
        </button>
      ) : null}
    </div>
  ),
}));

const mount = (node: React.ReactNode) => {
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
};

const clickByText = (container: HTMLElement, text: string) => {
  const button = Array.from(container.querySelectorAll("button")).find((candidate) =>
    candidate.textContent?.includes(text)
  );
  if (!button) {
    throw new Error(`Missing button: ${text}`);
  }
  React.act(() => {
    button.dispatchEvent(new MouseEvent("click", { bubbles: true }));
  });
};

afterEach(() => {
  vi.restoreAllMocks();
});

test("PageTable renders empty state and custom message", async () => {
  const { PageTable } = await import("../../../core/admin/ui/pages/PageTable");

  const view = mount(
    <PageTable
      items={[]}
      emptyMessage="No pages in this workspace."
      onEdit={() => undefined}
      onPreview={() => undefined}
      onPublish={() => undefined}
      onUnpublish={() => undefined}
      onDuplicate={() => undefined}
    />
  );

  try {
    expect(view.container.textContent).toContain("No pages in this workspace.");
    expect(view.container.querySelector("input[aria-label='Select all pages']")).toBeTruthy();
  } finally {
    view.cleanup();
  }
});

test("PageTable renders fallback status, author, and date values", async () => {
  const { PageTable } = await import("../../../core/admin/ui/pages/PageTable");
  const dateSpy = vi.spyOn(Date.prototype, "toLocaleDateString").mockImplementation(() => {
    throw new Error("date failed");
  });

  const view = mount(
    <PageTable
      items={
        [
          {
            id: "page-1",
            title: "Landing",
            slug: "/landing",
            status: "custom_status",
            updatedAt: "2026-03-06T12:00:00.000Z",
            author: null,
          },
        ] as never
      }
      onEdit={() => undefined}
      onPreview={() => undefined}
      onPublish={() => undefined}
      onUnpublish={() => undefined}
      onDuplicate={() => undefined}
    />
  );

  try {
    expect(view.container.textContent).toContain("custom_status");
    expect(view.container.textContent).toContain("No author");
    expect(view.container.textContent).toContain("2026-03-06T12:00:00.000Z");
    expect(view.container.textContent).toContain("NA");
  } finally {
    dateSpy.mockRestore();
    view.cleanup();
  }
});

test("PageTable wires controlled selection state", async () => {
  const { PageTable } = await import("../../../core/admin/ui/pages/PageTable");

  const onToggleAll = vi.fn();
  const onTogglePage = vi.fn();

  const view = mount(
    <PageTable
      items={
        [
          {
            id: "page-1",
            title: "Landing",
            slug: "/landing",
            status: "draft",
            updatedAt: "2026-03-06T12:00:00.000Z",
            author: { id: "author-1", name: "Admin User", email: "admin@example.com" },
          },
        ] as never
      }
      selectedIds={["page-1"]}
      isAllSelected={false}
      isIndeterminate={true}
      onToggleAll={onToggleAll}
      onTogglePage={onTogglePage}
      onEdit={() => undefined}
      onPreview={() => undefined}
      onPublish={() => undefined}
      onUnpublish={() => undefined}
      onDuplicate={() => undefined}
    />
  );

  try {
    const checkboxes = Array.from(view.container.querySelectorAll("input[type='checkbox']"));
    expect(checkboxes[0]?.getAttribute("data-indeterminate")).toBe("true");
    expect((checkboxes[1] as HTMLInputElement | undefined)?.checked).toBe(true);

    React.act(() => {
      (checkboxes[0] as HTMLInputElement | undefined)?.dispatchEvent(
        new MouseEvent("click", { bubbles: true })
      );
      (checkboxes[1] as HTMLInputElement | undefined)?.dispatchEvent(
        new MouseEvent("click", { bubbles: true })
      );
    });

    expect(onToggleAll).toHaveBeenCalledTimes(1);
    expect(onTogglePage).toHaveBeenCalledWith("page-1");
  } finally {
    view.cleanup();
  }
});

test("PageTable forwards row action callbacks and delete availability", async () => {
  const { PageTable } = await import("../../../core/admin/ui/pages/PageTable");

  const onEdit = vi.fn();
  const onPreview = vi.fn();
  const onPublish = vi.fn();
  const onUnpublish = vi.fn();
  const onDuplicate = vi.fn();
  const onDelete = vi.fn();

  const page = {
    id: "page-1",
    title: "Landing",
    slug: "/landing",
    status: "draft",
    updatedAt: "2026-03-06T12:00:00.000Z",
    author: { id: "author-1", name: "Admin User", email: "admin@example.com" },
  };

  const view = mount(
    <PageTable
      items={[page] as never}
      onEdit={onEdit}
      onPreview={onPreview}
      onPublish={onPublish}
      onUnpublish={onUnpublish}
      onDuplicate={onDuplicate}
      onDelete={onDelete}
    />
  );

  try {
    expect(view.container.querySelector("[data-has-delete='true']")).toBeTruthy();
    expect(view.container.textContent).toContain("AU");
    expect(view.container.querySelector("a")?.getAttribute("href")).toBe("/pages/page-1");

    clickByText(view.container, "edit-page");
    clickByText(view.container, "preview-page");
    clickByText(view.container, "publish-page");
    clickByText(view.container, "unpublish-page");
    clickByText(view.container, "duplicate-page");
    clickByText(view.container, "delete-page");

    expect(onEdit).toHaveBeenCalledWith("page-1");
    expect(onPreview).toHaveBeenCalledWith("page-1");
    expect(onPublish).toHaveBeenCalledWith("page-1");
    expect(onUnpublish).toHaveBeenCalledWith("page-1");
    expect(onDuplicate).toHaveBeenCalledWith("page-1");
    expect(onDelete).toHaveBeenCalledWith("page-1");
  } finally {
    view.cleanup();
  }
});

test("PageTable omits delete action when onDelete is not provided", async () => {
  const { PageTable } = await import("../../../core/admin/ui/pages/PageTable");

  const view = mount(
    <PageTable
      items={
        [
          {
            id: "page-1",
            title: "Landing",
            slug: "/landing",
            status: "published",
            updatedAt: "2026-03-06T12:00:00.000Z",
            author: { id: "author-1", name: "Admin User", email: "admin@example.com" },
          },
        ] as never
      }
      onEdit={() => undefined}
      onPreview={() => undefined}
      onPublish={() => undefined}
      onUnpublish={() => undefined}
      onDuplicate={() => undefined}
    />
  );

  try {
    expect(view.container.querySelector("[data-has-delete='false']")).toBeTruthy();
    expect(view.container.textContent).not.toContain("delete-page");
  } finally {
    view.cleanup();
  }
});
