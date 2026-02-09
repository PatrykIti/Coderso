import { afterAll, expect, test } from "bun:test";
import { randomUUID } from "node:crypto";
import { sql } from "drizzle-orm";
import { db } from "../../../core/db/client";
import {
  assertAssistantSettingsConsistency,
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

const cleanupKeys = [
  "site.name",
  "site.locale",
  "site.adminBaseUrl",
  "site.publicBaseUrl",
  "site.adminPath",
  "site.adminRedirectEnabled",
  "design.tokens",
  "assistant.enabled",
  "assistant.defaultMode",
  "assistant.docs.paths",
  "assistant.docs.reindexOnBoot",
  "assistant.llm.enabled",
  "assistant.llm.provider",
  "assistant.llm.model",
  "assistant.llm.maxInputTokens",
  "assistant.llm.maxOutputTokens",
  "assistant.llm.timeoutMs",
  "assistant.quotas.requestsPerMinute",
  "assistant.quotas.requestsPerDay",
];

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
  await setSetting("site.adminBaseUrl", "https://admin.example.com");
  await setSetting("site.publicBaseUrl", "https://www.example.com");
  await setSetting("site.adminPath", "/super-admin");
  await setSetting("site.adminRedirectEnabled", true);
  await setSetting("design.tokens", {
    colors: { primary: "#111111" },
  });

  const fetchedName = await getSetting("site.name");
  expect(fetchedName).toBe(siteName);

  const list = await listSettings();
  expect(list["site.name"]).toBe(siteName);
  expect(list["site.locale"]).toBe("pl-PL");
  expect(list["site.adminBaseUrl"]).toBe("https://admin.example.com/");
  expect(list["site.publicBaseUrl"]).toBe("https://www.example.com/");
  expect(list["site.adminPath"]).toBe("/super-admin");
  expect(list["site.adminRedirectEnabled"]).toBe(true);
  expect(list["design.tokens"]).toEqual({
    colors: { primary: "#111111" },
  });

  const bulk = await setSettings({
    "site.name": "Nextless Updated",
    "site.locale": "en-US",
    "site.adminBaseUrl": null,
    "site.publicBaseUrl": "https://public.example.com",
    "site.adminPath": "admin-panel",
    "site.adminRedirectEnabled": false,
  });
  expect(bulk["site.name"]).toBe("Nextless Updated");
  expect(bulk["site.locale"]).toBe("en-US");
  expect(bulk["site.adminBaseUrl"]).toBeNull();
  expect(bulk["site.publicBaseUrl"]).toBe("https://public.example.com/");
  expect(bulk["site.adminPath"]).toBe("/admin-panel");
  expect(bulk["site.adminRedirectEnabled"]).toBe(false);

  await deleteSetting("site.name");
  const defaultName = await getSetting("site.name");
  expect(defaultName).toBe("Nextless");
});

testIfDb("rejects unknown key", async () => {
  await expect(setSetting("unknown.key", "value")).rejects.toThrow(
    "settings_key_invalid"
  );
});

testIfDb("assistant settings enforce consistency in persistence layer", async () => {
  await setSettings({
    "assistant.enabled": true,
    "assistant.defaultMode": "llm-rag",
    "assistant.docs.paths": ["_docs"],
    "assistant.docs.reindexOnBoot": false,
    "assistant.llm.enabled": true,
    "assistant.llm.provider": "openrouter",
    "assistant.llm.model": "google/gemma-3n-e2b-it:free",
    "assistant.llm.maxInputTokens": 8192,
    "assistant.llm.maxOutputTokens": 2048,
    "assistant.llm.timeoutMs": 20000,
    "assistant.quotas.requestsPerMinute": 20,
    "assistant.quotas.requestsPerDay": 1000,
  });

  const list = await listSettings();
  expect(list["assistant.enabled"]).toBe(true);
  expect(list["assistant.defaultMode"]).toBe("llm-rag");
  expect(list["assistant.llm.provider"]).toBe("openrouter");

  await expect(setSetting("assistant.docs.paths", [])).rejects.toThrow(
    "settings_value_invalid"
  );
  await expect(setSetting("assistant.llm.enabled", false)).rejects.toThrow(
    "settings_value_invalid"
  );
  await expect(setSetting("assistant.llm.provider", "invalid")).rejects.toThrow(
    "settings_value_invalid"
  );
  await expect(setSetting("assistant.llm.maxInputTokens", 0)).rejects.toThrow(
    "settings_value_invalid"
  );
});

test("assertAssistantSettingsConsistency accepts docs-only mode without llm", () => {
  expect(() =>
    assertAssistantSettingsConsistency({
      "assistant.enabled": true,
      "assistant.defaultMode": "docs-only",
      "assistant.docs.paths": ["_docs"],
      "assistant.docs.reindexOnBoot": false,
      "assistant.llm.enabled": false,
      "assistant.llm.provider": "none",
      "assistant.llm.model": "google/gemma-3n-e2b-it:free",
      "assistant.llm.maxInputTokens": 8192,
      "assistant.llm.maxOutputTokens": 2048,
      "assistant.llm.timeoutMs": 20000,
      "assistant.quotas.requestsPerMinute": 20,
      "assistant.quotas.requestsPerDay": 1000,
    })
  ).not.toThrow();
});

test("assertAssistantSettingsConsistency rejects invalid llm-rag combinations", () => {
  expect(() =>
    assertAssistantSettingsConsistency({
      "assistant.enabled": true,
      "assistant.defaultMode": "llm-rag",
      "assistant.docs.paths": ["_docs"],
      "assistant.docs.reindexOnBoot": false,
      "assistant.llm.enabled": false,
      "assistant.llm.provider": "none",
      "assistant.llm.model": "google/gemma-3n-e2b-it:free",
      "assistant.llm.maxInputTokens": 8192,
      "assistant.llm.maxOutputTokens": 2048,
      "assistant.llm.timeoutMs": 20000,
      "assistant.quotas.requestsPerMinute": 20,
      "assistant.quotas.requestsPerDay": 1000,
    })
  ).toThrow("settings_value_invalid");
});
