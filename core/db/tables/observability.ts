/**
 * Operator-facing logs: the audit trail, the HTTP access log and outbound email
 * delivery attempts.
 *
 * Deliberately separate from `./analytics.ts`. `access_logs` here retains raw IP
 * and the verbatim User-Agent, and `audit_logs` retains actor identity; the two
 * analytics tables are contractually forbidden from keeping any of the three, so
 * the two concerns must not sit in one file where the distinction blurs.
 *
 * Re-exported verbatim by `core/db/schema.ts`; import from there, not from here.
 */

import { pgTable, uuid, text, timestamp, jsonb, integer, index } from "drizzle-orm/pg-core";
import { sessions, users } from "./identity";

export const auditLogs = pgTable(
  "audit_logs",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    actorId: uuid("actor_id").references(() => users.id, {
      onDelete: "set null",
    }),
    action: text("action").notNull(),
    targetType: text("target_type").notNull(),
    targetId: text("target_id").notNull(),
    metadata: jsonb("metadata").notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (t) => ({
    actorIdx: index("audit_logs_actor_id_idx").on(t.actorId),
    actionIdx: index("audit_logs_action_idx").on(t.action),
    targetIdx: index("audit_logs_target_idx").on(t.targetType, t.targetId),
    createdAtIdx: index("audit_logs_created_at_idx").on(t.createdAt),
  })
);

export const accessLogs = pgTable(
  "access_logs",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    method: text("method").notNull(),
    path: text("path").notNull(),
    status: integer("status").notNull(),
    ip: text("ip"),
    userAgent: text("user_agent"),
    userId: uuid("user_id").references(() => users.id, {
      onDelete: "set null",
    }),
    sessionId: uuid("session_id").references(() => sessions.id, {
      onDelete: "set null",
    }),
    durationMs: integer("duration_ms"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (t) => ({
    createdAtIdx: index("access_logs_created_at_idx").on(t.createdAt),
    statusIdx: index("access_logs_status_idx").on(t.status),
    pathIdx: index("access_logs_path_idx").on(t.path),
    userIdx: index("access_logs_user_id_idx").on(t.userId),
    sessionIdx: index("access_logs_session_id_idx").on(t.sessionId),
    // HASH, not btree, and the choice is load-bearing. `user_agent` stores the
    // request header verbatim (httpServer.ts forwards `req.headers.get(...)` and
    // logAccess does not truncate), so its length is client-controlled. A btree
    // entry cannot exceed ~2704 incompressible bytes — measured as a hard INSERT
    // rejection on PostgreSQL 18.4 — and `recordAccessLog` swallows insert
    // failures with a console.warn, so a btree here would let any client silence
    // its own access-log trail with a long high-entropy User-Agent. A hash index
    // stores a 32-bit hash: no ceiling, no such failure mode (verified accepting
    // a 32 kB User-Agent). Equality-only suffices and is planner-usable: callers
    // filter `WHERE user_agent IN (...)`, which PostgreSQL executes as a Bitmap
    // Index Scan over this index (one search per array element), replacing a
    // 4,009-block Seq Scan of all 97,865 rows.
    userAgentIdx: index("access_logs_user_agent_idx").using("hash", t.userAgent),
  })
);

export const emailDeliveryLogs = pgTable(
  "email_delivery_logs",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    recipient: text("recipient").notNull(),
    subject: text("subject").notNull(),
    status: text("status").notNull(),
    provider: text("provider").notNull().default("smtp"),
    messageId: text("message_id"),
    error: text("error"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (t) => ({
    statusIdx: index("email_delivery_logs_status_idx").on(t.status),
    createdAtIdx: index("email_delivery_logs_created_at_idx").on(t.createdAt),
  })
);
