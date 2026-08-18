# TASK-576: Workflow Surface Repair And Gate Re-green

**Status:** ✅ Done
**Started:** 2026-08-17
**Completed:** 2026-08-18
**Changelog:** 1298 (pinned)
**Priority:** High
**Size:** Large

# FileName: TASK-576_Workflow_Surface_Repair_And_Gate_Re_Green.md

**Parent Task:** none
**Source Findings:** H-545-01, H-545-02, H-545-03, H-545-04, M-545-06, M-545-07 (docs-only finding from the 2026-08-17 TASK-560 audit sweep; audit reports removed by owner 2026-08-18, evidence re-anchored at HEAD `6ca20b38`)

## Drift Correction (2026-08-17, during implementation)

The pre-implementation audit's fail-fast classifier (M-545-07) stopped at the
first non-canonical file, so the driver-contract checks never ran against the
remaining canonical-named top-level entries. A fresh full-inventory pass
during implementation exposed 15 legacy canonical-named pre-driver scripts
(task-486, task-536-545, task-548, task-551, task-556, task-557) that were
bulk-tracked by the 2026-08-15 `chore(workflows)` commit and never migrated to
the TASK-545 driver contract. They failed the exact-identity result guard,
the `runCanonicalAuditRounds` import, or the independent post-audit lens
declaration. They are historical records for closed or not-yet-started tasks
and none is a live workflow for any current task, so per the disposition
rules they were **archived** byte-identically into
`_docs/_workflows/_archive/` (46 files total). The disposition matrix records
the full 15-file extension. Also fixed: `workflowStaticContractDrivers.ts`
called `assertTask554CloseoutGuardContract` without importing it (latent bug
masked by the fail-fast enumeration); added the missing import. Gate result
after the correction: `workflowStaticContract.test.ts` 6/6 green,
`taskGraphIntegrity.test.ts` 6/6 green, `node --check` clean on the remaining
canonical inventory, smoke-evidence suites 92/92 green.

## Purpose

The TASK-545 workflow surface gates are currently RED:

- `workflowStaticContract.test.ts` fails (8 FAIL) because the tracked
  `_docs/_workflows/task-514-impl.mjs` is non-canonical and inside the exact
  executable glob (H-545-01).
- 29 tracked `.mjs` workflows fail `node --check` (top-level `return` etc.),
  breaking the leaf's Node syntax-check gate (H-545-02).
- Legacy scripts still contain `git commit` instructions and dynamic
  `highest+1` changelog allocation, violating the zero-commit/no-dynamic-number
  contract (H-545-03).
- The workflow test files themselves exceed 1,000 lines
  (`workflowStaticContract.test.ts` 1500, `smokeEvidence.test.ts` 1115,
  `smokeEvidenceCheckpoint.test.ts` 1066) (H-545-04).
- `taskGraphIntegrity.test.ts` was failing on a stats mismatch at the pinned
  HEAD (physical 279/8/3477 vs README 276/7/3477) (M-545-06). At CURRENT HEAD
  (818f5189) the physical counts are 299/6/3483 and README matches exactly —
  the gate passes 6/6, so the docs-only sync is ALREADY DONE by the TASK-560
  closure. This part of the scope is re-scoped to VERIFICATION ONLY (confirm
  green, keep green) plus the reliability fix below.
- `taskGraphIntegrity.test.ts` has a reliability defect: at Bun's default 5s
  per-test timeout, 3 of 6 tests time out under load (each re-runs
  `git ls-files` + parses all 3788 task files, ~34k file reads). Add
  memoization of the parsed inventory (beforeAll-scoped) or an explicit
  per-test timeout so the gate is not intermittently red.
- The fail-fast classifier reports only the first offending file instead of
  aggregating the full inventory (M-545-07).

## Evidence

- `git ls-files '_docs/_workflows/task-514-impl.mjs'` returns the file;
  `node --check` on the 29-file inventory fails, e.g.
  `_docs/_workflows/task-511-author-audit.mjs:347`,
  `_docs/_workflows/task-514-impl.mjs:142` (`Illegal return statement`).
- `task-514-impl.mjs:207` dynamic `highest+1`, `:212` `git add -A && git commit`;
  similar `git commit` in task-516/519/520/521/522 impl files.
- H-545-03 forbidden directives: beyond the cited git commits in
  task-514/516/519/520/521/522, the gate regex
  `/commit\s+on\s+the\s+worktree/iu` also matches 6 more files
  (task-523-full.mjs:198, task-524-impl.mjs:133, task-525-impl.mjs:125,
  task-526-full.mjs:169, task-528-full.mjs:124, task-529-full.mjs:124), and
  ~15 files carry dynamic next-free changelog allocation prose. The gate
  regexes are also narrow — `/(?:scan|find|allocate|pick|choose|use)\s+(?:the\s+)?(?:next|highest)[- ]free/iu`
  misses some existing phrasing, so violations can survive the gate. Expand the
  inventory to the FULL offender set and state that ALL fixed pins must replace
  every next-free/commit directive, not just the cited lines.
- `wc -l tests/unit/workflows/workflowStaticContract.test.ts` = 1500;
  `smokeEvidence.test.ts` = 1115; `smokeEvidenceCheckpoint.test.ts` = 1066.
- `tests/unit/workflows/taskGraphIntegrity.test.ts:128-137` counts 279/8/3477.

## Scope

- Separate archive from executable surface: move historical workflow files out
  of the executable glob OR migrate each to a canonical name, role, driver, and
  fresh audit (do not widen the regex to accept non-canonical files). Use an
  explicit disposition matrix for the 31 files (30 tracked non-canonical
  top-level files, 2 of which are syntax-valid — task-536-545-author-audit.mjs,
  task-554-implement-diag.mjs — and 1 canonical-named file that is
  syntax-invalid, task-511-author-audit.mjs) so every file's disposition
  (archive vs repair vs migrate) is explicit.
- Fix all 29 syntax-invalid files or archive them; never weaken the
  `node --check` gate.
- Remove `git commit` instructions and dynamic changelog allocation from tracked
  workflows (FULL offender inventory); use fixed pre-assigned changelog numbers.
- Split the three workflow test files below 1,000 lines into cohesive suites
  (inventory/forbidden directives, manifest validation, checkpoint/resume),
  independently runnable.
- Verify `taskGraphIntegrity` stays green at current HEAD (stats sync already
  done); add inventory memoization or explicit per-test timeouts to remove the
  under-load flake.
- Make the classifier aggregate all non-canonical paths + forbidden directives
  instead of stopping at the first.

## Fix Strategy

1. Move non-canonical/legacy `.mjs` into an explicit archive dir (e.g.
   `_docs/_workflows/_archive/`) outside the executable glob, updating any
   inventory/glob references; record every moved file in the disposition matrix.
2. Repair or archive the 29 syntax-invalid files; re-run `node --check` on the
   canonical inventory.
3. Strip ALL forbidden directives (full offender list); pin changelog numbers.
4. Split tests by cohesive responsibility; add the taskGraphIntegrity inventory
   memoization/timeout fix.
5. Verify stats sync is current at HEAD and keep `taskGraphIntegrity` green
   (no new docs-only sync needed unless drift reappears).

## Validation

- `bun test tests/unit/workflows/workflowStaticContract.test.ts` green.
- `node --check` passes for every canonical tracked `.mjs`.
- `bun test tests/unit/workflows/taskGraphIntegrity.test.ts` green.
- `bun --cwd core lint` + `bun --cwd core lint:types`.
- Line counts <= 1000 for every touched test file.

## Notes

- TASK-545 cannot serve as a trustworthy base until these gates are green
  again; this is the repair family for that surface.
