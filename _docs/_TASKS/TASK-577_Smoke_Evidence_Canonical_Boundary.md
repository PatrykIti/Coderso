# TASK-577: Smoke Evidence Canonical Boundary

**Status:** ⏳ To Do
**Started:**
**Completed:**
**Changelog:** 1299 (pinned)
**Priority:** Medium
**Size:** Medium

# FileName: TASK-577_Smoke_Evidence_Canonical_Boundary.md

**Parent Task:** none
**Source Findings:** M-545-05 + NEW-M-01 (audits `_TMP-audit-task-545-workflow-integrity.md`, `_TMP-audit-task-560-smoke-migration.md` + workflow/tooling review, verified at HEAD `4e3dab15`)

## Purpose

The evidence boundary is no longer narrow or fully validatable. `.gitignore`
re-includes the whole `_docs/_workflows/**` tree; Git tracks 478 smoke files but
only 123 live under the canonical `evidence/task-*` boundary, so the rest do not
satisfy the TASK-545 manifest rule. Adapter status: **task-547 and task-540 have
NO `evidenceDirectory`** (their `report.json` goes only to stdout), while
**task-554 DOES have `evidenceDirectory`** (`task-554.ts:920`) but points at the
NON-canonical `EVIDENCE_ROOT = "_docs/_workflows/_smoke/task-554"`
(`task-554/output-manifest.ts:14`) instead of
`_docs/_workflows/_smoke/evidence/task-554`. Loose task-554 evidence was
committed at HEAD outside the canonical root. A live-tree guard is needed to
reject un-reconciled executable/evidence additions.

## Evidence

- `.gitignore:22-24` re-includes `_docs/_workflows/**`.
- 478 tracked smoke files vs 123 under `evidence/task-*`.
- `grep -n evidenceDirectory scripts/runtime-smoke/adapters/task-547/*.ts
  scripts/runtime-smoke/adapters/task-540/*.ts` → no matches; task-554 HAS one
  at `scripts/runtime-smoke/adapters/task-554.ts:920` returning
  `${EVIDENCE_ROOT}/${session}` with the NON-canonical
  `EVIDENCE_ROOT = "_docs/_workflows/_smoke/task-554"`
  (`scripts/runtime-smoke/adapters/task-554/output-manifest.ts:14`).
- The shared entry writes `report.json` only when the adapter exposes
  `evidenceDirectory` (`scripts/runtime-smoke.ts:95-126`).
- Loose task-554 evidence committed at HEAD under `_docs/_workflows/_smoke/task-554/`
  (outside `evidence/task-554/`).

## Scope

- Add `evidenceDirectory` to the task-547 AND task-540 adapters so reports land
  at `_docs/_workflows/_smoke/evidence/<task>/<session>/report.json` (keep
  stdout behavior; do not remove the CLI path).
- Fix task-554's `evidenceDirectory`: change
  `EVIDENCE_ROOT = "_docs/_workflows/_smoke/task-554"` to the canonical
  `"_docs/_workflows/_smoke/evidence/task-554"` in
  `task-554/output-manifest.ts` (the method exists; only the root is wrong).
- Move/commit the loose task-554 evidence into the canonical boundary (or
  classify it explicitly as archive, not ledger evidence).
- Add a live-tree guard (or inventory test) that rejects un-reconciled
  executable/evidence additions outside the canonical paths, without deleting
  history.
- Keep the `.gitignore` re-include but make the boundary explicit and validated.

## Fix Strategy

- task-547 / task-540: follow the existing modular adapter pattern (e.g.
  task-487/511): add `evidenceDirectory(input, root)` returning
  `resolveInsideRoot(root, `${EVIDENCE_ROOT}/${input.session}`, "<task>_evidence")`
  with `EVIDENCE_ROOT = "_docs/_workflows/_smoke/evidence/<task>"` in their
  output-manifest modules; the adapter object exposes the method.
- task-554: change `EVIDENCE_ROOT` to the canonical
  `"_docs/_workflows/_smoke/evidence/task-554"`; no new method needed.
- Re-run the affected suites (fast), and commit the canonical reports. Note the
  shared entry writes only `report.json`, not a separate manifest.json; the
  screenshot manifest stays adapter-owned (do not add a second manifest
  contract).

## Security Contract

- No endpoint change; smoke tooling only. Evidence remains repo-local and
  secret-free (redaction contract applies).

## Validation

- `bun test tests/unit/runtime-smoke/cli-registry.test.ts` green (12 suite IDs
  pinned).
- Re-run task-547 + task-540 fast; assert `report.json` appears under
  `evidence/<task>/<session>/`.
- Re-run task-554 fast; assert `report.json` now lands under
  `evidence/task-554/<session>/` (canonical) instead of `_smoke/task-554/`.
- Guard test: adding an un-reconciled executable/evidence path fails the
  inventory check.

## Notes

- This is the evidence-half of the TASK-545/M-545-05 boundary; the executable
  half is TASK-576.
