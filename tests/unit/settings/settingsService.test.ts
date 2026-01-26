import { afterAll, expect, test } from "bun:test";
import { randomUUID } from "node:crypto";
import { sql } from "drizzle-orm";
import { db } from "../../../core/db/client";
import {
  deleteSetting,
  getSetting,
  listSettings,
  setSetting,
  setSettings,
} from "../../../core/services/settings/settingsService";

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

const cleanupKeys = ["site.name", "site.locale", "design.tokens"];

afterAll(async () => {
  if (!hasDb) return;
  for (const key of cleanupKeys) {
    await deleteSetting(key);
  }
});

testIfDb("set/get/list/delete settings", async () => {
  const siteName = `Nextless-${randomUUID()}`;
  await setSetting("site.name", siteName);
  await setSetting("site.locale", "pl-PL");
  await setSetting("design.tokens", {
    colors: { primary: "#111111" },
  });

  const fetchedName = await getSetting("site.name");
  expect(fetchedName).toBe(siteName);

  const list = await listSettings();
  expect(list["site.name"]).toBe(siteName);
  expect(list["site.locale"]).toBe("pl-PL");
  expect(list["design.tokens"]).toEqual({
    colors: { primary: "#111111" },
  });

  const bulk = await setSettings({
    "site.name": "Nextless Updated",
    "site.locale": "en-US",
  });
  expect(bulk["site.name"]).toBe("Nextless Updated");
  expect(bulk["site.locale"]).toBe("en-US");

  await deleteSetting("site.name");
  const defaultName = await getSetting("site.name");
  expect(defaultName).toBe("Nextless");
});

testIfDb("rejects unknown key", async () => {
  await expect(setSetting("unknown.key", "value")).rejects.toThrow(
    "settings_key_invalid"
  );
});
