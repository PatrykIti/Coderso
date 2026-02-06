import { afterAll, expect, test } from "bun:test";
import { randomUUID } from "node:crypto";
import { eq, sql } from "drizzle-orm";

import { db } from "../../../core/db/client";
import { users } from "../../../core/db/schema";
import {
  getUserSetting,
  listUserSettings,
  setUserSetting,
} from "../../../core/services/settings/userSettingsService";

const hasDb = Boolean(process.env.DATABASE_URL) && (await canConnect());
const testIfDb = hasDb ? test : test.skip;

async function canConnect() {
  try {
    await db.execute(sql`select 1`);
    return true;
  } catch {
    return false;
  }
}

const cleanupUserIds: string[] = [];

afterAll(async () => {
  if (!hasDb) return;
  for (const userId of cleanupUserIds) {
    await db.delete(users).where(eq(users.id, userId));
  }
});

testIfDb("set/get/list user settings", async () => {
  const userId = randomUUID();
  cleanupUserIds.push(userId);

  await db.insert(users).values({
    id: userId,
    email: `user-${userId}@example.com`,
    passwordHash: "hash",
  });

  const defaultValue = await getUserSetting(userId, "pages.openAfterCreate");
  expect(defaultValue).toBe(true);
  const defaultMedia = await getUserSetting(userId, "media.openAfterUpload");
  expect(defaultMedia).toBe(false);
  const defaultFavorites = await getUserSetting(userId, "widgets.favorites");
  expect(defaultFavorites).toEqual([]);
  const defaultHeroPresets = await getUserSetting(userId, "widgets.hero.presets");
  expect(defaultHeroPresets).toEqual([]);

  await setUserSetting(userId, "pages.openAfterCreate", false);
  await setUserSetting(userId, "media.openAfterUpload", true);
  await setUserSetting(userId, "widgets.favorites", ["hero", "footer"]);
  await setUserSetting(userId, "widgets.hero.presets", [
    {
      name: "Homepage Hero",
      variant: "centered",
      data: { headline: "Build faster" },
      updatedAt: "2026-02-06T10:00:00.000Z",
    },
  ]);
  const updated = await getUserSetting(userId, "pages.openAfterCreate");
  expect(updated).toBe(false);
  const updatedMedia = await getUserSetting(userId, "media.openAfterUpload");
  expect(updatedMedia).toBe(true);
  const updatedFavorites = await getUserSetting(userId, "widgets.favorites");
  expect(updatedFavorites).toEqual(["hero", "footer"]);
  const updatedHeroPresets = await getUserSetting(userId, "widgets.hero.presets");
  expect(updatedHeroPresets).toEqual([
    {
      name: "Homepage Hero",
      variant: "centered",
      data: { headline: "Build faster" },
      updatedAt: "2026-02-06T10:00:00.000Z",
    },
  ]);

  const list = await listUserSettings(userId);
  expect(list["pages.openAfterCreate"]).toBe(false);
  expect(list["media.openAfterUpload"]).toBe(true);
  expect(list["widgets.favorites"]).toEqual(["hero", "footer"]);
  expect(list["widgets.hero.presets"]).toEqual([
    {
      name: "Homepage Hero",
      variant: "centered",
      data: { headline: "Build faster" },
      updatedAt: "2026-02-06T10:00:00.000Z",
    },
  ]);
});

testIfDb("rejects unknown key", async () => {
  const userId = randomUUID();
  cleanupUserIds.push(userId);

  await db.insert(users).values({
    id: userId,
    email: `user-${userId}@example.com`,
    passwordHash: "hash",
  });

  await expect(
    setUserSetting(userId, "unknown.key", true)
  ).rejects.toThrow("user_settings_key_invalid");
});

testIfDb("rejects invalid widget favorites", async () => {
  const userId = randomUUID();
  cleanupUserIds.push(userId);

  await db.insert(users).values({
    id: userId,
    email: `user-${userId}@example.com`,
    passwordHash: "hash",
  });

  await expect(
    setUserSetting(userId, "widgets.favorites", "hero")
  ).rejects.toThrow("user_settings_value_invalid");

  await expect(
    setUserSetting(userId, "widgets.favorites", ["", "hero"])
  ).rejects.toThrow("user_settings_value_invalid");

  await expect(
    setUserSetting(
      userId,
      "widgets.favorites",
      Array.from({ length: 51 }, (_, index) => `widget-${index}`)
    )
  ).rejects.toThrow("user_settings_value_invalid");
});

testIfDb("rejects invalid hero presets", async () => {
  const userId = randomUUID();
  cleanupUserIds.push(userId);

  await db.insert(users).values({
    id: userId,
    email: `user-${userId}@example.com`,
    passwordHash: "hash",
  });

  await expect(
    setUserSetting(userId, "widgets.hero.presets", "invalid")
  ).rejects.toThrow("user_settings_value_invalid");

  await expect(
    setUserSetting(userId, "widgets.hero.presets", [
      {
        name: "  ",
        variant: "centered",
        data: { headline: "x" },
        updatedAt: "2026-02-06T10:00:00.000Z",
      },
    ])
  ).rejects.toThrow("user_settings_value_invalid");

  await expect(
    setUserSetting(userId, "widgets.hero.presets", [
      {
        name: "Preset",
        variant: "invalid",
        data: { headline: "x" },
        updatedAt: "2026-02-06T10:00:00.000Z",
      },
    ])
  ).rejects.toThrow("user_settings_value_invalid");

  await expect(
    setUserSetting(userId, "widgets.hero.presets", [
      {
        name: "Preset",
        variant: "centered",
        data: "invalid",
        updatedAt: "2026-02-06T10:00:00.000Z",
      },
    ])
  ).rejects.toThrow("user_settings_value_invalid");

  await expect(
    setUserSetting(
      userId,
      "widgets.hero.presets",
      Array.from({ length: 25 }, (_, index) => ({
        name: `Preset ${index}`,
        variant: "centered",
        data: { headline: `${index}` },
        updatedAt: "2026-02-06T10:00:00.000Z",
      }))
    )
  ).rejects.toThrow("user_settings_value_invalid");
});
