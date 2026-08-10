# TASK-545: Workflow, Smoke Evidence, and Task-Graph Integrity

# FileName: TASK-545_Workflow_Smoke_Evidence_and_Task_Graph_Integrity.md

**Priority:** High
**Category:** Contributor Workflow / Audit Integrity / Evidence / Task Graph
**Estimated Effort:** Large
**Dependencies:** TASK-554
**Status:** ⏳ To Do
**Contract Refreshed:** 2026-08-08 (canonical finding-driven audit passes)
**Changelog:** 1257 (pinned; create only at implementation closure)

---

## Overview

The original audit inspected a local workflow corpus that no longer exists in a
clean checkout. Commit `5facaf3212739b0bd31f9aadc1e9357d497fc566`
intentionally removed and globally ignored `_docs/_workflows/`; later commit
`0ca8ad5b` restored only the four modules required by tracked tests. At refreshed
HEAD, `git ls-files` therefore owns exactly two executable workflow entries:
`task-522-author.mjs` and `task-543-implement.mjs`. The first has one confirmed
false-clean agent-result `audits.filter(Boolean)` consumer; the three literal
uses in TASK-543 are ordinary browser/path/process-data filtering and are not
agent-result guards.

**Predecessor gate:** security-first TASK-554 terminal is the hard
predecessor; it lands immediately before TASK-545, and this family builds on
that foundation.

This family repairs the reproducible tracked workflow surface, not ignored
owner-local artifacts. It replaces bespoke audit/post-audit loops, prompts that
tell agents to commit, dynamic changelog allocation, and deferred smoke in that
surface. Existing screenshots lack a tracked machine-verifiable scenario
manifest, while historical task/board/changelog metadata contains a bounded set
of parent, status, date, and number contradictions. This work is
documentation/tooling only: no product route, database, runtime, scanner
allowlist, or source vulnerability fix belongs here. TASK-538 owns the confirmed
SVG source finding.

## Terminal Shared-Smoke Baseline

TASK-552's terminal shared-smoke source is commit
`a13d186167a05901e644bf1a3a7aefee6f780471`, landed through merge
`963733cae23456622bea1eef1b734723aaab2350`. TASK-545 extends, but never copies,
the static `scripts/runtime-smoke.ts` entry, adapter registry,
`RuntimeLifecycle`, condition polling/process supervision, `WorkerPool`,
set-based database helpers, `BrowserTransport`/`PlaywrightCliDispatcher`,
`CheckpointStore`/`sealScenarioCheckpoint`, repository guard, report/redaction,
and `docs/develop/runtime-smoke-cookbook.md` recipes.

TASK-552 scenario checkpoints are suite-owned optional runtime-resume evidence.
TASK-545's owner-review `resume-checkpoint.json` is a distinct closure/evidence-
tracking contract and must not impersonate or overwrite a
`ScenarioCheckpoint`. No TASK-545 workflow or future suite may add another
lifecycle, Playwright wrapper, worker protocol/pool, database cleanup loop,
checkpoint store, report loop, or dynamic adapter loader.

## Canonical workflow contract

- A shared `requireAllResults(results, expectedIdentities, label)` rejects wrong counts,
  every null/missing result, and wrong/duplicate/reordered caller-owned job identities.
  Every tracked agent-result collection must pass that guard before flattening,
  counting, or clean classification. Ordinary domain-data filtering remains
  legal; no result-filtering pattern may manufacture a clean pass.
- Each tracked canonical author/audit workflow performs one complete initial pass containing
  every expected per-file audit plus exactly one cross-file reconcile. It may
  finish immediately when all expected results exist and no HIGH/MEDIUM finding
  remains. After a verified HIGH/MEDIUM fix, rerun only the affected per-file
  scopes plus one fresh reconcile over the changed/shared contracts; never replay
  unchanged clean scopes merely to satisfy a round count.
- Tracked canonical implementation/fix/full workflows declare the exact independent post-audit
  lens identities appropriate to the touched contract and validate every result.
  There is no arbitrary minimum lens count. Agents never commit, allocate a
  changelog dynamically, or defer a mandatory UI smoke.
- Reusable runtime smoke enters only through the statically registered
  `bun scripts/runtime-smoke.ts run --suite <suite> --profile <profile>
  --session <session>` contract and composes the shared cookbook primitives.
  TASK-545 adds only a generic backward-compatible visible-evidence result/
  normalizer to the shared runner and validates its strict report/evidence after
  the runner exits; it
  never starts a server/browser/worker, performs DB cleanup, or defines another
  lifecycle/checkpoint/report loop.
- Smoke evidence lives at
  `_docs/_workflows/_smoke/evidence/task-###/<validated-session>/` with a
  validated manifest: task, exact suite/profile/session, HEAD, dirty state plus
  deterministic working-tree digest, timestamp, at least five distinct scenarios,
  `admin|public` surface, theme, viewport, visible assertions, console errors,
  relative screenshot path, and SHA-256. Scenario pass/title/order, variants,
  assertion expected/actual values, console arrays, and per-scenario/global
  screenshot inventory must be a byte-equivalent projection of the shared runner
  report; post-run fabrication fails. Admin evidence contains both light and
  dark variants. The task directory, manifest task ID, HEAD, dirty flag, and
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

## Tracked workflow boundary

`git ls-files -z -- '_docs/_workflows/*.mjs'
'_docs/_workflows/lib/*.mjs'` is the sole executable/library inventory for
TASK-545 static gates. A recursive filesystem scan is prohibited because it
would make closure depend on ignored local files that CI and a fresh clone
cannot reproduce. Historical scripts removed by `5facaf32` may be inspected
read-only through Git history for migration evidence, but TASK-545 neither edits
nor claims to repair those deleted artifacts.

After terminal TASK-554, the expected initial executable migration set is
exactly five tracked entries:

- `_docs/_workflows/task-522-author.mjs`;
- `_docs/_workflows/task-543-implement.mjs`;
- `_docs/_workflows/task-554-author-audit.mjs`;
- `_docs/_workflows/task-554-implement.mjs`;
- `_docs/_workflows/task-554-fix.mjs`.

TASK-545 re-freezes that set with `git ls-files` immediately before dispatch.
An unexpected tracked executable requires role assignment, a contract update,
and a fresh affected audit; it is never silently swept into wildcard ownership.
Because `_docs/_workflows/` remains globally ignored, every new TASK-545 file
under that tree—including executables, libraries, declarations, schemas, and
guidance—is returned for owner review and explicitly force-tracked by the owner.
Agents never stage it. A clean-checkout `git ls-files` plus `git show HEAD:<path>`
byte-parity pass is mandatory before any implementation or closure phase
consumes those files. An ignored local lookalike is nonauthorizing and is rebuilt
from the audited contract; it is never promoted merely by force-adding its
pre-existing bytes.

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
| false-clean/missing result filtering | 545-01/L01..L02 | unit/static corpus rejects missing counts/results in every tracked agent-result collection without banning valid domain-data filtering |
| bespoke/misplaced audit and incomplete post-audit identities | 545-02/L01..L02 | AST/static assertions plus workflow smoke show one complete initial pass, one reconcile per pass, affected-scope-only reruns, and exact declared lens results |
| agent commits, dynamic pins, deferred smoke | 545-02/L01 + L02 | static scan of tracked entries has zero forbidden prompt/lookup patterns |
| already-remediated TASK-522 prompt-injection/Semgrep boundary | 545-02/L01 | changelog 1259's tracked formatter and focused test stay read-only; targeted regression + strict scan remain green with no suppression |
| untracked unverifiable smoke | 545-03/L01..L02 | canonical-root phase 1 writes a strict checkpoint and pauses; exact owner-only resume proves tracked parity; wrong/stale replay and non-metadata closure drift fail |
| enumerated task/board/changelog drift | 545-04/L01..L04 | physical graph/index/statistics/status/changelog evidence audit returns zero scoped contradictions |

## Ownership and land order

Land `545-01-L01 → 545-02-L01 → 545-02-L02 → 545-01-L02 → 545-03 →
545-04`, last in the program. This interleave prevents the final live static test from
landing before its workflow fixes. Separate leaves
own the helper/direct helper test, audit-round driver/direct behavior test,
post-audit driver/direct behavior test, additive live-tree static suite, disjoint
author/audit and implement/fix scripts, manifest contract/tests, tracking/docs,
historical task files, and final indexes. Closure reads both indexes fresh and
applies a deterministic metadata mutation plan: exact frozen before-hashes,
exact field/row operations, and exact expected after-hashes. A path allowlist by
itself is never sufficient. Product source is a forbidden path.

The initial migration inventory is the five-entry tracked set frozen above.
TASK-545 may migrate the already-landed TASK-554 workflow contracts, but it does
not reinterpret or retroactively convert TASK-554's completed loose smoke
evidence into a TASK-545 manifest/checkpoint family.

## Testing Requirements

- `bun --cwd core lint:types` and `bun --cwd core lint` if shared TypeScript is
  touched; otherwise the workflow-specific Node/Bun static suites.
- `node --check` for every changed and tracked `.mjs`, unit tests for the all-results helper
  and manifest validator, staged audit-round/post-audit driver behavior suites before
  live-script migration, task graph/filename/H1/parent/status/changelog audit, and hash
  verification.
- Execute a synthetic workflow smoke proving a missing result voids a pass, one
  complete clean pass exits immediately, and a verified fix reruns only affected
  scopes with exactly one fresh reconcile.
- Run `git diff --check`, program-targeted static audits, and the repository
  precommit/gate commands required at closure. A named failing file is rerun once.
- Prove a clean-checkout-equivalent `git ls-files` inventory; ignored local
  workflow files are reported separately and never counted as migrated or green.

## Documentation Updates Required

Update `_docs/_workflows/` guidance, the generic manifestable-visible-evidence
recipe in `docs/develop/runtime-smoke-cookbook.md`, `_docs/_TASKS/README.md`, and
`_docs/_CHANGELOG/README.md`. At closure create changelog 1257 and close every
descendant only after the graph audit passes.
