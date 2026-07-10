# TASK-544-04: Tests, Smoke, and Closure

# FileName: TASK-544-04-Tests-Smoke-And-Closure.md

**Parent Task:** TASK-544
**Priority:** Medium
**Category:** Tests / Reliability Smoke / Documentation
**Estimated Effort:** Medium
**Dependencies:** TASK-544-01, TASK-544-02, TASK-544-03
**Status:** ⏳ To Do
**Changelog:** 1256 (pinned; create only at implementation closure)

---

## Scope

Rerun the source-owned service/media-folder-route/client/UI regressions read-only, add
only broad route-registration coverage in `tests/integration/routes/media.test.ts`, then
own five real recovery flows, cache/media docs, task/index updates, and changelog 1256.
This subtask edits neither production source nor source-leaf-owned tests.

## Leaf

TASK-544-04-L01 is the sole additive broad-route-test plus rerun/docs/smoke/closure
writer. Missing changed-behavior coverage returns to 544-01/02/03 before closure.

## Required proof

Owned constraint races map to 409 without laundering unrelated errors; rejected/overlap
cache promises recover; all five load/create/rename/reorder/delete UI error paths retain
state, show retry, and reconcile only after success.

## Validation

~~~bash
bun --cwd core lint:types
bun --cwd core lint
set -a && source .env && set +a && bun test --timeout=15000 \
  tests/unit/media/mediaFoldersService.test.ts \
  tests/integration/routes/media-folders.test.ts \
  tests/integration/routes/media.test.ts
bunx vitest run --config vitest.config.ts \
  tests/vitest/admin/mediaFoldersClient.test.ts \
  tests/vitest/ui/media-folder-rail.test.tsx \
  tests/vitest/ui/media-library.test.tsx \
  tests/vitest/mediaUi/mediaLibrary.test.tsx
bun run gates:coderso
~~~
