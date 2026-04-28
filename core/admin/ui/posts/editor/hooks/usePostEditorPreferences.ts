import { useCallback, useEffect, useRef, useState } from "react";

import { getUserSettings, setUserSetting } from "@/services/userSettingsClient";

import {
  DEFAULT_POST_EDITOR_PREFERENCES,
  normalizePostEditorPreferences,
  toStoredPostEditorPreferences,
  type PostEditorPreferences,
} from "../settings/postEditorPreferences";

export const POST_EDITOR_PREFERENCES_STORAGE_KEY = "coderso.posts.editor.preferences.v2";
export const POST_EDITOR_PREFERENCES_LEGACY_CURRENT_STORAGE_KEY =
  "nextless.posts.editor.preferences.v2";
export const POST_EDITOR_PREFERENCES_LEGACY_STORAGE_KEY =
  "nextless.posts.editor.preferences.v1";

export type PreferencesStorage = Pick<
  Storage,
  "getItem" | "setItem" | "removeItem"
>;

type StoredPreferencesState = {
  preferences: PostEditorPreferences;
  hasStoredValue: boolean;
};

const parsePreferencesFromStorage = (
  storage: PreferencesStorage,
  key: string
): PostEditorPreferences | null => {
  try {
    const raw = storage.getItem(key);
    if (!raw) return null;
    return normalizePostEditorPreferences(JSON.parse(raw));
  } catch {
    return null;
  }
};

export const resolveStoredPostEditorPreferences = (
  storage: PreferencesStorage
): StoredPreferencesState => {
  const v2 = parsePreferencesFromStorage(storage, POST_EDITOR_PREFERENCES_STORAGE_KEY);
  if (v2) return { preferences: v2, hasStoredValue: true };

  const legacyV2 = parsePreferencesFromStorage(
    storage,
    POST_EDITOR_PREFERENCES_LEGACY_CURRENT_STORAGE_KEY
  );
  if (legacyV2) {
    storage.setItem(
      POST_EDITOR_PREFERENCES_STORAGE_KEY,
      JSON.stringify(toStoredPostEditorPreferences(legacyV2))
    );
    return { preferences: legacyV2, hasStoredValue: true };
  }

  const v1 = parsePreferencesFromStorage(
    storage,
    POST_EDITOR_PREFERENCES_LEGACY_STORAGE_KEY
  );
  if (v1) {
    storage.setItem(
      POST_EDITOR_PREFERENCES_STORAGE_KEY,
      JSON.stringify(toStoredPostEditorPreferences(v1))
    );
    return { preferences: v1, hasStoredValue: true };
  }

  return { preferences: DEFAULT_POST_EDITOR_PREFERENCES, hasStoredValue: false };
};

export const resolveInitialPostEditorPreferences = (): StoredPreferencesState => {
  if (typeof window === "undefined") {
    return {
      preferences: DEFAULT_POST_EDITOR_PREFERENCES,
      hasStoredValue: false,
    };
  }
  return resolveStoredPostEditorPreferences(window.localStorage);
};

type UsePostEditorPreferencesResult = {
  preferences: PostEditorPreferences;
  initialPreferences: PostEditorPreferences;
  hasStoredValue: boolean;
  setPreferences: (next: PostEditorPreferences) => void;
  resetPreferences: () => void;
};

export function usePostEditorPreferences(): UsePostEditorPreferencesResult {
  const [initialState] = useState(resolveInitialPostEditorPreferences);
  const [preferences, setPreferencesState] = useState<PostEditorPreferences>(
    () => initialState.preferences
  );
  const skipNextPreferenceSyncRef = useRef(false);
  const didMountPreferencesRef = useRef(false);
  const preferencesTouchedRef = useRef(false);

  const setPreferences = useCallback((next: PostEditorPreferences) => {
    preferencesTouchedRef.current = true;
    setPreferencesState(next);
  }, []);

  const resetPreferences = useCallback(() => {
    preferencesTouchedRef.current = true;
    setPreferencesState(DEFAULT_POST_EDITOR_PREFERENCES);
  }, []);

  useEffect(() => {
    let active = true;
    if (initialState.hasStoredValue) return () => undefined;

    (async () => {
      try {
        const userSettings = await getUserSettings();
        if (!active || preferencesTouchedRef.current) return;
        skipNextPreferenceSyncRef.current = true;
        setPreferencesState(
          normalizePostEditorPreferences(userSettings["posts.editor.preferences"])
        );
      } catch {
        // Keep local defaults when user setting sync is unavailable.
      }
    })();

    return () => {
      active = false;
    };
  }, [initialState.hasStoredValue]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    window.localStorage.setItem(
      POST_EDITOR_PREFERENCES_STORAGE_KEY,
      JSON.stringify(toStoredPostEditorPreferences(preferences))
    );
    window.localStorage.setItem(
      POST_EDITOR_PREFERENCES_LEGACY_CURRENT_STORAGE_KEY,
      JSON.stringify(toStoredPostEditorPreferences(preferences))
    );
    window.localStorage.setItem(
      POST_EDITOR_PREFERENCES_LEGACY_STORAGE_KEY,
      JSON.stringify(preferences)
    );
    if (!didMountPreferencesRef.current) {
      didMountPreferencesRef.current = true;
      return;
    }
    if (skipNextPreferenceSyncRef.current) {
      skipNextPreferenceSyncRef.current = false;
      return;
    }
    void setUserSetting(
      "posts.editor.preferences",
      toStoredPostEditorPreferences(preferences)
    ).catch(() => undefined);
  }, [preferences]);

  return {
    preferences,
    initialPreferences: initialState.preferences,
    hasStoredValue: initialState.hasStoredValue,
    setPreferences,
    resetPreferences,
  };
}
