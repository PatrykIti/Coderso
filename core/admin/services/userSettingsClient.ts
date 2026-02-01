import { apiRequest } from "./apiClient";

export type UserSettings = {
  "pages.openAfterCreate": boolean;
};

export type UserSettingResponse = {
  key: keyof UserSettings;
  value: UserSettings[keyof UserSettings];
};

export async function getUserSettings() {
  return apiRequest<UserSettings>("/user-settings", { method: "GET" });
}

export async function getUserSetting(key: keyof UserSettings) {
  return apiRequest<UserSettingResponse>(
    `/user-settings/${encodeURIComponent(key)}`,
    { method: "GET" }
  );
}

export async function setUserSetting(
  key: keyof UserSettings,
  value: UserSettings[keyof UserSettings]
) {
  return apiRequest<UserSettingResponse>(
    `/user-settings/${encodeURIComponent(key)}`,
    {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ value }),
    },
    { withCsrf: true }
  );
}
