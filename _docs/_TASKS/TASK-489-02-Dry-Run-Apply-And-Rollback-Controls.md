# TASK-489-02: Dry-Run / Apply & Rollback Controls (privileged)
# FileName: TASK-489-02-Dry-Run-Apply-And-Rollback-Controls.md

**Parent Task:** TASK-489
**Priority:** Medium
**Category:** Solution Kits / Admin UI / Privileged Action
**Estimated Effort:** Medium
**Dependencies:** TASK-489-01 (history + detail surface, shared `runsState`). Consumes `useSolutionKitRuns` `apply` / `rollback` / `isMutating` / `mutationError` / `lastResult` / `latestApplyRunId` and the write routes `POST /solution-kits/:id/apply` + `POST /solution-kits/:id/rollback`.
**Status:** ⏳ To Do
**Started:** `<YYYY-MM-DD>`
**Completed:** `<YYYY-MM-DD>`

---

## Overview

Add the **write** controls to the Solution Kits page, gated on
`solution-kits:write`. Two surfaces:

1. **Dry-run / Apply** (L01) — preview-then-execute an install for the active kit,
   surfacing the resulting run (the hook auto-selects the new `run.id`, so the L01
   history list + L02 detail update automatically).
2. **Rollback** (L02) — the safety-critical action. It reverts a prior successful
   apply run. It MUST be `solution-kits:write`-gated, behind an explicit confirm
   step, and scoped to a chosen source run (defaulting to `latestApplyRunId`).

Both controls call the hook's existing `apply` / `rollback` (which already prime
caches, refresh runs, and follow the new run id). This subtask owns the
**affordances + gating + confirm UX only** — it must not re-implement the
mutation/caching logic in the hook or the client.

> **Reconciliation:** the existing `tests/vitest/ui/solution-kits-page.test.tsx`
> asserts the page does **not** contain the legacy wizard labels "Apply kit",
> "Dry run", "Rerun", "Rollback latest". Choose labels for the new controls that do
> not collide with the legacy wizard semantics (e.g. "Run install (dry run)",
> "Install kit", "Roll back this install"), and update that test in
> TASK-489-03-L02 so its assertions target the removed *legacy wizard*
> specifically, not these new install-history controls.

---

## Security Contract (subtask summary)

Per-leaf contracts are authoritative.

- **Endpoint visibility:** `internal` — `POST /admin/api/solution-kits/:id/apply`,
  `POST /admin/api/solution-kits/:id/rollback`. No new/public surface.
- **Auth model:** session (admin) via the shared `apiClient`.
- **RBAC:** both writes require `solution-kits:write` (route-enforced). The UI
  gates the controls client-side via `useAdminAuth().can("solution-kits:write")`
  (defence-in-depth: hide/disable when absent). The route is the boundary.
- **CSRF:** carried by `applySolutionKit` / `rollbackSolutionKit`
  (`withCsrf: true`). No raw `fetch`.
- **Rate-limit bucket:** `admin` (route-enforced).
- **Validation:** server-owned `solutionKitApplyRequestSchema` /
  `solutionKitRollbackRequestSchema` (strict). The UI sends only
  `{ dryRun?, continueOnError? }` (apply) and `{ sourceRunId?, continueOnError? }`
  (rollback).
- **Rollback safety:** privileged + confirm-gated + source-scoped (see L02).
- **Secret/PII handling:** results carry CMS resource snapshots, not secrets;
  nothing extra is logged/cached beyond the hook-owned caches.

---

## Sub-Tasks

| ID | File | Title | Status |
|----|------|-------|--------|
| TASK-489-02-L01 | `TASK-489-02-L01-Dry-Run-And-Apply-Controls.md` | Dry-run + apply controls (gated, result surfacing) | ⏳ To Do |
| TASK-489-02-L02 | `TASK-489-02-L02-Rollback-Control-With-Confirm.md` | Rollback control (privileged, confirm step, source-scoped) | ⏳ To Do |

---

## Dependencies

- TASK-489-01 (shared `runsState` from the single `useSolutionKitRuns` call).
- `useAdminAuth` (`core/admin/ui/contexts/AdminAuthContext.tsx`) → `can(permission)`.
- Existing confirm-dialog primitive in `@/components/ui/*` (e.g. `AlertDialog`) or
  the project's standard confirm pattern — verify the available primitive before
  building (L02 specifies the exact component to use after confirming it exists).

---

## Testing Requirements

- `bun --cwd core lint`
- `bun --cwd core lint:types`
- Vitest ui-integration (authored in TASK-489-03-L01):
  controls hidden/disabled without `solution-kits:write`; apply calls
  `apply({ dryRun })`; rollback requires confirm before calling
  `rollback(sourceRunId)`; `mutationError` and `isMutating` (busy) states render.
- `tests/vitest/admin/solutionKitsClient.test.ts` and the route suite
  `tests/integration/routes/solutionKitsRoutes.test.ts` stay green (not extended).
</content>
