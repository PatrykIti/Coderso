/**
 * Authentication and authorization principals: accounts, roles, live sessions,
 * machine credentials, password-reset tickets and the network allowlist.
 *
 * The root of the FK graph — eleven of the other nineteen table modules import
 * from here (ten for `users`, `observability` also for `sessions`), and nothing
 * here references them back.
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
  primaryKey,
  uniqueIndex,
  index,
} from "drizzle-orm/pg-core";
import {
  normalizeTask551TrigramSql,
  SEARCH_VECTOR_SQL,
  TRIGRAM_SOURCE_SQL,
  tsvector,
} from "../searchVectorDefinitions";

export const users = pgTable(
  "users",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    email: text("email").notNull().unique(),
    emailHash: text("email_hash"),
    emailEncrypted: jsonb("email_encrypted"),
    passwordHash: text("password_hash").notNull(),
    name: text("name"),
    status: text("status").notNull().default("active"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
    lastLoginAt: timestamp("last_login_at"),
    // TASK-551-05-L01: canonical local search vectors. Stored generated, so the
    // column is maintained by the database and every reader sees the same
    // tsvector the GIN index holds. The trigram source is `name` only — neither
    // email nor email_hash may enter it.
    searchVector: tsvector("search_vector").generatedAlwaysAs(sql.raw(SEARCH_VECTOR_SQL.users)),
    searchTrigramText: text("search_trigram_text").generatedAlwaysAs(
      normalizeTask551TrigramSql(sql.raw(TRIGRAM_SOURCE_SQL.users))
    ),
  },
  (t) => ({
    usersSearchVectorIdx: index("users_search_vector_idx").using("gin", t.searchVector),
    usersSearchTrigramIdx: index("users_search_trigram_idx").using(
      "gin",
      t.searchTrigramText.op("gin_trgm_ops")
    ),
    // TASK-551-05-L01 evidence-backed list traversal: the admin list sorts by
    // recency and paginates on the stable (created_at DESC, id DESC) keyset.
    usersListCreatedIdIdx: index("users_list_created_id_idx").on(desc(t.createdAt), desc(t.id)),
  })
);

export const roles = pgTable("roles", {
  id: uuid("id").defaultRandom().primaryKey(),
  name: text("name").notNull().unique(),
  description: text("description"),
  permissions: jsonb("permissions").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const userRoles = pgTable(
  "user_roles",
  {
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    roleId: uuid("role_id")
      .notNull()
      .references(() => roles.id, { onDelete: "cascade" }),
  },
  (t) => ({
    pk: primaryKey({ columns: [t.userId, t.roleId] }),
    // TASK-551-05-L01: serves the role→members traversal without scanning the
    // user side of the pivot.
    roleUserIdx: index("user_roles_role_user_idx").on(t.roleId, t.userId),
  })
);

export const sessions = pgTable(
  "sessions",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    tokenHash: text("token_hash").notNull(),
    csrfTokenHash: text("csrf_token_hash"),
    ip: text("ip"),
    userAgent: text("user_agent"),
    expiresAt: timestamp("expires_at").notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    revokedAt: timestamp("revoked_at"),
  },
  (t) => ({
    tokenHashIdx: uniqueIndex("sessions_token_hash_idx").on(t.tokenHash),
    expiresAtIdx: index("sessions_expires_at_idx").on(t.expiresAt),
    csrfTokenHashIdx: index("sessions_csrf_token_hash_idx").on(t.csrfTokenHash),
    // TASK-551-05-L01 session lifecycle group: the per-user lookup and the two
    // retention sweeps (live-expiry and revoked), each predicate-bounded.
    sessionsUserIdIdx: index("sessions_user_id_idx").on(t.userId),
    sessionsExpiredRetentionIdx: index("sessions_expired_retention_idx")
      .on(t.expiresAt, t.id)
      .where(sql`revoked_at IS NULL`),
    sessionsRevokedRetentionIdx: index("sessions_revoked_retention_idx")
      .on(t.revokedAt, t.id)
      .where(sql`revoked_at IS NOT NULL`),
  })
);

export const apiKeys = pgTable(
  "api_keys",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    name: text("name").notNull(),
    scopes: jsonb("scopes").notNull(),
    keyHash: text("key_hash").notNull(),
    prefix: text("prefix").notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    lastUsedAt: timestamp("last_used_at"),
    revokedAt: timestamp("revoked_at"),
  },
  (t) => ({
    prefixIdx: index("api_keys_prefix_idx").on(t.prefix),
    nameIdx: index("api_keys_name_idx").on(t.name),
  })
);

export const passwordResets = pgTable(
  "password_resets",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    tokenHash: text("token_hash").notNull(),
    expiresAt: timestamp("expires_at").notNull(),
    usedAt: timestamp("used_at"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (t) => ({
    tokenHashIdx: uniqueIndex("password_resets_token_hash_idx").on(t.tokenHash),
    expiresAtIdx: index("password_resets_expires_at_idx").on(t.expiresAt),
    // TASK-551-05-L01 retention scan.
    passwordResetsRetentionIdx: index("password_resets_retention_idx").on(t.expiresAt, t.id),
  })
);

export const ipAllowlist = pgTable(
  "ip_allowlist",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    cidr: text("cidr").notNull().unique(),
    label: text("label"),
    description: text("description"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (t) => ({
    createdAtIdx: index("ip_allowlist_created_at_idx").on(t.createdAt),
  })
);
