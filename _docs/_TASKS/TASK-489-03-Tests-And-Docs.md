# TASK-489-03: Operational UI, Runtime Proof, Documentation, and Closure
# FileName: TASK-489-03-Tests-And-Docs.md

**Parent Task:** TASK-489
**Priority:** High
**Category:** Solution Kits / Admin UI / Runtime Smoke / Closure
**Estimated Effort:** Large
**Dependencies:** All TASK-489 parent-level start gates; TASK-489-01 and TASK-489-02 complete; TASK-547 done; complete terminal TASK-551/TASK-414-03-L03 receipts
**Status:** ⏳ To Do
**Changelog:** 1268 (pinned; TASK-489-03-L02 only)

---

## Overview

Compose one operational history/detail/rollback surface in
`SolutionKitsPage.tsx`, finish component, route, security, database, performance,
documentation/generated-output, gate, and audit work, then run operational fast
smoke and one final certification checkpoint before synchronizing only all ten
task statuses, board statistics, and changelog 1268.

## Sub-Tasks

| Order | ID | File | Status |
|---:|---|---|---|
| 5 | TASK-489-03-L01 | `TASK-489-03-L01-Ui-Integration-Tests.md` | ⏳ To Do |
| 6 | TASK-489-03-L02 | `TASK-489-03-L02-Docs-And-Closure.md` | ⏳ To Do |

## UI Boundary

- `SolutionKitsPage.tsx` is the sole composition writer.
- The operational region is an all-runs view independent of legacy catalog
  selection, so real TASK-547 full-site runs are reachable before TASK-555.
- Operational history is separate from Reviewed Site Builder intake.
- No apply, dry-run, rerun, latest rollback, raw JSON inspector, actor, options,
  snapshots, rollback payload, or raw-error view is rendered.
- Running rows show a nonterminal state with no counters; claimed-owner recovery
  shows its safe code/run ID with no synthetic summary and does not masquerade as
  terminal failure.
- Terminal failed copy states that the source is unchanged or fully restored and
  may be retried after refresh; any partial/unresolved state remains recovery on
  the same running owner and never renders failed counters.
- Rollback is visible/enabled only with both `solution-kits:write` and
  `settings:write`, uses `ConfirmActionDialog`, and names the exact source run.

## Runtime Boundary

The shared suite ID is `solution-kit-run-operations`, registered statically for
both `fast` and `certification`. Both profiles run exactly these six real flows:

`history-pagination-light`, `full-site-detail-dark`, `read-only-rbac`,
`rollback-confirm-cancel`, `exact-legacy-rollback`, and
`exact-full-site-rollback`.
The `full-site-detail-dark` flow also selects the real 513-item sentinel and
visibly proves the fixed corrupt-detail state preserves safe orientation while
rendering no guessed items/counters or rollback control.

Fast may use smaller fixtures/time ceilings but cannot omit or weaken a scenario
or visible-effect assertion. `rollback-confirm-cancel` also runs at a 390x844
viewport and proves by bounding boxes that history/detail stack without overlap,
the confirm dialog stays inside the viewport, no horizontal overflow exists, and
focus visibly returns after cancel.

Fast is operational non-checkpoint evidence only and has no owner-review,
staging, or closure authority. All non-metadata writes, gates, line counts, diff
checks, and post-audits finish before final certification. Only `wf489cert`
creates terminal TASK-545 manifest/checkpoint evidence; its phase-2 resume may
change only changelog/index and TASK-489 status/board metadata.

The suite requires `CODERSO_RUNTIME_SMOKE_DATABASE_URL`, rejects canonical
database identity equal to ordinary `DATABASE_URL`, and projects only the
dedicated value to its server/worker children. Its typed server-only fixture
coordinator creates session-scoped definitions/resources through real owner
services and claims; it never fabricates ledger rows or uses unsafe casts. The
fixed Setup apply flow is permitted only in that dedicated database, and cleanup
restores setting presence as well as values.

## Security Contract

- **Visibility/auth:** internal Admin browser/session only.
- **RBAC:** reads require `solution-kits:read`; rollback require-all both writes.
- **CSRF/rate limit:** shared client/route, `admin_write` on rollback.
- **Validation:** only strict safe DTOs reach rendering and smoke evidence.
- **Anti-abuse:** keyset pages, exact source, one confirm-gated mutation.
- **Data:** screenshots/reports/logs redact IDs where required and never capture
  actors/options/snapshots/rollback payload/raw errors.

## Closure Rule

TASK-489-03-L02 is the only task/changelog/docs/runtime-smoke writer and must not
reopen product source. It freezes every product/runtime doc and generated output
before certification, then closes only metadata through the checkpoint-bound
resume. Parent closes only after all six leaves are terminal and no unresolved
drift remains.

## Testing Requirements

L01 runs its exact UI integration lane. L02 reruns all targeted domain, route,
security, DB, performance, cache, hook, and UI suites; full mandatory gates;
touched-file line counts; `git diff --check`; fresh audits; operational fast
smoke; and finally one certification smoke/checkpoint in that order.

## Documentation Updates Required

L02 is the sole writer for the TASK-489 source-of-truth docs, runtime-smoke
cookbook registration, exact terminal TASK-548 Guide source/generated-output
successor transaction, changelog 1268, task statuses, board row, and statistics.
It updates `_docs/AUDIT_SPEC.md` and does not compile final CMS capability JSON.

## Forbidden Paths

Domain/route/client/cache/hook sources owned by earlier leaves, DB
schema/migrations, TASK-551 owners, apply/dry-run/public/API-key paths,
AGENTS/config files, TASK-555/TASK-556, TMP files, and unrelated task/changelog
entries.
