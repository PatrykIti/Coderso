# TASK-9999-02-L01: Sync Closed-Family Subtask Tables

**Status:** ✅ Done
**Started:**
**Completed:** 2026-08-18
**Changelog:** 1303 (pinned)

# FileName: TASK-9999-02-L01-Sync-Closed-Family-Subtask-Tables.md

**Parent Subtask:** TASK-9999-02
**Source Findings:** docs-only table drift verified at HEAD `6ca20b38` in the
current parent task files (the original `_TMP-audit-*.md` sweep reports were
removed by the owner on 2026-08-18):
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
`TASK-547_Full_Site_Example_Package_And_Projekty_Domow_Installer.md:235-244`.

## Purpose

Reconcile the parent-family subtask display tables in the closed task files
above: each parent is `✅ Done`, all physical children are terminal, and the
board README rows are already correct in their Notes text — but the parent file
tables still show `⏳ To Do` cells. This is display/bookkeeping drift only.

## Scope

- For each listed parent file, update the subtask table cells to match the real
  physical child statuses (all terminal).
- Do NOT touch any `**Status:**` field of any task file and do NOT change
  `_docs/_TASKS/README.md` statistics — `taskGraphIntegrity` reads those and
  they are already correct.
- Where a parent also has duplicate/empty Started/Completed placeholders (e.g.
  TASK-487/490), normalize those fields in the same pass.
- README board rows: additionally move the Done families still sitting in the
  `## To Do` section (`_docs/_TASKS/README.md:178-186`: TASK-511/517/487/488/
  490/491/492) into the `## Done` section, and move the orphaned TASK-559 row
  (`:164`, above the To Do table header) into `## Done`. This is row placement
  only; statistics and `**Status:**` fields stay untouched.

## Validation

- `bun test tests/unit/workflows/taskGraphIntegrity.test.ts` stays green (it
  does not read these table cells).
- `git diff --stat` shows only the touched parent files, no `Status:` changes.

## Deferral Rationale

Docs-only bookkeeping; zero user-visible effect and zero data/security/auth/
RBAC/API/persistence/migration/performance/reliability/test-integrity impact.
