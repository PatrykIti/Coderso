// TASK-487-02-L02: the revision drawer is a prop-driven surface (list state,
// preview toggle, restore confirm). This suite pins its four states plus the
// confirm-gated restore path without needing the full editor. Editor-level
// wiring (History click -> listEntryRevisionsCached, restore -> re-hydrate)
// lives in entry-editor-visibility-groups.test.tsx.

// @vitest-environment happy-dom

import React from "react";
import { createRoot } from "react-dom/client";
import { afterEach, expect, test, vi } from "vitest";

import { EntryRevisionDrawer } from "../../../core/admin/ui/entries/EntryRevisionDrawer";
import type { EntryRevision } from "../../../core/admin/services/entriesClient";

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

vi.mock("@/components/ui/scroll-area", () => ({
  ScrollArea: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

vi.mock("@/components/ui/sheet", () => ({
  Sheet: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  SheetClose: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  SheetContent: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  SheetDescription: ({ children }: { children: React.ReactNode }) => <p>{children}</p>,
  SheetTitle: ({ children }: { children: React.ReactNode }) => <p>{children}</p>,
}));

vi.mock("@/ui/shared/ConfirmActionDialog", () => ({
  ConfirmActionDialog: ({
    open,
    title,
    description,
    confirmLabel,
    isConfirming,
    onConfirm,
    children,
  }: {
    open: boolean;
    title: React.ReactNode;
    description?: React.ReactNode;
    confirmLabel: string;
    isConfirming?: boolean;
    onConfirm: () => void;
    children?: React.ReactNode;
  }) =>
    open ? (
      <div role="dialog">
        <p>{title}</p>
        {description ? <p>{description}</p> : null}
        {children}
        <button type="button" onClick={onConfirm} disabled={Boolean(isConfirming)}>
          {confirmLabel}
        </button>
      </div>
    ) : null,
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

const baseProps = {
  open: true,
  onOpenChange: vi.fn(),
  revisions: [] as EntryRevision[],
  isLoading: false,
  error: null as string | null,
  restoringId: null as string | null,
  onRestore: vi.fn(),
};

const revision = (overrides: Partial<EntryRevision> = {}): EntryRevision => ({
  id: "rev-2",
  entryId: "entry-42",
  version: 2,
  data: { title: "Draft two", summary: "Intro text" },
  createdAt: "2026-06-20T09:30:00Z",
  createdBy: { id: "user-1", name: "Maria Nowak", email: "maria@example.com" },
  ...overrides,
});

afterEach(() => {
  vi.restoreAllMocks();
  document.body.innerHTML = "";
});

test("loading state renders while revisions are being fetched", () => {
  const { container, cleanup } = mount(<EntryRevisionDrawer {...baseProps} isLoading />);
  try {
    expect(container.textContent).toContain("Loading revisions...");
  } finally {
    cleanup();
  }
});

test("empty state renders when the entry has no revisions", () => {
  const { container, cleanup } = mount(<EntryRevisionDrawer {...baseProps} />);
  try {
    expect(container.textContent).toContain("No revisions yet.");
  } finally {
    cleanup();
  }
});

test("error state surfaces the client message without unmounting", () => {
  const { container, cleanup } = mount(
    <EntryRevisionDrawer {...baseProps} error="entry_revision_not_found" />
  );
  try {
    expect(container.textContent).toContain("entry_revision_not_found");
  } finally {
    cleanup();
  }
});

test("list state renders version, timestamp, redacted author and a field preview", () => {
  const { container, cleanup } = mount(
    <EntryRevisionDrawer {...baseProps} revisions={[revision()]} />
  );
  try {
    const text = container.textContent ?? "";
    expect(text).toContain("Version 2");
    expect(text).toContain("Maria Nowak");
    // The author's email is never rendered raw.
    expect(text).not.toContain("maria@example.com");

    // Preview toggle shows the field summary (not the raw document).
    React.act(() => {
      Array.from(container.querySelectorAll("button"))
        .find((button) => button.textContent === "Preview")
        ?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });
    expect(container.textContent).toContain("summary: Intro text");
    expect(container.textContent).toContain("Hide preview");
  } finally {
    cleanup();
  }
});

test("a title-only revision falls back to the describeEntryRevision summary", () => {
  const { container, cleanup } = mount(
    <EntryRevisionDrawer
      {...baseProps}
      revisions={[revision({ data: { title: "Draft title only" } })]}
    />
  );
  try {
    React.act(() => {
      Array.from(container.querySelectorAll("button"))
        .find((button) => button.textContent === "Preview")
        ?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });
    // `title` is excluded from the field list, so with nothing else the preview
    // falls back to the revision description instead of an empty list.
    expect(container.textContent).toContain("Draft title only");
  } finally {
    cleanup();
  }
});

test("restore is confirm-gated and calls onRestore with the revision id", () => {
  const onRestore = vi.fn();
  const { container, cleanup } = mount(
    <EntryRevisionDrawer {...baseProps} revisions={[revision()]} onRestore={onRestore} />
  );
  try {
    React.act(() => {
      Array.from(container.querySelectorAll("button"))
        .find((button) => button.textContent === "Restore")
        ?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });
    const dialog = container.querySelector('[role="dialog"]');
    expect(dialog?.textContent).toContain("Restore revision?");
    expect(dialog?.textContent).toContain("Current unsaved changes may be overwritten.");
    // Nothing is restored before the confirm click.
    expect(onRestore).not.toHaveBeenCalled();

    React.act(() => {
      Array.from(container.querySelectorAll("button"))
        .find((button) => button.textContent === "Restore" && button.closest('[role="dialog"]'))
        ?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });
    expect(onRestore).toHaveBeenCalledWith("rev-2");
  } finally {
    cleanup();
  }
});

test("a restoring revision shows Restoring... and disables its button", () => {
  const { container, cleanup } = mount(
    <EntryRevisionDrawer {...baseProps} revisions={[revision()]} restoringId="rev-2" />
  );
  try {
    expect(container.textContent).toContain("Restoring...");
    const restoreButton = Array.from(container.querySelectorAll("button")).find(
      (button) => button.textContent === "Restoring..."
    );
    expect(restoreButton).not.toBeNull();
    expect((restoreButton as HTMLButtonElement | null)?.disabled).toBe(true);
  } finally {
    cleanup();
  }
});
