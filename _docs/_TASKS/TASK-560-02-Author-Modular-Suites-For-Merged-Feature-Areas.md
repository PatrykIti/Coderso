# TASK-560-02: Author Modular Suites for Merged Feature Areas

**Status:** ⏳ To Do
**Started:**
**Completed:**
**Priority:** High
**Size:** Very Large

# FileName: TASK-560-02-Author-Modular-Suites-For-Merged-Feature-Areas.md

**Parent Task:** TASK-560

## Purpose

Author missing modular runtime-smoke suites through the shared entry
(`bun scripts/runtime-smoke.ts run --suite <suite> --profile fast --session <name>`)
for the merged feature areas whose worktree smokes were never committed:
490 forms submissions export, 492 login alert delivery settings, 487 entry
revision history/restore drawer, 488 commerce variant editor + collections CRUD,
491 integrations (GA4 head tag, Slack/Zapier post-commit events, Sentry init,
health), 511 backup v2 (.cbk create/download, confirm-gated restore), 517 entry
visibility (private uniform 404, password prompt, unlock cookie flow, gated
cache exemption, authed bypass).

## Rules

- Add thin statically registered suite adapters only; compose the shared
  lifecycle, polling, process supervision, profile-scoped workers, database
  batches, browser segments, checkpoint primitives, redaction, timing, and
  reporting. NEVER copy those loops into a task-local executor.
- Follow `docs/develop/runtime-smoke-cookbook.md` registration/adapter recipes
  exactly; register through the shared entry point.
- At least 5 DISTINCT real-flow scenarios per area; assert VISIBLE EFFECT
  (computed styles, geometry, DOM state, aria/data attributes), never mere
  control presence; light+dark for admin surfaces; 0 console errors.
- Scenarios must mirror the original smoke scenario lists recorded in the
  closed task files/changelogs for 490/492/487/488/491/511/517 (source contract
  from TASK-560-01 gap report).
- Fixtures: uniquely scoped DB rows, cleanup only created rows, no truncates.
- Every suite file ≤ 1,000 physical lines; split adapters by responsibility
  into `scripts/runtime-smoke/adapters/task-###/` modules.
- No production code changes unless a missing seam is proven; prefer existing
  admin endpoints.

## Implementation pseudocode

1. `scripts/runtime-smoke/adapters/task-517.ts` (and siblings): export a suite
   descriptor `{ id: "task-517", profiles: { fast: {...} }, scenarios: [...] }`
   following the `task-554.ts` adapter shape; each scenario registers browser
   segments via the shared segment helpers and uses the shared checkpoint
   primitives (`assertVisibleEffect`, `expectNoConsoleErrors`).
2. Register each new suite in the static suite registry used by
   `scripts/runtime-smoke.ts` (single array; alphabetical).
3. Add cookbook examples if a new pattern is introduced (only additive).
4. Run each new suite locally (fast) against the running dev servers; fix
   harness defects until green; record evidence under
   `_docs/_workflows/_smoke/evidence/<task>/<session>/`.

## Acceptance

- `bun scripts/runtime-smoke.ts run --suite task-5XX --profile fast --session <name>`
  exits 0 for every new suite with ≥5 scenarios each, 0 console errors, and
  report.json + screenshots written under `_docs/_workflows/_smoke/evidence/`.
- No task-local lifecycle/worker/cleanup/Playwright/report loop introduced.
