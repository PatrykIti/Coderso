# TASK-354-03: Seed Admin Pepper-Aware Bootstrap Credentials
# FileName: TASK-354-03_Seed_Admin_Pepper_Aware_Bootstrap_Credentials.md

**Priority:** High
**Category:** Auth Bootstrap + Security + Developer Tooling
**Estimated Effort:** Medium
**Dependencies:** TASK-346, TASK-347
**Status:** Done (2026-06-01)

---

## Overview

Fix the Claude UX run setup finding: `core/db/seed.ts` hashes
`ADMIN_PASSWORD` directly with `@node-rs/argon2`, while login verification uses
`hashPassword` / `verifyPassword`, which append `AUTH_PASSWORD_PEPPER` when
configured. Seeded credentials can therefore fail with `Invalid credentials`
when a pepper exists.

## Sub-Tasks

- Replace direct Argon2 hashing in `seedAdmin` with `hashPassword`.
- Preserve idempotent behavior for existing admin users.
- Add tests that prove seeded passwords verify with and without
  `AUTH_PASSWORD_PEPPER`.
- Update local setup docs and report notes.
- Ensure seed logs never print passwords or pepper state beyond a generic
  success/failure message.

## Files To Change

| File | Required change |
|---|---|
| `core/db/seed.ts` | Import and use `hashPassword`; remove direct `hash`/`Algorithm` usage. |
| `core/services/auth/password.ts` | Touch only if testability needs a safe helper seam; do not weaken pepper behavior. |
| `tests/unit/tools/packageScripts.test.ts` | Keep package script assertion green. |
| `tests/unit/auth/` or `tests/unit/tools/` | Add seed password verification tests with and without pepper. |
| `docs/develop/` or setup docs | Update admin seed guidance if needed. |
| `_docs/PLAYWRIGHT/31-05-2026-tools/REPORT_CLAUDE_UX_REVIEW.md` | Mark the setup finding resolved after implementation. |

## Implementation Pseudocode

```ts
import { hashPassword } from "../services/auth/password";

if (!user) {
  const passwordHash = await hashPassword(adminPassword);
  await db.insert(users).values({ passwordHash, ...emailFields });
}
```

Regression-test shape:

- Add one Bun unit case that seeds/hashes a new admin password with
  `AUTH_PASSWORD_PEPPER` unset and proves `verifyPassword` accepts the raw
  password.
- Add one Bun unit case that sets `AUTH_PASSWORD_PEPPER`, runs the same seed
  hashing path used by `seedAdmin`, and proves verification only succeeds
  through the shared pepper-aware helper.
- Test the actual seed path, not only `hashPassword` directly: use a scoped
  DB-backed `seedAdmin` fixture or extract a tiny `hashSeedAdminPassword`
  helper that `seedAdmin` calls.
- Add a static regression assertion that `core/db/seed.ts` no longer imports
  direct `hash` or `Algorithm` from `@node-rs/argon2`.
- Restore the original env value in `afterEach` / `finally`, and assert seed
  logs do not include the raw password, pepper, or hash.

Helper sketch:

```ts
const originalPepper = process.env.AUTH_PASSWORD_PEPPER;
process.env.AUTH_PASSWORD_PEPPER = "test-pepper";
const hash = await hashPassword("secret");
expect(await verifyPassword(hash, "secret")).toBe(true);
process.env.AUTH_PASSWORD_PEPPER = originalPepper;
```

Data flow:

- `.env` / shell env -> `seedAdmin` -> `hashPassword` -> stored hash -> login
  `verifyPassword`.
- Tests must execute that same `seedAdmin`/seed helper path so direct Argon2
  hashing cannot regress unnoticed.

Error handling:

- Restore `process.env.AUTH_PASSWORD_PEPPER` in tests after each case.
- If `ADMIN_EMAIL` or `ADMIN_PASSWORD` is absent, keep existing skip behavior.
- Do not rehash existing users silently; document if credential rotation needs a
  separate command.

## Security Contract

- Endpoint visibility: no endpoint; local/server-side seed script.
- Auth model: affects bootstrap credentials only.
- RBAC/CSRF/rate-limit: not applicable.
- Reject-unknown validation: not applicable, but env values must be read
  explicitly.
- Anti-abuse: no public surface.
- Secret handling: never log `ADMIN_PASSWORD`, `AUTH_PASSWORD_PEPPER`, hashes,
  or credential validation details beyond generic success/failure.

## Testing Requirements

- `bun test tests/unit/tools/packageScripts.test.ts`
- New targeted Bun test for seed/password helper behavior
- Static import regression for `core/db/seed.ts` direct Argon2 usage
- `bun --cwd core lint`
- `bun --cwd core lint:types`
- Manual local smoke with `AUTH_PASSWORD_PEPPER` if DB is available:
  `set -a && source .env && set +a && bun run db:seed:admin`

## Documentation Updates Required

- Claude UX report setup finding.
- Local setup/developer docs for admin seed if behavior is documented.
- Changelog for implementation closure.

## Acceptance Criteria

- Newly seeded admin users can authenticate when `AUTH_PASSWORD_PEPPER` is set.
- Existing no-pepper behavior remains valid.
- Logs do not expose secrets.

## Closure Notes

Done (2026-06-01): `seedAdmin` delegates password hashing to
`hashSeedAdminPassword`, which uses the shared pepper-aware auth helper. Tests
cover pepper and no-pepper verification plus a static guard against direct
Argon2 imports, and a scoped DB smoke verified a seeded peppered password before
removing the temporary user.
