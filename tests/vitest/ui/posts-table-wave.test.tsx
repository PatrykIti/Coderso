// @vitest-environment happy-dom

import React from "react";
import { createRoot } from "react-dom/client";
import { afterEach, expect, test, vi } from "vitest";

import { PostsTable } from "../../../core/admin/ui/posts/PostsTable";

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

vi.mock("@/components/ui/table", () => ({
  Table: ({ children }: { children: React.ReactNode }) => <table>{children}</table>,
  TableBody: ({ children }: { children: React.ReactNode }) => <tbody>{children}</tbody>,
  // Forward structural props so passive-row and responsive contracts can be asserted.
  TableCell: ({
    children,
    colSpan,
    className,
    onClick,
  }: {
    children: React.ReactNode;
    colSpan?: number;
    className?: string;
    onClick?: (event: React.MouseEvent) => void;
  }) => (
    <td colSpan={colSpan} className={className} onClick={onClick}>
      {children}
    </td>
  ),
  TableHead: ({ children, className }: { children: React.ReactNode; className?: string }) => (
    <th className={className}>{children}</th>
  ),
  TableHeader: ({ children, className }: { children: React.ReactNode; className?: string }) => (
    <thead className={className}>{children}</thead>
  ),
  TableRow: ({ children, ...props }: React.ComponentProps<"tr">) => <tr {...props}>{children}</tr>,
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
    prefetch,
    "aria-label": ariaLabel,
  }: {
    children: React.ReactNode;
    href: string;
    prefetch?: boolean;
    "aria-label"?: string;
  }) => (
    <a href={href} aria-label={ariaLabel} data-prefetch={String(Boolean(prefetch))}>
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
    actionLabel,
  }: {
    status: string;
    onEdit: () => void;
    onPreview: () => void;
    onPublish: () => void;
    onUnpublish: () => void;
    onDuplicate: () => void;
    onDelete?: () => void;
    actionLabel?: string;
  }) => (
    <div
      data-status={status}
      data-has-delete={String(Boolean(onDelete))}
      data-action-label={actionLabel}
    >
      <button type="button" onClick={onEdit}>
        edit-post
      </button>
      <button type="button" onClick={onPreview}>
        preview-post
      </button>
      <button type="button" onClick={onPublish}>
        publish-post
      </button>
      <button type="button" onClick={onUnpublish}>
        unpublish-post
      </button>
      <button type="button" onClick={onDuplicate}>
        duplicate-post
      </button>
      {onDelete ? (
        <button type="button" onClick={onDelete}>
          delete-post
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

const clickCheckbox = (container: HTMLElement, label: string) => {
  const checkbox = container.querySelector(`input[aria-label="${label}"]`);
  if (!(checkbox instanceof HTMLInputElement)) {
    throw new Error(`Missing checkbox: ${label}`);
  }
  React.act(() => {
    checkbox.click();
  });
};

afterEach(() => {
  vi.restoreAllMocks();
});

test("PostsTable renders empty state and custom message", () => {
  const view = mount(
    <PostsTable
      items={[]}
      emptyMessage="No posts in this workspace."
      onEdit={() => undefined}
      onPreview={() => undefined}
      onPublish={() => undefined}
      onUnpublish={() => undefined}
      onDuplicate={() => undefined}
    />
  );

  try {
    expect(view.container.textContent).toContain("No posts in this workspace.");
    expect(view.container.querySelector("input[aria-label='Select all posts']")).toBeTruthy();
  } finally {
    view.cleanup();
  }
});

test("PostsTable renders fallback status, author, tag, and date values", () => {
  const dateSpy = vi.spyOn(Date.prototype, "toLocaleDateString").mockImplementation(() => {
    throw new Error("date failed");
  });

  const view = mount(
    <PostsTable
      items={
        [
          {
            id: "post-1",
            title: "Launch",
            slug: "/launch",
            status: "custom_status",
            tags: [],
            publishedAt: null,
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
    expect(view.container.textContent).toContain("Unknown");
    // Published cell renders "—" for publishedAt: null.
    expect(view.container.textContent).toContain("—");
    // TASK-497-01: the Updated column is dropped, so updatedAt no longer renders.
    expect(view.container.textContent).not.toContain("2026-03-06T12:00:00.000Z");
    expect(view.container.textContent).toContain("N");
  } finally {
    dateSpy.mockRestore();
    view.cleanup();
  }
});

test("PostsTable renders lean columns, first-name author, and forwards row action callbacks", () => {
  const onEdit = vi.fn();
  const onPreview = vi.fn();
  const onPublish = vi.fn();
  const onUnpublish = vi.fn();
  const onDuplicate = vi.fn();
  const onDelete = vi.fn();

  const post = {
    id: "post-1",
    title: "Launch",
    slug: "/launch",
    status: "draft",
    tags: ["news", "release", "launch", "extra"],
    publishedAt: "2026-03-01T12:00:00.000Z",
    updatedAt: "2026-03-06T12:00:00.000Z",
    author: { id: "author-1", name: "Admin User", email: "admin@example.com" },
  };

  const view = mount(
    <PostsTable
      items={[post] as never}
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
    const titleLink = view.container.querySelector("a");
    expect(titleLink?.getAttribute("href")).toBe("/posts/post-1");
    expect(titleLink?.getAttribute("data-prefetch")).toBe("true");
    expect(titleLink?.getAttribute("aria-label")).toBe("Edit post: Launch");
    expect(
      view.container.querySelector("[data-action-label]")?.getAttribute("data-action-label")
    ).toBe("Actions for Launch");

    const fallbackMetadata = view.container.querySelector("[data-post-row-metadata='fallback']");
    const fallbackStatus = view.container.querySelector("[data-post-row-status-fallback='true']");
    expect(fallbackMetadata?.className).toContain("lg:hidden");
    expect(fallbackMetadata?.className).not.toContain("md:hidden");
    expect(fallbackStatus?.className).toBe("md:hidden");
    expect(fallbackMetadata?.children[2]?.className).toBe("");
    expect(fallbackMetadata?.querySelector("time")?.className).toBe("");
    expect(fallbackMetadata?.querySelector("time")?.getAttribute("datetime")).toBe(
      post.publishedAt
    );
    const separators = Array.from(fallbackMetadata?.querySelectorAll("[aria-hidden='true']") ?? []);
    expect(separators).toHaveLength(2);

    const bodyCells = Array.from(view.container.querySelectorAll("tbody td"));
    expect(bodyCells[2]?.className).toBe("hidden md:table-cell");
    expect(bodyCells[3]?.className).toBe("hidden lg:table-cell");
    expect(bodyCells[4]?.className).toBe("hidden text-sm text-muted-foreground lg:table-cell");
    // TASK-497-01: tags column dropped; author cell shows first name only (Avatar initials
    // still derive from the full name).
    expect(view.container.textContent).toContain("Admin");
    expect(view.container.textContent).not.toContain("Admin User");
    expect(view.container.textContent).not.toContain("news, release, launch");

    clickByText(view.container, "edit-post");
    clickByText(view.container, "preview-post");
    clickByText(view.container, "publish-post");
    clickByText(view.container, "unpublish-post");
    clickByText(view.container, "duplicate-post");
    clickByText(view.container, "delete-post");

    expect(onEdit).toHaveBeenCalledWith("post-1");
    expect(onPreview).toHaveBeenCalledWith("post-1");
    expect(onPublish).toHaveBeenCalledWith("post-1");
    expect(onUnpublish).toHaveBeenCalledWith("post-1");
    expect(onDuplicate).toHaveBeenCalledWith("post-1");
    expect(onDelete).toHaveBeenCalledWith("post-1");
  } finally {
    view.cleanup();
  }
});

test("PostsTable controls header and row selection state", () => {
  const onToggleAll = vi.fn();
  const onTogglePost = vi.fn();
  const post = {
    id: "post-1",
    title: "Launch",
    slug: "/launch",
    status: "draft",
    tags: ["news"],
    publishedAt: null,
    updatedAt: "2026-03-06T12:00:00.000Z",
    author: { id: "author-1", name: "Admin User", email: "admin@example.com" },
  };

  const view = mount(
    <PostsTable
      items={[post] as never}
      selectedIds={["post-1"]}
      isAllSelected
      onToggleAll={onToggleAll}
      onTogglePost={onTogglePost}
      onEdit={() => undefined}
      onPreview={() => undefined}
      onPublish={() => undefined}
      onUnpublish={() => undefined}
      onDuplicate={() => undefined}
    />
  );

  try {
    expect(
      view.container.querySelector('input[aria-label="Select all posts"]')?.getAttribute("checked")
    ).not.toBeNull();
    expect(
      view.container.querySelector('input[aria-label="Select Launch"]')?.getAttribute("checked")
    ).not.toBeNull();

    clickCheckbox(view.container, "Select all posts");
    clickCheckbox(view.container, "Select Launch");

    expect(onToggleAll).toHaveBeenCalledTimes(1);
    expect(onTogglePost).toHaveBeenCalledWith("post-1");
  } finally {
    view.cleanup();
  }
});

test("PostsTable exposes indeterminate header state", () => {
  const post = {
    id: "post-1",
    title: "Launch",
    slug: "/launch",
    status: "draft",
    tags: ["news"],
    publishedAt: null,
    updatedAt: "2026-03-06T12:00:00.000Z",
    author: { id: "author-1", name: "Admin User", email: "admin@example.com" },
  };

  const view = mount(
    <PostsTable
      items={[post] as never}
      selectedIds={["post-1"]}
      isIndeterminate
      onEdit={() => undefined}
      onPreview={() => undefined}
      onPublish={() => undefined}
      onUnpublish={() => undefined}
      onDuplicate={() => undefined}
    />
  );

  try {
    expect(
      view.container
        .querySelector('input[aria-label="Select all posts"]')
        ?.getAttribute("data-indeterminate")
    ).toBe("true");
  } finally {
    view.cleanup();
  }
});

test("PostsTable omits delete action when onDelete is not provided", () => {
  const view = mount(
    <PostsTable
      items={
        [
          {
            id: "post-1",
            title: "Launch",
            slug: "/launch",
            status: "published",
            tags: ["news"],
            publishedAt: "2026-03-01T12:00:00.000Z",
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
    expect(view.container.textContent).not.toContain("delete-post");
  } finally {
    view.cleanup();
  }
});

test("PostsTable renders a quiet header on a soft-shadow container with lean columns", () => {
  const post = {
    id: "post-1",
    title: "Launch",
    slug: "launch",
    status: "draft",
    tags: ["news"],
    publishedAt: "2026-03-01T12:00:00.000Z",
    updatedAt: "2026-03-06T12:00:00.000Z",
    author: { id: "author-1", name: "Admin User", email: "admin@example.com" },
  };

  const view = mount(
    <PostsTable
      items={[post] as never}
      onEdit={() => undefined}
      onPreview={() => undefined}
      onPublish={() => undefined}
      onUnpublish={() => undefined}
      onDuplicate={() => undefined}
    />
  );

  try {
    // A4: soft-shadow card (not the old shadow-card).
    const wrapper = view.container.querySelector("div");
    expect(wrapper?.className).toContain("shadow-soft");
    expect(wrapper?.className).not.toContain("shadow-card");

    // A5: quiet header — no bg-muted/40 surface, no uppercase/tracking-wider chrome.
    const thead = view.container.querySelector("thead");
    expect(thead?.className ?? "").not.toContain("bg-muted/40");
    const headerCells = Array.from(view.container.querySelectorAll("thead th"));
    expect(headerCells.some((cell) => cell.className.includes("uppercase"))).toBe(false);
    expect(headerCells.some((cell) => cell.className.includes("tracking-wider"))).toBe(false);

    // A6/D3: lean columns.
    const headerText = thead?.textContent ?? "";
    expect(headerText).toContain("Title");
    expect(headerText).toContain("Status");
    expect(headerText).toContain("Author");
    expect(headerText).toContain("Published");
    expect(headerText).toContain("Actions");
    expect(headerText).not.toContain("Comments");
    expect(headerText).not.toContain("Categories");
    expect(headerText).not.toContain("Updated");

    // A8: first-name author. D3: slug subtitle preserved in mono.
    expect(view.container.textContent).toContain("Admin");
    expect(view.container.textContent).not.toContain("Admin User");
    const slug = Array.from(view.container.querySelectorAll("span")).find((node) =>
      node.className.includes("font-mono")
    );
    expect(slug?.textContent).toBe("launch");

    const dataRow = view.container.querySelector("tbody tr");
    expect(dataRow?.className ?? "").not.toContain("cursor-pointer");
    expect(dataRow?.getAttribute("role")).toBeNull();
    expect(dataRow?.getAttribute("tabindex")).toBeNull();
    expect(dataRow?.getAttribute("onclick")).toBeNull();
  } finally {
    view.cleanup();
  }
});

test("PostsTable keeps the row passive and isolates checkbox and action callbacks", () => {
  const onEdit = vi.fn();
  const onTogglePost = vi.fn();
  const onPreview = vi.fn();
  const post = {
    id: "post-1",
    title: "Launch",
    slug: "launch",
    status: "draft",
    tags: ["news"],
    publishedAt: null,
    updatedAt: "2026-03-06T12:00:00.000Z",
    author: { id: "author-1", name: "Admin User", email: "admin@example.com" },
  };

  const view = mount(
    <PostsTable
      items={[post] as never}
      onTogglePost={onTogglePost}
      onEdit={onEdit}
      onPreview={onPreview}
      onPublish={() => undefined}
      onUnpublish={() => undefined}
      onDuplicate={() => undefined}
      onDelete={() => undefined}
    />
  );

  try {
    const dataRow = view.container.querySelector("tbody tr");
    React.act(() => {
      dataRow?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
      dataRow?.dispatchEvent(new KeyboardEvent("keydown", { bubbles: true, key: "Enter" }));
      dataRow?.dispatchEvent(new KeyboardEvent("keydown", { bubbles: true, key: " " }));
    });
    expect(onEdit).not.toHaveBeenCalled();

    const checkbox = view.container.querySelector('input[aria-label="Select Launch"]');
    React.act(() => {
      (checkbox as HTMLInputElement).click();
    });
    expect(onTogglePost).toHaveBeenCalledWith("post-1");
    expect(onEdit).not.toHaveBeenCalled();

    clickByText(view.container, "preview-post");
    expect(onPreview).toHaveBeenCalledWith("post-1");
    expect(onEdit).not.toHaveBeenCalled();
  } finally {
    view.cleanup();
  }
});
