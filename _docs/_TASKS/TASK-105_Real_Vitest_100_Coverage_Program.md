# TASK-105: Real Vitest 100% Coverage Program
# FileName: TASK-105_Real_Vitest_100_Coverage_Program.md

**Priority:** High  
**Category:** QA + Platform + Admin/UI  
**Estimated Effort:** Large  
**Dependencies:** TASK-102, TASK-104  
**Status:** In Progress (2026-03-06)

---

## Overview

Drive the shipped Vitest lane to real `100%` coverage without manipulating the metric.

This task starts after `TASK-104`:
- runner ownership is now cleaner,
- Bun-free suites have been moved to Vitest,
- Bun baseline is no longer carrying most Bun-free UI load.

The remaining work is explicit:
- add missing real tests,
- cover still-unexecuted Vitest-owned code,
- avoid cheating via artificial `exclude` expansion.

## Business Context

After `TASK-104`, the repo can finally treat Vitest coverage as a serious product-quality signal for Bun-free code.
Right now the Vitest lane is broad but still far from full coverage.

Initial Vitest coverage snapshot (from `bun run test:coverage` on 2026-03-06):
- `% Stmts`: `38.01`
- `% Branch`: `33.57`
- `% Funcs`: `31.52`
- `% Lines`: `40.18`

Current Vitest coverage snapshot after the latest implemented waves (from `./node_modules/.bin/vitest run --config vitest.config.ts --coverage` on 2026-03-06):
- `% Stmts`: `42.03`
- `% Branch`: `37.65`
- `% Funcs`: `36.29`
- `% Lines`: `44.36`

This means the next stage is not runner cleanup anymore.
It is real test authoring across still-uncovered Vitest-owned surfaces.

## Hard Rule

`100%` here means:
- add or improve real tests,
- cover actual branches, render states, and behaviors,
- do not expand `coverage.exclude` except for true infrastructure noise,
- do not shrink ownership just to make the number look better.

## High-Level Hotspots

### Remaining low-coverage hotspots

- `core/admin/ui/listings/ListingTemplateManager.tsx` -> `6.89%`
- `core/admin/ui/widgets/editors/ProductListEditors.tsx` -> `7.69%`
- `core/admin/ui/widgets/editors/StatsKpiEditors.tsx` -> `9.37%`
- `core/admin/ui/audit/AuditTable.tsx` -> `8.33%`
- `core/admin/ui/popups/components/PopupEditorForm.tsx` -> `13.04%`
- `core/admin/ui/users/UserDetailsDrawer.tsx` -> `18.18%`

### Zero-gap waves already cleared

- `packages/sdk/src/pluginManifest.ts`
- `core/services/customScreens/customScreenService.ts`
- `core/admin/utils/sessionCache.ts`
- `core/admin/services/webhooksClient.ts`
- `core/admin/services/apiKeysClient.ts`
- `core/admin/services/emailClient.ts`
- `core/admin/services/integrationsClient.ts`
- `core/admin/services/taxonomyClient.ts`
- `core/admin/ui/themes/ThemeEditorPage.tsx`
- `core/admin/ui/redirects/RedirectsPage.tsx`

### Large low-coverage area clusters

| Area | Approx line coverage | Notes |
|------|----------------------|-------|
| `core/admin/ui/themes` | `21.38%` | large admin surface with drawers/editor flows |
| `core/admin/ui/booking` | `22.11%` | page shell + helper + tabs |
| `core/admin/ui/listings` | `30.65%` | list/editor/search/filters/manager |
| `core/admin/ui/forms` | `27.89%` | builder shell and action/runtime panels |
| `core/admin/ui/menus` | `32.96%` | editor tree, drawers, row interactions |
| `core/admin/ui/entries` | `33.49%` | editor + table + metadata + renderer |
| `core/admin/ui/posts` | `40.53%` | still large, many editor sub-surfaces untested |
| `core/admin/ui/widgets` | `35.58%` | biggest file-count cluster in Vitest lane |

## Goals

1. Raise Vitest lane coverage to real `100%`.
2. Cover real user-facing and domain-facing behavior, not synthetic snapshots only.
3. Keep Bun/Vitest ownership stable while adding missing tests.
4. Turn remaining low-coverage files into explicit wave-based work, not random cleanup.

## Non-Goals

1. Artificially shrinking the Vitest lane to force `100%`.
2. Moving runtime-coupled files out of scope just to improve percentages.
3. Replacing meaningful coverage with snapshot-only noise.

## Workstreams

1. Coverage matrix and invariants freeze.
2. Zero-coverage admin service/client wave.
3. Small UI/support component wave.
4. Themes/booking/listings/forms wave.
5. Entries/pages/posts editor shell wave.
6. Widget/editor deep coverage wave.
7. SDK/custom screens domain wave.
8. Final branch/statement gap closure.
9. QA/docs/changelog/board closure.

## Progress

Completed waves:
- admin service zero-coverage clients and `sessionCache`
- SDK `pluginManifest`, `client`, and `server`
- custom screens service coverage
- small UI leafs (`BlockLibrary`, `FormCanvas`, `MediaDetailsPanel`, `PluginFilters`, theme route/token editors)
- themes leaf cards and `ThemeEditorPage`
- redirects page leaf coverage
- booking tab leaf coverage
- plugin/media/site leaf coverage
- analytics/settings/entries/seo leaf coverage
- menu leaf coverage
- post-editor/settings/storage/api-key utility leaf coverage
- `recaptcha` and `blockDnD` utility coverage

Remaining large clusters:
- listings editors/managers
- forms builder pages and panels
- entries/pages/posts editor shells
- widgets editor suites

## Sub-Tasks

1. `TASK-105-01_Vitest_Coverage_Matrix_and_Invariants.md`
2. `TASK-105-02_Admin_Services_Zero_Coverage_Wave.md`
3. `TASK-105-03_Small_UI_and_Support_Component_Wave.md`
4. `TASK-105-04_Themes_Booking_Listings_Forms_Wave.md`
5. `TASK-105-05_Entries_Pages_Posts_Editor_Wave.md`
6. `TASK-105-06_Widget_Editor_New_Tests_Wave.md`
7. `TASK-105-07_SDK_PluginManifest_and_Custom_Screens_Service_Wave.md`
8. `TASK-105-08_Final_Per_File_100_Gap_Closure.md`
9. `TASK-105-09_QA_Docs_Changelog_and_Closure.md`

## Implementation Order

1. Freeze the coverage matrix and target files.
2. Clear zero-coverage small files first.
3. Attack medium admin areas by product surface.
4. Attack large editor/widget clusters in waves.
5. Finish with strict per-file gap closure and QA sync.

## Pseudocode

```ts
const vitestReport = parseCoverage("coverage/vitest/lcov.info");
const backlog = prioritize(vitestReport, {
  strategy: ["zero-first", "small-files", "product-clusters", "branch-gaps"],
});

for (const wave of backlog) {
  addRealTests(wave.files);
  validateVitestCoverage();
}
```

## Acceptance Criteria

1. The Vitest-owned surface reaches real `100%` without dishonest exclusions.
2. Every coverage wave names concrete files/modules and real behavior to test.
3. Final closure documents what changed and what `100%` actually covers.

## Testing Requirements

- `bun run test:vitest`
- `bun run test:coverage`
- `bun --cwd core lint`
- `bun --cwd core lint:types`
- `bun --cwd store lint`
- `./node_modules/.bin/tsc -p packages/sdk/tsconfig.json --noEmit`

## Documentation Updates Required

- `_docs/_TASKS/README.md`
- `tests/README.md`
- `tests/RUNNER_OWNERSHIP.md`
- `_docs/_CHANGELOG/*.md`
