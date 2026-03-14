// @vitest-environment happy-dom

import React from "react";
import { createRoot } from "react-dom/client";
import { afterEach, expect, test, vi } from "vitest";

const sheetState = vi.hoisted(() => ({
  onOpenChangeCalls: [] as boolean[],
  reset() {
    this.onOpenChangeCalls = [];
  },
}));

vi.mock("@/components/ui/sheet", () => ({
  Sheet: ({
    children,
    open,
    onOpenChange,
  }: {
    children: React.ReactNode;
    open?: boolean;
    onOpenChange?: (open: boolean) => void;
  }) => (
    <div data-sheet-open={String(Boolean(open))}>
      <button
        type="button"
        onClick={() => {
          sheetState.onOpenChangeCalls.push(false);
          onOpenChange?.(false);
        }}
      >
        close-sheet
      </button>
      {children}
    </div>
  ),
  SheetContent: ({
    children,
    side,
    className,
  }: {
    children: React.ReactNode;
    side: string;
    className?: string;
  }) => (
    <div data-sheet-side={side} className={className}>
      {children}
    </div>
  ),
  SheetDescription: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  SheetTitle: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

vi.mock("@/ui/layouts/AdminShell", () => ({
  AdminShell: ({
    children,
    breadcrumbs,
    activeHref,
    contentClassName,
  }: {
    children: React.ReactNode;
    breadcrumbs?: React.ReactNode;
    activeHref: string;
    contentClassName?: string;
  }) => (
    <div data-admin-shell-active-href={activeHref} data-admin-shell-class={contentClassName}>
      {breadcrumbs ? <div data-admin-shell-breadcrumbs="true">{breadcrumbs}</div> : null}
      {children}
    </div>
  ),
}));

import { AdminBasePathProvider } from "../../../core/admin/ui/contexts/AdminBasePathContext";
import { AdminRouterProvider } from "../../../core/admin/ui/contexts/AdminRouterContext";
import { PostEditorLayout } from "../../../core/admin/ui/posts/editor/layout/PostEditorLayout";

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const mount = (node: React.ReactNode) => {
  const container = document.createElement("div");
  document.body.appendChild(container);
  const root = createRoot(container);

  React.act(() => {
    root.render(
      <AdminRouterProvider initialPath="/admin/coderso/posts/post-1">
        <AdminBasePathProvider value="/admin">
          {node}
        </AdminBasePathProvider>
      </AdminRouterProvider>
    );
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

afterEach(() => {
  vi.restoreAllMocks();
  sheetState.reset();
  document.body.innerHTML = "";
});

test("PostEditorLayout resolves auto viewport from matchMedia and wires mobile close handlers", () => {
  const listeners: Array<() => void> = [];
  const mediaQuery = {
    matches: false,
    addEventListener: vi.fn((_event: string, listener: () => void) => {
      listeners.push(listener);
    }),
    removeEventListener: vi.fn((_event: string, listener: () => void) => {
      const index = listeners.indexOf(listener);
      if (index >= 0) listeners.splice(index, 1);
    }),
  };

  vi.stubGlobal("matchMedia", vi.fn(() => mediaQuery));

  const onSecondarySidebarOpenChange = vi.fn();
  const onDetailsSidebarOpenChange = vi.fn();
  const view = mount(
    <PostEditorLayout
      activeHref="/admin/coderso/posts"
      content={<div>Canvas</div>}
      secondarySidebar={<div>Secondary panel</div>}
      secondarySidebarOpen
      detailsSidebar={<div>Details panel</div>}
      detailsSidebarOpen
      viewportMode="auto"
    />
  );

  try {
    expect(view.container.textContent).toContain("Secondary panel");
    expect(view.container.textContent).toContain("Details panel");
    expect(mediaQuery.addEventListener).toHaveBeenCalledWith("change", expect.any(Function));
    expect(view.container.querySelectorAll("[data-sheet-side='left']")).toHaveLength(1);
    expect(view.container.querySelectorAll("[data-sheet-side='right']")).toHaveLength(1);
  } finally {
    view.cleanup();
  }

  expect(mediaQuery.removeEventListener).toHaveBeenCalledWith("change", expect.any(Function));
  expect(listeners).toHaveLength(0);

  const callbackView = mount(
    <PostEditorLayout
      activeHref="/admin/coderso/posts"
      content={<div>Canvas</div>}
      secondarySidebar={<div>Secondary panel</div>}
      secondarySidebarOpen
      onSecondarySidebarOpenChange={onSecondarySidebarOpenChange}
      detailsSidebar={<div>Details panel</div>}
      detailsSidebarOpen
      onDetailsSidebarOpenChange={onDetailsSidebarOpenChange}
      viewportMode="mobile"
    />
  );

  try {
    const buttons = Array.from(callbackView.container.querySelectorAll("button")).filter((button) =>
      button.textContent?.includes("close-sheet")
    );
    React.act(() => {
      buttons[0]?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
      buttons[1]?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });

    expect(onSecondarySidebarOpenChange).toHaveBeenCalledWith(false);
    expect(onDetailsSidebarOpenChange).toHaveBeenCalledWith(false);
    expect(sheetState.onOpenChangeCalls).toEqual([false, false]);
  } finally {
    callbackView.cleanup();
  }
});

test("PostEditorLayout renders compact desktop sidebars and keeps content region without optional chrome", () => {
  const view = mount(
    <PostEditorLayout
      activeHref="/admin/coderso/posts"
      content={<div>Canvas</div>}
      secondarySidebar={<div>Secondary panel</div>}
      secondarySidebarOpen
      detailsSidebar={<div>Details panel</div>}
      detailsSidebarOpen
      compactSidePanels
      viewportMode="desktop"
    />
  );

  try {
    const secondaryRegion = view.container.querySelector("[data-post-editor-region='secondary-sidebar']");
    const detailsRegion = view.container.querySelector("[data-post-editor-region='sidebar']");
    expect(secondaryRegion?.className).toContain("w-56");
    expect(detailsRegion?.className).toContain("w-72");
    expect(view.container.textContent).toContain("Canvas");
    expect(view.container.querySelectorAll("[data-sheet-side]")).toHaveLength(0);
  } finally {
    view.cleanup();
  }
});
