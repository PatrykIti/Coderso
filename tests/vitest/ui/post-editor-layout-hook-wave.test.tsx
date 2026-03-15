// @vitest-environment happy-dom

import React, { act } from "react";
import { createRoot } from "react-dom/client";
import { afterEach, expect, test } from "vitest";

import {
  createPostEditorLayoutState,
  postEditorLayoutReducer,
  usePostEditorLayout,
  type PostEditorLayoutState,
} from "../../../core/admin/ui/posts/editor/hooks/usePostEditorLayout";

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const mountHook = (
  options?: Parameters<typeof usePostEditorLayout>[0]
) => {
  let latest: ReturnType<typeof usePostEditorLayout> | undefined;

  const Harness = () => {
    latest = usePostEditorLayout(options);
    return <div>layout-hook</div>;
  };

  const container = document.createElement("div");
  document.body.appendChild(container);
  const root = createRoot(container);

  act(() => {
    root.render(<Harness />);
  });

  return {
    get value() {
      if (!latest) {
        throw new Error("Missing hook state");
      }
      return latest;
    },
    cleanup() {
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

test("usePostEditorLayout normalizes invalid initial options and reducer handles fallback branches", () => {
  expect(
    createPostEditorLayoutState({
      initialSecondarySidebar: "invalid" as never,
      initialDetailsOpen: false,
      initialDetailsTab: "unknown" as never,
      initialFocusMode: false,
      initialLeftRailMode: "unknown" as never,
    })
  ).toEqual({
    secondarySidebar: null,
    detailsOpen: false,
    detailsTab: "document",
    focusMode: false,
    leftRailMode: "outline",
    focusRestore: null,
  });

  const focusState: PostEditorLayoutState = {
    secondarySidebar: "list-view",
    detailsOpen: true,
    detailsTab: "block",
    focusMode: true,
    leftRailMode: "outline",
    focusRestore: {
      secondarySidebar: "inserter",
      detailsOpen: false,
    },
  };

  expect(
    postEditorLayoutReducer(focusState, {
      type: "toggle_secondary",
      sidebar: "list-view",
    })
  ).toEqual({
    ...focusState,
    secondarySidebar: null,
    focusRestore: null,
  });

  expect(
    postEditorLayoutReducer(
      {
        ...focusState,
        focusMode: false,
        detailsOpen: true,
        detailsTab: "document",
      },
      { type: "toggle_details", tab: "document" }
    )
  ).toEqual({
    ...focusState,
    focusMode: false,
    detailsOpen: false,
    detailsTab: "document",
    focusRestore: null,
  });

  expect(
    postEditorLayoutReducer(focusState, { type: "set_focus_mode", value: true })
  ).toBe(focusState);

  expect(
    postEditorLayoutReducer(
      {
        ...focusState,
        focusMode: false,
      },
      { type: "set_focus_mode", value: false }
    )
  ).toEqual({
    ...focusState,
    focusMode: false,
    focusRestore: null,
  });

  expect(
    postEditorLayoutReducer(
      {
        ...focusState,
        focusRestore: null,
      },
      { type: "set_focus_mode", value: false }
    )
  ).toEqual({
    ...focusState,
    focusMode: false,
    secondarySidebar: "list-view",
    detailsOpen: true,
    focusRestore: null,
  });

  expect(
    postEditorLayoutReducer(
      {
        ...focusState,
        focusRestore: null,
      },
      { type: "toggle_focus_mode" }
    )
  ).toEqual({
    ...focusState,
    focusMode: false,
    secondarySidebar: "list-view",
    detailsOpen: true,
    focusRestore: null,
  });

  expect(
    postEditorLayoutReducer(focusState, { type: "unknown" } as never)
  ).toBe(focusState);
});

test("usePostEditorLayout exposes derived flags and routes secondary, details, and focus actions", () => {
  const hook = mountHook({
    initialSecondarySidebar: "inserter",
    initialDetailsOpen: false,
    initialDetailsTab: "document",
    initialLeftRailMode: "list-view",
  });

  try {
    expect(hook.value.showInserter).toBe(true);
    expect(hook.value.showListView).toBe(false);
    expect(hook.value.secondarySidebarOpen).toBe(true);
    expect(hook.value.detailsSidebarOpen).toBe(false);
    expect(hook.value.leftRailMode).toBe("list-view");

    act(() => {
      hook.value.openListView();
    });
    expect(hook.value.showListView).toBe(true);
    expect(hook.value.showInserter).toBe(false);

    act(() => {
      hook.value.toggleListView();
    });
    expect(hook.value.secondarySidebarOpen).toBe(false);

    act(() => {
      hook.value.toggleInserter();
    });
    expect(hook.value.showInserter).toBe(true);

    act(() => {
      hook.value.closeSecondarySidebar();
      hook.value.openDetailsForSelection(false);
    });
    expect(hook.value.detailsSidebarOpen).toBe(true);
    expect(hook.value.state.detailsTab).toBe("document");

    act(() => {
      hook.value.toggleDetails("block");
    });
    expect(hook.value.detailsSidebarOpen).toBe(true);
    expect(hook.value.state.detailsTab).toBe("block");

    act(() => {
      hook.value.setDetailsTab("block");
      hook.value.toggleDetails("block");
    });
    expect(hook.value.detailsSidebarOpen).toBe(false);

    act(() => {
      hook.value.openDetails();
      hook.value.setLeftRailMode("outline");
    });
    expect(hook.value.detailsSidebarOpen).toBe(true);
    expect(hook.value.leftRailMode).toBe("outline");

    act(() => {
      hook.value.setFocusMode(true);
    });
    expect(hook.value.focusMode).toBe(true);
    expect(hook.value.secondarySidebarOpen).toBe(false);
    expect(hook.value.detailsSidebarOpen).toBe(false);

    act(() => {
      hook.value.setFocusMode(false);
    });
    expect(hook.value.focusMode).toBe(false);
    expect(hook.value.detailsSidebarOpen).toBe(true);

    act(() => {
      hook.value.toggleFocusMode();
    });
    expect(hook.value.focusMode).toBe(true);

    act(() => {
      hook.value.toggleFocusMode();
      hook.value.closeDetails();
    });
    expect(hook.value.focusMode).toBe(false);
    expect(hook.value.detailsSidebarOpen).toBe(false);
  } finally {
    hook.cleanup();
  }
});
