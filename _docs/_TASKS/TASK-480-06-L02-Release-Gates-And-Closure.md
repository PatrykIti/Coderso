# TASK-480-06-L02: Release Gates & Closure
# FileName: TASK-480-06-L02-Release-Gates-And-Closure.md

**Parent Subtask:** TASK-480-06
**Priority:** Medium
**Category:** Admin UI / Dashboard Widgets / Release Gates / Task Board
**Estimated Effort:** Medium
**Dependencies:** TASK-480-06-L01 (docs landed) + all of TASK-480-01..05 implemented and test-green
**Status:** ⏳ To Do

---

## Overview

Run (and where the feature gates dashboard behavior, extend) the Coderso release
gates for TASK-480, then perform the formal closure: add the changelog entry,
synchronize the task board buckets + statistics, and walk the closure checklist
for the umbrella task and every child. This leaf turns "code + docs are done" into
"TASK-480 is closed with recorded validation evidence."

- **Goal:** All TASK-480 gates pass (lint, types, Bun routes/security, Vitest
  domain/UI, and `bun run gates:coderso` as the baseline sweep); the changelog
  records the closure with task IDs; the board reflects every TASK-480 node as
  `✅ Done` with synced statistics; and the closeout records the exact commands and
  their results.
- **Owning module/service:** `_docs/_CHANGELOG/*`, `_docs/_TASKS/README.md`,
  `_docs/CODERSO_RELEASE_GATES.md` (read-only unless a gate is extended),
  `scripts/coderso-release-gates.ts` (read-only unless a gate is extended).
- **Source-of-truth docs:**
  - Gate contract: `_docs/CODERSO_RELEASE_GATES.md` (Gate Matrix:
    functional / ux / performance / security / reliability).
  - Testing lanes: `_docs/TESTING_STRATEGY.md` (Bun = routes/integration/security/
    perf; Vitest = pure domain/services + admin UI).
  - Changelog rules: `_docs/_CHANGELOG/README.md` (next number, index row, task
    IDs) + `_docs/_CHANGELOG/EXAMPLE_CHANGELOG.md`.
  - Board rules: `_docs/_TASKS/README.md` (To Do / In Progress / Done buckets +
    Statistics) and `_docs/_TASKS/EXAMPLE_TASK.md` status rules.
  - Closure precedent: `TASK-479-05-L07` (docs+tests closeout), `TASK-453`
    (program-level closure).
- **Out of scope:** No product code, schema, route, cache, DB, or UI changes. No
  doc-content authoring (that is L01). If a gate fails because of a real defect,
  the fix belongs to the owning leaf (480-01..05) — this leaf re-runs after the fix;
  it does not patch product code to make a gate pass.

---

## Security Contract

No endpoint or permission model changes. Process/validation only. The relevant
security work is **verifying** that the security gate still passes with the new
internal admin dashboard routes present:

- `tests/security/codersoSecurityGate.test.ts` baseline still green (internal mode
  requires session/API-key scope; CSRF + admin rate-limit on the new layout write).
- The 480-03 route/security suites (auth/RBAC/CSRF/reject-unknown for
  `GET/PUT /dashboard/layout`) pass.
- Confirm no secret-handling regression: the security/site-health widget payload
  carries status booleans only (no raw settings), matching the documented contract.

If `bun run gates:coderso:security` or the 480-03 security suite fails, closure is
blocked until the owning leaf fixes it.

---

## Implementation Pseudocode

> "Pseudocode" here = the exact validation command sequence, the gate-extension
> decision, the changelog entry shape, and the board/closure edit list.

### 1) Validation command sequence (run from repo root)

```bash
# Load DB env once for DB-backed suites.
set -a && source .env && set +a

# Static gates.
bun --cwd core lint
bun --cwd core lint:types

# TASK-480 Bun lanes (routes + security) — names own to 480-03; e.g.:
bun test tests/integration/routes/dashboardWidgets.test.ts
bun test tests/security/dashboardWidgets.test.ts

# TASK-480 Vitest lanes (pure domain/service + admin UI) — own to 480-02/04/05; e.g.:
NODE_ENV=test vitest run --config vitest.config.ts tests/vitest/services/dashboardWidgets.test.ts
NODE_ENV=test vitest run --config vitest.config.ts tests/vitest/ui/dashboardWidgets.test.tsx

# Baseline program gate sweep (functional / ux / performance / security / reliability).
bun run gates:coderso
```

- Substitute the REAL suite paths registered by 480-01/03/04/05 (do not invent —
  read them from the merged sibling leaves). Keep Bun vs Vitest on the correct lane
  per `_docs/TESTING_STRATEGY.md`: routes/integration/security/perf = Bun;
  pure domain/services + admin UI = Vitest.
- Record pass/fail counts and any `skipReason` (e.g. `database_url_missing`) in the
  closeout.

### 2) Gate-extension decision (only if dashboard load/persistence is gated)

- **Performance:** if TASK-480 introduces a dashboard load p95 budget (the widget
  grid resolves multiple data sources per render), extend
  `tests/perf/codersoPerformanceGate.test.ts` with a bounded budget
  (env-overridable, e.g. `CODERSO_PERF_DASHBOARD_P95_MS`) and document it under
  "Performance Budgets" in `_docs/CODERSO_RELEASE_GATES.md`. Otherwise leave
  performance untouched and say so.
- **Functional/UX:** if the edit-mode builder is a "composite-first" path worth
  gating, add the 480-05 UI suite to the functional/ux gate selection in
  `scripts/coderso-release-gates.ts`; otherwise the suite still runs in the Vitest
  lane and no gate wiring is needed.
- Default position: prefer NOT adding a gate unless the feature genuinely owns a
  budget/flow worth protecting — record the decision either way.

### 3) Changelog entry

- Allocate the next sequential number per `_docs/_CHANGELOG/README.md` (1200+ at
  time of writing; read the Index for the true next number — other tasks may have
  consumed it).
- Create `_docs/_CHANGELOG/{N}-{YYYY-MM-DD}-task-480-dashboard-widgets.md` with:
  Title line (No. + short title), `Date`, `Version`, `Tasks: TASK-480, TASK-480-01,
  …, TASK-480-06` (enumerate all children), and Key Changes grouped by area
  (Schema/Service, DB, API, Cache, Admin UI, Docs, Gates).
- Add the Index row to `_docs/_CHANGELOG/README.md` (No., Date, Title, Type =
  `Dashboard/Admin UI/API/DB/Cache/Docs/QA/Task Board`) and bump the "next number"
  note.

### 4) Board + statistics sync (`_docs/_TASKS/README.md`)

- Move TASK-480 and every child (01..06 and their leaves) to the **Done** bucket
  with a concise truthful one-line outcome (cite the changelog number).
- Set `**Status:** ✅ Done` + `**Completed:** <YYYY-MM-DD>` in each TASK-480 file
  (umbrella, subtasks, leaves). A parent flips to Done only when all descendants are
  Done/Superseded/Cancelled.
- Update the **Statistics** block (decrement To Do / In Progress, increment Done by
  the number of TASK-480 nodes closed).

### 5) Closure checklist (gate before flipping to Done)

- [ ] All validation commands run; results + counts recorded in the closeout.
- [ ] `bun run gates:coderso` green (or skips justified with `skipReason`).
- [ ] Security gate + 480-03 security suite green; no secret-handling regression.
- [ ] L01 docs landed and contract-verified against code.
- [ ] Changelog entry created + indexed + task IDs cross-linked.
- [ ] Board buckets + Statistics synced; every TASK-480 node `✅ Done` with
      `**Completed:**` set.
- [ ] No open child left under TASK-480 (any leftover work converted to an explicit
      follow-on task).
- [ ] Gate-extension decision recorded (extended vs. intentionally not).

**Data flow:** run gates → if red, route to owning leaf and re-run → when green,
write changelog → sync board/statistics → flip statuses → record evidence.

**Error handling:** a red gate or an unverifiable doc claim is a closure blocker,
not something to override. Skipped DB suites must carry an explicit `skipReason`;
do not silently drop them.

**Regression-test shape:** no new product tests authored here; this leaf is the
orchestration of the suites owned by 480-01..05 plus the baseline `gates:coderso`
sweep. Any gate extension added in step 2 carries its own budget assertion.

---

## Testing Requirements

- `set -a && source .env && set +a` (before DB-backed suites).
- `bun --cwd core lint`
- `bun --cwd core lint:types`
- TASK-480 Bun route + security suites (480-03 — real paths).
- TASK-480 Vitest domain + admin UI suites (480-02/04/05 — real paths).
- `bun run gates:coderso` (baseline); `bun run gates:coderso:performance` /
  `bun run gates:coderso:security` if a gate was extended.
- Record all pass counts and any skips/`skipReason` in the closeout; state clearly
  if any command could not run.

---

## Documentation Updates Required

- `_docs/_CHANGELOG/` — new closure entry + Index row + next-number bump.
- `_docs/_TASKS/README.md` — move TASK-480 (all nodes) to Done; update Statistics.
- Each TASK-480 file — `✅ Done` + `**Completed:**`.
- `_docs/CODERSO_RELEASE_GATES.md` — only if a gate/budget was extended (step 2).
- (Spec/API/cache/data-model doc edits are owned by TASK-480-06-L01, not here.)
