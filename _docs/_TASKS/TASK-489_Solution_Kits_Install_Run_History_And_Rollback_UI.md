# TASK-489: Solution Kits — Install-Run History & Rollback UI
# FileName: TASK-489_Solution_Kits_Install_Run_History_And_Rollback_UI.md

**Priority:** Medium
**Category:** Solution Kits / Admin UI / Feature Wiring
**Estimated Effort:** Medium
**Dependencies:** None new. Consumes the already-shipped backend (catalog, install engine, idempotency + rollback from TASK-054-13-02), routes (`/solution-kits/runs`, `/solution-kits/runs/:runId`, `/solution-kits/:id/apply`, `/solution-kits/:id/rollback`), client (`solutionKitsClient.ts`), the fully-built but **dead** hook `useSolutionKitRuns.ts`, and the `solution_kit_install_runs` / `solution_kit_install_items` tables.
**Status:** ⏳ To Do
**Started:** `<YYYY-MM-DD>`
**Completed:** `<YYYY-MM-DD>`

---

## Business Goal

The Solution Kits backend is **complete and safety-critical**: every `dry_run` /
`apply` / `rollback` is recorded in `solution_kit_install_runs` with a per-resource
operation trace in `solution_kit_install_items` (with `beforeSnapshot` /
`afterSnapshot` / `rollbackAction`), and a fully built admin hook
(`core/admin/ui/kits/hooks/useSolutionKitRuns.ts`) already exposes
history, run-item drill-down, dry-run/apply, and **rollback** through the cached
client. **But that hook is imported nowhere (dead code), and
`SolutionKitsPage.tsx` is read-only** — so there is currently **no UI entry point
to view install history, inspect what a run changed, or roll back a kit
install**. Rollback is the most important gap: it is the operator's "undo" for a
structural site-baseline change, and it is unreachable from the admin UI.

This task is **frontend wiring only**. It mounts the existing hook in the
Solution Kits page to deliver: (1) an install-run **history list**, (2) a
run-item **drill-down**, (3) **dry-run / apply** controls, and (4) a guarded,
RBAC-gated, confirm-protected **rollback** control. No new backend, no new
routes, no DB changes.

## Scope

### In scope

- Mount `useSolutionKitRuns(effectiveSelectedId)` inside
  `core/admin/ui/kits/SolutionKitsPage.tsx` (the one place that already resolves
  the active `SolutionKitId`).
- Install-run history list (mode + status + summary badges, selectable run).
- Run-item detail drill-down (operation/status/resourceType/resourceKey, snapshot
  + rollback-action inspection, per-item error).
- Dry-run + apply action controls (gated on `solution-kits:write`, surfacing
  `lastResult` / `mutationError`).
- Rollback control: **privileged**, `solution-kits:write`-gated, behind an
  explicit confirm step, defaulting to `latestApplyRunId` with optional source-run
  selection.
- Tests (Vitest ui-integration render flows) + docs sync.

### Out of scope

- Any backend change (services/routes/schema/migrations). The contract is frozen;
  this task only reaches it through the existing client + hook.
- The reviewed LLM-Guide site-builder intake (the "Reviewed Site Builder" CTA and
  its dry-run/execute flow inside the floating assistant) — unchanged.
- New permissions. `solution-kits:read` / `solution-kits:write` already exist in
  `core/services/admin/permissionsCatalog.ts`.
- Run-detail polling/live status streaming, run search/pagination beyond the
  existing `limit` param, and cross-kit "all runs" views.

### What the current SolutionKitsPage already provides vs what this task adds

- **Already present in the current `SolutionKitsPage.tsx` (the content 489 builds
  on):** page chrome (`AdminShell`, `PageHeader`), kit cards, the **read-only**
  "Selected kit details" panel, and the "Reviewed Site Builder" LLM-Guide handoff
  CTA. The legacy "AI Site Wizard" (its `Apply kit` / `Dry run` / `Rerun` /
  `Rollback latest` controls) is **already gone** from this page, and the existing
  test `tests/vitest/ui/solution-kits-page.test.tsx` asserts the **absence** of
  those legacy labels. Page copy still says selection "stays read-only until the
  reviewed assistant handoff is confirmed."
  - **Caveat on the TASK-479 reskin:** the formal **TASK-479-21** ("Solution Kits
    Screen Migration", incl. `479-21-L01`) is still ⏳ To Do — *not* shipped. The
    affordances above already exist in the current code independently of that
    task, so TASK-489 depends only on this present-in-code content, **not** on
    TASK-479-21 landing first (and must not claim the reskin is complete).
- **What TASK-489 adds:** the operational **Install history & rollback** surface
  that the reskin intentionally left out — distinct from the removed legacy
  wizard. It is *operational history + safety rollback over already-installed
  kits*, not a re-introduction of the reviewed-intake wizard rerun/clone flow.
  Because of this, TASK-489 must (a) use labels that do **not** resurrect the
  legacy wizard semantics and (b) **reconcile the existing read-only test**
  (TASK-489-03-L02) so its assertions target the *legacy wizard* specifically,
  not the new history/rollback affordances.

---

## Security Contract (umbrella summary)

Per-leaf Security Contracts are authoritative; this is the overview.

- **Endpoint visibility:** `internal` only. The UI consumes existing
  `/admin/api/solution-kits/*` routes (admin `apiClient` prefixes `/admin/api`;
  the route file registers bare `/solution-kits/*`). No new or public surface.
- **Auth model:** session cookie (admin), via the shared `apiClient`.
- **RBAC:**
  - History list + run-item detail (reads) require `solution-kits:read`
    (enforced by `requirePermission("solution-kits:read")` on
    `GET /solution-kits/runs` and `GET /solution-kits/runs/:runId`).
  - Dry-run / apply / rollback (writes) require `solution-kits:write` (enforced on
    `POST /solution-kits/:id/apply` and `POST /solution-kits/:id/rollback`).
  - The route is the real boundary; the UI additionally gates the write controls
    client-side via `useAdminAuth().can("solution-kits:write")`
    (`core/admin/ui/contexts/AdminAuthContext.tsx`) — defence-in-depth (hide /
    disable when absent).
- **CSRF:** carried automatically by `applySolutionKit` / `rollbackSolutionKit`
  (`apiRequest(..., { withCsrf: true })`). The UI must never bypass the client
  with a raw `fetch`.
- **Rate-limit bucket:** `admin` (enforced at the route).
- **Validation:** schemas are owned server-side in
  `core/server/validation/solutionKitSchemas.ts` (`solutionKitApplyRequestSchema`,
  `solutionKitRollbackRequestSchema`, `solutionKitRunsQuerySchema`,
  `solutionKitRunIdSchema`) and re-validated by the route. The UI sends only the
  fields those schemas accept; the client response validators
  (`isInstallResult` / `isInstallRunDetail` / `isInstallRunRecordList`) already
  reject malformed payloads.
- **Rollback is a privileged, destructive-class action.** It MUST be (a) gated on
  `solution-kits:write`, (b) behind an explicit confirm step in the UI, and (c)
  clearly scoped to the source run it reverses.
- **Secret/PII handling:** run/item payloads carry CMS resource snapshots
  (content types / forms / pages / menus), not secrets. The UI must not log raw
  snapshots or write anything beyond the existing `cachePolicy` cache keys
  (`solutionKitRunsList` / `solutionKitRunDetail`). No new cache keys, no console
  dumps of snapshot bodies.

---

## Sub-Tasks

| Subtask | Title | Effort | Status |
|---------|-------|--------|--------|
| TASK-489-01 | Install-Run History & Run-Item Detail (read surface) | Small–Medium | ⏳ To Do |
| TASK-489-02 | Dry-Run / Apply & Rollback Controls (privileged) | Medium | ⏳ To Do |
| TASK-489-03 | Tests & Docs / Closure | Small | ⏳ To Do |

**Subtask intent (one line each):**

- **01 — History & detail:** mount the dead `useSolutionKitRuns` hook in
  `SolutionKitsPage.tsx`; render the install-run history list and the run-item
  drill-down (read-only).
- **02 — Controls:** add dry-run / apply controls and the safety-critical,
  RBAC-gated, confirm-protected rollback control wired to the hook's `apply` /
  `rollback`.
- **03 — Tests & docs:** Vitest ui-integration render flows (history, drill-down,
  gating, confirm), reconcile the existing read-only page test, and sync
  `_docs/CMS_API.md` / `_docs/ASSISTANT_SITE_BUILDER.md`.

---

## Testing Requirements

Lanes per `_docs/TESTING_STRATEGY.md`. This task is admin-UI render wiring, so the
new tests are **Vitest** (`tests/vitest/ui-integration/*`); no new Bun-lane work
is introduced (no new routes/runtime/plugin/perf surface).

- `bun --cwd core lint`
- `bun --cwd core lint:types`
- **Vitest (admin UI / render flows):**
  - `NODE_ENV=test vitest run --config vitest.config.ts tests/vitest/ui-integration/solution-kits-runs.test.tsx`
    (history render, run selection, drill-down, write-control gating, rollback
    confirm flow — client mocked at the `solutionKitsClient` boundary).
  - `tests/vitest/ui/solution-kits-page.test.tsx` must stay green after its
    legacy-wizard assertions are reconciled in TASK-489-03-L02.
  - `tests/vitest/admin/solutionKitsClient.test.ts` must stay green (the UI reuses
    the client, never forks it).
- **Do not regress** the existing backend suites (not extended here):
  `tests/integration/routes/solutionKitsRoutes.test.ts`,
  `tests/unit/kits/*`, `tests/vitest/server/solutionKitSchemas.test.ts`.
- State clearly in the closeout if any command was skipped or could not run.

---

## Documentation Updates Required

- `_docs/CMS_API.md` — under "Coderso Solution Kits", extend the existing **Admin
  UI note** to record that the Solution Kits page now surfaces install-run
  history, run-item drill-down, and the gated dry-run/apply/rollback controls
  (read = `solution-kits:read`, writes = `solution-kits:write`). No route shapes
  change.
- `_docs/ASSISTANT_SITE_BUILDER.md` — cross-reference that operational install
  history + rollback live on the Solution Kits page (distinct from the reviewed
  LLM-Guide intake), so the two surfaces are not conflated.
- `_docs/_TASKS/README.md` — board bucket + statistics on every status change
  (orchestrator-synced; do not hand-edit here).
- `_docs/_CHANGELOG/` — task-linked entry on closure (cross-link `TASK-489` + the
  leaf id).

---

## Notes

- **No DB changes / no migration artifacts.** `solution_kit_install_runs` and
  `solution_kit_install_items` already exist (`core/db/schema.ts` ~1336/1365).
- **No new backend.** Routes, services, schemas, client, and the hook are all
  already shipped and verified. The single defect this task closes is that the
  hook is **dead** (imported nowhere) and the page is read-only.
- The hook already handles cache priming, force-refresh-on-mount, optimistic
  `selectedRunId` follow-through after a mutation, and `latestApplyRunId`
  derivation — leaves should **consume** these, not reimplement them.
- Reconciliation risk: the existing page test asserts the absence of "Apply kit",
  "Dry run", "Rerun", "Rollback latest". Pick control labels that do not collide
  with the legacy wizard semantics and update that test in 03-L02 (see Scope).
</content>
</invoke>
