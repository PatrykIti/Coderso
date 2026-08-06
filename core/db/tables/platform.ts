/**
 * Instance- and operator-scoped preferences: the global settings key/value store,
 * per-user overrides, dashboard layouts and saved searches.
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
  primaryKey,
  index,
} from "drizzle-orm/pg-core";
import { users } from "./identity";

export const settings = pgTable("settings", {
  key: text("key").primaryKey(),
  value: jsonb("value").notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const userSettings = pgTable(
  "user_settings",
  {
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    key: text("key").notNull(),
    value: jsonb("value").notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (t) => ({
    pk: primaryKey({ columns: [t.userId, t.key] }),
    userIdIdx: index("user_settings_user_id_idx").on(t.userId),
  })
);

export const dashboardLayouts = pgTable(
  "dashboard_layouts",
  {
    userId: uuid("user_id")
      .primaryKey()
      .references(() => users.id, { onDelete: "cascade" }),
    schemaVersion: integer("schema_version").notNull().default(1),
    layout: jsonb("layout").notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
    updatedBy: uuid("updated_by").references(() => users.id, { onDelete: "set null" }),
  },
  (t) => ({
    updatedAtIdx: index("dashboard_layouts_updated_at_idx").on(t.updatedAt),
  })
);

export const searchHistory = pgTable(
  "search_history",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    query: text("query").notNull(),
    filters: jsonb("filters"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (t) => ({
    userIdx: index("search_history_user_idx").on(t.userId),
    createdAtIdx: index("search_history_created_at_idx").on(t.createdAt),
  })
);
