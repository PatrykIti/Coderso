# TASK-577: Smoke Evidence Canonical Boundary

**Status:** ⏳ To Do
**Started:**
**Completed:**
**Priority:** Medium
**Size:** Medium

# FileName: TASK-577_Smoke_Evidence_Canonical_Boundary.md

**Parent Task:** none
**Source Findings:** M-545-05 + NEW-M-01 (audits `_TMP-audit-task-545-workflow-integrity.md`, `_TMP-audit-task-560-smoke-migration.md` + workflow/tooling review, verified at HEAD `4e3dab15`)

## Purpose

The evidence boundary is no longer narrow or fully validatable. `.gitignore`
re-includes the whole `_docs/_workflows/**` tree; Git tracks 478 smoke files but
only 123 live under the canonical `evidence/task-*` boundary, so the rest do not
satisfy the TASK-545 manifest rule. Two legacy adapters (task-547, task-554)
have no `evidenceDirectory` method, so their `report.json` never lands under the
canonical evidence path (report goes only to stdout), and loose task-554
evidence was committed at HEAD outside the canonical root. A live-tree guard is
needed to reject un-reconciled executable/evidence additions.

## Evidence

- `.gitignore:22-24` re-includes `_docs/_workflows/**`.
- 478 tracked smoke files vs 123 under `evidence/task-*`.
- `grep -n evidenceDirectory scripts/runtime-smoke/adapters/task-547/*.ts
  scripts/runtime-smoke/adapters/task-554/*.ts` → no matches; the shared entry
  writes `report.json` only when the adapter exposes `evidenceDirectory`
  (`scripts/runtime-smoke.ts:95-126`).
- Loose task-554 evidence committed at HEAD under `_docs/_workflows/_smoke/task-554/`
  (outside `evidence/task-554/`).

## Scope

- Add `evidenceDirectory` to the task-547 and task-554 adapters so reports land
  at `_docs/_workflows/_smoke/evidence/<task>/<session>/report.json` (keep
  stdout behavior; do not remove the CLI path).
- Move/commit the loose task-554 evidence into the canonical boundary (or
  classify it explicitly as archive, not ledger evidence).
- Add a live-tree guard (or inventory test) that rejects un-reconciled
  executable/evidence additions outside the canonical paths, without deleting
  history.
- Keep the `.gitignore` re-include but make the boundary explicit and validated.

## Fix Strategy

Follow the existing modular adapter pattern (e.g. task-554's sibling adapters):
implement `evidenceDirectory(input, root)` returning
`join(root, "_docs/_workflows/_smoke/evidence", suite, session)`, re-run the
two suites (fast), and commit the canonical reports.

## Security Contract

- No endpoint change; smoke tooling only. Evidence remains repo-local and
  secret-free (redaction contract applies).

## Validation

- `bun test tests/unit/runtime-smoke/cli-registry.test.ts` green (12 suite IDs
  pinned).
- Re-run task-547 + task-554 fast; assert `report.json` appears under
  `evidence/<task>/<session>/`.
- Guard test: adding an un-reconciled executable/evidence path fails the
  inventory check.

## Notes

- This is the evidence-half of the TASK-545/M-545-05 boundary; the executable
  half is TASK-576.
