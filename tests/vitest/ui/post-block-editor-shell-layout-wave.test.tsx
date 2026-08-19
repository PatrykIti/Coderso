// @vitest-environment happy-dom

import React from "react";
import { test, expect, vi } from "vitest";
import { postShellState, mount } from "./postBlockEditorShellFixtures";

test("PostBlockEditorShell keeps Close enabled and every editor mutation disabled while loading", async () => {
  const { PostBlockEditorShell } =
    await import("../../../core/admin/ui/posts/editor/PostBlockEditorShell");

  postShellState.layout.secondarySidebarOpen = false;
  postShellState.layout.detailsSidebarOpen = false;
  postShellState.layout.showInserter = false;
  postShellState.layout.showListView = false;
  postShellState.editor.loading = true;
  postShellState.editor.canMutatePost = false;
  postShellState.editor.error = null;
  postShellState.editor.autosaveError = null;
  postShellState.editor.selectedBlock = null;
  postShellState.editor.deletingPost = false;

  Object.defineProperty(window, "confirm", {
    configurable: true,
    writable: true,
    value: vi.fn(() => false),
  });

  const view = mount(<PostBlockEditorShell />);

  try {
    expect(view.container.textContent).toContain("Loading post editor...");

    const buttons = Array.from(view.container.querySelectorAll("button"));

    const close = buttons.find((button) => button.textContent === "close-editor");
    const revisions = buttons.find((button) => button.textContent === "open-revisions");
    const details = buttons.find((button) => button.textContent === "toggle-details");
    expect(close?.disabled).toBe(false);
    expect(revisions?.disabled).toBe(true);
    expect(details?.disabled).toBe(true);
    expect(
      buttons.find((button) => button.getAttribute("aria-label") === "Open runtime preview")
        ?.disabled
    ).toBe(true);
    expect(buttons.find((button) => button.textContent === "move-to-trash")).toBeUndefined();

    React.act(() => {
      buttons.find((button) => button.textContent === "toggle-details")?.click();
      buttons.find((button) => button.textContent === "open-secondary-shell")?.click();
      buttons.find((button) => button.textContent === "move-to-trash")?.click();
    });

    expect(postShellState.layout.openDetailsForSelection).not.toHaveBeenCalled();
    expect(postShellState.layout.setLeftRailMode).not.toHaveBeenCalled();
    expect(postShellState.layout.openListView).not.toHaveBeenCalled();
    expect(postShellState.editor.moveToTrash).not.toHaveBeenCalled();
  } finally {
    view.cleanup();
    Reflect.deleteProperty(window, "confirm");
  }
});

test("PostBlockEditorShell persists focus mode, clears stored layout when restore is disabled, and only navigates on successful trash", async () => {
  const { PostBlockEditorShell } =
    await import("../../../core/admin/ui/posts/editor/PostBlockEditorShell");

  postShellState.layout.focusMode = true;
  postShellState.layout.state.focusMode = true;
  postShellState.layout.state.focusRestore = {
    secondarySidebar: "list-view",
    detailsOpen: false,
  } as never;
  postShellState.layout.state.secondarySidebar = "inserter";
  postShellState.layout.state.detailsOpen = true;
  postShellState.preferences.preferences.restoreLastSidebarsState = false;
  postShellState.preferences.initialPreferences.restoreLastSidebarsState = false;
  postShellState.editor.loading = false;
  postShellState.editor.error = null;
  postShellState.editor.autosaveError = null;

  window.localStorage.setItem("coderso.posts.editor.layout.v1", "{invalid");

  Object.defineProperty(window, "confirm", {
    configurable: true,
    writable: true,
    value: vi.fn(() => true),
  });

  postShellState.editor.moveToTrash.mockResolvedValueOnce(false).mockResolvedValueOnce(true);

  const view = mount(<PostBlockEditorShell />);

  try {
    await React.act(async () => {
      await Promise.resolve();
      await Promise.resolve();
    });

    const buttons = Array.from(view.container.querySelectorAll("button"));
    expect(window.localStorage.getItem("coderso.posts.editor.focusMode")).toBe("1");
    expect(window.localStorage.getItem("coderso.posts.editor.layout.v1")).toBeNull();

    React.act(() => {
      buttons.find((button) => button.textContent === "move-to-trash")?.click();
      buttons.find((button) => button.textContent === "move-to-trash")?.click();
    });

    await React.act(async () => {
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(postShellState.editor.moveToTrash).toHaveBeenCalledTimes(2);
    expect(postShellState.navigate).toHaveBeenCalledWith("/admin/posts", {
      replace: true,
    });
  } finally {
    view.cleanup();
    Reflect.deleteProperty(window, "confirm");
    window.localStorage.clear();
    postShellState.layout.focusMode = false;
    postShellState.layout.state.focusMode = false;
    postShellState.layout.state.focusRestore = null;
    postShellState.preferences.preferences.restoreLastSidebarsState = true;
    postShellState.preferences.initialPreferences.restoreLastSidebarsState = true;
  }
});

test("PostBlockEditorShell persists focus-restore layout values while focus mode is enabled", async () => {
  const { PostBlockEditorShell } =
    await import("../../../core/admin/ui/posts/editor/PostBlockEditorShell");

  postShellState.layout.focusMode = true;
  postShellState.layout.state.focusMode = true;
  postShellState.layout.state.focusRestore = {
    secondarySidebar: "list-view",
    detailsOpen: false,
  } as never;
  postShellState.layout.state.secondarySidebar = "inserter";
  postShellState.layout.state.detailsOpen = true;
  postShellState.layout.state.detailsTab = "block";
  postShellState.layout.state.leftRailMode = "list-view";

  const view = mount(<PostBlockEditorShell />);

  try {
    await React.act(async () => {
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(
      JSON.parse(window.localStorage.getItem("coderso.posts.editor.layout.v1") ?? "{}")
    ).toMatchObject({
      secondarySidebar: "list-view",
      detailsOpen: false,
      detailsTab: "block",
      leftRailMode: "list-view",
    });
    expect(window.localStorage.getItem("coderso.posts.editor.focusMode")).toBe("1");
  } finally {
    view.cleanup();
    window.localStorage.clear();
    postShellState.layout.focusMode = false;
    postShellState.layout.state.focusMode = false;
    postShellState.layout.state.focusRestore = null;
    postShellState.layout.state.secondarySidebar = "inserter";
    postShellState.layout.state.detailsOpen = true;
    postShellState.layout.state.detailsTab = "document";
    postShellState.layout.state.leftRailMode = "outline";
  }
});

test("PostBlockEditorShell seeds layout hook options from stored layout and focus-mode preferences", async () => {
  const { PostBlockEditorShell } =
    await import("../../../core/admin/ui/posts/editor/PostBlockEditorShell");

  postShellState.preferences.initialPreferences.focusModeOnOpen = true;
  postShellState.preferences.initialPreferences.defaultInspectorTab = "block" as never;
  postShellState.preferences.initialPreferences.restoreLastSidebarsState = true;
  window.localStorage.setItem(
    "nextless.posts.editor.layout.v1",
    JSON.stringify({
      secondarySidebar: null,
      detailsOpen: false,
      detailsTab: "block",
      leftRailMode: "list-view",
    })
  );

  const view = mount(<PostBlockEditorShell />);

  try {
    await React.act(async () => {
      await Promise.resolve();
    });

    expect(postShellState.layoutHookCalls.at(-1)).toMatchObject({
      initialSecondarySidebar: null,
      initialDetailsOpen: false,
      initialDetailsTab: "block",
      initialFocusMode: true,
      initialLeftRailMode: "list-view",
    });
  } finally {
    view.cleanup();
    window.localStorage.clear();
    postShellState.preferences.initialPreferences.focusModeOnOpen = false;
    postShellState.preferences.initialPreferences.defaultInspectorTab = "post" as never;
  }
});

test("PostBlockEditorShell escape shortcut closes inserter, outline, and details in priority order", async () => {
  const { PostBlockEditorShell } =
    await import("../../../core/admin/ui/posts/editor/PostBlockEditorShell");

  const view = mount(<PostBlockEditorShell />);

  try {
    const shortcuts = postShellState.shortcutCalls.at(-1) as { onEscape?: () => void } | undefined;
    if (!shortcuts?.onEscape) {
      throw new Error("Missing escape shortcut");
    }

    postShellState.layout.showInserter = true;
    postShellState.layout.secondarySidebarOpen = true;
    React.act(() => {
      shortcuts.onEscape?.();
    });
    expect(postShellState.layout.closeSecondarySidebar).toHaveBeenCalled();
    expect(postShellState.focusReturn).toHaveBeenCalledWith("inserter");

    postShellState.layout.closeSecondarySidebar.mockClear();
    postShellState.focusReturn.mockClear();
    postShellState.layout.showInserter = false;
    postShellState.layout.secondarySidebarOpen = true;
    React.act(() => {
      shortcuts.onEscape?.();
    });
    expect(postShellState.layout.closeSecondarySidebar).toHaveBeenCalled();
    expect(postShellState.focusReturn).toHaveBeenCalledWith("outline");

    postShellState.layout.closeSecondarySidebar.mockClear();
    postShellState.focusReturn.mockClear();
    postShellState.layout.secondarySidebarOpen = false;
    postShellState.layout.detailsSidebarOpen = true;
    React.act(() => {
      shortcuts.onEscape?.();
    });
    expect(postShellState.layout.closeDetails).toHaveBeenCalled();
    expect(postShellState.focusReturn).toHaveBeenCalledWith("details");
  } finally {
    view.cleanup();
  }
});

test("PostBlockEditorShell closes already-open outline or inserter toggles", async () => {
  const { PostBlockEditorShell } =
    await import("../../../core/admin/ui/posts/editor/PostBlockEditorShell");

  postShellState.layout.secondarySidebarOpen = true;
  postShellState.layout.showInserter = false;
  postShellState.layout.leftRailMode = "outline";
  postShellState.layout.state.leftRailMode = "outline";
  postShellState.layout.state.secondarySidebar = "list-view";

  const view = mount(<PostBlockEditorShell />);

  try {
    await React.act(async () => {
      await Promise.resolve();
    });

    const buttons = Array.from(view.container.querySelectorAll("button"));
    React.act(() => {
      buttons.find((button) => button.textContent === "toggle-outline")?.click();
    });

    expect(postShellState.layout.closeSecondarySidebar).toHaveBeenCalled();
    expect(postShellState.focusReturn).toHaveBeenCalledWith("outline");

    postShellState.layout.showInserter = true;
    postShellState.layout.state.secondarySidebar = "inserter";
    view.rerender(<PostBlockEditorShell />);

    React.act(() => {
      Array.from(view.container.querySelectorAll("button"))
        .find((button) => button.textContent === "toggle-inserter")
        ?.click();
    });

    expect(postShellState.focusReturn).toHaveBeenCalledWith("inserter");
  } finally {
    view.cleanup();
  }
});

test("PostBlockEditorShell closes list-view sidebars through the shell callback and returns focus to outline", async () => {
  const { PostBlockEditorShell } =
    await import("../../../core/admin/ui/posts/editor/PostBlockEditorShell");

  postShellState.layout.secondarySidebarOpen = true;
  postShellState.layout.showInserter = false;
  postShellState.layout.showListView = true;
  postShellState.layout.leftRailMode = "list-view";
  postShellState.layout.state.leftRailMode = "list-view";
  postShellState.layout.state.secondarySidebar = "list-view";

  const view = mount(<PostBlockEditorShell />);

  try {
    await React.act(async () => {
      await Promise.resolve();
    });

    React.act(() => {
      Array.from(view.container.querySelectorAll("button"))
        .find((button) => button.textContent === "close-secondary-shell")
        ?.click();
    });

    expect(postShellState.layout.closeSecondarySidebar).toHaveBeenCalled();
    expect(postShellState.focusReturn).toHaveBeenCalledWith("outline");
  } finally {
    view.cleanup();
    postShellState.layout.showListView = false;
    postShellState.layout.leftRailMode = "outline";
    postShellState.layout.state.leftRailMode = "outline";
    postShellState.layout.state.secondarySidebar = "inserter";
  }
});

test("PostBlockEditorShell tolerates malformed stored layout fields and falls back to default inspector tab", async () => {
  const { PostBlockEditorShell } =
    await import("../../../core/admin/ui/posts/editor/PostBlockEditorShell");

  window.localStorage.clear();
  postShellState.preferences.initialPreferences.defaultInspectorTab = "post" as never;
  window.localStorage.setItem(
    "nextless.posts.editor.layout.v1",
    JSON.stringify({
      secondarySidebar: "bad-value",
      detailsOpen: "bad",
      detailsTab: "weird",
      leftRailMode: "also-bad",
    })
  );

  const view = mount(<PostBlockEditorShell />);

  try {
    await React.act(async () => {
      await Promise.resolve();
    });

    expect(postShellState.layoutHookCalls.at(-1)).toMatchObject({
      initialSecondarySidebar: "list-view",
      initialDetailsOpen: true,
      initialDetailsTab: "document",
      initialLeftRailMode: "blocks",
    });
  } finally {
    view.cleanup();
    window.localStorage.clear();
  }
});

test("PostBlockEditorShell falls back when a stored layout cannot be parsed", async () => {
  const { PostBlockEditorShell } =
    await import("../../../core/admin/ui/posts/editor/PostBlockEditorShell");

  window.localStorage.clear();
  postShellState.preferences.initialPreferences.defaultInspectorTab = "post" as never;
  window.localStorage.setItem("nextless.posts.editor.layout.v1", "{not valid json");
  postShellState.layout.state.secondarySidebar = "list-view";
  postShellState.layout.state.leftRailMode = "blocks";
  postShellState.layout.state.detailsOpen = true;
  postShellState.layout.state.detailsTab = "document";

  const view = mount(<PostBlockEditorShell />);

  try {
    await React.act(async () => {
      await Promise.resolve();
    });

    expect(postShellState.layoutHookCalls.at(-1)).toMatchObject({
      initialSecondarySidebar: "list-view",
      initialDetailsOpen: true,
      initialDetailsTab: "document",
      initialLeftRailMode: "blocks",
    });
  } finally {
    view.cleanup();
    window.localStorage.clear();
  }
});

test("PostBlockEditorShell migrates legacy inserter stored layouts to list-view with blocks rail", async () => {
  const { PostBlockEditorShell } =
    await import("../../../core/admin/ui/posts/editor/PostBlockEditorShell");

  window.localStorage.clear();
  postShellState.preferences.initialPreferences.defaultInspectorTab = "post" as never;
  window.localStorage.setItem(
    "nextless.posts.editor.layout.v1",
    JSON.stringify({
      secondarySidebar: "inserter",
      detailsOpen: false,
      detailsTab: "block",
      leftRailMode: "outline",
    })
  );

  const view = mount(<PostBlockEditorShell />);

  try {
    await React.act(async () => {
      await Promise.resolve();
    });
    expect(postShellState.layoutHookCalls.at(-1)).toMatchObject({
      initialSecondarySidebar: "list-view",
      initialDetailsOpen: false,
      initialDetailsTab: "document",
      initialLeftRailMode: "blocks",
    });
  } finally {
    view.cleanup();
    window.localStorage.clear();
  }
});
