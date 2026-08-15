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
import { asc, getTableColumns, gt, inArray, sql } from "drizzle-orm";
import type { AnyColumn } from "drizzle-orm";
import type { PgTable, SelectedFields } from "drizzle-orm/pg-core";

import { db } from "../../db/client";
import { roles, userRoles, users } from "../../db/schema";
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
// Restore — opt-in, upsert, privilege- & lockout-safe (tx-scoped)
// ---------------------------------------------------------------------------

/** A trivial pure array splitter for the bounded IN-list / upsert batches. */
export function chunk<T>(a: T[], n: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < a.length; i += n) out.push(a.slice(i, i + n));
  return out;
}

const BATCH = 500; // bind-parameter bound for archive-derived IN lists + upserts

/**
 * Opt-in, upsert-based restore of the users section inside the ONE outer restore
 * tx. Fail-closed correctness guards (natural-key collision, FK-missing roleId,
 * global admin-lockout) run BEFORE any write and require the WHOLE archived set
 * in hand — hence the deliberately materialized section arrays (the parent's
 * owner-scoped memory exception for the users section only; content/media still
 * stream + batch).
 */
export async function restoreUsersSectionTx(
  tx: DbTransaction,
  section: { users: UserRow[]; roles: RoleRow[]; userRoles: UserRoleRow[] },
  opts: { restoreUsers: boolean; confirm: boolean }
): Promise<{ usersRestored: number; rolesRestored: number }> {
  if (!opts.restoreUsers) return { usersRestored: 0, rolesRestored: 0 };
  if (!opts.confirm) throw new Error("backup_restore_confirmation_required");

  // 0. Secondary-unique (natural-key) collision guard — fail-closed, PRE-WRITE.
  //    The PK-targeted upsert would otherwise hit Postgres 23505 unique_violation
  //    on a same-email/same-name row with a DIFFERENT uuid, poisoning the single
  //    outer tx. Reject the artifact id-faithfully (never silently reconcile on
  //    the natural key). PII-safe: the offending email/role name is never thrown.
  const roleNames = section.roles.map((r) => r.name);
  if (roleNames.length) {
    const existingRoles: Array<{ id: string; name: string }> = [];
    for (const batch of chunk(roleNames, BATCH)) {
      existingRoles.push(
        ...(await tx
          .select({ id: roles.id, name: roles.name })
          .from(roles)
          .where(inArray(roles.name, batch)))
      );
    }
    const archivedRoleIdByName = new Map(section.roles.map((r) => [r.name, r.id]));
    if (existingRoles.some((r) => archivedRoleIdByName.get(r.name) !== r.id)) {
      throw new Error("backup_restore_invalid_artifact"); // roles.name natural-key clash
    }
  }
  const emails = section.users.map((u) => u.email);
  if (emails.length) {
    const existingUsers: Array<{ id: string; email: string }> = [];
    for (const batch of chunk(emails, BATCH)) {
      existingUsers.push(
        ...(await tx
          .select({ id: users.id, email: users.email })
          .from(users)
          .where(inArray(users.email, batch)))
      );
    }
    const archivedUserIdByEmail = new Map(section.users.map((u) => [u.email, u.id]));
    if (existingUsers.some((u) => archivedUserIdByEmail.get(u.email) !== u.id)) {
      throw new Error("backup_restore_invalid_artifact"); // users.email natural-key clash
    }
  }

  // 1. UPSERT roles by pk (insert-or-update) — NEVER delete-all (FK trap).
  //    Every updated column references excluded.*; createdAt stays the original.
  for (const batch of chunk(section.roles, BATCH)) {
    await tx
      .insert(roles)
      .values(batch)
      .onConflictDoUpdate({
        target: roles.id,
        set: {
          name: sql`excluded.name`,
          description: sql`excluded.description`,
          permissions: sql`excluded.permissions`,
        },
      });
  }
  // 2. UPSERT users by pk. passwordHash/email* written verbatim (opaque).
  for (const batch of chunk(section.users, BATCH)) {
    await tx
      .insert(users)
      .values(batch)
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
  }
  // 3. Reconcile user_roles ONLY for the archived users (bounded blast radius).
  const archivedUserIds = section.users.map((u) => u.id);
  if (archivedUserIds.length) {
    const archivedUserIdsSet = new Set(archivedUserIds);
    const scopedUserRoles = section.userRoles.filter((ur) => archivedUserIdsSet.has(ur.userId));
    if (scopedUserRoles.length) {
      // 3a. FK-safety pre-write guard: every roleId must resolve to a role that
      //     exists after step 1 = archived ∪ already-present target roles.
      const allowedRoleIds = new Set(section.roles.map((r) => r.id));
      const missingRoleIds = [
        ...new Set(
          scopedUserRoles.map((ur) => ur.roleId).filter((rid) => !allowedRoleIds.has(rid))
        ),
      ];
      if (missingRoleIds.length) {
        const existingRoleRows: Array<{ id: string }> = [];
        for (const batch of chunk(missingRoleIds, BATCH)) {
          existingRoleRows.push(
            ...(await tx.select({ id: roles.id }).from(roles).where(inArray(roles.id, batch)))
          );
        }
        for (const row of existingRoleRows) allowedRoleIds.add(row.id);
      }
      if (scopedUserRoles.some((ur) => !allowedRoleIds.has(ur.roleId))) {
        throw new Error("backup_restore_invalid_artifact"); // FK-missing roleId, PII-free
      }
    }
    // BATCHED delete (bounded IN list): one giant inArray could exceed bind limits.
    for (const batch of chunk(archivedUserIds, BATCH)) {
      await tx.delete(userRoles).where(inArray(userRoles.userId, batch));
    }
    for (const batch of chunk(scopedUserRoles, BATCH)) {
      await tx.insert(userRoles).values(batch).onConflictDoNothing(); // composite-pk safety
    }
  }
  // 4. Admin-lockout guard (same tx, before commit): >=1 user holds an admin
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
  return { usersRestored: section.users.length, rolesRestored: section.roles.length };
}
