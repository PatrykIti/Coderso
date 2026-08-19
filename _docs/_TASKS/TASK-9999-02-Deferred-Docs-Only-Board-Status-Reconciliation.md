# TASK-9999-02: Deferred Docs-Only Board/Status Reconciliation (TASK-560 Audit Sweep)

**Status:** ✅ Done
**Started:** 2026-08-17
**Completed:** 2026-08-18
**Priority:** Low
**Size:** Medium

# FileName: TASK-9999-02-Deferred-Docs-Only-Board-Status-Reconciliation.md

**Parent Task:** TASK-9999
**Source Findings:** docs-only LOW findings from the 2026-08-17 TASK-560 audit
sweep. The original sweep reports (`_TMP-audit-*.md`) were removed by the owner
on 2026-08-18; the evidence below is re-anchored to the current task files and
verified at HEAD `6ca20b38`:
- parent subtask tables show `⏳ To Do` while physical children are terminal:
  `TASK-486_Popups_Public_Runtime_Delivery.md:76-79`,
  `TASK-487_Entries_Revision_History_And_Restore.md:85-87`,
  `TASK-488_Commerce_Variant_Editor_And_Collections_CRUD_UI.md:83-85`,
  `TASK-490_Forms_Submissions_Export.md:87-88`,
  `TASK-491_Integrations_Runtime_Wiring.md:93-96`,
  `TASK-492_Login_Alert_Delivery_And_Recipient_Settings.md:76-78`,
  `TASK-511_Backup_V2_Scalable_Compressed_Encrypted_Importable.md:183-189`,
  `TASK-518_Seed_Default_Admin_Role_Migration.md:77-78`,
  `TASK-540_Custom_Screens_Functional_and_Data_Integrity_Remediation.md`
  (parent/children 03/04/06), `TASK-545_Workflow_Smoke_Evidence_and_Task_Graph_Integrity.md:174-177`,
  `TASK-547_Full_Site_Example_Package_And_Projekty_Domow_Installer.md:235-244`;
- README board rows: `_docs/_TASKS/README.md` still lists Done families
  TASK-511/517/487/488/490/491/492 in the `## To Do` section (`:178-186`) and
  leaves TASK-559 as an orphaned row above the To Do table header (`:164`);
- TASK-540 retains actively-worded "Current/pending" workflow fields despite its
  `✅ Done` status and changelog 1252;
- TASK-559 presents a stale acceptance benchmark (9.98 min for 397 files) as
  current evidence after the manifest grew (current `tests/bun-lane-manifest.json`
  is 440 files: A=172, B=212, C=51, perf=5);
- TASK-547 still describes Changelog 1260 as Draft/unindexed while it is Final
  and indexed (`_docs/_CHANGELOG/README.md:39,106`).

## Purpose

The 2026-08-17 TASK-560 audit sweep (six fresh-context review agents) confirmed
multiple **docs-only** bookkeeping inconsistencies in closed task families:
parent subtask tables still show `⏳ To Do` while all physical children are
`✅ Done`; TASK-540 retains actively-worded "Current/pending" workflow fields
despite its `✅ Done` status and changelog 1252; TASK-559 presents a stale
acceptance benchmark (9.98 min for 397 files) as current evidence after the
manifest grew to 440 files (A=172, B=212, C=51, perf=5); TASK-547 still
describes Changelog 1260 as Draft/unindexed while it is Final and indexed.

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
  fresh controlled run on the current 440-file manifest before any re-claim.
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
