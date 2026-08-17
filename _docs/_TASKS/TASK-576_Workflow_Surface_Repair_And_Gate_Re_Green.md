# TASK-576: Workflow Surface Repair And Gate Re-green

**Status:** ⏳ To Do
**Started:**
**Completed:**
**Priority:** High
**Size:** Large

# FileName: TASK-576_Workflow_Surface_Repair_And_Gate_Re_Green.md

**Parent Task:** none
**Source Findings:** H-545-01, H-545-02, H-545-03, H-545-04, M-545-06, M-545-07 (audit `_TMP-audit-task-545-workflow-integrity.md`, verified at HEAD `4e3dab15`)

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
- `taskGraphIntegrity.test.ts` fails: physical parser counts 279/8/3477 vs
  README 276/7/3477 (M-545-06).
- The fail-fast classifier reports only the first offending file instead of
  aggregating the full inventory (M-545-07).

## Evidence

- `git ls-files '_docs/_workflows/task-514-impl.mjs'` returns the file;
  `node --check` on the 29-file inventory fails, e.g.
  `_docs/_workflows/task-511-author-audit.mjs:347`,
  `_docs/_workflows/task-514-impl.mjs:142` (`Illegal return statement`).
- `task-514-impl.mjs:207` dynamic `highest+1`, `:212` `git add -A && git commit`;
  similar `git commit` in task-516/519/520/521/522 impl files.
- `wc -l tests/unit/workflows/workflowStaticContract.test.ts` = 1500;
  `smokeEvidence.test.ts` = 1115; `smokeEvidenceCheckpoint.test.ts` = 1066.
- `tests/unit/workflows/taskGraphIntegrity.test.ts:128-137` counts 279/8/3477.

## Scope

- Separate archive from executable surface: move historical workflow files out
  of the executable glob OR migrate each to a canonical name, role, driver, and
  fresh audit (do not widen the regex to accept non-canonical files).
- Fix all 29 syntax-invalid files or archive them; never weaken the
  `node --check` gate.
- Remove `git commit` instructions and dynamic changelog allocation from tracked
  workflows; use fixed pre-assigned changelog numbers.
- Split the three workflow test files below 1,000 lines into cohesive suites
  (inventory/forbidden directives, manifest validation, checkpoint/resume),
  independently runnable.
- Reconcile physical task statuses vs README so `taskGraphIntegrity` passes
  (one atomic docs-only sync; record in changelog).
- Make the classifier aggregate all non-canonical paths + forbidden directives
  instead of stopping at the first.

## Fix Strategy

1. Move non-canonical/legacy `.mjs` into an explicit archive dir (e.g.
   `_docs/_workflows/_archive/`) outside the executable glob, updating any
   inventory/glob references.
2. Repair or archive the 29 syntax-invalid files; re-run `node --check` on the
   canonical inventory.
3. Strip forbidden directives; pin changelog numbers.
4. Split tests by cohesive responsibility.
5. Sync task statuses/README stats; re-run `taskGraphIntegrity`.

## Validation

- `bun test tests/unit/workflows/workflowStaticContract.test.ts` green.
- `node --check` passes for every canonical tracked `.mjs`.
- `bun test tests/unit/workflows/taskGraphIntegrity.test.ts` green.
- `bun --cwd core lint` + `bun --cwd core lint:types`.
- Line counts <= 1000 for every touched test file.

## Notes

- TASK-545 cannot serve as a trustworthy base until these gates are green
  again; this is the repair family for that surface.
