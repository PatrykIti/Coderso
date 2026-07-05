# TASK-482-06: Starter content via Solution Kits
# FileName: TASK-482-06-Starter-Content-Via-Kits.md

**Parent Task:** TASK-482
**Priority:** High
**Category:** Admin / Onboarding / Auth
**Estimated Effort:** Large
**Dependencies:** TASK-482-05
**Status:** ✅ Done
**Started:** 2026-07-04
**Completed:** 2026-07-05

---

## Overview

Let the Basic track seed a working starter site by installing a Solution Kit.
A server-side wrapper over `applyKitInstall` / `rollbackKitInstall`
(`core/services/kits/kitInstaller.ts`) chooses **either** a catalog kit id
**or** a trusted, server-defined blueprint override (never a client-supplied
blueprint), supports dry-run preview (which still records a `dry_run`
run/audit trail — only content/template writes are skipped), applies with the
wizard operator's `actorId`, wires the resulting home/nav/footer into `site.*`
settings, and can roll back — restoring the prior `site.*` values, since
`rollbackKitInstall` itself reverses seeds only and never touches settings.
Because this is plugin/kit install/rollback lifecycle, all tests are Bun-lane.

## Sub-Tasks

| ID | Title | Effort | Status |
| --- | --- | --- | --- |
| TASK-482-06-L01 | `starterContentService` over the kit installer (dry-run/apply/rollback + shell wiring) | Large | ✅ Done |
| TASK-482-06-L02 | Internal starter-content route (dry-run + apply) | Medium | ✅ Done |

## Dependencies

- TASK-482-05 (Basic settings exist so the shell wiring has something to point
  at). Relies on the existing kit system (`kitInstaller.ts`,
  `solutionKitsInstallService.ts`, `solutionKitsCatalog.ts`).

## Coordination Pins (TASK-482 stream)

- **Changelog:** number **1220** is pinned for the TASK-482 closure
  (`_docs/_CHANGELOG/1220-*.md`, created by TASK-482-09 only). Numbers **1219**
  (TASK-510, in flight in the shared main tree — may be absent from this
  worktree's checkout; do NOT reallocate it), **1221** (TASK-483) and **1222**
  (TASK-484) are RESERVED by parallel streams.
- **Parallel streams / forbidden paths:** TASK-483 (analytics) and TASK-484
  (backups) run concurrently on sibling branches. FORBIDDEN PATHS for TASK-482:
  `core/services/analytics/**`, `core/services/backups/**`, any analytics/backups
  route modules, `core/db/schema.ts`, `core/db/migrations/**`.
- **No DB migration in this tree:** settings/branding/locale keys go through the
  settings service defaults (rows, not DDL); first-admin creation uses the
  existing `users` table. No 482 file plans DDL/migration artifacts.
- **Board/changelog discipline:** ONLY the closure subtask (TASK-482-09) edits
  `_docs/_TASKS/README.md` and `_docs/_CHANGELOG/*`; this subtask never touches
  them.
- **Shared REMOTE test database:** all three streams and the owner share ONE
  Postgres (render.com, `DATABASE_URL` in `.env`). Tests must never
  delete/truncate `users`, flip the real DB into a global no-users install state,
  or reset shared settings rows; use service-level seams, uniquely scoped
  fixtures, or self-restoring setup/teardown.
- **Land order:** 01 → 02 → 03 (phase 1), then 04 → 05 → 06 → 07 → 08 (phase 2),
  then 09 (closure). Strictly sequential, single writer per source file.

## Testing Requirements

- L01: Bun lifecycle lane (`tests/integration/routes/` or a kit-focused
  integration test) — dry-run produces a plan with no **content/template**
  writes (the installer still persists a `dry_run` run + items + audit record,
  which the test teardown must delete); apply seeds content + sets
  `site.homepageId`/`navigationMenuId`/`footerTemplateId`; rollback reverses
  the seeds and restores the pre-apply `site.*` values. Tests run against the
  shared remote Postgres — snapshot/restore the `site.*` keys and clean up all
  seeded rows in self-restoring setup/teardown (details in 06-L01).
- L02: Bun route-integration + Bun security (RBAC, blueprint cannot come from the
  client).
