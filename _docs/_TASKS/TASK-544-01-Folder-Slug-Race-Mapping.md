# TASK-544-01: Folder Slug Race Mapping

# FileName: TASK-544-01-Folder-Slug-Race-Mapping.md

**Parent Task:** TASK-544
**Priority:** Medium
**Category:** Media Folder Service / DB Reliability
**Estimated Effort:** Small
**Dependencies:** TASK-543 (program land order; no shared source ownership)
**Status:** ⏳ To Do
**Changelog:** 1256 (pinned; create only at implementation closure)

---

## Scope

Map the database backstop for concurrent create/update slug conflicts to the existing
media_folder_slug_conflict domain error. Inspect PostgreSQL code and only the owned
media_folders_slug_idx constraint, including the supported wrapped-cause shape. The
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
before this subtask completes. TASK-544-04-L01 reruns those suites read-only and owns only
additive route-registration coverage, smoke/docs/closure.

## Security Contract

Existing internal admin endpoints only. Session/API-key auth, media:write, CSRF,
admin_write, strict schemas, depth/cycle checks, and central mapMediaError remain. The
client receives only the stable conflict code/message, never the raw DB error, SQL, or
constraint detail. Unrelated 23505 errors are not laundered as slug conflicts.

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
