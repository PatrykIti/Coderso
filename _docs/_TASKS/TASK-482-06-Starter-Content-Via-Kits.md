# TASK-482-06: Starter content via Solution Kits
# FileName: TASK-482-06-Starter-Content-Via-Kits.md

**Parent Task:** TASK-482
**Priority:** High
**Category:** Admin / Onboarding / Auth
**Estimated Effort:** Large
**Dependencies:** TASK-482-05
**Status:** ⏳ To Do
**Started:** `<YYYY-MM-DD>`
**Completed:** `<YYYY-MM-DD>`

---

## Overview

Let the Basic track seed a working starter site by installing a Solution Kit.
A server-side wrapper over `applyKitInstall` / `rollbackKitInstall`
(`core/services/kits/kitInstaller.ts`) chooses **either** a catalog kit id
**or** a trusted, server-defined blueprint override (never a client-supplied
blueprint), supports dry-run preview, applies with the wizard operator's
`actorId`, wires the resulting home/nav/footer into `site.*` settings, and can
roll back. Because this is plugin/kit install/rollback lifecycle, all tests are
Bun-lane.

## Sub-Tasks

| ID | Title | Effort | Status |
| --- | --- | --- | --- |
| TASK-482-06-L01 | `starterContentService` over the kit installer (dry-run/apply/rollback + shell wiring) | Large | ⏳ To Do |
| TASK-482-06-L02 | Internal starter-content route (dry-run + apply) | Medium | ⏳ To Do |

## Dependencies

- TASK-482-05 (Basic settings exist so the shell wiring has something to point
  at). Relies on the existing kit system (`kitInstaller.ts`,
  `solutionKitsInstallService.ts`, `solutionKitsCatalog.ts`).

## Testing Requirements

- L01: Bun lifecycle lane (`tests/integration/routes/` or a kit-focused
  integration test) — dry-run produces a plan with no writes; apply seeds
  content + sets `site.homepageId`/`navigationMenuId`/`footerTemplateId`;
  rollback reverses it.
- L02: Bun route-integration + Bun security (RBAC, blueprint cannot come from the
  client).
