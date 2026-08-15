// TASK-491-04-L01 security lane: the manual health check response and its
// persisted `lastError` must never leak decrypted secrets or webhook URLs.
// Seeds a real encrypted Slack config, runs the check, and asserts the URL
// never appears in the response, the DB `lastError`, or console output.
// The singleton `slack` integration row is snapshotted before seeding and
// restored afterwards, so pre-existing rows are never lost.
import { afterAll, expect, test } from "bun:test";
import { eq } from "drizzle-orm";

import { db } from "../../core/db/client";
import { integrations } from "../../core/db/schema";
import { runIntegrationHealthCheck } from "../../core/services/integrations/integrationsService";
import { encryptSecret, hasValidSecretMasterKey } from "../../core/services/security/secretStore";

const SLACK_URL = "https://hooks.slack.com/services/TASK491/super-secret-token-xyz";
const hasMasterKey = hasValidSecretMasterKey();

type IntegrationRow = typeof integrations.$inferSelect;

let slackExisted = false;
let slackSnapshot: IntegrationRow | null = null;

const snapshotSlackRow = async () => {
  const [row] = await db.select().from(integrations).where(eq(integrations.id, "slack"));
  slackExisted = Boolean(row);
  slackSnapshot = row ?? null;
};

const restoreSlackRow = async () => {
  if (slackExisted && slackSnapshot) {
    await db
      .update(integrations)
      .set({
        config: slackSnapshot.config,
        status: slackSnapshot.status,
        healthStatus: slackSnapshot.healthStatus,
        lastCheckedAt: slackSnapshot.lastCheckedAt,
        lastError: slackSnapshot.lastError,
        createdAt: slackSnapshot.createdAt,
        updatedAt: slackSnapshot.updatedAt,
      })
      .where(eq(integrations.id, "slack"));
  } else {
    await db.delete(integrations).where(eq(integrations.id, "slack"));
  }
  slackExisted = false;
  slackSnapshot = null;
};

const seedSlack = async (lastError: string | null) => {
  await snapshotSlackRow();
  await db.delete(integrations).where(eq(integrations.id, "slack"));
  await db.insert(integrations).values({
    id: "slack",
    config: { webhookUrl: encryptSecret(SLACK_URL) },
    status: "connected",
    healthStatus: "unknown",
    lastCheckedAt: null,
    lastError,
    createdAt: new Date(),
    updatedAt: new Date(),
  });
};

const captureConsole = async (fn: () => Promise<void>) => {
  const originalWarn = console.warn;
  const originalLog = console.log;
  const captured: string[] = [];
  const collect = (...args: unknown[]) => {
    captured.push(args.map((arg) => String(arg)).join(" "));
  };
  console.warn = collect;
  console.log = collect;
  try {
    await fn();
  } finally {
    console.warn = originalWarn;
    console.log = originalLog;
  }
  return captured.join("\n");
};

afterAll(async () => {
  await restoreSlackRow();
});

test("check response never contains the decrypted webhook URL", async () => {
  if (!hasMasterKey) {
    console.warn("skipping encrypted slack health security test: no master key");
    return;
  }
  await seedSlack(null);

  const output = await captureConsole(async () => {
    const summary = await runIntegrationHealthCheck("slack");
    const serialized = JSON.stringify(summary);
    expect(serialized).not.toContain(SLACK_URL);
    expect(summary.health.status).toBe("healthy");
    expect(summary.health.lastError).toBeNull();
    const field = summary.fields.find((item) => item.key === "webhookUrl");
    expect(field?.value).toBeNull();
    expect(field?.configured).toBe(true);
  });

  expect(output).not.toContain(SLACK_URL);
});

test("a failing delivery's lastError stays a machine code, never the URL", async () => {
  if (!hasMasterKey) {
    console.warn("skipping encrypted slack health security test: no master key");
    return;
  }
  await seedSlack("webhook_http_429");

  const summary = await runIntegrationHealthCheck("slack");
  expect(summary.health.status).toBe("issue");
  expect(summary.health.lastError).toBe("webhook_http_429");
  expect(JSON.stringify(summary)).not.toContain(SLACK_URL);

  const [row] = await db.select().from(integrations).where(eq(integrations.id, "slack"));
  expect(row?.lastError).toBe("webhook_http_429");
  expect(String(row?.lastError)).not.toContain(SLACK_URL);
  expect(JSON.stringify(row?.config)).not.toContain(SLACK_URL);
});
