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
  "auth.sessionTtlDays",
  "auth.resetTtlMinutes",
  "posts.editor.mode",
  "setup.completed",
  "design.tokens",
  "assistant.enabled",
  "assistant.launcher.avatarEnabled",
  "assistant.launcher.avatarAsset",
  "assistant.defaultMode",
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
  await setSetting("site.baseUrl", "https://legacy.example.com");
  await setSetting("site.adminPath", "/super-admin");
  await setSetting("site.adminRedirectEnabled", true);
  await setSetting("auth.sessionTtlDays", 30);
  await setSetting("auth.resetTtlMinutes", 90);
  await setSetting("posts.editor.mode", "classic");
  await setSetting("setup.completed", true);
  await setSetting("design.tokens", {
    colors: { primary: "#111111" },
  });

  const fetchedName = await getSetting("site.name");
  expect(fetchedName).toBe(siteName);

  const list = await listSettings();
  expect(list["site.name"]).toBe(siteName);
  expect(list["site.locale"]).toBe("pl-PL");
  expect(list["site.adminBaseUrl"]).toBe("https://admin.example.com/");
  expect(list["site.publicBaseUrl"]).toBe("https://legacy.example.com/");
  expect(await getSetting("site.baseUrl")).toBe("https://legacy.example.com/");
  expect(list["site.adminPath"]).toBe("/super-admin");
  expect(list["site.adminRedirectEnabled"]).toBe(true);
  expect(list["auth.sessionTtlDays"]).toBe(30);
  expect(list["auth.resetTtlMinutes"]).toBe(90);
  expect(list["posts.editor.mode"]).toBe("classic");
  expect(list["setup.completed"]).toBe(true);
  expect(list["design.tokens"]).toEqual({
    colors: { primary: "#111111" },
  });

  const bulk = await setSettings({
    "site.name": "Nextless Updated",
    "site.locale": "en-US",
    "site.adminBaseUrl": null,
    "site.baseUrl": "https://public.example.com",
    "site.adminPath": "admin-panel",
    "site.adminRedirectEnabled": false,
    "auth.sessionTtlDays": 14,
    "auth.resetTtlMinutes": 45,
    "posts.editor.mode": "blocks",
    "setup.completed": false,
  });
  expect(bulk["site.name"]).toBe("Nextless Updated");
  expect(bulk["site.locale"]).toBe("en-US");
  expect(bulk["site.adminBaseUrl"]).toBeNull();
  expect(bulk["site.publicBaseUrl"]).toBe("https://public.example.com/");
  expect(bulk["site.adminPath"]).toBe("/admin-panel");
  expect(bulk["site.adminRedirectEnabled"]).toBe(false);
  expect(bulk["auth.sessionTtlDays"]).toBe(14);
  expect(bulk["auth.resetTtlMinutes"]).toBe(45);
  expect(bulk["posts.editor.mode"]).toBe("blocks");
  expect(bulk["setup.completed"]).toBe(false);

  await deleteSetting("site.name");
  const defaultName = await getSetting("site.name");
  expect(defaultName).toBe("Nextless");
});

testIfDb("enforces auth TTL bounds and setup boolean type", async () => {
  await expect(setSetting("auth.sessionTtlDays", 0)).rejects.toThrow(
    "settings_value_invalid"
  );
  await expect(setSetting("auth.sessionTtlDays", 366)).rejects.toThrow(
    "settings_value_invalid"
  );
  await expect(setSetting("auth.resetTtlMinutes", 4)).rejects.toThrow(
    "settings_value_invalid"
  );
  await expect(setSetting("auth.resetTtlMinutes", 1441)).rejects.toThrow(
    "settings_value_invalid"
  );
  await expect(setSetting("posts.editor.mode", "invalid")).rejects.toThrow(
    "settings_value_invalid"
  );
  await expect(setSetting("setup.completed", "yes")).rejects.toThrow(
    "settings_value_invalid"
  );

  await setSetting("auth.sessionTtlDays", 365);
  await setSetting("auth.resetTtlMinutes", 1440);
  await setSetting("posts.editor.mode", "classic");
  await setSetting("setup.completed", true);

  expect(await getSetting("auth.sessionTtlDays")).toBe(365);
  expect(await getSetting("auth.resetTtlMinutes")).toBe(1440);
  expect(await getSetting("posts.editor.mode")).toBe("classic");
  expect(await getSetting("setup.completed")).toBe(true);
});

testIfDb("rejects unknown key", async () => {
  await expect(setSetting("unknown.key", "value")).rejects.toThrow(
    "settings_key_invalid"
  );
});

testIfDb("rejects duplicate keys after alias normalization in bulk payload", async () => {
  await expect(
    setSettings({
      "site.baseUrl": "https://alias.example.com",
      "site.publicBaseUrl": "https://canonical.example.com",
    })
  ).rejects.toThrow("settings_payload_invalid");
});

testIfDb("assistant settings enforce consistency in persistence layer", async () => {
  await setSettings({
    "assistant.enabled": true,
    "assistant.launcher.avatarEnabled": true,
    "assistant.launcher.avatarAsset": "https://cdn.example.com/assistant-avatar.png",
    "assistant.defaultMode": "llm-guide",
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
  expect(list["assistant.launcher.avatarEnabled"]).toBe(true);
  expect(list["assistant.launcher.avatarAsset"]).toBe(
    "https://cdn.example.com/assistant-avatar.png"
  );
  expect(list["assistant.defaultMode"]).toBe("llm-guide");
  expect(list["assistant.llm.provider"]).toBe("openrouter");
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
      "assistant.launcher.avatarEnabled": false,
      "assistant.launcher.avatarAsset": null,
      "assistant.defaultMode": "docs-only",
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

test("assertAssistantSettingsConsistency rejects invalid llm-guide combinations", () => {
  expect(() =>
    assertAssistantSettingsConsistency({
      "assistant.enabled": true,
      "assistant.launcher.avatarEnabled": false,
      "assistant.launcher.avatarAsset": null,
      "assistant.defaultMode": "llm-guide",
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

test("legacy assistant docs settings keys are no longer part of the active settings surface", async () => {
  await expect(setSetting("assistant.docs.backend", "db")).rejects.toThrow(
    "settings_key_invalid"
  );
  await expect(setSetting("assistant.docs.sourceRoot", "docs")).rejects.toThrow(
    "settings_key_invalid"
  );
  await expect(setSetting("assistant.docs.paths", ["docs"])).rejects.toThrow(
    "settings_key_invalid"
  );
});
