// TASK-491-02-L01 security lane: a failing outbound dispatch must never log
// the Slack/Zapier webhook URL (the secret itself). Drives a real dispatch
// against a seeded encrypted Slack config with the delivery adapter forced to
// throw, captures console output, and asserts only machine-readable codes
// appear.
import { expect, vi, test } from "bun:test";
import { eq } from "drizzle-orm";

import { db } from "../../core/db/client";
import { integrations } from "../../core/db/schema";
import {
  emitIntegrationEvent,
  emitIntegrationEventSafe,
} from "../../core/services/integrations/integrationEventDispatch";
import { encryptSecret, hasValidSecretMasterKey } from "../../core/services/security/secretStore";

const SLACK_URL = "https://hooks.slack.com/services/TASK491/supersecrettoken";
const hasMasterKey = hasValidSecretMasterKey();

vi.mock("../../core/services/integrations/slackDelivery", () => ({
  deliverSlack: async () => {
    throw new Error("simulated adapter failure");
  },
}));

const captureWarnings = async (fn: () => Promise<void>) => {
  const originalWarn = console.warn;
  const captured: string[] = [];
  console.warn = (...args: unknown[]) => {
    captured.push(args.map((arg) => String(arg)).join(" "));
  };
  try {
    await fn();
  } finally {
    console.warn = originalWarn;
  }
  return captured.join("\n");
};

const seedSlack = async () => {
  const [existing] = await db.select().from(integrations).where(eq(integrations.id, "slack"));
  const existed = Boolean(existing);
  const snapshot = existing
    ? { config: existing.config, status: existing.status, healthStatus: existing.healthStatus }
    : null;
  if (existed) {
    await db.delete(integrations).where(eq(integrations.id, "slack"));
  }
  await db.insert(integrations).values({
    id: "slack",
    config: { webhookUrl: encryptSecret(SLACK_URL) },
    status: "connected",
    healthStatus: "unknown",
    createdAt: new Date(),
    updatedAt: new Date(),
  });
  return async () => {
    if (snapshot) {
      await db.update(integrations).set(snapshot).where(eq(integrations.id, "slack"));
    } else {
      await db.delete(integrations).where(eq(integrations.id, "slack"));
    }
  };
};

test("failing dispatch logs only machine-readable codes, never the webhook URL", async () => {
  if (!hasMasterKey) {
    console.warn("skipping encrypted slack dispatch security test: no master key");
    return;
  }
  const restore = await seedSlack();
  try {
    const output = await captureWarnings(async () => {
      await emitIntegrationEvent("entry.published", {
        type: "entry",
        id: "entry-secret-1",
        title: "Secret title",
      });
      await new Promise((resolve) => setTimeout(resolve, 20));
      emitIntegrationEventSafe("page.published", {
        type: "page",
        id: "page-secret-1",
        title: "Secret page",
      });
      await new Promise((resolve) => setTimeout(resolve, 50));
    });

    expect(output).toContain("integration_event_dispatch_failed");
    expect(output).toContain("dispatch_failed");
    expect(output).not.toContain(SLACK_URL);
    expect(output).not.toContain("supersecrettoken");
    expect(output).not.toContain("hooks.slack.com");
  } finally {
    await restore();
  }
});
