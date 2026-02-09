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
  "assistant.mode": "docs-only" | "llm-rag" | null;
  "assistant.ui.enabled": boolean;
  "assistant.ui.avatarEnabled": boolean;
  "assistant.ui.avatarAsset": string | null;
};

export type UserSettingResponse = {
  key: keyof UserSettings;
  value: UserSettings[keyof UserSettings];
};

export async function getUserSettings() {
  return apiRequest<UserSettings>("/user-settings", { method: "GET" });
}

export async function getUserSetting<K extends keyof UserSettings>(key: K) {
  return apiRequest<{ key: K; value: UserSettings[K] }>(
    `/user-settings/${encodeURIComponent(key)}`,
    { method: "GET" }
  );
}

export async function setUserSetting<K extends keyof UserSettings>(
  key: K,
  value: UserSettings[K]
) {
  return apiRequest<{ key: K; value: UserSettings[K] }>(
    `/user-settings/${encodeURIComponent(key)}`,
    {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ value }),
    },
    { withCsrf: true }
  );
}
