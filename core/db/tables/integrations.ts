/**
 * Outbound and third-party wiring: webhooks and their delivery attempts,
 * configured integrations and operator requests for new ones.
 *
 * Re-exported verbatim by `core/db/schema.ts`; import from there, not from here.
 */

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
  })
);
