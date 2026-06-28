# TASK-489-03-L02: Docs Sync, Legacy-Test Reconciliation & Closure
# FileName: TASK-489-03-L02-Docs-And-Closure.md

**Parent Subtask:** TASK-489-03
**Priority:** Medium
**Category:** Solution Kits / Docs / Closure
**Estimated Effort:** Small
**Dependencies:** TASK-489-01 + TASK-489-02 (shipped surfaces) · TASK-489-03-L01 (new suite green).
**Status:** ⏳ To Do
**Started:** `<YYYY-MM-DD>`
**Completed:** `<YYYY-MM-DD>`

---

## Overview

- **Goal:** Sync the two source-of-truth docs to the shipped UI, **reconcile the
  existing read-only page test** that asserts the legacy wizard's absence, and run
  + record the closure gate matrix.
- **Owning module(s) to create-or-extend:**
  - `_docs/CMS_API.md` — extend the "Coderso Solution Kits" **Admin UI note**.
  - `_docs/ASSISTANT_SITE_BUILDER.md` — cross-reference the operational
    history/rollback surface vs the reviewed LLM-Guide intake.
  - `tests/vitest/ui/solution-kits-page.test.tsx` — reconcile the legacy-wizard
    absence assertions (see below).
  - `_docs/_CHANGELOG/` — task-linked closure entry (do **not** hand-edit
    `_docs/_TASKS/README.md`; the orchestrator syncs the board).
- **Source-of-truth docs:** `_docs/CMS_API.md`, `_docs/ASSISTANT_SITE_BUILDER.md`,
  `_docs/TESTING_STRATEGY.md`.
- **Out of scope:** any new route/schema doc (routes/shapes are unchanged), the new
  ui-integration suite itself (03-L01).

---

## Legacy-test reconciliation (load-bearing)

`tests/vitest/ui/solution-kits-page.test.tsx` currently asserts the page does
**not** contain `"Apply kit"`, `"Dry run"`, `"Rerun"`, `"Rollback latest"` — these
were the **legacy AI Site Wizard** controls removed by the reviewed-intake reskin.
TASK-489 deliberately uses different labels ("Run install (dry run)", "Install
kit", "Roll back this install") so it does **not** resurrect the legacy wizard.

Reconcile precisely:

- Keep assertions that protect the legacy wizard removal but make them
  unambiguous: assert absence of the **legacy** strings the reskin removed (e.g.
  `"AI Site Wizard"`, `"Business profile"`, `"Plan review"`, `"Rerun"`,
  `"Rollback latest"`) — these remain absent.
- Remove/adjust any assertion that would now collide with the new install-history
  controls (notably bare `"Dry run"` / `"Apply kit"` if a substring clash arises),
  replacing them with the precise legacy phrases above so the test still guards the
  wizard removal without forbidding the new surface.
- Do **not** weaken the test into a no-op: it must still prove the legacy wizard
  is gone and the Reviewed Site Builder CTA is present.

> If the chosen new labels do not substring-collide with the legacy assertions,
> the only required change may be adding the new-surface coverage note; verify by
> running the suite. The new behavior is covered by 03-L01, not this file.

---

## Documentation Updates

### `_docs/CMS_API.md` (extend the existing Admin UI note under "Coderso Solution Kits")

Add bullets stating that the Solution Kits admin page now surfaces:
- install-run **history** (`GET /solution-kits/runs`) and run-item **detail**
  (`GET /solution-kits/runs/:runId`) — read, `solution-kits:read`;
- **dry-run / apply** (`POST /solution-kits/:id/apply`) and **rollback**
  (`POST /solution-kits/:id/rollback`) controls — write, `solution-kits:write`,
  CSRF-protected, with a UI confirm step on rollback.
- Note: **no route/shape changes** — this is UI wiring over the existing v3 preview
  endpoints.

### `_docs/ASSISTANT_SITE_BUILDER.md`

Add a short cross-reference: full-site generation runs through the reviewed
LLM-Guide intake, while **operational install history + rollback** for an
already-installed kit live on the Solution Kits page (TASK-489). The two are
distinct surfaces and should not be conflated.

### Changelog

Add a `_docs/_CHANGELOG/` entry cross-linking `TASK-489` and the leaf ids,
summarizing: dead `useSolutionKitRuns` hook mounted; history + drill-down +
gated dry-run/apply + confirm-gated rollback shipped; no backend change.

---

## Closure Gate Matrix (record results in the closeout)

- [ ] `bun --cwd core lint`
- [ ] `bun --cwd core lint:types`
- [ ] `NODE_ENV=test vitest run --config vitest.config.ts tests/vitest/ui-integration/solution-kits-runs.test.tsx`
- [ ] `NODE_ENV=test vitest run --config vitest.config.ts tests/vitest/ui/solution-kits-page.test.tsx` (reconciled, green)
- [ ] `NODE_ENV=test vitest run --config vitest.config.ts tests/vitest/admin/solutionKitsClient.test.ts` (unchanged, green)
- [ ] `tests/integration/routes/solutionKitsRoutes.test.ts` not regressed
- [ ] CMS_API + ASSISTANT_SITE_BUILDER updated; changelog added
- [ ] All TASK-489-01..03 children terminal; board synced by orchestrator

---

## Testing Requirements

- Run the full gate matrix above; record each result (pass/skip/blocked) in the
  closeout. State clearly if any command could not run.
- No DB migration artifacts (docs + test reconciliation only).
</content>
