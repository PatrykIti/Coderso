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
});
