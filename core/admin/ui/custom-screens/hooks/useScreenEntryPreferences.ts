import { useCallback, useEffect, useState } from "react";

// TASK-503-03: per-user, per-browser entry-view preferences (localStorage only,
// v1 — no userSettingsClient sync; the usePostEditorPreferences pattern minus
// the server round-trip). Client state only: no route/RBAC/endpoint surface.
export const SCREEN_ENTRY_PREFERENCES_STORAGE_KEY = "coderso.screens.entry.preferences.v1";

export type ScreenEntryPreferences = {
  /** Entry-view field badges ("Editable"/"Read"/"Unbound" + field type). DEFAULT OFF. */
  showFieldMetadata: boolean;
};

export const DEFAULT_SCREEN_ENTRY_PREFERENCES: ScreenEntryPreferences = {
  showFieldMetadata: false,
};

export type ScreenEntryPreferencesStorage = Pick<Storage, "getItem" | "setItem">;

// Coerce-not-throw: non-record / array / non-boolean member → defaults.
export const normalizeScreenEntryPreferences = (raw: unknown): ScreenEntryPreferences => {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
    return DEFAULT_SCREEN_ENTRY_PREFERENCES;
  }
  const record = raw as Record<string, unknown>;
  return {
    showFieldMetadata:
      typeof record.showFieldMetadata === "boolean"
        ? record.showFieldMetadata
        : DEFAULT_SCREEN_ENTRY_PREFERENCES.showFieldMetadata,
  };
};

// Storage-injectable for tests (fake storage), parse/storage errors swallowed.
export const resolveStoredScreenEntryPreferences = (
  storage: ScreenEntryPreferencesStorage
): ScreenEntryPreferences => {
  try {
    const raw = storage.getItem(SCREEN_ENTRY_PREFERENCES_STORAGE_KEY);
    if (!raw) return DEFAULT_SCREEN_ENTRY_PREFERENCES;
    return normalizeScreenEntryPreferences(JSON.parse(raw));
  } catch {
    return DEFAULT_SCREEN_ENTRY_PREFERENCES;
  }
};

const resolveInitialScreenEntryPreferences = (): ScreenEntryPreferences =>
  typeof window === "undefined"
    ? DEFAULT_SCREEN_ENTRY_PREFERENCES
    : resolveStoredScreenEntryPreferences(window.localStorage);

type UseScreenEntryPreferencesResult = {
  preferences: ScreenEntryPreferences;
  setPreferences: (next: ScreenEntryPreferences) => void;
};

export function useScreenEntryPreferences(): UseScreenEntryPreferencesResult {
  const [preferences, setPreferencesState] = useState<ScreenEntryPreferences>(
    resolveInitialScreenEntryPreferences
  );

  const setPreferences = useCallback((next: ScreenEntryPreferences) => {
    setPreferencesState(normalizeScreenEntryPreferences(next));
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      window.localStorage.setItem(
        SCREEN_ENTRY_PREFERENCES_STORAGE_KEY,
        JSON.stringify(preferences)
      );
    } catch {
      // Quota/blocked storage is non-fatal — the toggle still works this session.
    }
  }, [preferences]);

  return { preferences, setPreferences };
}
