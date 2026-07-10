# TASK-544-01-L01: Map Create and Update Constraint Races to 409

# FileName: TASK-544-01-L01-Map-Create-And-Update-Constraint-Races-To-409.md

**Parent Task:** TASK-544
**Parent Subtask:** TASK-544-01
**Priority:** Medium
**Category:** Media Folder Service / PostgreSQL
**Estimated Effort:** Small
**Dependencies:** TASK-544-01
**Status:** ⏳ To Do
**Changelog:** 1256 (pinned; create only at implementation closure)

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

function getPgErrorCandidates(error): unknown[] {
  walk error then error.cause for a small fixed maximum depth;
  stop on cycles/non-objects;
}

function isMediaFolderSlugConflict(error): boolean {
  for candidate:
    require candidate.code === "23505";
    constraint = candidate.constraint or safely parsed owned constraint field/message;
    if constraint === MEDIA_FOLDER_SLUG_CONSTRAINT: return true;
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

Do not map by an unrestricted message substring or by code 23505 alone. If the supported
driver exposes the constraint only inside a wrapped cause/message, require both 23505
and the exact owned constraint token.

## Security Contract

Existing internal admin media-folder create/update routes retain session/API-key auth,
media:write, session CSRF, admin_write, and strict reject-unknown schemas. No public
nonce/captcha applies. This service leaf emits only media_folder_slug_conflict; the
existing centralized mapper returns 409 without exposing PostgreSQL code, constraint,
SQL, or raw message. Other errors are not laundered.

## Error and compatibility contract

Owned slug conflicts become the existing machine-readable domain error; mapMediaError
continues to produce 409. Other unique constraints and all non-23505 errors preserve
their original failure path. No raw PostgreSQL message is returned or logged as client
content.

## Direct regression-test shape

This leaf owns the test edits. Cover direct and one/two-level wrapped owned errors for
create/update, unrelated 23505, same-token non-23505, cyclic cause objects, normal
precheck conflict, and a DB-backed concurrent pair with unique fixtures where one wins
and one maps to domain conflict/route 409.

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
- Route behavior is proven as 409 without editing its already-correct mapper.
