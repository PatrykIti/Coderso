export type ScreenEntryPreferencesSettingValue = {
  version: 1;
  showFieldMetadata: boolean;
};

export type ScreenEntryPreferences = {
  showFieldMetadata: boolean;
};

export const DEFAULT_SCREEN_ENTRY_PREFERENCES: ScreenEntryPreferences = {
  showFieldMetadata: false,
};

export const DEFAULT_SCREEN_ENTRY_PREFERENCES_SETTING = {
  version: 1,
  showFieldMetadata: false,
} as const satisfies ScreenEntryPreferencesSettingValue;

export function normalizeScreenEntryPreferences(value: unknown): ScreenEntryPreferences {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return DEFAULT_SCREEN_ENTRY_PREFERENCES;
  }
  const record = value as Record<string, unknown>;
  return {
    showFieldMetadata:
      typeof record.showFieldMetadata === "boolean"
        ? record.showFieldMetadata
        : DEFAULT_SCREEN_ENTRY_PREFERENCES.showFieldMetadata,
  };
}

export function normalizeScreenEntryPreferencesSetting(
  value: unknown
): ScreenEntryPreferencesSettingValue {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new Error("user_settings_value_invalid");
  }
  const record = value as Record<string, unknown>;
  if (Object.keys(record).some((key) => key !== "version" && key !== "showFieldMetadata")) {
    throw new Error("user_settings_value_invalid");
  }
  if (record.version !== 1 || typeof record.showFieldMetadata !== "boolean") {
    throw new Error("user_settings_value_invalid");
  }
  return { version: 1, showFieldMetadata: record.showFieldMetadata };
}

export function toScreenEntryPreferencesView(
  value: ScreenEntryPreferencesSettingValue
): ScreenEntryPreferences {
  return { showFieldMetadata: value.showFieldMetadata };
}

export function toScreenEntryPreferencesSetting(
  value: ScreenEntryPreferences
): ScreenEntryPreferencesSettingValue {
  return { version: 1, showFieldMetadata: value.showFieldMetadata };
}
