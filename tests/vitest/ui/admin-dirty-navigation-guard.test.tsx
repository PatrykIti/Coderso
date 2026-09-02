// @vitest-environment happy-dom

import React from "react";
import { createRoot } from "react-dom/client";
import { afterEach, describe, expect, it, vi } from "vitest";

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const guardState = vi.hoisted(() => ({
  router: null as null | {
    path: string;
    navigate: ReturnType<typeof vi.fn>;
    registerBlocker: ReturnType<typeof vi.fn>;
  },
}));

vi.mock("@/ui/contexts/AdminBasePathContext", () => ({
  useAdminBasePath: () => "/admin",
}));

vi.mock("@/ui/contexts/AdminRouterContext", () => ({
  useOptionalAdminRouter: () => guardState.router,
}));

vi.mock("@/ui/shared/ConfirmActionDialog", () => ({
  ConfirmActionDialog: ({
    open,
    title,
    description,
    confirmLabel,
    cancelLabel,
    onConfirm,
    onOpenChange,
  }: {
    open: boolean;
    title: string;
    description: string;
    confirmLabel: string;
    cancelLabel: string;
    onConfirm: () => void;
    onOpenChange: (open: boolean) => void;
  }) =>
    open ? (
      <div data-testid="guard-dialog">
        <span>{title}</span>
        <span>{description}</span>
        <button type="button" onClick={onConfirm}>
          {confirmLabel}
        </button>
        <button type="button" onClick={() => onOpenChange(false)}>
          {cancelLabel}
        </button>
      </div>
    ) : null,
}));

import {
  normalizeAdminHrefForComparison,
  useAdminDirtyNavigationGuard,
} from "../../../core/admin/ui/shared/AdminDirtyNavigationGuard";

function Harness(props: { blocked: boolean; onConfirmDiscard?: () => void }) {
  const { dialog } = useAdminDirtyNavigationGuard({
    blocked: props.blocked,
    title: "Leave with unsaved changes?",
    description: "Your edits will be lost.",
    confirmLabel: "Discard changes",
    onConfirmDiscard: props.onConfirmDiscard,
  });
  return (
    <div>
      {dialog}
      <button type="button" onClick={() => undefined}>
        noop
      </button>
    </div>
  );
}

const mount = (node: React.ReactNode) => {
  const container = document.createElement("div");
  document.body.appendChild(container);
  const root = createRoot(container);
  React.act(() => {
    root.render(node);
  });
  return {
    container,
    unmount: () =>
      React.act(() => {
        root.unmount();
      }),
  };
};

afterEach(() => {
  guardState.router = null;
  document.body.innerHTML = "";
  vi.restoreAllMocks();
});

describe("normalizeAdminHrefForComparison", () => {
  it.each([
    ["/admin/posts/", "/admin/posts"],
    ["/admin/posts?x=1", "/admin/posts"],
    ["/admin/posts#anchor", "/admin/posts"],
    ["/", "/"],
  ])("normalizes %j to %j", (href, expected) => {
    expect(normalizeAdminHrefForComparison(href)).toBe(expected);
  });
});

describe("useAdminDirtyNavigationGuard", () => {
  const makeRouter = (path: string) => ({
    path,
    navigate: vi.fn(),
    registerBlocker: vi.fn(() => () => undefined),
  });

  it("allows navigation when not blocked", () => {
    const router = makeRouter("/admin/posts");
    guardState.router = router;
    let requestNavigation!: (href: string) => boolean;
    router.registerBlocker.mockImplementation((...args: unknown[]) => {
      requestNavigation = args[0] as (href: string) => boolean;
      return () => undefined;
    });

    const view = mount(<Harness blocked={false} />);
    let allowed!: boolean;
    React.act(() => {
      allowed = requestNavigation("/admin/media");
    });
    expect(allowed).toBe(true);
    expect(view.container.querySelector("[data-testid='guard-dialog']")).toBeNull();
    view.unmount();
  });

  it("allows same-path navigation even while blocked", () => {
    const router = makeRouter("/admin/posts");
    guardState.router = router;
    let requestNavigation!: (href: string) => boolean;
    router.registerBlocker.mockImplementation((...args: unknown[]) => {
      requestNavigation = args[0] as (href: string) => boolean;
      return () => undefined;
    });

    const view = mount(<Harness blocked />);
    let samePath!: boolean;
    React.act(() => {
      samePath = requestNavigation("/posts/");
    });
    expect(samePath).toBe(true);
    let otherPath!: boolean;
    React.act(() => {
      otherPath = requestNavigation("/media");
    });
    expect(otherPath).toBe(false);
    view.unmount();
  });

  it("blocks navigation, shows the confirm dialog, and navigates after discard", () => {
    const router = makeRouter("/admin/posts");
    guardState.router = router;
    let requestNavigation!: (href: string) => boolean;
    router.registerBlocker.mockImplementation((...args: unknown[]) => {
      requestNavigation = args[0] as (href: string) => boolean;
      return () => undefined;
    });
    const onConfirmDiscard = vi.fn();

    const view = mount(<Harness blocked onConfirmDiscard={onConfirmDiscard} />);
    React.act(() => {
      requestNavigation("/admin/media");
    });
    expect(router.navigate).not.toHaveBeenCalled();

    const dialog = view.container.querySelector("[data-testid='guard-dialog']")!;
    expect(dialog.textContent).toContain("Leave with unsaved changes?");
    expect(dialog.textContent).toContain("Your edits will be lost.");

    React.act(() => {
      (
        Array.from(dialog.querySelectorAll("button")).find(
          (candidate) => candidate.textContent === "Discard changes"
        ) as HTMLButtonElement
      ).click();
    });

    expect(onConfirmDiscard).toHaveBeenCalledTimes(1);
    expect(router.navigate).toHaveBeenCalledWith("/admin/media", { skipBlockers: true });
    expect(view.container.querySelector("[data-testid='guard-dialog']")).toBeNull();
    view.unmount();
  });

  it("cancelling the dialog clears the pending navigation without navigating", () => {
    const router = makeRouter("/admin/posts");
    guardState.router = router;
    let requestNavigation!: (href: string) => boolean;
    router.registerBlocker.mockImplementation((...args: unknown[]) => {
      requestNavigation = args[0] as (href: string) => boolean;
      return () => undefined;
    });

    const view = mount(<Harness blocked />);
    React.act(() => {
      requestNavigation("/admin/media");
    });

    React.act(() => {
      (
        Array.from(
          view.container.querySelector("[data-testid='guard-dialog']")!.querySelectorAll("button")
        ).find((candidate) => candidate.textContent === "Cancel") as HTMLButtonElement
      ).click();
    });

    expect(view.container.querySelector("[data-testid='guard-dialog']")).toBeNull();
    expect(router.navigate).not.toHaveBeenCalled();
    view.unmount();
  });

  it("removes the beforeunload listener on unmount and never attaches one when unblocked", () => {
    const router = makeRouter("/admin/posts");
    guardState.router = router;

    const addSpy = vi.spyOn(window, "addEventListener");
    const removeSpy = vi.spyOn(window, "removeEventListener");
    const beforeunloadCount = () =>
      addSpy.mock.calls.filter(([type]) => type === "beforeunload").length;

    const view = mount(<Harness blocked />);
    expect(router.registerBlocker).toHaveBeenCalled();
    expect(addSpy).toHaveBeenCalledWith("beforeunload", expect.any(Function));
    expect(beforeunloadCount()).toBe(1);

    // unmounting the blocked harness runs the effect cleanup, removing the listener
    view.unmount();
    expect(removeSpy).toHaveBeenCalledWith("beforeunload", expect.any(Function));

    // an unblocked harness never attaches beforeunload: the listener count stays at 1
    const second = makeRouter("/admin/posts");
    guardState.router = second;
    const cleanView = mount(<Harness blocked={false} />);
    expect(beforeunloadCount()).toBe(1);
    cleanView.unmount();
    expect(removeSpy.mock.calls.filter(([type]) => type === "beforeunload").length).toBe(1);
  });
});
