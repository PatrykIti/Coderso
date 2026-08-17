# TASK-9999-02: Deferred Docs-Only Board/Status Reconciliation (TASK-560 Audit Sweep)

**Status:** ⏳ To Do
**Started:** 2026-08-17
**Completed:**
**Priority:** Low
**Size:** Medium

# FileName: TASK-9999-02-Deferred-Docs-Only-Board-Status-Reconciliation.md

**Parent Task:** TASK-9999
**Source Findings:** docs-only LOW findings from the TASK-560 audit sweep
(`_TMP-audit-task-486/487/488/490/491/492/511/518/540/545/547/554/558-*.md`,
`_TMP-audit-overview-7d.md`, verified at HEAD `4e3dab15`)

## Purpose

The 2026-08-17 TASK-560 audit sweep (six fresh-context review agents) confirmed
multiple **docs-only** bookkeeping inconsistencies in closed task families:
parent subtask tables still show `⏳ To Do` while all physical children are
`✅ Done`; TASK-540 retains actively-worded "Current/pending" workflow fields
despite its `✅ Done` status and changelog 1252; TASK-559 presents a stale
acceptance benchmark (9.98 min for 397 files) as current evidence after the
manifest grew to 418 files; TASK-547 still describes Changelog 1260 as
Draft/unindexed while it is Final and indexed.

These findings qualify for TASK-9999 deferral: they are documentation/board
metadata only, with zero current user-visible UI/UX/a11y effect and zero data,
security, privacy, auth, RBAC, API, persistence, migration, performance,
reliability, or test-integrity impact. They do NOT touch `Status:` fields that
`taskGraphIntegrity` counts (that mismatch is owned by active TASK-576); they
only reconcile display tables, checklist marks, historical workflow wording, and
stale benchmark labels inside task files.

## Eligibility

Per the TASK-9999 parent contract and AGENTS.md:
- evidence-backed and LOW: yes (confirmed docs-only anchors, file:line listed in
  each leaf);
- zero current user-visible UI/UX/a11y effect: yes;
- zero data/security/privacy/auth/RBAC/API/persistence/migration/performance/
  reliability/test-integrity impact: yes (no code, no tests, no status fields
  consumed by gates);
- searched backlog first: TASK-9999-01 (TASK-540 naming LOW) does not cover
  these; no duplicate leaves exist;
- each leaf is narrowly scoped, execution-ready, and testable: yes.

## Children

- `TASK-9999-02-L01-Sync-Closed-Family-Subtask-Tables.md` — reconcile parent
  subtask display tables for TASK-486/487/488/490/491/492/511/518/540/545/547
  where all children are terminal but tables still show `⏳ To Do`.
- `TASK-9999-02-L02-Mark-TASK-540-Closed-Workflow-Fields-Historical.md` — mark
  TASK-540's "Current/pending" workflow fields as historical, point to changelog
  1252, redirect smoke ownership to TASK-552/TASK-560.
- `TASK-9999-02-L03-Relabel-Stale-TASK-559-Acceptance-Benchmark.md` — relabel
  the TASK-559 9.98-min/397-file acceptance as historical evidence; require a
  fresh controlled run on the current 418-file manifest before any re-claim.
- `TASK-9999-02-L04-Reconcile-TASK-547-Closure-Notes.md` — flip TASK-547 parent
  checklist `[ ]` to `[x]` and correct the "Changelog 1260 Draft/unindexed"
  note to Final/indexed.

## Closure

- Each leaf updates only its own task file (plus `_docs/_TASKS/README.md` row
  text when the display row itself is stale; board statistics are NOT changed
  because no `Status:` field changes).
- After each leaf: `bun test tests/unit/workflows/taskGraphIntegrity.test.ts`
  stays green (it does not read these table cells).
- Normal changelog entry per leaf on completion.
