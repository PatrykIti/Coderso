# TASK-482-02-L01: `createFirstAdmin` service (seed pattern + TOCTOU re-check in tx)
# FileName: TASK-482-02-L01-CreateFirstAdmin-Service.md

**Parent Subtask:** TASK-482-02
**Priority:** High
**Category:** Admin / Onboarding / Auth
**Estimated Effort:** Medium
**Dependencies:** TASK-482-01-L01
**Status:** ✅ Done
**Started:** 2026-07-04
**Completed:** 2026-07-05

---

## Overview

- **Goal:** Create the first usable admin account in one transaction: ensure the
  `admin` role (`permissions: ["*"]`) exists, insert a `users` row with
  `status: "active"` and an argon2 `passwordHash`, assign the role, and make the
  no-users invariant race-proof: take `pg_advisory_xact_lock` on a constant key
  as the **first statement** of the transaction, then re-run the no-users check
  inside it. The advisory lock is what makes the guarantee real — under Postgres
  default `READ COMMITTED`, an in-transaction `count(*)` re-check alone would
  still let two concurrent submissions both read `count = 0`, both insert, and
  both commit when they use different emails.
- **Owning module(s) to create/extend:** `core/services/admin/firstRunService.ts`
  (extend with `createFirstAdmin`), reusing:
  - `hashPassword` from `core/services/auth/password.ts` (same hasher
    `usersService` uses — argon2).
  - `buildEmailFields` / `normalizeEmail` from
    `core/services/security/piiEmail.ts` (PII columns).
  - The role/user/role-assignment pattern from `core/db/seed.ts` (lines 19-68).
  - `countUsersTx` from 01-L01 for the in-transaction guard.
- **Source-of-truth docs:** `_docs/AUTH_SPEC.md`, `_docs/RBAC_SPEC.md`,
  `_docs/SECURITY_SPEC.md`, `_docs/DATA_MODEL.md`.
- **Out-of-scope:** the route, rate-limit, and session issuance (02-L02); the env
  `seedAdmin()` path stays untouched.
- **Coordination:** bound by the "Coordination & Pins" section in
  TASK-482-02-First-Admin-Bootstrap.md (shared remote test DB, forbidden paths,
  changelog pin 1220 at the 09 closure, additive-only shared surfaces, land
  order). No board/changelog edits from this leaf.

## Security Contract

- **Endpoint visibility:** none — service only (the route in 02-L02 owns the
  HTTP surface).
- **Auth model:** the function itself enforces the trust boundary: it **must**
  throw `first_run_unavailable` if any user already exists, both before and
  **inside** the transaction. There is no session/actor — `actorId` is `null` /
  the new user's own id for the audit performed by the caller.
- **RBAC permission(s):** none can be required (no caller session exists); the
  no-users invariant is the substitute authorization.
- **CSRF:** N/A (service).
- **Rate-limit bucket:** N/A here (the `auth` bucket is applied by 02-L02).
- **Validation:** owns its input contract — `{ name, email, password }`. Trim +
  `normalizeEmail`; reject empty name/email (`first_admin_invalid`). Password
  strength is validated by the route schema (02-L02) **and** defensively here
  (min length) so the service is safe if called directly.
- **Anti-abuse (TOCTOU defence):** `pg_advisory_xact_lock(NAMESPACE, KEY)` on a
  constant key pair, taken as the first statement inside the transaction,
  serializes concurrent installers; the loser blocks until the winner commits
  and then fails the `countUsersTx(tx) === 0` re-check with
  `first_run_unavailable`. Do **not** rely on default `READ COMMITTED`
  isolation alone — it does not prevent two transactions from both reading
  `count = 0` — and do not rely on the `users` email-uniqueness constraint
  (`core/db/schema.ts:17`), which only saves the same-email race. Codebase
  precedent for the two-int advisory-lock form:
  `core/server/startupMigrations.ts:99` and
  `core/server/startupAssistantDocs.ts:236`. (Acceptable alternative if the
  lock is rejected in review: `db.transaction(fn, { isolationLevel:
  "serializable" })` — supported by drizzle's pg-core — plus a retry that maps
  serialization failures to `first_run_unavailable`; the advisory lock is
  preferred for determinism.)
- **Secret/PII handling:** the raw password is hashed immediately and never
  logged/returned; email persists only via `buildEmailFields` (hash +
  encrypted). The return value excludes `passwordHash`.

## Implementation Pseudocode

```ts
export type CreateFirstAdminInput = { name: string; email: string; password: string };

// Injectable seams (AuthRouteDeps pattern, core/server/routes/authRoutes.ts:40-54):
// tests exercise the logic without ever touching the shared users table.
export type CreateFirstAdminDeps = {
  db?: typeof db;                       // hoisted mock-db in Vitest; fake tx store in Bun race test
  isFirstRun?: typeof isFirstRun;
  countUsersTx?: typeof countUsersTx;
  hashPassword?: typeof hashPassword;
};

// Constant advisory-lock key pair (two-int form, matching
// core/server/startupMigrations.ts:99 / startupAssistantDocs.ts:236).
const FIRST_ADMIN_LOCK_NAMESPACE = /* module-unique int */;
const FIRST_ADMIN_LOCK_KEY = /* constant int */;

export async function createFirstAdmin(
  input: CreateFirstAdminInput,
  deps: CreateFirstAdminDeps = {}
) {
  const { db: database = db, isFirstRun: firstRun = isFirstRun,
          countUsersTx: countTx = countUsersTx, hashPassword: hash = hashPassword } = deps;

  // Cheap pre-check (fast fail before hashing).
  if (!(await firstRun())) throw new Error("first_run_unavailable");

  const email = normalizeEmail(input.email);
  const name = input.name.trim();
  if (!email || !name || input.password.length < 8) throw new Error("first_admin_invalid");

  const emailFields = buildEmailFields(email);
  const passwordHash = await hash(input.password); // argon2, before tx (outside the lock)

  return database.transaction(async (tx) => {
    // 1) Serialize concurrent installers. Without this, READ COMMITTED lets two
    //    transactions both read count=0 and both commit (different emails).
    await tx.execute(
      sql`select pg_advisory_xact_lock(${FIRST_ADMIN_LOCK_NAMESPACE}, ${FIRST_ADMIN_LOCK_KEY})`
    );

    // 2) TOCTOU re-check: authoritative now that the lock serializes us.
    if ((await countTx(tx)) !== 0) throw new Error("first_run_unavailable");

    // Ensure admin role (seed.ts pattern).
    let [role] = await tx.select().from(roles).where(eq(roles.name, "admin"));
    if (!role) {
      [role] = await tx.insert(roles).values({ name: "admin", permissions: ["*"] }).returning();
    }

    const [user] = await tx
      .insert(users)
      .values({
        email: emailFields.email,
        emailHash: emailFields.emailHash,
        emailEncrypted: emailFields.emailEncrypted,
        name,
        passwordHash,
        status: "active",                // NOT the createUser default "pending"
        createdAt: new Date(),
        updatedAt: new Date(),
      })
      .returning();
    if (!user) throw new Error("first_admin_create_failed");

    await tx.insert(userRoles).values({ userId: user.id, roleId: role.id }).onConflictDoNothing();

    return { id: user.id, email, name, status: "active" as const, roleId: role.id };
  });
}
```

- **Data flow:** input → pre-check → hash → transaction { advisory xact lock →
  re-check → role → user → assignment } → safe summary (no secrets).
- **Error handling (domain codes for `map*Error` at the route):**
  `first_run_unavailable` (409 — already installed), `first_admin_invalid`
  (400), `first_admin_create_failed` (500). A unique-violation on email must
  still be surfaced as `first_run_unavailable` (defence in depth for the
  same-email race), but the advisory lock — not the unique index — is the
  primary defence.
- **Regression-test shape:** first-run state (via injected deps/fixture, see
  below) ⇒ returns active admin with `['*']` role; second call ⇒ throws
  `first_run_unavailable`; assert `status === "active"` and
  `verifyPassword(hash, password)` succeeds (distinguishes it from
  `createUser`'s random password).

## Testing Requirements

> **Shared-DB isolation (mandatory):** Bun-lane tests connect to the ONE remote
> Postgres shared with the owner and the parallel TASK-483/484 streams
> (`tests/utils/db.ts` imports the real `core/db/client`). No test in this leaf
> may delete/truncate `users`, reach a global no-users state, or assert global
> user counts on the shared DB. See "Coordination & Pins" in
> TASK-482-02-First-Admin-Bootstrap.md.

- **Lane (functional):** Vitest service lane —
  `tests/vitest/setup/createFirstAdmin.test.ts`, using the repo's hoisted
  mock-db convention (`vi.hoisted` mock of `core/db/client`, as in
  `tests/vitest/customScreens/customScreenService.test.ts`) and/or the
  injectable `CreateFirstAdminDeps`. Cases: happy path role/perms/status/hash;
  reject when a user already exists; invalid input. Never the real DB.
- **Lane (race):** Bun security lane — `tests/security/firstAdminRace.test.ts`.
  Fire two `createFirstAdmin` calls concurrently **with two DIFFERENT emails**
  (so the advisory lock + re-check, not the email unique index, is what is
  exercised) against an isolated seam: either inject a
  fake-transaction/in-memory store via `CreateFirstAdminDeps`, or use a
  dedicated ephemeral schema/database fixture with self-restoring
  setup/teardown. Assert **exactly one** call succeeds, the other throws
  `first_run_unavailable`, and the fixture's user count is 1 (scoped to the
  fixture — never a global `countUsers()` against the shared DB). Runtime
  concurrency ⇒ Bun lane, not Vitest.
- No migration artifacts (existing `users`/`roles`/`userRoles` tables).
