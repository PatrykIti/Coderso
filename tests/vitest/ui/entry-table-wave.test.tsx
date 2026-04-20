// @vitest-environment happy-dom

import React, { act } from "react";
import { createRoot } from "react-dom/client";
import { afterEach, expect, test, vi } from "vitest";

vi.mock("@/components/ui/avatar", () => ({
  Avatar: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  AvatarFallback: ({ children }: { children: React.ReactNode }) => (
    <span>{children}</span>
  ),
}));

vi.mock("@/components/ui/badge", () => ({
  Badge: ({
    children,
    className,
  }: {
    children: React.ReactNode;
    className?: string;
  }) => <span data-class-name={className}>{children}</span>,
}));

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

vi.mock("@/components/ui/checkbox", () => ({
  Checkbox: ({
    checked,
    onCheckedChange,
    "aria-label": ariaLabel,
  }: {
    checked?: boolean | "indeterminate";
    onCheckedChange?: () => void;
    "aria-label"?: string;
  }) => (
    <input
      type="checkbox"
      aria-label={ariaLabel}
      data-checked={String(checked)}
      checked={checked === true}
      onChange={() => onCheckedChange?.()}
      readOnly={false}
    />
  ),
}));

vi.mock("@/components/ui/dropdown-menu", () => ({
  DropdownMenu: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  DropdownMenuTrigger: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  DropdownMenuContent: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  DropdownMenuItem: ({
    children,
    onClick,
  }: {
    children: React.ReactNode;
    onClick?: () => void;
  }) => (
    <button type="button" onClick={onClick}>
      {children}
    </button>
  ),
  DropdownMenuSeparator: () => <hr />,
}));

vi.mock("@/components/ui/separator", () => ({
  Separator: () => <hr />,
}));

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
  TableHead: ({ children, className }: { children: React.ReactNode; className?: string }) => (
    <th className={className}>{children}</th>
  ),
  TableHeader: ({ children, className }: { children: React.ReactNode; className?: string }) => (
    <thead className={className}>{children}</thead>
  ),
  TableRow: ({ children, className }: { children: React.ReactNode; className?: string }) => (
    <tr className={className}>{children}</tr>
  ),
}));

import { EntryTable } from "../../../core/admin/ui/entries/EntryTable";

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const baseEntry = {
  id: "entry-1",
  typeId: "type-1",
  title: "Hello",
  slug: "hello",
  status: "draft" as const,
  data: {},
  createdAt: "2026-03-06T10:00:00.000Z",
  updatedAt: "not-a-date",
  author: {
    id: "author-1",
    name: "Ada Lovelace",
    email: "ada@example.com",
  },
};

function mount(node: React.ReactNode) {
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
}

afterEach(() => {
  document.body.innerHTML = "";
});

test("EntryTable renders empty state and footer counts", () => {
  const { container, cleanup } = mount(
    <EntryTable entries={[]} emptyMessage="Nothing here yet." selectedIds={[]} />
  );

  expect(container.textContent).toContain("Nothing here yet.");
  expect(container.textContent).toContain("Showing");
  expect(container.textContent).toContain("1-0");
  expect(container.textContent).toContain("of 0");

  cleanup();
});

test("EntryTable renders button and static title branches plus author and date fallbacks", () => {
  const { container, cleanup } = mount(
    <EntryTable
      entries={[
        baseEntry,
        {
          ...baseEntry,
          id: "entry-2",
          title: "World",
          slug: "world",
          status: "published",
          updatedAt: "",
          author: null,
        },
      ]}
      selectedIds={["entry-1"]}
      onEdit={() => undefined}
    />
  );

  expect(container.textContent).toContain("Hello");
  expect(container.textContent).toContain("World");
  expect(container.textContent).toContain("Ada Lovelace");
  expect(container.textContent).toContain("AL");
  expect(container.textContent).toContain("System");
  expect(container.textContent).toContain("not-a-date");
  expect(container.textContent).toContain("—");
  expect(container.innerHTML).toContain("group bg-muted/30");

  cleanup();
});

test("EntryTable forwards select, edit, and delete callbacks", () => {
  const onToggleAll = vi.fn();
  const onToggleEntry = vi.fn();
  const onEdit = vi.fn();
  const onDelete = vi.fn();

  const { container, cleanup } = mount(
    <EntryTable
      entries={[baseEntry]}
      selectedIds={[]}
      isAllSelected={false}
      isIndeterminate
      onToggleAll={onToggleAll}
      onToggleEntry={onToggleEntry}
      onEdit={onEdit}
      onDelete={onDelete}
    />
  );

  const checkboxes = Array.from(container.querySelectorAll("input[type='checkbox']"));
  const selectAll = checkboxes[0];
  const selectEntry = checkboxes[1];
  const editButton = Array.from(container.querySelectorAll("button")).find((button) =>
    button.textContent?.includes("Edit")
  );
  const deleteButton = Array.from(container.querySelectorAll("button")).find((button) =>
    button.textContent?.includes("Delete")
  );

  if (!(selectAll instanceof HTMLInputElement)) {
    throw new Error("Missing select all checkbox");
  }
  if (!(selectEntry instanceof HTMLInputElement)) {
    throw new Error("Missing entry checkbox");
  }
  if (!(editButton instanceof HTMLButtonElement)) {
    throw new Error("Missing edit action");
  }
  if (!(deleteButton instanceof HTMLButtonElement)) {
    throw new Error("Missing delete action");
  }

  expect(selectAll.getAttribute("data-checked")).toBe("indeterminate");

  act(() => {
    selectAll.click();
    selectEntry.click();
    editButton.click();
    deleteButton.click();
  });

  expect(onToggleAll).toHaveBeenCalledTimes(1);
  expect(onToggleEntry).toHaveBeenCalledWith("entry-1");
  expect(onEdit).toHaveBeenCalledWith("entry-1");
  expect(onDelete).toHaveBeenCalledWith("entry-1");

  cleanup();
});
