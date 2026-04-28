import { afterAll, expect, test } from "bun:test";
import { inArray, sql } from "drizzle-orm";

import { db } from "../../../core/db/client";
import { emailDeliveryLogs, settings } from "../../../core/db/schema";
import {
  getEmailSettings,
  listDeliveryLogs,
  sendTestEmail,
  updateEmailSettings,
} from "../../../core/services/email/emailSettingsService";
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

afterAll(async () => {
  process.env.EMAIL_TRANSPORT = previousTransport;
  if (hasDb) {
    await db
      .delete(settings)
      .where(inArray(settings.key, EMAIL_KEYS));
    await db.delete(emailDeliveryLogs);
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

  const read = await getEmailSettings();
  expect(read.smtp.host).toBe("smtp.example.com");
  if (hasMasterKey) {
    expect(read.smtp.password.configured).toBe(true);
  }
});

testIfDb("send test email records delivery log", async () => {
  const hasMasterKey = hasValidSecretMasterKey();
  process.env.EMAIL_TRANSPORT = "mock";

  await updateEmailSettings({
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
  }
});
