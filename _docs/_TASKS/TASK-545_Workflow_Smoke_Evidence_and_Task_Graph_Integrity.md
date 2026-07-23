# TASK-545: Workflow, Smoke Evidence, and Task-Graph Integrity

# FileName: TASK-545_Workflow_Smoke_Evidence_and_Task_Graph_Integrity.md

**Priority:** High
**Category:** Contributor Workflow / Audit Integrity / Evidence / Task Graph
**Estimated Effort:** Large
**Dependencies:** TASK-536–544 (lands last)
**Status:** ⏳ To Do
**Changelog:** 1257 (pinned; create only at implementation closure)

---

## Overview

The repository audit found workflows that can appear clean after missing agent
results: 58 unsafe agent-result consumers and 61 active scripts containing the
literal `.filter(Boolean)` at the current authoring tree. It also found author
loops with fewer than five sequential rounds or a reconcile
outside the round, post-audits with too few lenses, prompts that tell agents to
commit, dynamic changelog allocation, and deferred smoke. Existing screenshots
also lack a tracked machine-verifiable scenario manifest. Historical task/board/
changelog metadata contains a bounded set of parent, status, date, and number
contradictions.

This family repairs those process contracts and their static enforcement. It is
documentation/tooling only: no product route, database, runtime, scanner
allowlist, or source vulnerability fix belongs here. TASK-538 owns the confirmed
SVG source finding.

## Canonical workflow contract

- A shared `requireAllResults(results, expectedIdentities, label)` rejects wrong counts,
  every null/missing result, and wrong/duplicate/reordered caller-owned job identities.
  Active workflows contain zero literal
  `.filter(Boolean)`; no filtering pattern may manufacture a clean pass.
- Each active author/audit workflow performs at least five sequential rounds;
  every round contains all expected per-file audits and exactly one cross-file
  reconcile before fixes. A post-change pass is always fresh.
- Implementation/fix/full workflows require approximately five independent
  post-audit lenses with expected-count checks. Agents never commit, allocate a
  changelog dynamically, or defer a mandatory UI smoke.
- Smoke evidence lives at `_docs/_workflows/_smoke/evidence/task-###/` with a
  validated manifest: task, HEAD, dirty state plus deterministic working-tree digest,
  timestamp, at least five distinct scenarios,
  `admin|public` surface, theme, viewport, visible assertions, console errors,
  relative screenshot path, and SHA-256. Admin evidence contains both light and
  dark scenarios. The task directory, manifest task ID, HEAD, dirty flag, and
  deterministic working-tree digest must all match mandatory closure arguments;
  untracked or unreferenced evidence files fail. The real Git root + task ID derive the
  only accepted directory; caller-selected/symlinked/alternate roots fail. Fixtures contain
  no secrets, tokens, PII, raw user data, or environment values.
- Evidence validation is resumable and two-phase. Phase 1 validates revision/schema/file
  set/hashes, writes an integrity-bound strict checkpoint, and pauses with
  `owner_action_required` plus exact task/run/hash/resume arguments. Only the owner reviews
  and stages that task's evidence directory. The checkpoint binds the exact owning workflow
  entry and returns a safely quoted command plus authoritative argv; a closure-only resume
  verifies that executing entry, the unchanged evidence and exact `git ls-files` parity
  without replaying implementation. Validation is read-only; bounded closure metadata is
  idempotent/recoverable after a crash. Wrong script/task/run/hash/stale identity fails.
  Agents never stage or commit.
- The tracked pass freezes the runtime snapshot. Closure may subsequently change only that
  task family's files, the task index, the exact pinned/date-resolved changelog, and the
  changelog index. A final metadata-only delta check returns its revision/sorted paths;
  every source/test/config/runtime-doc/workflow/evidence/HEAD or other-task delta invalidates
  the smoke.
- `.gitignore` gains only the narrow evidence-path exception; global image
  behavior is otherwise unchanged.

## Historical repair boundary

- Correct stale child tables in TASK-498/499/502/503/512, self-parent fields in
  TASK-504/512, TASK-504-05 date, and TASK-533 changelog metadata.
- Canonicalize the 35 audited TASK-495–535 Done status fields without reopening
  them; remove TASK-532 transcript tags; resolve 1244 placeholders, the 1245
  allocation error, and descendant ellipses in changelogs 1244/1246/1247.
- Create minimal truthful historical parent files for TASK-528/529/530 from
  changelog and commit evidence; do not invent retroactive children/pseudocode.
- TASK-511 remains `⏳ To Do`; record its current tracked/no-worktree state and
  obsolete earlier audit without pretending implementation exists.
- Reconcile the scoped board/changelog rows and statistics from physical files.
  Never reopen a completed TASK-495–535 family.
- TASK-492–494 and TASK-511 product implementation remain outside this repair.

## Security Contract

No API, auth, RBAC, CSRF, rate-limit, nonce, captcha, DB, or product validation
surface changes. Workflow prompts must not export credentials, `.env`, private
keys, raw sensitive logs, or user data. Smoke evidence uses synthetic fixtures.
No scanner exception or allowlist is added.

## Sub-Tasks

| ID | Title | Leaves | Status |
|---|---|---|---|
| TASK-545-01 | All-results guard and static workflow contract | TASK-545-01-L01, L02 | ⏳ To Do |
| TASK-545-02 | Canonical audit and post-audit workflow | TASK-545-02-L01, L02 | ⏳ To Do |
| TASK-545-03 | Durable smoke evidence manifest | TASK-545-03-L01, L02 | ⏳ To Do |
| TASK-545-04 | Task graph, changelog repair, and closure | TASK-545-04-L01..L04 | ⏳ To Do |

## Finding coverage matrix

| Finding | Owner | Required proof |
|---|---|---|
| false-clean/missing result and `.filter(Boolean)` | 545-01/L01..L02 | unit/static corpus rejects missing counts/results in every active workflow |
| short/misplaced audit and too few post lenses | 545-02/L01..L02 | AST/static assertions plus workflow smoke show five rounds/one reconcile/five lenses |
| agent commits, dynamic pins, deferred smoke | 545-02/L01 + L02 | static scan of active scripts has zero forbidden prompt/lookup patterns |
| prompt-only strict-Semgrep finding in TASK-522 author workflow | 545-02/L01 | targeted scan passes after structured prompt rewrite, with no suppression |
| untracked unverifiable smoke | 545-03/L01..L02 | canonical-root phase 1 writes a strict checkpoint and pauses; exact owner-only resume proves tracked parity; wrong/stale replay and non-metadata closure drift fail |
| enumerated task/board/changelog drift | 545-04/L01..L04 | physical graph/index/statistics/status/changelog evidence audit returns zero scoped contradictions |

## Ownership and land order

Land `545-01-L01 → 545-02-L01 → 545-02-L02 → 545-01-L02 → 545-03 →
545-04`, last in the program. This interleave prevents the final live static test from
landing before its workflow fixes. Separate leaves
own the helper/direct helper test, audit-round driver/direct behavior test,
post-audit driver/direct behavior test, additive live-tree static suite, disjoint
author/audit and implement/fix scripts, manifest contract/tests, tracking/docs,
historical task files, and final indexes. Closure reads
both indexes fresh and touches only the declared metadata. Product source is a
forbidden path.

## Testing Requirements

- `bun --cwd core lint:types` and `bun --cwd core lint` if shared TypeScript is
  touched; otherwise the workflow-specific Node/Bun static suites.
- `node --check` for every changed `.mjs`, unit tests for the all-results helper
  and manifest validator, staged audit-round/post-audit driver behavior suites before
  live-script migration, task graph/filename/H1/parent/status/changelog audit, and hash
  verification.
- Execute a synthetic workflow smoke proving a missing result voids a round and
  a valid five-round sequence passes with exactly one reconcile each.
- Run `git diff --check`, program-targeted static audits, and the repository
  precommit/gate commands required at closure. A named failing file is rerun once.

## Documentation Updates Required

Update `_docs/_workflows/` guidance, `_docs/_TASKS/README.md`, and
`_docs/_CHANGELOG/README.md`. At closure create changelog 1257 and close every
descendant only after the graph audit passes.
