import { afterAll, beforeAll, expect, test } from "bun:test";
import { eq, inArray, sql } from "drizzle-orm";

import { db } from "../../../core/db/client";
import { emailDeliveryLogs, integrations, settings } from "../../../core/db/schema";
import {
  getEmailSettings,
  getEmailSettingsInternal,
  listDeliveryLogs,
  sendSystemEmail,
  sendTestEmail,
  updateEmailSettings,
  resetEmailSettingsCache,
} from "../../../core/services/email/emailSettingsService";
import { updateIntegration } from "../../../core/services/integrations/integrationsService";
import { hasValidSecretMasterKey } from "../../../core/services/security/secretStore";

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

const EMAIL_KEYS = [
  "email.provider",
  "email.smtp.host",
  "email.smtp.port",
  "email.smtp.secure",
  "email.smtp.user",
  "email.smtp.password",
  "email.from.name",
  "email.from.email",
];

const previousTransport = process.env.EMAIL_TRANSPORT;
const previousNodeEnv = process.env.NODE_ENV;
const previousFetch = globalThis.fetch;
let originalEmailSettings: Array<typeof settings.$inferSelect> = [];
let originalResendIntegration: typeof integrations.$inferSelect | null = null;

const restoreEnv = (key: "EMAIL_TRANSPORT" | "NODE_ENV", value: string | undefined) => {
  if (value === undefined) {
    delete process.env[key];
    return;
  }
  process.env[key] = value;
};

beforeAll(async () => {
  if (!hasDb) return;
  originalEmailSettings = await db.select().from(settings).where(inArray(settings.key, EMAIL_KEYS));
  const [resendIntegration] = await db
    .select()
    .from(integrations)
    .where(eq(integrations.id, "resend"))
    .limit(1);
  originalResendIntegration = resendIntegration ?? null;
});

afterAll(async () => {
  restoreEnv("EMAIL_TRANSPORT", previousTransport);
  restoreEnv("NODE_ENV", previousNodeEnv);
  globalThis.fetch = previousFetch;
  if (hasDb) {
    await db.delete(settings).where(inArray(settings.key, EMAIL_KEYS));
    await db
      .delete(emailDeliveryLogs)
      .where(
        inArray(emailDeliveryLogs.recipient, [
          "dev@example.com",
          "resend-dev@example.com",
          "missing-key@example.com",
          "test-mode-resend@example.com",
        ])
      );
    await db.delete(integrations).where(eq(integrations.id, "resend"));
    if (originalEmailSettings.length > 0) {
      await db.insert(settings).values(originalEmailSettings);
    }
    if (originalResendIntegration) {
      await db.insert(integrations).values(originalResendIntegration);
    }
    resetEmailSettingsCache();
  }
});

testIfDb("update and fetch email settings", async () => {
  const hasMasterKey = hasValidSecretMasterKey();
  process.env.EMAIL_TRANSPORT = "mock";

  const updated = await updateEmailSettings({
    smtp: {
      host: "smtp.example.com",
      port: 587,
      secure: false,
      user: "mailer@example.com",
      password: hasMasterKey ? "secret" : undefined,
    },
    from: { name: "Coderso", email: "hello@example.com" },
  });

  expect(updated.smtp.host).toBe("smtp.example.com");
  expect(updated.smtp.port).toBe(587);
  expect(updated.from.email).toBe("hello@example.com");
  expect(updated.provider).toBe("smtp");
  expect(updated.resend.apiKey.configured).toBe(false);
  expect(updated.status.provider).toBe("smtp");

  const read = await getEmailSettings();
  expect(read.smtp.host).toBe("smtp.example.com");
  if (hasMasterKey) {
    expect(read.smtp.password.configured).toBe(true);
  }
});

testIfDb(
  "email provider defaults to smtp and preserves smtp settings across provider switching",
  async () => {
    const hasMasterKey = hasValidSecretMasterKey();

    await db.delete(settings).where(inArray(settings.key, ["email.provider"]));
    await updateEmailSettings({
      smtp: {
        host: "smtp.example.com",
        port: 2525,
        secure: false,
        user: "mailer@example.com",
        password: hasMasterKey ? "secret" : undefined,
      },
      from: { name: "Coderso", email: "hello@example.com" },
    });

    const defaulted = await getEmailSettingsInternal();
    expect(defaulted.provider).toBe("smtp");

    const resend = await updateEmailSettings({
      provider: "resend",
      from: { name: "Coderso", email: "hello@example.com" },
    });

    expect(resend.provider).toBe("resend");
    expect(resend.smtp.host).toBe("smtp.example.com");
    expect(resend.smtp.user).toBe("mailer@example.com");
    expect(JSON.stringify(resend)).not.toContain("re_");

    const smtp = await updateEmailSettings({ provider: "smtp" });
    expect(smtp.provider).toBe("smtp");
    expect(smtp.smtp.host).toBe("smtp.example.com");
    expect(smtp.smtp.port).toBe(2525);
  }
);

testIfDb("active resend provider requires configured integration key", async () => {
  process.env.EMAIL_TRANSPORT = "mock";
  await updateIntegration("resend", { config: { apiKey: null } });
  await updateEmailSettings({
    provider: "resend",
    from: { name: "Coderso", email: "hello@example.com" },
  });

  await expect(sendTestEmail("missing-key@example.com")).rejects.toThrow("email_not_configured");
});

testIfDb("send test email records delivery log", async () => {
  const hasMasterKey = hasValidSecretMasterKey();
  process.env.EMAIL_TRANSPORT = "mock";

  await updateEmailSettings({
    provider: "smtp",
    smtp: {
      host: "smtp.example.com",
      port: 587,
      secure: false,
      user: "mailer@example.com",
      password: hasMasterKey ? "secret" : undefined,
    },
    from: { name: "Coderso", email: "hello@example.com" },
  });

  if (hasMasterKey) {
    await sendTestEmail("dev@example.com");
    const logs = await listDeliveryLogs();
    expect(logs.length).toBeGreaterThan(0);
    expect(logs[0]?.status).toBe("delivered");
    expect(logs[0]?.provider).toBe("smtp");
  }
});

testIfDb("send test email records resend delivery log when resend is active", async () => {
  const hasMasterKey = hasValidSecretMasterKey();
  if (!hasMasterKey) return;
  process.env.EMAIL_TRANSPORT = "mock";

  await updateIntegration("resend", { config: { apiKey: "re_testSecretValue123456" } });
  await updateEmailSettings({
    provider: "resend",
    from: { name: "Coderso", email: "hello@example.com" },
  });

  await sendTestEmail("resend-dev@example.com");
  const logs = await listDeliveryLogs();
  expect(logs[0]?.recipient).toBe("resend-dev@example.com");
  expect(logs[0]?.status).toBe("delivered");
  expect(logs[0]?.provider).toBe("resend");
});

testIfDb("sendSystemEmail uses mock Resend transport in test mode", async () => {
  const hasMasterKey = hasValidSecretMasterKey();
  if (!hasMasterKey) return;
  process.env.NODE_ENV = "test";
  delete process.env.EMAIL_TRANSPORT;
  let fetchCalled = false;
  globalThis.fetch = async () => {
    fetchCalled = true;
    throw new Error("live Resend fetch should not run in test mode");
  };

  await updateIntegration("resend", { config: { apiKey: "re_testSecretValue123456" } });
  await updateEmailSettings({
    provider: "resend",
    from: { name: "Coderso", email: "hello@example.com" },
  });

  await expect(
    sendSystemEmail({
      to: "test-mode-resend@example.com",
      subject: "Test mode",
      text: "Body",
    })
  ).resolves.toEqual({ ok: true, messageId: "mock", response: "mock" });

  const logs = await listDeliveryLogs();
  expect(fetchCalled).toBe(false);
  expect(logs[0]?.recipient).toBe("test-mode-resend@example.com");
  expect(logs[0]?.provider).toBe("resend");
  expect(logs[0]?.status).toBe("delivered");
});
