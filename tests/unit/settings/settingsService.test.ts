import { afterAll, beforeAll, expect, test } from "bun:test";
import { randomUUID } from "node:crypto";
import { eq, inArray, sql } from "drizzle-orm";
import { db } from "../../../core/db/client";
import { settings } from "../../../core/db/schema";
import {
  buildSiteCacheKey,
  clearSiteCache,
  getSiteCacheEntry,
  setSiteCacheEntry,
} from "../../../core/site/cache/siteCache";
import {
  assertAssistantSettingsConsistency,
  deleteSetting,
  getSetting,
  listSettings,
  setSetting,
  setSettings,
} from "../../../core/services/settings/settingsService";
import { MAX_SITE_CACHE_TTL_SECONDS } from "../../../core/services/analytics/beaconTtl";
import {
  MAX_SITE_LOCALE_LENGTH,
  normalizePublicSiteLocale,
  normalizeStoredSiteLocaleForWrite,
  resolvePrimarySiteLanguage,
  resolvePublicDocumentLanguage,
} from "../../../core/services/settings/siteLocale";

const hasDb = Boolean(process.env.DATABASE_URL) && (await canConnect());
const testIfDb = hasDb ? test : test.skip;
const dbTestTimeoutMs = 360_000;

async function canConnect() {
  try {
    await db.execute(sql`select 1`);
    return true;
  } catch {
    return false;
  }
}

const legacyAssistantDocsKeys = [
  "assistant.docs.backend",
  "assistant.docs.sourceRoot",
  "assistant.docs.paths",
] as const;

const mutatedSettingKeys = [
  "site.name",
  "site.locale",
  "site.timezone",
  "site.adminBaseUrl",
  "site.publicBaseUrl",
  "site.adminPath",
  "site.adminRedirectEnabled",
  "site.contentRoutes",
  "site.navigationMenuId",
  "site.footerTemplateId",
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
  ...legacyAssistantDocsKeys,
  "assistant.llm.enabled",
  "assistant.llm.provider",
  "assistant.llm.model",
  "assistant.llm.maxInputTokens",
  "assistant.llm.maxOutputTokens",
  "assistant.llm.timeoutMs",
  "assistant.quotas.requestsPerMinute",
  "assistant.quotas.requestsPerDay",
  "analytics.trackingEnabled",
  "site.cacheTtlSeconds",
];

type SettingRow = typeof settings.$inferSelect;

let settingRowsBeforeSuite: SettingRow[] = [];
let settingRowsSnapshotCaptured = false;

beforeAll(async () => {
  if (!hasDb) return;

  const rows = await db.select().from(settings).where(inArray(settings.key, mutatedSettingKeys));
  settingRowsBeforeSuite = rows.map((row) => ({
    ...row,
    value: structuredClone(row.value),
    updatedAt: new Date(row.updatedAt.getTime()),
  }));
  settingRowsSnapshotCaptured = true;
}, dbTestTimeoutMs);

afterAll(async () => {
  if (!hasDb || !settingRowsSnapshotCaptured) return;

  try {
    await db.transaction(async (tx) => {
      await tx.delete(settings).where(inArray(settings.key, mutatedSettingKeys));
      if (settingRowsBeforeSuite.length > 0) {
        await tx.insert(settings).values(settingRowsBeforeSuite);
      }
    });
  } catch {
    throw new Error("settings_service_test_restore_failed");
  }
  clearSiteCache();
}, dbTestTimeoutMs);

testIfDb("set/get/list/delete settings", async () => {
  const siteName = `Coderso-${randomUUID()}`;
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
    "site.name": "Coderso Updated",
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
  expect(bulk["site.name"]).toBe("Coderso Updated");
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
  expect(defaultName).toBe("Coderso");
});

testIfDb("enforces auth TTL bounds and setup boolean type", async () => {
  await expect(setSetting("auth.sessionTtlDays", 0)).rejects.toThrow("settings_value_invalid");
  await expect(setSetting("auth.sessionTtlDays", 366)).rejects.toThrow("settings_value_invalid");
  await expect(setSetting("auth.resetTtlMinutes", 4)).rejects.toThrow("settings_value_invalid");
  await expect(setSetting("auth.resetTtlMinutes", 1441)).rejects.toThrow("settings_value_invalid");
  await expect(setSetting("posts.editor.mode", "invalid")).rejects.toThrow(
    "settings_value_invalid"
  );
  await expect(setSetting("setup.completed", "yes")).rejects.toThrow("settings_value_invalid");

  await setSetting("auth.sessionTtlDays", 365);
  await setSetting("auth.resetTtlMinutes", 1440);
  await setSetting("posts.editor.mode", "classic");
  await setSetting("setup.completed", true);

  expect(await getSetting("auth.sessionTtlDays")).toBe(365);
  expect(await getSetting("auth.resetTtlMinutes")).toBe(1440);
  expect(await getSetting("posts.editor.mode")).toBe("classic");
  expect(await getSetting("setup.completed")).toBe(true);
});

testIfDb("clamps site.cacheTtlSeconds to the beacon-nonce-safe upper bound", async () => {
  // TASK-483 post-audit MEDIUM: the site HTML cache stores the per-render beacon
  // nonce, so the cache TTL must never exceed the nonce lifetime. Values above
  // MAX_SITE_CACHE_TTL_SECONDS (and negatives) are rejected.
  await expect(setSetting("site.cacheTtlSeconds", -1)).rejects.toThrow("settings_value_invalid");
  await expect(setSetting("site.cacheTtlSeconds", MAX_SITE_CACHE_TTL_SECONDS + 1)).rejects.toThrow(
    "settings_value_invalid"
  );

  await setSetting("site.cacheTtlSeconds", MAX_SITE_CACHE_TTL_SECONDS);
  expect(await getSetting("site.cacheTtlSeconds")).toBe(MAX_SITE_CACHE_TTL_SECONDS);
  await setSetting("site.cacheTtlSeconds", 30);
  expect(await getSetting("site.cacheTtlSeconds")).toBe(30);
});

testIfDb("site.timezone accepts IANA zones, rejects invalid values, defaults to UTC", async () => {
  // The suite restores the exact pre-suite row, so this test can still exercise
  // delete-to-default behavior without destroying shared database state.
  await setSetting("site.timezone", "Europe/Warsaw");
  expect(await getSetting("site.timezone")).toBe("Europe/Warsaw");
  expect((await listSettings())["site.timezone"]).toBe("Europe/Warsaw");

  // Whitespace is trimmed on write.
  await setSetting("site.timezone", "  America/New_York  ");
  expect(await getSetting("site.timezone")).toBe("America/New_York");

  await expect(setSetting("site.timezone", "Mars/Phobos")).rejects.toThrow(
    "settings_value_invalid"
  );
  await expect(setSetting("site.timezone", 42)).rejects.toThrow("settings_value_invalid");
  await expect(setSetting("site.timezone", "")).rejects.toThrow("settings_value_invalid");
  await expect(setSetting("site.timezone", null)).rejects.toThrow("settings_value_invalid");

  // Default reported after delete (order-independent across parallel streams).
  await deleteSetting("site.timezone");
  expect(await getSetting("site.timezone")).toBe("UTC");
  expect((await listSettings())["site.timezone"]).toBe("UTC");
});

testIfDb("rejects unknown key", async () => {
  await expect(setSetting("unknown.key", "value")).rejects.toThrow("settings_key_invalid");
});

testIfDb("site shell reference keys accept nullable id strings", async () => {
  // Self-scoped precondition: this test owns its state, so it is deterministic
  // regardless of prior pollution (e.g. the Playwright smoke assigning a site nav menu).
  await setSetting("site.navigationMenuId", null);
  await setSetting("site.footerTemplateId", null);

  const list = await listSettings();
  expect(list["site.navigationMenuId"]).toBeNull();
  expect(list["site.footerTemplateId"]).toBeNull();

  const menuId = randomUUID();
  const templateId = randomUUID();
  await setSetting("site.navigationMenuId", ` ${menuId} `);
  await setSetting("site.footerTemplateId", templateId);
  expect(await getSetting("site.navigationMenuId")).toBe(menuId);
  expect(await getSetting("site.footerTemplateId")).toBe(templateId);
  expect((await listSettings())["site.navigationMenuId"]).toBe(menuId);
  expect((await listSettings())["site.footerTemplateId"]).toBe(templateId);

  await setSetting("site.navigationMenuId", null);
  await setSetting("site.footerTemplateId", "   ");
  expect(await getSetting("site.navigationMenuId")).toBeNull();
  expect(await getSetting("site.footerTemplateId")).toBeNull();
});

testIfDb("site shell reference keys reject non-string values", async () => {
  await expect(setSetting("site.navigationMenuId", 123)).rejects.toThrow("settings_value_invalid");
  await expect(setSetting("site.footerTemplateId", { id: "x" })).rejects.toThrow(
    "settings_value_invalid"
  );
  await expect(setSetting("site.footerTemplateId", false)).rejects.toThrow(
    "settings_value_invalid"
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

testIfDb("normalizes site.contentRoutes when reading stored settings", async () => {
  const upsertRawContentRoutes = async (value: unknown) => {
    await db
      .insert(settings)
      .values({ key: "site.contentRoutes", value, updatedAt: new Date() })
      .onConflictDoUpdate({
        target: settings.key,
        set: { value, updatedAt: new Date() },
      });
  };

  await upsertRawContentRoutes([
    {
      type: "products",
      listPath: "products",
      detailPath: "products/:slug",
      enabled: true,
      detailPageId: null,
    },
  ]);

  const expected = [
    {
      type: "products",
      listPath: "/products",
      detailPath: "/products/:slug",
      enabled: true,
      detailPageId: null,
    },
  ];

  expect(await getSetting("site.contentRoutes")).toEqual(expected);
  expect((await listSettings())["site.contentRoutes"]).toEqual(expected);

  await upsertRawContentRoutes([{ type: "", listPath: "", detailPath: "", enabled: true }]);

  expect(await getSetting("site.contentRoutes")).toEqual([]);
  expect((await listSettings())["site.contentRoutes"]).toEqual([]);
  await db.delete(settings).where(eq(settings.key, "site.contentRoutes"));
});

testIfDb(
  "assistant settings enforce consistency in persistence layer",
  async () => {
    await setSettings({
      "assistant.enabled": true,
      "assistant.launcher.avatarEnabled": true,
      "assistant.launcher.avatarAsset": "https://cdn.example.com/assistant-avatar.png",
      "assistant.defaultMode": "llm-guide",
      "assistant.docs.reindexOnBoot": false,
      "assistant.llm.enabled": true,
      "assistant.llm.provider": "openai",
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
    expect(list["assistant.llm.provider"]).toBe("openai");
    await expect(setSetting("assistant.llm.enabled", false)).rejects.toThrow(
      "settings_value_invalid"
    );
    await expect(setSetting("assistant.llm.provider", "invalid")).rejects.toThrow(
      "settings_value_invalid"
    );
    await expect(setSetting("assistant.llm.maxInputTokens", 0)).rejects.toThrow(
      "settings_value_invalid"
    );
  },
  dbTestTimeoutMs
);

test("site locale keeps stored strings raw and canonicalizes only public consumers", () => {
  const raw = "  zH-hANT-t-FOO  ";
  expect(normalizeStoredSiteLocaleForWrite(raw)).toBe(raw);
  expect(normalizePublicSiteLocale(raw)).toBe("zh-Hant-t-foo");
  expect(normalizePublicSiteLocale("pl")).toBe("pl");
  expect(normalizePublicSiteLocale("PL-pl")).toBe("pl-PL");
  expect(normalizePublicSiteLocale("ES-419")).toBe("es-419");
  expect(normalizePublicSiteLocale("ZH-hANT")).toBe("zh-Hant");
  expect(resolvePublicDocumentLanguage("../pl")).toBe("en");
  expect(resolvePrimarySiteLanguage("pl-PL")).toBe("pl");
  expect(resolvePrimarySiteLanguage("es-419")).toBe("es");
  expect(resolvePrimarySiteLanguage("zh-Hant")).toBe("zh");
});

test("site locale enforces exact stored 254/255/256 and invalid-input bounds", () => {
  for (const length of [254, MAX_SITE_LOCALE_LENGTH]) {
    const value = `pl-${"x".repeat(length - 3)}`;
    expect(normalizeStoredSiteLocaleForWrite(value)).toBe(value);
  }
  for (const value of ["", "   ", null, 123, {}, [], "x".repeat(256)]) {
    expect(() => normalizeStoredSiteLocaleForWrite(value)).toThrow("settings_value_invalid");
  }
  expect(normalizePublicSiteLocale("x".repeat(256))).toBeNull();
});

testIfDb(
  "site.locale preserves accepted writes without canonicalizing",
  async () => {
    await setSetting("site.locale", "pl");
    expect(await getSetting("site.locale")).toBe("pl");
    await setSetting("site.locale", " pl-pl ");
    expect(await getSetting("site.locale")).toBe(" pl-pl ");
    expect((await listSettings())["site.locale"]).toBe(" pl-pl ");
    await expect(setSettings({ "site.locale": "   " })).rejects.toThrow("settings_value_invalid");
  },
  dbTestTimeoutMs
);

testIfDb(
  "site.locale reads preserve a non-public legacy stored string",
  async () => {
    await db
      .insert(settings)
      .values({ key: "site.locale", value: 'pl" unsafe', updatedAt: new Date() })
      .onConflictDoUpdate({
        target: settings.key,
        set: { value: 'pl" unsafe', updatedAt: new Date() },
      });
    expect(await getSetting("site.locale")).toBe('pl" unsafe');
    expect((await listSettings())["site.locale"]).toBe('pl" unsafe');
  },
  dbTestTimeoutMs
);

testIfDb(
  "site.locale writes invalidate cached public HTML",
  async () => {
    const key = buildSiteCacheKey("default", "/task-547-locale");
    setSiteCacheEntry(key, '<html lang="en">', 30);
    expect(getSiteCacheEntry(key)).not.toBeNull();
    await setSetting("site.locale", "pl");
    expect(getSiteCacheEntry(key)).toBeNull();
  },
  dbTestTimeoutMs
);

testIfDb(
  "settings saga batches validate first and commit atomically",
  async () => {
    await setSettings({ "site.name": "Before", "site.locale": "en" });
    await expect(setSettings({ "site.name": "After", "site.locale": "" })).rejects.toThrow(
      "settings_value_invalid"
    );
    expect(await getSetting("site.name")).toBe("Before");
    expect(await getSetting("site.locale")).toBe("en");
    await setSettings({ "site.name": "After", "site.locale": "pl-PL" });
    expect(await getSetting("site.name")).toBe("After");
    expect(await getSetting("site.locale")).toBe("pl-PL");
  },
  dbTestTimeoutMs
);

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
  await expect(setSetting("assistant.docs.backend", "db")).rejects.toThrow("settings_key_invalid");
  await expect(setSetting("assistant.docs.sourceRoot", "docs")).rejects.toThrow(
    "settings_key_invalid"
  );
  await expect(setSetting("assistant.docs.paths", ["docs"])).rejects.toThrow(
    "settings_key_invalid"
  );
});

testIfDb(
  "analytics.trackingEnabled round-trips and defaults to true (TASK-483-03-L02)",
  async () => {
    // Default (no row) is true — real analytics collect out of the box.
    await deleteSetting("analytics.trackingEnabled");
    expect(await getSetting("analytics.trackingEnabled")).toBe(true);

    // Persist false and read it back.
    await setSetting("analytics.trackingEnabled", false);
    expect(await getSetting("analytics.trackingEnabled")).toBe(false);

    // Flip back to true and confirm.
    await setSetting("analytics.trackingEnabled", true);
    expect(await getSetting("analytics.trackingEnabled")).toBe(true);

    // Non-boolean values are rejected by the strict validator.
    await expect(setSetting("analytics.trackingEnabled", "yes")).rejects.toThrow(
      "settings_value_invalid"
    );

    // Restore the default state for this test; suite teardown restores the
    // exact pre-suite row for the shared remote database.
    await deleteSetting("analytics.trackingEnabled");
    expect(await getSetting("analytics.trackingEnabled")).toBe(true);
  },
  dbTestTimeoutMs
);
