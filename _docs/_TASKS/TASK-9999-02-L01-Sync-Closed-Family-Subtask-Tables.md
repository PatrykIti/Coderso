# TASK-9999-02-L01: Sync Closed-Family Subtask Tables

**Status:** ⏳ To Do
**Started:**
**Completed:**

# FileName: TASK-9999-02-L01-Sync-Closed-Family-Subtask-Tables.md

**Parent Subtask:** TASK-9999-02
**Source Findings:** docs-only table drift in `_TMP-audit-task-486-popups.md:76-79`,
`_TMP-audit-task-487-entry-revisions.md:85-87`, `_TMP-audit-task-488-commerce.md:83-85`,
`_TMP-audit-task-490-forms-export.md:87-88`, `_TMP-audit-task-491-integrations.md:93-96`,
`_TMP-audit-task-492-login-alerts.md:76-78`, `_TMP-audit-task-511-backups.md:183-189`,
`_TMP-audit-task-518-stable-admin-role.md:77-78`, `_TMP-audit-task-540-custom-screens.md`
(parent/children 03/04/06), `_TMP-audit-task-545-workflow-integrity.md:174-177`,
`_TMP-audit-task-547-full-site-installer.md:235-244` (all verified at HEAD `4e3dab15`)

## Purpose

Reconcile the parent-family subtask display tables in the closed task files
above: each parent is `✅ Done`, all physical children are terminal, and the
board README rows are already correct — but the parent file tables still show
`⏳ To Do` cells. This is display/bookkeeping drift only.

## Scope

- For each listed parent file, update the subtask table cells to match the real
  physical child statuses (all terminal).
- Do NOT touch any `**Status:**` field of any task file and do NOT change
  `_docs/_TASKS/README.md` statistics — `taskGraphIntegrity` reads those and
  they are already correct.
- Where a parent also has duplicate/empty Started/Completed placeholders (e.g.
  TASK-487/490), normalize those fields in the same pass.

## Validation

- `bun test tests/unit/workflows/taskGraphIntegrity.test.ts` stays green (it
  does not read these table cells).
- `git diff --stat` shows only the touched parent files, no `Status:` changes.

## Deferral Rationale

Docs-only bookkeeping; zero user-visible effect and zero data/security/auth/
RBAC/API/persistence/migration/performance/reliability/test-integrity impact.
