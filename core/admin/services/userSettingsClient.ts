import { createReadThroughCache } from "@/utils/readThroughCache";
import type { StoredPostEditorPreferences } from "@/ui/posts/editor/settings/postEditorPreferences";
import { apiRequest } from "./apiClient";

export type HeroPresetSetting = {
  name: string;
  variant: "centered" | "split" | "media-left";
  data: Record<string, unknown>;
  updatedAt: string;
};

export type UserSettings = {
  "pages.openAfterCreate": boolean;
  "media.openAfterUpload": boolean;
  "widgets.favorites": string[];
  "widgets.hero.presets": HeroPresetSetting[];
  "posts.editor.preferences": StoredPostEditorPreferences;
  "assistant.mode": "docs-only" | "llm-guide" | null;
  "assistant.ui.enabled": boolean;
  "assistant.ui.avatarEnabled": boolean;
  "assistant.ui.avatarAsset": string | null;
};

export type UserSettingResponse = {
  key: keyof UserSettings;
  value: UserSettings[keyof UserSettings];
};

const USER_SETTINGS_TTL_MS = 10_000;

const userSettingsReadCache = createReadThroughCache<UserSettings>({
  ttlMs: USER_SETTINGS_TTL_MS,
  load: () => apiRequest<UserSettings>("/user-settings", { method: "GET" }),
});

export async function getUserSettings(options?: { force?: boolean }) {
  return userSettingsReadCache.get({ force: options?.force });
}

export async function getUserSetting<K extends keyof UserSettings>(
  key: K,
  options?: { force?: boolean }
) {
  if (!options?.force) {
    const cached = userSettingsReadCache.peek();
    if (cached) {
      return { key, value: cached[key] };
    }
  }

  const result = await apiRequest<{ key: K; value: UserSettings[K] }>(
    `/user-settings/${encodeURIComponent(key)}`,
    { method: "GET" }
  );
  const cached = userSettingsReadCache.peek();
  if (cached) {
    userSettingsReadCache.set({
      ...cached,
      [result.key]: result.value,
    });
  }
  return result;
}

export async function setUserSetting<K extends keyof UserSettings>(
  key: K,
  value: UserSettings[K]
) {
  const result = await apiRequest<{ key: K; value: UserSettings[K] }>(
    `/user-settings/${encodeURIComponent(key)}`,
    {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ value }),
    },
    { withCsrf: true }
  );

  const cached = userSettingsReadCache.peek();
  if (cached) {
    userSettingsReadCache.set({
      ...cached,
      [result.key]: result.value,
    });
  } else {
    userSettingsReadCache.invalidate();
  }

  return result;
}

export const invalidateUserSettingsCache = () => {
  userSettingsReadCache.invalidate();
};
