# TASK-544-01-L01: Map Create and Update Constraint Races to 409

# FileName: TASK-544-01-L01-Map-Create-And-Update-Constraint-Races-To-409.md

**Parent Task:** TASK-544
**Parent Subtask:** TASK-544-01
**Priority:** Medium
**Category:** Media Folder Service / PostgreSQL
**Estimated Effort:** Small
**Dependencies:** TASK-544-01
**Status:** ✅ Done
**Started:** 2026-07-12
**Completed:** 2026-07-12
**Changelog:** 1256

---

## Scope

Introduce one robust owned-constraint predicate and apply it to both create and update.
Leave route mapping untouched because mapMediaError already owns the 409 response.

## Source and direct-test ownership

This leaf is the sole TASK-544 writer of:

- core/services/media/mediaFoldersService.ts;
- tests/unit/media/mediaFoldersService.test.ts;
- tests/integration/routes/media-folders.test.ts.

It must not edit schema/migrations, mediaRoutes.ts, client/UI, the broad
`tests/integration/routes/media.test.ts` registration suite, docs, tasks, or changelog
indexes. Add direct/wrapped error, concurrency and existing-409 assertions before running
the source gate; closure reruns but never edits/rebaselines these two test files.

## Implementation Pseudocode

~~~ts
const MEDIA_FOLDER_SLUG_CONSTRAINT = "media_folders_slug_idx";

type OwnDataValue = Readonly<{ value: unknown }>;

function readOwnDataValue(candidate: unknown, key: PropertyKey): OwnDataValue | null {
  if candidate is not a non-null object: return null;
  try descriptor = Object.getOwnPropertyDescriptor(candidate, key);
  catch: return null; // revoked/proxy descriptor failures fail closed
  if !descriptor or !("value" in descriptor): return null; // absent/inherited/accessor
  return { value: descriptor.value };
}

function getPgErrorCandidates(error): unknown[] {
  walk at most 3 candidates: error, cause, cause.cause;
  stop on cycles/non-objects or a missing/accessor/failed `cause` descriptor;
  obtain `cause` only through readOwnDataValue;
}

export function isMediaFolderSlugConflict(error): boolean {
  for candidate:
    code = readOwnDataValue(candidate, "code");
    constraint = readOwnDataValue(candidate, "constraint_name");
    if code?.value === "23505" &&
       constraint?.value === MEDIA_FOLDER_SLUG_CONSTRAINT: return true;
  return false;
}

function mapOwnedFolderConstraint(error): never {
  if isMediaFolderSlugConflict(error):
    throw Error("media_folder_slug_conflict");
  throw error;
}

createMediaFolder(...) {
  retain normalization/precheck/graph checks;
  try insert returning explicit row;
  catch error: mapOwnedFolderConstraint(error);
}

updateMediaFolder(...) {
  retain normalization/precheck/graph checks;
  try update returning explicit row;
  catch error: mapOwnedFolderConstraint(error);
}
~~~

Do not map by message text, a legacy `constraint` alias, or code 23505 alone. The installed
postgres-js driver exposes `constraint_name`; Drizzle may place that error in `cause`.
Only own data-property values containing the exact owned `constraint_name` plus 23505 map.
Never perform ordinary property reads on the inspected unknown value: getters, inherited
properties, throwing descriptor/proxy traps, and cycles fail closed without replacing the
original error. The no-raw-database-content response guarantee below applies to the exact
owned conflict that this leaf recognizes and maps. Unmatched errors retain their current
identity and existing environment-aware global-boundary behavior; TASK-544 neither widens
that behavior nor edits the global error boundary.

## Security Contract

Existing internal admin media-folder create/update routes retain Admin session-cookie
auth, media:write, session CSRF, admin_write, and strict reject-unknown schemas. API key,
public nonce/HMAC, and captcha do not apply. This service leaf emits only
media_folder_slug_conflict; the
existing centralized mapper returns the matched conflict as 409 without exposing PostgreSQL
code, constraint, SQL, or raw message. Other errors are not laundered and remain owned by
the unchanged global boundary.

## Error and compatibility contract

Owned slug conflicts become the existing machine-readable domain error; mapMediaError
continues to produce 409. Other unique constraints and all non-23505 errors preserve
their original failure path. No raw PostgreSQL message from the recognized owned conflict
is returned or logged as client content. This task makes no new claim about the unchanged
development-only serialization of unrelated internal errors.

## Direct regression-test shape

This leaf owns the test edits. Cover the exported pure predicate with direct and
one/two-level Drizzle-style wrapped postgres-js errors, unrelated `constraint_name`, same
constraint with non-23505, legacy `constraint` only, inherited fields, cycles, accessors on
each of `cause`/`code`/`constraint_name`, and descriptor lookup failures such as a revoked or
throwing proxy. Assert no getter executes and every non-match preserves the original error.
Keep the normal precheck conflict.

Add deterministic DB-backed create and update service races. For each case:

1. Create unique owned fixtures and start a dedicated postgres-js transaction.
2. Read that transaction's `pg_backend_pid()`, write the colliding slug, and keep the
   transaction uncommitted.
3. Start the service create or update. From a separate inspector connection, poll until a
   bounded deadline proves a waiter whose current statement is the expected
   INSERT/UPDATE of `media_folders`, whose lock wait is reported by
   `pg_blocking_pids(waiter_pid)`, and whose blocker list contains that exact owned PID.
   Join `pg_locks` in the same observation and require the waiter to hold an ungranted
   transaction-ID lock that matches the blocker transaction's granted lock; do not accept
   an unrelated blocker PID, relation, or statement. This paired blocker/lock observation
   proves the raceable precheck already completed and the constrained write is waiting.
4. Commit the blocker, then assert the service rejects with only
   `media_folder_slug_conflict`.

Do not substitute `Promise.allSettled` timing for the blocker-PID/write-wait barrier. If the
service settles before the barrier or the bounded probe expires, fail the test and release
the transaction. In `finally`, roll back any open transaction, end every dedicated
postgres-js client, and delete only owned rows in FK-safe order.

After those service proofs, exercise the real registered POST and PATCH folder handlers with
duplicate-slug inputs. Catch the mapped `ApiError`, require status/code/message
409/`media_folder_slug_conflict`/`Folder slug already in use`, pass it through the exported
`toErrorResponse`, serialize that response, and assert the exact bounded JSON contains no
PostgreSQL code, constraint name, SQL, stack, or raw details. Route and global-error
production source remain unchanged.

## Validation

~~~bash
bun --cwd core lint:types
bun --cwd core lint
set -a && source .env && set +a && bun test --timeout=15000 \
  tests/unit/media/mediaFoldersService.test.ts \
  tests/integration/routes/media-folders.test.ts
~~~

Re-run a named file alone before declaring a failure.

## Acceptance criteria

- Create and update share one owned-constraint mapper.
- Only media_folders_slug_idx plus PostgreSQL 23505 becomes the stable conflict.
- Deterministic create/update tests observe the exact blocker PID, expected waiting write,
  and matching granted/ungranted `pg_locks` pair before releasing the collision.
- POST and PATCH route behavior is proven as 409 without editing its already-correct mapper.

## Completion evidence

Implemented and verified exactly as contracted. Direct/wrapped/error-shape cases, exact
blocker/lock race barriers, and POST/PATCH `toErrorResponse` bounds passed in the final
36/36 targeted Bun service/route lane. The recognized conflict exposes no PostgreSQL
detail; unrelated errors retain their original path.
