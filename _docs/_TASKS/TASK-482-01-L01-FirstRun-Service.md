# TASK-482-01-L01: First-run detection service (`countUsers` / `isFirstRun`)
# FileName: TASK-482-01-L01-FirstRun-Service.md

**Parent Subtask:** TASK-482-01
**Priority:** High
**Category:** Admin / Onboarding / Auth
**Estimated Effort:** Small
**Dependencies:** None
**Status:** ⏳ To Do
**Started:** `<YYYY-MM-DD>`
**Completed:** `<YYYY-MM-DD>`

---

## Overview

- **Goal:** Provide a single, race-safe source of truth for "is this a fresh
  install?" — a `countUsers()` that runs **one** `count(*)` query over the
  `users` table, and an `isFirstRun()` boolean derived from it. This is the gate
  every Phase-1 boundary re-uses.
- **Owning module(s) to create:** `core/services/admin/firstRunService.ts`
  (new). Exports `countUsers()` and `isFirstRun()`. May also export a
  transaction-aware `countUsersTx(tx)` for the TOCTOU re-check used by 02-L01.
- **Source-of-truth docs:** `_docs/AUTH_SPEC.md`, `_docs/SECURITY_SPEC.md`,
  `_docs/DATA_MODEL.md`.
- **Out-of-scope:** any route or write (01-L02 / 02). No caching of the result
  (must always reflect live DB state so self-disable is immediate).

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
import type { DbTransaction } from "../../db/client"; // same type used by setSettingsTx

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
- **Regression-test shape:** seed N users → expect `countUsers() === N` and
  `isFirstRun() === (N === 0)`; the `count(*)` form must be asserted (e.g. spy on
  the query builder or assert a single round-trip) so it cannot regress to an
  O(rows) `listUsers().length`.

## Testing Requirements

- **Lane:** Vitest service lane — pure TS domain/service with a test DB.
  Location `tests/vitest/setup/firstRunService.test.ts` (new folder) or
  `tests/vitest/admin/`.
- Cases: empty table ⇒ `isFirstRun() === true`, `countUsers() === 0`; one seeded
  admin ⇒ `false` / `1`; verify a single aggregate query is issued.
- No migration artifacts (read-only, existing `users` table).
