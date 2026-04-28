import { afterAll, expect, test } from "bun:test";
import { randomUUID } from "node:crypto";
import { eq, inArray, sql } from "drizzle-orm";

import { db } from "../../../core/db/client";
import { themeProfiles, themeRoutes } from "../../../core/db/schema";
import {
  activateThemeProfile,
  createThemeProfile,
  getActiveThemeProfile,
  getThemeProfile,
  listThemeProfiles,
  setThemeRoutes,
} from "../../../core/services/themes/themeProfileService";

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

const createdProfileIds: string[] = [];

const cleanupProfiles = async () => {
  if (!createdProfileIds.length) return;
  await db
    .delete(themeRoutes)
    .where(inArray(themeRoutes.profileId, createdProfileIds));
  await db.delete(themeProfiles).where(inArray(themeProfiles.id, createdProfileIds));
  createdProfileIds.length = 0;
};

afterAll(async () => {
  if (!hasDb) return;
  await cleanupProfiles();
});

testIfDb("activateThemeProfile keeps a single active profile", async () => {
  const first = await createThemeProfile({
    name: `Profile-${randomUUID()}`,
    themeName: "default",
    isActive: true,
  });
  const second = await createThemeProfile({
    name: `Profile-${randomUUID()}`,
    themeName: "default",
    isActive: true,
  });

  createdProfileIds.push(first.id, second.id);

  await activateThemeProfile(second.id);

  const active = await getActiveThemeProfile();
  expect(active?.id).toBe(second.id);

  const profiles = await listThemeProfiles();
  const activeCount = profiles.filter((profile) => profile.isActive).length;
  expect(activeCount).toBe(1);
});

testIfDb("setThemeRoutes normalizes and rejects duplicates", async () => {
  const profile = await createThemeProfile({
    name: `Profile-${randomUUID()}`,
    themeName: "default",
  });
  createdProfileIds.push(profile.id);

  await setThemeRoutes(profile.id, [
    { path: "/about/", pageId: null },
    { path: "contact", pageId: null },
  ]);

  const updated = await getThemeProfile(profile.id);
  expect(updated?.routes.map((route) => route.path)).toEqual(["/about", "/contact"]);

  await expect(
    setThemeRoutes(profile.id, [
      { path: "/about", pageId: null },
      { path: "about", pageId: null },
    ])
  ).rejects.toThrow("theme_routes_duplicate");

  await cleanupProfiles();
});
