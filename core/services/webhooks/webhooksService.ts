import { and, desc, eq, inArray } from "drizzle-orm";

import { db } from "../../db/client";
import { webhookDeliveries, webhooks } from "../../db/schema";
import {
  decryptSecret,
  encryptSecret,
  isEncryptedSecret,
} from "../security/secretStore";

export type WebhookRow = typeof webhooks.$inferSelect;
export type WebhookDeliveryRow = typeof webhookDeliveries.$inferSelect;

export type WebhookSummary = {
  id: string;
  name: string;
  url: string;
  events: string[];
  enabled: boolean;
  createdAt: Date;
  updatedAt: Date;
  lastDelivery: {
    status: string;
    deliveredAt: Date | null;
  } | null;
  hasSecret: boolean;
};

export type WebhookDeliverySummary = {
  id: string;
  webhookId: string;
  event: string;
  status: string;
  responseCode: number | null;
  attempts: number;
  lastError: string | null;
  createdAt: Date;
  deliveredAt: Date | null;
};

export type WebhookCreateInput = {
  name: string;
  url: string;
  events: string[];
  enabled?: boolean;
  secret?: string | null;
};

export type WebhookUpdateInput = {
  name?: string;
  url?: string;
  events?: string[];
  enabled?: boolean;
  secret?: string | null;
};

type DeliveryLookup = {
  status: string;
  deliveredAt: Date | null;
};

const normalizeEvents = (events: unknown) => {
  if (!Array.isArray(events)) return [];
  const normalized = events
    .map((event) => (typeof event === "string" ? event.trim() : ""))
    .filter(Boolean);
  return Array.from(new Set(normalized));
};

const toDeliverySummary = (row: WebhookDeliveryRow): WebhookDeliverySummary => ({
  id: row.id,
  webhookId: row.webhookId,
  event: row.event,
  status: row.status,
  responseCode: row.responseCode ?? null,
  attempts: row.attempts,
  lastError: row.lastError ?? null,
  createdAt: row.createdAt,
  deliveredAt: row.deliveredAt ?? null,
});

const toWebhookSummary = (
  row: WebhookRow,
  lastDelivery?: DeliveryLookup | null
) => ({
  id: row.id,
  name: row.name,
  url: row.url,
  events: normalizeEvents(row.events),
  enabled: row.enabled,
  createdAt: row.createdAt,
  updatedAt: row.updatedAt,
  lastDelivery: lastDelivery ?? null,
  hasSecret: Boolean(row.secret && isEncryptedSecret(row.secret)),
});

const resolveSecret = (value: unknown) => {
  if (!value) return null;
  if (isEncryptedSecret(value)) return decryptSecret(value);
  return null;
};

export async function listWebhooks(): Promise<WebhookSummary[]> {
  const rows = await db.select().from(webhooks).orderBy(desc(webhooks.createdAt));
  if (rows.length === 0) return [];

  const ids = rows.map((row) => row.id);
  const deliveries = await db
    .select()
    .from(webhookDeliveries)
    .where(inArray(webhookDeliveries.webhookId, ids))
    .orderBy(desc(webhookDeliveries.createdAt));

  const lastDeliveryMap = new Map<string, DeliveryLookup>();
  for (const delivery of deliveries) {
    if (!lastDeliveryMap.has(delivery.webhookId)) {
      lastDeliveryMap.set(delivery.webhookId, {
        status: delivery.status,
        deliveredAt: delivery.deliveredAt ?? delivery.createdAt,
      });
    }
  }

  return rows.map((row) => toWebhookSummary(row, lastDeliveryMap.get(row.id)));
}

export async function getWebhookById(id: string) {
  const [row] = await db.select().from(webhooks).where(eq(webhooks.id, id));
  return row ?? null;
}

export async function getWebhookForDelivery(id: string) {
  const row = await getWebhookById(id);
  if (!row) return null;
  return {
    ...row,
    events: normalizeEvents(row.events),
    secret: resolveSecret(row.secret),
  };
}

export async function listDeliveries(webhookId: string) {
  const rows = await db
    .select()
    .from(webhookDeliveries)
    .where(eq(webhookDeliveries.webhookId, webhookId))
    .orderBy(desc(webhookDeliveries.createdAt));
  return rows.map(toDeliverySummary);
}

export async function createWebhook(input: WebhookCreateInput) {
  const name = input.name.trim();
  const url = input.url.trim();
  const events = normalizeEvents(input.events);
  const enabled = input.enabled ?? true;
  if (!name) throw new Error("webhook_name_required");
  if (!url) throw new Error("webhook_url_required");
  if (events.length === 0) throw new Error("webhook_events_required");

  const secret =
    input.secret && input.secret.trim() ? encryptSecret(input.secret.trim()) : null;

  const [row] = await db
    .insert(webhooks)
    .values({
      name,
      url,
      events,
      enabled,
      secret,
    })
    .returning();

  if (!row) throw new Error("webhook_create_failed");
  return toWebhookSummary(row, null);
}

export async function updateWebhook(id: string, input: WebhookUpdateInput) {
  const payload: Partial<WebhookRow> = {
    updatedAt: new Date(),
  };
  if (input.name !== undefined) {
    const name = input.name.trim();
    if (!name) throw new Error("webhook_name_required");
    payload.name = name;
  }
  if (input.url !== undefined) {
    const url = input.url.trim();
    if (!url) throw new Error("webhook_url_required");
    payload.url = url;
  }
  if (input.events !== undefined) {
    const events = normalizeEvents(input.events);
    if (events.length === 0) throw new Error("webhook_events_required");
    payload.events = events;
  }
  if (input.enabled !== undefined) {
    payload.enabled = input.enabled;
  }
  if (input.secret !== undefined) {
    payload.secret =
      input.secret && input.secret.trim()
        ? encryptSecret(input.secret.trim())
        : null;
  }

  const [row] = await db
    .update(webhooks)
    .set(payload)
    .where(eq(webhooks.id, id))
    .returning();

  return row ? toWebhookSummary(row, null) : null;
}

export async function deleteWebhook(id: string) {
  const [row] = await db
    .delete(webhooks)
    .where(eq(webhooks.id, id))
    .returning();
  return row ? toWebhookSummary(row, null) : null;
}

export async function createDeliveryLog(input: {
  webhookId: string;
  event: string;
}) {
  const [row] = await db
    .insert(webhookDeliveries)
    .values({
      webhookId: input.webhookId,
      event: input.event,
      status: "pending",
      attempts: 0,
    })
    .returning();

  if (!row) throw new Error("webhook_delivery_create_failed");
  return row;
}

export async function updateDeliveryLog(
  id: string,
  payload: Partial<WebhookDeliveryRow>
) {
  const [row] = await db
    .update(webhookDeliveries)
    .set(payload)
    .where(eq(webhookDeliveries.id, id))
    .returning();

  return row ?? null;
}

export async function recordDeliveryAttempt(input: {
  id: string;
  attempts: number;
  status: string;
  responseCode?: number | null;
  lastError?: string | null;
  deliveredAt?: Date | null;
}) {
  return updateDeliveryLog(input.id, {
    attempts: input.attempts,
    status: input.status,
    responseCode: input.responseCode ?? null,
    lastError: input.lastError ?? null,
    deliveredAt: input.deliveredAt ?? null,
  });
}

export async function listWebhooksByEvent(event: string) {
  const rows = await db
    .select()
    .from(webhooks)
    .where(and(eq(webhooks.enabled, true)));

  return rows.filter((row) => normalizeEvents(row.events).includes(event));
}
