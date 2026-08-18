/**
 * Backup v2 users + RBAC role-matrix section (TASK-511-04).
 *
 * Opt-in, encrypted-only export of the full identity/authorization graph
 * (`users` + `roles` + `user_roles`) as three NDJSON tar members, and an opt-in,
 * privilege- and lockout-safe tx-scoped restore via UPSERT (never delete-all —
 * `users.id` is an FK target of many out-of-scope tables).
 *
 * Security invariants:
 * - `users` is only ever permitted into an ENCRYPTED archive
 *   (`assertUsersEncryptionAllowed`, invoked by 06 BEFORE any row is read).
 * - Password hashes travel as opaque blobs inside the encrypted stream only:
 *   never logged, never in the manifest, never in an error message.
 * - Import reproduces exactly what the archive states (permissions re-validated
 *   through the catalog; no auto-grants) and preserves the admin-lockout safety
 *   (a restore leaving zero admins fails closed and rolls back).
 */
import { asc, eq, getTableColumns, gt, inArray, sql } from "drizzle-orm";
import type { AnyColumn } from "drizzle-orm";
import type { PgTable, SelectedFields } from "drizzle-orm/pg-core";

import { db } from "../../db/client";
import { backupUsersStaging, roles, userRoles, users } from "../../db/schema";
import { listPermissionIds } from "../admin/permissionsCatalog";
import { getAdminRoleIds } from "../admin/rolesService";
import {
  ROLES_MEMBER_NAME,
  USER_ROLES_MEMBER_NAME,
  USERS_MEMBER_NAME,
  type ArchiveUsersManifest,
  type ExportEngine,
} from "./backupArchive";

export type { ArchiveUsersManifest };

// The tx handle type used by the restore helper (mirrors backupService's local
// DbTransaction shape) so the upsert + guards run inside the SAME outer tx.
type DbTransaction = Parameters<Parameters<typeof db.transaction>[0]>[0];

// ---------------------------------------------------------------------------
// Table descriptors + reject-unknown normalizers
// ---------------------------------------------------------------------------

// Column allowlists (drizzle JS keys — the engine serializes JS keys). Keep in
// lock-step with core/db/tables/identity.ts (users/roles).
const USER_KEYS = [
  "id",
  "email",
  "emailHash",
  "emailEncrypted",
  "passwordHash",
  "name",
  "status",
  "createdAt",
  "updatedAt",
  "lastLoginAt",
] as const;
const ROLE_KEYS = ["id", "name", "description", "permissions", "createdAt"] as const;
const USERROLE_KEYS = ["userId", "roleId"] as const;

// Row types — EXPORTED so 05's import pipeline reuses them (single source of
// truth for the reject-unknown parse).
export type UserRow = typeof users.$inferSelect;
export type RoleRow = typeof roles.$inferSelect;
export type UserRoleRow = typeof userRoles.$inferSelect;

const isPlainObject = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

// Reject-unknown + missing-notNull fail-closed parse. NEVER include a row value
// in the thrown message (PII/hash-free).
function assertKeys(raw: Record<string, unknown>, allowed: readonly string[]): void {
  for (const key of Object.keys(raw)) {
    if (!(allowed as readonly string[]).includes(key)) {
      throw new Error("backup_restore_invalid_artifact");
    }
  }
}

const requireString = (raw: Record<string, unknown>, key: string): string => {
  const value = raw[key];
  if (typeof value !== "string") throw new Error("backup_restore_invalid_artifact");
  return value;
};

const reviveDate = (value: unknown): Date | null => {
  if (value === null || value === undefined) return null;
  if (value instanceof Date) return value;
  if (typeof value === "string") {
    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) throw new Error("backup_restore_invalid_artifact");
    return parsed;
  }
  throw new Error("backup_restore_invalid_artifact");
};

/** Strict per-row parse: reject unknown keys; require id+email+passwordHash+status. */
export function normalizeUserRow(raw: unknown): UserRow {
  if (!isPlainObject(raw)) throw new Error("backup_restore_invalid_artifact");
  assertKeys(raw, USER_KEYS);
  const id = requireString(raw, "id");
  const email = requireString(raw, "email");
  const passwordHash = requireString(raw, "passwordHash");
  const status = requireString(raw, "status");
  const emailHash = typeof raw.emailHash === "string" ? raw.emailHash : null;
  if (raw.emailHash !== undefined && raw.emailHash !== null && typeof raw.emailHash !== "string") {
    throw new Error("backup_restore_invalid_artifact");
  }
  const name = typeof raw.name === "string" ? raw.name : null;
  if (raw.name !== undefined && raw.name !== null && typeof raw.name !== "string") {
    throw new Error("backup_restore_invalid_artifact");
  }
  return {
    id,
    email,
    emailHash,
    emailEncrypted: raw.emailEncrypted ?? null,
    passwordHash, // copied verbatim, unread
    name,
    status,
    createdAt: reviveDate(raw.createdAt) ?? new Date(),
    updatedAt: reviveDate(raw.updatedAt) ?? new Date(),
    lastLoginAt: reviveDate(raw.lastLoginAt),
  };
}

/** Strict per-row parse: reject unknown; require id+name+permissions. */
export function normalizeRoleRow(raw: unknown): RoleRow {
  if (!isPlainObject(raw)) throw new Error("backup_restore_invalid_artifact");
  assertKeys(raw, ROLE_KEYS);
  const id = requireString(raw, "id");
  const name = requireString(raw, "name");
  const description =
    raw.description === undefined || raw.description === null
      ? null
      : requireString(raw, "description");
  return {
    id,
    name,
    description,
    permissions: normalizeRolePermissions(raw.permissions),
    createdAt: reviveDate(raw.createdAt) ?? new Date(),
  };
}

/** Strict per-row parse: reject unknown; require userId+roleId. */
export function normalizeUserRoleRow(raw: unknown): UserRoleRow {
  if (!isPlainObject(raw)) throw new Error("backup_restore_invalid_artifact");
  assertKeys(raw, USERROLE_KEYS);
  return { userId: requireString(raw, "userId"), roleId: requireString(raw, "roleId") };
}

// Privilege-bound permission normalization: keep "*" as ["*"] (full access is a
// legitimate archived state) but drop any string not in the catalog so a forged
// archive cannot introduce a brand-new capability token.
function normalizeRolePermissions(raw: unknown): string[] {
  const arr = Array.isArray(raw) ? raw.filter((p): p is string => typeof p === "string") : [];
  if (arr.includes("*")) return ["*"];
  const allowed = new Set(listPermissionIds());
  return [...new Set(arr.filter((p) => allowed.has(p)))];
}

// ---------------------------------------------------------------------------
// Export — encryption-gated NDJSON streaming
// ---------------------------------------------------------------------------

/**
 * Encrypted-only gate (fail-closed, pre-read). Invoked by 06's createBackup
 * AFTER the `running` row insert (so a throw self-marks the row failed) and
 * BEFORE any user/role row is read. 04 defines this guard; 06 is the sole named
 * caller — it cannot be silently omitted.
 */
export function assertUsersEncryptionAllowed(
  include: readonly string[],
  encryption: { enabled: boolean }
): void {
  if (include.includes("users") && !encryption.enabled) {
    throw new Error("backup_users_requires_encryption");
  }
}

const EXPORT_BATCH = 5000; // keyset page size (~5-10k rows/batch)

// pick(table, keys) => the drizzle select-projection object for the allowlisted
// columns only (never select-all). Columns are resolved via getTableColumns cast
// to Record<string, AnyColumn> (a generic PgTable has no string index), then
// narrowed to drizzle's SelectedFields (runtime keys are always real columns).
function pick(table: PgTable, keys: readonly string[]): SelectedFields {
  const cols = getTableColumns(table) as Record<string, AnyColumn>;
  return Object.fromEntries(keys.map((k) => [k, cols[k]])) as unknown as SelectedFields;
}

// Single monotonic uuid PK (users, roles): WHERE id > cursor, ORDER BY id.
async function* keyById(
  table: PgTable,
  keys: readonly string[]
): AsyncIterable<Record<string, unknown>> {
  const cols = getTableColumns(table) as Record<string, AnyColumn>;
  let cursor: string | null = null;
  for (;;) {
    const rows = await db
      .select(pick(table, keys))
      .from(table)
      .where(cursor === null ? undefined : gt(cols.id, cursor))
      .orderBy(asc(cols.id))
      .limit(EXPORT_BATCH);
    for (const r of rows) yield r as Record<string, unknown>;
    if (rows.length < EXPORT_BATCH) return; // last (short) page
    cursor = (rows[rows.length - 1] as Record<string, unknown>).id as string;
  }
}

// Composite (userId, roleId) PK (user_roles — no single monotonic id): SQL
// row-value comparison over the pair: (user_id, role_id) > (cursor...).
async function* keyByUserRole(
  table: PgTable,
  keys: readonly string[]
): AsyncIterable<Record<string, unknown>> {
  const cols = getTableColumns(table) as Record<string, AnyColumn>;
  let cursor: { userId: string; roleId: string } | null = null;
  for (;;) {
    const rows = await db
      .select(pick(table, keys))
      .from(table)
      .where(
        cursor === null
          ? undefined
          : sql`(${cols.userId}, ${cols.roleId}) > (${cursor.userId}, ${cursor.roleId})`
      )
      .orderBy(asc(cols.userId), asc(cols.roleId))
      .limit(EXPORT_BATCH);
    for (const r of rows) yield r as Record<string, unknown>;
    if (rows.length < EXPORT_BATCH) return;
    const last = rows[rows.length - 1] as Record<string, unknown>;
    cursor = { userId: last.userId as string, roleId: last.roleId as string };
  }
}

// Stream one table's allowlisted columns as NDJSON via 01's appendNdjson sink and
// return the row count (01's ArchiveTableManifest.rowCount is the source of truth).
async function streamTableNdjson(
  engine: ExportEngine,
  member: string,
  table: PgTable,
  keys: readonly string[],
  keyFn: (table: PgTable, keys: readonly string[]) => AsyncIterable<Record<string, unknown>>
): Promise<number> {
  const manifest = await engine.appendNdjson(member, keyFn(table, keys));
  return manifest.rowCount;
}

/**
 * Export the three section members keyset-batched into 01's engine. Returns the
 * per-member counts ONLY (no row data — never log rows). Precondition
 * (`assertUsersEncryptionAllowed`) is asserted by 06 before this is invoked.
 */
export async function exportUsersSection(engine: ExportEngine): Promise<ArchiveUsersManifest> {
  const usersCount = await streamTableNdjson(engine, USERS_MEMBER_NAME, users, USER_KEYS, keyById);
  const rolesCount = await streamTableNdjson(engine, ROLES_MEMBER_NAME, roles, ROLE_KEYS, keyById);
  const urCount = await streamTableNdjson(
    engine,
    USER_ROLES_MEMBER_NAME,
    userRoles,
    USERROLE_KEYS,
    keyByUserRole
  );
  return { users: usersCount, roles: rolesCount, userRoles: urCount };
}

// ---------------------------------------------------------------------------
// Restore — opt-in, staged, set-based, privilege- & lockout-safe (tx-scoped)
// ---------------------------------------------------------------------------

/** A trivial pure array splitter for the bounded staging-insert batches. */
export function chunk<T>(a: T[], n: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < a.length; i += n) out.push(a.slice(i, i + n));
  return out;
}

/** Staging INSERT batch window (~5k rows, bounded binds: 5k * 12 binds < 65 535). */
export const STAGING_BATCH = 5_000;

/** The three archived row kinds staged into backup_users_staging. */
export type UsersSectionKind = "role" | "user" | "user_role";

/**
 * One bounded NDJSON batch of ONE member kind (TASK-564). The caller (05's
 * pre-restore pass) streams each member's lines in <= STAGING_BATCH batches —
 * never the whole users/RBAC matrix in memory. The helper parses + normalizes
 * each line here (the single reject-unknown seam) and stages it.
 */
export type UsersSectionBatch = Readonly<{
  kind: UsersSectionKind;
  lines: readonly string[];
}>;

// Parse an NDJSON line with a coded failure (never a raw SyntaxError).
const parseStagedLine = (line: string): unknown => {
  try {
    return JSON.parse(line);
  } catch {
    throw new Error("backup_restore_invalid_artifact");
  }
};

type StagingInsertRow = typeof backupUsersStaging.$inferInsert;

// Normalized rows -> run-scoped staging columns (kind-specific payload).
const stagedRoleRow = (runId: string, row: RoleRow): StagingInsertRow => ({
  runId,
  kind: "role",
  roleId: row.id,
  roleName: row.name,
  roleDescription: row.description,
  rolePermissions: row.permissions,
  createdAt: row.createdAt,
});

const stagedUserRow = (runId: string, row: UserRow): StagingInsertRow => ({
  runId,
  kind: "user",
  userId: row.id,
  userEmail: row.email,
  userEmailHash: row.emailHash,
  userEmailEncrypted: row.emailEncrypted,
  userPasswordHash: row.passwordHash,
  userName: row.name,
  userStatus: row.status,
  createdAt: row.createdAt,
  updatedAt: row.updatedAt,
  lastLoginAt: row.lastLoginAt,
});

const stagedUserRoleRow = (runId: string, row: UserRoleRow): StagingInsertRow => ({
  runId,
  kind: "user_role",
  userId: row.userId,
  roleId: row.roleId,
});

// tx.execute returns the postgres-js row array for a SELECT; narrow it safely.
const asRows = (result: unknown): readonly Record<string, unknown>[] =>
  Array.isArray(result) ? (result as Record<string, unknown>[]) : [];

/**
 * Opt-in, staged restore of the users section inside the ONE outer restore tx
 * (TASK-564). The archived section is streamed into the persistent, run-scoped
 * `backup_users_staging` table in bounded batches (never materialized as full
 * arrays), then the whole-set guards (natural-key collision, FK-missing roleId,
 * global admin-lockout), the staging->final upsert and the user_roles reconcile
 * run as set-based SQL. Every failure rolls back the outer tx (staging rows
 * included); the run-scoped cleanup is idempotent on retry.
 */
export async function restoreUsersSectionTx(
  tx: DbTransaction,
  opts: { restoreUsers: boolean; confirm: boolean; runId: string },
  stream: AsyncIterable<UsersSectionBatch>
): Promise<{ usersRestored: number; rolesRestored: number }> {
  if (!opts.restoreUsers) return { usersRestored: 0, rolesRestored: 0 };
  if (!opts.confirm) throw new Error("backup_restore_confirmation_required");

  // 0. Idempotent run-scoped cleanup: a stale staging row set for this runId
  //    (retry, or a concurrent duplicate run) must never leak into the guards.
  await tx.delete(backupUsersStaging).where(eq(backupUsersStaging.runId, opts.runId));

  // 1. Stream the archived section into backup_users_staging. The caller yields
  //    <= STAGING_BATCH lines per batch; the insert re-chunks defensively so a
  //    hostile caller batch can never exceed the bind bound. Only counts
  //    accumulate in memory — never the rows.
  let usersStaged = 0;
  let rolesStaged = 0;
  for await (const batch of stream) {
    const rows: StagingInsertRow[] = [];
    for (const line of batch.lines) {
      const raw = parseStagedLine(line);
      if (batch.kind === "role") rows.push(stagedRoleRow(opts.runId, normalizeRoleRow(raw)));
      else if (batch.kind === "user") rows.push(stagedUserRow(opts.runId, normalizeUserRow(raw)));
      else rows.push(stagedUserRoleRow(opts.runId, normalizeUserRoleRow(raw)));
    }
    if (rows.length === 0) continue;
    for (const insertBatch of chunk(rows, STAGING_BATCH)) {
      await tx.insert(backupUsersStaging).values(insertBatch);
    }
    if (batch.kind === "user") usersStaged += rows.length;
    else if (batch.kind === "role") rolesStaged += rows.length;
  }

  // 2. Secondary-unique (natural-key) collision guard — set-based, whole-set,
  //    PRE-WRITE. The PK-targeted upsert would otherwise hit Postgres 23505
  //    unique_violation on a same-email/same-name row with a DIFFERENT uuid,
  //    poisoning the single outer tx. Reject the artifact id-faithfully (never
  //    silently reconcile on the natural key). PII-safe: the offending email /
  //    role name is never thrown.
  const [roleClash] = asRows(
    await tx.execute(sql`
      select exists (
        select 1
        from ${backupUsersStaging} s
        join ${roles} r on r.name = s.role_name
        where s.run_id = ${opts.runId}
          and s.kind = 'role'
          and r.id::text <> s.role_id
      ) as clash
    `)
  );
  if (roleClash?.clash === true) throw new Error("backup_restore_invalid_artifact");
  const [userClash] = asRows(
    await tx.execute(sql`
      select exists (
        select 1
        from ${backupUsersStaging} s
        join ${users} u on u.email = s.user_email
        where s.run_id = ${opts.runId}
          and s.kind = 'user'
          and u.id::text <> s.user_id
      ) as clash
    `)
  );
  if (userClash?.clash === true) throw new Error("backup_restore_invalid_artifact");

  // 3. FK-missing roleId guard — set-based, whole-set, scoped to the archived
  //    userIds (mirrors the old allowedRoleIds construction): every staged
  //    user_role.roleId must resolve to a staged role or an already-present
  //    final role.
  const missingRole = asRows(
    await tx.execute(sql`
      select 1
      from ${backupUsersStaging} s
      where s.run_id = ${opts.runId}
        and s.kind = 'user_role'
        and exists (
          select 1 from ${backupUsersStaging} u
          where u.run_id = ${opts.runId} and u.kind = 'user' and u.user_id = s.user_id
        )
        and not exists (
          select 1 from ${backupUsersStaging} r
          where r.run_id = ${opts.runId} and r.kind = 'role' and r.role_id = s.role_id
        )
        and not exists (
          select 1 from ${roles} f where f.id::text = s.role_id
        )
      limit 1
    `)
  );
  if (missingRole.length > 0) throw new Error("backup_restore_invalid_artifact");

  // 3.5 STAGING -> FINAL upsert (set-based INSERT ... SELECT, NEVER delete-all —
  //     users.id is an FK target of many out-of-scope tables). The FK-safe order
  //     is roles -> users -> user_roles, unchanged from the pre-staging path.
  // Set-based INSERT ... SELECT FROM staging (SQL form of insert().select()):
  // the SELECT column ORDER is the positional contract for the table's INSERT
  // column list (roles: id, name, description, permissions, created_at).
  await tx
    .insert(roles)
    .select(
      sql`
      select ${backupUsersStaging.roleId}::uuid,
             ${backupUsersStaging.roleName},
             ${backupUsersStaging.roleDescription},
             ${backupUsersStaging.rolePermissions},
             ${backupUsersStaging.createdAt}
      from ${backupUsersStaging}
      where ${backupUsersStaging.runId} = ${opts.runId}
        and ${backupUsersStaging.kind} = 'role'
    `
    )
    .onConflictDoUpdate({
      target: roles.id,
      set: {
        name: sql`excluded.name`,
        description: sql`excluded.description`,
        permissions: sql`excluded.permissions`,
      },
    });
  await tx
    .insert(users)
    .select(
      sql`
      select ${backupUsersStaging.userId}::uuid,
             ${backupUsersStaging.userEmail},
             ${backupUsersStaging.userEmailHash},
             ${backupUsersStaging.userEmailEncrypted},
             ${backupUsersStaging.userPasswordHash},
             ${backupUsersStaging.userName},
             ${backupUsersStaging.userStatus},
             ${backupUsersStaging.createdAt},
             ${backupUsersStaging.updatedAt},
             ${backupUsersStaging.lastLoginAt}
      from ${backupUsersStaging}
      where ${backupUsersStaging.runId} = ${opts.runId}
        and ${backupUsersStaging.kind} = 'user'
    `
    )
    .onConflictDoUpdate({
      target: users.id,
      set: {
        email: sql`excluded.email`,
        emailHash: sql`excluded."email_hash"`,
        emailEncrypted: sql`excluded."email_encrypted"`,
        passwordHash: sql`excluded."password_hash"`,
        name: sql`excluded.name`,
        status: sql`excluded.status`,
        updatedAt: sql`excluded."updated_at"`,
      },
    });
  // Reconcile user_roles ONLY for the archived users (bounded blast radius):
  // set-based delete of the archived users' assignments, then insert the
  // archive's assignments for those users (composite-pk on-conflict-do-nothing).
  await tx.execute(sql`
    delete from ${userRoles}
    where ${userRoles.userId} in (
      select ${backupUsersStaging.userId}::uuid
      from ${backupUsersStaging}
      where ${backupUsersStaging.runId} = ${opts.runId}
        and ${backupUsersStaging.kind} = 'user'
    )
  `);
  await tx
    .insert(userRoles)
    .select(
      sql`
      select ${backupUsersStaging.userId}::uuid,
             ${backupUsersStaging.roleId}::uuid
      from ${backupUsersStaging}
      where ${backupUsersStaging.runId} = ${opts.runId}
        and ${backupUsersStaging.kind} = 'user_role'
        and exists (
          select 1 from ${backupUsersStaging} u
          where u.run_id = ${opts.runId} and u.kind = 'user' and u.user_id = ${backupUsersStaging.userId}
        )
    `
    )
    .onConflictDoNothing();

  // 4. Admin-lockout guard (same tx, after the upsert): >=1 user holds an admin
  //    role (any status, matching v1 lockout semantics), resolved via
  //    getAdminRoleIds (hasFullAccess only — a role named "admin" alone counts
  //    only if its permissions include "*").
  const adminRoleIds = await getAdminRoleIds(undefined, tx);
  // adminRoleIds is catalog-bounded (a handful of roles), so no chunking needed.
  const admins = adminRoleIds.length
    ? await tx
        .select({ userId: userRoles.userId })
        .from(userRoles)
        .where(inArray(userRoles.roleId, adminRoleIds))
    : [];
  if (new Set(admins.map((r) => r.userId)).size === 0) {
    throw new Error("backup_users_restore_no_admin"); // -> tx rollback, fail-closed
  }

  // 5. Run-scoped staging cleanup (idempotent; the same tx also discards every
  //    staged row on any earlier throw / rollback).
  await tx.delete(backupUsersStaging).where(eq(backupUsersStaging.runId, opts.runId));

  return { usersRestored: usersStaged, rolesRestored: rolesStaged };
}
