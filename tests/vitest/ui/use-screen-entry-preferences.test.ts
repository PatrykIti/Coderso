// @vitest-environment happy-dom

// TASK-503-03: the entry-view preferences hook (localStorage-only v1). Covers the
// default-OFF resolution, coerce-not-throw normalization, storage-injectable
// resolver (valid/invalid/throwing), the pinned storage key, and persist +
// reload survival through a real remount.

import React from "react";
import { createRoot } from "react-dom/client";
import { afterEach, beforeEach, expect, test, vi } from "vitest";

import {
  DEFAULT_SCREEN_ENTRY_PREFERENCES,
  normalizeScreenEntryPreferences,
  resolveStoredScreenEntryPreferences,
  SCREEN_ENTRY_PREFERENCES_STORAGE_KEY,
  useScreenEntryPreferences,
  type ScreenEntryPreferences,
} from "../../../core/admin/ui/custom-screens/hooks/useScreenEntryPreferences";

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

beforeEach(() => {
  window.localStorage.clear();
});

afterEach(() => {
  document.body.innerHTML = "";
  window.localStorage.clear();
});

test("the storage key is pinned to the v1 contract", () => {
  expect(SCREEN_ENTRY_PREFERENCES_STORAGE_KEY).toBe("coderso.screens.entry.preferences.v1");
  expect(DEFAULT_SCREEN_ENTRY_PREFERENCES).toEqual({ showFieldMetadata: false });
});

test("normalizeScreenEntryPreferences coerces junk shapes to defaults", () => {
  expect(normalizeScreenEntryPreferences(null)).toEqual(DEFAULT_SCREEN_ENTRY_PREFERENCES);
  expect(normalizeScreenEntryPreferences("nope")).toEqual(DEFAULT_SCREEN_ENTRY_PREFERENCES);
  expect(normalizeScreenEntryPreferences([true])).toEqual(DEFAULT_SCREEN_ENTRY_PREFERENCES);
  expect(normalizeScreenEntryPreferences({ showFieldMetadata: "yes" })).toEqual(
    DEFAULT_SCREEN_ENTRY_PREFERENCES
  );
  expect(normalizeScreenEntryPreferences({ showFieldMetadata: true })).toEqual({
    showFieldMetadata: true,
  });
});

test("resolveStoredScreenEntryPreferences reads valid JSON and swallows errors", () => {
  const good = {
    getItem: () => JSON.stringify({ showFieldMetadata: true }),
    setItem: vi.fn(),
  };
  expect(resolveStoredScreenEntryPreferences(good)).toEqual({ showFieldMetadata: true });

  const emptyStore = { getItem: () => null, setItem: vi.fn() };
  expect(resolveStoredScreenEntryPreferences(emptyStore)).toEqual(DEFAULT_SCREEN_ENTRY_PREFERENCES);

  const badJson = { getItem: () => "{not json", setItem: vi.fn() };
  expect(resolveStoredScreenEntryPreferences(badJson)).toEqual(DEFAULT_SCREEN_ENTRY_PREFERENCES);

  const throwing = {
    getItem: () => {
      throw new Error("blocked");
    },
    setItem: vi.fn(),
  };
  expect(resolveStoredScreenEntryPreferences(throwing)).toEqual(DEFAULT_SCREEN_ENTRY_PREFERENCES);
});

// Thin harness that surfaces the hook value + setter for assertions.
type HookHandle = {
  current: ScreenEntryPreferences;
  setPreferences: (next: ScreenEntryPreferences) => void;
};

const mountHook = () => {
  const handle: HookHandle = {
    current: DEFAULT_SCREEN_ENTRY_PREFERENCES,
    setPreferences: () => {},
  };
  function Probe() {
    const { preferences, setPreferences } = useScreenEntryPreferences();
    handle.current = preferences;
    handle.setPreferences = setPreferences;
    return null;
  }
  const container = document.createElement("div");
  document.body.appendChild(container);
  const root = createRoot(container);
  React.act(() => {
    root.render(React.createElement(Probe));
  });
  return {
    handle,
    unmount: () =>
      React.act(() => {
        root.unmount();
      }),
  };
};

test("the hook defaults OFF when storage is empty", () => {
  const { handle, unmount } = mountHook();
  try {
    expect(handle.current).toEqual({ showFieldMetadata: false });
  } finally {
    unmount();
  }
});

test("toggling persists to localStorage and survives a remount (reload)", () => {
  const first = mountHook();
  try {
    React.act(() => {
      first.handle.setPreferences({ showFieldMetadata: true });
    });
    expect(first.handle.current).toEqual({ showFieldMetadata: true });
    expect(
      JSON.parse(window.localStorage.getItem(SCREEN_ENTRY_PREFERENCES_STORAGE_KEY) ?? "null")
    ).toEqual({ showFieldMetadata: true });
  } finally {
    first.unmount();
  }

  // Fresh mount reads the persisted value back (simulated reload).
  const second = mountHook();
  try {
    expect(second.handle.current).toEqual({ showFieldMetadata: true });
  } finally {
    second.unmount();
  }
});
