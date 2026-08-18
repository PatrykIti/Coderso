# 1299 - TASK-577 Smoke Evidence Canonical Boundary

**Date:** 2026-08-18
**Version:** Unreleased
**Tasks:** TASK-577

## Key Changes

### Smoke / Evidence
- The evidence boundary is narrowed to the canonical
  `EVIDENCE_ROOT = "_docs/_workflows/_smoke/evidence/<task>"`: task-547 and
  task-540 follow the existing modular adapter pattern (task-487/511) with
  `evidenceDirectory(input, root)` returning
  `resolveInsideRoot(root, <EVIDENCE_ROOT>/<session>, "<task>_evidence")`;
  task-554's `EVIDENCE_ROOT` changes to the canonical task-scoped path.
- The `smoke-evidence-inventory` guard rejects un-reconciled additions; all
  tracked smoke files now live under the canonical boundary.
- Post-implementation doc note added: the canonical boundary and the
  inventory guard are the single source of truth for smoke evidence
  placement (re-audit note recorded in the task file).

## Validation
- `bun --cwd core lint` + `lint:types` green; re-run affected suites (fast)
  and commit canonical reports; `smokeEvidence`/`smokeEvidenceCheckpoint`
  suites (1115/1066-line test families) stay green; inventory guard accepts
  the reconciled evidence tree (92/92).
