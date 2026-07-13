# TASK-543: Posts Exit Safety and List Accessibility

# FileName: TASK-543_Posts_Exit_Safety_and_List_Accessibility.md

**Priority:** High
**Category:** Posts / Autosave / Admin UI / Accessibility
**Estimated Effort:** Small
**Dependencies:** Existing Posts editor and PostsTable contracts; TASK-544 (program order)
**Status:** ✅ Done
**Started:** 2026-07-13
**Completed:** 2026-07-13
**Reopened:** 2026-07-13 — final closure audit found that a global drain blocked unrelated posts, while a naive per-session drain allowed stale same-post overwrites
**Changelog:** 1255

---

## Overview

At task start, the Posts editor exposed an autosave `flush`, but Close navigated
without awaiting it and the editor-state wrapper swallowed failures. A dirty draft
could therefore be lost. The Posts list also made a table row mouse-clickable even
though it contained interactive descendants and had no equivalent keyboard row
contract; author/date metadata disappeared through the `md..lg` range.

This family makes Close a transactional UI action and restores semantic list
navigation. It adds no API, model, route, or database behavior.

## Invariants

- Close coalesces with any in-flight save, flushes the newest dirty snapshot,
  preserves ascending exact-revision write order, prevents a newer snapshot from
  satisfying an older manual/Close target, prevents double navigation, and navigates only
  after success or proven clean.
- Initial load, an accepted authoritative hydration, and an editor-identity transition
  seed/reset the exact persisted target. Initial and post-hydration clean Close perform
  zero writes, while a clean revert behind an older pending write with different bytes
  queues an exact restoration after that write before navigation.
- A same-identity restore/hydration is admitted as a pre-request queue barrier after every
  older save and before every newer save; local save cache events/late GETs cannot
  rehydrate over its baseline, reset silent-save history, or disable later autosaves.
- Only the current route-session loader authorizes identity transitions. A route epoch
  distinguishes A0 from A1 after A→B→A; stale save/refresh/restore/server-operation success,
  error, and finally paths from a previous session are inert.
- Logical save state, revisions, barriers, errors, and response guards are scoped by the full
  route session. Physical save transport is serialized by post identity across route epochs:
  an unresolved A0 cannot delay a different post B, while same-post A1 writes its exact newest
  bytes only after A0 settles. An A0 failure does not reject or poison the A1 operation.
- A per-post potential-write settlement generation survives queue/barrier cleanup. A current
  baseline whose session watermark predates late A0 save/restore settlement carries restoration
  debt; clean Close, Publish, and Preview must persist exact A1 bytes before continuing. A
  read-only reload does not create server-write debt and stale cache effects are revalidated.
- Loading and rejected-load boundaries physically disable every server mutation except the
  zero-write-safe Close path; no publish/preview/trash/revision/upload request may escape.
- Shell-owned Close promises, restore confirmations, navigation/focus effects, and publish
  feedback are keyed by the same route-session identity; no pending A UI state survives into B/A1.
- Autosave failure propagates to a visible accessible error; the editor, draft,
  and retry action remain available.
- Rows are not synthetic links/buttons. The existing title `AdminLink` remains
  the canonical keyboard and pointer navigation target.
- The production icon-only row-actions trigger has a stable contextual accessible name;
  mocks cannot stand in for this proof.
- Author and date/published context stay visible at `md..lg` without duplicating
  status or creating conflicting accessible names.

## Security Contract

No route, auth, RBAC, CSRF, rate-limit, nonce, captcha, or validation contract
changes. Existing post-save permissions and write protections remain the only
mutation boundary.

## Sub-Tasks

| ID | Title | Leaves | Status |
|---|---|---|---|
| TASK-543-01 | Autosave flush before Close | TASK-543-01-L01 | ✅ Done |
| TASK-543-02 | Posts table keyboard and metadata parity | TASK-543-02-L01 | ✅ Done |
| TASK-543-03 | Tests, smoke, and closure | TASK-543-03-L01 | ✅ Done |

## Finding coverage matrix

| Finding | Owner | Required proof |
|---|---|---|
| II-M-02 Close races autosave | 543-01/L01 | initial/post-hydration clean zero-write, dirty→Close success, pending-write revert restoration, identity reset, active-save coalescing, failure stays, double Close once |
| authoritative restore/cache refresh races local save | 543-01/L01 | physical predecessor→barrier→new-save ordering, cache-event generation gate, history/selection preservation |
| stale async response crosses post identity/session | 543-01/L01 | deferred old save/refresh/restore success+failure after A→B and A→B→A remain inert; loading/rejected boundaries dispatch no server mutations |
| PostsTable nested/non-keyboard row click | 543-02/L01 | row has no click role; title link works by keyboard and pointer |
| icon-only row actions trigger lacks a name | 543-02/L01 | production trigger accessible name plus shared PageTable no-regression |
| author/date disappear at mid viewport | 543-02/L01 | structural class proof plus 390/768/900/1024 px live accessible and visual assertions |

## Ownership and land order

Land `543-01 → 543-02 → 543-03`, after TASK-544 and before TASK-540 in the
audited dependency map. The autosave/editor-state/shell seam and its direct tests belong exclusively to
543-01; PostsTable, PageRowActions, and their direct tests belong exclusively to 543-02.
Closure reruns all 13 targeted suites read-only and reopens neither source nor
changed-behavior tests.
The orchestrator solely authors `_docs/_workflows/task-543-implement.mjs`; implementation
agents do not edit workflow/task/index/changelog files.

## Testing Requirements

- `bun --cwd core lint:types` and `bun --cwd core lint` after source leaves.
- Targeted post autosave, editor-state hook, editor shell/header, PostsTable, list
  integration, PageRowActions, and PageTable no-regression Vitest suites.
- At least five light/dark flows covering clean Close, dirty successful Close,
  pending-write revert restoration, failure/retry, double activation, keyboard row
  navigation, and narrow/mid/large metadata; focused tests additionally prove post-hydration
  clean zero-write and editor-identity reset. Require zero console errors and visible/ARIA
  assertions.
- Final task gates additionally include full `bun run test`, `precommit:check`, Admin
  build/boundary/bundle, release gates, strict security scan, staged `bun run precommit`,
  and the exact helper + full `playwright-cli -s=wf543smoke` runtime contract owned by
  TASK-543-03-L01.

## Documentation Updates Required

Update `docs/guide/coderso/post-editor-preview-revisions-and-settings.md` and
`docs/guide/coderso/posts-list-and-creation.md`. At closure finalize draft
changelog 1255 and close all descendants.

## Completion

TASK-543 is complete. Close now awaits the newest exact durable draft across same-post route
epochs, remains in the editor on failure, and coalesces repeated activation. Posts rows are
passive, native controls have contextual accessible names, and one status/author/date copy stays
visible across 390/768/900/1024 px. The final matrix passed 159/159; fresh full lanes passed
8,567 tests with one intentional opt-in skip and zero failures; static/Admin/release gates passed.
Seven real light/dark CLI flows produced 11 distinct screenshots with zero console errors,
warnings, or page errors and complete cleanup. Changelog 1255 contains the exact evidence.

## Superseded pre-fix evidence

The following evidence predates the final drift-audit findings and does not close this task.
Fresh targeted/full validation, live smoke, and post-audits are required after remediation.

Close now waits for the latest exact draft and remains in the editor on failure; Retry persists
without navigating and a later clean Close performs no redundant write. Posts rows are passive,
native controls are named, and author/date metadata remains available at mid widths. Targeted
tests passed 112/112; full Bun and sequential Vitest passed 8,539 tests with one intentional
opt-in live skip and zero failures. Admin/static gates, release gates 5/5, and task Semgrep passed.
Seven light/dark live CLI flows used one real UI fixture, produced 11 screenshots with zero
console errors, warnings, or page errors, and cleaned all task state. Changelog 1255 records the
full evidence; no route, schema, migration, RBAC, or security contract changed.

## Superseded closure attempt

The evidence below predates the final cross-session drain finding and cannot close the task.
Fresh targeted/full validation, audits, and live smoke are required after remediation.

The reopened route-session and workflow findings are closed. The final 13-file Vitest matrix
passed 144/144; full validation passed 1,687 Bun tests plus 6,865 Vitest tests (8,552 total),
with one intentional opt-in live skip and zero failures. Type/lint, `precommit:check`, Admin
build/boundary/bundle, task-scoped Semgrep, and all five Coderso release gates passed. The strict
scan's only non-green result is the exact unchanged TASK-545-owned Semgrep finding at
`_docs/_workflows/task-522-author.mjs:185`; no suppression or scanner configuration changed.

Seven real light/dark flows used the exact dev helper and separate full `playwright-cli`
commands. They covered clean Close, delayed dirty Close, pending-write restoration,
failure/focused Retry, double Close, native keyboard controls, and the 390/768/900/1024 px
metadata cascade. All visible/ARIA/request assertions passed with zero console errors,
warnings, or page errors. The fixture, routes, browser session, helper processes, and ports
were removed, and the original light theme was restored. Changelog 1255 contains the final
11 screenshot hashes and complete validation summary.
