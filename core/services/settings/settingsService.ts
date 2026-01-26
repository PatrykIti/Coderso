import { eq, inArray } from "drizzle-orm";
import { db } from "../../db/client";
import { settings } from "../../db/schema";
import { assertTokenOverrides } from "../theme/tokenValidation";
import type { DesignTokenOverrides } from "../theme/tokenTypes";

const DEFAULT_SETTINGS = {
  "site.name": "Nextless",
  "site.locale": "en",
  "design.tokens": {} as DesignTokenOverrides,
};

export type SettingKey = keyof typeof DEFAULT_SETTINGS;
export type SettingValueMap = typeof DEFAULT_SETTINGS;

const ALLOWED_KEYS = new Set(Object.keys(DEFAULT_SETTINGS));

function assertSettingKey(key: string): asserts key is SettingKey {
  if (!ALLOWED_KEYS.has(key)) {
    throw new Error("settings_key_invalid");
  }
}

function validateSettingValue(key: SettingKey, value: unknown): SettingValueMap[SettingKey] {
  if (key === "site.name" || key === "site.locale") {
    if (typeof value !== "string") {
      throw new Error("settings_value_invalid");
    }
    return value;
  }

  if (key === "design.tokens") {
    assertTokenOverrides(value);
    return value;
  }

  throw new Error("settings_value_invalid");
}

export async function listSettings(): Promise<SettingValueMap> {
  const keys = Object.keys(DEFAULT_SETTINGS) as SettingKey[];
  const rows = await db
    .select()
    .from(settings)
    .where(inArray(settings.key, keys));

  const merged = { ...DEFAULT_SETTINGS } as SettingValueMap;
  for (const row of rows) {
    const key = row.key as SettingKey;
    if (key in merged) {
      merged[key] = row.value as SettingValueMap[SettingKey];
    }
  }

  return merged;
}

export async function getSetting(key: string) {
  assertSettingKey(key);
  const [row] = await db.select().from(settings).where(eq(settings.key, key));
  if (!row) return DEFAULT_SETTINGS[key];
  return row.value as SettingValueMap[SettingKey];
}

export async function getSettingRecord(key: string) {
  assertSettingKey(key);
  const [row] = await db.select().from(settings).where(eq(settings.key, key));
  return row ?? null;
}

export async function setSetting(key: string, value: unknown) {
  assertSettingKey(key);
  const typedValue = validateSettingValue(key, value);
  const now = new Date();

  const [row] = await db
    .insert(settings)
    .values({ key, value: typedValue, updatedAt: now })
    .onConflictDoUpdate({
      target: settings.key,
      set: { value: typedValue, updatedAt: now },
    })
    .returning();

  return row;
}

export async function setSettings(values: Record<string, unknown>) {
  if (!values || typeof values !== "object" || Array.isArray(values)) {
    throw new Error("settings_payload_invalid");
  }

  const entries = Object.entries(values);
  const now = new Date();
  const validated = entries.map(([key, value]) => {
    assertSettingKey(key);
    const typedValue = validateSettingValue(key, value);
    return { key, value: typedValue };
  });

  await db.transaction(async (tx) => {
    for (const entry of validated) {
      await tx
        .insert(settings)
        .values({ key: entry.key, value: entry.value, updatedAt: now })
        .onConflictDoUpdate({
          target: settings.key,
          set: { value: entry.value, updatedAt: now },
        });
    }
  });

  return listSettings();
}

export async function deleteSetting(key: string) {
  assertSettingKey(key);
  const [row] = await db
    .delete(settings)
    .where(eq(settings.key, key))
    .returning();

  return row ?? null;
}
