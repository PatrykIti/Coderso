import { afterAll, expect, test } from "bun:test";
import { sql, eq, inArray } from "drizzle-orm";

import { db } from "../../../core/db/client";
import { webhookDeliveries, webhooks } from "../../../core/db/schema";
import {
  createWebhook,
  deleteWebhook,
  listDeliveries,
  listWebhooks,
  updateWebhook,
} from "../../../core/services/webhooks/webhooksService";
import { hasValidSecretMasterKey } from "../../../core/services/security/secretStore";

const hasDb = Boolean(process.env.DATABASE_URL) && (await canConnect());
const testIfDb = hasDb ? test : test.skip;
const hasMasterKey = hasValidSecretMasterKey();

async function canConnect() {
  try {
    await db.execute(sql`select 1`);
    return true;
  } catch {
    return false;
  }
}

const cleanupIds: string[] = [];

afterAll(async () => {
  if (cleanupIds.length > 0) {
    await db.delete(webhookDeliveries).where(inArray(webhookDeliveries.webhookId, cleanupIds));
    await db.delete(webhooks).where(inArray(webhooks.id, cleanupIds));
  }
});

testIfDb("create, update, list, delete webhooks", async () => {
  const created = await createWebhook({
    name: `Webhook ${Date.now()}`,
    url: "https://example.com/webhook",
    events: ["entry.created"],
    secret: hasMasterKey ? "whsec_test" : undefined,
  });
  cleanupIds.push(created.id);

  const items = await listWebhooks();
  expect(items.some((item) => item.id === created.id)).toBe(true);

  const updated = await updateWebhook(created.id, {
    name: "Updated Webhook",
    enabled: false,
    events: ["media.deleted"],
  });
  expect(updated?.name).toBe("Updated Webhook");
  expect(updated?.enabled).toBe(false);
  expect(updated?.events).toContain("media.deleted");

  const deliveries = await listDeliveries(created.id);
  expect(deliveries.length).toBe(0);

  const deleted = await deleteWebhook(created.id);
  expect(deleted?.id).toBe(created.id);
});
