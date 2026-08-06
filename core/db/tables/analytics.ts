/**
 * Real visitor-traffic analytics: sessions and the pageviews inside them.
 *
 * Deliberately NOT merged into `./observability.ts`. The privacy contract stated
 * verbatim below — no raw IP, no full referrer, no User-Agent — holds for these
 * two tables and for nothing else in the schema, so it has to stay readable in
 * isolation rather than sitting next to `access_logs`, which retains all three.
 *
 * Re-exported verbatim by `core/db/schema.ts`; import from there, not from here.
 */

import { pgTable, uuid, text, timestamp, integer, index } from "drizzle-orm/pg-core";

// Real traffic analytics (TASK-483-01-L02). Distinct from the content-inventory
// analyticsService. No raw IP, no full referrer URL, no User-Agent is persisted:
// visitor identity is a salted daily hash (TASK-483-02-L03); referrer is host-only.
export const analyticsSessions = pgTable(
  "analytics_sessions",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    visitorHash: text("visitor_hash").notNull(), // salted daily hash, NOT raw IP
    sourceKind: text("source_kind").notNull(), // TrafficSourceKind
    referrerHost: text("referrer_host"),
    deviceClass: text("device_class").notNull(), // TrafficDeviceClass
    lang: text("lang"),
    entryPath: text("entry_path").notNull(),
    exitPath: text("exit_path"),
    pageviewCount: integer("pageview_count").notNull().default(1),
    startedAt: timestamp("started_at").defaultNow().notNull(),
    lastSeenAt: timestamp("last_seen_at").defaultNow().notNull(),
  },
  (t) => ({
    startedAtIdx: index("analytics_sessions_started_at_idx").on(t.startedAt),
    visitorIdx: index("analytics_sessions_visitor_idx").on(t.visitorHash),
  })
);

export const analyticsPageviews = pgTable(
  "analytics_pageviews",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    sessionId: uuid("session_id")
      .notNull()
      .references(() => analyticsSessions.id, { onDelete: "cascade" }),
    path: text("path").notNull(),
    referrerHost: text("referrer_host"),
    sourceKind: text("source_kind").notNull(),
    deviceClass: text("device_class").notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (t) => ({
    createdAtIdx: index("analytics_pageviews_created_at_idx").on(t.createdAt),
    pathIdx: index("analytics_pageviews_path_idx").on(t.path),
    sessionIdx: index("analytics_pageviews_session_idx").on(t.sessionId),
  })
);
