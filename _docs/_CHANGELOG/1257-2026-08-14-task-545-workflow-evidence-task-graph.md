# 1257 - TASK-545 Workflow, Smoke Evidence, and Task-Graph Integrity

**Date:** 2026-08-14
**Version:** Unreleased
**Tasks:** TASK-545, TASK-545-01, TASK-545-01-L01, TASK-545-01-L02, TASK-545-02, TASK-545-02-L01, TASK-545-02-L02, TASK-545-03, TASK-545-03-L01, TASK-545-03-L02, TASK-545-03-L03, TASK-545-03-L04, TASK-545-03-L05, TASK-545-04, TASK-545-04-L01, TASK-545-04-L02, TASK-545-04-L03, TASK-545-04-L04

## Key Changes

- Added the identity-aware `requireAllResults` helper and the static tracked-workflow inventory contract (canonical driver imports, guarded result consumption, ignored-local-file proof).
- Converged author/audit and implement/fix/post-audit workflows onto canonical drivers with exact lens identities and finding-driven affected-scope reruns.
- Owned the durable smoke-evidence manifest family: strict manifest schema/validator, report-side visible-evidence contract, canonical evidence-directory revision digest, narrow `.gitignore` tracking exception, checkpoint/resume state machine, closure metadata delta + `closure-delta` CLI, and the TASK-548 six-path committed-bootstrap gate. All 60+100+30+19+24 tests green with byte-parity force-tracked lib modules.
- Repaired the bounded historical graph/index: corrected stale task metadata (TASK-498/499/502/503/504/504-05/511/512/533), reconstructed truthful TASK-528/529/530 parents from board/changelog/workflow evidence, normalized historical statuses and changelog evidence (TASK-513/514/516/525/526/531/532/535 + changelogs 1244-1247), corrected TASK-533 board changelog to 1247, and reconciled the board + statistics to the physical file population.
- Added the whole-inventory `taskGraphIntegrity` gate (canonical FileName/H1/Status, unique ids, parent linkage, closed-parent terminal descendants, fresh statistics recalc, TASK-511 To Do truth, no reopened completed families).

## Validation

- Bun: `smokeEvidence` 41/41, `visible-evidence` 19/19, `smokeEvidenceCheckpoint` 30/30, `smokeEvidenceClosureDelta` 19/19, `smokeEvidenceTask548Bootstrap` 24/24, `workflowStaticContract` 10/10, `taskGraphIntegrity` 6/6.
- `node --check` on every `_docs/_workflows/*.mjs` and `lib/*.mjs`; `bun run lint:repo:types`; `git diff --check`; all touched files at or below 1,000 physical lines.

## Notes

- All 4 children + 13 executable leaves terminal. Board statistics recalculated from the physical file population (389 To Do / 7 In Progress / 3357 Done).
