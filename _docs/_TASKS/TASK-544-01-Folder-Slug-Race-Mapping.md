# TASK-544-01: Folder Slug Race Mapping

# FileName: TASK-544-01-Folder-Slug-Race-Mapping.md

**Parent Task:** TASK-544
**Priority:** Medium
**Category:** Media Folder Service / DB Reliability
**Estimated Effort:** Small
**Dependencies:** TASK-537 (program land order; no shared source ownership)
**Status:** ✅ Done
**Started:** 2026-07-12
**Completed:** 2026-07-12
**Changelog:** 1256

---

## Scope

Map the database backstop for concurrent create/update slug conflicts to the existing
media_folder_slug_conflict domain error. Inspect PostgreSQL code and only the owned
media_folders_slug_idx constraint, including the installed postgres-js direct or
Drizzle-wrapped `cause` shape (`code` + `constraint_name`). Inspect `cause`, `code`, and
`constraint_name` only through fail-closed own data-property descriptors; inherited
properties, accessors, descriptor traps, message text, and cycles never participate. The
existing route mapper already returns 409 and is test-owned, not a source edit.

## Grounded anchors

- core/services/media/mediaFoldersService.ts:106-117 performs a raceable precheck.
- mediaFoldersService.ts:143-161 catches create by message substring only.
- mediaFoldersService.ts:180-211 prechecks update then leaves its UPDATE unguarded.
- core/server/routes/mediaRoutes.ts:78-129 already maps media_folder_slug_conflict to
  409 at :93-95.

## Leaf

TASK-544-01-L01 is the sole mediaFoldersService.ts writer and owns the directly affected
service plus media-folder route suites. The race/409 proof lands with the source and passes
before this subtask completes. Its DB proof uses an observed blocker PID plus matched
granted/ungranted `pg_locks` write-wait barrier for both create and update; its route proof
exercises both POST and PATCH through `toErrorResponse` after those service proofs.
TASK-544-04-L01 reruns those suites read-only and owns only additive
route-registration coverage, smoke/docs/closure.

| Leaf | Scope | Source ownership | Status |
|---|---|---|---|
| TASK-544-01-L01 | Map create/update owned-constraint races and prove POST/PATCH 409 | mediaFoldersService + direct Bun service/route tests | ✅ Done |

## Security Contract

Existing internal admin endpoints only. Admin session-cookie auth, media:write, CSRF,
admin_write, strict schemas, depth/cycle checks, and central mapMediaError remain; API
key, public nonce/HMAC, and captcha do not apply. The client receives only the stable
matched-conflict code/message, never its raw DB error, SQL, or constraint detail. Unrelated
23505 errors are not laundered as slug conflicts and keep the unchanged global
error-boundary behavior.

## Compatibility

No endpoint/error code/DDL/index change. The precheck remains for deterministic normal
feedback; the DB constraint remains authoritative under concurrency.

## Validation

~~~bash
bun --cwd core lint:types
bun --cwd core lint
set -a && source .env && set +a && bun test --timeout=15000 \
  tests/unit/media/mediaFoldersService.test.ts \
  tests/integration/routes/media-folders.test.ts
~~~

## Completion evidence

The shared owned-constraint predicate now maps only PostgreSQL 23505 for
`media_folders_slug_idx`; deterministic create and update races plus real POST/PATCH
mapping prove the bounded existing 409 response. The final targeted Bun service/route
lane passed as part of 36/36 TASK-544 tests, and fresh source/test audits reported zero
High/Medium/Low findings. No endpoint, migration, RBAC, or security-contract behavior
changed.
