import { and, eq, inArray } from "drizzle-orm";

import { db } from "../../db/client";
import { userSettings } from "../../db/schema";

export type UserSettingValueMap = {
  "pages.openAfterCreate": boolean;
  "media.openAfterUpload": boolean;
  "widgets.favorites": string[];
};

export type UserSettingKey = keyof UserSettingValueMap;

const DEFAULT_USER_SETTINGS: UserSettingValueMap = {
  "pages.openAfterCreate": true,
  "media.openAfterUpload": false,
  "widgets.favorites": [],
};

const ALLOWED_KEYS = new Set(Object.keys(DEFAULT_USER_SETTINGS));

function assertUserSettingKey(key: string): asserts key is UserSettingKey {
  if (!ALLOWED_KEYS.has(key)) {
    throw new Error("user_settings_key_invalid");
  }
}

function validateUserSettingValue(
  key: UserSettingKey,
  value: unknown
): UserSettingValueMap[UserSettingKey] {
  if (key === "pages.openAfterCreate") {
    if (typeof value !== "boolean") {
      throw new Error("user_settings_value_invalid");
    }
    return value;
  }
  if (key === "media.openAfterUpload") {
    if (typeof value !== "boolean") {
      throw new Error("user_settings_value_invalid");
    }
    return value;
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
    return unique;
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
  for (const row of rows) {
    const key = row.key as UserSettingKey;
    if (!(key in merged)) continue;
    switch (key) {
      case "pages.openAfterCreate":
      case "media.openAfterUpload":
        merged[key] = row.value as boolean;
        break;
      case "widgets.favorites":
        merged[key] = Array.isArray(row.value)
          ? (row.value as string[])
          : [];
        break;
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
  return row.value as UserSettingValueMap[UserSettingKey];
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
