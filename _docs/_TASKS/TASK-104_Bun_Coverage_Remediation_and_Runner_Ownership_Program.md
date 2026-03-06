# TASK-104: Bun Coverage Remediation and Runner Ownership Program
# FileName: TASK-104_Bun_Coverage_Remediation_and_Runner_Ownership_Program.md

**Priority:** High  
**Category:** QA + Platform + Docs  
**Estimated Effort:** Large  
**Dependencies:** TASK-102, TASK-054-19, TASK-054-199  
**Status:** In Progress (2026-03-06)

---

## Overview

Create and execute a repo-wide program that:
1. documents the current real coverage state,
2. separates tests into `move to Vitest`, `keep in Bun`, and `refactor before move`,
3. drives the Bun baseline toward a meaningful signal instead of a blended, misleading metric.

This is a business task, not just a QA cleanup.
Coverage is currently distorted because Bun baseline still executes areas that should eventually live in Vitest, while other true Bun-owned areas remain under-tested.

## Business Context

The product contract is still:
- Bun is the runtime kernel,
- runtime plugin/bundle flows must stay WordPress-like,
- not every test belongs in Bun,
- not every low-coverage file should be attacked with more Bun tests.

The real work is two-track:
1. move Bun-free tests to Vitest,
2. improve Bun coverage only for the surfaces that truly belong to Bun.

Without this split, coverage becomes a vanity metric instead of a release-quality signal.

## Current Coverage Snapshot (2026-03-06)

Source: `bun run test:coverage:bun` in isolated worktree.

- Bun baseline command passes.
- Coverage summary:
  - `% Funcs`: `33.23`
  - `% Lines`: `48.47`
- Current Bun baseline scope:
  - `tests/integration/ui`
  - `tests/integration/plugins/assets.test.ts`
  - `tests/perf/admin-request-baseline.test.ts`
  - `tests/perf/admin-prefetch-budget.test.ts`

## Hotspots From Bun Coverage

### Lowest line coverage, highest practical impact

| Area / File | Coverage signal | Notes |
|-------------|-----------------|-------|
| `core/admin/ui/widgets` | ~`10.85%` lines across `43` files | dominant low-coverage cluster in Bun baseline |
| `core/admin/utils/cacheBus.ts` | `1.33%` | clear Bun-free candidate for Vitest |
| `core/admin/services/cachePolicy.ts` | `1.79%` | Bun-free candidate for Vitest |
| `packages/sdk/src/pluginManifest.ts` | `3.50%` | SDK contract, should be Vitest-owned |
| `core/services/search/filterContract.ts` | `3.79%` | likely refactor-first, Bun-free target |
| `core/services/customScreens/bindingResolver.ts` | `6.15%` | Bun-free target, strong candidate for Vitest |
| `core/widgets/core/contentList.tsx` | `6.18%` | mixed runtime/editor logic, likely split wave |

## Unit Test Ownership Heuristic Snapshot

Initial classification of `tests/unit/*` files:
- likely `move to Vitest`: `256`
- likely `keep in Bun`: `60`
- likely `refactor before move`: `113`

Strong Vitest-heavy areas:
- `tests/unit/ui/*` -> `137`
- `tests/unit/admin/*` -> `49`
- `tests/unit/widgets/*` -> `40`
- `tests/unit/pageBuilder/*` -> `8`
- `tests/unit/sdk/*` -> `3`

Strong Bun-owned areas:
- DB-backed service suites in `content`, `forms`, `pages`, `security`, `menus`, `themes`, `webhooks`
- runtime/plugin lifecycle tests

Strong refactor-first areas:
- `assistant`
- `posts`
- `forms`
- `server`
- `validation`
- `search`

## Goals

1. Build a truthful backlog of what should move to Vitest and what should stay in Bun.
2. Raise Bun baseline coverage by improving true Bun-owned surfaces, not by forcing more Bun tests into Bun-free code.
3. Reduce Bun baseline noise by migrating Bun-free suites to Vitest in waves.
4. Make the remaining low-coverage areas explicit and prioritized.

## Non-Goals

1. Forcing `100%` coverage by narrowing the metric dishonestly.
2. Moving DB-backed/runtime/plugin lifecycle suites out of Bun.
3. Declaring completion after only changing scripts without real test ownership work.

## Workstreams

1. Coverage audit and ownership matrix.
2. Admin clients/utils migration to Vitest.
3. Admin SSR/DOM helper migration to Vitest.
4. SDK and shared contracts migration to Vitest.
5. Refactor-first domain/service eligibility work.
6. Bun baseline purity and Bun-owned coverage hardening.
7. Widget/editor coverage waves.
8. QA/docs/closure.

## Sub-Tasks

1. `TASK-104-01_Coverage_Audit_and_Runner_Ownership_Matrix.md`
2. `TASK-104-02_Admin_Clients_and_Utils_Move_to_Vitest.md`
3. `TASK-104-03_Admin_UI_SSR_and_DOM_Move_to_Vitest.md`
4. `TASK-104-04_SDK_and_Shared_Contracts_Move_to_Vitest.md`
5. `TASK-104-05_Refactor_First_Domain_and_Posts_Eligibility.md`
6. `TASK-104-06_Bun_Baseline_Purity_and_Runtime_Coverage_Hardening.md`
7. `TASK-104-07_Widget_and_Editor_Coverage_Waves.md`
8. `TASK-104-08_QA_Docs_Board_and_Closure.md`

## Implementation Order

1. Freeze the audit and ownership matrix.
2. Move obvious Bun-free tests first.
3. Refactor ambiguous areas before moving them.
4. Harden Bun coverage only after Bun baseline is cleaner.
5. Close with docs/board/changelog sync.

## Pseudocode

```ts
const backlog = classifyTestsAndCoverage({
  bunCoverageReport,
  unitTests,
});

for (const item of backlog) {
  if (item.runner === "vitest" && item.ready) queue("move-to-vitest", item);
  else if (item.runner === "bun") queue("bun-hardening", item);
  else queue("refactor-first", item);
}
```

## Acceptance Criteria

1. The repo has an explicit backlog of low-coverage Bun areas and runner ownership decisions.
2. Bun-free areas are grouped into concrete Vitest migration waves.
3. Bun-owned areas are grouped into concrete Bun hardening waves.
4. Ambiguous areas are explicitly marked as `refactor first`.

## Testing Requirements

- Keep `bun run test:coverage:bun` as the baseline reference point during planning and delivery.
- Re-run Vitest and Bun coverage after each major wave.
- Keep lint/typecheck green while moving suites.

## Documentation Updates Required

- `_docs/_TASKS/README.md`
- `_docs/TESTING_STRATEGY.md`
- `tests/README.md`
- `_docs/_CHANGELOG/*.md` (when subtask work lands)
