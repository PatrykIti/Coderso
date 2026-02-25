import { describe, expect, test } from "bun:test";

import {
  createPostEditorLayoutState,
  postEditorLayoutReducer,
} from "../../../core/admin/ui/posts/editor/hooks/usePostEditorLayout";

describe("post editor layout state", () => {
  test("creates default layout state", () => {
    const state = createPostEditorLayoutState();
    expect(state).toEqual({
      secondarySidebar: null,
      detailsOpen: false,
      detailsTab: "document",
      focusMode: false,
      leftRailMode: "outline",
    });
  });

  test("toggles secondary sidebar modes", () => {
    const initial = createPostEditorLayoutState({
      initialSecondarySidebar: "list-view",
    });
    const toInserter = postEditorLayoutReducer(initial, {
      type: "toggle_secondary",
      sidebar: "inserter",
    });
    expect(toInserter.secondarySidebar).toBe("inserter");

    const closeInserter = postEditorLayoutReducer(toInserter, {
      type: "toggle_secondary",
      sidebar: "inserter",
    });
    expect(closeInserter.secondarySidebar).toBeNull();
  });

  test("opens details tab with explicit context", () => {
    const initial = createPostEditorLayoutState();
    const opened = postEditorLayoutReducer(initial, {
      type: "open_details",
      tab: "block",
    });
    expect(opened.detailsOpen).toBe(true);
    expect(opened.detailsTab).toBe("block");

    const toggled = postEditorLayoutReducer(opened, {
      type: "toggle_details",
      tab: "block",
    });
    expect(toggled.detailsOpen).toBe(false);
    expect(toggled.detailsTab).toBe("block");
  });

  test("focus mode closes sidebars and exits on panel open", () => {
    const initial = createPostEditorLayoutState({
      initialSecondarySidebar: "list-view",
      initialDetailsOpen: true,
      initialFocusMode: false,
    });
    const focused = postEditorLayoutReducer(initial, {
      type: "set_focus_mode",
      value: true,
    });
    expect(focused.focusMode).toBe(true);
    expect(focused.secondarySidebar).toBeNull();
    expect(focused.detailsOpen).toBe(false);

    const reopened = postEditorLayoutReducer(focused, {
      type: "open_secondary",
      sidebar: "inserter",
    });
    expect(reopened.focusMode).toBe(false);
    expect(reopened.secondarySidebar).toBe("inserter");
  });

  test("stores left rail mode independently from panel visibility", () => {
    const initial = createPostEditorLayoutState({
      initialSecondarySidebar: "list-view",
    });
    const switched = postEditorLayoutReducer(initial, {
      type: "set_left_rail_mode",
      mode: "list-view",
    });
    expect(switched.leftRailMode).toBe("list-view");

    const closed = postEditorLayoutReducer(switched, {
      type: "close_secondary",
    });
    expect(closed.secondarySidebar).toBeNull();
    expect(closed.leftRailMode).toBe("list-view");
  });
});
