/**
 * Instance operations: installed plugins and their settings, backup artifacts and
 * schedules, and the solution-kit install/rollback ledger.
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
  bigserial,
  primaryKey,
  uniqueIndex,
  index,
  check,
  type AnyPgColumn,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { users } from "./identity";

export const plugins = pgTable(
  "plugins",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    name: text("name").notNull().unique(),
    version: text("version").notNull(),
    apiVersion: text("api_version").notNull(),
    coreVersion: text("core_version").notNull(),
    enabled: boolean("enabled").notNull().default(true),
    status: text("status").notNull().default("installed"),
    permissions: jsonb("permissions").notNull(),
    entry: jsonb("entry").notNull(),
    integrity: jsonb("integrity").notNull(),
    signature: text("signature"),
    installedAt: timestamp("installed_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
    lastError: text("last_error"),
    errorCount: integer("error_count").notNull().default(0),
  },
  (t) => ({
    statusIdx: index("plugins_status_idx").on(t.status),
  })
);

export const pluginSettings = pgTable(
  "plugin_settings",
  {
    pluginName: text("plugin_name")
      .notNull()
      .references(() => plugins.name, { onDelete: "cascade" }),
    key: text("key").notNull(),
    value: jsonb("value").notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (t) => ({
    pk: primaryKey(t.pluginName, t.key),
  })
);

export const backups = pgTable(
  "backups",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    status: text("status").notNull().default("queued"),
    kind: text("kind").notNull().default("manual"),
    storageDriver: text("storage_driver").notNull().default("local"),
    artifactPath: text("artifact_path"),
    artifactKey: text("artifact_key"),
    sizeBytes: integer("size_bytes"),
    error: text("error"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    finishedAt: timestamp("finished_at"),
  },
  (t) => ({
    statusIdx: index("backups_status_idx").on(t.status),
    createdAtIdx: index("backups_created_at_idx").on(t.createdAt),
  })
);

export const backupSchedules = pgTable(
  "backup_schedules",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    enabled: boolean("enabled").notNull().default(true),
    frequency: text("frequency").notNull().default("daily"),
    retentionDays: integer("retention_days").notNull().default(30),
    storageDriver: text("storage_driver").notNull().default("local"),
    // Which sections scheduled/full backups capture (BackupIncludeOption[],
    // jsonb string[] validated app-side). Default = full minus the sensitive
    // users/RBAC matrix (opt-in only). Added by migration 0072_backup_schedule_include.
    include: jsonb("include").notNull().default(["database", "settings", "media"]),
    nextRunAt: timestamp("next_run_at"),
    lastRunAt: timestamp("last_run_at"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (t) => ({
    frequencyIdx: index("backup_schedules_frequency_idx").on(t.frequency),
    nextRunAtIdx: index("backup_schedules_next_run_at_idx").on(t.nextRunAt),
  })
);

/**
 * Run-scoped staging store for the backup users section restore (TASK-564).
 *
 * The restore must run whole-set natural-key collision and user_roles
 * reconciliation guards BEFORE any final write, but must never materialize the
 * whole users/RBAC matrix in memory. Rows are streamed into this persistent,
 * run-scoped table in bounded batches inside the ONE outer restore tx; the
 * guards, the staging→final upsert and the cleanup are set-based SQL over it.
 * One table holds all three row kinds (kind discriminator) with the
 * kind-specific natural-key columns; every row is scoped by run_id and removed
 * idempotently at the end of the restore (and by tx rollback on failure).
 */
export const backupUsersStaging = pgTable(
  "backup_users_staging",
  {
    id: bigserial("id", { mode: "number" }).primaryKey(),
    runId: text("run_id").notNull(),
    kind: text("kind").notNull(), // 'role' | 'user' | 'user_role'
    // Role natural key + payload (kind = 'role').
    roleId: text("role_id"),
    roleName: text("role_name"),
    roleDescription: text("role_description"),
    rolePermissions: jsonb("role_permissions"),
    // User natural key + payload (kind = 'user').
    userId: text("user_id"),
    userEmail: text("user_email"),
    userEmailHash: text("user_email_hash"),
    userEmailEncrypted: jsonb("user_email_encrypted"),
    userPasswordHash: text("user_password_hash"),
    userName: text("user_name"),
    userStatus: text("user_status"),
    createdAt: timestamp("created_at"),
    updatedAt: timestamp("updated_at"),
    lastLoginAt: timestamp("last_login_at"),
  },
  (t) => ({
    runIdx: index("backup_users_staging_run_idx").on(t.runId),
    kindCheck: check(
      "backup_users_staging_kind_check",
      sql`${t.kind} in ('role', 'user', 'user_role')`
    ),
    roleNaturalKey: uniqueIndex("backup_users_staging_role_name_key")
      .on(t.runId, t.roleName)
      .where(sql`kind = 'role'`),
    userNaturalKey: uniqueIndex("backup_users_staging_user_email_key")
      .on(t.runId, t.userEmail)
      .where(sql`kind = 'user'`),
    userRoleNaturalKey: uniqueIndex("backup_users_staging_user_role_key")
      .on(t.runId, t.userId, t.roleId)
      .where(sql`kind = 'user_role'`),
  })
);

export const solutionKitInstallRuns = pgTable(
  "solution_kit_install_runs",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    kitId: text("kit_id").notNull(),
    mode: text("mode").notNull().default("apply"),
    status: text("status").notNull().default("running"),
    actorId: uuid("actor_id").references(() => users.id, {
      onDelete: "set null",
    }),
    rollbackOfRunId: uuid("rollback_of_run_id").references(
      (): AnyPgColumn => solutionKitInstallRuns.id,
      { onDelete: "set null" }
    ),
    options: jsonb("options").notNull().default({}),
    summary: jsonb("summary").notNull().default({}),
    error: text("error"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
    finishedAt: timestamp("finished_at"),
  },
  (t) => ({
    kitIdx: index("solution_kit_install_runs_kit_idx").on(t.kitId),
    statusIdx: index("solution_kit_install_runs_status_idx").on(t.status),
    createdAtIdx: index("solution_kit_install_runs_created_at_idx").on(t.createdAt),
    rollbackIdx: index("solution_kit_install_runs_rollback_idx").on(t.rollbackOfRunId),
  })
);

export const solutionKitInstallItems = pgTable(
  "solution_kit_install_items",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    runId: uuid("run_id")
      .notNull()
      .references(() => solutionKitInstallRuns.id, { onDelete: "cascade" }),
    position: integer("position").notNull().default(0),
    resourceType: text("resource_type").notNull(),
    resourceKey: text("resource_key").notNull(),
    operation: text("operation").notNull(),
    status: text("status").notNull().default("planned"),
    beforeSnapshot: jsonb("before_snapshot"),
    afterSnapshot: jsonb("after_snapshot"),
    rollbackAction: jsonb("rollback_action"),
    error: text("error"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (t) => ({
    runIdx: index("solution_kit_install_items_run_idx").on(t.runId),
    resourceIdx: index("solution_kit_install_items_resource_idx").on(t.resourceType, t.resourceKey),
    statusIdx: index("solution_kit_install_items_status_idx").on(t.status),
    runPositionIdx: uniqueIndex("solution_kit_install_items_run_position_idx").on(
      t.runId,
      t.position
    ),
    runResourceIdx: uniqueIndex("solution_kit_install_items_run_resource_idx").on(
      t.runId,
      t.resourceType,
      t.resourceKey
    ),
  })
);
