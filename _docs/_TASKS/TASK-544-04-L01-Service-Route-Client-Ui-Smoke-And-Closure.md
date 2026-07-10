# TASK-544-04-L01: Service, Route, Client, UI Smoke, and Closure

# FileName: TASK-544-04-L01-Service-Route-Client-Ui-Smoke-And-Closure.md

**Parent Task:** TASK-544
**Parent Subtask:** TASK-544-04
**Priority:** Medium
**Category:** DB Tests / UI Tests / Smoke / Closure
**Estimated Effort:** Medium
**Dependencies:** TASK-544-01-L01, TASK-544-02-L01, TASK-544-03-L01
**Status:** ⏳ To Do
**Changelog:** 1256 (pinned; create only at implementation closure)

---

## Scope and ownership

Additive-route-test/rerun/docs-only leaf. It may edit only TASK-544 additions to
`tests/integration/routes/media.test.ts` for broad route-registration/mapping coverage;
all service, media-folder route, client and UI suites named below are read-only inputs
owned by 544-01/02/03. It may also edit TASK-544 task-scoped screenshots and closeout evidence under the currently
supported `_docs/_workflows/_smoke/` path, _docs/MEDIA_SPEC.md, _docs/ADMIN_CACHE.md and
_docs/ADMIN_CACHE_MAP.md when their contract changes, family statuses,
_docs/_TASKS/README.md, changelog 1256, and _docs/_CHANGELOG/README.md. It must not edit
production source or scanner/workflow config. Read indexes fresh before closure.

## Implementation Pseudocode

Read-only source-test verification and additive route proof:

~~~ts
verify the 544-01-owned service unit tests already:
  feed direct/wrapped {code:"23505", constraint:owned} into create/update seams;
  expect media_folder_slug_conflict;
  feed unrelated constraint/code and expect original error.

verify its DB concurrency and media-folders route test already:
  create uniquely prefixed folders;
  issue two colliding create/update operations with Promise.allSettled;
  assert one success, one stable domain conflict, no unrelated row damage;
  call real route and assert 409 response;
  clean only owned fixtures.

verify the 544-02-owned client deferred-promise tests already:
  reject list request then retry;
  overlap old and forced-new request;
  assert identity guard preserves new promise/cache.

verify the 544-03-owned UI tests for each operation already:
  reject load/create/rename/reorder/delete;
  assert role=alert, retry button, pending state, retained draft/selection/order;
  resolve retry and assert success-only dismissal/reconciliation.

add only to tests/integration/routes/media.test.ts:
  assert the existing media-folder route family remains registered and its centralized
  media_folder_slug_conflict mapping is reachable without changing route source.
~~~

If any changed-behavior assertion is absent or weakened, return it to the owning source
leaf and repeat that leaf's gate. Do not repair or rebaseline source-owned tests here.

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
git diff --check
~~~

Re-run every named failing file once in isolation. If DATABASE_URL is unavailable, do
not claim DB/concurrency closure.

## Runtime smoke

Restart the server and use a TASK-544 Playwright session. Run at least five distinct
flows: failed list then Retry; create conflict retaining name then Retry; rename failure
retaining draft then Retry; reorder failure retaining/restoring order then Retry; delete
failure retaining active selection then Retry. Cover light/dark. Assert visible alert,
button pending state, input value, selected folder, DOM order, post-success result, and
zero console errors.

TASK-545 lands later. Record current task-scoped screenshots and concise closeout facts;
do not depend on, pre-create, or claim validation by TASK-545's future durable manifest/
schema/`.gitignore` contract.

## Documentation and closure

Document the owned 409 race mapping, retryable dedupe lifecycle, success-only cache
events, and visible state-preserving UI errors. Run fresh post-audit lenses for DB error
specificity, promise identity, state retention, cache timing, and test integrity. Create
changelog 1256, mark every descendant Done, close the parent, and synchronize indexes.
