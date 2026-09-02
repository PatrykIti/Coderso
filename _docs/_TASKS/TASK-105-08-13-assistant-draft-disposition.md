# TASK-105-08-13: Assistant Draft Disposition
# FileName: TASK-105-08-13-assistant-draft-disposition.md

**Priority:** High
**Category:** QA + Test Integrity
**Estimated Effort:** Medium
**Dependencies:** TASK-105-08-10's `Recovery Complete` receipt; this leaf runs after
the L10 recovery and before TASK-105-08-12 final rebaseline
**Parent Task:** TASK-105-08
**Status:** ✅ Done
**Completed:** 2026-09-01

**HISTORICAL DISPOSITION RECEIPT (2026-08-26):** The recorded L13 workflow says all 17
inherited assistant-test drafts were repaired against then-current public source contracts
and classified retain and repair. This is historical receipt evidence only; it does not
change this leaf's current In Progress status or remove it as a TASK-105-08-12 predecessor.
The task remains active until its owner records an explicit closure through the normal
board/changelog workflow. The L13 fill workflow (5 agents, deepseek-v4-flash) reported that
the orchestrator independently re-verified the 2026-08-26 claims against local files and
command output.

Per-artifact outcome (17/17 `repaired-keep`; test counts before→after unchanged, no
case weakened or removed):
- **assistant (9):** `action-plan-schema-edge` (18→18), `action-planner-service-provider-policy-edge` (22→22),
  `admin-context-service-edges` (8→8), `assistant-service-residuals` (5→5), `openRouterProvider` (10→10),
  `blueprint-candidate-resolver` (8→8), `blueprint-assembler-edge` (20→20),
  `blueprint-compose-merge-branches` (27→27), `blueprint-conflict-match-branches` (18→18).
- **ui (8):** `assistant-action-plan-review-edge` (2→2), `assistant-admin-context-deep` (12→12),
  `assistant-admin-context-edge` (5→5), `assistant-micro-cases` (6→6),
  `assistant-panel-edge-errors` (6→6), `assistant-panel-edge` (19→19),
  `assistant-state-cache-edge` (6→6), `assistant-stepper-edge` (7→7).

Each retained suite adds reachable coverage absent from the committed green suites
(per-agent evidence: schema-normalization branches, provider-delegation seams,
admin-context canonicalization, blueprint merge/conflict branches, assistant-UI edge
states). Each suite passes targeted ESLint and Vitest and asserts observable behavior
(rendered DOM/ARIA, normalized output, error mapping, state transitions); no assertion
was weakened and no `.skip/.todo/xit` was introduced.

Validation gates — re-run by the orchestrator on 2026-08-26, all pass:
- **Vitest (per owned suite, one invocation each):** 17/17 pass.
- **ESLint (`--no-cache`, per owned path):** 17/17 pass (exit 0).
- **TypeScript:** `./node_modules/.bin/tsc -p tsconfig.json --noEmit --incremental false`
  → **0 diagnostics attributable to this leaf's 17 owned files**. 69 unrelated
  diagnostics exist in other active streams' files and are separated by owner below
  (contract criterion 3).
- **Diff:** `git diff --check -- <17 owned paths>` → clean.
- **Line count:** all ≤ 1000 (min 79, max 889).

Unrelated inherited tsc diagnostics (69 at this historical L13 receipt, none attributable
to this leaf) retain their original 16-file TASK-105-08-09 separation. The remaining 53
now have exact test-only ownership: TASK-105-08-06-L01 owns seven commerce test files and
15 diagnostics; TASK-105-08-06-L02 owns six media test files and 17 diagnostics;
TASK-105-08-08-L08 owns audit-list-residual and one diagnostic; TASK-105-08-08-L09 owns
seven entries test files and 19 diagnostics; and TASK-105-08-08-L10 owns
forms-residual-components and one diagnostic. Their exact paths and anchors live only in
those five child contracts. The eight
runtime-smoke source diagnostics remain under TASK-105-08-05-L04. This ownership
correction does not revise L13's historical validation claim or assert that any of the
newly assigned diagnostics has been repaired.

No production code, coverage configuration, L07-owned suite, task-board file, or
changelog file was changed by this leaf. No artifact was deleted, moved, excluded, or
skipped.

---

## Overview

Classify and repair the inherited assistant-test drafts that remained in the working tree
after `TASK-105-08-07` closed in commit `18a45f06` (changelog `1324`). This leaf is a
test-integrity recovery task, not a second implementation of L07: it must not reopen,
amend, or claim L07's completed coverage scope.

The work is test-only. It may correct the listed test drafts so that their fixtures,
mocks, and assertions match the current public source contracts, then determine whether
each still adds meaningful coverage for a reachable behavior. It must not edit production
code, API routes, schemas, task-board files, or changelog files.

An implementation agent returns a structured, immutable per-artifact evidence handoff to
the orchestrator. The orchestrator is the sole writer permitted to record the reviewed
outcomes in this task's completion notes; this evidence-recording exception grants no
source/test ownership and does not permit task-board or changelog edits.

## Scope and Single-Writer Ownership

This leaf is the sole writer of exactly these 17 inherited artifacts, and no other test
file or helper. Nine are assistant-service suites (seven untracked drafts plus two
inherited modifications to tracked suites); eight are assistant-UI drafts.

| # | Test artifact | Current form |
|---:|---|---|
| 1 | `tests/vitest/assistant/action-plan-schema-edge.test.ts` | untracked draft |
| 2 | `tests/vitest/assistant/action-planner-service-provider-policy-edge.test.ts` | untracked draft |
| 3 | `tests/vitest/assistant/admin-context-service-edges.test.ts` | untracked draft |
| 4 | `tests/vitest/assistant/assistant-service-residuals.test.ts` | untracked draft |
| 5 | `tests/vitest/assistant/blueprint-assembler-edge.test.ts` | untracked draft |
| 6 | `tests/vitest/assistant/blueprint-candidate-resolver.test.ts` | inherited tracked modification |
| 7 | `tests/vitest/assistant/blueprint-compose-merge-branches.test.ts` | untracked draft |
| 8 | `tests/vitest/assistant/blueprint-conflict-match-branches.test.ts` | untracked draft |
| 9 | `tests/vitest/assistant/openRouterProvider.test.ts` | inherited tracked modification |
| 10 | `tests/vitest/ui/assistant-action-plan-review-edge.test.tsx` | untracked draft |
| 11 | `tests/vitest/ui/assistant-admin-context-deep.test.tsx` | untracked draft |
| 12 | `tests/vitest/ui/assistant-admin-context-edge.test.tsx` | untracked draft |
| 13 | `tests/vitest/ui/assistant-micro-cases.test.tsx` | untracked draft |
| 14 | `tests/vitest/ui/assistant-panel-edge-errors.test.tsx` | untracked draft |
| 15 | `tests/vitest/ui/assistant-panel-edge.test.tsx` | untracked draft |
| 16 | `tests/vitest/ui/assistant-state-cache-edge.test.ts` | untracked draft |
| 17 | `tests/vitest/ui/assistant-stepper-edge.test.tsx` | untracked draft |

Vitest discovers all of these files through
`tests/vitest/**/*.{test,spec}.{ts,tsx}`. A render-based UI suite must keep
`// @vitest-environment happy-dom` as its first line; the Vitest lane otherwise defaults
to Node.

No wildcard ownership is granted. In particular, existing `assistant-*` suites outside
the table and all L07 closing suites remain read-only to this leaf.

## Disposition Contract

For each of the 17 artifacts, record one of the following evidence-backed outcomes in
this task's completion notes:

1. **Retain and repair** — it compiles, passes, asserts a current reachable public
   behavior, and contributes a meaningful branch, error mapping, state transition, or
   coverage gap that is not already behaviorally duplicated by a focused existing suite.
2. **Owner decision required** — source and fresh coverage show the draft is redundant,
   stale, or not worth retaining, but the file remains byte-preserved in the working tree
   until the repository owner explicitly authorizes deletion, relocation, or isolation.
   This result keeps L13 nonterminal and blocks TASK-105-08-12; it is not a closure-safe
   substitute for a working Vitest artifact.

Do not silently delete, rename, move, exclude, skip, or weaken an inherited artifact.
Do not use `coverage.exclude`, Istanbul/V8 ignore directives, focused/skipped tests, or
test-name-only assertions to improve a metric. A proposed deletion or isolation must
identify the exact artifact, its source/coverage evidence, a replacement test if one is
needed, and the owner's explicit authorization before any filesystem change.

## Implementation Pseudocode

```ts
for (const draft of ownedAssistantDrafts) {
  // Read the current source module and existing focused suites first.
  // Build fixtures from the exported/public input type rather than stale local shapes.
  // Keep dependency seams narrow and typed (`satisfies`, real union members, typed vi.fn).
  const result = exerciseReachablePublicBehavior(draft.fixture);

  // Assert the observable result: returned plan/error mapping, request shape,
  // state transition, rendered DOM/ARIA state, or user-visible error path.
  expect(result).toEqual(expectedBehavior);

  // Run the single draft; inspect its fresh coverage contribution and classify it.
  recordDisposition(draft, sourceEvidence, coverageEvidence);
}
```

Detailed sequence:

1. Capture the current diff for the 17 paths and read the directly exercised assistant
   service/UI source plus the already-committed L07 suites. Treat draft assumptions as
   untrusted until confirmed against current types and behavior.
2. Repair only real static or behavioral defects in an owned test. Use type-correct
   fixtures and mocks that match exported payloads, callback unions, provider responses,
   and injected dependency seams. Do not introduce `any`, unsafe casts, production
   fallbacks, or broad mock shapes merely to make a test compile.
3. Preserve test integrity: each retained case must drive a reachable public boundary and
   assert its observable outcome. Error cases assert the actual machine-readable error or
   rendered error state; UI cases assert rendered behavior/ARIA/state, not only that a
   mock was called. Do not force-click controls that production disables.
4. Run each owned suite independently. Use a fresh targeted coverage run or the final
   canonical artifact to establish whether the test covers a still-meaningful reachable
   behavior. Record the source symbol/line or behavior and the coverage result for every
   retained draft.
5. Where a draft is redundant or stale, leave it untouched and request an owner decision
   with the exact disposition evidence. Continue only with retain-and-repair artifacts;
   never delete or relocate another contributor's draft under this leaf.

## Validation Gates

- Targeted ESLint with cache disabled for exactly the owned paths:
  `./node_modules/.bin/eslint --no-cache <each owned test path>`.
- Targeted Vitest, one owned suite per invocation:
  `export TMPDIR=/tmp && set -a && . ./.env && set +a && NODE_ENV=test ./node_modules/.bin/vitest run --config vitest.config.ts <owned test path>`.
- Root TypeScript check:
  `./node_modules/.bin/tsc -p tsconfig.json --noEmit --incremental false`.
  Every diagnostic attributable to an owned path blocks this leaf. Preserve and classify
  unrelated existing dirty-worktree diagnostics for their named owner; rerun the command
  in final closure after all active leaves have repaired their own artifacts.
- Fresh targeted coverage evidence for every retained artifact; final aggregate numbers
  remain owned by TASK-105-08-12.
- `git diff --check`.
- Physical line-count check for every modified test file; each must be at most 1,000
  lines. Split by cohesive test responsibility before extending a near-limit suite.

## Security Contract

Test-only, internal repository work. No API route, authentication, RBAC, CSRF,
rate-limit, persistence, public-write, or anti-abuse contract changes are permitted.

## Acceptance Criteria

1. Every one of the 17 exact artifacts has an evidence-backed `retain and repair` or
   `owner decision required` disposition. Any `owner decision required` disposition
   keeps this leaf `🚧 In Progress` and blocks final rebaseline until explicit owner
   authorization resolves that exact artifact.
2. Every retained artifact has current type-correct fixtures/mocks, passes targeted
   ESLint and Vitest, and asserts meaningful reachable behavior without weakening a
   behavior assertion.
3. The root TypeScript command has been run and has no diagnostic attributable to this
   leaf's owned files; unrelated inherited failures are explicitly separated by owner.
4. No production code, coverage configuration, L07-owned suite, task-board file, or
   changelog file is changed. No artifact is deleted, moved, excluded, or skipped without
   explicit owner authorization.
5. All modified test files satisfy the 1,000 physical-line gate and `git diff --check`
   passes.

## Terminal Closure Receipt (TASK-105-09, 2026-09-01)

Status written by the closure owner after changelog 1325 recorded this leaf, per the
changelog-link rule noted on its board row.

- Disposition: all `17` inherited assistant drafts classified `retain and repair`
  (`17/17` repaired-keep), no case weakened, no skip/todo/only markers, no owner
  decision required.
- Orchestrator re-verification evidence:
  `/home/coder/.jcode/scratch/task105-l13-20260826/` — per-suite targeted Vitest and
  `--max-warnings=0` ESLint logs for all 17 owned artifacts (`17` vitest logs, all
  passing; empty failures record), with physical line checks under the 1,000-line cap.
