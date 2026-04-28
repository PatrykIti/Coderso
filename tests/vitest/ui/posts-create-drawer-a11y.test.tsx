// @vitest-environment happy-dom

import React from "react";
import { createRoot } from "react-dom/client";
import { afterEach, expect, test, vi } from "vitest";

import { PostsCreateDrawer } from "../../../core/admin/ui/posts/PostsCreateDrawer";
import { PostRevisionDrawer } from "../../../core/admin/ui/posts/editor/PostRevisionDrawer";

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const mount = (node: React.ReactNode) => {
  const container = document.createElement("div");
  document.body.appendChild(container);
  const root = createRoot(container);

  React.act(() => {
    root.render(node);
  });

  return {
    cleanup: () => {
      React.act(() => {
        root.unmount();
      });
      container.remove();
    },
  };
};

const getDialogDescription = (dialog: Element) => {
  const describedBy = dialog.getAttribute("aria-describedby");
  expect(describedBy).toBeTruthy();
  const ids = describedBy?.split(/\s+/).filter(Boolean) ?? [];
  const descriptions = ids.map((id) => document.getElementById(id)).filter(Boolean);
  expect(descriptions).toHaveLength(ids.length);
  return descriptions.map((element) => element?.textContent ?? "").join(" ");
};

afterEach(() => {
  vi.restoreAllMocks();
});

test("PostsCreateDrawer binds the visible description to the dialog", () => {
  const consoleWarn = vi.spyOn(console, "warn").mockImplementation(() => undefined);
  const view = mount(
    <PostsCreateDrawer
      open
      onOpenChange={() => undefined}
      onCreate={() => undefined}
      openAfterCreate={false}
      onOpenAfterCreateChange={() => undefined}
    />
  );

  try {
    const dialog = document.body.querySelector('[role="dialog"]');
    expect(dialog).not.toBeNull();
    expect(getDialogDescription(dialog!)).toContain(
      "Start a new article and publish when ready."
    );
    expect(
      consoleWarn.mock.calls.some((args) =>
        args.some((arg) => String(arg).includes("Missing Description"))
      )
    ).toBe(false);
  } finally {
    view.cleanup();
  }
});

test("PostRevisionDrawer keeps its dialog description wired", () => {
  const view = mount(
    <PostRevisionDrawer
      open
      onOpenChange={() => undefined}
      revisions={[]}
      isLoading={false}
      error={null}
      restoringId={null}
      onRestore={() => undefined}
    />
  );

  try {
    const dialog = document.body.querySelector('[role="dialog"]');
    expect(dialog).not.toBeNull();
    expect(getDialogDescription(dialog!)).toContain(
      "Restore an earlier snapshot of this post."
    );
  } finally {
    view.cleanup();
  }
});
