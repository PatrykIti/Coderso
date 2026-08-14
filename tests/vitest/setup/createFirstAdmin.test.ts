import { beforeAll, expect, test, vi } from "vitest";

// Mirrors firstRunService.test.ts: mock `core/db/client` so importing the
// service never opens (or requires) a DB connection. Every case injects its own
// fake `db` via CreateFirstAdminDeps, so the mock body is never used.
vi.mock("../../../core/db/client", () => ({ db: {} }));

import { roles, userRoles, users } from "../../../core/db/schema";
import { DEFAULT_ADMIN_ROLE_ID } from "../../../core/db/seedConstants";
import {
  createFirstAdmin,
  type CreateFirstAdminDeps,
} from "../../../core/services/admin/firstRunService";
import { verifyPassword } from "../../../core/services/auth/password";

// PII helpers (`buildEmailFields`) resolve HMAC/AES keys at call time. Provide
// deterministic 32-byte keys so this suite is hermetic and never depends on the
// shared environment. No DB is touched: every case runs against an injected
// fake `db`/seam (CreateFirstAdminDeps), never the shared remote Postgres.
beforeAll(() => {
  process.env.PII_HASH_KEY ??= "0".repeat(64);
  process.env.PII_ENC_KEY ??= "1".repeat(64);
});

type RoleRow = { id: string; permissions: string[] };

type Captured = {
  roleInsert: Record<string, unknown> | null;
  userInsert: Record<string, unknown> | null;
  userRoleInsert: Record<string, unknown> | null;
  executes: number;
};

/**
 * TASK-518-02: `createFirstAdmin` resolves the admin role by the stable
 * `DEFAULT_ADMIN_ROLE_ID` (migration-guaranteed) with a select-by-name fallback
 * for pre-518 legacy installs, and NEVER inserts a role itself. The fake db
 * mirrors that two-select order: the FIRST role lookup (by stable id) answers
 * from `stableRole`, and the name fallback from `legacyRole`.
 */
function makeFakeDb({
  stableRole = null,
  legacyRole = null,
}: { stableRole?: RoleRow | null; legacyRole?: RoleRow | null } = {}) {
  const captured: Captured = {
    roleInsert: null,
    userInsert: null,
    userRoleInsert: null,
    executes: 0,
  };

  let roleSelectCount = 0;
  const selectRole = async (): Promise<RoleRow[]> => {
    roleSelectCount += 1;
    if (roleSelectCount === 1) return stableRole ? [stableRole] : [];
    return legacyRole ? [legacyRole] : [];
  };

  const tx = {
    execute: async () => {
      captured.executes += 1;
    },
    select: () => ({
      from: (table: unknown) => ({
        where: async () => (table === roles ? selectRole() : []),
      }),
    }),
    insert: (table: unknown) => ({
      values: (vals: Record<string, unknown>) => {
        if (table === roles) captured.roleInsert = vals;
        else if (table === users) captured.userInsert = vals;
        else if (table === userRoles) captured.userRoleInsert = vals;
        return {
          returning: async () => {
            if (table === roles) return [{ id: "role-1", ...vals }];
            if (table === users) return [{ id: "user-1", ...vals }];
            return [];
          },
          onConflictDoNothing: async () => {},
        };
      },
    }),
  };

  const db = { transaction: async (fn: (t: typeof tx) => unknown) => fn(tx) };
  return { db: db as unknown as NonNullable<CreateFirstAdminDeps["db"]>, captured };
}

const baseInput = { name: "Ada Admin", email: "Ada@Example.com", password: "correct horse" };
const stableRole = { id: DEFAULT_ADMIN_ROLE_ID, permissions: ["*"] };

test("happy path assigns the migration-guaranteed stable-id admin role (no ad-hoc role insert)", async () => {
  const { db, captured } = makeFakeDb({ stableRole });
  const result = await createFirstAdmin(baseInput, {
    db,
    isFirstRun: async () => true,
    countUsersTx: async () => 0,
    // real hashPassword (default) so the stored hash is argon2-verifiable
  });

  expect(result).toEqual({
    id: "user-1",
    email: "ada@example.com", // normalized
    name: "Ada Admin",
    status: "active",
    roleId: DEFAULT_ADMIN_ROLE_ID,
  });
  // Distinguishes this from usersService.createUser's random-password default.
  expect(captured.userInsert?.status).toBe("active");
  const storedHash = captured.userInsert?.passwordHash as string;
  expect(typeof storedHash).toBe("string");
  expect(await verifyPassword(storedHash, baseInput.password)).toBe(true);
  // TASK-518-02: the role comes from the migration; the service never inserts one.
  expect(captured.roleInsert).toBeNull();
  expect(captured.userRoleInsert).toEqual({
    userId: "user-1",
    roleId: DEFAULT_ADMIN_ROLE_ID,
  });
  // advisory lock statement ran as first tx statement
  expect(captured.executes).toBe(1);
});

test("falls back to select-by-name for a legacy random-id admin role (no duplicate, no renumber)", async () => {
  const legacyRole = { id: "0f2c1e9a-0000-4000-8000-0000000000aa", permissions: ["*"] };
  const { db, captured } = makeFakeDb({ legacyRole });
  const result = await createFirstAdmin(baseInput, {
    db,
    isFirstRun: async () => true,
    countUsersTx: async () => 0,
    hashPassword: async () => "hash",
  });
  expect(result.roleId).toBe(legacyRole.id);
  expect(captured.roleInsert).toBeNull(); // never inserts a duplicate role
});

test("fails loud when the admin role is missing entirely (migration invariant violated)", async () => {
  const { db, captured } = makeFakeDb();
  await expect(
    createFirstAdmin(baseInput, {
      db,
      isFirstRun: async () => true,
      countUsersTx: async () => 0,
      hashPassword: async () => "hash",
    })
  ).rejects.toThrow("first_admin_role_missing");
  expect(captured.userInsert).toBeNull(); // never created a user without a role
});

test("rejects with first_run_unavailable when a user already exists (pre-check)", async () => {
  const { db } = makeFakeDb({ stableRole });
  await expect(
    createFirstAdmin(baseInput, {
      db,
      isFirstRun: async () => false,
      countUsersTx: async () => 1,
      hashPassword: async () => "hash",
    })
  ).rejects.toThrow("first_run_unavailable");
});

test("rejects with first_run_unavailable on the in-transaction TOCTOU re-check", async () => {
  // Pre-check passes (stale read), but the re-check under the advisory lock sees a row.
  const { db, captured } = makeFakeDb({ stableRole });
  await expect(
    createFirstAdmin(baseInput, {
      db,
      isFirstRun: async () => true,
      countUsersTx: async () => 1,
      hashPassword: async () => "hash",
    })
  ).rejects.toThrow("first_run_unavailable");
  expect(captured.userInsert).toBeNull(); // never inserted
});

test("maps a unique-violation to first_run_unavailable (same-email race defence)", async () => {
  const { db } = makeFakeDb({ stableRole });
  const failing = {
    transaction: async () => {
      const err = new Error("duplicate key value violates unique constraint");
      (err as { code?: string }).code = "23505";
      throw err;
    },
  } as unknown as NonNullable<CreateFirstAdminDeps["db"]>;
  void db;
  await expect(
    createFirstAdmin(baseInput, {
      db: failing,
      isFirstRun: async () => true,
      countUsersTx: async () => 0,
      hashPassword: async () => "hash",
    })
  ).rejects.toThrow("first_run_unavailable");
});

test.each([
  ["empty name", { ...baseInput, name: "   " }],
  ["empty email", { ...baseInput, email: "  " }],
  ["short password", { ...baseInput, password: "short" }],
])("rejects invalid input (%s) with first_admin_invalid", async (_label, input) => {
  const { db } = makeFakeDb({ stableRole });
  await expect(
    createFirstAdmin(input, {
      db,
      isFirstRun: async () => true,
      countUsersTx: async () => 0,
      hashPassword: async () => "hash",
    })
  ).rejects.toThrow("first_admin_invalid");
});
