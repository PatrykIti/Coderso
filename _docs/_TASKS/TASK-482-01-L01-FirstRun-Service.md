# TASK-482-01-L01: First-run detection service (`countUsers` / `isFirstRun`)
# FileName: TASK-482-01-L01-FirstRun-Service.md

**Parent Subtask:** TASK-482-01
**Priority:** High
**Category:** Admin / Onboarding / Auth
**Estimated Effort:** Small
**Dependencies:** None
**Status:** ✅ Done
**Started:** 2026-07-04
**Completed:** 2026-07-05

---

## Overview

- **Goal:** Provide a single, race-safe source of truth for "is this a fresh
  install?" — a `countUsers()` that runs **one** `count(*)` query over the
  `users` table, and an `isFirstRun()` boolean derived from it. This is the gate
  every Phase-1 boundary re-uses.
- **Owning module(s) to create:** `core/services/admin/firstRunService.ts`
  (new). Exports `countUsers()` and `isFirstRun()`. **MUST also export** the
  transaction-aware `countUsersTx(tx)` — it is a hard dependency of 02-L01's
  in-transaction TOCTOU re-check (see `TASK-482-02-L01-CreateFirstAdmin-Service.md`
  and the 02 parent's dependency pin); it is already in the pseudocode below.
- **Source-of-truth docs:** `_docs/AUTH_SPEC.md`, `_docs/SECURITY_SPEC.md`,
  `_docs/DATA_MODEL.md`.
- **Out-of-scope:** any route or write (01-L02 / 02). No caching of the result
  (must always reflect live DB state so self-disable is immediate).

## Coordination Pins (TASK-482 stream)

- **Changelog:** number **1220** is pinned for the TASK-482 closure
  (`_docs/_CHANGELOG/1220-*.md`, created by TASK-482-09 only). Numbers **1219**
  (TASK-510, in flight in the shared main tree — may be absent from this
  worktree's checkout; do NOT reallocate it), **1221** (TASK-483) and **1222**
  (TASK-484) are RESERVED by parallel streams.
- **Parallel streams / forbidden paths:** TASK-483 (analytics) and TASK-484
  (backups) run concurrently on sibling branches. FORBIDDEN PATHS for TASK-482:
  `core/services/analytics/**`, `core/services/backups/**`, any analytics/backups
  route modules, `core/db/schema.ts`, `core/db/migrations/**`.
- **No DB migration in this tree:** settings/branding/locale keys go through the
  settings service defaults (rows, not DDL); first-admin creation uses the
  existing `users` table. No 482 file plans DDL/migration artifacts.
- **Board/changelog discipline:** ONLY the closure subtask (TASK-482-09) edits
  `_docs/_TASKS/README.md` and `_docs/_CHANGELOG/*`; this leaf never touches them.
- **Shared REMOTE test database:** all three streams and the owner share ONE
  Postgres (render.com, `DATABASE_URL` in `.env`). Tests must never
  delete/truncate `users`, flip the real DB into a global no-users install state,
  or reset shared settings rows; use service-level seams, uniquely scoped
  fixtures, or self-restoring setup/teardown.
- **Land order:** 01 → 02 → 03 (phase 1), then 04 → 05 → 06 → 07 → 08 (phase 2),
  then 09 (closure). Strictly sequential, single writer per source file.

## Security Contract

- **Endpoint visibility:** none — pure service. (Consumed by the public status
  route in 01-L02 and the create transaction in 02-L01.)
- **Auth model:** N/A (no request context). The function must never be passed
  user input; it takes no arguments.
- **RBAC permission(s):** none.
- **CSRF:** N/A.
- **Rate-limit bucket:** N/A (enforced by callers at the route layer).
- **Validation:** none — returns a `number` / `boolean` only.
- **Anti-abuse:** N/A.
- **Secret/PII handling:** the query selects **only** `count(*)`; it must not
  read or return email/PII columns, so nothing reaches a client cache or log.

## Implementation Pseudocode

Mirror the proven counter in `core/services/dashboard/dashboardService.ts`
(`countRows`, lines 62-67) — a single `count(*)` aggregate, not a `select * `
length:

```ts
// core/services/admin/firstRunService.ts
import { sql } from "drizzle-orm";
import { db } from "../../db/client";
import { users } from "../../db/schema";
// db/client exports ONLY `db`; there is no `DbTransaction` export. Mirror the
// local alias from settingsService.ts:11 instead of importing it.
type DbTransaction = Parameters<Parameters<typeof db.transaction>[0]>[0];

async function countUsersOn(exec: typeof db | DbTransaction): Promise<number> {
  const [row] = await exec
    .select({ count: sql<number>`count(*)` })
    .from(users);
  return Number(row?.count ?? 0);
}

export async function countUsers(): Promise<number> {
  return countUsersOn(db);
}

export async function countUsersTx(tx: DbTransaction): Promise<number> {
  return countUsersOn(tx); // used by 02-L01 inside the create transaction
}

export async function isFirstRun(): Promise<boolean> {
  return (await countUsers()) === 0;
}
```

- **Data flow:** DB → aggregate row → number. `isFirstRun` is strict `=== 0`.
- **Error handling:** let DB errors propagate; callers map them at the route
  boundary (01-L02 wraps in `mapInstallRouteError`). No domain codes needed here.
- **Regression-test shape:** mock `core/db/client` (mandatory — see Testing
  Requirements) so the aggregate resolves to `[{ count: N }]` → expect
  `countUsers() === N` and `isFirstRun() === (N === 0)`; the `count(*)` form
  must be asserted (spy on the mocked query builder / assert a single
  round-trip) so it cannot regress to an O(rows) `listUsers().length`. Never
  seed, delete, or truncate real `users` rows — the DB is shared (see below).

## Testing Requirements

- **Lane decision (explicit):** Vitest service lane with a **fully mocked
  `core/db/client`** — NOT a real or test database. Per
  `_docs/TESTING_STRATEGY.md`, Vitest owns Bun-free runtime-agnostic layers
  while DB/runtime behavior is the Bun lane, so this Vitest suite must never
  open a DB connection. Mirror the existing precedent
  `tests/vitest/customScreens/customScreenService.test.ts:57`
  (`vi.mock("../../../core/db/client", ...)`): stub the query-builder chain so
  `db.select({ count }).from(users)` resolves to a controllable `[{ count }]`.
  Alternatively drive the cases through the `exec` seam (`countUsersOn`) with
  a fake exec. Do NOT write a "with a test DB" Vitest suite.
- **Shared-DB safety (mandatory):** `DATABASE_URL` in `.env` points at the ONE
  remote Postgres shared with the parallel TASK-483/484 streams and the owner.
  Tests for this leaf must NOT delete or truncate `users` rows and must NOT
  try to reach a real empty-`users` state (that would flip the live shared DB
  into a global installer-open state). The empty-table and count-N cases are
  exercised exclusively via the mocked `db` / injected exec seam.
- Location `tests/vitest/setup/firstRunService.test.ts` (new folder — this leaf
  owns/creates the `tests/vitest/setup/` dir; 02-L01 and 04-L01 place their
  setup-service suites in the same folder, so use exactly this path, not
  `tests/vitest/admin/`). `tests/vitest/setup/` is a distinct path from the
  unrelated existing harness dir `tests/setup`.
- Cases (all against the mocked db): mock resolves `[{ count: 0 }]` ⇒
  `isFirstRun() === true`, `countUsers() === 0`; mock resolves `[{ count: 1 }]`
  ⇒ `false` / `1`; verify a single aggregate query is issued (spy on the
  mocked builder).
- No migration artifacts (read-only, existing `users` table).
