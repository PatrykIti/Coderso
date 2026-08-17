import { afterAll, expect, test } from "bun:test";
import { sql, inArray } from "drizzle-orm";

import { db } from "../../../core/db/client";
import { webhookDeliveries, webhooks } from "../../../core/db/schema";
import { deliverWebhook } from "../../../core/services/webhooks/deliveryService";
import { createWebhook, listDeliveries } from "../../../core/services/webhooks/webhooksService";
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

testIfDb("deliverWebhook succeeds and records delivery", async () => {
  const created = await createWebhook({
    name: "Delivery Test",
    url: "https://example.com/webhook",
    events: ["entry.created"],
    secret: hasMasterKey ? "whsec_test" : undefined,
  });
  cleanupIds.push(created.id);

  const originalFetch = globalThis.fetch;
  globalThis.fetch = async (_request, init) => {
    const headers = init?.headers instanceof Headers ? init.headers : null;
    expect(headers?.get("X-Coderso-Event")).toBe("entry.created");
    expect(headers?.get("X-Nextless-Event")).toBe("entry.created");
    expect(headers?.get("X-Coderso-Delivery")).toBeTruthy();
    expect(headers?.get("X-Nextless-Delivery")).toBeTruthy();
    if (hasMasterKey) {
      expect(headers?.get("X-Coderso-Signature")).toBeTruthy();
      expect(headers?.get("X-Nextless-Signature")).toBeTruthy();
      expect(headers?.get("X-Coderso-Timestamp")).toBeTruthy();
      expect(headers?.get("X-Nextless-Timestamp")).toBeTruthy();
    }
    return new Response("ok", { status: 200 });
  };

  try {
    const result = await deliverWebhook({
      webhookId: created.id,
      event: "entry.created",
      payload: { id: "entry-1" },
      attempts: 1,
      baseDelayMs: 0,
      timeoutMs: 1000,
    });
    expect(result.status).toBe("success");

    const deliveries = await listDeliveries(created.id);
    expect(deliveries.length).toBeGreaterThan(0);
    expect(deliveries[0]?.status).toBe("success");
  } finally {
    globalThis.fetch = originalFetch;
  }
});

testIfDb("deliverWebhook retries and fails", async () => {
  const created = await createWebhook({
    name: "Retry Test",
    url: "https://example.com/webhook",
    events: ["entry.updated"],
    secret: hasMasterKey ? "whsec_test" : undefined,
  });
  cleanupIds.push(created.id);

  const originalFetch = globalThis.fetch;
  globalThis.fetch = async () => new Response("fail", { status: 500 });

  try {
    const result = await deliverWebhook({
      webhookId: created.id,
      event: "entry.updated",
      payload: { id: "entry-2" },
      attempts: 2,
      baseDelayMs: 0,
      timeoutMs: 1000,
    });
    expect(result.status).toBe("failed");
    expect(result.attempts).toBe(2);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

testIfDb("deliverWebhook fails closed on a blocked delivery URL (TASK-567)", async () => {
  // Insert directly to bypass the config-time gate so the delivery-time
  // re-validation is exercised on its own.
  const [created] = await db
    .insert(webhooks)
    .values({
      name: "Delivery-time blocked",
      url: "https://169.254.169.254/hook",
      events: ["entry.updated"],
      enabled: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    })
    .returning();
  if (!created) throw new Error("webhook_insert_failed");
  cleanupIds.push(created.id);

  const originalFetch = globalThis.fetch;
  let fetchCalls = 0;
  globalThis.fetch = async () => {
    fetchCalls += 1;
    return new Response("ok", { status: 200 });
  };

  try {
    const result = await deliverWebhook({
      webhookId: created.id,
      event: "entry.updated",
      payload: { id: "entry-3" },
      attempts: 1,
      baseDelayMs: 0,
      timeoutMs: 1000,
    });
    expect(result.status).toBe("failed");
    expect(result.lastError).toBe("egress_host_forbidden");
    expect(result.lastError).not.toContain("169.254.169.254");
    expect(fetchCalls).toBe(0);
  } finally {
    globalThis.fetch = originalFetch;
  }
});
