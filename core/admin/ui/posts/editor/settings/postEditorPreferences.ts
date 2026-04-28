export type PostEditorDensity = "comfortable" | "compact";
export type PostEditorDefaultInspectorTab = "post" | "block";

export type PostEditorPreferences = {
  focusModeOnOpen: boolean;
  compactSidePanels: boolean;
  showOutlineHints: boolean;
  editorDensity: PostEditorDensity;
  showKeyboardHints: boolean;
  defaultInspectorTab: PostEditorDefaultInspectorTab;
  restoreLastSidebarsState: boolean;
};

export type StoredPostEditorPreferences = PostEditorPreferences & {
  version: 2;
};

const isRecord = (value: unknown): value is Record<string, unknown> =>
  Boolean(value) && typeof value === "object" && !Array.isArray(value);

const readBooleanWithDefault = (
  source: Record<string, unknown>,
  key: string,
  fallback: boolean
) => {
  const value = source[key];
  if (typeof value === "boolean") return value;
  if (typeof value === "undefined") return fallback;
  return fallback;
};

export const DEFAULT_POST_EDITOR_PREFERENCES: PostEditorPreferences = {
  focusModeOnOpen: false,
  compactSidePanels: false,
  showOutlineHints: true,
  editorDensity: "comfortable",
  showKeyboardHints: true,
  defaultInspectorTab: "post",
  restoreLastSidebarsState: true,
};

export const normalizePostEditorPreferences = (
  input: unknown
): PostEditorPreferences => {
  if (!isRecord(input)) return DEFAULT_POST_EDITOR_PREFERENCES;

  const density =
    input.editorDensity === "compact" || input.editorDensity === "comfortable"
      ? input.editorDensity
      : DEFAULT_POST_EDITOR_PREFERENCES.editorDensity;
  const defaultInspectorTab =
    input.defaultInspectorTab === "block" || input.defaultInspectorTab === "post"
      ? input.defaultInspectorTab
      : DEFAULT_POST_EDITOR_PREFERENCES.defaultInspectorTab;

  return {
    focusModeOnOpen: readBooleanWithDefault(
      input,
      "focusModeOnOpen",
      DEFAULT_POST_EDITOR_PREFERENCES.focusModeOnOpen
    ),
    compactSidePanels: readBooleanWithDefault(
      input,
      "compactSidePanels",
      DEFAULT_POST_EDITOR_PREFERENCES.compactSidePanels
    ),
    showOutlineHints: readBooleanWithDefault(
      input,
      "showOutlineHints",
      DEFAULT_POST_EDITOR_PREFERENCES.showOutlineHints
    ),
    editorDensity: density,
    showKeyboardHints: readBooleanWithDefault(
      input,
      "showKeyboardHints",
      DEFAULT_POST_EDITOR_PREFERENCES.showKeyboardHints
    ),
    defaultInspectorTab,
    restoreLastSidebarsState: readBooleanWithDefault(
      input,
      "restoreLastSidebarsState",
      DEFAULT_POST_EDITOR_PREFERENCES.restoreLastSidebarsState
    ),
  };
};

export const toStoredPostEditorPreferences = (
  value: PostEditorPreferences
): StoredPostEditorPreferences => ({
  ...value,
  version: 2,
});
