# TASK-482-02-L01: `createFirstAdmin` service (seed pattern + TOCTOU re-check in tx)
# FileName: TASK-482-02-L01-CreateFirstAdmin-Service.md

**Parent Subtask:** TASK-482-02
**Priority:** High
**Category:** Admin / Onboarding / Auth
**Estimated Effort:** Medium
**Dependencies:** TASK-482-01-L01
**Status:** ⏳ To Do
**Started:** `<YYYY-MM-DD>`
**Completed:** `<YYYY-MM-DD>`

---

## Overview

- **Goal:** Create the first usable admin account in one transaction: ensure the
  `admin` role (`permissions: ["*"]`) exists, insert a `users` row with
  `status: "active"` and an argon2 `passwordHash`, assign the role, and **re-run
  the no-users check inside the transaction** so two concurrent installer
  submissions can never both succeed.
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
- **Anti-abuse:** the in-transaction `countUsersTx(tx) === 0` re-check is the
  TOCTOU defence; rely on the DB's transactional isolation (and the `users`
  email-uniqueness constraint) so a lost race surfaces as `first_run_unavailable`
  or a unique-violation, never a second admin.
- **Secret/PII handling:** the raw password is hashed immediately and never
  logged/returned; email persists only via `buildEmailFields` (hash +
  encrypted). The return value excludes `passwordHash`.

## Implementation Pseudocode

```ts
export type CreateFirstAdminInput = { name: string; email: string; password: string };

export async function createFirstAdmin(input: CreateFirstAdminInput) {
  // Cheap pre-check (fast fail before hashing).
  if (!(await isFirstRun())) throw new Error("first_run_unavailable");

  const email = normalizeEmail(input.email);
  const name = input.name.trim();
  if (!email || !name || input.password.length < 8) throw new Error("first_admin_invalid");

  const emailFields = buildEmailFields(email);
  const passwordHash = await hashPassword(input.password); // argon2, before tx

  return db.transaction(async (tx) => {
    // TOCTOU re-check: authoritative inside the tx.
    if ((await countUsersTx(tx)) !== 0) throw new Error("first_run_unavailable");

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

- **Data flow:** input → pre-check → hash → transaction { re-check → role →
  user → assignment } → safe summary (no secrets).
- **Error handling (domain codes for `map*Error` at the route):**
  `first_run_unavailable` (409 — already installed), `first_admin_invalid`
  (400), `first_admin_create_failed` (500). A unique-violation on email must be
  surfaced as `first_run_unavailable` (someone won the race).
- **Regression-test shape:** empty DB ⇒ returns active admin with `['*']` role;
  second call ⇒ throws `first_run_unavailable`; assert `status === "active"` and
  `verifyPassword(hash, password)` succeeds (distinguishes it from
  `createUser`'s random password).

## Testing Requirements

- **Lane (functional):** Vitest service lane —
  `tests/vitest/setup/createFirstAdmin.test.ts`. Cases: happy path role/perms/
  status/hash; reject when a user already exists; invalid input.
- **Lane (race):** Bun security lane — `tests/security/firstAdminRace.test.ts`.
  Fire two `createFirstAdmin` calls concurrently against an empty DB and assert
  **exactly one** succeeds and `countUsers() === 1` (TOCTOU coverage). Runtime
  concurrency ⇒ Bun lane, not Vitest.
- No migration artifacts (existing `users`/`roles`/`userRoles` tables).
