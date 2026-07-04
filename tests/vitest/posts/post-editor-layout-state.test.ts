import { describe, expect, test } from "vitest";

import {
  createPostEditorLayoutState,
  postEditorLayoutReducer,
} from "../../../core/admin/ui/posts/editor/hooks/usePostEditorLayout";
import {
  DEFAULT_POST_EDITOR_PREFERENCES,
  normalizePostEditorPreferences,
  toStoredPostEditorPreferences,
} from "../../../core/admin/ui/posts/editor/settings/postEditorPreferences";

describe("post editor layout state", () => {
  test("creates default layout state", () => {
    const state = createPostEditorLayoutState();
    expect(state).toEqual({
      secondarySidebar: null,
      detailsOpen: false,
      detailsTab: "document",
      focusMode: false,
      leftRailMode: "blocks",
      focusRestore: null,
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

  test("focus mode closes sidebars and restores previous panel state on exit", () => {
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
    expect(focused.focusRestore).toEqual({
      secondarySidebar: "list-view",
      detailsOpen: true,
    });

    const restored = postEditorLayoutReducer(focused, {
      type: "set_focus_mode",
      value: false,
    });
    expect(restored.focusMode).toBe(false);
    expect(restored.secondarySidebar).toBe("list-view");
    expect(restored.detailsOpen).toBe(true);
    expect(restored.focusRestore).toBeNull();
  });

  test("initial focus mode hides restored panels but keeps one-click restore snapshot", () => {
    const state = createPostEditorLayoutState({
      initialSecondarySidebar: "list-view",
      initialDetailsOpen: true,
      initialFocusMode: true,
    });

    expect(state.focusMode).toBe(true);
    expect(state.secondarySidebar).toBeNull();
    expect(state.detailsOpen).toBe(false);
    expect(state.focusRestore).toEqual({
      secondarySidebar: "list-view",
      detailsOpen: true,
    });

    const opened = postEditorLayoutReducer(state, {
      type: "open_secondary",
      sidebar: "list-view",
    });
    expect(opened.focusMode).toBe(false);
    expect(opened.secondarySidebar).toBe("list-view");
  });

  test("opening panel while focused clears stored snapshot", () => {
    const focused = postEditorLayoutReducer(
      createPostEditorLayoutState({
        initialSecondarySidebar: "list-view",
        initialDetailsOpen: true,
      }),
      {
        type: "set_focus_mode",
        value: true,
      }
    );

    const reopened = postEditorLayoutReducer(focused, {
      type: "open_secondary",
      sidebar: "inserter",
    });
    expect(reopened.focusMode).toBe(false);
    expect(reopened.secondarySidebar).toBe("inserter");
    expect(reopened.focusRestore).toBeNull();
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

  test("transitions left rail mode blocks -> outline -> list-view", () => {
    const initial = createPostEditorLayoutState();
    expect(initial.leftRailMode).toBe("blocks");

    const toOutline = postEditorLayoutReducer(initial, {
      type: "set_left_rail_mode",
      mode: "outline",
    });
    expect(toOutline.leftRailMode).toBe("outline");

    const toListView = postEditorLayoutReducer(toOutline, {
      type: "set_left_rail_mode",
      mode: "list-view",
    });
    expect(toListView.leftRailMode).toBe("list-view");
  });

  test("normalizes post editor preferences from legacy payload", () => {
    const normalized = normalizePostEditorPreferences({
      focusModeOnOpen: true,
      compactSidePanels: true,
      showOutlineHints: false,
    });

    expect(normalized.focusModeOnOpen).toBe(true);
    expect(normalized.compactSidePanels).toBe(true);
    expect(normalized.showOutlineHints).toBe(false);
    expect(normalized.editorDensity).toBe(DEFAULT_POST_EDITOR_PREFERENCES.editorDensity);
    expect(normalized.showKeyboardHints).toBe(DEFAULT_POST_EDITOR_PREFERENCES.showKeyboardHints);
    expect(normalized.defaultInspectorTab).toBe(
      DEFAULT_POST_EDITOR_PREFERENCES.defaultInspectorTab
    );
    expect(normalized.restoreLastSidebarsState).toBe(
      DEFAULT_POST_EDITOR_PREFERENCES.restoreLastSidebarsState
    );
  });

  test("stores preferences in v2 shape", () => {
    const stored = toStoredPostEditorPreferences(DEFAULT_POST_EDITOR_PREFERENCES);

    expect(stored.version).toBe(2);
    expect(stored.focusModeOnOpen).toBe(false);
    expect(stored.defaultInspectorTab).toBe("post");
  });
});
