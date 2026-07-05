import { eq, sql } from "drizzle-orm";

import { db } from "../../db/client";
import { roles, userRoles, users } from "../../db/schema";
import { hashPassword } from "../auth/password";
import { buildEmailFields, normalizeEmail } from "../security/piiEmail";

// db/client exports ONLY `db`; there is no `DbTransaction` export. Mirror the
// local alias from settingsService.ts instead of importing it.
type DbTransaction = Parameters<Parameters<typeof db.transaction>[0]>[0];

async function countUsersOn(exec: typeof db | DbTransaction): Promise<number> {
  const [row] = await exec.select({ count: sql<number>`count(*)` }).from(users);
  return Number(row?.count ?? 0);
}

export async function countUsers(): Promise<number> {
  return countUsersOn(db);
}

export async function countUsersTx(tx: DbTransaction): Promise<number> {
  // Used by 02-L01 inside the create-first-admin transaction for the
  // in-transaction TOCTOU re-check under pg_advisory_xact_lock.
  return countUsersOn(tx);
}

export async function isFirstRun(): Promise<boolean> {
  return (await countUsers()) === 0;
}

// ---------------------------------------------------------------------------
// TASK-482-02-L01: first-admin bootstrap.
// ---------------------------------------------------------------------------

export type CreateFirstAdminInput = { name: string; email: string; password: string };

export type CreateFirstAdminResult = {
  id: string;
  email: string;
  name: string;
  status: "active";
  roleId: string;
};

// Injectable seams (AuthRouteDeps pattern, core/server/routes/authRoutes.ts:40-54)
// so tests exercise the logic without ever touching the shared `users` table.
export type CreateFirstAdminDeps = {
  db?: typeof db;
  isFirstRun?: typeof isFirstRun;
  countUsersTx?: typeof countUsersTx;
  hashPassword?: typeof hashPassword;
};

// Constant advisory-lock key pair (two-int form, matching
// core/server/startupMigrations.ts:12-13 / startupAssistantDocs.ts:19-20).
// Shares the project namespace; the key is unique to the first-admin bootstrap.
const FIRST_ADMIN_LOCK_NAMESPACE = 20260604;
const FIRST_ADMIN_LOCK_KEY = 482;

const MIN_PASSWORD_LENGTH = 8;

function isUniqueViolation(error: unknown): boolean {
  if (!error || typeof error !== "object") return false;
  const code = (error as { code?: unknown }).code;
  if (code === "23505") return true;
  const message = error instanceof Error ? error.message : "";
  return /duplicate key|unique constraint/i.test(message);
}

/**
 * Create the first usable admin account (role `["*"]`, `status: "active"`,
 * argon2 password hash) the way `seedAdmin()` does — NOT via
 * `usersService.createUser`, which produces a `pending` user with a random
 * password. The no-users invariant is enforced fail-closed: cheaply before the
 * transaction, then race-proof inside it via `pg_advisory_xact_lock` (which
 * serializes concurrent installers so a `count(*)` re-check under READ COMMITTED
 * is authoritative) + a `countUsersTx` re-check.
 */
export async function createFirstAdmin(
  input: CreateFirstAdminInput,
  deps: CreateFirstAdminDeps = {}
): Promise<CreateFirstAdminResult> {
  const {
    db: database = db,
    isFirstRun: firstRun = isFirstRun,
    countUsersTx: countTx = countUsersTx,
    hashPassword: hash = hashPassword,
  } = deps;

  // Cheap pre-check (fast fail before hashing).
  if (!(await firstRun())) throw new Error("first_run_unavailable");

  const email = normalizeEmail(input.email);
  const name = input.name.trim();
  if (!email || !name || input.password.length < MIN_PASSWORD_LENGTH) {
    throw new Error("first_admin_invalid");
  }

  const emailFields = buildEmailFields(email);
  const passwordHash = await hash(input.password); // argon2, before tx (outside the lock)

  try {
    return await database.transaction(async (tx) => {
      // 1) Serialize concurrent installers. Without this, READ COMMITTED lets two
      //    transactions both read count=0 and both commit (different emails).
      await tx.execute(
        sql`select pg_advisory_xact_lock(${FIRST_ADMIN_LOCK_NAMESPACE}, ${FIRST_ADMIN_LOCK_KEY})`
      );

      // 2) TOCTOU re-check: authoritative now that the lock serializes us.
      if ((await countTx(tx)) !== 0) throw new Error("first_run_unavailable");

      // Ensure the admin role exists (seed.ts pattern).
      let [role] = await tx.select().from(roles).where(eq(roles.name, "admin"));
      if (!role) {
        [role] = await tx
          .insert(roles)
          .values({ name: "admin", permissions: ["*"] })
          .returning();
      }
      if (!role) throw new Error("first_admin_create_failed");

      const [user] = await tx
        .insert(users)
        .values({
          email: emailFields.email,
          emailHash: emailFields.emailHash,
          emailEncrypted: emailFields.emailEncrypted,
          name,
          passwordHash,
          status: "active", // NOT the createUser default "pending"
          createdAt: new Date(),
          updatedAt: new Date(),
        })
        .returning();
      if (!user) throw new Error("first_admin_create_failed");

      await tx.insert(userRoles).values({ userId: user.id, roleId: role.id }).onConflictDoNothing();

      return { id: user.id, email, name, status: "active" as const, roleId: role.id };
    });
  } catch (error) {
    // Defence in depth for the same-email race: a unique-violation on email is
    // surfaced as `first_run_unavailable`, though the advisory lock — not the
    // unique index — is the primary defence.
    if (isUniqueViolation(error)) throw new Error("first_run_unavailable");
    throw error;
  }
}
