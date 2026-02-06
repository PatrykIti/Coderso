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

export type UserSettingValueMap = {
  "pages.openAfterCreate": boolean;
  "media.openAfterUpload": boolean;
  "widgets.favorites": string[];
  "widgets.hero.presets": HeroPresetSettingValue[];
};

export type UserSettingKey = keyof UserSettingValueMap;

const DEFAULT_USER_SETTINGS: UserSettingValueMap = {
  "pages.openAfterCreate": true,
  "media.openAfterUpload": false,
  "widgets.favorites": [],
  "widgets.hero.presets": [],
};

const ALLOWED_KEYS = new Set(Object.keys(DEFAULT_USER_SETTINGS));

function assertUserSettingKey(key: string): asserts key is UserSettingKey {
  if (!ALLOWED_KEYS.has(key)) {
    throw new Error("user_settings_key_invalid");
  }
}

function validateUserSettingValue<K extends UserSettingKey>(
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
      case "widgets.hero.presets":
        merged["widgets.hero.presets"] = validateUserSettingValue(
          "widgets.hero.presets",
          row.value
        );
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
