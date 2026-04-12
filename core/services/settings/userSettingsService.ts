import { and, eq, inArray } from "drizzle-orm";

import { db } from "../../db/client";
import { userSettings } from "../../db/schema";

const heroVariants = new Set(["centered", "split", "media-left"]);
const heroPresetLimit = 24;
const heroPresetNameLimit = 80;

type HeroPresetSettingValue = {
  name: string;
  variant: "centered" | "split" | "media-left";
  data: Record<string, unknown>;
  updatedAt: string;
};

export type AssistantUserMode = "docs-only" | "llm-guide";
export type PostEditorDensity = "comfortable" | "compact";
export type PostEditorDefaultInspectorTab = "post" | "block";

type PostEditorPreferencesSettingValue = {
  version: 2;
  focusModeOnOpen: boolean;
  compactSidePanels: boolean;
  showOutlineHints: boolean;
  editorDensity: PostEditorDensity;
  showKeyboardHints: boolean;
  defaultInspectorTab: PostEditorDefaultInspectorTab;
  restoreLastSidebarsState: boolean;
};

export type UserSettingValueMap = {
  "pages.openAfterCreate": boolean;
  "media.openAfterUpload": boolean;
  "widgets.favorites": string[];
  "widgets.hero.presets": HeroPresetSettingValue[];
  "posts.editor.preferences": PostEditorPreferencesSettingValue;
  "assistant.mode": AssistantUserMode | null;
  "assistant.ui.enabled": boolean;
  "assistant.ui.avatarEnabled": boolean;
  "assistant.ui.avatarAsset": string | null;
};

export type UserSettingKey = keyof UserSettingValueMap;

const postEditorDensityModes = new Set<PostEditorDensity>([
  "comfortable",
  "compact",
]);
const postEditorInspectorTabs = new Set<PostEditorDefaultInspectorTab>([
  "post",
  "block",
]);

const DEFAULT_POST_EDITOR_PREFERENCES: PostEditorPreferencesSettingValue = {
  version: 2,
  focusModeOnOpen: false,
  compactSidePanels: false,
  showOutlineHints: true,
  editorDensity: "comfortable",
  showKeyboardHints: true,
  defaultInspectorTab: "post",
  restoreLastSidebarsState: true,
};

const isRecord = (value: unknown): value is Record<string, unknown> =>
  Boolean(value) && typeof value === "object" && !Array.isArray(value);

const DEFAULT_USER_SETTINGS: UserSettingValueMap = {
  "pages.openAfterCreate": true,
  "media.openAfterUpload": false,
  "widgets.favorites": [],
  "widgets.hero.presets": [],
  "posts.editor.preferences": DEFAULT_POST_EDITOR_PREFERENCES,
  "assistant.mode": null,
  "assistant.ui.enabled": true,
  "assistant.ui.avatarEnabled": false,
  "assistant.ui.avatarAsset": null,
};

const ALLOWED_KEYS = new Set(Object.keys(DEFAULT_USER_SETTINGS));

function assertUserSettingKey(key: string): asserts key is UserSettingKey {
  if (!ALLOWED_KEYS.has(key)) {
    throw new Error("user_settings_key_invalid");
  }
}

const assistantModes = new Set<AssistantUserMode>(["docs-only", "llm-guide"]);

const normalizeOptionalString = (value: unknown) => {
  if (value === null) return null;
  if (typeof value !== "string") {
    throw new Error("user_settings_value_invalid");
  }
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
};

export function validateUserSettingValue<K extends UserSettingKey>(
  key: K,
  value: unknown
): UserSettingValueMap[K] {
  if (key === "pages.openAfterCreate") {
    if (typeof value !== "boolean") {
      throw new Error("user_settings_value_invalid");
    }
    return value as UserSettingValueMap[K];
  }
  if (key === "media.openAfterUpload") {
    if (typeof value !== "boolean") {
      throw new Error("user_settings_value_invalid");
    }
    return value as UserSettingValueMap[K];
  }
  if (key === "widgets.favorites") {
    if (!Array.isArray(value)) {
      throw new Error("user_settings_value_invalid");
    }
    const normalized = value.map((entry) => {
      if (typeof entry !== "string") {
        throw new Error("user_settings_value_invalid");
      }
      const trimmed = entry.trim();
      if (!trimmed) {
        throw new Error("user_settings_value_invalid");
      }
      return trimmed;
    });
    const unique = Array.from(new Set(normalized));
    if (unique.length > 50) {
      throw new Error("user_settings_value_invalid");
    }
    return unique as UserSettingValueMap[K];
  }
  if (key === "widgets.hero.presets") {
    if (!Array.isArray(value)) {
      throw new Error("user_settings_value_invalid");
    }
    if (value.length > heroPresetLimit) {
      throw new Error("user_settings_value_invalid");
    }
    const byName = new Map<string, HeroPresetSettingValue>();
    for (const entry of value) {
      if (!entry || typeof entry !== "object" || Array.isArray(entry)) {
        throw new Error("user_settings_value_invalid");
      }
      const candidate = entry as Partial<HeroPresetSettingValue>;
      if (typeof candidate.name !== "string") {
        throw new Error("user_settings_value_invalid");
      }
      const name = candidate.name.trim();
      if (!name || name.length > heroPresetNameLimit) {
        throw new Error("user_settings_value_invalid");
      }
      if (
        typeof candidate.variant !== "string" ||
        !heroVariants.has(candidate.variant)
      ) {
        throw new Error("user_settings_value_invalid");
      }
      if (
        !candidate.data ||
        typeof candidate.data !== "object" ||
        Array.isArray(candidate.data)
      ) {
        throw new Error("user_settings_value_invalid");
      }
      const updatedAt =
        typeof candidate.updatedAt === "string" && candidate.updatedAt.trim()
          ? candidate.updatedAt
          : new Date(0).toISOString();
      byName.set(name.toLowerCase(), {
        name,
        variant: candidate.variant as HeroPresetSettingValue["variant"],
        data: candidate.data,
        updatedAt,
      });
    }
    return Array.from(byName.values()).slice(
      0,
      heroPresetLimit
    ) as UserSettingValueMap[K];
  }
  if (key === "posts.editor.preferences") {
    if (!isRecord(value)) {
      throw new Error("user_settings_value_invalid");
    }

    const readBoolean = (
      source: Record<string, unknown>,
      field: keyof PostEditorPreferencesSettingValue,
      fallback: boolean
    ) => {
      const candidate = source[field];
      return typeof candidate === "boolean" ? candidate : fallback;
    };

    const editorDensity =
      typeof value.editorDensity === "string" &&
      postEditorDensityModes.has(value.editorDensity as PostEditorDensity)
        ? (value.editorDensity as PostEditorDensity)
        : DEFAULT_POST_EDITOR_PREFERENCES.editorDensity;
    const defaultInspectorTab =
      typeof value.defaultInspectorTab === "string" &&
      postEditorInspectorTabs.has(
        value.defaultInspectorTab as PostEditorDefaultInspectorTab
      )
        ? (value.defaultInspectorTab as PostEditorDefaultInspectorTab)
        : DEFAULT_POST_EDITOR_PREFERENCES.defaultInspectorTab;

    return {
      version: 2,
      focusModeOnOpen: readBoolean(
        value,
        "focusModeOnOpen",
        DEFAULT_POST_EDITOR_PREFERENCES.focusModeOnOpen
      ),
      compactSidePanels: readBoolean(
        value,
        "compactSidePanels",
        DEFAULT_POST_EDITOR_PREFERENCES.compactSidePanels
      ),
      showOutlineHints: readBoolean(
        value,
        "showOutlineHints",
        DEFAULT_POST_EDITOR_PREFERENCES.showOutlineHints
      ),
      editorDensity,
      showKeyboardHints: readBoolean(
        value,
        "showKeyboardHints",
        DEFAULT_POST_EDITOR_PREFERENCES.showKeyboardHints
      ),
      defaultInspectorTab,
      restoreLastSidebarsState: readBoolean(
        value,
        "restoreLastSidebarsState",
        DEFAULT_POST_EDITOR_PREFERENCES.restoreLastSidebarsState
      ),
    } as UserSettingValueMap[K];
  }
  if (key === "assistant.mode") {
    if (value === null) {
      return null as UserSettingValueMap[K];
    }
    if (value === "llm-rag") {
      return "llm-guide" as UserSettingValueMap[K];
    }
    if (typeof value !== "string" || !assistantModes.has(value as AssistantUserMode)) {
      throw new Error("user_settings_value_invalid");
    }
    return value as UserSettingValueMap[K];
  }
  if (key === "assistant.ui.enabled" || key === "assistant.ui.avatarEnabled") {
    if (typeof value !== "boolean") {
      throw new Error("user_settings_value_invalid");
    }
    return value as UserSettingValueMap[K];
  }
  if (key === "assistant.ui.avatarAsset") {
    const normalized = normalizeOptionalString(value);
    if (normalized && normalized.length > 512) {
      throw new Error("user_settings_value_invalid");
    }
    return normalized as UserSettingValueMap[K];
  }

  throw new Error("user_settings_value_invalid");
}

export async function listUserSettings(userId: string) {
  const keys = Object.keys(DEFAULT_USER_SETTINGS) as UserSettingKey[];
  const rows = await db
    .select()
    .from(userSettings)
    .where(and(eq(userSettings.userId, userId), inArray(userSettings.key, keys)));

  const merged = { ...DEFAULT_USER_SETTINGS } as UserSettingValueMap;
  const mergedByKey = merged as Record<UserSettingKey, UserSettingValueMap[UserSettingKey]>;
  for (const row of rows) {
    const key = row.key as UserSettingKey;
    if (!(key in merged)) continue;
    try {
      mergedByKey[key] = validateUserSettingValue(key, row.value);
      if (key === "assistant.mode" && row.value === "llm-rag") {
        await setUserSetting(userId, key, "llm-guide");
      }
    } catch {
      mergedByKey[key] = DEFAULT_USER_SETTINGS[key];
    }
  }

  return merged;
}

export async function getUserSetting(userId: string, key: string) {
  assertUserSettingKey(key);
  const [row] = await db
    .select()
    .from(userSettings)
    .where(and(eq(userSettings.userId, userId), eq(userSettings.key, key)));
  if (!row) return DEFAULT_USER_SETTINGS[key];
  try {
    const normalized = validateUserSettingValue(key, row.value);
    if (key === "assistant.mode" && row.value === "llm-rag") {
      await setUserSetting(userId, key, "llm-guide");
    }
    return normalized;
  } catch {
    return DEFAULT_USER_SETTINGS[key];
  }
}

export async function setUserSetting(
  userId: string,
  key: string,
  value: unknown
) {
  assertUserSettingKey(key);
  const typedValue = validateUserSettingValue(key, value);
  const now = new Date();

  const [row] = await db
    .insert(userSettings)
    .values({ userId, key, value: typedValue, updatedAt: now })
    .onConflictDoUpdate({
      target: [userSettings.userId, userSettings.key],
      set: { value: typedValue, updatedAt: now },
    })
    .returning();

  return row;
}
