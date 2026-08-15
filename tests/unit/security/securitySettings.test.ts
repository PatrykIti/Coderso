import { afterAll, beforeEach, expect, test } from "bun:test";
import { sql } from "drizzle-orm";
import { eq } from "drizzle-orm";

import { db } from "../../../core/db/client";
import { settings } from "../../../core/db/schema";
import { isEncryptedSecret } from "../../../core/services/security/secretStore";
import {
  getSecuritySettings,
  getSecuritySettingsPublic,
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
const BOT_ENV_KEYS = ["GOOGLE_SITE_KEY", "GOOGLE_PRIVATE_KEY"] as const;

const snapshotBotEnv = () =>
  Object.fromEntries(BOT_ENV_KEYS.map((key) => [key, process.env[key]])) as Record<
    (typeof BOT_ENV_KEYS)[number],
    string | undefined
  >;

const restoreBotEnv = (snapshot: ReturnType<typeof snapshotBotEnv>) => {
  for (const key of BOT_ENV_KEYS) {
    const value = snapshot[key];
    if (value === undefined) {
      delete process.env[key];
    } else {
      process.env[key] = value;
    }
  }
};

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
    recipients: [],
    webhookUrl: null,
    webhookSecret: null,
    deliveryError: null,
  });
  expect(current.botProtection).toEqual({
    enabled: false,
    provider: "recaptcha_v3",
    siteKey: null,
    secretKey: null,
    thresholds: {
      login: 0.5,
      reset: 0.6,
      publicWrite: 0.5,
    },
    enforceOnLocalhost: true,
  });
});

testIfDb("getSecuritySettings ignores recaptcha environment keys", async () => {
  const envSnapshot = snapshotBotEnv();
  try {
    process.env.GOOGLE_SITE_KEY = "env-site-key";
    process.env.GOOGLE_PRIVATE_KEY = "env-private-key";
    resetSecuritySettingsCache();

    const current = await getSecuritySettings();
    expect(current.botProtection).toEqual(SECURITY_SETTINGS_DEFAULTS.botProtection);
  } finally {
    restoreBotEnv(envSnapshot);
    resetSecuritySettingsCache();
  }
});

testIfDb("setSecuritySettings merges partial updates", async () => {
  await setSecuritySettings({
    csrf: { enabled: false },
    cors: { allowedOrigins: ["https://admin.example.com"] },
    rateLimit: { buckets: { admin_read: { maxRequests: 50 } } },
    plugins: { safeMode: true },
    session: { ttlDays: 5, maxPerUser: 2, singleSession: true },
    loginAlerts: { enabled: false, notifyOnNewDevice: false },
  });

  const updated = await getSecuritySettings();
  expect(updated.csrf.enabled).toBe(false);
  expect(updated.cors.allowedOrigins).toEqual(["https://admin.example.com"]);
  expect(updated.rateLimit.buckets.admin_read.maxRequests).toBe(50);
  expect(updated.rateLimit.buckets.admin_read.windowSeconds).toBe(
    SECURITY_SETTINGS_DEFAULTS.rateLimit.buckets.admin_read.windowSeconds
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
  await expect(setSecuritySettings({ csrf: { tokenTtlMinutes: -1 } })).rejects.toThrow(
    "security_settings_invalid"
  );
  await expect(setSecuritySettings({ session: { maxPerUser: 0 } })).rejects.toThrow(
    "security_settings_invalid"
  );
});

testIfDb("bot protection requires keys when enabled", async () => {
  await expect(setSecuritySettings({ botProtection: { enabled: true } })).rejects.toThrow(
    "bot_protection_site_key_missing"
  );
});

testIfDb("cors wildcard disables credentials", async () => {
  await setSecuritySettings({
    cors: { allowedOrigins: ["*"], allowCredentials: true },
  });
  const updated = await getSecuritySettings();
  expect(updated.cors.allowedOrigins).toEqual(["*"]);
  expect(updated.cors.allowCredentials).toBe(false);
});

testIfDb("loginAlerts recipients normalize, dedupe, clamp, lowercase", async () => {
  const many = Array.from({ length: 14 }, (_, index) => `sec${index}@example.com`);
  await setSecuritySettings({
    loginAlerts: {
      recipients: [
        "Admin@Example.COM",
        " admin@example.com ",
        "not-an-email",
        " ops@example.com ",
        ...many,
      ],
    },
  });

  const updated = await getSecuritySettings();
  expect(updated.loginAlerts.recipients).toHaveLength(10);
  expect(updated.loginAlerts.recipients[0]).toBe("admin@example.com");
  expect(updated.loginAlerts.recipients[1]).toBe("ops@example.com");
  expect(updated.loginAlerts.recipients).toEqual(
    expect.arrayContaining([
      "admin@example.com",
      "ops@example.com",
      ...Array.from({ length: 8 }, (_, index) => `sec${index}@example.com`),
    ])
  );
  expect(updated.loginAlerts.recipients.some((entry) => entry.includes("not-an-email"))).toBe(
    false
  );
});

testIfDb("loginAlerts webhookUrl accepts https and localhost http with secret", async () => {
  await setSecuritySettings({
    loginAlerts: {
      webhookUrl: "https://example.com/login-hook",
      webhookSecret: "s3cr3t-value",
    },
  });
  const updated = await getSecuritySettings();
  expect(updated.loginAlerts.webhookUrl).toBe("https://example.com/login-hook");

  await setSecuritySettings({
    loginAlerts: {
      webhookUrl: "http://localhost:3000/hook",
      webhookSecret: "s3cr3t-value",
    },
  });
  const local = await getSecuritySettings();
  expect(local.loginAlerts.webhookUrl).toBe("http://localhost:3000/hook");
});

testIfDb("loginAlerts webhookUrl rejects non-https non-localhost and private hosts", async () => {
  const rejected = [
    "http://example.com/hook",
    "ftp://example.com/hook",
    "https://10.0.0.5/hook",
    "https://192.168.1.10/hook",
    "https://169.254.169.254/hook",
    "https://[::1]/hook",
    "https://user:pass@example.com/hook",
  ];
  for (const webhookUrl of rejected) {
    await expect(
      setSecuritySettings({ loginAlerts: { webhookUrl, webhookSecret: "s3cr3t-value" } })
    ).rejects.toThrow("security_settings_invalid");
  }
});

testIfDb("loginAlerts webhookUrl without secret fails closed", async () => {
  await expect(
    setSecuritySettings({ loginAlerts: { webhookUrl: "https://example.com/hook" } })
  ).rejects.toThrow("security_settings_invalid");
});

testIfDb(
  "loginAlerts webhookSecret stored encrypted; public exposes only {configured}",
  async () => {
    await setSecuritySettings({
      loginAlerts: {
        webhookUrl: "https://example.com/login-hook",
        webhookSecret: "s3cr3t-value",
      },
    });

    // The server-side in-memory read stays raw for delivery (mirroring the
    // botProtection secret); encryption happens at rest in `toStoredSettings`.
    const cached = await getSecuritySettings();
    expect(cached.loginAlerts.webhookUrl).toBe("https://example.com/login-hook");
    expect(cached.loginAlerts.webhookSecret).toBe("s3cr3t-value");

    resetSecuritySettingsCache();
    const reloaded = await getSecuritySettings();
    expect(isEncryptedSecret(reloaded.loginAlerts.webhookSecret)).toBe(true);
    expect(JSON.stringify(reloaded)).not.toContain("s3cr3t-value");

    const pub = await getSecuritySettingsPublic();
    expect(pub.loginAlerts.webhookSecret).toEqual({ configured: true });
    expect(JSON.stringify(pub)).not.toContain("s3cr3t-value");
  }
);

testIfDb("loginAlerts rejects unknown keys (security_settings_invalid)", async () => {
  await expect(setSecuritySettings({ loginAlerts: { unknownKey: true } as never })).rejects.toThrow(
    "security_settings_invalid"
  );
  await expect(
    setSecuritySettings({ loginAlerts: { channels: ["email"] } as never })
  ).rejects.toThrow("security_settings_invalid");
});

testIfDb("deliveryError round-trips and is clamped", async () => {
  await setSecuritySettings({ loginAlerts: { deliveryError: "x".repeat(300) } });
  const updated = await getSecuritySettings();
  expect(updated.loginAlerts.deliveryError).toBe("x".repeat(240));

  await setSecuritySettings({ loginAlerts: { deliveryError: null } });
  const cleared = await getSecuritySettings();
  expect(cleared.loginAlerts.deliveryError).toBeNull();
});
