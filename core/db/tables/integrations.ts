/**
 * Outbound and third-party wiring: webhooks and their delivery attempts,
 * configured integrations and operator requests for new ones.
 *
 * Re-exported verbatim by `core/db/schema.ts`; import from there, not from here.
 */

import { desc, sql } from "drizzle-orm";
import {
  pgTable,
  uuid,
  text,
  timestamp,
  jsonb,
  integer,
  boolean,
  index,
} from "drizzle-orm/pg-core";

export const webhooks = pgTable(
  "webhooks",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    name: text("name").notNull(),
    url: text("url").notNull(),
    events: jsonb("events").notNull(),
    secret: jsonb("secret"),
    enabled: boolean("enabled").notNull().default(true),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (t) => ({
    urlIdx: index("webhooks_url_idx").on(t.url),
    enabledIdx: index("webhooks_enabled_idx").on(t.enabled),
    // TASK-551-05-L01 event containment: the enabled-subscriber dispatch reads
    // `enabled = true AND events @> :normalizedOneEventArray::jsonb`, which
    // resolves through this opclass only.
    webhooksEventsGinIdx: index("webhooks_events_gin_idx").using(
      "gin",
      t.events.op("jsonb_path_ops")
    ),
    // TASK-551-05-L01 evidence-backed list traversal.
    webhooksListCreatedIdIdx: index("webhooks_list_created_id_idx").on(
      desc(t.createdAt),
      desc(t.id)
    ),
  })
);

export const webhookDeliveries = pgTable(
  "webhook_deliveries",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    webhookId: uuid("webhook_id")
      .notNull()
      .references(() => webhooks.id, { onDelete: "cascade" }),
    event: text("event").notNull(),
    status: text("status").notNull().default("pending"),
    responseCode: integer("response_code"),
    attempts: integer("attempts").notNull().default(0),
    lastError: text("last_error"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    deliveredAt: timestamp("delivered_at"),
  },
  (t) => ({
    webhookIdx: index("webhook_deliveries_webhook_idx").on(t.webhookId),
    createdAtIdx: index("webhook_deliveries_created_at_idx").on(t.createdAt),
    // TASK-551-05-L01 delivery ledger: the per-webhook timeline, the retry scan
    // over work that can still be attempted, and the terminal-row sweep.
    webhookDeliveriesWebhookListIdx: index("webhook_deliveries_webhook_list_idx").on(
      t.webhookId,
      desc(t.createdAt),
      desc(t.id)
    ),
    webhookDeliveriesRetryIdx: index("webhook_deliveries_retry_idx")
      .on(t.status, t.createdAt, t.id)
      .where(sql`status IN ('pending', 'failed')`),
    webhookDeliveriesTerminalRetentionIdx: index("webhook_deliveries_terminal_retention_idx")
      .on(t.createdAt, t.id)
      .where(sql`status IN ('success', 'failed')`),
  })
);

export const integrations = pgTable(
  "integrations",
  {
    id: text("id").primaryKey(),
    config: jsonb("config").notNull(),
    status: text("status").notNull().default("disconnected"),
    healthStatus: text("health_status").notNull().default("unknown"),
    lastCheckedAt: timestamp("last_checked_at"),
    lastError: text("last_error"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (t) => ({
    statusIdx: index("integrations_status_idx").on(t.status),
    healthIdx: index("integrations_health_idx").on(t.healthStatus),
  })
);

export const integrationRequests = pgTable(
  "integration_requests",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    name: text("name").notNull(),
    website: text("website"),
    notes: text("notes"),
    status: text("status").notNull().default("pending"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (t) => ({
    statusIdx: index("integration_requests_status_idx").on(t.status),
    // TASK-551-05-L01 retention scan.
    integrationRequestsRetentionIdx: index("integration_requests_retention_idx").on(
      t.createdAt,
      t.id
    ),
  })
);
