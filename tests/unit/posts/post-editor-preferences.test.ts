import { expect, test } from "bun:test";

import {
  POST_EDITOR_PREFERENCES_LEGACY_STORAGE_KEY,
  POST_EDITOR_PREFERENCES_STORAGE_KEY,
  resolveStoredPostEditorPreferences,
} from "../../../core/admin/ui/posts/editor/hooks/usePostEditorPreferences";
import { DEFAULT_POST_EDITOR_PREFERENCES } from "../../../core/admin/ui/posts/editor/settings/postEditorPreferences";

const createStorage = (items: Record<string, string>) => ({
  getItem: (key: string) => items[key] ?? null,
  setItem: (key: string, value: string) => {
    items[key] = value;
  },
  removeItem: (key: string) => {
    delete items[key];
  },
});

test("resolveStoredPostEditorPreferences falls back to defaults when storage is empty", () => {
  const storage = createStorage({});
  const result = resolveStoredPostEditorPreferences(storage);

  expect(result.preferences).toEqual(DEFAULT_POST_EDITOR_PREFERENCES);
  expect(result.hasStoredValue).toBe(false);
});

test("resolveStoredPostEditorPreferences prefers v2 preferences over legacy v1", () => {
  const storage = createStorage({
    [POST_EDITOR_PREFERENCES_STORAGE_KEY]: JSON.stringify({
      version: 2,
      focusModeOnOpen: true,
      compactSidePanels: false,
      showOutlineHints: false,
      editorDensity: "compact",
      showKeyboardHints: true,
      defaultInspectorTab: "block",
      restoreLastSidebarsState: true,
    }),
    [POST_EDITOR_PREFERENCES_LEGACY_STORAGE_KEY]: JSON.stringify({
      focusModeOnOpen: false,
    }),
  });

  const result = resolveStoredPostEditorPreferences(storage);
  expect(result.preferences.focusModeOnOpen).toBe(true);
  expect(result.preferences.editorDensity).toBe("compact");
  expect(result.hasStoredValue).toBe(true);
});

test("resolveStoredPostEditorPreferences uses legacy v1 when v2 is invalid", () => {
  const storage = createStorage({
    [POST_EDITOR_PREFERENCES_STORAGE_KEY]: "{invalid json",
    [POST_EDITOR_PREFERENCES_LEGACY_STORAGE_KEY]: JSON.stringify({
      focusModeOnOpen: true,
      compactSidePanels: true,
      showOutlineHints: true,
      editorDensity: "comfortable",
      showKeyboardHints: false,
      defaultInspectorTab: "post",
      restoreLastSidebarsState: false,
    }),
  });

  const result = resolveStoredPostEditorPreferences(storage);
  expect(result.preferences.focusModeOnOpen).toBe(true);
  expect(result.preferences.compactSidePanels).toBe(true);
  expect(result.hasStoredValue).toBe(true);
});
