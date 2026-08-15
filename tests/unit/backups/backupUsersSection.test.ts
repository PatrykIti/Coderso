/**
 * Backup v2 users + RBAC section tests (TASK-511-04).
 *
 * Bun lane (DB writes, tx rollback seams, streaming, crypto-adjacent gating).
 * Shared-DB safety: NEVER truncate identity tables — uniquely-scoped fixtures
 * (email `bkp-511-04-<uuid>@example.test`, role name `bkp-511-04-<uuid>`), delete
 * ONLY created rows in afterEach, and every destructive restore assertion runs
 * inside a deliberately rolled-back transaction.
 */
import { createHash, randomUUID } from "node:crypto";

import { afterAll, afterEach, beforeAll, expect, test } from "bun:test";
import { and, eq, inArray } from "drizzle-orm";

import { db } from "../../../core/db/client";
import { roles, userRoles, users } from "../../../core/db/schema";
import { createBackupSchema } from "../../../core/server/validation/backupSchemas";
import { normalizeBackupInclude } from "../../../core/services/backups/backupService";
import type {
  ArchiveTableManifest,
  ExportEngine,
} from "../../../core/services/backups/backupArchive";
import { getAdminRoleIds } from "../../../core/services/admin/rolesService";
import {
  ROLES_MEMBER_NAME,
  USER_ROLES_MEMBER_NAME,
  USERS_MEMBER_NAME,
} from "../../../core/services/backups/backupArchive";
import {
  assertUsersEncryptionAllowed,
  chunk,
  exportUsersSection,
  normalizeRoleRow,
  normalizeUserRoleRow,
  normalizeUserRow,
  restoreUsersSectionTx,
} from "../../../core/services/backups/backupUsersSection";

// ---------------------------------------------------------------------------
// Fixture hygiene
// ---------------------------------------------------------------------------

const runId = randomUUID();
const scopedEmail = (label: string) => `bkp-511-04-${runId}-${label}@example.test`;
const scopedRole = (label: string) => `bkp-511-04-${runId}-${label}`;

const seededUserIds: string[] = [];
const seededRoleIds: string[] = [];

// Ambient admin (TASK-511-04): the admin-lockout guard and the no-admin test
// need >=1 full-access holder in the ACTIVE schema. The public dev schema has
// one from real installs, but lane worker schemas are fresh, so the suite seeds
// its own scoped admin in beforeAll and removes it in afterAll. Tracked in a
// SEPARATE list so afterEach's fixture cleanup never deletes it mid-suite.
const ADMIN_EMAIL = `bkp-511-04-admin-${runId}@example.test`;
const ADMIN_ROLE = `bkp-511-04-admin-${runId}`;
const adminUserIds: string[] = [];
const adminRoleIdsScoped: string[] = [];

beforeAll(async () => {
  const [role] = await db
    .insert(roles)
    .values({ name: ADMIN_ROLE, permissions: ["*"] })
    .returning({ id: roles.id });
  const [user] = await db
    .insert(users)
    .values({ email: ADMIN_EMAIL, passwordHash: "hash-admin", name: "Ambient Admin" })
    .returning({ id: users.id });
  await db.insert(userRoles).values({ userId: user.id, roleId: role.id });
  adminUserIds.push(user.id);
  adminRoleIdsScoped.push(role.id);
});

afterAll(async () => {
  if (adminUserIds.length) {
    await db.delete(userRoles).where(inArray(userRoles.userId, adminUserIds));
    await db.delete(users).where(inArray(users.id, adminUserIds));
  }
  if (adminRoleIdsScoped.length) {
    await db.delete(roles).where(inArray(roles.id, adminRoleIdsScoped));
  }
  adminUserIds.length = 0;
  adminRoleIdsScoped.length = 0;
});

const seedUser = async (email: string, passwordHash: string, name?: string) => {
  const [row] = await db
    .insert(users)
    .values({ email, passwordHash, name: name ?? null })
    .returning({ id: users.id, email: users.email });
  seededUserIds.push(row.id);
  return row;
};

const seedRole = async (name: string, permissions: string[]) => {
  const [row] = await db
    .insert(roles)
    .values({ name, permissions })
    .returning({ id: roles.id, name: roles.name });
  seededRoleIds.push(row.id);
  return row;
};

const assignRole = async (userId: string, roleId: string) => {
  await db.insert(userRoles).values({ userId, roleId });
};

afterEach(async () => {
  if (seededUserIds.length) {
    await db.delete(users).where(inArray(users.id, seededUserIds)); // cascades user_roles
  }
  if (seededRoleIds.length) {
    await db.delete(roles).where(inArray(roles.id, seededRoleIds)); // cascades user_roles
  }
  seededUserIds.length = 0;
  seededRoleIds.length = 0;
});

// Run `fn` inside a transaction that ALWAYS rolls back (no committed mutation of
// the shared identity tables). Observations made in-tx are captured via `capture`.
const inRolledBackTx = async <T>(
  fn: (tx: Parameters<Parameters<typeof db.transaction>[0]>[0]) => Promise<void>,
  capture?: (tx: Parameters<Parameters<typeof db.transaction>[0]>[0]) => Promise<T>
): Promise<T | undefined> => {
  let observed: T | undefined;
  await expect(
    db.transaction(async (tx) => {
      await fn(tx);
      if (capture) observed = await capture(tx);
      throw new Error("rollback_marker");
    })
  ).rejects.toThrow("rollback_marker");
  return observed;
};

// ---------------------------------------------------------------------------
// Engine double (01's ExportEngine seam): spools NDJSON + returns manifests
// ---------------------------------------------------------------------------

const makeEngineDouble = () => {
  const members = new Map<string, string>();
  const manifests: Array<{ manifest: ArchiveTableManifest; text: string }> = [];
  const engine: ExportEngine = {
    writer: {
      appendStream: async () => {
        throw new Error("unused");
      },
    },
    async appendNdjson(memberName, rows) {
      const lines: string[] = [];
      for await (const row of rows) lines.push(JSON.stringify(row));
      const text = lines.length ? `${lines.join("\n")}\n` : "";
      const bytes = Buffer.from(text);
      const manifest: ArchiveTableManifest = {
        key: memberName.replace(/\.ndjson$/, ""),
        member: memberName,
        rowCount: lines.length,
        byteSize: bytes.length,
        sha256: createHash("sha256").update(bytes).digest("hex"),
      };
      members.set(memberName, text);
      manifests.push({ manifest, text });
      return manifest;
    },
  };
  return { engine, members, manifests };
};

const parseMember = (text: string): Array<Record<string, unknown>> =>
  text
    .split("\n")
    .filter((l) => l.trim() !== "")
    .map((l) => JSON.parse(l));

// ---------------------------------------------------------------------------
// 1. Allowlist round-trip
// ---------------------------------------------------------------------------

test("include allowlist accepts users; schema enum + maxItems updated; bogus still rejected", () => {
  const include = normalizeBackupInclude(["database", "media", "users"]);
  expect(include).toEqual(["database", "media", "users"]);
  expect(() => normalizeBackupInclude(["bogus"])).toThrow("backup_include_invalid");
  const items = createBackupSchema.properties.include as {
    maxItems: number;
    items: { enum: string[] };
  };
  expect(items.maxItems).toBe(4);
  expect(items.items.enum).toContain("users");
  expect(items.items.enum).toContain("database");
});

// ---------------------------------------------------------------------------
// 2. Encrypted-only export gate
// ---------------------------------------------------------------------------

test("assertUsersEncryptionAllowed fails closed without encryption", () => {
  expect(() => assertUsersEncryptionAllowed(["users"], { enabled: false })).toThrow(
    "backup_users_requires_encryption"
  );
  expect(() => assertUsersEncryptionAllowed(["database", "users"], { enabled: false })).toThrow(
    "backup_users_requires_encryption"
  );
  expect(() => assertUsersEncryptionAllowed(["users"], { enabled: true })).not.toThrow();
  expect(() => assertUsersEncryptionAllowed(["database"], { enabled: false })).not.toThrow();
});

// ---------------------------------------------------------------------------
// 3. Round-trip fidelity + opaque hash (rolled-back restore)
// ---------------------------------------------------------------------------

test("export→normalize→restore round-trips rows; hash opaque; manifest hash-free", async () => {
  const hash = "$argon2id$v=19$m=65536,t=3,p=1$opaque-hash-blob";
  const user = await seedUser(scopedEmail("rt"), hash, "Round Trip");
  const role = await seedRole(scopedRole("rt-role"), ["content:read", "content:write"]);
  await assignRole(user.id, role.id);

  const { engine, members, manifests } = makeEngineDouble();
  const counts = await exportUsersSection(engine);
  // Shared-DB stream: the section contains the whole identity set (fixture + any
  // other agents' rows), so counts are bounded relative, never absolute.
  expect(counts.users).toBeGreaterThanOrEqual(1);
  expect(counts.roles).toBeGreaterThanOrEqual(1);
  expect(counts.userRoles).toBeGreaterThanOrEqual(1);

  // The manifest bytes/counts contain NO password_hash substring (hashes never
  // leave the encrypted NDJSON stream into the manifest).
  const manifestText = JSON.stringify(manifests.map((m) => m.manifest));
  expect(manifestText).not.toContain("password_hash");
  expect(manifestText).not.toContain(hash);
  // NDJSON carries the opaque hash verbatim (inside the encrypted stream).
  const usersText = members.get(USERS_MEMBER_NAME)!;
  expect(usersText).toContain(hash);
  expect(usersText).toContain(user.email);
  expect(
    manifests.find((m) => m.manifest.member === USERS_MEMBER_NAME)!.manifest.rowCount
  ).toBeGreaterThanOrEqual(1);

  // normalize the exported NDJSON back into rows; scope the restore to the
  // fixture rows (round-trip fidelity), not the whole shared identity set.
  const exportedUsers = parseMember(usersText).map(normalizeUserRow);
  const exportedRoles = parseMember(members.get(ROLES_MEMBER_NAME)!).map(normalizeRoleRow);
  const exportedLinks = parseMember(members.get(USER_ROLES_MEMBER_NAME)!).map(normalizeUserRoleRow);
  const seeded = exportedUsers.find((u) => u.id === user.id);
  const seededRole = exportedRoles.find((r) => r.id === role.id);
  const seededLink = exportedLinks.find((ur) => ur.userId === user.id && ur.roleId === role.id);
  expect(seeded).toBeDefined();
  expect(seededRole).toBeDefined();
  expect(seededLink).toBeDefined();
  const section = { users: [seeded!], roles: [seededRole!], userRoles: [seededLink!] };

  // Restore inside a rolled-back tx; observe rows in-tx, then roll back.
  const observed = await inRolledBackTx(
    async (tx) => {
      const res = await restoreUsersSectionTx(tx, section, { restoreUsers: true, confirm: true });
      expect(res).toEqual({ usersRestored: 1, rolesRestored: 1 });
    },
    async (tx) => {
      const [u] = await tx.select().from(users).where(eq(users.id, user.id));
      const [r] = await tx.select().from(roles).where(eq(roles.id, role.id));
      const [ur] = await tx
        .select()
        .from(userRoles)
        .where(and(eq(userRoles.userId, user.id), eq(userRoles.roleId, role.id)));
      return { u, r, ur };
    }
  );
  expect(observed!.u.passwordHash).toBe(hash); // byte-identical, opaque
  expect(observed!.u.email).toBe(user.email);
  expect(observed!.r.name).toBe(role.name);
  expect(observed!.r.permissions).toEqual(["content:read", "content:write"]);
  expect(observed!.ur).toBeDefined();

  // NOTHING was committed by the restore: the fixture still exists exactly once
  // (the seeded row; no restore ghost row, no committed assignment deletion).
  const after = await db.select({ id: users.id }).from(users).where(eq(users.id, user.id));
  expect(after.length).toBe(1);
});

// ---------------------------------------------------------------------------
// 4. No-admin fail-closed (admin-holder delete inside the rolled-back tx)
// ---------------------------------------------------------------------------

test("restore leaving zero admins throws backup_users_restore_no_admin (rolled back)", async () => {
  const section = {
    users: [
      normalizeUserRow({
        id: randomUUID(),
        email: scopedEmail("noadmin"),
        emailHash: null,
        emailEncrypted: null,
        passwordHash: "hash-noadmin",
        name: null,
        status: "active",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        lastLoginAt: null,
      }),
    ],
    roles: [
      normalizeRoleRow({
        id: randomUUID(),
        name: scopedRole("noadmin-role"),
        description: null,
        permissions: ["content:read"],
        createdAt: new Date().toISOString(),
      }),
    ],
    userRoles: [],
  };

  await expect(
    db.transaction(async (tx) => {
      // Zero out the admin set INSIDE the tx (never committed — the throw rolls back).
      const adminRoleIds = await getAdminRoleIds(undefined, tx);
      await tx.delete(userRoles).where(inArray(userRoles.roleId, adminRoleIds));
      await restoreUsersSectionTx(tx, section, { restoreUsers: true, confirm: true });
    })
  ).rejects.toThrow("backup_users_restore_no_admin");

  // The admin-holder delete + upsert were discarded: the real admin is untouched.
  const adminRoleIds = await getAdminRoleIds();
  const admins = adminRoleIds.length
    ? await db
        .select({ userId: userRoles.userId })
        .from(userRoles)
        .where(inArray(userRoles.roleId, adminRoleIds))
    : [];
  expect(new Set(admins.map((r) => r.userId)).size).toBeGreaterThan(0);
});

// ---------------------------------------------------------------------------
// 5. No privilege escalation
// ---------------------------------------------------------------------------

test("forged permission tokens are dropped; untouched accounts keep their roles", async () => {
  // Forged permissions: catalog-filtered, "*" collapses only when literally present.
  const forged = normalizeRoleRow({
    id: randomUUID(),
    name: scopedRole("forged"),
    description: null,
    permissions: ["content:write", "totally_forged_perm"],
    createdAt: new Date().toISOString(),
  });
  expect(forged.permissions).toEqual(["content:write"]);
  const full = normalizeRoleRow({
    id: randomUUID(),
    name: scopedRole("full"),
    description: null,
    permissions: ["content:write", "*", "forged"],
    createdAt: new Date().toISOString(),
  });
  expect(full.permissions).toEqual(["*"]);

  // Untouched account keeps its roles: seed a user+role+assignment (committed),
  // then restore an archive containing a DIFFERENT user inside a rolled-back tx.
  const outsider = await seedUser(scopedEmail("outsider"), "hash-outsider");
  const outsiderRole = await seedRole(scopedRole("outsider-role"), ["content:read"]);
  await assignRole(outsider.id, outsiderRole.id);

  const archivedUserId = randomUUID();
  const archivedRoleId = randomUUID();
  const section = {
    users: [
      normalizeUserRow({
        id: archivedUserId,
        email: scopedEmail("archived"),
        emailHash: null,
        emailEncrypted: null,
        passwordHash: "hash-archived",
        name: null,
        status: "active",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        lastLoginAt: null,
      }),
    ],
    roles: [
      normalizeRoleRow({
        id: archivedRoleId,
        name: scopedRole("archived-role"),
        description: null,
        permissions: ["content:read"],
        createdAt: new Date().toISOString(),
      }),
    ],
    userRoles: [{ userId: archivedUserId, roleId: archivedRoleId }],
  };

  await inRolledBackTx(async (tx) => {
    await restoreUsersSectionTx(tx, section, { restoreUsers: true, confirm: true });
    // The outsider's assignment was NOT touched (reconcile is scoped to archived users).
    const outsiderAssignments = await tx
      .select()
      .from(userRoles)
      .where(eq(userRoles.userId, outsider.id));
    expect(outsiderAssignments.map((r) => r.roleId)).toEqual([outsiderRole.id]);
  });
});

// ---------------------------------------------------------------------------
// 6. Opt-in / confirm gating
// ---------------------------------------------------------------------------

test("restoreUsers false is a no-op; confirm false fails closed", async () => {
  await inRolledBackTx(async (tx) => {
    const noop = await restoreUsersSectionTx(
      tx,
      { users: [], roles: [], userRoles: [] },
      {
        restoreUsers: false,
        confirm: false,
      }
    );
    expect(noop).toEqual({ usersRestored: 0, rolesRestored: 0 });
  });
  await expect(
    db.transaction(async (tx) => {
      await restoreUsersSectionTx(
        tx,
        { users: [], roles: [], userRoles: [] },
        {
          restoreUsers: true,
          confirm: false,
        }
      );
    })
  ).rejects.toThrow("backup_restore_confirmation_required");
});

// ---------------------------------------------------------------------------
// 7. Reject-unknown
// ---------------------------------------------------------------------------

test("normalizers reject unknown keys and missing notNull columns", () => {
  const base = {
    id: randomUUID(),
    email: scopedEmail("ru"),
    emailHash: null,
    emailEncrypted: null,
    passwordHash: "hash",
    name: null,
    status: "active",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    lastLoginAt: null,
  };
  expect(() => normalizeUserRow({ ...base, sneaky: 1 })).toThrow("backup_restore_invalid_artifact");
  expect(() => normalizeUserRow({ ...base, passwordHash: undefined })).toThrow(
    "backup_restore_invalid_artifact"
  );
  expect(() => normalizeUserRow("nope")).toThrow("backup_restore_invalid_artifact");
  expect(() =>
    normalizeRoleRow({
      id: randomUUID(),
      name: "x",
      description: null,
      permissions: ["content:read"],
      createdAt: new Date().toISOString(),
      extra: [],
    })
  ).toThrow("backup_restore_invalid_artifact");
  expect(() => normalizeRoleRow({ id: randomUUID(), description: null, permissions: [] })).toThrow(
    "backup_restore_invalid_artifact"
  );
  expect(() =>
    normalizeUserRoleRow({ userId: randomUUID(), roleId: randomUUID(), extra: true })
  ).toThrow("backup_restore_invalid_artifact");
  expect(() => normalizeUserRoleRow({ userId: randomUUID() })).toThrow(
    "backup_restore_invalid_artifact"
  );
});

// ---------------------------------------------------------------------------
// 8. Secondary-unique (natural-key) collision — fail-closed, PII-free
// ---------------------------------------------------------------------------

test("same email/role name with a DIFFERENT id is rejected before any write", async () => {
  const fixtureUser = await seedUser(scopedEmail("clash"), "hash-clash");
  const fixtureRole = await seedRole(scopedRole("clash-role"), ["content:read"]);

  // Role-name clash: same name, different id.
  const roleClashSection = {
    users: [
      normalizeUserRow({
        id: fixtureUser.id, // same user id (irrelevant to the role clash)
        email: fixtureUser.email,
        emailHash: null,
        emailEncrypted: null,
        passwordHash: "hash-clash",
        name: null,
        status: "active",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        lastLoginAt: null,
      }),
    ],
    roles: [
      normalizeRoleRow({
        id: randomUUID(), // DIFFERENT id
        name: fixtureRole.name,
        description: null,
        permissions: ["content:read"],
        createdAt: new Date().toISOString(),
      }),
    ],
    userRoles: [],
  };
  await expect(
    db.transaction(async (tx) => {
      await restoreUsersSectionTx(tx, roleClashSection, { restoreUsers: true, confirm: true });
    })
  ).rejects.toThrow("backup_restore_invalid_artifact");

  // Email clash: same email, different id.
  const emailClashSection = {
    users: [
      normalizeUserRow({
        id: randomUUID(), // DIFFERENT id
        email: fixtureUser.email,
        emailHash: null,
        emailEncrypted: null,
        passwordHash: "hash-clash",
        name: null,
        status: "active",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        lastLoginAt: null,
      }),
    ],
    roles: [
      normalizeRoleRow({
        id: fixtureRole.id,
        name: fixtureRole.name,
        description: null,
        permissions: ["content:read"],
        createdAt: new Date().toISOString(),
      }),
    ],
    userRoles: [],
  };
  let emailClashMessage = "";
  try {
    await db.transaction(async (tx) => {
      await restoreUsersSectionTx(tx, emailClashSection, { restoreUsers: true, confirm: true });
    });
    throw new Error("expected_backup_restore_invalid_artifact");
  } catch (e) {
    emailClashMessage = (e as Error).message;
    expect(emailClashMessage).toBe("backup_restore_invalid_artifact");
  }
  // PII-free: neither the email nor the role name is in the thrown message.
  expect(emailClashMessage).not.toContain(fixtureUser.email);
  expect(emailClashMessage).not.toContain(fixtureRole.name);

  // Happy path: same email/name WITH the same id (genuine re-import) passes step 0.
  const happySection = {
    users: [
      normalizeUserRow({
        id: fixtureUser.id,
        email: fixtureUser.email,
        emailHash: null,
        emailEncrypted: null,
        passwordHash: "hash-clash",
        name: null,
        status: "active",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        lastLoginAt: null,
      }),
    ],
    roles: [
      normalizeRoleRow({
        id: fixtureRole.id,
        name: fixtureRole.name,
        description: null,
        permissions: ["content:read"],
        createdAt: new Date().toISOString(),
      }),
    ],
    userRoles: [{ userId: fixtureUser.id, roleId: fixtureRole.id }],
  };
  await inRolledBackTx(async (tx) => {
    const res = await restoreUsersSectionTx(tx, happySection, {
      restoreUsers: true,
      confirm: true,
    });
    expect(res).toEqual({ usersRestored: 1, rolesRestored: 1 });
  });
});

// ---------------------------------------------------------------------------
// chunk helper (transitively covered by the round-trip, plus direct shape)
// ---------------------------------------------------------------------------

test("chunk splits arrays into bounded runs", () => {
  expect(chunk([1, 2, 3, 4, 5], 2)).toEqual([[1, 2], [3, 4], [5]]);
  expect(chunk([], 2)).toEqual([]);
  expect(chunk([1], 2)).toEqual([[1]]);
});
