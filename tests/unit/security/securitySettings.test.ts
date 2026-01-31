import { afterAll, beforeEach, expect, test } from "bun:test";
import { sql } from "drizzle-orm";
import { eq } from "drizzle-orm";

import { db } from "../../../core/db/client";
import { settings } from "../../../core/db/schema";
import {
  getSecuritySettings,
  resetSecuritySettingsCache,
  SECURITY_SETTINGS_DEFAULTS,
  setSecuritySettings,
} from "../../../core/services/settings/securitySettings";

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

const SETTINGS_KEY = "security.settings";

const cleanup = async () => {
  if (!hasDb) return;
  await db.delete(settings).where(eq(settings.key, SETTINGS_KEY));
  resetSecuritySettingsCache();
};

beforeEach(async () => {
  await cleanup();
});

afterAll(async () => {
  await cleanup();
});

testIfDb("getSecuritySettings returns defaults when missing", async () => {
  const current = await getSecuritySettings();
  expect(current).toEqual(SECURITY_SETTINGS_DEFAULTS);
  expect(current.session).toEqual({
    ttlDays: 7,
    maxPerUser: 3,
    singleSession: false,
  });
  expect(current.loginAlerts).toEqual({
    enabled: true,
    notifyOnNewDevice: true,
    notifyOnNewLocation: true,
  });
});

testIfDb("setSecuritySettings merges partial updates", async () => {
  await setSecuritySettings({
    csrf: { enabled: false },
    cors: { allowedOrigins: ["https://admin.example.com"] },
    rateLimit: { admin: { maxRequests: 50 } },
    plugins: { safeMode: true },
    session: { ttlDays: 5, maxPerUser: 2, singleSession: true },
    loginAlerts: { enabled: false, notifyOnNewDevice: false },
  });

  const updated = await getSecuritySettings();
  expect(updated.csrf.enabled).toBe(false);
  expect(updated.cors.allowedOrigins).toEqual(["https://admin.example.com"]);
  expect(updated.rateLimit.admin.maxRequests).toBe(50);
  expect(updated.rateLimit.admin.windowSeconds).toBe(
    SECURITY_SETTINGS_DEFAULTS.rateLimit.admin.windowSeconds
  );
  expect(updated.plugins.safeMode).toBe(true);
  expect(updated.session.ttlDays).toBe(5);
  expect(updated.session.maxPerUser).toBe(2);
  expect(updated.session.singleSession).toBe(true);
  expect(updated.loginAlerts.enabled).toBe(false);
  expect(updated.loginAlerts.notifyOnNewDevice).toBe(false);
  expect(updated.loginAlerts.notifyOnNewLocation).toBe(true);
});

testIfDb("setSecuritySettings validates input", async () => {
  await expect(
    setSecuritySettings({ csrf: { tokenTtlMinutes: -1 } })
  ).rejects.toThrow("security_settings_invalid");
  await expect(
    setSecuritySettings({ session: { maxPerUser: 0 } })
  ).rejects.toThrow("security_settings_invalid");
});

testIfDb("cors wildcard disables credentials", async () => {
  await setSecuritySettings({
    cors: { allowedOrigins: ["*"], allowCredentials: true },
  });
  const updated = await getSecuritySettings();
  expect(updated.cors.allowedOrigins).toEqual(["*"]);
  expect(updated.cors.allowCredentials).toBe(false);
});
