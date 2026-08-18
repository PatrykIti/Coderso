// TASK-487-02-L02: the revision drawer is a prop-driven surface (list state,
// preview toggle, restore confirm). This suite pins its four states plus the
// confirm-gated restore path without needing the full editor. Editor-level
// wiring (History click -> listEntryRevisionsCached, restore -> re-hydrate)
// lives in entry-editor-visibility-groups.test.tsx.
//
// TASK-570 (M-487-02): the list is metadata-only, so the drawer renders the
// snapshot body from `revisionPreview` (on-demand detail fetch through
// `getEntryRevisionData`) instead of a `data` field on each list item.

// @vitest-environment happy-dom

import React, { useState } from "react";
import { createRoot } from "react-dom/client";
import { afterEach, expect, test, vi } from "vitest";

import { EntryRevisionDrawer } from "../../../core/admin/ui/entries/EntryRevisionDrawer";
import type {
  EntryRevision,
  EntryRevisionDetail,
} from "../../../core/admin/services/entriesClient";
import type { EntryRevisionPreviewState } from "../../../core/admin/ui/entries/useEntryRevisions";

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
  revisionPreview: {
    revisionId: null,
    data: null,
    loading: false,
    error: null,
  } as EntryRevisionPreviewState,
  onPreviewRevision: vi.fn(),
  onRestore: vi.fn(),
};

const revision = (overrides: Partial<EntryRevision> = {}): EntryRevision => ({
  id: "rev-2",
  entryId: "entry-42",
  version: 2,
  createdAt: "2026-06-20T09:30:00Z",
  createdBy: { id: "user-1", name: "Maria Nowak", email: "maria@example.com" },
  ...overrides,
});

const detail = (base: EntryRevision, data: Record<string, unknown>): EntryRevisionDetail => ({
  ...base,
  data,
});

const idlePreview: EntryRevisionPreviewState = {
  revisionId: null,
  data: null,
  loading: false,
  error: null,
};

/**
 * Resolves a preview on demand like the editor wiring: clicking Preview calls
 * `onPreviewRevision`, and the resolved snapshot detail lands back in
 * `revisionPreview` so the drawer can render it.
 */
const PreviewHarness = ({
  revisions,
  details,
  onRestore,
}: {
  revisions: EntryRevision[];
  details: Record<string, EntryRevisionDetail>;
  onRestore?: (revisionId: string) => void;
}) => {
  const [preview, setPreview] = useState<EntryRevisionPreviewState>(idlePreview);
  return (
    <EntryRevisionDrawer
      {...baseProps}
      revisions={revisions}
      revisionPreview={preview}
      onPreviewRevision={(revisionId) =>
        setPreview({
          revisionId,
          data: details[revisionId] ?? null,
          loading: false,
          error: details[revisionId] ? null : "Revision not found.",
        })
      }
      onRestore={onRestore ?? baseProps.onRestore}
    />
  );
};

const clickButton = (container: HTMLElement, label: string, scope?: HTMLElement) => {
  React.act(() => {
    const root = scope ?? container;
    const button = Array.from(root.querySelectorAll("button")).find(
      (candidate) => candidate.textContent === label
    );
    if (button) button.dispatchEvent(new MouseEvent("click", { bubbles: true }));
  });
};

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

test("list state renders version, timestamp and redacted author without a payload", () => {
  const { container, cleanup } = mount(
    <EntryRevisionDrawer {...baseProps} revisions={[revision()]} />
  );
  try {
    const text = container.textContent ?? "";
    expect(text).toContain("Version 2");
    expect(text).toContain("Maria Nowak");
    // The author's email is never rendered raw, and the metadata-only list
    // carries no snapshot body to leak.
    expect(text).not.toContain("maria@example.com");
    expect(JSON.stringify(revision())).not.toContain('"data"');
  } finally {
    cleanup();
  }
});

test("preview resolves the snapshot detail on demand and renders the field summary", () => {
  const snapshot = revision();
  const { container, cleanup } = mount(
    <PreviewHarness
      revisions={[snapshot]}
      details={{ [snapshot.id]: detail(snapshot, { title: "Draft two", summary: "Intro text" }) }}
    />
  );
  try {
    // Nothing is fetched before the preview toggle.
    expect(container.textContent).not.toContain("summary: Intro text");

    clickButton(container, "Preview");
    expect(container.textContent).toContain("summary: Intro text");
    expect(container.textContent).toContain("Hide preview");

    // Toggling off clears the pane (a second click hides the preview).
    clickButton(container, "Hide preview");
    expect(container.textContent).not.toContain("summary: Intro text");
  } finally {
    cleanup();
  }
});

test("a title-only revision falls back to the describeEntryRevision summary", () => {
  const snapshot = revision();
  const { container, cleanup } = mount(
    <PreviewHarness
      revisions={[snapshot]}
      details={{ [snapshot.id]: detail(snapshot, { title: "Draft title only" }) }}
    />
  );
  try {
    clickButton(container, "Preview");
    // `title` is excluded from the field list, so with nothing else the preview
    // falls back to the revision description instead of an empty list.
    expect(container.textContent).toContain("Draft title only");
  } finally {
    cleanup();
  }
});

test("a failed preview fetch surfaces the error inside the drawer", () => {
  const snapshot = revision();
  const { container, cleanup } = mount(<PreviewHarness revisions={[snapshot]} details={{}} />);
  try {
    clickButton(container, "Preview");
    expect(container.textContent).toContain("Revision not found.");
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
    clickButton(container, "Restore");
    const dialog = container.querySelector('[role="dialog"]');
    expect(dialog?.textContent).toContain("Restore revision?");
    expect(dialog?.textContent).toContain("Current unsaved changes may be overwritten.");
    // Nothing is restored before the confirm click.
    expect(onRestore).not.toHaveBeenCalled();

    clickButton(container, "Restore", dialog as HTMLElement);
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
