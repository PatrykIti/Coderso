# TASK-544-04: Tests, Smoke, and Closure

# FileName: TASK-544-04-Tests-Smoke-And-Closure.md

**Parent Task:** TASK-544
**Priority:** Medium
**Category:** Tests / Reliability Smoke / Documentation
**Estimated Effort:** Medium
**Dependencies:** TASK-544-01, TASK-544-02, TASK-544-03
**Status:** ✅ Done
**Started:** 2026-07-12
**Completed:** 2026-07-12
**Changelog:** 1256

---

## Scope

Rerun the source-owned service/media-folder-route/client/UI regressions read-only, add
only broad route-registration coverage in `tests/integration/routes/media.test.ts`, then
own five real recovery flows, cache/media docs, task/index updates, and changelog 1256.
This subtask edits neither production source nor source-leaf-owned tests.

## Leaf

TASK-544-04-L01 is the sole additive broad-route-test plus rerun/docs/smoke/closure
writer. Missing changed-behavior coverage returns to 544-01/02/03 before closure.

| Leaf | Scope | Source ownership | Status |
|---|---|---|---|
| TASK-544-04-L01 | Broad route proof, docs, full gates, five live flows, and closure | additive route test + docs/evidence/metadata only | ✅ Done |

## Required proof

Owned create/update constraint races use an exact blocker PID/transaction plus bounded
`pg_blocking_pids` proof and a matching ungranted-waiter/granted-blocker transaction-ID
`pg_locks` pair showing that the service write passed its precheck; do not replace that barrier
with `Promise.allSettled` timing. Afterward, real POST and PATCH route assertions map the stable
conflict to `ApiError` 409 and pass it through `toErrorResponse` for exact bounded JSON without
laundering unrelated errors. Rejected/overlap cache promises recover.

All five load/create/rename/reorder/delete UI error paths retain state, show Retry, and
reconcile only after success. Repeated load Retry failure publishes a fresh token; form
dismissal matches token/kind/target/form generation/current draft; synchronous cacheBus-before-
return failures become a separate load error after local mutation success; delete keeps both
folder-filter owners consistent. Keyboard, wide coarse-pointer/no-hover, and narrow touch
actions remain reachable without changing the prototype tokens or 200px wide geometry.

The live smoke uses method/path-aware one-shot `playwright-cli -s=wf544smoke run-code ...`
faults with release latches, exactly one hit, full matching `unroute` plus `route-list` cleanup,
and structured light/dark + `1440x900`/`390x844` visible geometry/focus/value/order/selection
evidence. Every browser command is recorded in full with secrets redacted; console errors,
warnings, and page errors are zero.

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
set -a && source .env && set +a && bun run test
set -a && source .env && set +a && bun run precommit:check
bun --cwd core build:admin
bun run check:admin-boundary
bun run check:admin-bundle
bun run gates:coderso
bun run scan:security:strict
~~~

## Completion evidence

The additive registration proof, source-owned reruns, full gates, final audits, docs, and
five canonical live recovery flows completed. Targeted Bun passed 36/36 and targeted
Vitest passed 78/78. Full `bun run test`, `precommit:check`, core lint/types, Admin
build/boundary/bundle, and release gates 5/5 passed. The strict scan was non-green only
for the exact unchanged TASK-545-owned workflow finding; every TASK-544-targeted scanner
result was clean and no suppression was added.
